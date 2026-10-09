import {
  ConvoHopProblem, parseId, parseString, type CommandOptions, type ConversationMute, type ConvoHopTransport, type OperationPayload,
  type PageOptions, type GraphqlTypes, type ConversationMessage, type ProtocolObject,
} from "@convohop/core";
import { randomUUID, retainRecovery } from "@convohop/core/internal";
import { admitConnection } from "./admission.js";
import type { ConvoHopClient } from "./client.js";
import { MediaConnection, type MediaOptions } from "./media.js";
import { abortReason, throwIfAborted } from "./platform.js";

type LiveMediaProfile = GraphqlTypes.LiveMediaProfile;

export type LiveSession = OperationPayload<"communication.liveSession">["result"];
export type LiveParticipation = OperationPayload<"communication.joinLiveSession">["result"]["participation"];
export type LiveConnectionGrant = OperationPayload<"communication.liveSessionCredentials">["result"];
export type LiveOperation = OperationPayload<"communication.liveSessionOperation">["result"];
export interface LiveWaitOptions { signal?: AbortSignal; timeoutMs?: number }
export interface LiveConnectOptions extends MediaOptions, CommandOptions {}
/**
 * One admitted native connection attempt. Send `token` only to `url`, and only once: the media server admits at most
 * one new connection with it, and it expires about 60 seconds after issue. Later resumes of that connection use the
 * same token or refresh tokens the media server pushes; a new connection needs a new attempt.
 */
export interface LiveConnectionAttempt {
  /** The `liveSessionCredentials` request that issued this attempt's grant. */
  readonly requestId: string;
  readonly mode: "INITIAL" | "RECONNECT";
  /** The media server's WebSocket URL: `wss:`, or `ws:` on a loopback host. */
  readonly url: string;
  /** The single-use `connectToken`. */
  readonly token: string;
  /** When the server's forwarding lease for this participation expires, unless renewed. */
  readonly leaseExpiresAt: string;
}
/** A native media connection opened by a {@link LiveConnector}. */
export interface LiveConnection {
  readonly connected: boolean;
  disconnect(): Promise<void>;
}
/**
 * Opens one native connection for an admitted attempt, for example with a stock LiveKit SDK:
 * `async attempt => { await room.connect(attempt.url, attempt.token); return { get connected() { … }, disconnect: () => room.disconnect() }; }`.
 */
export type LiveConnector<C extends LiveConnection = LiveConnection> = (attempt: LiveConnectionAttempt) => Promise<C>;

function waitOptions(options: LiveWaitOptions): { deadline: number; signal: AbortSignal | undefined } {
  const timeout = options.timeoutMs ?? 45000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300000) throw new RangeError("Wait timeout must be 1..300000 ms");
  return { deadline: Date.now() + timeout, signal: options.signal };
}

async function pause(signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener("abort", aborted); resolve(); }, 500);
    function aborted() { clearTimeout(timer); signal?.removeEventListener("abort", aborted); reject(signal && abortReason(signal)); }
    signal?.addEventListener("abort", aborted, { once: true });
  });
}

/** Reads the request IDs a live handle holds, or `undefined` once the app has dropped the handle. */
type HeldRequests = () => readonly (string | undefined)[] | undefined;
/** Each transport's readers of the request IDs that live handles hold. */
const heldRequests = new WeakMap<ConvoHopTransport, Set<HeldRequests>>();

/** The request IDs that `readers` report, forgetting the readers of dropped handles. */
function readHeld(readers: Set<HeldRequests>): string[] {
  const requestIds: string[] = [];
  for (const read of readers) {
    const held = read();
    if (held === undefined) readers.delete(read);
    else for (const requestId of held) if (requestId !== undefined) requestIds.push(requestId);
  }
  return requestIds;
}
/** Reads `held(handle)` through `handle`, a weak reference, so that it doesn't keep the handle. */
function reader<T extends object>(handle: WeakRef<T>, held: (handle: T) => readonly (string | undefined)[]): HeldRequests {
  return () => {
    const current = handle.deref();
    return current === undefined ? undefined : held(current);
  };
}
/**
 * Keeps the recovery records of the requests that a live handle holds, whatever their state, for as long as the app
 * keeps the handle: it reads them again for an original revision, a credential attempt's budget and its native
 * admission, so a full journal must not forget them. Ends when the handle lets go of a request ID, or the app drops
 * the handle. `held` must not capture the handle.
 */
