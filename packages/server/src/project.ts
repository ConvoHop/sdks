import {
  ConvoHopTransport, ConvoHopProblem, parseId, parseObject, parseString, parseConversation, parseCounter, parseSearchHit,
  type RecoveryStorage, type AsyncRecoveryStorage, type SessionBootstrap, type SessionMetadata,
  type RecoveryState, type Conversation, type GraphqlTypes, type Membership, type CommandOptions, type OperationPayload,
  type PageOptions, type SearchHit,
} from "@convohop/core";
import { ServerConversation } from "./conversation.js";
import { ServerLiveOperation, ServerLiveSession } from "./live.js";
import { actAsInput, mismatch, pageLimit, required, type ActAsOptions } from "./result.js";

type SessionOutcomeRead = Pick<OperationPayload<"communication.sessionRequestOutcome">["result"], "requestId" | "checkedAt">;
type CommittedSessionOutcome = SessionOutcomeRead & {
  state: "committed"; operation: "issueSession" | "renewSession"; receiptId: string; committedAt: string;
  originalSession: SessionMetadata;
};
export type SessionRequestOutcome =
  | (SessionOutcomeRead & { state: "notObservedYet" })
  | (CommittedSessionOutcome & { currentState: "missing" })
  | (CommittedSessionOutcome & { currentState: "active" | "expired" | "revoked"; currentSession: SessionMetadata });
export type Capabilities = NonNullable<OperationPayload<"communication.capabilities">["result"]>;
export type RequestResolution = NonNullable<OperationPayload<"communication.resolveRequest">["result"]>;
export type OperationStatus = NonNullable<OperationPayload<"communication.getOperation">["result"]>;
export type Principal = NonNullable<OperationPayload<"communication.getPrincipal">["result"]>;
export type SessionRevocation = NonNullable<OperationPayload<"communication.revokeSession">["result"]>;
export type InboxPage = NonNullable<OperationPayload<"communication.inbox">["result"]>;
export type SearchPage = Omit<NonNullable<OperationPayload<"communication.search">["result"]>, "items"> & { items: SearchHit[] };
/** The inbox is always read as one member, so `actAs` is required. */
export interface InboxOptions extends PageOptions { actAs: string }
/** Search as the `actAs` member, or across `conversationIds` (1 or more) with the backend's own visibility. */
export interface SearchOptions extends PageOptions, ActAsOptions { conversationIds?: readonly string[] }


