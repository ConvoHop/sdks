import {
  ConvoHopProblem, parseCounter, parseCursor, parseId, parseObject, parseString, type AsyncRecoveryStorage, type Connectivity,
  type ProtocolObject, type RecoveryState, type SendReceipt,
} from "@convohop/core";
import { adoptRecovery, beforeSubmitting, jsonClone, randomUUID, reconnectAction, retainRecovery } from "@convohop/core/internal";
import type { ConvoHopClient } from "./client.js";
import { abortReason, connectivityOf, lifecycleOf, listen, storageWrites, throwIfAborted } from "./platform.js";
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
   * recovered, never re-sent as new.
   *
   * Each running persistent outbox of a user saves its messages separately, so tabs sharing `localStorage` keep each
   * other's. Up to 16 run at once; they coordinate through Web Locks, or within one JavaScript context where the
   * runtime has none. When one stops, such as when its tab closes or reloads, another running outbox takes over the
   * messages it left unsent; if none can yet, the next one to start, come back online or return to the foreground
   * does. An outbox created in the same JavaScript context while another closes, such as on a React remount,
   * continues with the closing one's messages instead. While it runs, the outbox holds a Web Lock, so Chromium won't
   * keep the page in its back/forward cache; close the outbox on `pagehide` if you need that.
   *
   * Saved messages load in the background; they are sent before messages added meanwhile, and
   * {@link Outbox.flush} waits for them. {@link Outbox.send} refuses a message while 100 are unsent, but loading or
   * taking over saved messages can bring an outbox up to 200.
   */
  persist?: boolean;
  /** Called when an entry fails and when persistence or a listener throws. */
  onError?: (error: Error) => void;
}

