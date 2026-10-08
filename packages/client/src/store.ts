import {
  ConvoHopProblem, parseCounter, parseId, parseObject, parseString,
  type Conversation, type ConversationMessage, type ItemPage, type ProtocolObject,
} from "@convohop/core";
import type { ConversationStream, ConvoHopClient, ReadReceipt } from "./client.js";
import { Outbox, type OutboxEntry } from "./outbox.js";
import { asError, frozen, notify } from "./util.js";

/**
 * - `idle`: not opened yet.
 * - `loading`: loading the conversation, its newest messages and its receipts, then catching up.
 * - `live`: following the conversation.
 * - `reconnecting`: realtime updates were interrupted; the store is reconnecting on its own.
 * - `error`: updates stopped. See `error` and `resyncRequired`, then call `open()` or `resync()`.
 * - `closed`: {@link ConversationStore.close} was called.
 */
export type ConversationStatus = "idle" | "loading" | "live" | "reconnecting" | "error" | "closed";
export interface ConversationSnapshot {
  readonly status: ConversationStatus;
  /** The conversation and the user's membership, once loaded. */
  readonly conversation: Readonly<Conversation> | undefined;
  /** Loaded messages, oldest first. Deleted messages stay, with `deleted: true` and no text. */
  readonly messages: readonly Readonly<ConversationMessage>[];
  /** This conversation's outbox entries that aren't in `messages` yet, in send order. */
  readonly pending: readonly OutboxEntry[];
  /** Each member's delivery and read progress, ordered by principal. */
  readonly receipts: readonly Readonly<ReadReceipt>[];
  /** Whether {@link ConversationStore.loadOlder} can load earlier messages. */
  readonly hasOlder: boolean;
  readonly error: Error | undefined;
  /** The saved replay position is no longer valid. Only {@link ConversationStore.resync} recovers. */
  readonly resyncRequired: boolean;
}
export interface ConversationStoreOptions {
  /** A shared outbox for optimistic sends. Without one the store uses its own, which `close()` closes. */
  outbox?: Outbox;
  /** Called after each new event is applied, including call and live-session events the store doesn't track. */
  onEvent?: (event: ProtocolObject) => void;
  /** Called for every error, including realtime interruptions the store recovers from on its own. */
  onError?: (error: Error) => void;
}

const resyncCodes = new Set(["CURSOR_AHEAD", "CURSOR_EXPIRED", "CURSOR_SCOPE_MISMATCH"]);
const receiptPages = 50;
class Superseded extends Error {
  constructor() { super("Conversation store work was superseded"); }
}
function needsResync(error: unknown): boolean {
  return error instanceof ConvoHopProblem ? resyncCodes.has(error.code)
    : error instanceof Error && /resynchronization required/u.test(error.message);
}
function counter(value: unknown): bigint { return BigInt(parseCounter(value)); }
/** Orders two receipts by membership epoch, then visibility epoch. */
function epochOrder(a: { membershipEpoch: string; visibilityEpoch: string }, b: { membershipEpoch: string; visibilityEpoch: string }): number {
  const membership = counter(a.membershipEpoch) - counter(b.membershipEpoch);
  const order = membership === 0n ? counter(a.visibilityEpoch) - counter(b.visibilityEpoch) : membership;
  return order > 0n ? 1 : order < 0n ? -1 : 0;
}
function later(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return counter(a) >= counter(b) ? a : b;
}
/** Combines two receipts for one member. Newer epochs replace older coverage; equal epochs keep the furthest progress. */
function mergeReceipt(current: ReadReceipt | undefined, next: ReadReceipt): ReadReceipt {
  if (!current) return next;
  const order = epochOrder(next, current);
  if (order < 0) return current;
  if (order > 0) return next;
  return { ...next, deliveredThroughSequence: later(current.deliveredThroughSequence, next.deliveredThroughSequence),
    readThroughSequence: later(current.readThroughSequence, next.readThroughSequence),
    updatedAt: next.updatedAt ?? current.updatedAt };
}
function olderCursor(page: ItemPage<ConversationMessage>): string | undefined {
  if (page.complete) return undefined;
  if (typeof page.nextCursor !== "string") throw new TypeError("Incomplete message page has no cursor");
  return parseCounter(page.nextCursor);
}
async function each<T>(items: T[], concurrency: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await work(items[next++]!);
  }));
}

