import {
  ConvoHopProblem, parseCounter, parseCursor, parseId, parseObject, parseString, type ProtocolObject, type RecoveryState, type SendReceipt,
} from "@convohop/core";
import type { ConvoHopClient } from "./client.js";
import { asError, frozen, notify } from "./util.js";

/**
 * - `queued`: waiting to be sent. Nothing about it can have committed.
 * - `sending`: a send, retry or resolution is in flight.
 * - `unknown`: an attempt's outcome is uncertain. The outbox recovers it with its original request ID.
 * - `sent`: committed. The entry stays until {@link Outbox.settle} or until newer sent entries evict it.
 * - `failed`: rejected, or no longer recoverable. {@link Outbox.resend} it as a new message or discard it.
 */
export type OutboxStatus = "queued" | "sending" | "unknown" | "sent" | "failed";
export interface OutboxEntry {
  readonly requestId: string;
  readonly conversationId: string;
  readonly text: string;
  readonly props: Readonly<ProtocolObject>;
  readonly createdAt: string;
  readonly status: OutboxStatus;
  /** The committed message, when the authority returned it. */
  readonly messageId?: string;
  readonly receipt?: SendReceipt;
  /** The latest failure: why a `failed` entry stopped, or why a waiting entry will retry. */
  readonly error?: Error;
  /** A failed entry may still have been delivered, so resending it can duplicate the message. */
  readonly unconfirmed?: boolean;
}
/** Network reachability. Browsers default to `navigator.onLine`; React Native apps pass one built on NetInfo. */
export interface Connectivity {
  readonly online: boolean;
  subscribe(listener: (online: boolean) => void): () => void;
}
export interface OutboxOptions {
  connectivity?: Connectivity;
  /**
   * Keep unsent messages, including their text, in the client's `recoveryStorage` across reloads. Off by default;
   * use one persistent outbox per client. Messages that may have been submitted are recovered, never re-sent as new.
   */
  persist?: boolean;
  /** Called when an entry fails and when persistence or a listener throws. */
  onError?: (error: Error) => void;
}

interface Item {
  requestId: string; conversationId: string; text: string; props: ProtocolObject; createdAt: string; status: OutboxStatus;
  /** The send may have reached the authority. */
  attempted: boolean;
  /** Some submission's outcome was uncertain, so the message may have committed. */
  uncertain: boolean;
  /** The transport can't resend the original request any more; only read-only resolution remains. */
  exhausted: boolean;
  messageId?: string; receipt?: SendReceipt; error?: Error; unconfirmed?: boolean;
  failures: number; notBefore: number;
}
type Phase = "submit" | "retry" | "resolve";
type Resolution = Awaited<ReturnType<ConvoHopClient["requests"]["resolve"]>>;

