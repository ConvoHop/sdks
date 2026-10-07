import {
  V1Transport, V1Problem, v1Id, v1Record, v1String, v1Conversation, v1Counter,
  type V1RecoveryStorage, type V1AsyncRecoveryStorage, type V1SessionBootstrap, type V1Session,
  type V1RecoveryState, type V1Conversation, type V1Graphql, type V1Membership, type CommandOptions, type OperationPayload,
} from "@convohop/core";
import { required } from "./result.js";

type SessionOutcomeRead = Pick<OperationPayload<"communication.sessionRequestOutcome">["result"], "requestId" | "checkedAt">;
type CommittedSessionOutcome = SessionOutcomeRead & {
  state: "committed"; operation: "issueSession" | "renewSession"; receiptId: string; committedAt: string;
  originalSession: V1Session;
};
export type V1SessionRequestOutcome =
  | (SessionOutcomeRead & { state: "notObservedYet" })
  | (CommittedSessionOutcome & { currentState: "missing" })
  | (CommittedSessionOutcome & { currentState: "active" | "expired" | "revoked"; currentSession: V1Session });


function outcomeFields(value: unknown, fields: readonly string[]): void {
  const record = v1Record(value);
  if (Object.keys(record).some(field => !fields.includes(field)) || fields.some(field => !Object.hasOwn(record, field)))
    throw new TypeError("Unexpected session request outcome fields");
}
function outcomeTimestamp(value: unknown): string {
  const time = v1String(value), parsed = Date.parse(time);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(time) ||
      !Number.isFinite(parsed) || new Date(parsed).toISOString() !== time)
    throw new TypeError("Invalid session request outcome timestamp");
  return time;
}
const sessionIdentityFields = ["sessionId", "principalId", "deviceId", "incarnation"] as const;
function outcomeSession(value: V1Session, incarnation: string): V1Session {
  outcomeFields(value, ["sessionId", "principalId", "deviceId", "incarnation", "sessionRevision", "expiresAt", "status"]);
  for (const field of sessionIdentityFields) v1Id(value[field]);
  if (value.incarnation !== incarnation || v1Counter(value.sessionRevision) === "0")
    throw new TypeError("Invalid session request outcome scope or revision");
  outcomeTimestamp(value.expiresAt);
  return structuredClone(value);
}
function sessionOutcome(proof: OperationPayload<"communication.sessionRequestOutcome">, requestId: string,
  projectId: string, incarnation: string, custody: V1RecoveryState | undefined): V1SessionRequestOutcome {
  outcomeFields(proof, ["status", "requestId", "serverTime", "result"]);
  if (proof.status !== "ok") throw new TypeError("Expected a read-only session request outcome");
  outcomeTimestamp(proof.serverTime);
  const value = proof.result;
  const details = ["operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState"] as const;
  outcomeFields(value, ["state", "requestId", "checkedAt", ...details]);
  if (v1Id(value.requestId) !== requestId || (custody &&
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
       BigInt(v1Counter(custody.input.expectedRevision)) + 1n !== BigInt(originalSession.sessionRevision)))))
    throw new TypeError("Session request outcome does not match the original payload");
  const committed: CommittedSessionOutcome = { state: "committed", requestId, checkedAt, operation,
    receiptId: v1Id(value.receiptId), committedAt: outcomeTimestamp(value.committedAt), originalSession };
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
 * Data plane: project-wide message history, events, search and inbox reads (`messageRead` scope), bot/system or
 * act-as sends (`messageWrite`) and live-session and call history reads (`callRead`) belong on this client, next to
 * `conversations` and the `conversation(id)` handle. They are added only once the authority exposes those scopes in
 * the exported schema; until then the methods are deliberately absent rather than stubbed.
 */