function retainHeld<T extends object>(transport: ConvoHopTransport, handle: WeakRef<T>,
  held: (handle: T) => readonly (string | undefined)[]): void {
  let readers = heldRequests.get(transport);
  if (readers === undefined) {
    const created = readers = new Set();
    heldRequests.set(transport, created);
    retainRecovery(transport, () => readHeld(created));
  }
  // Forgets dropped handles' readers here too, not only when the journal is full, so the set doesn't grow with them.
  readHeld(readers);
  readers.add(reader(handle, held));
}

export class ConversationHandle {
  readonly live: ConversationLive;
  constructor(readonly client: ConvoHopClient, readonly conversationId: string) {
    parseId(conversationId);
    this.live = new ConversationLive(this);
  }
  get() { return this.client.getConversation(this.conversationId); }
  readonly messages = {
    send: async (message: { text: string; props?: ProtocolObject }, options: CommandOptions = {}) =>
      (await this.client.http.execute("communication.sendMessage", this.client.projectId,
        { conversationId: this.conversationId, text: message.text, props: message.props ?? {} }, options.requestId)).result,
    list: (beforeSequence?: string) => this.client.messages(this.conversationId, beforeSequence),
    edit: (message: ConversationMessage, text: string, options: CommandOptions = {}) => {
      if (message.conversationId !== this.conversationId) throw new TypeError("Message is outside this conversation");
      return this.client.edit(message, text, options.requestId);
    },
    delete: (message: ConversationMessage, options: CommandOptions = {}) => {
      if (message.conversationId !== this.conversationId) throw new TypeError("Message is outside this conversation");
      return this.client.delete(message, options.requestId);
    },
  };
  /**
   * This user's mute of message push notifications for the conversation. `until` (RFC 3339, in the future) applies
   * only to a mute. Calls still ring a muted member.
   */
  readonly mute = {
    get: async (): Promise<ConversationMute> => this.#own((await this.client.http.execute("communication.conversationMute",
      this.client.projectId, { conversationId: this.conversationId })).result),
    set: async (input: { muted: boolean; until?: string }, options: CommandOptions = {}): Promise<ConversationMute> => {
      if (typeof input.muted !== "boolean") throw new TypeError("muted must be a boolean");
      return this.#own((await this.client.http.execute("communication.setConversationMute", this.client.projectId,
        { conversationId: this.conversationId, muted: input.muted,
          ...(input.until === undefined ? {} : { until: parseString(input.until) }) }, options.requestId)).result);
    },
  };
  #own(mute: ConversationMute): ConversationMute {
    if (mute.conversationId !== this.conversationId || mute.principalId !== this.client.principalId)
      throw new TypeError("Conversation mute does not match the request");
    return mute;
  }
}