const maxUnsent = 100, maxSent = 100;
const waiting = new Set(["UNAUTHENTICATED", "SESSION_REFRESH_REQUIRED", "RATE_LIMITED"]);
const unrecoverable = new Set(["IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "CREDENTIAL_REQUIRED"]);

/** Whether a definitive rejection may pass: waiting for a session, quota or capacity isn't refusing the message. */
function retryable(problem: ConvoHopProblem): boolean {
  return waiting.has(problem.code) || problem.status === 0 || problem.status === 408 || problem.status === 429 || problem.status >= 500;
}
function browserConnectivity(): Connectivity {
  const scope = globalThis as {
    navigator?: { onLine?: unknown };
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
  return {
    get online() { return scope.navigator?.onLine !== false; },
    subscribe(listener) {
      if (typeof scope.addEventListener !== "function") return () => undefined;
      const online = () => listener(true), offline = () => listener(false);
      scope.addEventListener("online", online); scope.addEventListener("offline", offline);
      return () => { scope.removeEventListener?.("online", online); scope.removeEventListener?.("offline", offline); };
    },
  };
}

/**
 * Sends messages optimistically and in order per conversation. Offline periods, session refreshes and uncertain
 * outcomes don't duplicate a message: an entry keeps one request ID, and the transport's retry budget, until it is
 * sent or fails. A failed entry is only sent again, as a new message, through {@link Outbox.resend}.
 */
export class Outbox {
  readonly client: ConvoHopClient;
  readonly #items = new Map<string, Item>();
  readonly #listeners = new Set<() => void>();
  readonly #lanes = new Map<string, Promise<void>>();
  readonly #connectivity: Connectivity;
  readonly #unsubscribe: () => void;
  readonly #key: string | undefined;
  readonly #onError: ((error: Error) => void) | undefined;
  #entries: readonly OutboxEntry[] | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #closed = false;
  constructor(client: ConvoHopClient, options: OutboxOptions = {}) {
    this.client = client; this.#onError = options.onError;
    this.#connectivity = options.connectivity ?? browserConnectivity();
    if (options.persist) {
      if (!client.storage) throw new TypeError("A persistent outbox requires the client's recoveryStorage");
      this.#key = `convohop.outbox:${client.projectId}:${client.principalId}`;
      this.#restore();
    }
    this.#unsubscribe = this.#connectivity.subscribe(online => { if (online) this.#wake(); });
    this.#arm();
  }
  /** A frozen snapshot in send order, replaced on every change. */
  get entries(): readonly OutboxEntry[] {
    return this.#entries ??= Object.freeze([...this.#items.values()].map(item => Object.freeze({
      requestId: item.requestId, conversationId: item.conversationId, text: item.text, props: item.props,
      createdAt: item.createdAt, status: item.status,
      ...(item.messageId === undefined ? {} : { messageId: item.messageId }),
      ...(item.receipt === undefined ? {} : { receipt: item.receipt }),
      ...(item.error === undefined ? {} : { error: item.error }),
      ...(item.unconfirmed ? { unconfirmed: true } : {}),
    })));
  }
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  }
  send(conversationId: string, text: string, props: ProtocolObject = {}): OutboxEntry {
    return this.#enqueue(parseId(conversationId), parseString(text), frozen(structuredClone(parseObject(props))));
  }
  /** Sends a failed entry's message again as a new request, after the entries already waiting. */
  resend(requestId: string): OutboxEntry {
    const item = this.#items.get(requestId);
    if (!item || item.status !== "failed") throw new Error("Only a failed message can be resent");
    this.#items.delete(requestId);
    return this.#enqueue(item.conversationId, item.text, item.props);
  }
  /** Drops a queued, failed or sent entry. An entry that is sending or whose outcome is unknown can't be discarded. */
  discard(requestId: string): void {
    const item = this.#items.get(requestId);
    if (!item) return;
    if (item.status === "sending" || item.status === "unknown") throw new Error("Wait for the message's outcome before discarding it");
    this.#items.delete(requestId); this.#save(); this.#changed();
  }
  /** Releases a sent entry, typically once its message is shown from history. */
  settle(requestId: string): void {
    if (this.#items.get(requestId)?.status !== "sent") return;
    this.#items.delete(requestId); this.#changed();
  }
  /** Attempts every waiting entry now, ignoring backoff, and resolves when each conversation's queue is idle or blocked. */
  async flush(): Promise<void> {
    for (const item of this.#items.values()) item.notBefore = 0;
    this.#pump();
    while (this.#lanes.size) await Promise.all([...this.#lanes.values()]);
  }
  /** Stops sending. Persisted entries stay saved, and the client keeps its recovery state. */
  close(): void {
    if (this.#closed) return;
    this.#closed = true; this.#unsubscribe();
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
  }
  #enqueue(conversationId: string, text: string, props: ProtocolObject): OutboxEntry {
    if (this.#closed) throw new Error("The outbox is closed");
    let unsent = 0;
    for (const item of this.#items.values()) if (item.status !== "sent") unsent++;
    if (unsent >= maxUnsent) throw new RangeError("The outbox is full; wait for queued messages to send");
    const item: Item = { requestId: crypto.randomUUID(), conversationId, text, props, createdAt: new Date().toISOString(),
      status: "queued", attempted: false, uncertain: false, exhausted: false, failures: 0, notBefore: 0 };
    this.#items.set(item.requestId, item); this.#save(); this.#changed(); this.#pump();
    return this.entries.find(entry => entry.requestId === item.requestId)!;
  }
  #wake(): void {
    for (const item of this.#items.values()) item.notBefore = 0;
    this.#pump();
  }
  #pump(): void {
    if (this.#closed || !this.#connectivity.online) return;
    for (const item of this.#items.values())
      if ((item.status === "queued" || item.status === "unknown") && !this.#lanes.has(item.conversationId)) this.#lane(item.conversationId);
  }
  /** Sends one conversation's entries in order; the first waiting entry holds back the ones after it. */
  #lane(conversationId: string): void {
    const lane = (async () => {
      while (!this.#closed && this.#connectivity.online) {
        let next: Item | undefined;
        for (const item of this.#items.values())
          if (item.conversationId === conversationId && (item.status === "queued" || item.status === "unknown")) { next = item; break; }
        if (!next || next.notBefore > Date.now()) return;
        await this.#attempt(next);
      }
    })().catch(error => this.#report(error)).finally(() => {
      this.#lanes.delete(conversationId); this.#arm();
    });
    this.#lanes.set(conversationId, lane);
  }
  #arm(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    if (this.#closed) return;
    let due = Infinity;
    for (const item of this.#items.values())
      if ((item.status === "queued" || item.status === "unknown") && !this.#lanes.has(item.conversationId)) due = Math.min(due, item.notBefore);
    if (due === Infinity) return;
    this.#timer = setTimeout(() => { this.#timer = undefined; this.#pump(); }, Math.min(Math.max(0, due - Date.now()), 2147483647));
  }
  async #attempt(item: Item): Promise<void> {
    item.status = "sending"; this.#changed();
    let phase: Phase = "submit";
    try {
      await this.client.http.initializeRecovery();
      if (this.#state(item.requestId) && !item.exhausted) {
        phase = "retry";
        const resolution = await this.client.requests.retry(item.requestId);
        if (resolution.state === "committed") this.#committed(item, resolution);
        else { item.uncertain = true; this.#later(item, new Error("The message's outcome is not known yet")); }
      } else if (item.attempted) {
        phase = "resolve";
        await this.#resolve(item);
      } else {
        // Recorded before submission, so a reload recovers this request instead of sending it again.
        item.attempted = true; this.#save();
        const receipt = await this.client.send(item.conversationId, item.text, item.requestId, item.props);
        this.#sent(item, receipt.messageId, receipt);
      }
    } catch (error) {
      try { await this.#failed(item, error, phase); }
      catch (cause) { this.#fail(item, asError(cause, "Message send failed"), true); }
    }
    this.#changed();
  }
  async #failed(item: Item, error: unknown, phase: Phase): Promise<void> {
    const problem = error instanceof ConvoHopProblem ? error : undefined, failure = asError(error, "Message send failed");
    const state = this.#state(item.requestId);
    if (phase === "submit" && !state) {
      // Refused before submission, so nothing was sent.
      item.attempted = false;
      if (problem?.outcome === "rejected" && !retryable(problem)) return this.#fail(item, failure, false);
      return this.#later(item, failure, problem?.retryAfter);
    }
    if (phase !== "resolve" && problem?.code === "RESOLUTION_REQUIRED") {
      item.exhausted = true;
      // An observed commit outlives the authority's result retention.
      if (state?.resolutionState === "committed") return this.#sent(item, undefined, undefined);
      try { return await this.#resolve(item); }
      catch (cause) { return this.#failed(item, cause, "resolve"); }
    }
    if (problem && unrecoverable.has(problem.code)) return this.#fail(item, problem, item.uncertain);
    // Refusing a request before submitting it says nothing about an earlier attempt's outcome.
    if (phase !== "resolve" && problem?.outcome !== "rejected" && problem?.code !== "SESSION_REFRESH_REQUIRED") item.uncertain = true;
    if (problem?.outcome === "rejected" && !retryable(problem)) return this.#fail(item, failure, item.uncertain);
    this.#later(item, failure, problem?.retryAfter);
  }
  /** Settles an entry the transport can't resend, with a read-only resolution. */
  async #resolve(item: Item): Promise<void> {
    const resolution = await this.client.requests.resolve(item.requestId);
    if (resolution.state === "committed") return this.#committed(item, resolution);
    if (resolution.state === "accepted") {
      item.uncertain = true;
      return this.#later(item, new Error("The message's outcome is not known yet"));
    }
    if (resolution.state !== "notObservedYet") return this.#fail(item, new TypeError("Unknown request resolution state"), true);
    this.#fail(item, item.uncertain || !item.error ? new ConvoHopProblem("RESOLUTION_REQUIRED", item.requestId, "unknown", 409,
      "The message was not observed and its request can't be resent; resend it as a new message if it should still be sent")
      : item.error, item.uncertain);
  }
  #committed(item: Item, resolution: Resolution): void {
    const ack = resolution.receipt?.result?.messageAck;
    if (!ack) {
      if (resolution.resultWithheld) return this.#sent(item, undefined, undefined);
      return this.#fail(item, new TypeError("Committed message resolution has no receipt"), true);
    }
    let messageId: string, receipt: SendReceipt | undefined;
    try {
      messageId = parseId(ack.messageId);
      const sequence = parseCounter(ack.sequence);
      if (ack.status !== "sent" || ack.conversationId !== item.conversationId) throw new TypeError("Invalid resolved send receipt");
      if (ack.cursor != null) {
        const cursor = parseCursor(ack.cursor);
        if (cursor.conversationId !== item.conversationId || cursor.sequence !== sequence || cursor.incarnation !== this.client.http.incarnation)
          throw new TypeError("Invalid resolved send receipt scope");
        receipt = { ...ack, cursor };
      }
    } catch (error) { return this.#fail(item, asError(error, "Message send failed"), true); }
    this.#sent(item, messageId, receipt);
  }
  #sent(item: Item, messageId: string | undefined, receipt: SendReceipt | undefined): void {
    item.status = "sent"; item.failures = 0;
    delete item.error; delete item.unconfirmed;
    if (messageId !== undefined) item.messageId = messageId;
    if (receipt !== undefined) item.receipt = receipt;
    let sent = 0;
    for (const entry of [...this.#items.values()].reverse()) if (entry.status === "sent" && ++sent > maxSent) this.#items.delete(entry.requestId);
    this.#save();
  }
  #later(item: Item, error: Error, retryAfter = 0): void {
    const backoff = Math.min(30000, 1000 * 2 ** Math.min(item.failures++, 5));
    item.status = item.uncertain ? "unknown" : "queued"; item.error = error;
    item.notBefore = Date.now() + Math.max(backoff + Math.floor(Math.random() * backoff / 4), retryAfter * 1000);
    this.#save();
  }
  #fail(item: Item, error: Error, unconfirmed: boolean): void {
    item.status = "failed"; item.error = error;
    if (unconfirmed) item.unconfirmed = true; else delete item.unconfirmed;
    this.#save(); this.#report(error);
  }
  #state(requestId: string): RecoveryState | undefined {
    return this.client.http.recoveryStates.find(state => state.requestId === requestId);
  }
  #report(error: unknown): void {
    try { this.#onError?.(asError(error, "Message send failed")); } catch { /* a failing handler must not stop the outbox */ }
  }
  #changed(): void {
    this.#entries = undefined;
    notify(this.#listeners, error => this.#report(error));
  }
  #save(): void {
    if (this.#key === undefined) return;
    const saved = [...this.#items.values()].filter(item => item.status !== "sent").map(item => ({
      requestId: item.requestId, conversationId: item.conversationId, text: item.text, props: item.props, createdAt: item.createdAt,
      attempted: item.attempted, ...(item.status === "failed" ? { failed: true } : {}), ...(item.unconfirmed ? { unconfirmed: true } : {}),
    }));
    try {
      if (saved.length) this.client.storage!.setItem(this.#key, JSON.stringify(saved));
      else this.client.storage!.removeItem(this.#key);
    } catch (error) { this.#report(error); }
  }
  #restore(): void {
    let saved: unknown;
    try { saved = JSON.parse(this.client.storage!.getItem(this.#key!) ?? "[]"); }
    catch (error) { this.#report(error); return; }
    if (!Array.isArray(saved)) { this.#report(new TypeError("Discarded an unreadable saved outbox")); return; }
    for (const value of saved.slice(0, maxUnsent)) {
      try {
        const v = parseObject(value), requestId = parseId(v.requestId);
        if (typeof v.attempted !== "boolean" || this.#items.has(requestId)) throw new TypeError("Invalid saved outbox entry");
        const failed = v.failed === true, attempted = v.attempted;
        this.#items.set(requestId, { requestId, conversationId: parseId(v.conversationId), text: parseString(v.text),
          props: frozen(parseObject(v.props)), createdAt: parseString(v.createdAt), attempted, uncertain: attempted, exhausted: false,
          status: failed ? "failed" : attempted ? "unknown" : "queued", failures: 0, notBefore: 0,
          ...(failed ? { error: new Error("The message failed before the app restarted") } : {}),
          ...(failed && v.unconfirmed === true ? { unconfirmed: true } : {}) });
      } catch (error) { this.#report(error); }
    }
  }
}
