import { buildGraphqlRequest, operationPayload, operationKey, validateOperationPayload,
  type OperationInput, type OperationPayload } from "./graphql.js";
import { operationCatalog, type OperationKey } from "./generated/operations.js";
import { ConvoHopProblem, authorityProblem, boolean, canonical, fingerprint, jsonClone, origin, timestamp, parseCounter, parseId, parseObject,
  parseString, type AsyncRecoveryStorage, type ProtocolObject, type RecoveryState, type RecoveryStorage } from "./protocol.js";
import { deadline, randomUUID, validatePlatform, type ConvoHopPlatform } from "./platform.js";
export interface ConvoHopTransportOptions {
  baseUrl: string; credential?: string; namespace: string; incarnation?: string;
  recoveryStorage?: RecoveryStorage; asyncRecoveryStorage?: AsyncRecoveryStorage; fetch?: typeof fetch;
  /** Runtime services that replace missing globals, such as in React Native. See {@link ConvoHopPlatform}. */
  platform?: ConvoHopPlatform;
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
const transportAuthentication = new WeakMap<ConvoHopTransport, TransportAuthentication>();
export class ConvoHopTransport {
  readonly baseUrl: string;
  readonly durableRecovery: boolean;
  readonly #authentication: TransportAuthentication;
  readonly #fetch: typeof fetch;
  readonly #platform: Readonly<ConvoHopPlatform>;
  readonly #storage: RecoveryStorage | undefined;
  readonly #asyncStorage: AsyncRecoveryStorage | undefined;
  readonly #storageKey: string;
  readonly #states = new Map<string, RecoveryState>();
  readonly #active = new Map<string, { identity: string; work: Promise<ProtocolObject> }>();
  #recoveryInitialized = false;
  #initialization: Promise<void> | undefined;
  #writes: Promise<void> | undefined;
  incarnation: string;
  servingEpoch: string | undefined;
  constructor(options: ConvoHopTransportOptions) {
    if (options.recoveryStorage !== undefined && options.asyncRecoveryStorage !== undefined)
      throw new TypeError("Choose recoveryStorage or asyncRecoveryStorage, not both");
    this.#platform = validatePlatform(options.platform);
    this.baseUrl = origin(options.baseUrl, this.#platform);
    this.#authentication = { credential: options.credential, barrier: undefined, blocked: false, active: new Set(),
      probe: (key, projectId, credential, observedServingEpoch) =>
        this.#execute(key, projectId, {}, randomUUID(this.#platform), undefined, this.incarnation, credential, observedServingEpoch) };
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
      const restored = new Map<string, RecoveryState>();
      for (const item of values) {
        const v = parseObject(item);
        const operation = operationKey(v.operation), resolutionState = v.resolutionState;
        if (operationCatalog[operation].kind !== "mutation" ||
            (resolutionState !== "pending" && resolutionState !== "unknown" &&
             resolutionState !== "committed" && resolutionState !== "accepted")) throw new TypeError("Invalid recovery record");
        const projectId = v.projectId === undefined ? undefined : parseId(v.projectId);
        if ((operationCatalog[operation].plane === "communication") !== (projectId !== undefined))
          throw new TypeError("Invalid recovery project scope");
        for (const key of ["firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt"]) {
          if (typeof v[key] !== "number" || !Number.isSafeInteger(v[key]) || v[key] < 0) throw new TypeError("Invalid recovery clock or count");
        }
        if (v.mediaAdmissionAttempted !== undefined && v.mediaAdmissionAttempted !== true)
          throw new TypeError("Invalid native admission marker");
        // All fields are checked before this stored record can authorize a resend.
        const state: RecoveryState = {
          requestId: parseId(v.requestId), incarnation: parseString(v.incarnation), payloadFingerprint: parseString(v.payloadFingerprint),
          operation, ...(projectId === undefined ? {} : { projectId }), input: parseObject(v.input),
          firstSubmittedAt: Number(v.firstSubmittedAt), retryDeadline: Number(v.retryDeadline), attemptCount: Number(v.attemptCount),
          lastAttemptAt: Number(v.lastAttemptAt), lastAttemptClassification: parseString(v.lastAttemptClassification),
          resolutionState,
          ...(v.mediaAdmissionAttempted === true ? { mediaAdmissionAttempted: true } : {}),
        };
        if (restored.has(state.requestId)) throw new TypeError("Duplicate mutation recovery identity");
        restored.set(state.requestId, state);
      }
      for (const [requestId, state] of restored) this.#states.set(requestId, state);
    }
  }
  get recoveryStates(): readonly RecoveryState[] {
    if (!this.#recoveryInitialized) throw new Error("Await initializeRecovery() before inspecting asynchronous recovery state");
    return [...this.#states.values()].map(state => jsonClone(state));
  }
  /** @internal Persist the native attempt boundary without retaining a bearer grant. */
  markMediaAdmissionAttempted(requestId: string): void | Promise<void> {
    parseId(requestId);
    if (!this.#recoveryInitialized)
      return this.initializeRecovery().then(() => this.markMediaAdmissionAttempted(requestId));
    const state = this.#states.get(requestId);
    if (!state || state.operation !== "communication.liveSessionCredentials" || state.resolutionState !== "committed")
      throw new Error("Native admission requires a committed credential issuance");
    state.lastAttemptClassification = "nativeAdmissionAttempted";
    state.mediaAdmissionAttempted = true;
    return this.#persist(state);
  }
  #persist(state: RecoveryState): void | Promise<void> {
    const storage = this.#asyncStorage;
    if (storage !== undefined) {
      const snapshot = JSON.stringify([...this.#states.values()]);
      const write = async () => {
        try { await storage.setItem(this.#storageKey, snapshot); }
        catch (cause) {
          throw new ConvoHopProblem("RECOVERY_STORAGE_FAILURE", state.requestId,
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
  async execute<K extends OperationKey>(key: K, projectId: string | undefined, input: OperationInput<K>,
    requestId: string = randomUUID(this.#platform), credentialDeliveryPermit?: ProtocolObject): Promise<OperationPayload<K>> {
    const incarnation = this.incarnation;
    const body = jsonClone(Object.fromEntries(Object.entries(parseObject(input)).filter(([, value]) => value !== undefined)));
    const permit = credentialDeliveryPermit === undefined ? undefined : jsonClone(credentialDeliveryPermit);
    this.#plan(key, projectId, body, requestId, permit);
    return this.#authorized(requestId, credential =>
      this.#execute(key, projectId, body, requestId, permit, incarnation, credential));
  }
  #authorized<T>(requestId: string, work: (credential: string | undefined) => Promise<T>): Promise<T> {
    const authentication = this.#authentication;
    if (authentication.blocked) {
      const state = this.#states.get(requestId);
      return Promise.reject(new ConvoHopProblem("SESSION_REFRESH_REQUIRED", requestId,
        state ? state.resolutionState === "pending" ? "unknown" : state.resolutionState : "rejected", 409,
        "Session authority is unverified; recover the original renewal or explicitly retire this client"));
    }
    if (authentication.barrier) return authentication.barrier.then(() => this.#authorized(requestId, work));
    const pending = work(authentication.credential);
    authentication.active.add(pending);
    return pending.finally(() => authentication.active.delete(pending));
  }
  async #execute<K extends OperationKey>(key: K, projectId: string | undefined, body: ProtocolObject,
    requestId: string, credentialDeliveryPermit: ProtocolObject | undefined, incarnation: string,
    credential: string | undefined, observedServingEpoch: string | undefined = this.servingEpoch): Promise<OperationPayload<K>> {
    const operation = operationCatalog[operationKey(key)];
    this.#plan(key, projectId, body, requestId, credentialDeliveryPermit);
    await this.initializeRecovery();
    if (this.incarnation !== incarnation)
      throw new ConvoHopProblem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    // Ephemeral signals are neither deduplicated nor resolvable, so they keep no recovery state.
    const result = operationPayload(key, recorded(operation)
      ? await this.#mutate(key, projectId, body, requestId, credential, credentialDeliveryPermit)
      : await this.#request(key, projectId, body, requestId, credential, credentialDeliveryPermit, observedServingEpoch));
    if (key === "communication.resolveRequest" || key === "management.resolveRequest") {
      const state = this.#states.get(parseString(body.requestId)), resolution = parseObject(parseObject(result).result);
      if (resolution.requestId !== body.requestId ||
          (resolution.receipt != null && parseObject(resolution.receipt).requestId !== body.requestId))
        throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", 503, "Request resolution identity changed");
      if (state && (state.projectId !== projectId || state.incarnation !== this.incarnation))
        throw new ConvoHopProblem("RESOLUTION_REQUIRED", requestId, "unknown", 409, "Resolve within the original project and incarnation");
      if (state && (resolution.state === "committed" || resolution.state === "accepted")) {
        if (state.resolutionState !== "committed") state.resolutionState = resolution.state;
        state.lastAttemptClassification = "authorityReceipt"; await this.#persist(state);
      }
    }
    return result;
  }
  async #mutate(operation: OperationKey, projectId: string | undefined, input: ProtocolObject,
    requestId: string, credential: string | undefined, credentialDeliveryPermit?: ProtocolObject, retry = false): Promise<ProtocolObject> {
    parseId(requestId);
    const incarnation = this.incarnation, identity = canonical({ operation, projectId: projectId ?? null, input, incarnation });
    const active = this.#active.get(requestId);
    if (active) {
      if (active.identity !== identity)
        throw new ConvoHopProblem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload");
      return active.work;
    }
    const work = (async () => {
      const hash = await fingerprint({ operation, projectId: projectId ?? null, input }, this.#platform);
      if (this.incarnation !== incarnation)
        throw new ConvoHopProblem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
      let state = this.#states.get(requestId);
      if (state && (state.payloadFingerprint !== hash || state.incarnation !== incarnation ||
          state.operation !== operation || state.projectId !== projectId || canonical(state.input) !== canonical(input)))
        throw new ConvoHopProblem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload");
      if (retry && (!state || ["committed", "accepted"].includes(state.resolutionState) || state.mediaAdmissionAttempted))
        throw new ConvoHopProblem("RESOLUTION_REQUIRED", requestId, "unknown", 409, "The original request is no longer eligible for resend");
      if (!state) {
        if (this.#states.size >= 128) {
          const settled = [...this.#states.values()].find(value =>
            ["committed", "accepted"].includes(value.resolutionState) && !this.#active.has(value.requestId));
          if (!settled) throw new Error("Resolve outstanding mutations before creating more");
          this.#states.delete(settled.requestId);
        }
        const now = Date.now();
        state = { requestId, incarnation, payloadFingerprint: hash, operation,
          ...(projectId === undefined ? {} : { projectId }), input: jsonClone(input),
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
  async #submit(state: RecoveryState, credential: string | undefined,
    credentialDeliveryPermit?: ProtocolObject, retry = false): Promise<ProtocolObject> {
    if (state.incarnation !== this.incarnation)
      throw new ConvoHopProblem("INCARNATION_MISMATCH", state.requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    const now = Date.now();
    if (state.attemptCount >= 3 || now > state.retryDeadline || now < state.firstSubmittedAt || now < state.lastAttemptAt)
      throw new ConvoHopProblem("RESOLUTION_REQUIRED", state.requestId, "unknown", 409, "Retry budget expired or clock changed; resolve this request read-only");
    state.attemptCount += 1; state.lastAttemptAt = now;
    if (state.resolutionState === "pending") state.resolutionState = "unknown";
    state.lastAttemptClassification = "submitted"; await this.#persist(state);
    if (state.incarnation !== this.incarnation)
      throw new ConvoHopProblem("INCARNATION_MISMATCH", state.requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    const submittingAt = Date.now();
    if (submittingAt > state.retryDeadline || submittingAt < state.firstSubmittedAt || submittingAt < state.lastAttemptAt ||
        (retry && (["committed", "accepted"].includes(state.resolutionState) || state.mediaAdmissionAttempted)))
      throw new ConvoHopProblem("RESOLUTION_REQUIRED", state.requestId, "unknown", 409, "The original request is no longer eligible for resend");
    let result: ProtocolObject, outcome: "committed" | "accepted";
    try {
      result = await this.#request(state.operation, state.projectId, state.input, state.requestId, credential, credentialDeliveryPermit);
      if (result.status !== "committed" && result.status !== "accepted") throw new TypeError("A mutation requires authority receipt evidence");
      outcome = result.status;
    } catch (error) {
      state.lastAttemptClassification = error instanceof ConvoHopProblem ? error.code : "opaqueTransportFailure";
      await this.#persist(state); throw error;
    }
    if (state.resolutionState !== "committed") state.resolutionState = outcome;
    state.lastAttemptClassification = "authorityReceipt"; await this.#persist(state); return result;
  }
  async retry(requestId: string): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>> {
    parseId(requestId);
    return this.#authorized(requestId, credential => this.#retry(requestId, credential));
  }
  async #retry(requestId: string, credential: string | undefined): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>> {
    await this.initializeRecovery();
    const state = this.#states.get(requestId);
    if (!state) throw new Error("No recovery record exists; do not invent a replacement identity");
    if (state.incarnation !== this.incarnation) throw new ConvoHopProblem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
    if (state.operation === "communication.redeemCredential" || state.operation === "communication.acknowledgeCredential")
      throw new ConvoHopProblem("CREDENTIAL_REQUIRED", requestId, "unknown", 409,
        "Delivery permits cannot authorize request lookup; obtain a current permit and submit the same delivery identity explicitly");
    const key = operationCatalog[state.operation].plane === "management" ? "management.resolveRequest" : "communication.resolveRequest";
    const resolution = (await this.#execute(key, state.projectId, { requestId }, randomUUID(this.#platform),
      undefined, this.incarnation, credential)).result;
    if (!resolution) throw new TypeError("Missing current request resolution");
    if (resolution.state === "committed" || resolution.state === "accepted") return resolution;
    if (resolution.state !== "notObservedYet") throw new TypeError("Unknown request resolution state");
    if (["committed", "accepted"].includes(state.resolutionState) || state.mediaAdmissionAttempted) {
      throw new ConvoHopProblem("RESOLUTION_REQUIRED", requestId, "unknown", 409,
        "Previously observed commit or native admission cannot be retried from absent evidence");
    }
    if (await fingerprint({ operation: state.operation, projectId: state.projectId ?? null, input: state.input }, this.#platform) !==
        state.payloadFingerprint)
      throw new Error("Recovery input fingerprint changed");
    await this.#mutate(state.operation, state.projectId, state.input, state.requestId, credential, undefined, true);
    const current = (await this.#execute(key, state.projectId, { requestId }, randomUUID(this.#platform),
      undefined, this.incarnation, credential)).result;
    if (!current) throw new TypeError("Missing current request resolution");
    return current;
  }
  #plan(key: OperationKey, projectId: string | undefined, input: ProtocolObject,
    requestId: string, credentialDeliveryPermit?: ProtocolObject,
    observedServingEpoch: string | undefined = this.servingEpoch): ReturnType<typeof buildGraphqlRequest> {
    try {
      return buildGraphqlRequest(key, input, { requestId: parseId(requestId),
        ...(projectId === undefined ? {} : { projectId: parseId(projectId) }),
        ...(credentialDeliveryPermit === undefined ? {} : { credentialDeliveryPermit }),
        ...(this.incarnation === "management" ? {} : { incarnation: this.incarnation }),
        ...(observedServingEpoch === undefined ? {} : { observedServingEpoch }) });
    } catch (error) {
      throw new ConvoHopProblem("INVALID_REQUEST", requestId, "rejected", 400,
        error instanceof Error ? error.message : "Invalid SDK operation");
    }
  }
  async #request(key: OperationKey, projectId: string | undefined, input: ProtocolObject,
    requestId: string, credential: string | undefined, credentialDeliveryPermit?: ProtocolObject,
    observedServingEpoch: string | undefined = this.servingEpoch): Promise<ProtocolObject> {
    const plan = this.#plan(key, projectId, input, requestId, credentialDeliveryPermit, observedServingEpoch);
    const headers: Record<string, string> = { accept: "application/json", "content-type": "application/json" };
    if (credential !== undefined) headers.authorization = "Bearer " + credential;
    let response: Response, text: string;
    const url = this.baseUrl + "/graphql", timeout = deadline(12000);
    try {
      try {
        response = await this.#fetch(url, { method: "POST", headers, redirect: "error", cache: "no-store",
          credentials: "omit", ...(timeout.signal ? { signal: timeout.signal } : {}), body: canonical(plan.body) });
      } catch { throw new ConvoHopProblem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Authority response unavailable; resolve the original request"); }
      // Some runtimes, such as React Native, follow redirects despite `redirect: "error"`. Another URL's answer isn't the authority's.
      if (response.redirected === true || (typeof response.url === "string" && response.url !== "" && response.url !== url))
        throw new ConvoHopProblem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Authority response was redirected; resolve the original request");
      try { text = await response.text(); }
      catch { throw new ConvoHopProblem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Incomplete authority response; resolve the original request"); }
    } finally { timeout.clear(); }
    if (text.length > 1_048_576) throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", response.status, "Authority response exceeds the bound");
    let decoded: unknown;
    try { decoded = JSON.parse(text); } catch { throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", response.status, "Unrecognized authority response"); }
    try {
      const graphql = parseObject(decoded);
      if (Array.isArray(graphql.errors) && graphql.errors.length) {
        const error = parseObject(graphql.errors[0]);
        const extensions = error.extensions == null ? {} : parseObject(error.extensions);
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
      const raw = parseObject(graphql.data)[plan.operation.field];
      const value = parseObject(raw);
      validateOperationPayload(plan.operation, value);
      if (!["ok", "committed", "accepted"].includes(parseString(value.status))) throw new TypeError("Unrecognized authority envelope");
      if (parseId(value.requestId) !== requestId) throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", response.status, "Mismatched authority request identity");
      if (recorded(plan.operation)) {
        if (value.status === "committed") {
          parseId(value.receiptId); timestamp(value.committedAt); boolean(value.replayed);
        } else if (value.status === "accepted") {
          parseId(parseObject(value.operation).operationId);
        } else throw new TypeError("A mutation requires authority receipt evidence");
      }
      return value;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", response.status, "Malformed authority response; resolve the original request");
    }
  }
}
function recorded(operation: { kind: string; idempotency: string }): boolean {
  return operation.kind === "mutation" && operation.idempotency !== "ephemeral";
}
/** @internal Returns authentication state only to the code that constructs the transport. */
export function authenticatedTransport(options: ConvoHopTransportOptions): {
  transport: ConvoHopTransport; authentication: TransportAuthentication;
} {
  const transport = new ConvoHopTransport(options);
  const authentication = transportAuthentication.get(transport);
  if (!authentication) throw new Error("Missing transport authentication state");
  return { transport, authentication };
}
