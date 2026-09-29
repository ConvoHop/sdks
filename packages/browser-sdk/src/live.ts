import { V1Problem, v1Id, type V1Client, type V1Message, type V1Record } from "./v1.js";
import { V1MediaConnection, type V1MediaOptions } from "./v1-media.js";
import type { OperationPayload } from "./v1-graphql.js";
import type { LiveMediaProfile } from "./v1-generated.js";

export type LiveSession = OperationPayload<"communication.liveSession">["result"];
export type LiveParticipation = OperationPayload<"communication.joinLiveSession">["result"]["participation"];
export type LiveConnectionGrant = OperationPayload<"communication.liveSessionCredentials">["result"];
export type LiveOperation = OperationPayload<"communication.liveSessionOperation">["result"];
export type LegacyInviteOnlyCall = Extract<
  OperationPayload<"communication.currentLiveSession">["result"], { __typename: "LegacyInviteOnlyCall" }>;
export interface CommandOptions { requestId?: string }
export interface PageOptions { cursor?: string; limit?: number }
export interface LiveWaitOptions { signal?: AbortSignal; timeoutMs?: number }
export interface LiveConnectOptions extends V1MediaOptions, CommandOptions {}

function waitOptions(options: LiveWaitOptions): { deadline: number; signal: AbortSignal | undefined } {
  const timeout = options.timeoutMs ?? 45000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300000) throw new RangeError("Wait timeout must be 1..300000 ms");
  return { deadline: Date.now() + timeout, signal: options.signal };
}

async function pause(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener("abort", aborted); resolve(); }, 500);
    function aborted() { clearTimeout(timer); signal?.removeEventListener("abort", aborted); reject(signal?.reason); }
    signal?.addEventListener("abort", aborted, { once: true });
  });
}

export class ConversationHandle {
  readonly live: ConversationLive;
  constructor(readonly client: V1Client, readonly conversationId: string) {
    v1Id(conversationId);
    this.live = new ConversationLive(this);
  }
  get() { return this.client.getConversation(this.conversationId); }
  readonly messages = {
    send: async (message: { text: string; props?: V1Record }, options: CommandOptions = {}) =>
      (await this.client.http.execute("communication.sendMessage", this.client.projectId,
        { conversationId: this.conversationId, text: message.text, props: message.props ?? {} }, options.requestId)).result,
    list: (beforeSequence?: string) => this.client.messages(this.conversationId, beforeSequence),
    edit: (message: V1Message, text: string, options: CommandOptions = {}) => {
      if (message.conversationId !== this.conversationId) throw new TypeError("Message is outside this conversation");
      return this.client.edit(message, text, options.requestId);
    },
    delete: (message: V1Message, options: CommandOptions = {}) => {
      if (message.conversationId !== this.conversationId) throw new TypeError("Message is outside this conversation");
      return this.client.delete(message, options.requestId);
    },
  };
}

export class ConversationLive {
  constructor(readonly conversation: ConversationHandle) {}
  async current(): Promise<LiveSessionHandle | LegacyInviteOnlyCall | null> {
    const { client, conversationId } = this.conversation;
    const current = (await client.http.execute("communication.currentLiveSession", client.projectId, { conversationId })).result;
    if (current == null) return null;
    return current.__typename === "LiveSession" ? new LiveSessionHandle(client, current) : current;
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
  constructor(readonly client: V1Client, readonly operationId: string, readonly liveSessionId: string,
    readonly kind: "START" | "END", readonly requestId: string) {
    v1Id(operationId); v1Id(liveSessionId); v1Id(requestId);
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
      signal?.throwIfAborted();
      const action = await this.get();
      if (action.state === "COMPLETED") {
        if (!action.completion || (this.kind === "END" && action.completion.mediaCutoff?.state !== "ENFORCED"))
          throw new TypeError("Completed action is missing its original completion evidence");
        return action.completion;
      }
      if (action.state === "FAILED") {
        if (!action.failure) throw new TypeError("Failed live action is missing its reason");
        throw new V1Problem(action.failure.code, this.requestId, "accepted", 409, action.failure.message);
      }
      if (action.state !== "RUNNING") throw new TypeError("Unknown live action state");
      await pause(signal);
    } while (Date.now() < deadline);
    throw new V1Problem("RESOLUTION_REQUIRED", this.requestId, "accepted", 409,
      "Action remains unresolved; retain this operation ID and query it again. Elapsed time is not cutoff.");
  }
}