function outcomeFields(value: unknown, fields: readonly string[]): void {
  const record = parseObject(value);
  if (Object.keys(record).some(field => !fields.includes(field)) || fields.some(field => !Object.hasOwn(record, field)))
    throw new TypeError("Unexpected session request outcome fields");
}
function outcomeTimestamp(value: unknown): string {
  const time = parseString(value), parsed = Date.parse(time);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(time) ||
      !Number.isFinite(parsed) || new Date(parsed).toISOString() !== time)
    throw new TypeError("Invalid session request outcome timestamp");
  return time;
}
const sessionIdentityFields = ["sessionId", "principalId", "deviceId", "incarnation"] as const;
function outcomeSession(value: SessionMetadata, incarnation: string): SessionMetadata {
  outcomeFields(value, ["sessionId", "principalId", "deviceId", "incarnation", "sessionRevision", "expiresAt", "status"]);
  for (const field of sessionIdentityFields) parseId(value[field]);
  if (value.incarnation !== incarnation || parseCounter(value.sessionRevision) === "0")
    throw new TypeError("Invalid session request outcome scope or revision");
  outcomeTimestamp(value.expiresAt);
  return structuredClone(value);
}
function sessionOutcome(proof: OperationPayload<"communication.sessionRequestOutcome">, requestId: string,
  projectId: string, incarnation: string, custody: RecoveryState | undefined): SessionRequestOutcome {
  outcomeFields(proof, ["status", "requestId", "serverTime", "result"]);
  if (proof.status !== "ok") throw new TypeError("Expected a read-only session request outcome");
  outcomeTimestamp(proof.serverTime);
  const value = proof.result;
  const details = ["operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState"] as const;
  outcomeFields(value, ["state", "requestId", "checkedAt", ...details]);
  if (parseId(value.requestId) !== requestId || (custody &&
      (custody.projectId !== projectId || custody.incarnation !== incarnation ||
       (custody.operation !== "communication.issueSession" && custody.operation !== "communication.renewSession"))))
    throw new TypeError("Session request outcome does not match original custody");
  const checkedAt = outcomeTimestamp(value.checkedAt);
  if (value.state === "notObservedYet") {
    if (details.some(field => value[field] !== null)) throw new TypeError("Absent observation cannot carry commit metadata");
    return { state: "notObservedYet", requestId, checkedAt };
  }
  const operation = value.operation;
  if (value.state !== "committed" || (operation !== "issueSession" && operation !== "renewSession") ||
      (custody && custody.operation !== "communication." + operation))
    throw new TypeError("Invalid original session mutation outcome");
  const originalSession = outcomeSession(required(value.originalSession), incarnation);
  if (originalSession.status !== "active") throw new TypeError("Original session evidence must be historically active");
  if (custody && (custody.input.principalId !== originalSession.principalId ||
      custody.input.deviceId !== originalSession.deviceId ||
      (operation === "renewSession" && (custody.input.sessionId !== originalSession.sessionId ||
       BigInt(parseCounter(custody.input.expectedRevision)) + 1n !== BigInt(originalSession.sessionRevision)))))
    throw new TypeError("Session request outcome does not match the original payload");
  const committed: CommittedSessionOutcome = { state: "committed", requestId, checkedAt, operation,
    receiptId: parseId(value.receiptId), committedAt: outcomeTimestamp(value.committedAt), originalSession };
  const currentState = value.currentState;
  if (currentState === "missing") {
    if (value.currentSession !== null) throw new TypeError("Missing session cannot carry a current row");
    return { ...committed, currentState };
  }
  if (currentState !== "active" && currentState !== "expired" && currentState !== "revoked")
    throw new TypeError("Invalid current session disposition");
  const currentSession = outcomeSession(required(value.currentSession), incarnation);
  if (currentSession.status !== currentState ||
      sessionIdentityFields.some(field => currentSession[field] !== originalSession[field]) ||
      BigInt(currentSession.sessionRevision) < BigInt(originalSession.sessionRevision) ||
      (currentSession.sessionRevision === originalSession.sessionRevision && currentSession.expiresAt !== originalSession.expiresAt))
    throw new TypeError("Current session contradicts original receipt evidence");
  return { ...committed, currentState, currentSession };
}

/**
 * Backend-key client for one project. Runs only in trusted server runtimes; never ship a backend key to a browser.
 *
 * Every backend-key operation in `schema/annotations.json` has a typed method here; the README lists each method with
 * the scope it needs. A key without that scope fails with `ScopeRequiredProblem`. Message reads and sends accept
 * `{ actAs: principalId }` to act as a member; the inbox requires it. Handles from `conversation(id)`,
 * `liveSession(id)` and `liveOperation(id)` send nothing until a method is called.
 */
