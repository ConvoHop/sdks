import { v1GraphqlRequest, operationPayload, operationKey, validateOperationPayload, validateOutput,
  type OperationInput, type OperationPayload } from "./v1-graphql.js";
import { ConversationHandle, LiveSessionHandle, type PageOptions } from "./live.js";
import { v1Operations, type V1OperationKey } from "./v1-operations.js";
export type V1Record = Record<string, unknown>;
export type V1Cursor = NonNullable<NonNullable<OperationPayload<"communication.events">["result"]>["nextCursor"]>;
export interface V1Page<T> { items: T[]; complete: boolean; refreshRequired: boolean; nextCursor?: unknown }
export type V1Message = NonNullable<OperationPayload<"communication.getMessage">["result"]>;
export type V1SendReceipt = NonNullable<OperationPayload<"communication.sendMessage">["result"]> & { cursor: V1Cursor };
export type V1SearchHit = NonNullable<OperationPayload<"communication.search">["result"]>["items"][number] & { message: V1Message };
export type V1Membership = NonNullable<OperationPayload<"communication.members">["result"]>["items"][number];
export type V1Conversation = NonNullable<OperationPayload<"communication.getConversation">["result"]>;
export interface V1Route {
  projectId: string; incarnation: string; servingEpoch: string; communicationBase: string;
  wssUrl: string; expiresAt: string; signature: string;
}
export interface V1RecoveryState {
  requestId: string; incarnation: string; payloadFingerprint: string;
  operation: V1OperationKey; projectId?: string; input: V1Record;
  firstSubmittedAt: number; retryDeadline: number; attemptCount: number; lastAttemptAt: number;
  lastAttemptClassification: string; resolutionState: "pending" | "unknown" | "committed" | "accepted";
  mediaAdmissionAttempted?: true;
}
export type V1RecoveryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export class V1Problem extends Error {
  constructor(readonly code: string, readonly requestId: string, readonly outcome: string,
    readonly status: number, message: string) { super(message); this.name = "V1Problem"; }
}
export function v1Record(value: unknown): V1Record {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid protocol object");
  return value as V1Record;
}
export function v1String(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("Expected a protocol string");
  return value;
}
export function v1Id(value: unknown): string {
  const id = v1String(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ||
      id === "00000000-0000-0000-0000-000000000000") throw new TypeError("Expected a canonical nonzero UUID");
  return id;
}
export function v1Counter(value: unknown): string {
  const counter = v1String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(counter) || BigInt(counter) > 9223372036854775807n) throw new TypeError("Expected a canonical decimal counter");
  return counter;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new TypeError("Expected a protocol boolean");
  return value;
}
function timestamp(value: unknown): string {
  const time = v1String(value);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(time) || !Number.isFinite(Date.parse(time))) throw new TypeError("Expected a UTC millisecond timestamp");
  return time;
}
export function v1Cursor(value: unknown): V1Cursor {
  const v = v1Record(value);
  return { incarnation: v1Id(v.incarnation), conversationId: v1Id(v.conversationId), sequence: v1Counter(v.sequence) };
}
export function v1Page<T>(value: unknown, parse: (value: unknown) => T): V1Page<T> {
  const v = v1Record(value);
  if (!Array.isArray(v.items) || v.items.length > 100) throw new TypeError("Invalid bounded page");
  return { items: v.items.map(parse), complete: boolean(v.complete), refreshRequired: boolean(v.refreshRequired),
    ...(v.nextCursor === undefined ? {} : { nextCursor: v.nextCursor }) };
}
function eventPage(value: unknown, incarnation: string, conversationId: string, after?: V1Cursor): V1Page<V1Record> & { nextCursor: V1Cursor } {
  validateOutput(value, "EventPage");
  const result = v1Page(value, v1Record), cursor = v1Cursor(result.nextCursor);
  if (cursor.conversationId !== conversationId || cursor.incarnation !== incarnation ||
      (after && BigInt(cursor.sequence) < BigInt(after.sequence))) throw new TypeError("Invalid authoritative replay frontier");
  let previous = BigInt(after?.sequence ?? "0");
  for (const event of result.items) {
    const sequence = BigInt(v1Counter(event.sequence));
    if (v1Id(event.conversationId) !== conversationId || sequence <= previous || sequence > BigInt(cursor.sequence))
      throw new TypeError("Invalid ordered event scope");
    v1Id(event.eventId); previous = sequence;
  }
  return { ...result, nextCursor: cursor };
}
export function v1Message(value: unknown): V1Message {
  validateOutput(value, "Message!");
  return value as V1Message;
}
export function v1SearchHit(value: unknown): V1SearchHit {
  const v = v1Record(value), conversationId = v1Id(v.conversationId), message = v1Message(v.message);
  if (message.conversationId !== conversationId) throw new TypeError("Search hit conversation scope does not match its message");
  return { conversationId, message };
}
export function v1Membership(value: unknown): V1Membership {
  validateOutput(value, "Member!");
  return value as V1Membership;
}
export function v1Conversation(value: unknown): V1Conversation {
  validateOutput(value, "Conversation!");
  return value as V1Conversation;
}
function route(value: unknown): V1Route {
  const v = v1Record(value);
  return { projectId: v1Id(v.projectId), incarnation: v1Id(v.incarnation), servingEpoch: v1Counter(v.servingEpoch),
    communicationBase: v1String(v.communicationBase), wssUrl: v1String(v.wssUrl),
    expiresAt: timestamp(v.expiresAt), signature: v1String(v.signature) };
}
function origin(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))))
    throw new TypeError("Use an HTTPS origin, or explicit loopback HTTP for local development");
  return url.origin;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const v = v1Record(value);
    return "{" + Object.keys(v).sort().map(key => JSON.stringify(key) + ":" + canonical(v[key])).join(",") + "}";
  }
  if (typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) throw new TypeError("Unsafe protocol number");
  const result = JSON.stringify(value);
  if (result === undefined) throw new TypeError("JSON payload cannot contain undefined values");
  return result;
}
async function fingerprint(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return "sha256:" + [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, "0")).join("");
}
export interface V1TransportOptions {
  baseUrl: string; credential?: string; namespace: string; incarnation?: string;
  recoveryStorage?: V1RecoveryStorage; fetch?: typeof fetch;
}
export class V1Transport {
  readonly baseUrl: string;
  readonly durableRecovery: boolean;
  readonly #credential: string | undefined;
  readonly #fetch: typeof fetch;
  readonly #storage: V1RecoveryStorage | undefined;
  readonly #storageKey: string;
  readonly #states = new Map<string, V1RecoveryState>();
  readonly #active = new Map<string, Promise<V1Record>>();
  incarnation: string;
  servingEpoch: string | undefined;
  constructor(options: V1TransportOptions) {
    this.baseUrl = origin(options.baseUrl); this.#credential = options.credential;
    this.incarnation = options.incarnation ?? "management";
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#storage = options.recoveryStorage; this.durableRecovery = this.#storage !== undefined;
    this.#storageKey = "convohop.requests:" + options.namespace;
    const saved = this.#storage?.getItem(this.#storageKey);
    if (saved) {
      const values: unknown = JSON.parse(saved);
      if (!Array.isArray(values) || values.length > 128) throw new TypeError("Invalid mutation recovery storage");
      for (const item of values) {
        const v = v1Record(item);
        const operation = operationKey(v.operation);
        if (v1Operations[operation].kind !== "mutation" ||
            !["pending", "unknown", "committed", "accepted"].includes(v1String(v.resolutionState))) throw new TypeError("Invalid recovery record");
        const projectId = v.projectId === undefined ? undefined : v1Id(v.projectId);
        if ((v1Operations[operation].plane === "communication") !== (projectId !== undefined))
          throw new TypeError("Invalid recovery project scope");
        for (const key of ["firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt"]) {
          if (typeof v[key] !== "number" || !Number.isSafeInteger(v[key]) || v[key] < 0) throw new TypeError("Invalid recovery clock or count");
        }
        if (v.mediaAdmissionAttempted !== undefined && v.mediaAdmissionAttempted !== true)
          throw new TypeError("Invalid native admission marker");
        // All fields are checked before this stored record can authorize a resend.
        const state: V1RecoveryState = {
          requestId: v1Id(v.requestId), incarnation: v1String(v.incarnation), payloadFingerprint: v1String(v.payloadFingerprint),
          operation, ...(projectId === undefined ? {} : { projectId }), input: v1Record(v.input),
          firstSubmittedAt: Number(v.firstSubmittedAt), retryDeadline: Number(v.retryDeadline), attemptCount: Number(v.attemptCount),
          lastAttemptAt: Number(v.lastAttemptAt), lastAttemptClassification: v1String(v.lastAttemptClassification),
          resolutionState: v.resolutionState as V1RecoveryState["resolutionState"],
          ...(v.mediaAdmissionAttempted === true ? { mediaAdmissionAttempted: true } : {}),
        };
        this.#states.set(state.requestId, state);
      }
    }
  }
  get recoveryStates(): readonly V1RecoveryState[] { return [...this.#states.values()].map(state => structuredClone(state)); }
  /** @internal Persist the native attempt boundary without retaining a bearer grant. */
  markMediaAdmissionAttempted(requestId: string): void {
    const state = this.#states.get(v1Id(requestId));
    if (!state || state.operation !== "communication.liveSessionCredentials" || state.resolutionState !== "committed")
      throw new Error("Native admission requires a committed credential issuance");
    state.lastAttemptClassification = "nativeAdmissionAttempted";
    state.mediaAdmissionAttempted = true;
    this.#persist();
  }
  #persist(): void {
    while (this.#states.size > 128) {
      const settled = [...this.#states.values()].find(state => ["committed", "accepted"].includes(state.resolutionState));
      if (!settled) throw new Error("Resolve outstanding mutations before creating more");
      this.#states.delete(settled.requestId);
    }
    this.#storage?.setItem(this.#storageKey, JSON.stringify([...this.#states.values()]));
  }
  async execute<K extends V1OperationKey>(key: K, projectId: string | undefined, input: OperationInput<K>,
    requestId: string = crypto.randomUUID(), credentialDeliveryPermit?: V1Record): Promise<OperationPayload<K>> {
    const operation = v1Operations[operationKey(key)];
    const body = Object.fromEntries(Object.entries(v1Record(input)).filter(([, value]) => value !== undefined));
    this.#plan(key, projectId, body, requestId, credentialDeliveryPermit);
    const result = operationPayload(key, operation.kind === "mutation"
      ? await this.#mutate(key, projectId, body, requestId, credentialDeliveryPermit)
      : await this.#request(key, projectId, body, requestId, credentialDeliveryPermit));
    if (key === "communication.resolveRequest" || key === "management.resolveRequest") {
      const state = this.#states.get(v1String(body.requestId)), resolution = v1Record(v1Record(result).result);
      if (resolution.requestId !== body.requestId ||
          (resolution.receipt != null && v1Record(resolution.receipt).requestId !== body.requestId))
        throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", 503, "Request resolution identity changed");
      if (state && (state.projectId !== projectId || state.incarnation !== this.incarnation))
        throw new V1Problem("RESOLUTION_REQUIRED", requestId, "unknown", 409, "Resolve within the original project and incarnation");
      if (state && (resolution.state === "committed" || resolution.state === "accepted")) {
        state.resolutionState = resolution.state; state.lastAttemptClassification = "authorityReceipt"; this.#persist();
      }
    }
    return result;
  }
  async #mutate(operation: V1OperationKey, projectId: string | undefined, input: V1Record,
    requestId: string, credentialDeliveryPermit?: V1Record): Promise<V1Record> {
    v1Id(requestId);
    const hash = await fingerprint({ operation, projectId: projectId ?? null, input });
    let state = this.#states.get(requestId);
    if (state && (state.payloadFingerprint !== hash || state.incarnation !== this.incarnation)) throw new V1Problem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload");
    if (!state) {
      const now = Date.now();
      state = { requestId, incarnation: this.incarnation, payloadFingerprint: hash, operation,
        ...(projectId === undefined ? {} : { projectId }), input: structuredClone(input),
        firstSubmittedAt: now, retryDeadline: now + 60000,
        attemptCount: 0, lastAttemptAt: now, lastAttemptClassification: "notSubmitted", resolutionState: "pending" };
      this.#states.set(requestId, state); this.#persist();
    }
    const active = this.#active.get(requestId); if (active) return active;
    const work = this.#submit(state, credentialDeliveryPermit);
    this.#active.set(requestId, work);
    try { return await work; } finally { this.#active.delete(requestId); }
  }
  async #submit(state: V1RecoveryState, credentialDeliveryPermit?: V1Record): Promise<V1Record> {
    const now = Date.now();
    if (state.attemptCount >= 3 || now > state.retryDeadline || now < state.firstSubmittedAt || now < state.lastAttemptAt)
      throw new V1Problem("RESOLUTION_REQUIRED", state.requestId, "unknown", 409, "Retry budget expired or clock changed; resolve this request read-only");
    state.attemptCount += 1; state.lastAttemptAt = now;
    if (state.resolutionState === "pending") state.resolutionState = "unknown";
    state.lastAttemptClassification = "submitted"; this.#persist();
    try {
      const result = await this.#request(state.operation, state.projectId, state.input, state.requestId, credentialDeliveryPermit);
      if (result.status !== "committed" && result.status !== "accepted") throw new TypeError("A mutation requires authority receipt evidence");
      state.resolutionState = result.status; state.lastAttemptClassification = "authorityReceipt"; this.#persist(); return result;
    } catch (error) {
      state.lastAttemptClassification = error instanceof V1Problem ? error.code : "opaqueTransportFailure";
      this.#persist(); throw error;
    }
  }
  async retry(requestId: string): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>> {
    const state = this.#states.get(v1Id(requestId));
    if (!state) throw new Error("No recovery record exists; do not invent a replacement identity");
    if (state.incarnation !== this.incarnation) throw new V1Problem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    if (state.operation === "communication.redeemCredential" || state.operation === "communication.acknowledgeCredential")
      throw new V1Problem("CREDENTIAL_REQUIRED", requestId, "unknown", 409,
        "Delivery permits cannot authorize request lookup; obtain a current permit and submit the same delivery identity explicitly");
    const key = v1Operations[state.operation].plane === "management" ? "management.resolveRequest" : "communication.resolveRequest";
    const resolution = (await this.execute(key, state.projectId, { requestId })).result;
    if (!resolution) throw new TypeError("Missing current request resolution");
    if (resolution.state === "committed" || resolution.state === "accepted") return resolution;
    if (resolution.state !== "notObservedYet") throw new TypeError("Unknown request resolution state");
    if (["committed", "accepted"].includes(state.resolutionState) || state.mediaAdmissionAttempted) {
      throw new V1Problem("RESOLUTION_REQUIRED", requestId, "unknown", 409,
        "Previously observed commit or native admission cannot be retried from absent evidence");
    }
    if (await fingerprint({ operation: state.operation, projectId: state.projectId ?? null, input: state.input }) !== state.payloadFingerprint)
      throw new Error("Recovery input fingerprint changed");
    await this.#mutate(state.operation, state.projectId, state.input, state.requestId);
    const current = (await this.execute(key, state.projectId, { requestId })).result;
    if (!current) throw new TypeError("Missing current request resolution");
    return current;
  }
  #plan(key: V1OperationKey, projectId: string | undefined, input: V1Record,
    requestId: string, credentialDeliveryPermit?: V1Record): ReturnType<typeof v1GraphqlRequest> {
    try {
      return v1GraphqlRequest(key, input, { requestId: v1Id(requestId),
        ...(projectId === undefined ? {} : { projectId: v1Id(projectId) }),
        ...(credentialDeliveryPermit === undefined ? {} : { credentialDeliveryPermit }),
        ...(this.incarnation === "management" ? {} : { incarnation: this.incarnation }),
        ...(this.servingEpoch === undefined ? {} : { observedServingEpoch: this.servingEpoch }) });
    } catch (error) {
      throw new V1Problem("INVALID_REQUEST", requestId, "rejected", 400,
        error instanceof Error ? error.message : "Invalid SDK operation");
    }
  }
  async #request(key: V1OperationKey, projectId: string | undefined, input: V1Record,
    requestId: string, credentialDeliveryPermit?: V1Record): Promise<V1Record> {
    const plan = this.#plan(key, projectId, input, requestId, credentialDeliveryPermit);
    const headers: Record<string, string> = { accept: "application/json", "content-type": "application/json" };
    if (this.#credential !== undefined) headers.authorization = "Bearer " + this.#credential;
    let response: Response;
    try {
      response = await this.#fetch(this.baseUrl + "/graphql", { method: "POST", headers, redirect: "error", cache: "no-store", credentials: "omit",
        signal: AbortSignal.timeout(12000), body: canonical(plan.body) });
    } catch { throw new V1Problem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Authority response unavailable; resolve the original request"); }
    let text: string;
    try { text = await response.text(); }
    catch { throw new V1Problem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Incomplete authority response; resolve the original request"); }
    if (text.length > 1_048_576) throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", response.status, "Authority response exceeds the bound");
    let decoded: unknown;
    try { decoded = JSON.parse(text); } catch { throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", response.status, "Unrecognized authority response"); }
    try {
      const graphql = v1Record(decoded);
      if (Array.isArray(graphql.errors) && graphql.errors.length) {
        const error = v1Record(graphql.errors[0]);
        const extensions = error.extensions == null ? {} : v1Record(error.extensions);
        throw new V1Problem(typeof extensions.code === "string" ? extensions.code : "GRAPHQL_ERROR", requestId,
          typeof extensions.outcome === "string" ? extensions.outcome : "unknown",
          typeof extensions.status === "number" ? extensions.status : 503,
          typeof error.message === "string" ? error.message : "GraphQL rejected the request");
      }
      if (!response.ok) {
        throw new V1Problem(typeof graphql.code === "string" ? graphql.code : "HTTP_FAILURE", requestId,
          typeof graphql.outcome === "string" ? graphql.outcome : "unknown", response.status,
          typeof graphql.message === "string" ? graphql.message : "Authority rejected the request");
      }
      const raw = v1Record(graphql.data)[plan.operation.field];
      const value = v1Record(raw);
      validateOperationPayload(plan.operation, value);
      if (!["ok", "committed", "accepted"].includes(v1String(value.status))) throw new TypeError("Unrecognized authority envelope");
      if (v1Id(value.requestId) !== requestId) throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", response.status, "Mismatched authority request identity");
      if (plan.operation.kind === "mutation") {
        if (value.status === "committed") {
          v1Id(value.receiptId); timestamp(value.committedAt); boolean(value.replayed);
        } else if (value.status === "accepted") {
          v1Id(v1Record(value.operation).operationId);
        } else throw new TypeError("A mutation requires authority receipt evidence");
      }
      return value;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", response.status, "Malformed authority response; resolve the original request");
    }
  }
}
export interface V1ClientOptions {
  baseUrl: string; projectId: string; sessionToken: string; incarnation: string; principalId: string;
  recoveryStorage?: V1RecoveryStorage; fetch?: typeof fetch;
}
export class V1Client {
  readonly projectId: string; readonly principalId: string; readonly http: V1Transport;
  readonly #token: string; readonly storage: V1RecoveryStorage | undefined;
  #route: V1Route | undefined;
  readonly #streams = new Set<V1Realtime>();
  readonly #replayGenerations = new Map<string, number>();
  constructor(options: V1ClientOptions) {
    this.projectId = v1Id(options.projectId); this.principalId = v1Id(options.principalId); this.#token = options.sessionToken; this.storage = options.recoveryStorage;
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.sessionToken,
      namespace: options.projectId + ":" + options.principalId, incarnation: v1Id(options.incarnation),
      ...(options.recoveryStorage ? { recoveryStorage: options.recoveryStorage } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  async initialize(): Promise<V1Route> {
    const value = route((await this.http.execute("communication.route", this.projectId, {})).result);
    if (value.projectId !== this.projectId || value.incarnation !== this.http.incarnation) throw new V1Problem("INCARNATION_MISMATCH", crypto.randomUUID(), "rejected", 409, "Explicit session/route recovery required");
    const socket = new URL(value.wssUrl), base = new URL(this.http.baseUrl);
    if (origin(value.communicationBase) !== this.http.baseUrl || socket.host !== base.host ||
        socket.protocol !== (base.protocol === "https:" ? "wss:" : "ws:") ||
        socket.pathname !== "/graphql" || socket.username || socket.password || socket.search || socket.hash)
      throw new TypeError("Route cannot redirect this client's credentials to another origin or an unsafe socket");
    this.http.servingEpoch = value.servingEpoch; this.#route = value; return value;
  }
  conversation(id: string): ConversationHandle { return new ConversationHandle(this, v1Id(id)); }
  async getConversation(id: string): Promise<V1Conversation> {
    return v1Conversation((await this.http.execute("communication.getConversation", this.projectId, { conversationId: v1Id(id) })).result);
  }
  readonly requests = {
    resolve: async (requestId: string) => {
      const result = (await this.http.execute("communication.resolveRequest", this.projectId, { requestId: v1Id(requestId) })).result;
      if (!result) throw new TypeError("Missing current request resolution");
      return result;
    },
    retry: (requestId: string) => this.http.retry(requestId),
  };
  liveSession(id: string) { return LiveSessionHandle.get(this, v1Id(id)); }
  readonly liveAlerts = {
    list: async (options: PageOptions = {}) =>
      (await this.http.execute("communication.liveSessionAlerts", this.projectId, options)).result,
  };
  async messages(id: string, beforeSequence?: string): Promise<V1Page<V1Message>> {
    return v1Page((await this.http.execute("communication.messages", this.projectId,
      { conversationId: v1Id(id), limit: 100, ...(beforeSequence === undefined ? {} : { beforeSequence: v1Counter(beforeSequence) }) })).result, v1Message);
  }
  async send(id: string, text: string, requestId?: string): Promise<V1SendReceipt> {
    const result = (await this.http.execute("communication.sendMessage", this.projectId, { conversationId: v1Id(id), text, props: {} }, requestId)).result;
    if (!result) throw new TypeError("Missing send receipt");
    const cursor = v1Cursor(result.cursor);
    if (result.status !== "sent" || result.conversationId !== id || cursor.conversationId !== id ||
        cursor.sequence !== result.sequence || cursor.incarnation !== this.http.incarnation) throw new TypeError("Invalid send receipt scope");
    return { ...result, cursor };
  }
  async edit(message: V1Message, text: string, requestId?: string): Promise<V1Message> {
    return v1Message((await this.http.execute("communication.editMessage", this.projectId,
      { conversationId: message.conversationId, messageId: message.messageId, text, expectedRevision: message.revision }, requestId)).result);
  }
  async delete(message: V1Message, requestId?: string): Promise<V1Message> {
    return v1Message((await this.http.execute("communication.deleteMessage", this.projectId,
      { conversationId: message.conversationId, messageId: message.messageId, expectedRevision: message.revision }, requestId)).result);
  }
  async events(id: string, after?: V1Cursor): Promise<V1Page<V1Record> & { nextCursor: V1Cursor }> {
    return eventPage((await this.http.execute("communication.events", this.projectId,
      { conversationId: v1Id(id), limit: 100, ...(after === undefined ? {} : { after }) })).result,
      this.http.incarnation, id, after);
  }
  async reportRead(id: string, membership: V1Membership, throughSequence: string): Promise<V1Record> {
    return v1Record((await this.http.execute("communication.reportReceipt", this.projectId,
      { conversationId: v1Id(id), kind: "read", membershipEpoch: membership.membershipEpoch,
        visibilityEpoch: membership.visibilityEpoch, throughSequence: v1Counter(throughSequence) })).result);
  }
  async receipts(id: string): Promise<V1Page<V1Record>> {
    return v1Page((await this.http.execute("communication.receipts", this.projectId, { conversationId: v1Id(id), limit: 100 })).result, v1Record);
  }
  async search(query: string, conversationIds?: string[]): Promise<V1Page<V1SearchHit>> {
    return v1Page((await this.http.execute("communication.search", this.projectId,
      { query, pageSize: 100, ...(conversationIds ? { scope: { conversationIds } } : {}) })).result, v1SearchHit);
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
  async watch(conversationId: string, apply: (events: V1Record[]) => Promise<void>, onError: (error: Error) => void): Promise<V1Realtime> {
    return this.#openReplay(v1Id(conversationId), apply, onError, false);
  }
  async resyncAuthorizedHistory(conversationId: string, apply: (events: V1Record[]) => Promise<void>,
    onError: (error: Error) => void): Promise<V1Realtime> {
    const id = v1Id(conversationId);
    this.#replayGenerations.set(id, (this.#replayGenerations.get(id) ?? 0) + 1);
    for (const stream of this.#streams) if (stream.conversationId === id) stream.close();
    return this.#openReplay(id, apply, onError, true);
  }
  async #openReplay(conversationId: string, apply: (events: V1Record[]) => Promise<void>,
    onError: (error: Error) => void, resync: boolean): Promise<V1Realtime> {
    const generation = this.#replayGenerations.get(conversationId) ?? 0;
    const route = this.#route ?? await this.initialize();
    if (generation !== (this.#replayGenerations.get(conversationId) ?? 0)) throw new Error("History watcher superseded by explicit resynchronization");
    const realtime = new V1Realtime(this, conversationId, route, this.#token, apply, onError, () => this.#streams.delete(realtime));
    this.#streams.add(realtime);
    try {
      if (resync) await realtime.resyncAuthorizedHistory(); else await realtime.start();
      if (generation !== (this.#replayGenerations.get(conversationId) ?? 0)) throw new Error("History watcher superseded by explicit resynchronization");
      return realtime;
    }
    catch (error) { realtime.close(); throw error; }
  }
}
export class V1Realtime {
  #socket: WebSocket | undefined; #closed = false; #working: Promise<void> | undefined;
  #started = false;
  #cursor: V1Cursor | undefined; #timer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempts = 0;
  #pendingPages = 0;
  #queueGeneration = 0;
  #currentRoute: V1Route;
  readonly #storageKey: string;
  readonly #token: string;
  constructor(readonly client: V1Client, readonly conversationId: string, readonly route: V1Route, token: string,
    readonly apply: (events: V1Record[]) => Promise<void>, readonly onError: (error: Error) => void,
    readonly onClose?: () => void) {
    this.#token = token;
    this.#currentRoute = route;
    this.#storageKey = `convohop.v1.cursor:${client.projectId}:${client.principalId}:${conversationId}`;
    const saved = client.storage?.getItem(this.#storageKey);
    if (saved) this.#cursor = v1Cursor(JSON.parse(saved));
  }
  get cursor(): V1Cursor | undefined { return this.#cursor; }
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
    await this.reconcile();
    if (!this.#closed) this.#connect();
  }
  #connect(): void {
    if (this.#closed) return;
    const ws = new WebSocket(this.#currentRoute.wssUrl, "graphql-transport-ws"); this.#socket = ws;
    const subscriptionId = crypto.randomUUID();
    ws.onopen = () => {
      if (this.#closed || this.#socket !== ws) { ws.close(1000); return; }
      ws.send(JSON.stringify({ type: "connection_init", payload: {
        projectId: this.client.projectId, incarnation: this.#currentRoute.incarnation, token: this.#token } }));
    };
    ws.onmessage = event => {
      if (this.#closed || this.#socket !== ws) return;
      try {
        const text = v1String(event.data);
        if (text.length > 65536) throw new V1Problem("ADMISSION_LIMIT", subscriptionId, "rejected", 503, "Subscription frame exceeds its budget");
        const frame = v1Record(JSON.parse(text));
        if (frame.type === "connection_ack") {
          this.#reconnectAttempts = 0;
          const operation = v1Operations["communication.conversationEvents"];
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
          const payload = frame.type === "error" ? { errors: frame.payload } : v1Record(frame.payload);
          if (Array.isArray(payload.errors) && payload.errors.length) {
            const problem = v1Record(payload.errors[0]), extensions = v1Record(problem.extensions);
            throw new V1Problem(v1String(extensions.code), v1Id(extensions.requestId), v1String(extensions.outcome),
              Number(extensions.status), v1String(problem.message));
          }
          this.#page(v1Record(payload.data).conversationEvents);
        } else if (frame.type === "complete") {
          throw new V1Problem("AUTHORITY_UNAVAILABLE", subscriptionId, "unknown", 503, "Resume the subscription from its applied cursor");
        }
      } catch (error) { this.#fail(error); }
    };
    ws.onerror = () => this.onError(new Error("Realtime connection unavailable; current history remains authoritative"));
    ws.onclose = event => {
      if (this.#socket !== ws) return;
      this.#socket = undefined;
      if (!this.#closed && ![4400, 4401, 4403, 4408, 4409].includes(event.code)) this.#retry();
      else if (!this.#closed) this.#fail(new V1Problem("UNAUTHENTICATED", subscriptionId, "rejected", 401, "Realtime authorization ended; obtain a current session"));
    };
  }
  #page(value: unknown): void {
    if (this.#pendingPages >= 4) throw new V1Problem("ADMISSION_LIMIT", crypto.randomUUID(), "unknown", 503, "Application must resume from its applied cursor");
    const page = eventPage(value, this.#currentRoute.incarnation, this.conversationId);
    if (page.refreshRequired) throw new Error("Explicit authorized history resynchronization required");
    const generation = this.#queueGeneration;
    this.#pendingPages++;
    const work = (this.#working ?? Promise.resolve()).then(async () => {
      if (this.#closed || generation !== this.#queueGeneration ||
          (this.#cursor && BigInt(page.nextCursor.sequence) < BigInt(this.#cursor.sequence))) return;
      const events = this.#cursor ? page.items.filter(event => BigInt(v1Counter(event.sequence)) > BigInt(this.#cursor!.sequence)) : page.items;
      await this.apply(events);
      if (this.#closed || generation !== this.#queueGeneration) return;
      this.#cursor = page.nextCursor;
      this.client.storage?.setItem(this.#storageKey, JSON.stringify(this.#cursor));
    }).catch(error => { if (generation === this.#queueGeneration) this.#fail(error); }).finally(() => {
      this.#pendingPages--;
      if (this.#working === work) this.#working = undefined;
    });
    this.#working = work;
  }
  #retry(): void {
    if (this.#closed || this.#timer) return;
    const delay = Math.min(1000 * 2 ** Math.min(this.#reconnectAttempts++, 4), 10000) + Math.floor(Math.random() * 500);
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      if (this.#closed) return;
      this.client.initialize().then(route => {
        this.#currentRoute = route;
        if (!this.#closed) return this.client.recoverPending(this.onError);
      }).then(() => this.reconcile()).then(() => this.#connect()).catch(error => this.#fail(error));
    }, delay);
  }
  #fail(error: unknown): void {
    if (this.#closed) return;
    this.#queueGeneration++;
    if (error instanceof V1Problem && ([0, 429, 503].includes(error.status) || error.code === "WRONG_REGION")) {
      const socket = this.#socket; this.#socket = undefined;
      socket?.close(4000, "Retrying authoritative connection");
      this.onError(error); this.#retry(); return;
    }
    this.close();
    this.onError(error instanceof Error ? error : new Error("Realtime reconciliation failed"));
  }
  async reconcile(): Promise<void> {
    if (this.#closed) return;
    if (this.#working) return this.#working;
    const generation = this.#queueGeneration;
    const work = async () => {
      for (let page = 0; page < 10 && !this.#closed; page++) {
        const result = await this.client.events(this.conversationId, this.#cursor);
        if (this.#closed || generation !== this.#queueGeneration) return;
        if (result.refreshRequired) throw new Error("Explicit authorized history resynchronization required");
        await this.apply(result.items);
        if (this.#closed || generation !== this.#queueGeneration) return;
        this.#cursor = result.nextCursor;
        this.client.storage?.setItem(this.#storageKey, JSON.stringify(this.#cursor));
        if (result.complete) return;
      }
      throw new Error("Replay work limit reached; explicitly reconcile again");
    };
    const pending = work(); this.#working = pending;
    try { await pending; } finally { if (this.#working === pending) this.#working = undefined; }
  }
  close(): void {
    if (this.#closed) return;
    this.#closed = true; this.#queueGeneration++;
    if (this.#timer) clearTimeout(this.#timer);
    const socket = this.#socket; this.#socket = undefined; socket?.close(1000);
    this.onClose?.();
  }
}
