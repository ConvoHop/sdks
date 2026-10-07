import {
  ConvoHopProblem, parseConversation, parseCounter, parseCursor, parseId, parseMessage, operationCatalog, parsePage, parseObject, parseSearchHit, parseString,
  type OperationPayload, type PageOptions, type Conversation, type ConversationCursor, type Membership, type ConversationMessage, type ItemPage, type ProtocolObject,
  type RecoveryStorage, type ProjectRoute, type SearchHit, type SendReceipt, type SessionMetadata, type SessionBootstrap,
  type SessionRefresh, type SessionRefreshState, type ConvoHopTransport,
} from "@convohop/core";
import {
  authenticatedTransport, canonical, currentSession, eventPage, origin, route, sameSession, sessionExpiry, sessionMetadata,
  timestamp, validateOutput, type TransportAuthentication,
} from "@convohop/core/internal";
import { ConversationHandle, LiveSessionHandle } from "./live.js";
export interface ConvoHopClientOptions {
  baseUrl: string; projectId: string; sessionToken: string; incarnation: string; principalId: string;
  recoveryStorage?: RecoveryStorage; fetch?: typeof fetch; sessionRefresh?: SessionRefresh;
}
interface ReplayRefresh {
  suspend: () => Promise<void>;
  resume: (route: ProjectRoute, token: string) => Promise<void>;
}
const replayRefresh = new WeakMap<ConversationStream, ReplayRefresh>();
export class ConvoHopClient {
  readonly projectId: string; readonly principalId: string; readonly http: ConvoHopTransport;
  #token: string; readonly storage: RecoveryStorage | undefined;
  readonly #authentication: TransportAuthentication;
  readonly #sessionRefresh: SessionRefresh | undefined;
  #session: SessionMetadata | undefined;
  #sessionInitialization: Promise<void> | undefined;
  #refreshing: Promise<SessionMetadata> | undefined;
  #quiescing: { replays: Map<ConversationStream, ReplayRefresh>; work: Promise<void>[] } | undefined;
  #route: ProjectRoute | undefined;
  readonly #streams = new Set<ConversationStream>();
  readonly #replayGenerations = new Map<string, number>();
  constructor(options: ConvoHopClientOptions) {
    if (options.sessionRefresh !== undefined && typeof options.sessionRefresh !== "function")
      throw new TypeError("sessionRefresh must be an asynchronous backend renewal hook");
    this.projectId = parseId(options.projectId); this.principalId = parseId(options.principalId); this.#token = options.sessionToken; this.storage = options.recoveryStorage;
    this.#sessionRefresh = options.sessionRefresh;
    const { transport, authentication } = authenticatedTransport({ baseUrl: options.baseUrl, credential: options.sessionToken,
      namespace: options.projectId + ":" + options.principalId, incarnation: parseId(options.incarnation),
      ...(options.recoveryStorage ? { recoveryStorage: options.recoveryStorage } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
    this.http = transport; this.#authentication = authentication;
  }
  get sessionBinding(): Readonly<SessionMetadata> | undefined {
    return this.#session === undefined ? undefined : structuredClone(this.#session);
  }
  get sessionRefreshState(): SessionRefreshState {
    if (!this.#sessionRefresh) return "disabled";
    if (this.#refreshing) return "refreshing";
    if (this.#authentication.blocked) return "blocked";
    return this.#session && this.#route ? "ready" : "uninitialized";
  }
  #validateRoute(input: unknown): ProjectRoute {
    const value = route(input);
    if (value.projectId !== this.projectId || value.incarnation !== this.http.incarnation) throw new ConvoHopProblem("INCARNATION_MISMATCH", crypto.randomUUID(), "rejected", 409, "Explicit session/route recovery required");
    const socket = new URL(value.wssUrl), base = new URL(this.http.baseUrl);
    if (origin(value.communicationBase) !== this.http.baseUrl || socket.host !== base.host ||
        socket.protocol !== (base.protocol === "https:" ? "wss:" : "ws:") ||
        socket.pathname !== "/graphql" || socket.username || socket.password || socket.search || socket.hash)
      throw new TypeError("Route cannot redirect this client's credentials to another origin or an unsafe socket");
    return value;
  }
  async initialize(): Promise<ProjectRoute> {
    const value = this.#validateRoute((await this.http.execute("communication.route", this.projectId, {})).result);
    this.http.servingEpoch = value.servingEpoch;
    if (this.#sessionRefresh) {
      this.#sessionInitialization ??= this.http.execute("communication.currentSession", this.projectId, {}).then(proof => {
        const binding = currentSession(proof);
        if (binding.principalId !== this.principalId || binding.incarnation !== this.http.incarnation)
          throw new ConvoHopProblem("SESSION_REFRESH_REJECTED", proof.requestId, "rejected", 409,
            "Original session authority does not match this client's principal and incarnation");
        this.#session = binding;
      });
      await this.#sessionInitialization;
    }
    this.http.servingEpoch = value.servingEpoch; this.#route = value; return value;
  }
  refreshSession(): Promise<SessionMetadata> {
    if (this.#refreshing) return this.#refreshing;
    const hook = this.#sessionRefresh, binding = this.#session, currentRoute = this.#route;
    if (!hook || !binding || !currentRoute || sessionExpiry(binding) <= Date.now() ||
        binding.incarnation !== this.http.incarnation)
      return Promise.reject(new ConvoHopProblem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
        "Configure sessionRefresh and initialize with the original valid bearer before renewal or expiry"));
    const pending = this.#refreshSession(hook, structuredClone(binding), currentRoute).finally(() => {
      if (this.#refreshing === pending) this.#refreshing = undefined;
    });
    this.#refreshing = pending;
    return pending;
  }
  #suspendReplay(stream: ConversationStream): void {
    const quiescing = this.#quiescing, controls = replayRefresh.get(stream);
    if (!quiescing || !controls) throw new Error("Missing replay refresh state");
    if (!quiescing.replays.has(stream)) {
      quiescing.replays.set(stream, controls);
      quiescing.work.push(controls.suspend());
    }
  }
  async #refreshSession(hook: SessionRefresh, binding: SessionMetadata, oldRoute: ProjectRoute): Promise<SessionMetadata> {
    const authentication = this.#authentication, oldToken = this.#token;
    const quiescing: { replays: Map<ConversationStream, ReplayRefresh>; work: Promise<void>[] } = { replays: new Map(), work: [] };
    this.#quiescing = quiescing;
    let release: (() => void) | undefined, replacement: SessionMetadata | undefined;
    let invalidated = false, failure: ConvoHopProblem | undefined, replayRoute = oldRoute;
    const drain = async () => {
      if (!release) {
        let resume: () => void = () => { throw new Error("Uninitialized refresh barrier"); };
        const barrier = new Promise<void>(resolve => { resume = resolve; });
        authentication.barrier = barrier;
        release = () => { authentication.barrier = undefined; resume(); };
      }
      // Original callers still receive their errors; refresh only waits for custody to settle.
      await Promise.allSettled([...authentication.active]);
    };
    try {
      for (const stream of this.#streams) this.#suspendReplay(stream);
      const retired = await Promise.allSettled(quiescing.work);
      for (const result of retired) if (result.status === "rejected") throw result.reason;
      await drain();
      if (sessionExpiry(binding) <= Date.now()) throw new ConvoHopProblem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(),
        "rejected", 409, "Original bearer expired while work drained; explicitly retire and bootstrap a new client");
      let supplied: SessionBootstrap;
      try { supplied = await hook(structuredClone(binding)); }
      catch { throw new ConvoHopProblem("SESSION_REFRESH_FAILED", crypto.randomUUID(), "unknown", 0,
        "Session renewal hook failed; retain the original renewal request and verify its outcome"); }
      validateOutput(supplied, "SessionBootstrap!");
      const candidate = { session: sessionMetadata(supplied.session),
        sessionToken: parseString(supplied.sessionToken), tokenExpiresAt: timestamp(supplied.tokenExpiresAt) };
      if (!candidate.sessionToken || candidate.sessionToken.length > 16384 || /[\r\n]/.test(candidate.sessionToken))
        throw new TypeError("Invalid replacement credential");
      const nextRoute = this.#validateRoute((await authentication.probe("communication.route", this.projectId, candidate.sessionToken)).result);
      const proof = await authentication.probe("communication.currentSession", this.projectId, candidate.sessionToken, nextRoute.servingEpoch);
      const metadata = sessionMetadata(proof.result);
      invalidated = proof.status === "ok" && sameSession(binding, metadata) &&
        BigInt(metadata.sessionRevision) > BigInt(binding.sessionRevision);
      const verified = currentSession(proof);
      if (!sameSession(binding, verified) || binding.incarnation !== this.http.incarnation ||
          BigInt(verified.sessionRevision) <= BigInt(binding.sessionRevision) ||
          sessionExpiry(verified) <= sessionExpiry(binding) || canonical(verified) !== canonical(candidate.session) ||
          candidate.tokenExpiresAt !== verified.expiresAt || Date.parse(nextRoute.expiresAt) <= Date.now())
        throw new ConvoHopProblem("SESSION_REFRESH_REJECTED", proof.requestId, "unknown", 409,
          "Replacement must preserve the original session, advance its live revision and expiry, and match authority metadata");
      this.#token = candidate.sessionToken; authentication.credential = candidate.sessionToken;
      this.#session = verified; replacement = verified; this.#route = nextRoute;
      replayRoute = nextRoute;
      this.http.servingEpoch = nextRoute.servingEpoch;
      authentication.blocked = false;
    } catch (error) {
      failure = error instanceof ConvoHopProblem ? error : new ConvoHopProblem("SESSION_REFRESH_REJECTED", crypto.randomUUID(),
        "unknown", 409, "Session replacement or application retirement could not be verified");
      await drain();
      authentication.blocked = true;
      if (!invalidated) {
        try {
          const old = currentSession(await authentication.probe("communication.currentSession", this.projectId, oldToken));
          if (canonical(old) !== canonical(binding)) throw new TypeError("Original session authority changed");
          authentication.blocked = false;
        } catch {
          failure = new ConvoHopProblem("SESSION_REFRESH_UNVERIFIED", failure.requestId, "unknown", 0,
            "Renewal and original session authority are unverified; HTTP and realtime remain refresh-blocked", { cause: failure });
        }
      } else {
        failure = new ConvoHopProblem("SESSION_REFRESH_UNVERIFIED", failure.requestId, "unknown", 0,
          "Authority observed a renewed original session; the old bearer cannot be restored", { cause: failure });
      }
    } finally {
      this.#quiescing = undefined;
      release?.();
    }
    if (!authentication.blocked) {
      const resumed = await Promise.allSettled([...quiescing.replays.values()].map(controls =>
        controls.resume(replayRoute, this.#token)));
      const errors: unknown[] = failure ? [failure] : [];
      for (const result of resumed) if (result.status === "rejected") errors.push(result.reason);
      if (errors.length > 1) throw new AggregateError(errors, "Session refresh or replay restoration failed");
      if (errors.length) throw errors[0];
    }
    if (failure) throw failure;
    if (!replacement) throw new Error("Missing verified session replacement");
    return structuredClone(replacement);
  }
  conversation(id: string): ConversationHandle { return new ConversationHandle(this, parseId(id)); }
  async getConversation(id: string): Promise<Conversation> {
    return parseConversation((await this.http.execute("communication.getConversation", this.projectId, { conversationId: parseId(id) })).result);
  }
  readonly requests = {
    resolve: async (requestId: string): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>> => {
      const result = (await this.http.execute("communication.resolveRequest", this.projectId, { requestId: parseId(requestId) })).result;
      if (!result) throw new TypeError("Missing current request resolution");
      return result;
    },
    retry: (requestId: string): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>> => this.http.retry(requestId),
  };
  liveSession(id: string) { return LiveSessionHandle.get(this, parseId(id)); }
  readonly liveAlerts = {
    list: async (options: PageOptions = {}): Promise<OperationPayload<"communication.liveSessionAlerts">["result"]> =>
      (await this.http.execute("communication.liveSessionAlerts", this.projectId, options)).result,
  };
  async messages(id: string, beforeSequence?: string): Promise<ItemPage<ConversationMessage>> {
    return parsePage((await this.http.execute("communication.messages", this.projectId,
      { conversationId: parseId(id), limit: 100, ...(beforeSequence === undefined ? {} : { beforeSequence: parseCounter(beforeSequence) }) })).result, parseMessage);
  }
  async send(id: string, text: string, requestId?: string): Promise<SendReceipt> {
    const result = (await this.http.execute("communication.sendMessage", this.projectId, { conversationId: parseId(id), text, props: {} }, requestId)).result;
    if (!result) throw new TypeError("Missing send receipt");
    const cursor = parseCursor(result.cursor);
    if (result.status !== "sent" || result.conversationId !== id || cursor.conversationId !== id ||
        cursor.sequence !== result.sequence || cursor.incarnation !== this.http.incarnation) throw new TypeError("Invalid send receipt scope");
    return { ...result, cursor };
  }
  async edit(message: ConversationMessage, text: string, requestId?: string): Promise<ConversationMessage> {
    return parseMessage((await this.http.execute("communication.editMessage", this.projectId,
      { conversationId: message.conversationId, messageId: message.messageId, text, expectedRevision: message.revision }, requestId)).result);
  }
  async delete(message: ConversationMessage, requestId?: string): Promise<ConversationMessage> {
    return parseMessage((await this.http.execute("communication.deleteMessage", this.projectId,
      { conversationId: message.conversationId, messageId: message.messageId, expectedRevision: message.revision }, requestId)).result);
  }
  async events(id: string, after?: ConversationCursor): Promise<ItemPage<ProtocolObject> & { nextCursor: ConversationCursor }> {
    return eventPage((await this.http.execute("communication.events", this.projectId,
      { conversationId: parseId(id), limit: 100, ...(after === undefined ? {} : { after }) })).result,
      this.http.incarnation, id, after);
  }
  async reportRead(id: string, membership: Membership, throughSequence: string): Promise<ProtocolObject> {
    return parseObject((await this.http.execute("communication.reportReceipt", this.projectId,
      { conversationId: parseId(id), kind: "read", membershipEpoch: membership.membershipEpoch,
        visibilityEpoch: membership.visibilityEpoch, throughSequence: parseCounter(throughSequence) })).result);
  }
  async receipts(id: string): Promise<ItemPage<ProtocolObject>> {
    return parsePage((await this.http.execute("communication.receipts", this.projectId, { conversationId: parseId(id), limit: 100 })).result, parseObject);
  }
  async search(query: string, conversationIds?: string[]): Promise<ItemPage<SearchHit>> {
    return parsePage((await this.http.execute("communication.search", this.projectId,
      { query, pageSize: 100, ...(conversationIds ? { scope: { conversationIds } } : {}) })).result, parseSearchHit);
  }
  async recoverPending(onError: (error: Error) => void): Promise<void> {
    for (const state of this.http.recoveryStates.filter(state => state.resolutionState === "pending" || state.resolutionState === "unknown").slice(0, 16)) {
      const transient = ["submitted", "TRANSPORT_UNKNOWN", "OUTCOME_UNKNOWN", "AUTHORITY_UNAVAILABLE", "RETRY_EXHAUSTED", "ADMISSION_LIMIT", "HTTP_FAILURE", "INVALID_RESPONSE"].includes(state.lastAttemptClassification);
      const now = Date.now();
      const resend = transient && state.attemptCount < 3 && now >= state.lastAttemptAt && now >= state.firstSubmittedAt && now <= state.retryDeadline;
      try { if (resend) await this.requests.retry(state.requestId); else await this.requests.resolve(state.requestId); }
      catch (error) { onError(error instanceof Error ? error : new Error("Mutation recovery failed")); }
    }
  }
  async watch(conversationId: string, apply: (events: ProtocolObject[]) => Promise<void>, onError: (error: Error) => void): Promise<ConversationStream> {
    return this.#openReplay(parseId(conversationId), apply, onError, false);
  }
  async resyncAuthorizedHistory(conversationId: string, apply: (events: ProtocolObject[]) => Promise<void>,
    onError: (error: Error) => void): Promise<ConversationStream> {
    this.#checkReplayAdmission();
    const id = parseId(conversationId);
    this.#replayGenerations.set(id, (this.#replayGenerations.get(id) ?? 0) + 1);
    for (const stream of this.#streams) if (stream.conversationId === id) stream.close();
    return this.#openReplay(id, apply, onError, true);
  }
  #checkReplayAdmission(): void {
    if (this.#authentication.blocked || this.#quiescing)
      throw new ConvoHopProblem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
        "Session refresh holds replay admission; await verified refresh before opening or resynchronizing history");
  }
  async #openReplay(conversationId: string, apply: (events: ProtocolObject[]) => Promise<void>,
    onError: (error: Error) => void, resync: boolean): Promise<ConversationStream> {
    this.#checkReplayAdmission();
    const generation = this.#replayGenerations.get(conversationId) ?? 0;
    await Promise.all([...this.#streams]
      .filter(stream => stream.conversationId === conversationId && stream.closed)
      .map(stream => stream.retire()));
    const route = this.#route ?? await this.initialize();
    this.#checkReplayAdmission();
    if (generation !== (this.#replayGenerations.get(conversationId) ?? 0)) throw new Error("History watcher superseded by explicit resynchronization");
    const realtime = new ConversationStream(this, conversationId, route, this.#token, apply, onError, () => this.#streams.delete(realtime));
    this.#streams.add(realtime);
    if (this.#quiescing) this.#suspendReplay(realtime);
    try {
      if (resync) await realtime.resyncAuthorizedHistory(); else await realtime.start();
      this.#checkReplayAdmission();
      if (generation !== (this.#replayGenerations.get(conversationId) ?? 0)) throw new Error("History watcher superseded by explicit resynchronization");
      return realtime;
    }
    catch (error) { realtime.close(); throw error; }
  }
}
export class ConversationStream {
  #socket: WebSocket | undefined; #closed = false; #working: Promise<unknown> | undefined;
  #round: { generation: number; result: Promise<boolean> } | undefined;
  #applying: Promise<boolean> | undefined;
  #paused = false;
  #started = false;
  #cursor: ConversationCursor | undefined; #timer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempts = 0;
  #pendingPages = 0;
  #queueGeneration = 0;
  #currentRoute: ProjectRoute;
  readonly #storageKey: string;
  #token: string;
  constructor(readonly client: ConvoHopClient, readonly conversationId: string, readonly route: ProjectRoute, token: string,
    readonly apply: (events: ProtocolObject[]) => Promise<void>, readonly onError: (error: Error) => void,
    readonly onClose?: () => void) {
    this.#token = token;
    this.#currentRoute = route;
    replayRefresh.set(this, { suspend: () => this.#suspendSessionRefresh(),
      resume: (route, token) => this.#resumeSessionRefresh(route, token) });
    this.#storageKey = `convohop.cursor:${client.projectId}:${client.principalId}:${conversationId}`;
    const saved = client.storage?.getItem(this.#storageKey);
    if (saved) this.#cursor = parseCursor(JSON.parse(saved));
  }
  get cursor(): ConversationCursor | undefined { return this.#cursor; }
  get closed(): boolean { return this.#closed; }
  async retire(): Promise<void> {
    this.close();
    await this.#applying;
  }
  async #suspendSessionRefresh(): Promise<void> {
    this.#paused = true;
    if (this.#timer) { clearTimeout(this.#timer); this.#timer = undefined; }
    const socket = this.#socket; this.#socket = undefined;
    let closing: Error | undefined;
    try { socket?.close(1000); }
    catch (error) { closing = error instanceof Error ? error : new Error("Realtime suspension failed"); }
    const settled = await Promise.allSettled([this.#applying, this.#working]);
    this.#queueGeneration++;
    if (closing) throw closing;
    for (const result of settled) if (result.status === "rejected") throw result.reason;
  }
  async #resumeSessionRefresh(route: ProjectRoute, token: string): Promise<void> {
    if (this.#closed) return;
    this.#currentRoute = route; this.#token = token; this.#paused = false;
    try { this.#proceed(await this.#reconcileRound()); }
    catch (error) { this.#fail(error); throw error; }
  }
  async #apply(events: ProtocolObject[]): Promise<boolean> {
    const applying = Promise.resolve().then(async () => {
      if (this.#closed || this.#paused) return false;
      await this.apply(events);
      return true;
    });
    this.#applying = applying;
    try { return await applying; }
    finally {
      this.#applying = undefined;
      if (this.#closed) this.onClose?.();
    }
  }
  async resyncAuthorizedHistory(): Promise<void> {
    if (this.#closed || this.#started || this.#working) throw new Error("History resynchronization requires a new idle replay");
    this.#currentRoute = await this.client.initialize();
    await this.client.getConversation(this.conversationId);
    if (this.#closed) throw new Error("History resynchronization was superseded");
    this.#cursor = undefined;
    await this.start();
  }
  async start(): Promise<void> {
    if (this.#closed || this.#started) throw new Error("Replay is already started or closed");
    this.#started = true;
    await this.client.recoverPending(this.onError);
    if (this.#paused) throw new ConvoHopProblem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
      "Replay startup was paused by session refresh; open it after verified refresh");
    const more = await this.#reconcileRound();
    if (this.#paused) throw new ConvoHopProblem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
      "Replay startup was paused by session refresh; open it after verified refresh");
    this.#proceed(more);
  }
  #connect(): void {
    if (this.#closed || this.#paused || this.#socket) return;
    const ws = new WebSocket(this.#currentRoute.wssUrl, "graphql-transport-ws"); this.#socket = ws;
    const subscriptionId = crypto.randomUUID();
    ws.onopen = () => {
      if (this.#closed || this.#paused || this.#socket !== ws) { ws.close(1000); return; }
      ws.send(JSON.stringify({ type: "connection_init", payload: {
        projectId: this.client.projectId, incarnation: this.#currentRoute.incarnation, token: this.#token } }));
    };
    ws.onmessage = event => {
      if (this.#closed || this.#paused || this.#socket !== ws) return;
      try {
        const text = parseString(event.data);
        if (text.length > 65536) throw new ConvoHopProblem("ADMISSION_LIMIT", subscriptionId, "rejected", 503, "Subscription frame exceeds its budget");
        const frame = parseObject(JSON.parse(text));
        if (frame.type === "connection_ack") {
          this.#reconnectAttempts = 0;
          const operation = operationCatalog["communication.conversationEvents"];
          ws.send(JSON.stringify({ type: "subscribe", id: subscriptionId, payload: {
            query: operation.query, operationName: operation.operationName,
            variables: { context: { requestId: crypto.randomUUID(), projectId: this.client.projectId,
              incarnation: this.#currentRoute.incarnation, observedServingEpoch: this.#currentRoute.servingEpoch },
            input: { conversationId: this.conversationId, limit: 50, ...(this.#cursor ? { after: this.#cursor } : {}) } },
          } }));
        }
        else if (frame.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
        else if (frame.type === "next" || frame.type === "error") {
          if (frame.id !== subscriptionId) throw new TypeError("Unknown subscription identity");
          const payload = frame.type === "error" ? { errors: frame.payload } : parseObject(frame.payload);
          if (Array.isArray(payload.errors) && payload.errors.length) {
            const problem = parseObject(payload.errors[0]), extensions = parseObject(problem.extensions);
            throw new ConvoHopProblem(parseString(extensions.code), parseId(extensions.requestId), parseString(extensions.outcome),
              Number(extensions.status), parseString(problem.message));
          }
          this.#page(parseObject(payload.data).conversationEvents);
        } else if (frame.type === "complete") {
          throw new ConvoHopProblem("AUTHORITY_UNAVAILABLE", subscriptionId, "unknown", 503, "Resume the subscription from its applied cursor");
        }
      } catch (error) { this.#fail(error); }
    };
    ws.onerror = () => {
      if (!this.#closed && !this.#paused && this.#socket === ws)
        this.onError(new Error("Realtime connection unavailable; current history remains authoritative"));
    };
    ws.onclose = event => {
      if (this.#socket !== ws) return;
      this.#socket = undefined;
      if (!this.#closed && !this.#paused && ![4400, 4401, 4403, 4408, 4409].includes(event.code)) this.#retry();
      else if (!this.#closed && !this.#paused) this.#fail(new ConvoHopProblem("UNAUTHENTICATED", subscriptionId, "rejected", 401, "Realtime authorization ended; obtain a current session"));
    };
  }
  #page(value: unknown): void {
    if (this.#pendingPages >= 4) throw new ConvoHopProblem("ADMISSION_LIMIT", crypto.randomUUID(), "unknown", 503, "Application must resume from its applied cursor");
    const page = eventPage(value, this.#currentRoute.incarnation, this.conversationId);
    if (page.refreshRequired) throw new Error("Explicit authorized history resynchronization required");
    const generation = this.#queueGeneration;
    this.#pendingPages++;
    const work = (this.#working ?? Promise.resolve()).then(async () => {
      if (this.#closed || this.#paused || generation !== this.#queueGeneration ||
          (this.#cursor && BigInt(page.nextCursor.sequence) < BigInt(this.#cursor.sequence))) return;
      const events = this.#cursor ? page.items.filter(event => BigInt(parseCounter(event.sequence)) > BigInt(this.#cursor!.sequence)) : page.items;
      const applied = await this.#apply(events);
      if (!applied || this.#closed || generation !== this.#queueGeneration) return;
      this.#cursor = page.nextCursor;
      this.client.storage?.setItem(this.#storageKey, JSON.stringify(this.#cursor));
    }).catch(error => { if (generation === this.#queueGeneration) this.#fail(error); }).finally(() => {
      this.#pendingPages--;
      if (this.#working === work) this.#working = undefined;
    });
    this.#working = work;
  }
  #retry(): void {
    if (this.#closed || this.#paused || this.#timer) return;
    const delay = Math.min(1000 * 2 ** Math.min(this.#reconnectAttempts++, 4), 10000) + Math.floor(Math.random() * 500);
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      if (this.#closed || this.#paused) return;
      const generation = this.#queueGeneration;
      const current = () => !this.#closed && !this.#paused && generation === this.#queueGeneration;
      this.client.initialize().then(route => {
        if (!current()) return;
        this.#currentRoute = route;
        return this.client.recoverPending(this.onError);
      }).then(() => current() ? this.#reconcileRound() : false)
        .then(more => { if (current()) this.#proceed(more); })
        .catch(error => { if (current()) this.#fail(error); });
    }, delay);
  }
  // Managed catch-up keeps each round bounded and paces the next one instead of failing at the work limit.
  #proceed(more: boolean): void {
    if (this.#closed || this.#paused) return;
    if (!more) { this.#connect(); return; }
    if (this.#timer) return;
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      if (this.#closed || this.#paused) return;
      const generation = this.#queueGeneration;
      const current = () => !this.#closed && !this.#paused && generation === this.#queueGeneration;
      this.#reconcileRound().then(next => { if (current()) this.#proceed(next); })
        .catch(error => { if (current()) this.#fail(error); });
    }, 250 + Math.floor(Math.random() * 250));
  }
  #fail(error: unknown): void {
    if (this.#closed) return;
    this.#queueGeneration++;
    if (this.#paused) {
      this.onError(error instanceof Error ? error : new Error("Realtime reconciliation failed"));
      return;
    }
    if (error instanceof ConvoHopProblem && ([0, 429, 503].includes(error.status) || error.code === "WRONG_REGION")) {
      const socket = this.#socket; this.#socket = undefined;
      socket?.close(4000, "Retrying authoritative connection");
      this.onError(error); this.#retry(); return;
    }
    this.close();
    this.onError(error instanceof Error ? error : new Error("Realtime reconciliation failed"));
  }
  // One bounded round of at most ten pages; resolves true only when the current replay has more work.
  #reconcileRound(): Promise<boolean> {
    if (this.#closed) return Promise.resolve(false);
    if (this.#paused) return Promise.reject(new ConvoHopProblem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
      "Realtime application work is paused until session authority is verified"));
    const generation = this.#queueGeneration;
    // Rounds coalesce only within one stream generation; earlier queued or superseded work settles first.
    if (this.#round?.generation === generation) return this.#round.result;
    const superseded = () => this.#closed || generation !== this.#queueGeneration;
    const stale = () => superseded() || this.#paused;
    const pending = (this.#working ?? Promise.resolve()).catch(() => undefined).then(async () => {
      for (let page = 0; page < 10; page++) {
        if (stale()) return false;
        const previous = this.#cursor;
        const result = await this.client.events(this.conversationId, previous);
        if (stale()) return false;
        if (result.refreshRequired) throw new Error("Explicit authorized history resynchronization required");
        if (!result.complete && previous && BigInt(result.nextCursor.sequence) <= BigInt(previous.sequence))
          throw new TypeError("Incomplete replay page did not advance the authoritative frontier");
        const applied = await this.#apply(result.items);
        if (!applied || superseded()) return false;
        this.#cursor = result.nextCursor;
        this.client.storage?.setItem(this.#storageKey, JSON.stringify(this.#cursor));
        if (result.complete) return false;
      }
      return !stale();
    });
    const round = { generation, result: pending };
    this.#round = round; this.#working = pending;
    const settle = () => {
      if (this.#round === round) this.#round = undefined;
      if (this.#working === pending) this.#working = undefined;
    };
    pending.then(settle, settle);
    return pending;
  }
  async reconcile(): Promise<void> {
    if (await this.#reconcileRound()) throw new Error("Replay work limit reached; explicitly reconcile again");
  }
  close(): void {
    if (this.#closed) return;
    this.#closed = true; this.#queueGeneration++;
    if (this.#timer) clearTimeout(this.#timer);
    const socket = this.#socket; this.#socket = undefined; socket?.close(1000);
    if (!this.#applying) this.onClose?.();
  }
}