export class V1ProjectServerClient {
  readonly projectId: string; readonly http: V1Transport;
  constructor(options: { baseUrl: string; projectId: string; backendKey: string; incarnation: string; recoveryStorage?: V1RecoveryStorage; asyncRecoveryStorage?: V1AsyncRecoveryStorage; fetch?: typeof fetch }) {
    this.projectId = v1Id(options.projectId);
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.backendKey,
      namespace: "backend:" + options.projectId, incarnation: v1Id(options.incarnation),
      ...(options.recoveryStorage === undefined ? {} : { recoveryStorage: options.recoveryStorage }),
      ...(options.asyncRecoveryStorage === undefined ? {} : { asyncRecoveryStorage: options.asyncRecoveryStorage }),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  readonly conversations = {
    create: async (input: V1Graphql.CreateConversationRequestInput, options: CommandOptions = {}) => {
      const result = (await this.http.execute("communication.createConversation", this.projectId, input, options.requestId)).result;
      if (!result) throw new TypeError("Missing created conversation");
      return result;
    },
  };
  conversation(conversationId: string) {
    v1Id(conversationId);
    return {
      get: async () => {
        const result = (await this.http.execute("communication.getConversation", this.projectId, { conversationId })).result;
        if (!result) throw new TypeError("Missing authorized conversation");
        return result;
      },
      members: {
        addBatch: (members: V1Graphql.MemberBatchEntryInput[], options: CommandOptions = {}) =>
          this.addMembers(conversationId, members, options.requestId),
        setBroadcastPermission: (input: Omit<V1Graphql.SetBroadcastPermissionInput, "conversationId">,
          options: CommandOptions = {}) => this.http.execute("communication.setBroadcastPermission",
            this.projectId, { conversationId, ...input }, options.requestId),
        list: async (options: { limit?: number; cursor?: string } = {}) =>
          (await this.http.execute("communication.members", this.projectId, { conversationId, limit: 100, ...options })).result,
      },
    };
  }
  async initialize(): Promise<void> {
    const route = v1Record((await this.http.execute("communication.route", this.projectId, {})).result);
    if (route.projectId !== this.projectId || route.incarnation !== this.http.incarnation) throw new Error("Project incarnation changed; explicit recovery required");
    this.http.servingEpoch = v1String(route.servingEpoch);
  }
  async createPrincipal(externalUserId: string): Promise<string> {
    return required((await this.http.execute("communication.createPrincipal", this.projectId, { externalUserId })).result).principalId;
  }
  async issueSession(principalId: string, deviceId: string, requestedTtlMs = "900000"): Promise<V1SessionBootstrap> {
    const issued = required((await this.http.execute("communication.issueSession", this.projectId,
      { principalId: v1Id(principalId), deviceId: v1Id(deviceId), requestedTtlMs })).result);
    return { ...issued, session: required(issued.session) };
  }
  async sessionRequestOutcome(requestId: string): Promise<V1SessionRequestOutcome> {
    v1Id(requestId);
    const readId = crypto.randomUUID(), incarnation = this.http.incarnation;
    if (readId === requestId) throw new V1Problem("INVALID_REQUEST", readId, "rejected", 400,
      "Session outcome requires a separate read request identity");
    const proof = await this.http.execute("communication.sessionRequestOutcome", this.projectId, { requestId }, readId);
    try {
      if (this.http.incarnation !== incarnation) throw new TypeError("Session outcome incarnation changed");
      return sessionOutcome(proof, requestId, this.projectId, incarnation,
        this.http.recoveryStates.find(state => state.requestId === requestId));
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new V1Problem("INVALID_RESPONSE", readId, "unknown", 503,
        "Malformed session request outcome; retain the original request and payload");
    }
  }
  async createConversation(title: string, members: { principalId: string; role: "member" | "moderator" }[]): Promise<V1Conversation> {
    return v1Conversation((await this.http.execute("communication.createConversation", this.projectId, { title, props: {}, members })).result);
  }
  async addMembers(conversationId: string, members: V1Graphql.MemberBatchEntryInput[], requestId?: string): Promise<V1Membership[]> {
    if (!members.length || members.length > 100 || new Set(members.map(member => member.principalId)).size !== members.length)
      throw new TypeError("A membership batch requires 1..100 distinct principals");
    const entries = members.map(member => {
      if (member.role !== "member" && member.role !== "moderator") throw new TypeError("Invalid membership role");
      return { principalId: v1Id(member.principalId), role: member.role, expectedRevision: v1Counter(member.expectedRevision) };
    });
    const result = (await this.http.execute("communication.addMembers", this.projectId,
      { conversationId: v1Id(conversationId), members: entries }, requestId)).result;
    if (result.items.length !== entries.length) throw new TypeError("Invalid membership batch result");
    return result.items;
  }
}
