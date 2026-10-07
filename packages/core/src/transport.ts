import { v1GraphqlRequest, operationPayload, operationKey, validateOperationPayload,
  type OperationInput, type OperationPayload } from "./graphql.js";
import { v1Operations, type V1OperationKey } from "./generated/v1-operations.js";
import { V1Problem, authorityProblem, boolean, canonical, fingerprint, origin, timestamp, v1Counter, v1Id, v1Record, v1String,
  type V1AsyncRecoveryStorage, type V1Record, type V1RecoveryState, type V1RecoveryStorage } from "./protocol.js";
export interface V1TransportOptions {
  baseUrl: string; credential?: string; namespace: string; incarnation?: string;
  recoveryStorage?: V1RecoveryStorage; asyncRecoveryStorage?: V1AsyncRecoveryStorage; fetch?: typeof fetch;
}
type SessionProbe = "communication.route" | "communication.currentSession";
/** Whole-second retry delay from `extensions.retryAfter` or an HTTP `Retry-After` delta; anything else is ignored. */
function retryDelay(value: unknown): number | undefined {
  if (typeof value === "string" && /^[0-9]{1,10}$/.test(value)) value = Number(value);
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
export interface TransportAuthentication {
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
        throw authorityProblem(typeof extensions.code === "string" ? extensions.code : "GRAPHQL_ERROR", requestId,
          typeof extensions.outcome === "string" ? extensions.outcome : "unknown",
          typeof extensions.status === "number" ? extensions.status : 503,
          typeof error.message === "string" ? error.message : "GraphQL rejected the request",
          retryDelay(extensions.retryAfter) ?? retryDelay(response.headers.get("retry-after")));
      }
      if (!response.ok) {
        throw authorityProblem(typeof graphql.code === "string" ? graphql.code : "HTTP_FAILURE", requestId,
          typeof graphql.outcome === "string" ? graphql.outcome : "unknown", response.status,
          typeof graphql.message === "string" ? graphql.message : "Authority rejected the request",
          retryDelay(graphql.retryAfter) ?? retryDelay(response.headers.get("retry-after")));
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
/** @internal Returns authentication state only to the code that constructs the transport. */
export function authenticatedTransport(options: V1TransportOptions): {
  transport: V1Transport; authentication: TransportAuthentication;
} {
  const transport = new V1Transport(options);
  const authentication = transportAuthentication.get(transport);
  if (!authentication) throw new Error("Missing transport authentication state");
  return { transport, authentication };
}
