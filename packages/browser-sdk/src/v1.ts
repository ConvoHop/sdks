/** Selected REST/WSS protocol. The legacy GraphQL client remains a separate API. */
export type V1Record = Record<string, unknown>;
export interface V1Cursor { incarnation: string; conversationId: string; sequence: string }
export interface V1Page<T> { items: T[]; complete: boolean; refreshRequired: boolean; nextCursor?: unknown }
export interface V1Message {
  messageId: string; conversationId: string; authorId: string; sequence: string;
  revision: string; revisionSequence: string; createdAt: string; deleted: boolean;
  text?: string; props?: V1Record;
}
export interface V1SendReceipt {
  messageId: string; conversationId: string; sequence: string; revision: string; status: "sent"; cursor: V1Cursor;
}
export interface V1SearchHit { conversationId: string; message: V1Message }
export interface V1Membership {
  conversationId: string; principalId: string; role: string; status: string;
  membershipEpoch: string; visibilityEpoch: string; revision: string; visibleFromSequence: string;
}
export interface V1Conversation {
  conversationId: string; revision: string; title: string; latestSequence: string;
  props: V1Record; membership: V1Membership | null;
}
export interface V1Call {
  callId: string; conversationId: string; revision: string; generation: string; state: string;
  creatorId: string; media: { audio: boolean; video: boolean };
  invitation?: { invitationId: string; callId: string; generation: string; status: string; expiresAt: string };
  participation?: V1Record;
  errorCode?: string;
}
export interface V1MediaGrant {
  callId: string; generation: string; livekitUrl: string; roomName: string; participantIdentity: string;
  transportToken: string; admissionTicket: V1Record; forwardingLease: V1Record;
  transportExpiresAt: string; admissionExpiresAt: string; leaseExpiresAt: string; leasePolicyId: string;
}
export interface V1Route {
  projectId: string; incarnation: string; servingEpoch: string; communicationBase: string;
  wssUrl: string; expiresAt: string; signature: string;
}
export interface V1Envelope<T> {
  status: "ok" | "committed" | "accepted"; requestId: string; result: T;
  replayed?: boolean; operation?: V1Record; resourceRef?: V1Record;
}
export interface V1RecoveryState {
  requestId: string; incarnation: string; payloadFingerprint: string;
  method: string; path: string; payload: V1Record;
  firstSubmittedAt: number; retryDeadline: number; attemptCount: number; lastAttemptAt: number;
  lastAttemptClassification: string; resolutionState: "pending" | "unknown" | "committed" | "accepted";
}
export type V1RecoveryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export class V1Problem extends Error {
  constructor(readonly code: string, readonly requestId: string, readonly outcome: string,
    readonly status: number, message: string) { super(message); this.name = "V1Problem"; }
}
export function v1Record(value: unknown): V1Record {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid versioned JSON object");
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
export function v1Message(value: unknown): V1Message {
  const v = v1Record(value);
  const deleted = boolean(v.deleted);
  return { messageId: v1Id(v.messageId), conversationId: v1Id(v.conversationId), authorId: v1Id(v.authorId),
    sequence: v1Counter(v.sequence), revision: v1Counter(v.revision), revisionSequence: v1Counter(v.revisionSequence),
    createdAt: timestamp(v.createdAt), deleted,
    ...(deleted ? {} : { text: v1String(v.text), props: v1Record(v.props) }) };
}
export function v1SearchHit(value: unknown): V1SearchHit {
  const v = v1Record(value), conversationId = v1Id(v.conversationId), message = v1Message(v.message);
  if (message.conversationId !== conversationId) throw new TypeError("Search hit conversation scope does not match its message");
  return { conversationId, message };
}
export function v1Membership(value: unknown): V1Membership {
  const v = v1Record(value);
  return { conversationId: v1Id(v.conversationId), principalId: v1Id(v.principalId),
    role: v1String(v.role), status: v1String(v.status), revision: v1Counter(v.revision),
    membershipEpoch: v1Counter(v.membershipEpoch), visibilityEpoch: v1Counter(v.visibilityEpoch),
    visibleFromSequence: v1Counter(v.visibleFromSequence) };
}
export function v1Conversation(value: unknown): V1Conversation {
  const v = v1Record(value);
  return { conversationId: v1Id(v.conversationId), revision: v1Counter(v.revision), title: v1String(v.title),
    latestSequence: v1Counter(v.latestSequence), props: v1Record(v.props), membership: v.membership === null ? null : v1Membership(v.membership) };
}
export function v1Call(value: unknown): V1Call {
  const v = v1Record(value); const media = v1Record(v.media);
  const result: V1Call = { callId: v1Id(v.callId), conversationId: v1Id(v.conversationId),
    revision: v1Counter(v.revision), generation: v1Counter(v.generation), state: v1String(v.state),
    creatorId: v1Id(v.creatorId), media: { audio: boolean(media.audio), video: boolean(media.video) } };
  if (!["preparing", "offering", "active", "draining", "ended", "interrupted", "failed"].includes(result.state)) throw new TypeError("Invalid call state");
  if (v.invitation !== undefined) {
    const invitation = v1Record(v.invitation);
    result.invitation = { invitationId: v1Id(invitation.invitationId), callId: v1Id(invitation.callId),
      generation: v1Counter(invitation.generation), status: v1String(invitation.status), expiresAt: timestamp(invitation.expiresAt) };
  }
  if (v.participation !== undefined) result.participation = v1Record(v.participation);
  if (v.errorCode !== undefined) result.errorCode = v1String(v.errorCode);
  return result;
}
export function v1MediaGrant(value: unknown): V1MediaGrant {
  const v = v1Record(value);
  return { callId: v1Id(v.callId), generation: v1Counter(v.generation),
    livekitUrl: v1String(v.livekitUrl), roomName: v1String(v.roomName), participantIdentity: v1String(v.participantIdentity),
    transportToken: v1String(v.transportToken), admissionTicket: v1Record(v.admissionTicket), forwardingLease: v1Record(v.forwardingLease),
    transportExpiresAt: timestamp(v.transportExpiresAt), admissionExpiresAt: timestamp(v.admissionExpiresAt),
    leaseExpiresAt: timestamp(v.leaseExpiresAt), leasePolicyId: v1String(v.leasePolicyId) };
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
  readonly #active = new Map<string, Promise<V1Envelope<unknown>>>();
  incarnation: string;
  servingEpoch: string | undefined;
  constructor(options: V1TransportOptions) {
    this.baseUrl = origin(options.baseUrl); this.#credential = options.credential;
    this.incarnation = options.incarnation ?? "management";
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#storage = options.recoveryStorage; this.durableRecovery = this.#storage !== undefined;
    this.#storageKey = "convohop.v1.recovery:" + options.namespace;
    const saved = this.#storage?.getItem(this.#storageKey);
    if (saved) {
      const values: unknown = JSON.parse(saved);
      if (!Array.isArray(values) || values.length > 128) throw new TypeError("Invalid mutation recovery storage");
      for (const item of values) {
        const v = v1Record(item);
        if (!["POST", "PATCH"].includes(v1String(v.method)) || !v1String(v.path).startsWith("/") ||
            !["pending", "unknown", "committed", "accepted"].includes(v1String(v.resolutionState))) throw new TypeError("Invalid recovery record");
        for (const key of ["firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt"]) {
          if (typeof v[key] !== "number" || !Number.isSafeInteger(v[key]) || v[key] < 0) throw new TypeError("Invalid recovery clock or count");
        }
        // All fields are checked before this stored record can authorize a resend.
        const state: V1RecoveryState = {
          requestId: v1Id(v.requestId), incarnation: v1String(v.incarnation), payloadFingerprint: v1String(v.payloadFingerprint),
          method: v1String(v.method), path: v1String(v.path), payload: v1Record(v.payload),
          firstSubmittedAt: Number(v.firstSubmittedAt), retryDeadline: Number(v.retryDeadline), attemptCount: Number(v.attemptCount),
          lastAttemptAt: Number(v.lastAttemptAt), lastAttemptClassification: v1String(v.lastAttemptClassification),
          resolutionState: v.resolutionState as V1RecoveryState["resolutionState"],
        };
        this.#states.set(state.requestId, state);
      }
    }
  }
  get recoveryStates(): readonly V1RecoveryState[] { return [...this.#states.values()].map(state => structuredClone(state)); }
  #persist(): void {
    while (this.#states.size > 128) {
      const settled = [...this.#states.values()].find(state => ["committed", "accepted"].includes(state.resolutionState));
      if (!settled) throw new Error("Resolve outstanding mutations before creating more");
      this.#states.delete(settled.requestId);
    }
    this.#storage?.setItem(this.#storageKey, JSON.stringify([...this.#states.values()]));
  }
  async read(path: string, body?: V1Record): Promise<V1Envelope<unknown>> {
    return this.#request(body === undefined ? "GET" : "POST", path, body, crypto.randomUUID());
  }
  async mutate(method: "POST" | "PATCH", path: string, payload: V1Record, requestId: string = crypto.randomUUID()): Promise<V1Envelope<unknown>> {
    v1Id(requestId);
    const hash = await fingerprint({ method, path, payload });
    let state = this.#states.get(requestId);
    if (state && (state.payloadFingerprint !== hash || state.incarnation !== this.incarnation)) throw new V1Problem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload");
    if (!state) {
      const now = Date.now();
      state = { requestId, incarnation: this.incarnation, payloadFingerprint: hash, method, path,
        payload: structuredClone(payload), firstSubmittedAt: now, retryDeadline: now + 60000,
        attemptCount: 0, lastAttemptAt: now, lastAttemptClassification: "notSubmitted", resolutionState: "pending" };
      this.#states.set(requestId, state); this.#persist();
    }
    const active = this.#active.get(requestId); if (active) return active;
    const work = this.#submit(state);
    this.#active.set(requestId, work);
    try { return await work; } finally { this.#active.delete(requestId); }
  }
  async #submit(state: V1RecoveryState): Promise<V1Envelope<unknown>> {
    const now = Date.now();
    if (state.attemptCount >= 3 || now > state.retryDeadline || now < state.firstSubmittedAt || now < state.lastAttemptAt)
      throw new V1Problem("RESOLUTION_REQUIRED", state.requestId, "unknown", 409, "Retry budget expired or clock changed; resolve this request read-only");
    state.attemptCount += 1; state.lastAttemptAt = now;
    if (state.resolutionState === "pending") state.resolutionState = "unknown";
    state.lastAttemptClassification = "submitted"; this.#persist();
    try {
      const result = await this.#request(state.method, state.path, state.payload, state.requestId);
      if (result.status !== "committed" && result.status !== "accepted") throw new TypeError("A mutation requires authority receipt evidence");
      state.resolutionState = result.status; state.lastAttemptClassification = "authorityReceipt"; this.#persist(); return result;
    } catch (error) {
      state.lastAttemptClassification = error instanceof V1Problem ? error.code : "opaqueTransportFailure";
      this.#persist(); throw error;
    }
  }
  async recover(requestId: string, resolutionPath: string, allowResend = false): Promise<V1Record> {
    const state = this.#states.get(v1Id(requestId));
    if (!state) throw new Error("No recovery record exists; do not invent a replacement identity");
    if (state.incarnation !== this.incarnation) throw new V1Problem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    const resolution = v1Record((await this.read(resolutionPath)).result);
    if (resolution.state === "committed" || resolution.state === "accepted") {
      state.resolutionState = resolution.state; state.lastAttemptClassification = "authorityReceipt"; this.#persist();
    } else if (allowResend && resolution.state === "notObservedYet") {
      if (await fingerprint({ method: state.method, path: state.path, payload: state.payload }) !== state.payloadFingerprint) throw new Error("Recovery payload fingerprint changed");
      if (state.method !== "POST" && state.method !== "PATCH") throw new TypeError("Invalid mutation recovery method");
      await this.mutate(state.method, state.path, state.payload, state.requestId);
    }
    return resolution;
  }
  async #request(method: string, path: string, body: V1Record | undefined, requestId: string): Promise<V1Envelope<unknown>> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("#")) throw new TypeError("Expected a closed API path");
    const headers: Record<string, string> = { accept: "application/json", "idempotency-key": requestId };
    if (this.#credential !== undefined) headers.authorization = "Bearer " + this.#credential;
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.incarnation !== "management") headers["convohop-incarnation"] = this.incarnation;
    if (this.servingEpoch !== undefined) headers["convohop-serving-epoch"] = this.servingEpoch;
    let response: Response;
    try {
      response = await this.#fetch(this.baseUrl + path, { method, headers, redirect: "error", cache: "no-store", credentials: "omit",
        signal: AbortSignal.timeout(12000), ...(body === undefined ? {} : { body: canonical(body) }) });
    } catch { throw new V1Problem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Authority response unavailable; resolve the original request"); }
    const text = await response.text();
    if (text.length > 1_048_576) throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", response.status, "Authority response exceeds the bound");
    let decoded: unknown;
    try { decoded = JSON.parse(text); } catch { throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", response.status, "Unrecognized authority response"); }
    const value = v1Record(decoded);
    if (!response.ok) {
      throw new V1Problem(typeof value.code === "string" ? value.code : "HTTP_FAILURE", requestId,
        typeof value.outcome === "string" ? value.outcome : "unknown", response.status,
        typeof value.message === "string" ? value.message : "Authority rejected the request");
    }
    if (!["ok", "committed", "accepted"].includes(v1String(value.status))) throw new TypeError("Unrecognized authority envelope");
    return { status: value.status as V1Envelope<unknown>["status"], requestId: v1Id(value.requestId), result: value.result,
      ...(value.replayed === undefined ? {} : { replayed: boolean(value.replayed) }),
      ...(value.operation === undefined ? {} : { operation: v1Record(value.operation) }),
      ...(value.resourceRef === undefined ? {} : { resourceRef: v1Record(value.resourceRef) }) };
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
  constructor(options: V1ClientOptions) {
    this.projectId = v1Id(options.projectId); this.principalId = v1Id(options.principalId); this.#token = options.sessionToken; this.storage = options.recoveryStorage;
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.sessionToken,
      namespace: options.projectId + ":" + options.principalId, incarnation: v1Id(options.incarnation),
      ...(options.recoveryStorage ? { recoveryStorage: options.recoveryStorage } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
  }
  get path(): string { return "/v1/projects/" + this.projectId; }
  async initialize(): Promise<V1Route> {
    const value = route((await this.http.read(this.path + "/route")).result);
    if (value.projectId !== this.projectId || value.incarnation !== this.http.incarnation) throw new V1Problem("INCARNATION_MISMATCH", crypto.randomUUID(), "rejected", 409, "Explicit session/route recovery required");
    const socket = new URL(value.wssUrl), base = new URL(this.http.baseUrl);
    if (origin(value.communicationBase) !== this.http.baseUrl || socket.host !== base.host ||
        socket.protocol !== (base.protocol === "https:" ? "wss:" : "ws:") ||
        socket.pathname !== "/v1/realtime" || socket.username || socket.password || socket.search || socket.hash)
      throw new TypeError("Route cannot redirect this client's credentials to another origin or an unsafe socket");
    this.http.servingEpoch = value.servingEpoch; this.#route = value; return value;
  }
  async conversation(id: string): Promise<V1Conversation> { return v1Conversation((await this.http.read(`${this.path}/conversations/${v1Id(id)}`)).result); }
  async messages(id: string, beforeSequence?: string): Promise<V1Page<V1Message>> {
    const before = beforeSequence === undefined ? "" : "&beforeSequence=" + v1Counter(beforeSequence);
    return v1Page((await this.http.read(`${this.path}/conversations/${v1Id(id)}/messages?limit=100${before}`)).result, v1Message);
  }
  async send(id: string, text: string, requestId?: string): Promise<V1SendReceipt> {
    const result = v1Record((await this.http.mutate("POST", `${this.path}/conversations/${v1Id(id)}/messages`, { text, props: {} }, requestId)).result);
    const cursor = v1Cursor(result.cursor);
    if (result.status !== "sent" || cursor.conversationId !== id || cursor.incarnation !== this.http.incarnation) throw new TypeError("Invalid send receipt scope");
    return { messageId: v1Id(result.messageId), conversationId: v1Id(result.conversationId), sequence: v1Counter(result.sequence),
      revision: v1Counter(result.revision), status: "sent", cursor };
  }
  async edit(message: V1Message, text: string, requestId?: string): Promise<V1Message> {
    return v1Message((await this.http.mutate("PATCH", `${this.path}/conversations/${message.conversationId}/messages/${message.messageId}`, { text, expectedRevision: message.revision }, requestId)).result);
  }
  async delete(message: V1Message, requestId?: string): Promise<V1Message> {
    return v1Message((await this.http.mutate("POST", `${this.path}/conversations/${message.conversationId}/messages/${message.messageId}/delete`, { expectedRevision: message.revision }, requestId)).result);
  }
  async events(id: string, after?: V1Cursor): Promise<V1Page<V1Record> & { nextCursor: V1Cursor }> {
    const query = after === undefined ? "" : "&after=" + btoa(JSON.stringify(after)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const result = v1Page((await this.http.read(`${this.path}/conversations/${v1Id(id)}/events?limit=100${query}`)).result, v1Record);
    const cursor = v1Cursor(result.nextCursor);
    if (cursor.conversationId !== id || cursor.incarnation !== this.http.incarnation ||
        (after && BigInt(cursor.sequence) < BigInt(after.sequence))) throw new TypeError("Invalid authoritative replay frontier");
    for (const event of result.items) {
      if (v1Id(event.conversationId) !== id || BigInt(v1Counter(event.sequence)) > BigInt(cursor.sequence)) throw new TypeError("Invalid event scope");
      v1Id(event.eventId);
    }
    return { ...result, nextCursor: cursor };
  }
  async reportRead(id: string, membership: V1Membership, throughSequence: string): Promise<V1Record> {
    return v1Record((await this.http.mutate("POST", `${this.path}/conversations/${v1Id(id)}/receipts`,
      { kind: "read", membershipEpoch: membership.membershipEpoch, visibilityEpoch: membership.visibilityEpoch, throughSequence: v1Counter(throughSequence) })).result);
  }
  async receipts(id: string): Promise<V1Page<V1Record>> { return v1Page((await this.http.read(`${this.path}/conversations/${v1Id(id)}/receipts?limit=100`)).result, v1Record); }
  async search(query: string, conversationIds?: string[]): Promise<V1Page<V1SearchHit>> {
    return v1Page((await this.http.read(this.path + "/search", { query, pageSize: 100, ...(conversationIds ? { conversationIds } : {}) })).result, v1SearchHit);
  }
  async invitations(): Promise<V1Page<V1Call>> { return v1Page((await this.http.read(this.path + "/callInvitations?limit=100")).result, v1Call); }
  async call(id: string): Promise<V1Call> { return v1Call((await this.http.read(`${this.path}/calls/${v1Id(id)}`)).result); }
  async startCall(id: string, invitedPrincipalIds: string[], video: boolean): Promise<string> {
    const result = await this.http.mutate("POST", `${this.path}/conversations/${v1Id(id)}/calls`, { invitedPrincipalIds, media: { audio: true, video } });
    return v1Id(v1Record(result.result).callId);
  }
  async accept(call: V1Call): Promise<V1Call> {
    if (!call.invitation) throw new TypeError("Current invitation is required");
    return v1Call((await this.http.mutate("POST", `${this.path}/calls/${call.callId}/accept`, { generation: call.generation, invitationId: call.invitation.invitationId })).result);
  }
  async decline(call: V1Call): Promise<V1Call> {
    if (!call.invitation) throw new TypeError("Current invitation is required");
    return v1Call((await this.http.mutate("POST", `${this.path}/calls/${call.callId}/decline`, { generation: call.generation, invitationId: call.invitation.invitationId })).result);
  }
  async mediaCredentials(call: V1Call, replacementOfConnectionId?: string): Promise<V1MediaGrant> {
    return v1MediaGrant((await this.http.mutate("POST", `${this.path}/calls/${call.callId}/mediaCredentials`,
      { generation: call.generation, mode: replacementOfConnectionId ? "reconnect" : "initial", ...(replacementOfConnectionId ? { replacementOfConnectionId } : {}) })).result);
  }
  async leave(call: V1Call): Promise<void> { await this.http.mutate("POST", `${this.path}/calls/${call.callId}/leave`, { generation: call.generation }); }
  async end(call: V1Call): Promise<void> { await this.http.mutate("POST", `${this.path}/calls/${call.callId}/end`, { generation: call.generation, expectedRevision: call.revision }); }
  async resolve(requestId: string, allowResend = false): Promise<V1Record> { return this.http.recover(requestId, `${this.path}/requests/${v1Id(requestId)}`, allowResend); }
  async recoverPending(onError: (error: Error) => void): Promise<void> {
    for (const state of this.http.recoveryStates.filter(state => state.resolutionState === "pending" || state.resolutionState === "unknown").slice(0, 16)) {
      const transient = ["submitted", "TRANSPORT_UNKNOWN", "OUTCOME_UNKNOWN", "AUTHORITY_UNAVAILABLE", "RETRY_EXHAUSTED", "ADMISSION_LIMIT", "HTTP_FAILURE", "INVALID_RESPONSE"].includes(state.lastAttemptClassification);
      const now = Date.now();
      const resend = transient && state.attemptCount < 3 && now >= state.lastAttemptAt && now >= state.firstSubmittedAt && now <= state.retryDeadline;
      try { await this.resolve(state.requestId, resend); }
      catch (error) { onError(error instanceof Error ? error : new Error("Mutation recovery failed")); }
    }
  }
  async watch(conversationId: string, apply: (events: V1Record[]) => Promise<void>, onError: (error: Error) => void): Promise<V1Realtime> {
    const route = this.#route ?? await this.initialize();
    const realtime = new V1Realtime(this, v1Id(conversationId), route, this.#token, apply, onError);
    await realtime.start(); return realtime;
  }
}
export class V1Realtime {
  #socket: WebSocket | undefined; #closed = false; #working: Promise<void> | undefined;
  #cursor: V1Cursor | undefined; #timer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempts = 0;
  #currentRoute: V1Route;
  readonly #storageKey: string;
  readonly #token: string;
  constructor(readonly client: V1Client, readonly conversationId: string, readonly route: V1Route, token: string,
    readonly apply: (events: V1Record[]) => Promise<void>, readonly onError: (error: Error) => void) {
    this.#token = token;
    this.#currentRoute = route;
    this.#storageKey = `convohop.v1.cursor:${client.projectId}:${client.principalId}:${conversationId}`;
    const saved = client.storage?.getItem(this.#storageKey);
    if (saved) this.#cursor = v1Cursor(JSON.parse(saved));
  }
  get cursor(): V1Cursor | undefined { return this.#cursor; }
  async start(): Promise<void> {
    await this.client.recoverPending(this.onError);
    await this.reconcile();
    if (!this.#closed) this.#connect();
  }
  #connect(): void {
    if (this.#closed) return;
    const ws = new WebSocket(this.#currentRoute.wssUrl, "convohop.realtime.v1"); this.#socket = ws;
    ws.onopen = () => {
      if (this.#closed || this.#socket !== ws) { ws.close(1000); return; }
      ws.send(JSON.stringify({ type: "authenticate", protocolVersion: "1", requestId: crypto.randomUUID(),
        projectId: this.client.projectId, incarnation: this.#currentRoute.incarnation, sessionToken: this.#token }));
    };
    ws.onmessage = event => {
      if (this.#closed || this.#socket !== ws) return;
      try {
        const frame = v1Record(JSON.parse(v1String(event.data)));
        if (frame.type === "authenticated") {
          this.#reconnectAttempts = 0;
          ws.send(JSON.stringify({ type: "subscribe", requestId: crypto.randomUUID(),
            subscriptions: [{ conversationId: this.conversationId, ...(this.#cursor ? { cursor: this.#cursor } : {}) }] }));
        }
        else if (frame.type === "invalidated") this.reconcile().catch(error => this.#fail(error));
        else if (frame.type === "error") { const p = v1Record(frame.problem); this.#fail(new V1Problem(v1String(p.code), v1Id(p.requestId), v1String(p.outcome), Number(p.status), v1String(p.message))); }
      } catch (error) { this.#fail(error); }
    };
    ws.onerror = () => this.onError(new Error("Realtime connection unavailable; current history remains authoritative"));
    ws.onclose = event => {
      if (this.#socket !== ws) return;
      this.#socket = undefined;
      if (!this.#closed && event.code !== 1008) this.#retry();
      else if (!this.#closed) this.#fail(new Error("Realtime authorization ended; obtain a current session"));
    };
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
    if (!this.#closed && error instanceof V1Problem && ([0, 429, 503].includes(error.status) || error.code === "WRONG_REGION")) {
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
    const work = async () => {
      for (let page = 0; page < 10 && !this.#closed; page++) {
        const result = await this.client.events(this.conversationId, this.#cursor);
        if (result.refreshRequired) throw new Error("Explicit authorized history resynchronization required");
        await this.apply(result.items);
        this.#cursor = result.nextCursor;
        this.client.storage?.setItem(this.#storageKey, JSON.stringify(this.#cursor));
        if (result.complete) return;
      }
      throw new Error("Replay work limit reached; explicitly reconcile again");
    };
    this.#working = work();
    try { await this.#working; } finally { this.#working = undefined; }
  }
  close(): void { this.#closed = true; if (this.#timer) clearTimeout(this.#timer); this.#socket?.close(1000); }
}