export class LiveStartOperation extends LiveAction {
  constructor(client: V1Client, readonly receipt: OperationPayload<"communication.startLiveSession">) {
    super(client, receipt.result.operationId, receipt.result.liveSessionId, "START", receipt.requestId);
  }
  async ready(options: LiveWaitOptions = {}): Promise<LiveSessionHandle> {
    await this.completed(options);
    return LiveSessionHandle.get(this.client, this.liveSessionId);
  }
}

export class LiveEndOperation extends LiveAction {
  constructor(client: V1Client, readonly receipt: OperationPayload<"communication.endLiveSession">) {
    super(client, receipt.result.operationId, receipt.result.liveSessionId, "END", receipt.requestId);
  }
}

export class LiveSessionHandle {
  readonly __typename = "LiveSession";
  readonly liveSessionId: string;
  readonly generation: string;
  readonly conversationId: string;
  #endRequest: string | undefined;
  constructor(readonly client: V1Client, readonly snapshot: LiveSession) {
    this.liveSessionId = v1Id(snapshot.liveSessionId);
    this.generation = snapshot.generation;
    this.conversationId = v1Id(snapshot.conversationId);
  }
  static async get(client: V1Client, liveSessionId: string) {
    return new LiveSessionHandle(client, (await client.http.execute("communication.liveSession",
      client.projectId, { liveSessionId: v1Id(liveSessionId) })).result);
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
    this.#endRequest = options.requestId ?? this.#endRequest ??
      [...this.client.http.recoveryStates].reverse().find(state =>
        state.path.endsWith("/graphql/endLiveSession") && state.payload.liveSessionId === this.liveSessionId)?.requestId ??
      crypto.randomUUID();
    const saved = this.client.http.recoveryStates.find(state => state.requestId === this.#endRequest);
    const revision = saved ? saved.payload.expectedRevision : (await this.get()).revision;
    if (typeof revision !== "string") throw new TypeError("Missing original end revision");
    const receipt = await this.client.http.execute("communication.endLiveSession", this.client.projectId,
      { liveSessionId: this.liveSessionId, expectedGeneration: this.generation, expectedRevision: revision }, this.#endRequest);
    return new LiveEndOperation(this.client, receipt);
  }
}

export class LiveParticipationHandle {
  readonly participationId: string;
  #attempt: { requestId: string; mode: "INITIAL" | "RECONNECT"; replacementOfConnectionId?: string; used: boolean } | undefined;
  #connection: V1MediaConnection | undefined;
  #connecting: Promise<V1MediaConnection> | undefined;
  #leaveRequest: string | undefined;
  constructor(readonly live: LiveSessionHandle, readonly snapshot: LiveParticipation) {
    this.participationId = v1Id(snapshot.participationId);
    this.#leaveRequest = [...live.client.http.recoveryStates].reverse().find(state =>
      state.path.endsWith("/graphql/leaveLiveSession") && state.payload.participationId === this.participationId)?.requestId;
  }
  async get(): Promise<LiveParticipation> {
    const current = (await this.live.get()).myParticipation;
    if (!current || current.participationId !== this.participationId)
      throw new V1Problem("PARTICIPATION_MISMATCH", crypto.randomUUID(), "rejected", 409, "This participation is no longer current");
    return current;
  }
  connect(options: LiveConnectOptions = {}): Promise<V1MediaConnection> {
    if (this.#leaveRequest) return Promise.reject(new Error("Leave has been requested; resolve its cutoff before rejoining"));
    if (this.#connecting) return this.#connecting;
    if (this.#connection?.connected) return Promise.resolve(this.#connection);
    const work = V1MediaConnection.connectParticipation(this, options).then(async connection => {
      if (this.#leaveRequest) { await connection.disconnect(); throw new Error("Participation was left during connection"); }
      this.#connection = connection; return connection;
    });
    this.#connecting = work;
    return work.finally(() => { this.#connecting = undefined; });
  }
  /** @internal Preserves each credential command separately from native connection attempts. */
  async connectionGrant(options: CommandOptions = {}): Promise<{ requestId: string; grant: LiveConnectionGrant }> {
    const { client, liveSessionId, generation } = this.live;
    const current = await this.get();
    if (!this.#attempt) {
      const previous = [...client.http.recoveryStates].reverse().find(state =>
        state.path.endsWith("/graphql/liveSessionCredentials") && state.payload.participationId === this.participationId);
      if (previous) {
        const mode = previous.payload.mode;
        if (mode !== "INITIAL" && mode !== "RECONNECT") throw new TypeError("Unknown stored credential operation");
        const replacement = previous.payload.replacementOfConnectionId;
        this.#attempt = { requestId: previous.requestId, mode,
          used: previous.mediaAdmissionAttempted === true || !!current.nativeConnectionId,
          ...(replacement === undefined ? {} : { replacementOfConnectionId: v1Id(replacement) }) };
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
        throw new V1Problem("RESOLUTION_REQUIRED", old.requestId, "unknown", 409, "Resolve the original credential attempt before obtaining another grant");
      const unobserved = !current.nativeConnectionId ||
        (old.mode === "RECONNECT" && current.nativeConnectionId === old.replacementOfConnectionId);
      if (unobserved && Date.parse(issuance.admissionExpiresAt) > Date.parse(resolution.checkedAt))
        throw new V1Problem("RESOLUTION_REQUIRED", old.requestId, "committed", 409, "Native admission remains unresolved; keep this reservation and retry or explicitly leave");
      if (options.requestId === old.requestId)
        throw new V1Problem("CREDENTIAL_REFRESH_REQUIRED", old.requestId, "committed", 409, "The resolved old credential requires a separately identified fresh attempt");
      this.#attempt = undefined;
    }
    this.#attempt ??= { requestId: options.requestId ?? crypto.randomUUID(),
      mode: current.nativeConnectionId ? "RECONNECT" : "INITIAL", used: false,
      ...(current.nativeConnectionId ? { replacementOfConnectionId: current.nativeConnectionId } : {}) };
    const { requestId, mode, replacementOfConnectionId } = this.#attempt;
    const receipt = await client.http.execute("communication.liveSessionCredentials", client.projectId,
      { liveSessionId, participationId: this.participationId, expectedGeneration: generation, mode,
        ...(replacementOfConnectionId ? { replacementOfConnectionId } : {}) }, requestId);
    const grant = receipt.result;
    if (grant.liveSessionId !== liveSessionId || grant.participationId !== this.participationId || grant.generation !== generation)
      throw new TypeError("Native credential scope differs from the participation");
    return { requestId, grant };
  }
  /** @internal Once signaling starts, an uncertain admission is resolved, never blindly reused. */
  connectionAttempted(): void {
    if (!this.#attempt) throw new Error("No credential attempt exists");
    this.live.client.http.markMediaAdmissionAttempted(this.#attempt.requestId);
    this.#attempt.used = true;
  }
  async leave(options: CommandOptions = {}) {
    if (this.#leaveRequest && options.requestId && options.requestId !== this.#leaveRequest)
      throw new Error("Resolve the original leave request before replacing its identity");
    this.#leaveRequest ??= options.requestId ?? crypto.randomUUID();
    await this.#connection?.disconnect();
    return this.live.client.http.execute("communication.leaveLiveSession", this.live.client.projectId,
      { liveSessionId: this.live.liveSessionId, expectedGeneration: this.live.generation,
        participationId: this.participationId }, this.#leaveRequest);
  }
}
