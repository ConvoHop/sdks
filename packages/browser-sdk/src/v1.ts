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
export type V1Session = OperationPayload<"communication.currentSession">["result"];
type SessionResult = NonNullable<OperationPayload<"communication.issueSession">["result"]>;
export type V1SessionBootstrap = SessionResult & { session: NonNullable<SessionResult["session"]> };
export type V1SessionRefresh = (current: Readonly<V1Session>) => Promise<V1SessionBootstrap>;
export type V1SessionRefreshState = "disabled" | "uninitialized" | "ready" | "refreshing" | "blocked";
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
export interface V1AsyncRecoveryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export class V1Problem extends Error {
  constructor(readonly code: string, readonly requestId: string, readonly outcome: string,
    readonly status: number, message: string, options?: ErrorOptions) { super(message, options); this.name = "V1Problem"; }
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
function sessionMetadata(value: unknown): V1Session {
  validateOutput(value, "Session!");
  const v = v1Record(value), expiresAt = timestamp(v.expiresAt), revision = v1Counter(v.sessionRevision);
  if (new Date(expiresAt).toISOString() !== expiresAt || revision === "0")
    throw new TypeError("Invalid session expiry or revision");
  return { sessionId: v1Id(v.sessionId), principalId: v1Id(v.principalId), deviceId: v1Id(v.deviceId),
    incarnation: v1Id(v.incarnation), sessionRevision: revision, expiresAt, status: v1String(v.status) };
}
function sessionExpiry(value: V1Session): number {
  // The authority also enforces its signed JWT's integer-second expiry without leeway.
  return Math.floor(Date.parse(value.expiresAt) / 1000) * 1000;
}
function currentSession(proof: OperationPayload<"communication.currentSession">): V1Session {
  const value = sessionMetadata(proof.result);
  if (proof.status !== "ok" || value.status !== "active" ||
      sessionExpiry(value) <= Date.now() || sessionExpiry(value) <= Date.parse(timestamp(proof.serverTime)))
    throw new TypeError("Expected current live session authority evidence");
  return value;
}
function sameSession(left: V1Session, right: V1Session): boolean {
  return left.sessionId === right.sessionId && left.principalId === right.principalId &&
    left.deviceId === right.deviceId && left.incarnation === right.incarnation;
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
  recoveryStorage?: V1RecoveryStorage; asyncRecoveryStorage?: V1AsyncRecoveryStorage; fetch?: typeof fetch;
}
type SessionProbe = "communication.route" | "communication.currentSession";
interface TransportAuthentication {
  credential: string | undefined; barrier: Promise<void> | undefined; blocked: boolean;
  active: Set<Promise<unknown>>;
  probe: <K extends SessionProbe>(key: K, projectId: string, credential: string,
    observedServingEpoch?: string) => Promise<OperationPayload<K>>;
}
const transportAuthentication = new WeakMap<V1Transport, TransportAuthentication>();
export class V1Transport {
  readonly baseUrl: string;
  readonly durableRecovery: boolean;
  readonly #authentication: TransportAuthentication;
  readonly #fetch: typeof fetch;
  readonly #storage: V1RecoveryStorage | undefined;
  readonly #asyncStorage: V1AsyncRecoveryStorage | undefined;
  readonly #storageKey: string;
  readonly #states = new Map<string, V1RecoveryState>();
  readonly #active = new Map<string, { identity: string; work: Promise<V1Record> }>();
  #recoveryInitialized = false;
  #initialization: Promise<void> | undefined;
  #writes: Promise<void> | undefined;
  incarnation: string;
  servingEpoch: string | undefined;
  constructor(options: V1TransportOptions) {
    if (options.recoveryStorage !== undefined && options.asyncRecoveryStorage !== undefined)
      throw new TypeError("Choose recoveryStorage or asyncRecoveryStorage, not both");
    this.baseUrl = origin(options.baseUrl);
    this.#authentication = { credential: options.credential, barrier: undefined, blocked: false, active: new Set(),
      probe: (key, projectId, credential, observedServingEpoch) =>
        this.#execute(key, projectId, {}, crypto.randomUUID(), undefined, this.incarnation, credential, observedServingEpoch) };
    transportAuthentication.set(this, this.#authentication);
    this.incarnation = options.incarnation ?? "management";
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#storage = options.recoveryStorage; this.#asyncStorage = options.asyncRecoveryStorage;
    this.durableRecovery = this.#storage !== undefined || this.#asyncStorage !== undefined;
    this.#storageKey = "convohop.requests:" + options.namespace;
    if (this.#asyncStorage === undefined) {
      this.#restore(this.#storage?.getItem(this.#storageKey));
      this.#recoveryInitialized = true;
    }
  }
  initializeRecovery(): Promise<void> {
    const storage = this.#asyncStorage;
    if (storage === undefined) return Promise.resolve();
    this.#initialization ??= Promise.resolve().then(() => storage.getItem(this.#storageKey)).then(saved => {
      if (saved !== null && (typeof saved !== "string" || saved.length === 0))
        throw new TypeError("Invalid asynchronous mutation recovery storage");
      this.#restore(saved);
      this.#recoveryInitialized = true;
    });
    return this.#initialization;
  }
  #restore(saved: string | null | undefined): void {
    if (saved) {
      const values: unknown = JSON.parse(saved);
      if (!Array.isArray(values) || values.length > 128) throw new TypeError("Invalid mutation recovery storage");
      const restored = new Map<string, V1RecoveryState>();
      for (const item of values) {
        const v = v1Record(item);
        const operation = operationKey(v.operation), resolutionState = v.resolutionState;
        if (v1Operations[operation].kind !== "mutation" ||
            (resolutionState !== "pending" && resolutionState !== "unknown" &&
             resolutionState !== "committed" && resolutionState !== "accepted")) throw new TypeError("Invalid recovery record");
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
          resolutionState,
          ...(v.mediaAdmissionAttempted === true ? { mediaAdmissionAttempted: true } : {}),
        };
        if (restored.has(state.requestId)) throw new TypeError("Duplicate mutation recovery identity");
        restored.set(state.requestId, state);
      }
      for (const [requestId, state] of restored) this.#states.set(requestId, state);
    }
  }
  get recoveryStates(): readonly V1RecoveryState[] {
    if (!this.#recoveryInitialized) throw new Error("Await initializeRecovery() before inspecting asynchronous recovery state");
    return [...this.#states.values()].map(state => structuredClone(state));
  }
  /** @internal Persist the native attempt boundary without retaining a bearer grant. */
  markMediaAdmissionAttempted(requestId: string): void | Promise<void> {
    v1Id(requestId);
    if (!this.#recoveryInitialized)
      return this.initializeRecovery().then(() => this.markMediaAdmissionAttempted(requestId));
    const state = this.#states.get(requestId);
    if (!state || state.operation !== "communication.liveSessionCredentials" || state.resolutionState !== "committed")
      throw new Error("Native admission requires a committed credential issuance");
    state.lastAttemptClassification = "nativeAdmissionAttempted";
    state.mediaAdmissionAttempted = true;
    return this.#persist(state);
  }
  #persist(state: V1RecoveryState): void | Promise<void> {
    const storage = this.#asyncStorage;
    if (storage !== undefined) {
      const snapshot = JSON.stringify([...this.#states.values()]);
      const write = async () => {
        try { await storage.setItem(this.#storageKey, snapshot); }
        catch (cause) {
          throw new V1Problem("RECOVERY_STORAGE_FAILURE", state.requestId,
            state.resolutionState === "pending" ? "unknown" : state.resolutionState, 0,
            "Recovery storage did not confirm durability; retain the original request and its outcome", { cause });
        }
      };
      // A failed snapshot rejects its caller; a later complete snapshot may repair it.
      this.#writes = this.#writes ? this.#writes.then(write, write) : write();
      return this.#writes;
    }
    this.#storage?.setItem(this.#storageKey, JSON.stringify([...this.#states.values()]));
  }
  async execute<K extends V1OperationKey>(key: K, projectId: string | undefined, input: OperationInput<K>,
    requestId: string = crypto.randomUUID(), credentialDeliveryPermit?: V1Record): Promise<OperationPayload<K>> {
    const incarnation = this.incarnation;
    const body = structuredClone(Object.fromEntries(Object.entries(v1Record(input)).filter(([, value]) => value !== undefined)));
    const permit = credentialDeliveryPermit === undefined ? undefined : structuredClone(credentialDeliveryPermit);
    this.#plan(key, projectId, body, requestId, permit);
    return this.#authorized(requestId, credential =>
      this.#execute(key, projectId, body, requestId, permit, incarnation, credential));
  }
  #authorized<T>(requestId: string, work: (credential: string | undefined) => Promise<T>): Promise<T> {
    const authentication = this.#authentication;
    if (authentication.blocked) {
      const state = this.#states.get(requestId);
      return Promise.reject(new V1Problem("SESSION_REFRESH_REQUIRED", requestId,
        state ? state.resolutionState === "pending" ? "unknown" : state.resolutionState : "rejected", 409,
        "Session authority is unverified; recover the original renewal or explicitly retire this client"));
    }
    if (authentication.barrier) return authentication.barrier.then(() => this.#authorized(requestId, work));
    const pending = work(authentication.credential);
    authentication.active.add(pending);
    return pending.finally(() => authentication.active.delete(pending));
  }
  async #execute<K extends V1OperationKey>(key: K, projectId: string | undefined, body: V1Record,
    requestId: string, credentialDeliveryPermit: V1Record | undefined, incarnation: string,
    credential: string | undefined, observedServingEpoch: string | undefined = this.servingEpoch): Promise<OperationPayload<K>> {
    const operation = v1Operations[operationKey(key)];
    this.#plan(key, projectId, body, requestId, credentialDeliveryPermit);
    await this.initializeRecovery();
    if (this.incarnation !== incarnation)
      throw new V1Problem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    const result = operationPayload(key, operation.kind === "mutation"
      ? await this.#mutate(key, projectId, body, requestId, credential, credentialDeliveryPermit)
      : await this.#request(key, projectId, body, requestId, credential, credentialDeliveryPermit, observedServingEpoch));
    if (key === "communication.resolveRequest" || key === "management.resolveRequest") {
      const state = this.#states.get(v1String(body.requestId)), resolution = v1Record(v1Record(result).result);
      if (resolution.requestId !== body.requestId ||
          (resolution.receipt != null && v1Record(resolution.receipt).requestId !== body.requestId))
        throw new V1Problem("INVALID_RESPONSE", requestId, "unknown", 503, "Request resolution identity changed");
      if (state && (state.projectId !== projectId || state.incarnation !== this.incarnation))
        throw new V1Problem("RESOLUTION_REQUIRED", requestId, "unknown", 409, "Resolve within the original project and incarnation");
      if (state && (resolution.state === "committed" || resolution.state === "accepted")) {
        if (state.resolutionState !== "committed") state.resolutionState = resolution.state;
        state.lastAttemptClassification = "authorityReceipt"; await this.#persist(state);
      }
    }
    return result;
  }
  async #mutate(operation: V1OperationKey, projectId: string | undefined, input: V1Record,
    requestId: string, credential: string | undefined, credentialDeliveryPermit?: V1Record, retry = false): Promise<V1Record> {
    v1Id(requestId);
    const incarnation = this.incarnation, identity = canonical({ operation, projectId: projectId ?? null, input, incarnation });
    const active = this.#active.get(requestId);
    if (active) {
      if (active.identity !== identity)
        throw new V1Problem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload");
      return active.work;
    }
    const work = (async () => {
      const hash = await fingerprint({ operation, projectId: projectId ?? null, input });
      if (this.incarnation !== incarnation)
        throw new V1Problem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
      let state = this.#states.get(requestId);
      if (state && (state.payloadFingerprint !== hash || state.incarnation !== incarnation ||
          state.operation !== operation || state.projectId !== projectId || canonical(state.input) !== canonical(input)))
        throw new V1Problem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload");
      if (retry && (!state || ["committed", "accepted"].includes(state.resolutionState) || state.mediaAdmissionAttempted))
        throw new V1Problem("RESOLUTION_REQUIRED", requestId, "unknown", 409, "The original request is no longer eligible for resend");
      if (!state) {
        if (this.#states.size >= 128) {
          const settled = [...this.#states.values()].find(value =>
            ["committed", "accepted"].includes(value.resolutionState) && !this.#active.has(value.requestId));
          if (!settled) throw new Error("Resolve outstanding mutations before creating more");
          this.#states.delete(settled.requestId);
        }
        const now = Date.now();
        state = { requestId, incarnation, payloadFingerprint: hash, operation,
          ...(projectId === undefined ? {} : { projectId }), input: structuredClone(input),
          firstSubmittedAt: now, retryDeadline: now + 60000,
          attemptCount: 0, lastAttemptAt: now, lastAttemptClassification: "notSubmitted", resolutionState: "pending" };
        this.#states.set(requestId, state);
        await this.#persist(state);
      }
      return this.#submit(state, credential, credentialDeliveryPermit, retry);
    })();
    this.#active.set(requestId, { identity, work });
    try { return await work; } finally { this.#active.delete(requestId); }
  }
  async #submit(state: V1RecoveryState, credential: string | undefined,
    credentialDeliveryPermit?: V1Record, retry = false): Promise<V1Record> {
    if (state.incarnation !== this.incarnation)
      throw new V1Problem("INCARNATION_MISMATCH", state.requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    const now = Date.now();
    if (state.attemptCount >= 3 || now > state.retryDeadline || now < state.firstSubmittedAt || now < state.lastAttemptAt)
      throw new V1Problem("RESOLUTION_REQUIRED", state.requestId, "unknown", 409, "Retry budget expired or clock changed; resolve this request read-only");
    state.attemptCount += 1; state.lastAttemptAt = now;
    if (state.resolutionState === "pending") state.resolutionState = "unknown";
    state.lastAttemptClassification = "submitted"; await this.#persist(state);
    if (state.incarnation !== this.incarnation)
      throw new V1Problem("INCARNATION_MISMATCH", state.requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    const submittingAt = Date.now();
    if (submittingAt > state.retryDeadline || submittingAt < state.firstSubmittedAt || submittingAt < state.lastAttemptAt ||
        (retry && (["committed", "accepted"].includes(state.resolutionState) || state.mediaAdmissionAttempted)))
      throw new V1Problem("RESOLUTION_REQUIRED", state.requestId, "unknown", 409, "The original request is no longer eligible for resend");
    let result: V1Record, outcome: "committed" | "accepted";
    try {
      result = await this.#request(state.operation, state.projectId, state.input, state.requestId, credential, credentialDeliveryPermit);
      if (result.status !== "committed" && result.status !== "accepted") throw new TypeError("A mutation requires authority receipt evidence");
      outcome = result.status;
    } catch (error) {
      state.lastAttemptClassification = error instanceof V1Problem ? error.code : "opaqueTransportFailure";
      await this.#persist(state); throw error;
    }
    if (state.resolutionState !== "committed") state.resolutionState = outcome;
    state.lastAttemptClassification = "authorityReceipt"; await this.#persist(state); return result;
  }
  async retry(requestId: string): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>> {
    v1Id(requestId);
    return this.#authorized(requestId, credential => this.#retry(requestId, credential));
  }
  async #retry(requestId: string, credential: string | undefined): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>> {
    await this.initializeRecovery();
    const state = this.#states.get(requestId);
    if (!state) throw new Error("No recovery record exists; do not invent a replacement identity");
    if (state.incarnation !== this.incarnation) throw new V1Problem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    if (state.operation === "communication.redeemCredential" || state.operation === "communication.acknowledgeCredential")
      throw new V1Problem("CREDENTIAL_REQUIRED", requestId, "unknown", 409,
        "Delivery permits cannot authorize request lookup; obtain a current permit and submit the same delivery identity explicitly");
    const key = v1Operations[state.operation].plane === "management" ? "management.resolveRequest" : "communication.resolveRequest";
    const resolution = (await this.#execute(key, state.projectId, { requestId }, crypto.randomUUID(),
      undefined, this.incarnation, credential)).result;
    if (!resolution) throw new TypeError("Missing current request resolution");
    if (resolution.state === "committed" || resolution.state === "accepted") return resolution;
    if (resolution.state !== "notObservedYet") throw new TypeError("Unknown request resolution state");
    if (["committed", "accepted"].includes(state.resolutionState) || state.mediaAdmissionAttempted) {
      throw new V1Problem("RESOLUTION_REQUIRED", requestId, "unknown", 409,
        "Previously observed commit or native admission cannot be retried from absent evidence");
    }
    if (await fingerprint({ operation: state.operation, projectId: state.projectId ?? null, input: state.input }) !== state.payloadFingerprint)
      throw new Error("Recovery input fingerprint changed");
    await this.#mutate(state.operation, state.projectId, state.input, state.requestId, credential, undefined, true);
    const current = (await this.#execute(key, state.projectId, { requestId }, crypto.randomUUID(),
      undefined, this.incarnation, credential)).result;
    if (!current) throw new TypeError("Missing current request resolution");
    return current;
  }
  #plan(key: V1OperationKey, projectId: string | undefined, input: V1Record,
    requestId: string, credentialDeliveryPermit?: V1Record,
    observedServingEpoch: string | undefined = this.servingEpoch): ReturnType<typeof v1GraphqlRequest> {
    try {
      return v1GraphqlRequest(key, input, { requestId: v1Id(requestId),
        ...(projectId === undefined ? {} : { projectId: v1Id(projectId) }),
        ...(credentialDeliveryPermit === undefined ? {} : { credentialDeliveryPermit }),
        ...(this.incarnation === "management" ? {} : { incarnation: this.incarnation }),
        ...(observedServingEpoch === undefined ? {} : { observedServingEpoch }) });
    } catch (error) {
      throw new V1Problem("INVALID_REQUEST", requestId, "rejected", 400,
        error instanceof Error ? error.message : "Invalid SDK operation");
    }
  }
  async #request(key: V1OperationKey, projectId: string | undefined, input: V1Record,
    requestId: string, credential: string | undefined, credentialDeliveryPermit?: V1Record,
    observedServingEpoch: string | undefined = this.servingEpoch): Promise<V1Record> {
    const plan = this.#plan(key, projectId, input, requestId, credentialDeliveryPermit, observedServingEpoch);
    const headers: Record<string, string> = { accept: "application/json", "content-type": "application/json" };
    if (credential !== undefined) headers.authorization = "Bearer " + credential;
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
  recoveryStorage?: V1RecoveryStorage; fetch?: typeof fetch; sessionRefresh?: V1SessionRefresh;
}
interface ReplayRefresh {
  suspend: () => Promise<void>;
  resume: (route: V1Route, token: string) => Promise<void>;
}
const replayRefresh = new WeakMap<V1Realtime, ReplayRefresh>();
export class V1Client {
  readonly projectId: string; readonly principalId: string; readonly http: V1Transport;
  #token: string; readonly storage: V1RecoveryStorage | undefined;
  readonly #authentication: TransportAuthentication;
  readonly #sessionRefresh: V1SessionRefresh | undefined;
  #session: V1Session | undefined;
  #sessionInitialization: Promise<void> | undefined;
  #refreshing: Promise<V1Session> | undefined;
  #quiescing: { replays: Map<V1Realtime, ReplayRefresh>; work: Promise<void>[] } | undefined;
  #route: V1Route | undefined;
  readonly #streams = new Set<V1Realtime>();
  readonly #replayGenerations = new Map<string, number>();
  constructor(options: V1ClientOptions) {
    if (options.sessionRefresh !== undefined && typeof options.sessionRefresh !== "function")
      throw new TypeError("sessionRefresh must be an asynchronous backend renewal hook");
    this.projectId = v1Id(options.projectId); this.principalId = v1Id(options.principalId); this.#token = options.sessionToken; this.storage = options.recoveryStorage;
    this.#sessionRefresh = options.sessionRefresh;
    this.http = new V1Transport({ baseUrl: options.baseUrl, credential: options.sessionToken,
      namespace: options.projectId + ":" + options.principalId, incarnation: v1Id(options.incarnation),
      ...(options.recoveryStorage ? { recoveryStorage: options.recoveryStorage } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}) });
    const authentication = transportAuthentication.get(this.http);
    if (!authentication) throw new Error("Missing transport authentication state");
    this.#authentication = authentication;
  }
  get sessionBinding(): Readonly<V1Session> | undefined {
    return this.#session === undefined ? undefined : structuredClone(this.#session);
  }
  get sessionRefreshState(): V1SessionRefreshState {
    if (!this.#sessionRefresh) return "disabled";
    if (this.#refreshing) return "refreshing";
    if (this.#authentication.blocked) return "blocked";
    return this.#session && this.#route ? "ready" : "uninitialized";
  }
  #validateRoute(input: unknown): V1Route {
    const value = route(input);
    if (value.projectId !== this.projectId || value.incarnation !== this.http.incarnation) throw new V1Problem("INCARNATION_MISMATCH", crypto.randomUUID(), "rejected", 409, "Explicit session/route recovery required");
    const socket = new URL(value.wssUrl), base = new URL(this.http.baseUrl);
    if (origin(value.communicationBase) !== this.http.baseUrl || socket.host !== base.host ||
        socket.protocol !== (base.protocol === "https:" ? "wss:" : "ws:") ||
        socket.pathname !== "/graphql" || socket.username || socket.password || socket.search || socket.hash)
      throw new TypeError("Route cannot redirect this client's credentials to another origin or an unsafe socket");
    return value;
  }
  async initialize(): Promise<V1Route> {
    const value = this.#validateRoute((await this.http.execute("communication.route", this.projectId, {})).result);
    this.http.servingEpoch = value.servingEpoch;
    if (this.#sessionRefresh) {
      this.#sessionInitialization ??= this.http.execute("communication.currentSession", this.projectId, {}).then(proof => {
        const binding = currentSession(proof);
        if (binding.principalId !== this.principalId || binding.incarnation !== this.http.incarnation)
          throw new V1Problem("SESSION_REFRESH_REJECTED", proof.requestId, "rejected", 409,
            "Original session authority does not match this client's principal and incarnation");
        this.#session = binding;
      });
      await this.#sessionInitialization;
    }
    this.http.servingEpoch = value.servingEpoch; this.#route = value; return value;
  }
  refreshSession(): Promise<V1Session> {
    if (this.#refreshing) return this.#refreshing;
    const hook = this.#sessionRefresh, binding = this.#session, currentRoute = this.#route;
    if (!hook || !binding || !currentRoute || sessionExpiry(binding) <= Date.now() ||
        binding.incarnation !== this.http.incarnation)
      return Promise.reject(new V1Problem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
        "Configure sessionRefresh and initialize with the original valid bearer before renewal or expiry"));
    const pending = this.#refreshSession(hook, structuredClone(binding), currentRoute).finally(() => {
      if (this.#refreshing === pending) this.#refreshing = undefined;
    });
    this.#refreshing = pending;
    return pending;
  }
  #suspendReplay(stream: V1Realtime): void {
    const quiescing = this.#quiescing, controls = replayRefresh.get(stream);
    if (!quiescing || !controls) throw new Error("Missing replay refresh state");
    if (!quiescing.replays.has(stream)) {
      quiescing.replays.set(stream, controls);
      quiescing.work.push(controls.suspend());
    }
  }
  async #refreshSession(hook: V1SessionRefresh, binding: V1Session, oldRoute: V1Route): Promise<V1Session> {
    const authentication = this.#authentication, oldToken = this.#token;
    const quiescing: { replays: Map<V1Realtime, ReplayRefresh>; work: Promise<void>[] } = { replays: new Map(), work: [] };
    this.#quiescing = quiescing;
    let release: (() => void) | undefined, replacement: V1Session | undefined;
    let invalidated = false, failure: V1Problem | undefined, replayRoute = oldRoute;
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
      if (sessionExpiry(binding) <= Date.now()) throw new V1Problem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(),
        "rejected", 409, "Original bearer expired while work drained; explicitly retire and bootstrap a new client");
      let supplied: V1SessionBootstrap;
      try { supplied = await hook(structuredClone(binding)); }
      catch { throw new V1Problem("SESSION_REFRESH_FAILED", crypto.randomUUID(), "unknown", 0,
        "Session renewal hook failed; retain the original renewal request and verify its outcome"); }
      validateOutput(supplied, "SessionBootstrap!");
      const candidate = { session: sessionMetadata(supplied.session),
        sessionToken: v1String(supplied.sessionToken), tokenExpiresAt: timestamp(supplied.tokenExpiresAt) };
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
        throw new V1Problem("SESSION_REFRESH_REJECTED", proof.requestId, "unknown", 409,
          "Replacement must preserve the original session, advance its live revision and expiry, and match authority metadata");
      this.#token = candidate.sessionToken; authentication.credential = candidate.sessionToken;
      this.#session = verified; replacement = verified; this.#route = nextRoute;
      replayRoute = nextRoute;
      this.http.servingEpoch = nextRoute.servingEpoch;
      authentication.blocked = false;
    } catch (error) {
      failure = error instanceof V1Problem ? error : new V1Problem("SESSION_REFRESH_REJECTED", crypto.randomUUID(),
        "unknown", 409, "Session replacement or application retirement could not be verified");
      await drain();
      authentication.blocked = true;
      if (!invalidated) {
        try {
          const old = currentSession(await authentication.probe("communication.currentSession", this.projectId, oldToken));
          if (canonical(old) !== canonical(binding)) throw new TypeError("Original session authority changed");
          authentication.blocked = false;
        } catch {
          failure = new V1Problem("SESSION_REFRESH_UNVERIFIED", failure.requestId, "unknown", 0,
            "Renewal and original session authority are unverified; HTTP and realtime remain refresh-blocked", { cause: failure });
        }
      } else {
        failure = new V1Problem("SESSION_REFRESH_UNVERIFIED", failure.requestId, "unknown", 0,
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
    this.#checkReplayAdmission();
    const id = v1Id(conversationId);
    this.#replayGenerations.set(id, (this.#replayGenerations.get(id) ?? 0) + 1);
    for (const stream of this.#streams) if (stream.conversationId === id) stream.close();
    return this.#openReplay(id, apply, onError, true);
  }
  #checkReplayAdmission(): void {
    if (this.#authentication.blocked || this.#quiescing)
      throw new V1Problem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
        "Session refresh holds replay admission; await verified refresh before opening or resynchronizing history");
  }
  async #openReplay(conversationId: string, apply: (events: V1Record[]) => Promise<void>,
    onError: (error: Error) => void, resync: boolean): Promise<V1Realtime> {
    this.#checkReplayAdmission();
    const generation = this.#replayGenerations.get(conversationId) ?? 0;
    await Promise.all([...this.#streams]
      .filter(stream => stream.conversationId === conversationId && stream.closed)
      .map(stream => stream.retire()));
    const route = this.#route ?? await this.initialize();
    this.#checkReplayAdmission();
    if (generation !== (this.#replayGenerations.get(conversationId) ?? 0)) throw new Error("History watcher superseded by explicit resynchronization");
    const realtime = new V1Realtime(this, conversationId, route, this.#token, apply, onError, () => this.#streams.delete(realtime));
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
export class V1Realtime {
  #socket: WebSocket | undefined; #closed = false; #working: Promise<void> | undefined;
  #applying: Promise<boolean> | undefined;
  #paused = false;
  #started = false;
  #cursor: V1Cursor | undefined; #timer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempts = 0;
  #pendingPages = 0;
  #queueGeneration = 0;
  #currentRoute: V1Route;
  readonly #storageKey: string;
  #token: string;
  constructor(readonly client: V1Client, readonly conversationId: string, readonly route: V1Route, token: string,
    readonly apply: (events: V1Record[]) => Promise<void>, readonly onError: (error: Error) => void,
    readonly onClose?: () => void) {
    this.#token = token;
    this.#currentRoute = route;
    replayRefresh.set(this, { suspend: () => this.#suspendSessionRefresh(),
      resume: (route, token) => this.#resumeSessionRefresh(route, token) });
    this.#storageKey = `convohop.v1.cursor:${client.projectId}:${client.principalId}:${conversationId}`;
    const saved = client.storage?.getItem(this.#storageKey);
    if (saved) this.#cursor = v1Cursor(JSON.parse(saved));
  }
  get cursor(): V1Cursor | undefined { return this.#cursor; }
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
  async #resumeSessionRefresh(route: V1Route, token: string): Promise<void> {
    if (this.#closed) return;
    this.#currentRoute = route; this.#token = token; this.#paused = false;
    try {
      await this.reconcile();
      if (!this.#closed) this.#connect();
    } catch (error) { this.#fail(error); throw error; }
  }
  async #apply(events: V1Record[]): Promise<boolean> {
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
    if (this.#paused) throw new V1Problem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
      "Replay startup was paused by session refresh; open it after verified refresh");
    await this.reconcile();
    if (this.#paused) throw new V1Problem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
      "Replay startup was paused by session refresh; open it after verified refresh");
    if (!this.#closed && !this.#paused) this.#connect();
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
    ws.onerror = () => {
      if (!this.#closed && !this.#paused && this.#socket === ws)
        this.onError(new Error("Realtime connection unavailable; current history remains authoritative"));
    };
    ws.onclose = event => {
      if (this.#socket !== ws) return;
      this.#socket = undefined;
      if (!this.#closed && !this.#paused && ![4400, 4401, 4403, 4408, 4409].includes(event.code)) this.#retry();
      else if (!this.#closed && !this.#paused) this.#fail(new V1Problem("UNAUTHENTICATED", subscriptionId, "rejected", 401, "Realtime authorization ended; obtain a current session"));
    };
  }
  #page(value: unknown): void {
    if (this.#pendingPages >= 4) throw new V1Problem("ADMISSION_LIMIT", crypto.randomUUID(), "unknown", 503, "Application must resume from its applied cursor");
    const page = eventPage(value, this.#currentRoute.incarnation, this.conversationId);
    if (page.refreshRequired) throw new Error("Explicit authorized history resynchronization required");
    const generation = this.#queueGeneration;
    this.#pendingPages++;
    const work = (this.#working ?? Promise.resolve()).then(async () => {
      if (this.#closed || this.#paused || generation !== this.#queueGeneration ||
          (this.#cursor && BigInt(page.nextCursor.sequence) < BigInt(this.#cursor.sequence))) return;
      const events = this.#cursor ? page.items.filter(event => BigInt(v1Counter(event.sequence)) > BigInt(this.#cursor!.sequence)) : page.items;
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
      }).then(() => { if (current()) return this.reconcile(); })
        .then(() => { if (current()) this.#connect(); })
        .catch(error => { if (current()) this.#fail(error); });
    }, delay);
  }
  #fail(error: unknown): void {
    if (this.#closed) return;
    this.#queueGeneration++;
    if (this.#paused) {
      this.onError(error instanceof Error ? error : new Error("Realtime reconciliation failed"));
      return;
    }
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
    if (this.#paused) throw new V1Problem("SESSION_REFRESH_REQUIRED", crypto.randomUUID(), "rejected", 409,
      "Realtime application work is paused until session authority is verified");
    if (this.#working) return this.#working;
    const generation = this.#queueGeneration;
    const work = async () => {
      for (let page = 0; page < 10 && !this.#closed && !this.#paused; page++) {
        const result = await this.client.events(this.conversationId, this.#cursor);
        if (this.#closed || this.#paused || generation !== this.#queueGeneration) return;
        if (result.refreshRequired) throw new Error("Explicit authorized history resynchronization required");
        const applied = await this.#apply(result.items);
        if (!applied || this.#closed || generation !== this.#queueGeneration) return;
        this.#cursor = result.nextCursor;
        this.client.storage?.setItem(this.#storageKey, JSON.stringify(this.#cursor));
        if (result.complete) return;
      }
      if (this.#closed || this.#paused || generation !== this.#queueGeneration) return;
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
    if (!this.#applying) this.onClose?.();
  }
}