interface Item {
  requestId: string; conversationId: string; text: string; props: ProtocolObject; createdAt: string; status: OutboxStatus;
  /** The send may have reached the authority. Noted before each submission, after the request's recovery record is saved. */
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
const waiting = new Set(["UNAUTHENTICATED", "SESSION_REFRESH_REQUIRED", "RATE_LIMITED", "RECOVERY_LIMIT"]);
const unrecoverable = new Set(["IDEMPOTENCY_CONFLICT", "INCARNATION_MISMATCH", "CREDENTIAL_REQUIRED"]);

/** Running persistent outboxes of one user each save to their own slot: the base key, then `${base}:1` and up. */
const slotCount = 16;
interface Slot { readonly key: string; release(): Promise<void> }
/** The part of the Web Locks API the outbox uses. */
interface Locks {
  request(name: string, options: { ifAvailable?: boolean; signal?: AbortSignal },
    callback: (lock: unknown) => Promise<void> | undefined): Promise<unknown>;
}
/** The requests waiting for each held lock. */
const memoryQueues = new Map<string, (() => void)[]>();
/** Locks within this JavaScript context, for runtimes without Web Locks, such as React Native. */
const memoryLocks: Locks = {
  async request(name, { ifAvailable, signal }, callback) {
    throwIfAborted(signal);
    const queue = memoryQueues.get(name);
    if (!queue) memoryQueues.set(name, []);
    else if (ifAvailable) return callback(null);
    else {
      await new Promise<void>((resolve, reject) => {
        const grant = (): void => { signal?.removeEventListener("abort", abort); resolve(); };
        const abort = (): void => { const index = queue.indexOf(grant); if (index >= 0) queue.splice(index, 1); reject(abortReason(signal!)); };
        queue.push(grant);
        signal?.addEventListener("abort", abort, { once: true });
      });
    }
    try { return await callback({ name }); } finally {
      const next = memoryQueues.get(name)?.shift();
      if (next) next(); else memoryQueues.delete(name);
    }
  },
};
function webLocks(): Locks | undefined {
  try {
    const locks = (globalThis as { navigator?: { locks?: Partial<Locks> } }).navigator?.locks;
    return typeof locks?.request === "function" ? locks as Locks : undefined;
  } catch {
    return undefined;
  }
}
/** Takes `name` unless someone holds it. Resolves the release, which settles once the lock is free again. */
function tryLock(locks: Locks, name: string): Promise<(() => Promise<void>) | undefined> {
  return new Promise((resolve, reject) => {
    const request = locks.request(name, { ifAvailable: true }, lock => {
      if (!lock) { resolve(undefined); return undefined; }
      return new Promise<void>(free => { resolve(() => { free(); return released; }); });
    });
    const released = request.then(() => undefined, () => undefined);
    request.catch(reject);
  });
}
/** A closing persistent outbox of this context. An outbox created meanwhile becomes its heir and gets its slot. */
interface Handoff {
  done: Promise<void>;
  /** Whether the slot was passed on or released, so it's too late to become the heir. */
  ended: boolean;
  heir?: (slot: Slot | undefined) => void;
}
/** This context's closing persistent outboxes by storage key. */
const closing = new Map<string, Set<Handoff>>();
/** This context's running persistent outboxes by storage key, told which slot each one claims. */
const peers = new Map<string, Set<(key: string) => void>>();

/**
 * Whether a definitive rejection may pass. Waiting for a session or for room in the recovery store isn't refusing the
 * message, and neither is a failure the realtime stream reconnects after. A quota, plan limit or missing scope is.
 */
function retryable(problem: ConvoHopProblem): boolean {
  return waiting.has(problem.code) || reconnectAction(problem) !== "stop";
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
  /** The storage key of the user's first slot, when persistent. */
  readonly #base: string | undefined;
  /** The storage keys of the user's slots, when persistent. */
  readonly #keys: readonly string[] = [];
  readonly #locks: Locks = webLocks() ?? memoryLocks;
  readonly #onError: ((error: Error) => void) | undefined;
  #entries: readonly OutboxEntry[] | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #closed = false;
  /** What {@link Outbox.close} returns, once it's called. */
  #closing: Promise<void> | undefined;
  /** Where this outbox saves; none until claimed, after it's released, or when every slot is taken. */
  #slot: Slot | undefined;
  /** Whether the slot's saved entries have loaded; saves wait until they have. */
  #loaded = false;
  /** Claiming a slot and loading saved entries, then taking over abandoned ones; nothing is sent until it settles. */
  #restoring: Promise<void> | undefined;
  /** Taking over entries other outboxes left behind. */
  #adopting: Promise<void> | undefined;
  /** Waiting requests for the slots other running outboxes hold, to take over what each leaves when it stops. */
  readonly #watching = new Map<string, AbortController>();
  /** Takeovers of slots whose watch was granted. */
  readonly #takes = new Set<Promise<void>>();
  #deferredSave = false;
  #writing: Promise<void> = Promise.resolve();
  constructor(client: ConvoHopClient, options: OutboxOptions = {}) {
    this.client = client; this.#onError = options.onError;
    this.#connectivity = options.connectivity ?? connectivityOf(client.platform);
    if (options.persist) {
      if (!client.storage && !client.asyncStorage)
        throw new TypeError("A persistent outbox requires the client's recoveryStorage or asyncRecoveryStorage");
      const base = this.#base = `convohop.outbox:${client.projectId}:${client.principalId}`;
      this.#keys = Array.from({ length: slotCount }, (_, index) => index ? `${base}:${index}` : base);
    }
    try {
      // A full recovery store frees final records, but never one an unsent entry will retry or resolve.
      const items = this.#items;
      this.#unsubscribe.push(retainRecovery(client.http, () => [...items.values()]
        .filter(item => item.status !== "sent" && item.status !== "failed").map(item => item.requestId)));
      this.#unsubscribe.push(listen(this.#connectivity, online => { if (online) { this.#wake(); this.#rescan(); } }));
      this.#unsubscribe.push(listen(lifecycleOf(client.platform), state => {
        if (state === "active") { this.#pump(); this.#rescan(); }
      }));
      if (this.#base !== undefined) {
        // Other pages saving to slots this outbox doesn't watch yet, such as a tab opened after it started.
        this.#unsubscribe.push(storageWrites(key => { if (this.#keys.includes(key)) this.#watch(key); }));
        const base = this.#base, running = peers.get(base) ?? new Set<(key: string) => void>();
        const watch = (key: string): void => this.#watch(key);
        peers.set(base, running.add(watch));
        this.#unsubscribe.push(() => { running.delete(watch); if (!running.size && peers.get(base) === running) peers.delete(base); });
      }
    } catch (error) { this.close(); throw error; }
    if (this.#base !== undefined) {
      const handoffs = [...closing.get(this.#base) ?? []], handoff = handoffs.find(handoff => !handoff.ended && !handoff.heir);
      const inherited = handoff && new Promise<Slot | undefined>(resolve => { handoff.heir = resolve; });
      this.#restoring = this.#start(handoffs.map(handoff => handoff.done), inherited);
    }
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
    await this.#adopting;
    for (const item of this.#items.values()) item.notBefore = 0;
    this.#pump();
    while (this.#lanes.size) await Promise.all([...this.#lanes.values()]);
  }
  /**
   * Stops sending. Persisted entries stay saved, and the client keeps its recovery state. Once its sends and saves
   * settle, a persistent outbox of the user created meanwhile in this JavaScript context continues with its saved
   * entries; otherwise another running one, or the next to start, takes them over.
   *
   * Resolves once the outbox has stopped writing: what it was loading, taking over, sending and saving has settled,
   * and its storage is passed on or released. A send in flight is waited for until it finishes or times out. So on
   * sign-out, wait for it before clearing the storage. It never rejects; failures go to `onError`. Every call returns
   * the same promise.
   */
  close(): Promise<void> {
    if (this.#closing) return this.#closing;
    this.#closed = true;
    let closed!: () => void;
    this.#closing = new Promise<void>(resolve => { closed = resolve; });
    for (const unsubscribe of this.#unsubscribe.splice(0)) {
      try { unsubscribe(); } catch (error) { this.#report(error); }
    }
    for (const watch of this.#watching.values()) watch.abort();
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    const base = this.#base, handoff: Handoff = { done: Promise.resolve(), ended: false };
    handoff.done = this.#release(handoff).catch((error: unknown) => this.#report(error));
    if (base !== undefined) {
      const handoffs = closing.get(base) ?? new Set<Handoff>();
      handoff.done = handoff.done.finally(() => {
        handoffs.delete(handoff);
        if (!handoffs.size && closing.get(base) === handoffs) closing.delete(base);
      });
      closing.set(base, handoffs.add(handoff));
    }
    void handoff.done.then(closed);
    return this.#closing;
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
    // Noted once the transport has saved the request's recovery record, so a page that unloads at any point leaves
    // either the record, which recovers this request, or no sign that it was sent.
    const forget = beforeSubmitting(this.client.http, item.requestId, async () => {
      if (!item.attempted) { item.attempted = true; await this.#save(); }
    });
    try {
      await this.client.http.initializeRecovery();
      let recorded = this.#state(item.requestId) !== undefined;
      // A message another tab sent and left is recovered from the record it saved, if the record is there.
      if (!recorded && item.attempted) {
        phase = "resolve";
        recorded = await adoptRecovery(this.client.http, item.requestId);
      }
      if (recorded && !item.exhausted) {
        phase = "retry";
        const resolution = await this.client.requests.retry(item.requestId);
        if (resolution.state === "committed") this.#committed(item, resolution);
        else { item.uncertain = true; this.#later(item, new Error("The message's outcome is not known yet")); }
      } else if (recorded || item.attempted) {
        phase = "resolve";
        await this.#resolve(item);
      } else {
        const receipt = await this.client.send(item.conversationId, item.text, item.requestId, item.props);
        this.#sent(item, receipt.messageId, receipt);
      }
    } catch (error) {
      try { await this.#failed(item, error, phase); }
      catch (cause) { this.#fail(item, asError(cause, "Message send failed"), true); }
    } finally { forget(); }
    this.#changed();
  }
  async #failed(item: Item, error: unknown, phase: Phase): Promise<void> {
    const problem = error instanceof ConvoHopProblem ? error : undefined, failure = asError(error, "Message send failed");
    const state = this.#state(item.requestId);
    if (phase === "submit" && !state) {
      // Refused before submission, so nothing was sent.
      item.attempted = false;
      if (problem?.outcome === "rejected" && !retryable(problem)) return this.#fail(item, failure, false);
      return this.#wait(item, failure, problem);
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
    return this.#wait(item, failure, problem);
  }
  /** Schedules the entry's next attempt. After `WRONG_REGION` it routes again first, so that attempt has the current route. */
  async #wait(item: Item, failure: Error, problem: ConvoHopProblem | undefined): Promise<void> {
    if (problem && reconnectAction(problem) === "reroute") await this.client.initialize().catch(() => undefined);
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
   * Saves the unsent entries as they are now to this outbox's slot, resolving whether they were saved. Failures go
   * to `onError`. Asynchronous writes run in order; the returned promise settles when this one has.
   */
  #save(): Promise<boolean> {
    if (this.#base === undefined) return Promise.resolve(true);
    if (!this.#loaded) { this.#deferredSave = true; return Promise.resolve(false); }
    const key = this.#slot?.key;
    if (key === undefined) return Promise.resolve(false);
    const saved = [...this.#items.values()].filter(item => item.status !== "sent").map(item => ({
      requestId: item.requestId, conversationId: item.conversationId, text: item.text, props: item.props, createdAt: item.createdAt,
      attempted: item.attempted, ...(item.status === "failed" ? { failed: true } : {}), ...(item.unconfirmed ? { unconfirmed: true } : {}),
    }));
    const text = saved.length ? JSON.stringify(saved) : undefined, storage = this.client.storage;
    if (storage) {
      try {
        if (text) storage.setItem(key, text); else storage.removeItem(key);
        return Promise.resolve(true);
      } catch (error) {
        this.#report(error);
        return Promise.resolve(false);
      }
    }
    const asyncStorage: AsyncRecoveryStorage = this.client.asyncStorage!;
    const write = this.#writing.then(async () => {
      if (text) await asyncStorage.setItem(key, text); else await asyncStorage.removeItem(key);
      return true;
    }).catch((error: unknown) => { this.#report(error); return false; });
    this.#writing = write.then(() => undefined);
    return write;
  }
  /**
   * Takes over the slot of an outbox of this context that was closing when this one was created, or else claims one
   * no running outbox holds, once the earlier closing outboxes have settled. Loads the slot's entries, then takes
   * over entries other outboxes left.
   */
  async #start(earlier: readonly Promise<void>[], inherited: Promise<Slot | undefined> | undefined): Promise<void> {
    let readable = false;
    try {
      this.#slot = await inherited;
      await Promise.all(earlier);
      const slot = this.#slot ??= await this.#claim();
      if (!slot) {
        this.#report(new Error(`${slotCount} outboxes already save this user's messages, so this one keeps them only in memory`));
      } else {
        let text: unknown = null;
        try { text = await this.#read(slot.key); readable = true; } catch (error) { this.#report(error); }
        const restored = this.#parse(text), added = [...this.#items.values()];
        // Saved entries were queued first, so they keep their place ahead of entries added while they loaded.
        this.#items.clear();
        for (const item of restored) this.#items.set(item.requestId, item);
        for (const item of added) if (!this.#items.has(item.requestId)) this.#items.set(item.requestId, item);
      }
    } catch (error) { this.#report(error); }
    this.#loaded = true;
    if (this.#deferredSave) { this.#deferredSave = false; void this.#save(); }
    this.#changed();
    if (!this.#closed) {
      // Pages get `storage` events for other pages' slots; outboxes of this context learn of this one's here.
      const key = this.#slot?.key;
      if (key !== undefined) for (const watch of [...peers.get(this.#base!) ?? []]) watch(key);
      // Storage that just failed would fail again; coming back online or to the foreground looks again.
      if (readable) await this.#adopt();
    }
    this.#restoring = undefined;
    this.#pump(); this.#arm();
  }
  async #claim(): Promise<Slot | undefined> {
    for (const key of this.#keys) {
      const release = await tryLock(this.#locks, key);
      if (release) return { key, release };
    }
    return undefined;
  }
  /** Looks again for abandoned entries when the app comes back online or to the foreground. */
  #rescan(): void {
    if (this.#restoring || this.#adopting || !this.#slot || this.#closed) return;
    void this.#adopt().then(() => { this.#pump(); this.#arm(); });
  }
  /** Takes over the entries saved in slots no running outbox holds, such as a closed tab's. */
  #adopt(): Promise<void> {
    if (!this.#adopting) {
      this.#adopting = this.#scan().catch((error: unknown) => this.#report(error)).finally(() => { this.#adopting = undefined; });
    }
    return this.#adopting;
  }
  /** Takes over the slots no outbox holds and watches the others. Stops at the first storage failure. */
  async #scan(): Promise<void> {
    for (const key of this.#keys) {
      const own = this.#slot;
      if (this.#closed || !own) return;
      if (key === own.key || this.#watching.has(key)) continue;
      const release = await tryLock(this.#locks, key);
      if (!release) { this.#watch(key); continue; }
      try { await this.#take(key); } finally { void release(); }
    }
  }
  /** Waits for the slot `key`, which another running outbox holds, to take over what that outbox leaves unsent. */
  #watch(key: string): void {
    if (this.#closed || !this.#loaded || !this.#slot || key === this.#slot.key || this.#watching.has(key)) return;
    const watch = new AbortController();
    this.#watching.set(key, watch);
    this.#locks.request(key, { signal: watch.signal }, () => {
      // The lock may be granted just as this outbox closes; the slot's entries then wait for another one.
      if (this.#closed) return undefined;
      const take: Promise<void> = this.#take(key).catch((error: unknown) => this.#report(error)).finally(() => { this.#takes.delete(take); });
      this.#takes.add(take);
      return take;
    }).then(() => { this.#pump(); this.#arm(); }, (error: unknown) => { if (!watch.signal.aborted) this.#report(error); })
      .finally(() => { if (this.#watching.get(key) === watch) this.#watching.delete(key); });
  }
  /**
   * Moves the entries saved under `key`, whose lock this outbox holds, into its own slot, then removes them there.
   * Rejects when the slot can't be read.
   */
  async #take(key: string): Promise<void> {
    const text = await this.#read(key);
    if (this.#closed || text === null || text === undefined) return;
    const found = this.#parse(text).filter(item => !this.#items.has(item.requestId));
    if (found.length) {
      let unsent = found.length;
      for (const item of this.#items.values()) if (item.status !== "sent") unsent++;
      // Left for a later scan, when this outbox has room.
      if (unsent > 2 * maxUnsent) return;
      for (const item of found) this.#items.set(item.requestId, item);
      this.#changed();
      // The other slot keeps its copy until this one holds the entries.
      if (!await this.#save()) return;
    }
    try { await this.#remove(key); } catch (error) { this.#report(error); }
  }
  /** Once loading, takeovers, sends and saves have settled, passes the slot to the heir or else releases it. */
  async #release(handoff: Handoff): Promise<void> {
    try {
      await this.#restoring;
      await this.#adopting;
      while (this.#takes.size) await Promise.all([...this.#takes]);
      while (this.#lanes.size) await Promise.all([...this.#lanes.values()]);
      // A discard after close still saves; it must land before another outbox can claim the slot.
      let writing: Promise<void>;
      do { writing = this.#writing; await writing; } while (writing !== this.#writing);
    } finally {
      const slot = this.#slot;
      this.#slot = undefined;
      handoff.ended = true;
      if (handoff.heir) handoff.heir(slot); else await slot?.release();
    }
  }
  async #read(key: string): Promise<unknown> {
    const storage = this.client.storage;
    return storage ? storage.getItem(key) : this.client.asyncStorage!.getItem(key);
  }
  async #remove(key: string): Promise<void> {
    const storage = this.client.storage;
    if (storage) storage.removeItem(key); else await this.client.asyncStorage!.removeItem(key);
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