export class ConversationLive {
  constructor(readonly conversation: ConversationHandle) {}
  async current(): Promise<LiveSessionHandle | null> {
    const { client, conversationId } = this.conversation;
    const current = (await client.http.execute("communication.currentLiveSession", client.projectId, { conversationId })).result;
    if (current == null) return null;
    return new LiveSessionHandle(client, current);
  }
  async history(options: PageOptions = {}) {
    const { client, conversationId } = this.conversation;
    return (await client.http.execute("communication.liveSessions", client.projectId, { conversationId, ...options })).result;
  }
  startVoice(options: CommandOptions = {}) { return this.#start("INTERACTIVE", "AUDIO_ONLY", options); }
  startVideo(options: CommandOptions = {}) { return this.#start("INTERACTIVE", "AUDIO_VIDEO", options); }
  startBroadcast(input: { mediaProfile: LiveMediaProfile }, options: CommandOptions = {}) {
    return this.#start("BROADCAST", input.mediaProfile, options);
  }
  async #start(kind: "INTERACTIVE" | "BROADCAST", mediaProfile: LiveMediaProfile, options: CommandOptions) {
    const { client, conversationId } = this.conversation;
    const receipt = await client.http.execute("communication.startLiveSession", client.projectId,
      { conversationId, kind, mediaProfile }, options.requestId);
    return new LiveStartOperation(client, receipt);
  }
}

class LiveAction {
  constructor(readonly client: ConvoHopClient, readonly operationId: string, readonly liveSessionId: string,
    readonly kind: "START" | "END", readonly requestId: string) {
    parseId(operationId); parseId(liveSessionId); parseId(requestId);
  }
  async get(): Promise<LiveOperation> {
    const result = (await this.client.http.execute("communication.liveSessionOperation",
      this.client.projectId, { operationId: this.operationId })).result;
    if (result.liveSessionId !== this.liveSessionId || result.operationId !== this.operationId || result.kind !== this.kind)
      throw new TypeError("Live action scope changed");
    return result;
  }
  async completed(options: LiveWaitOptions = {}): Promise<NonNullable<LiveOperation["completion"]>> {
    const { deadline, signal } = waitOptions(options);
    do {
      throwIfAborted(signal);
      const action = await this.get();
      if (action.state === "COMPLETED") {
        if (!action.completion || (this.kind === "END" && action.completion.mediaCutoff?.state !== "ENFORCED"))
          throw new TypeError("Completed action is missing its original completion evidence");
        return action.completion;
      }
      if (action.state === "FAILED") {
        if (!action.failure) throw new TypeError("Failed live action is missing its reason");
        throw new ConvoHopProblem(action.failure.code, this.requestId, "accepted", 409, action.failure.message);
      }
      if (action.state !== "RUNNING") throw new TypeError("Unknown live action state");
      await pause(signal);
    } while (Date.now() < deadline);
    throw new ConvoHopProblem("RESOLUTION_REQUIRED", this.requestId, "accepted", 409,
      "Action remains unresolved; retain this operation ID and query it again. Elapsed time is not cutoff.");
  }
}

export class LiveStartOperation extends LiveAction {
  constructor(client: ConvoHopClient, readonly receipt: OperationPayload<"communication.startLiveSession">) {
    super(client, receipt.result.operationId, receipt.result.liveSessionId, "START", receipt.requestId);
  }
  async ready(options: LiveWaitOptions = {}): Promise<LiveSessionHandle> {
    await this.completed(options);
    return LiveSessionHandle.get(this.client, this.liveSessionId);
  }
}

export class LiveEndOperation extends LiveAction {
  constructor(client: ConvoHopClient, readonly receipt: OperationPayload<"communication.endLiveSession">) {
    super(client, receipt.result.operationId, receipt.result.liveSessionId, "END", receipt.requestId);
  }
}

export class LiveSessionHandle {
  readonly liveSessionId: string;
  readonly generation: string;
  readonly conversationId: string;
  #endRequest: string | undefined;
  #retaining = false;
  constructor(readonly client: ConvoHopClient, readonly snapshot: LiveSession) {
    this.liveSessionId = parseId(snapshot.liveSessionId);
    this.generation = snapshot.generation;
    this.conversationId = parseId(snapshot.conversationId);
  }
  static async get(client: ConvoHopClient, liveSessionId: string) {
    return new LiveSessionHandle(client, (await client.http.execute("communication.liveSession",
      client.projectId, { liveSessionId: parseId(liveSessionId) })).result);
  }
  async get(): Promise<LiveSession> {
    const current = (await LiveSessionHandle.get(this.client, this.liveSessionId)).snapshot;
    if (current.generation !== this.generation || current.conversationId !== this.conversationId)
      throw new TypeError("Live occurrence identity changed");
    return current;
  }
  async join(options: CommandOptions = {}) {
    const receipt = await this.client.http.execute("communication.joinLiveSession", this.client.projectId,
      { liveSessionId: this.liveSessionId, expectedGeneration: this.generation }, options.requestId);
    return new LiveParticipationHandle(this, receipt.result.participation);
  }
  async participation() {
    const current = (await this.get()).myParticipation;
    return current ? new LiveParticipationHandle(this, current) : null;
  }
  async participants(options: PageOptions = {}) {
    return (await this.client.http.execute("communication.liveSessionParticipants",
      this.client.projectId, { liveSessionId: this.liveSessionId, ...options })).result;
  }
  readonly alerts = {
    send: async (principalIds: string[], options: CommandOptions = {}) =>
      this.client.http.execute("communication.alertLiveSession", this.client.projectId,
        { liveSessionId: this.liveSessionId, expectedGeneration: this.generation, principalIds }, options.requestId),
  };
  async end(options: CommandOptions = {}) {
    await this.client.http.initializeRecovery();
    this.#endRequest = options.requestId ?? this.#endRequest ??
      [...this.client.http.recoveryStates].reverse().find(state =>
        state.operation === "communication.endLiveSession" && state.input.liveSessionId === this.liveSessionId)?.requestId ??
      randomUUID(this.client.platform);
    this.#retain();
    const saved = this.client.http.recoveryStates.find(state => state.requestId === this.#endRequest);
    const revision = saved ? saved.input.expectedRevision : (await this.get()).revision;
    if (typeof revision !== "string") throw new TypeError("Missing original end revision");
    const receipt = await this.client.http.execute("communication.endLiveSession", this.client.projectId,
      { liveSessionId: this.liveSessionId, expectedGeneration: this.generation, expectedRevision: revision }, this.#endRequest);
    return new LiveEndOperation(this.client, receipt);
  }
  /** Keeps the record of this handle's end request, which holds its original revision, while the app keeps the handle. */
  #retain(): void {
    if (this.#retaining) return;
    this.#retaining = true;
    retainHeld(this.client.http, new WeakRef(this), LiveSessionHandle.#held);
  }
  static #held(handle: LiveSessionHandle): readonly (string | undefined)[] { return [handle.#endRequest]; }
}

export class LiveParticipationHandle {
  readonly participationId: string;
  #attempt: { requestId: string; mode: "INITIAL" | "RECONNECT"; replacementOfConnectionId?: string; used: boolean } | undefined;
  #connection: LiveConnection | undefined;
  /** The attempt in flight; `media` is set when it is `connect()`'s own. */
  #connecting: { media: Promise<MediaConnection> | undefined } | undefined;
  #leaveRequest: string | undefined;
  #retaining = false;
  constructor(readonly live: LiveSessionHandle, readonly snapshot: LiveParticipation) {
    this.participationId = parseId(snapshot.participationId);
    this.#leaveRequest = [...live.client.http.recoveryStates].reverse().find(state =>
      state.operation === "communication.leaveLiveSession" && state.input.participationId === this.participationId)?.requestId;
    if (this.#leaveRequest) this.#retain();
  }
  async get(): Promise<LiveParticipation> {
    const current = (await this.live.get()).myParticipation;
    if (!current || current.participationId !== this.participationId)
      throw new ConvoHopProblem("PARTICIPATION_MISMATCH", randomUUID(this.live.client.platform), "rejected", 409, "This participation is no longer current");
    return current;
  }
  /** Connects this participation's media in the browser with `livekit-client`, which is loaded on first use. */
  connect(options: LiveConnectOptions = {}): Promise<MediaConnection> {
    if (this.#leaveRequest) return Promise.reject(new Error("Leave has been requested; resolve its cutoff before rejoining"));
    if (this.#connecting) return this.#connecting.media ?? Promise.reject(new Error("A connector's native connection attempt is in progress"));
    if (this.#connection?.connected) return this.#connection instanceof MediaConnection ? Promise.resolve(this.#connection)
      : Promise.reject(new Error("A connector's native connection is connected; disconnect it first"));
    const media = this.#settle(MediaConnection.connectParticipation(this, options));
    this.#connecting = { media };
    return this.#release(media);
  }
  /**
   * Connects this participation's media with your own native client, such as a stock LiveKit SDK on React Native.
   * The SDK obtains a participation-bound grant, checks the media URL, records the attempt durably, then calls
   * `connector` once. A connector failure is `MEDIA_CONNECT_FAILED` with an unknown outcome: the reservation remains,
   * and the next call resolves the old attempt before a fresh one. Rejects while another attempt is in flight or
   * another connection is connected.
   */
  connectWith<C extends LiveConnection>(connector: LiveConnector<C>, options: CommandOptions = {}): Promise<C> {
    if (typeof connector !== "function") return Promise.reject(new TypeError("connector must be a function"));
    if (this.#leaveRequest) return Promise.reject(new Error("Leave has been requested; resolve its cutoff before rejoining"));
    if (this.#connecting) return Promise.reject(new Error("A native connection attempt is in progress"));
    if (this.#connection?.connected) return Promise.reject(new Error("A native connection is connected; disconnect it first"));
    const work = this.#settle(admitConnection(this, options, connector, this.live.client.platform));
    this.#connecting = { media: undefined };
    return this.#release(work);
  }
  async #settle<C extends LiveConnection>(attempt: Promise<C>): Promise<C> {
    const connection = await attempt;
    if (this.#leaveRequest) { await connection.disconnect(); throw new Error("Participation was left during connection"); }
    this.#connection = connection;
    return connection;
  }
  #release<C>(work: Promise<C>): Promise<C> {
    const entry = this.#connecting;
    return work.finally(() => { if (this.#connecting === entry) this.#connecting = undefined; });
  }
  /** @internal Preserves each credential command separately from native connection attempts. */
  async connectionGrant(options: CommandOptions = {}): Promise<{ requestId: string; mode: "INITIAL" | "RECONNECT"; grant: LiveConnectionGrant }> {
    const { client, liveSessionId, generation } = this.live;
    this.#retain();
    const current = await this.get();
    if (!this.#attempt) {
      const previous = [...client.http.recoveryStates].reverse().find(state =>
        state.operation === "communication.liveSessionCredentials" && state.input.participationId === this.participationId);
      if (previous) {
        const mode = previous.input.mode;
        if (mode !== "INITIAL" && mode !== "RECONNECT") throw new TypeError("Unknown stored credential operation");
        const replacement = previous.input.replacementOfConnectionId;
        this.#attempt = { requestId: previous.requestId, mode,
          used: previous.mediaAdmissionAttempted === true || !!current.nativeConnectionId,
          ...(replacement === undefined ? {} : { replacementOfConnectionId: parseId(replacement) }) };
      }
    }
    const saved = this.#attempt && client.http.recoveryStates.find(state => state.requestId === this.#attempt?.requestId);
    const needsResolution = saved && (saved.attemptCount >= 3 || Date.now() > saved.retryDeadline ||
      Date.now() < saved.firstSubmittedAt || Date.now() < saved.lastAttemptAt ||
      saved.lastAttemptClassification === "CREDENTIAL_REFRESH_REQUIRED");
    if (this.#attempt && (this.#attempt.used || needsResolution || (options.requestId && options.requestId !== this.#attempt.requestId))) {
      const old = this.#attempt;
      const resolution = await client.requests.resolve(old.requestId);
      const issuance = resolution?.receipt?.result?.liveCredentialIssuance;
      if (!resolution || !issuance || issuance.participationId !== this.participationId || issuance.liveSessionId !== liveSessionId)
        throw new ConvoHopProblem("RESOLUTION_REQUIRED", old.requestId, "unknown", 409, "Resolve the original credential attempt before obtaining another grant");
      const unobserved = !current.nativeConnectionId ||
        (old.mode === "RECONNECT" && current.nativeConnectionId === old.replacementOfConnectionId);
      if (unobserved && Date.parse(issuance.admissionExpiresAt) > Date.parse(resolution.checkedAt))
        throw new ConvoHopProblem("RESOLUTION_REQUIRED", old.requestId, "committed", 409, "Native admission remains unresolved; keep this reservation and retry or explicitly leave");
      if (options.requestId === old.requestId)
        throw new ConvoHopProblem("CREDENTIAL_REFRESH_REQUIRED", old.requestId, "committed", 409, "The resolved old credential requires a separately identified fresh attempt");
      this.#attempt = undefined;
    }
    this.#attempt ??= { requestId: options.requestId ?? randomUUID(client.platform),
      mode: current.nativeConnectionId ? "RECONNECT" : "INITIAL", used: false,
      ...(current.nativeConnectionId ? { replacementOfConnectionId: current.nativeConnectionId } : {}) };
    const { requestId, mode, replacementOfConnectionId } = this.#attempt;
    const receipt = await client.http.execute("communication.liveSessionCredentials", client.projectId,
      { liveSessionId, participationId: this.participationId, expectedGeneration: generation, mode,
        ...(replacementOfConnectionId ? { replacementOfConnectionId } : {}) }, requestId);
    const grant = receipt.result;
    if (grant.liveSessionId !== liveSessionId || grant.participationId !== this.participationId || grant.generation !== generation)
      throw new TypeError("Native credential scope differs from the participation");
    return { requestId, mode, grant };
  }
  /** @internal Once signaling starts, an uncertain admission is resolved, never blindly reused. */
  connectionAttempted(): void | Promise<void> {
    if (!this.#attempt) throw new Error("No credential attempt exists");
    this.#attempt.used = true;
    return this.live.client.http.markMediaAdmissionAttempted(this.#attempt.requestId);
  }
  async leave(options: CommandOptions = {}) {
    if (this.#leaveRequest && options.requestId && options.requestId !== this.#leaveRequest)
      throw new Error("Resolve the original leave request before replacing its identity");
    this.#leaveRequest ??= options.requestId ?? randomUUID(this.live.client.platform);
    this.#retain();
    await this.#connection?.disconnect();
    return this.live.client.http.execute("communication.leaveLiveSession", this.live.client.projectId,
      { liveSessionId: this.live.liveSessionId, expectedGeneration: this.live.generation,
        participationId: this.participationId }, this.#leaveRequest);
  }
  /**
   * Keeps the records of this handle's leave request and current credential attempt while the app keeps the handle:
   * it reads the attempt's record again for its budget and native admission.
   */
  #retain(): void {
    if (this.#retaining) return;
    this.#retaining = true;
    retainHeld(this.live.client.http, new WeakRef(this), LiveParticipationHandle.#held);
  }
  static #held(handle: LiveParticipationHandle): readonly (string | undefined)[] {
    return [handle.#leaveRequest, handle.#attempt?.requestId];
  }
}