export class ProjectServerClient {
  readonly projectId: string; readonly http: ConvoHopTransport;
  constructor(options: { baseUrl: string; projectId: string; backendKey: string; incarnation: string; recoveryStorage?: RecoveryStorage; asyncRecoveryStorage?: AsyncRecoveryStorage; fetch?: typeof fetch }) {
    this.projectId = parseId(options.projectId);
    this.http = new ConvoHopTransport({ baseUrl: options.baseUrl, credential: options.backendKey,
      namespace: "backend:" + options.projectId, incarnation: parseId(options.incarnation),
      ...(options.recoveryStorage === undefined ? {} : { recoveryStorage: options.recoveryStorage }),
      ...(options.asyncRecoveryStorage === undefined ? {} : { asyncRecoveryStorage: options.asyncRecoveryStorage }),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  readonly conversations = {
    create: async (input: GraphqlTypes.CreateConversationRequestInput, options: CommandOptions = {}): Promise<Conversation> =>
      required((await this.http.execute("communication.createConversation", this.projectId, input, options.requestId)).result),
  };
  conversation(conversationId: string): ServerConversation { return new ServerConversation(this, parseId(conversationId)); }
  liveSession(liveSessionId: string): ServerLiveSession { return new ServerLiveSession(this, parseId(liveSessionId)); }
  /** Reattaches to a live operation by ID, for example after a restart or a `RESOLUTION_REQUIRED` timeout. */
  liveOperation(operationId: string): ServerLiveOperation { return new ServerLiveOperation(this, parseId(operationId)); }
  readonly principals = {
    create: async (input: { externalUserId: string }, options: CommandOptions = {}): Promise<Principal> => {
      const externalUserId = parseString(input.externalUserId);
      const principal = required((await this.http.execute("communication.createPrincipal", this.projectId,
        { externalUserId }, options.requestId)).result);
      if (principal.externalUserId !== externalUserId) throw mismatch("Principal");
      return principal;
    },
    get: async (principalId: string): Promise<Principal> => {
      const principal = required((await this.http.execute("communication.getPrincipal", this.projectId,
        { principalId: parseId(principalId) })).result);
      if (principal.principalId !== principalId) throw mismatch("Principal");
      return principal;
    },
    disable: async (input: { principalId: string; expectedRevision: string }, options: CommandOptions = {}): Promise<Principal> => {
      const principal = required((await this.http.execute("communication.disablePrincipal", this.projectId,
        { principalId: parseId(input.principalId), expectedRevision: parseCounter(input.expectedRevision) }, options.requestId)).result);
      if (principal.principalId !== input.principalId) throw mismatch("Principal");
      return principal;
    },
  };
  readonly sessions = {
    /** Issues a user session (`sessionIssue`). The TTL is a decimal string of milliseconds and defaults to 15 minutes. */
    issue: async (input: { principalId: string; deviceId: string; requestedTtlMs?: string },
      options: CommandOptions = {}): Promise<SessionBootstrap> => this.#session(await this.http.execute(
      "communication.issueSession", this.projectId, { principalId: parseId(input.principalId), deviceId: parseId(input.deviceId),
        requestedTtlMs: parseCounter(input.requestedTtlMs ?? "900000") }, options.requestId), input),
    renew: async (input: { sessionId: string; principalId: string; deviceId: string; expectedRevision: string; requestedTtlMs?: string },
      options: CommandOptions = {}): Promise<SessionBootstrap> => this.#session(await this.http.execute(
      "communication.renewSession", this.projectId, { sessionId: parseId(input.sessionId), principalId: parseId(input.principalId),
        deviceId: parseId(input.deviceId), expectedRevision: parseCounter(input.expectedRevision),
        requestedTtlMs: parseCounter(input.requestedTtlMs ?? "900000") }, options.requestId), input),
    revoke: async (input: { sessionId: string; expectedRevision: string }, options: CommandOptions = {}): Promise<SessionRevocation> => {
      const revocation = required((await this.http.execute("communication.revokeSession", this.projectId,
        { sessionId: parseId(input.sessionId), expectedRevision: parseCounter(input.expectedRevision) }, options.requestId)).result);
      if (revocation.sessionId !== input.sessionId) throw mismatch("Session revocation");
      return revocation;
    },
    /** Reads the outcome of an issue or renew request (`sessionIssue` and `sessionManage`). */
    outcome: (requestId: string): Promise<SessionRequestOutcome> => this.sessionRequestOutcome(requestId),
  };
  #session(payload: OperationPayload<"communication.issueSession"> | OperationPayload<"communication.renewSession">,
    input: { principalId: string; deviceId: string; sessionId?: string }): SessionBootstrap {
    const issued = required(payload.result), session = required(issued.session);
    if (session.principalId !== input.principalId || session.deviceId !== input.deviceId ||
        session.incarnation !== this.http.incarnation || (input.sessionId !== undefined && session.sessionId !== input.sessionId))
      throw mismatch("Session");
    return { ...issued, session };
  }
  readonly requests = {
    resolve: async (requestId: string): Promise<RequestResolution> =>
      required((await this.http.execute("communication.resolveRequest", this.projectId, { requestId: parseId(requestId) })).result),
    retry: (requestId: string): Promise<RequestResolution> => this.http.retry(requestId),
  };
  async capabilities(): Promise<Capabilities> {
    return required((await this.http.execute("communication.capabilities", this.projectId, {})).result);
  }
  async operation(operationId: string): Promise<OperationStatus> {
    const operation = required((await this.http.execute("communication.getOperation", this.projectId,
      { operationId: parseId(operationId) })).result);
    if (operation.operationId !== operationId) throw mismatch("Operation");
    return operation;
  }
  /** Lists the conversations visible to the `actAs` member, as that member's inbox (`messageRead`; audited). */
  async inbox(options: InboxOptions): Promise<InboxPage> {
    if (options?.actAs === undefined) throw new TypeError("The inbox requires actAs");
    const page = required((await this.http.execute("communication.inbox", this.projectId, { limit: pageLimit(options.limit),
      ...(options.cursor === undefined ? {} : { cursor: parseString(options.cursor) }), ...actAsInput(options) })).result);
    if (page.items.some(item => item.latestVisibleMessage != null && item.latestVisibleMessage.conversationId !== item.conversationId))
      throw mismatch("Inbox item");
    return page;
  }
  /** Searches messages (`messageRead`) as the `actAs` member, or within `conversationIds`. */
  async search(query: string, options: SearchOptions = {}): Promise<SearchPage> {
    const conversationIds = options.conversationIds?.map(id => parseId(id));
    if (conversationIds?.length === 0) throw new TypeError("Search conversationIds must name at least one conversation");
    if (options.actAs === undefined && conversationIds === undefined)
      throw new TypeError("Backend search requires actAs or conversationIds");
    const page = required((await this.http.execute("communication.search", this.projectId, { query: parseString(query),
      pageSize: pageLimit(options.limit), ...(options.cursor === undefined ? {} : { cursor: parseString(options.cursor) }),
      ...(conversationIds === undefined ? {} : { scope: { conversationIds } }), ...actAsInput(options) })).result);
    const items = page.items.map(parseSearchHit);
    if (conversationIds && items.some(item => !conversationIds.includes(item.conversationId))) throw mismatch("Search hit");
    return { ...page, items };
  }
  async initialize(): Promise<void> {
    const route = parseObject((await this.http.execute("communication.route", this.projectId, {})).result);
    if (route.projectId !== this.projectId || route.incarnation !== this.http.incarnation) throw new Error("Project incarnation changed; explicit recovery required");
    this.http.servingEpoch = parseString(route.servingEpoch);
  }
  async createPrincipal(externalUserId: string): Promise<string> {
    return (await this.principals.create({ externalUserId })).principalId;
  }
  async issueSession(principalId: string, deviceId: string, requestedTtlMs = "900000"): Promise<SessionBootstrap> {
    return this.sessions.issue({ principalId, deviceId, requestedTtlMs });
  }
  async sessionRequestOutcome(requestId: string): Promise<SessionRequestOutcome> {
    parseId(requestId);
    const readId = crypto.randomUUID(), incarnation = this.http.incarnation;
    if (readId === requestId) throw new ConvoHopProblem("INVALID_REQUEST", readId, "rejected", 400,
      "Session outcome requires a separate read request identity");
    const proof = await this.http.execute("communication.sessionRequestOutcome", this.projectId, { requestId }, readId);
    try {
      if (this.http.incarnation !== incarnation) throw new TypeError("Session outcome incarnation changed");
      return sessionOutcome(proof, requestId, this.projectId, incarnation,
        this.http.recoveryStates.find(state => state.requestId === requestId));
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new ConvoHopProblem("INVALID_RESPONSE", readId, "unknown", 503,
        "Malformed session request outcome; retain the original request and payload");
    }
  }
  async createConversation(title: string, members: { principalId: string; role: "member" | "moderator" }[]): Promise<Conversation> {
    return parseConversation((await this.http.execute("communication.createConversation", this.projectId, { title, props: {}, members })).result);
  }
  async addMembers(conversationId: string, members: GraphqlTypes.MemberBatchEntryInput[], requestId?: string): Promise<Membership[]> {
    if (!members.length || members.length > 100 || new Set(members.map(member => member.principalId)).size !== members.length)
      throw new TypeError("A membership batch requires 1..100 distinct principals");
    const entries = members.map(member => {
      if (member.role !== "member" && member.role !== "moderator") throw new TypeError("Invalid membership role");
      return { principalId: parseId(member.principalId), role: member.role, expectedRevision: parseCounter(member.expectedRevision) };
    });
    const result = (await this.http.execute("communication.addMembers", this.projectId,
      { conversationId: parseId(conversationId), members: entries }, requestId)).result;
    if (result.items.length !== entries.length) throw new TypeError("Invalid membership batch result");
    return result.items;
  }
}