/**
 * One conversation's messages, receipts and pending sends, kept current from its authorized event stream.
 *
 * `open()` loads the conversation, its newest page of messages and every receipt, then follows new events. The
 * replay starts at the stream's saved position, so give the client `recoveryStorage` to make reopening incremental;
 * without it, opening replays the conversation's visible history (applying nothing already loaded) before going live.
 * Keep one store per conversation and client: stores of the same conversation share the saved replay position.
 */
export class ConversationStore {
  readonly client: ConvoHopClient;
  readonly conversationId: string;
  readonly outbox: Outbox;
  readonly #ownsOutbox: boolean;
  readonly #onEvent: ((event: ProtocolObject) => void) | undefined;
  readonly #onError: ((error: Error) => void) | undefined;
  readonly #listeners = new Set<() => void>();
  readonly #unsubscribe: () => void;
  #status: ConversationStatus = "idle";
  #conversation: Conversation | undefined;
  #messages = new Map<string, ConversationMessage>();
  #receipts = new Map<string, ReadReceipt>();
  #older: string | undefined;
  #error: Error | undefined;
  #resyncRequired = false;
  /** Events up to this sequence are reflected in the loaded state. */
  #through = 0n;
  #generation = 0;
  #stream: ConversationStream | undefined;
  #opening: Promise<void> | undefined;
  #loadingOlder: Promise<boolean> | undefined;
  #exclusive: Promise<unknown> = Promise.resolve();
  readonly #reports = new Map<"delivered" | "read", Promise<unknown>>();
  #refreshTried = false;
  #snapshot: ConversationSnapshot | undefined;
  #messageList: readonly ConversationMessage[] | undefined;
  #receiptList: readonly ReadReceipt[] | undefined;
  constructor(client: ConvoHopClient, conversationId: string, options: ConversationStoreOptions = {}) {
    this.client = client; this.conversationId = parseId(conversationId);
    this.#onEvent = options.onEvent; this.#onError = options.onError;
    if (options.outbox && options.outbox.client !== client) throw new TypeError("The outbox belongs to another client");
    this.#ownsOutbox = !options.outbox;
    this.outbox = options.outbox ?? new Outbox(client, { onError: error => this.#report(error) });
    this.#unsubscribe = this.outbox.subscribe(() => { this.#settle(); this.#changed(); });
  }
  /** A frozen snapshot, replaced on every change. Unchanged message and receipt lists keep their identity. */
  get snapshot(): ConversationSnapshot {
    return this.#snapshot ??= Object.freeze({
      status: this.#status, conversation: this.#conversation, messages: this.#sortedMessages(), pending: this.#pending(),
      receipts: this.#sortedReceipts(), hasOlder: this.#older !== undefined, error: this.#error, resyncRequired: this.#resyncRequired,
    });
  }
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  }
  /**
   * Loads the conversation and follows it. While it is open this returns the current attempt; after an error it
   * reconnects from the loaded state. It doesn't recover from `resyncRequired`: call {@link resync} for that.
   */
  open(): Promise<void> {
    if (this.#status === "closed") return Promise.reject(new Error("The conversation store is closed"));
    if (this.#opening) return this.#opening;
    if (this.#status === "live" || this.#status === "reconnecting") return Promise.resolve();
    return this.#start(this.#conversation ? "reconnect" : "open");
  }
  /** Discards the saved replay position, reloads the conversation and replays its authorized history from the start. */
  resync(): Promise<void> {
    if (this.#status === "closed") return Promise.reject(new Error("The conversation store is closed"));
    return this.#start("resync");
  }
  /** Loads the previous page of messages. Resolves whether it added any. */
  loadOlder(): Promise<boolean> {
    if (this.#loadingOlder) return this.#loadingOlder;
    if (this.#status === "closed" || this.#older === undefined) return Promise.resolve(false);
    const generation = this.#generation;
    const loading = this.#serial(async () => {
      const before = this.#older;
      if (generation !== this.#generation || before === undefined) return false;
      const page = await this.client.messages(this.conversationId, before);
      if (generation !== this.#generation || before !== this.#older) return false;
      let added = false;
      for (const message of page.items) {
        if (!this.#messages.has(message.messageId)) { this.#messages.set(message.messageId, frozen(message)); added = true; }
      }
      this.#older = olderCursor(page);
      if (added) this.#messageList = undefined;
      this.#changed();
      return added;
    }).finally(() => { if (this.#loadingOlder === loading) this.#loadingOlder = undefined; });
    this.#loadingOlder = loading;
    return loading;
  }
  /** Queues a message in the outbox. It shows in `pending` until it appears in `messages`. */
  send(text: string, props?: ProtocolObject): OutboxEntry {
    if (this.#status === "closed") throw new Error("The conversation store is closed");
    return this.outbox.send(this.conversationId, text, props);
  }
  /** Reports reading through the newest loaded message. Resolves whether a report was needed. */
  markRead(): Promise<boolean> { return this.#reportOnce("read"); }
  /** Reports delivery through the newest loaded message. Resolves whether a report was needed. */
  markDelivered(): Promise<boolean> { return this.#reportOnce("delivered"); }
  /** Stops following the conversation. A store the app didn't give an outbox also closes its own. */
  close(): void {
    if (this.#status === "closed") return;
    this.#generation++;
    this.#stream?.close(); this.#stream = undefined; this.#opening = undefined;
    this.#unsubscribe();
    if (this.#ownsOutbox) this.outbox.close();
    this.#status = "closed"; this.#changed();
  }

  #start(mode: "open" | "reconnect" | "resync"): Promise<void> {
    const generation = ++this.#generation;
    this.#stream?.close(); this.#stream = undefined;
    this.#status = "loading"; this.#error = undefined; this.#changed();
    const opening = this.#load(generation, mode).finally(() => { if (this.#opening === opening) this.#opening = undefined; });
    this.#opening = opening;
    return opening;
  }
  async #load(generation: number, mode: "open" | "reconnect" | "resync"): Promise<void> {
    try {
      if (mode !== "reconnect") await this.#serial(() => this.#loadSnapshot(generation));
      let stream: ConversationStream | undefined;
      const apply = (events: ProtocolObject[]) => this.#serial(() => this.#apply(generation, events));
      const onError = (error: Error) => this.#streamError(generation, stream, error);
      stream = mode === "resync"
        ? await this.client.resyncAuthorizedHistory(this.conversationId, apply, onError)
        : await this.client.watch(this.conversationId, apply, onError);
      if (generation !== this.#generation) { stream.close(); return; }
      this.#stream = stream;
      this.#status = "live"; this.#error = undefined; this.#resyncRequired = false;
      this.#changed();
    } catch (error) {
      if (error instanceof Superseded || generation !== this.#generation) return;
      this.#fail(error);
      throw error;
    }
  }
  async #loadSnapshot(generation: number): Promise<void> {
    const conversation = await this.client.getConversation(this.conversationId);
    this.#check(generation);
    if (conversation.conversationId !== this.conversationId) throw new TypeError("Conversation does not match the request");
    const [page, receipts] = await Promise.all([this.client.messages(this.conversationId), this.#loadReceipts()]);
    this.#check(generation);
    this.#conversation = frozen(conversation);
    this.#messages = new Map(page.items.map(message => [message.messageId, frozen(message)]));
    this.#older = olderCursor(page);
    this.#receipts = receipts;
    this.#through = counter(conversation.latestSequence);
    this.#messageList = undefined; this.#receiptList = undefined;
    this.#settle(); this.#changed();
  }
  async #loadReceipts(): Promise<Map<string, ReadReceipt>> {
    const receipts = new Map<string, ReadReceipt>();
    let cursor: string | undefined;
    for (let page = 0; page < receiptPages; page++) {
      const result = await this.client.receipts(this.conversationId, cursor);
      for (const receipt of result.items) receipts.set(receipt.principalId, frozen(receipt));
      if (result.complete) return receipts;
      if (typeof result.nextCursor !== "string") throw new TypeError("Incomplete receipt page has no cursor");
      cursor = result.nextCursor;
    }
    throw new RangeError("Receipts exceed the supported conversation size");
  }
  /** Applies one replay page. A failure leaves the store unchanged, so the stream can deliver the page again. */
  async #apply(generation: number, events: ProtocolObject[]): Promise<void> {
    this.#check(generation);
    const fresh = events.filter(event => counter(event.sequence) > this.#through);
    if (fresh.length) await this.#applyFresh(generation, fresh);
    this.#refreshTried = false;
    if (this.#status === "reconnecting") { this.#status = "live"; this.#error = undefined; this.#changed(); }
    for (const event of fresh) {
      try { this.#onEvent?.(event); } catch (error) { this.#report(error); }
    }
  }
  async #applyFresh(generation: number, fresh: ProtocolObject[]): Promise<void> {
    const self = this.client.principalId;
    const created = new Map<string, bigint>(), revised = new Map<string, bigint>();
    const reported: ReadReceipt[] = [];
    let conversationChanged = false, membersChanged = false, expanded = false;
    for (const event of fresh) {
      const type = parseString(event.type), sequence = counter(event.sequence);
      const payload = event.payload == null ? {} : parseObject(event.payload);
      if (type === "message.created") {
        const id = parseId(payload.messageId);
        if (!this.#messages.has(id)) created.set(id, sequence);
      } else if (type === "message.edited" || type === "message.deleted") {
        const id = parseId(payload.messageId), revision = counter(payload.revision);
        if ((this.#messages.has(id) || created.has(id)) && revision > (revised.get(id) ?? 0n)) revised.set(id, revision);
      } else if (type === "receipt.reported") {
        const kind = parseString(payload.kind), through = parseCounter(payload.throughSequence);
        if (kind === "read" || kind === "delivered") {
          reported.push({ principalId: parseId(payload.principalId), membershipEpoch: parseCounter(payload.membershipEpoch),
            visibilityEpoch: parseCounter(payload.visibilityEpoch), deliveredThroughSequence: through,
            readThroughSequence: kind === "read" ? through : null, updatedAt: parseString(event.occurredAt) });
        }
      } else if (type === "conversation.updated") {
        conversationChanged = true;
      } else if (type.startsWith("member.")) {
        membersChanged = true;
        if (parseId(payload.principalId) === self) {
          conversationChanged = true;
          if (type === "member.historyExpanded") expanded = true;
        }
      }
    }
    const fetched = new Map<string, ConversationMessage>();
    if (created.size) {
      let newest = 0n;
      for (const sequence of created.values()) if (sequence > newest) newest = sequence;
      // Created messages take their event's sequence, so the page below the newest one holds them all unless it's cut short.
      const page = await this.client.messages(this.conversationId, (newest + 1n).toString(), created.size);
      for (const message of page.items) if (created.has(message.messageId)) fetched.set(message.messageId, message);
    }
    const singles = [...created.keys()].filter(id => !fetched.has(id));
    for (const [id, revision] of revised) {
      const known = fetched.get(id) ?? this.#messages.get(id);
      if (known && counter(known.revision) < revision && !singles.includes(id)) singles.push(id);
    }
    await each(singles, 4, async id => {
      try { fetched.set(id, await this.client.getMessage(this.conversationId, id)); }
      catch (error) { if (!(error instanceof ConvoHopProblem && error.code === "NOT_FOUND")) throw error; }
    });
    const conversation = conversationChanged ? await this.client.getConversation(this.conversationId) : undefined;
    if (conversation && conversation.conversationId !== this.conversationId) throw new TypeError("Conversation does not match the request");
    const receipts = membersChanged ? await this.#loadReceipts() : undefined;
    this.#check(generation);

    for (const [id, message] of fetched) {
      const known = this.#messages.get(id);
      if (!known || counter(known.revision) <= counter(message.revision)) this.#messages.set(id, frozen(message));
    }
    if (fetched.size) this.#messageList = undefined;
    if (conversation) this.#conversation = frozen(conversation);
    if (expanded && this.#older === undefined) {
      let oldest: bigint | undefined;
      for (const message of this.#messages.values()) {
        const sequence = counter(message.sequence);
        if (oldest === undefined || sequence < oldest) oldest = sequence;
      }
      this.#older = (oldest ?? this.#through + 1n).toString();
    }
    if (receipts) this.#receipts = receipts;
    else for (const receipt of reported) this.#receipts.set(receipt.principalId, frozen(mergeReceipt(this.#receipts.get(receipt.principalId), receipt)));
    if (receipts || reported.length) this.#receiptList = undefined;
    this.#through = counter(fresh[fresh.length - 1]!.sequence);
    this.#settle(); this.#changed();
  }
  #streamError(generation: number, stream: ConversationStream | undefined, error: Error): void {
    if (generation !== this.#generation || error instanceof Superseded) return;
    this.#report(error);
    // Before the stream exists, errors come from recovering earlier sends, not from the stream.
    if (!stream) return;
    if (!stream.closed) {
      if (this.#status === "live") { this.#status = "reconnecting"; this.#error = error; this.#changed(); }
      return;
    }
    if (this.#stream === stream) this.#stream = undefined;
    if (error instanceof ConvoHopProblem && error.code === "UNAUTHENTICATED" && !this.#refreshTried &&
        this.client.sessionRefreshState === "ready") {
      // One verified session refresh per interruption, then follow the conversation again from the loaded state.
      this.#refreshTried = true;
      const next = ++this.#generation;
      this.#status = "reconnecting"; this.#error = error; this.#changed();
      const opening = this.client.refreshSession().then(() => this.#load(next, "reconnect"), failure => {
        if (next === this.#generation) this.#fail(failure);
      }).catch(() => undefined).finally(() => { if (this.#opening === opening) this.#opening = undefined; });
      this.#opening = opening;
      return;
    }
    this.#status = "error"; this.#error = error; this.#resyncRequired = needsResync(error);
    this.#changed();
  }
  #fail(error: unknown): void {
    const failure = asError(error, "Conversation update failed");
    this.#report(failure);
    this.#status = "error"; this.#error = failure; this.#resyncRequired = needsResync(failure);
    this.#changed();
  }
  #reportOnce(kind: "delivered" | "read"): Promise<boolean> {
    if (this.#status === "closed") return Promise.reject(new Error("The conversation store is closed"));
    const previous = this.#reports.get(kind) ?? Promise.resolve();
    const report = previous.catch(() => undefined).then(() => this.#reportReceipt(kind));
    this.#reports.set(kind, report);
    void report.catch(() => undefined).finally(() => { if (this.#reports.get(kind) === report) this.#reports.delete(kind); });
    return report;
  }
  async #reportReceipt(kind: "delivered" | "read"): Promise<boolean> {
    const generation = this.#generation, messages = this.#sortedMessages();
    let target: ConversationMessage | undefined;
    for (let index = messages.length - 1; index >= 0 && !target; index--) if (!messages[index]!.deleted) target = messages[index];
    if (!target) return false;
    for (let attempt = 0; ; attempt++) {
      const membership = this.#conversation?.membership;
      if (!membership) throw new Error("Open the conversation as a member before reporting receipts");
      const own = this.#receipts.get(this.client.principalId);
      const through = own && epochOrder(own, membership) === 0 ? (kind === "read" ? own.readThroughSequence : own.deliveredThroughSequence) : null;
      if (through !== null && counter(through) >= counter(target.sequence)) return false;
      try {
        const receipt = kind === "read"
          ? await this.client.reportRead(this.conversationId, membership, target.sequence)
          : await this.client.reportDelivered(this.conversationId, membership, target.sequence);
        if (generation === this.#generation) {
          this.#receipts.set(receipt.principalId, frozen(mergeReceipt(this.#receipts.get(receipt.principalId), receipt)));
          this.#receiptList = undefined; this.#changed();
        }
        return true;
      } catch (error) {
        // The membership changed since it was loaded: report again once with the current epochs.
        if (attempt > 0 || !(error instanceof ConvoHopProblem && error.code === "REVISION_CONFLICT")) throw error;
        const conversation = await this.client.getConversation(this.conversationId);
        if (generation !== this.#generation || conversation.conversationId !== this.conversationId) throw error;
        this.#conversation = frozen(conversation); this.#changed();
      }
    }
  }
  /** Runs store updates one at a time, so a page of older messages can't overwrite a newer revision from an event. */
  #serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.#exclusive.catch(() => undefined).then(work);
    this.#exclusive = run;
    return run;
  }
  #check(generation: number): void {
    if (generation !== this.#generation) throw new Superseded();
  }
  /** Releases sent outbox entries once their message is loaded. */
  #settle(): void {
    if (!this.#conversation || this.#status === "closed") return;
    for (const entry of this.outbox.entries) {
      if (entry.conversationId === this.conversationId && entry.status === "sent" &&
          (entry.messageId === undefined || this.#messages.has(entry.messageId))) this.outbox.settle(entry.requestId);
    }
  }
  #pending(): readonly OutboxEntry[] {
    return Object.freeze(this.outbox.entries.filter(entry => entry.conversationId === this.conversationId &&
      !(entry.status === "sent" && (entry.messageId === undefined || this.#messages.has(entry.messageId)))));
  }
  #sortedMessages(): readonly ConversationMessage[] {
    return this.#messageList ??= Object.freeze([...this.#messages.values()].sort((a, b) => {
      const order = counter(a.sequence) - counter(b.sequence);
      return order > 0n ? 1 : order < 0n ? -1 : 0;
    }));
  }
  #sortedReceipts(): readonly ReadReceipt[] {
    return this.#receiptList ??= Object.freeze([...this.#receipts.values()].sort((a, b) =>
      a.principalId < b.principalId ? -1 : a.principalId > b.principalId ? 1 : 0));
  }
  #report(error: unknown): void {
    try { this.#onError?.(asError(error, "Conversation update failed")); } catch { /* a failing handler must not stop the store */ }
  }
  #changed(): void {
    this.#snapshot = undefined;
    notify(this.#listeners, error => this.#report(error));
  }
}
