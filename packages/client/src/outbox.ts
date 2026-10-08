import {
  ConvoHopProblem, parseCounter, parseCursor, parseId, parseObject, parseString, type AsyncRecoveryStorage, type Connectivity,
  type ProtocolObject, type RecoveryState, type SendReceipt,
} from "@convohop/core";
import { jsonClone, randomUUID } from "@convohop/core/internal";
import type { ConvoHopClient } from "./client.js";
import { connectivityOf, lifecycleOf, listen } from "./platform.js";
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
export interface OutboxOptions {
  /** Network reachability for this outbox. Default: the client's `platform.connectivity`, else the browser's. */
  connectivity?: Connectivity;
  /**
   * Keep unsent messages, including their text, in the client's `recoveryStorage` or `asyncRecoveryStorage` across
   * reloads. Off by default; use one persistent outbox per client. Messages that may have been submitted are
   * recovered, never re-sent as new. Asynchronous storage loads saved messages in the background; they are sent
   * before messages added meanwhile, and {@link Outbox.flush} waits for them. Until they load, the limit of 100
   * unsent messages counts only messages added meanwhile, so the outbox can hold up to 200.
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
  /** The authority's `Retry-After` deadline, which waking for connectivity or the foreground keeps. */
  holdUntil: number;
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
  readonly #unsubscribe: (() => void)[] = [];
  readonly #key: string | undefined;
  readonly #onError: ((error: Error) => void) | undefined;
  #entries: readonly OutboxEntry[] | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #closed = false;
  /** Loading saved entries from asynchronous storage; nothing is sent or saved until it settles. */
  #restoring: Promise<void> | undefined;
  #deferredSave = false;
  #writing: Promise<void> = Promise.resolve();
  constructor(client: ConvoHopClient, options: OutboxOptions = {}) {
    this.client = client; this.#onError = options.onError;
    this.#connectivity = options.connectivity ?? connectivityOf(client.platform);
    if (options.persist) {
      if (!client.storage && !client.asyncStorage)
        throw new TypeError("A persistent outbox requires the client's recoveryStorage or asyncRecoveryStorage");
      const key = this.#key = `convohop.outbox:${client.projectId}:${client.principalId}`;
      if (client.storage) {
        let text: unknown = null;
        try { text = client.storage.getItem(key); } catch (error) { this.#report(error); }
        for (const item of this.#parse(text)) this.#items.set(item.requestId, item);
      } else {
        const storage = client.asyncStorage!;
        this.#restoring = Promise.resolve().then(() => this.#restore(storage, key));
      }
    }
    try {
      this.#unsubscribe.push(listen(this.#connectivity, online => { if (online) this.#wake(); }));
      this.#unsubscribe.push(listen(lifecycleOf(client.platform), state => { if (state === "active") this.#pump(); }));
    } catch (error) { this.close(); throw error; }
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
    return this.#enqueue(parseId(conversationId), parseString(text), frozen(jsonClone(parseObject(props))));
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
    this.#items.delete(requestId); void this.#save(); this.#changed();
  }
  /** Releases a sent entry, typically once its message is shown from history. */
  settle(requestId: string): void {
    if (this.#items.get(requestId)?.status !== "sent") return;
    this.#items.delete(requestId); this.#changed();
  }
  /**
   * Attempts every waiting entry now, ignoring backoff, and resolves when each conversation's queue is idle or blocked.
   * Waits for saved entries to load first.
   */
  async flush(): Promise<void> {
    await this.#restoring;
    for (const item of this.#items.values()) item.notBefore = 0;
    this.#pump();
    while (this.#lanes.size) await Promise.all([...this.#lanes.values()]);
  }
  /** Stops sending. Persisted entries stay saved, and the client keeps its recovery state. */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    for (const unsubscribe of this.#unsubscribe.splice(0)) {
      try { unsubscribe(); } catch (error) { this.#report(error); }
    }
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
  }
  #enqueue(conversationId: string, text: string, props: ProtocolObject): OutboxEntry {
    if (this.#closed) throw new Error("The outbox is closed");
    let unsent = 0;
    for (const item of this.#items.values()) if (item.status !== "sent") unsent++;
    if (unsent >= maxUnsent) throw new RangeError("The outbox is full; wait for queued messages to send");
    const item: Item = { requestId: randomUUID(this.client.platform), conversationId, text, props, createdAt: new Date().toISOString(),
      status: "queued", attempted: false, uncertain: false, exhausted: false, failures: 0, notBefore: 0, holdUntil: 0 };
    this.#items.set(item.requestId, item); void this.#save(); this.#changed(); this.#pump();
    return this.entries.find(entry => entry.requestId === item.requestId)!;
  }
  #wake(): void {
    for (const item of this.#items.values()) item.notBefore = Math.min(item.notBefore, item.holdUntil);
    this.#pump();
  }
  #pump(): void {
    if (this.#closed || this.#restoring || !this.#connectivity.online) return;
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
        item.attempted = true; await this.#save();
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
    void this.#save();
  }
  #later(item: Item, error: Error, retryAfter = 0): void {
    const backoff = Math.min(30000, 1000 * 2 ** Math.min(item.failures++, 5)), now = Date.now();
    item.status = item.uncertain ? "unknown" : "queued"; item.error = error;
    item.holdUntil = retryAfter > 0 ? now + retryAfter * 1000 : 0;
    item.notBefore = now + Math.max(backoff + Math.floor(Math.random() * backoff / 4), retryAfter * 1000);
    void this.#save();
  }
  #fail(item: Item, error: Error, unconfirmed: boolean): void {
    item.status = "failed"; item.error = error;
    if (unconfirmed) item.unconfirmed = true; else delete item.unconfirmed;
    void this.#save(); this.#report(error);
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
  /**
   * Saves the unsent entries as they are now. Failures go to `onError`. Asynchronous writes run in order; the
   * returned promise settles when this one has.
   */
  #save(): Promise<void> {
    const key = this.#key;
    if (key === undefined) return Promise.resolve();
    if (this.#restoring) { this.#deferredSave = true; return Promise.resolve(); }
    const saved = [...this.#items.values()].filter(item => item.status !== "sent").map(item => ({
      requestId: item.requestId, conversationId: item.conversationId, text: item.text, props: item.props, createdAt: item.createdAt,
      attempted: item.attempted, ...(item.status === "failed" ? { failed: true } : {}), ...(item.unconfirmed ? { unconfirmed: true } : {}),
    }));
    const text = saved.length ? JSON.stringify(saved) : undefined, storage = this.client.storage;
    if (storage) {
      try { if (text) storage.setItem(key, text); else storage.removeItem(key); }
      catch (error) { this.#report(error); }
      return Promise.resolve();
    }
    const asyncStorage: AsyncRecoveryStorage = this.client.asyncStorage!;
    const write = this.#writing.then(() => text ? asyncStorage.setItem(key, text) : asyncStorage.removeItem(key))
      .catch((error: unknown) => this.#report(error));
    this.#writing = write;
    return write;
  }
  async #restore(storage: AsyncRecoveryStorage, key: string): Promise<void> {
    let text: unknown = null;
    try { text = await storage.getItem(key); } catch (error) { this.#report(error); }
    const restored = this.#parse(text), added = [...this.#items.values()];
    this.#restoring = undefined;
    // Saved entries were queued first, so they keep their place ahead of entries added while they loaded.
    this.#items.clear();
    for (const item of restored) this.#items.set(item.requestId, item);
    for (const item of added) if (!this.#items.has(item.requestId)) this.#items.set(item.requestId, item);
    if (this.#deferredSave) { this.#deferredSave = false; void this.#save(); }
    this.#changed(); this.#pump(); this.#arm();
  }
  /** Saved entries from storage. Unreadable data and entries go to `onError` and are skipped. */
  #parse(text: unknown): Item[] {
    if (text === null || text === undefined) return [];
    let saved: unknown;
    try {
      if (typeof text !== "string") throw new TypeError("Stored outbox must be a string or null");
      saved = JSON.parse(text);
    } catch (error) { this.#report(error); return []; }
    if (!Array.isArray(saved)) { this.#report(new TypeError("Discarded an unreadable saved outbox")); return []; }
    // Messages sent while asynchronous storage loaded can double a full saved outbox.
    const limit = 2 * maxUnsent;
    if (saved.length > limit)
      this.#report(new RangeError(`Discarded ${saved.length - limit} of ${saved.length} saved outbox entries, beyond the limit of ${limit}`));
    const items = new Map<string, Item>();
    for (const value of saved.slice(0, limit)) {
      try {
        const v = parseObject(value), requestId = parseId(v.requestId);
        if (typeof v.attempted !== "boolean" || items.has(requestId)) throw new TypeError("Invalid saved outbox entry");
        const failed = v.failed === true, attempted = v.attempted;
        items.set(requestId, { requestId, conversationId: parseId(v.conversationId), text: parseString(v.text),
          props: frozen(parseObject(v.props)), createdAt: parseString(v.createdAt), attempted, uncertain: attempted, exhausted: false,
          status: failed ? "failed" : attempted ? "unknown" : "queued", failures: 0, notBefore: 0, holdUntil: 0,
          ...(failed ? { error: new Error("The message failed before the app restarted") } : {}),
          ...(failed && v.unconfirmed === true ? { unconfirmed: true } : {}) });
      } catch (error) { this.#report(error); }
    }
    return [...items.values()];
  }
}
