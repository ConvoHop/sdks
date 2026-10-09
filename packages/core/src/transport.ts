import { buildGraphqlRequest, operationPayload, operationKey, validateOperationPayload,
  type OperationInput, type OperationPayload } from "./graphql.js";
import { operationCatalog, type OperationKey } from "./generated/operations.js";
import { ConvoHopProblem, authorityProblem, boolean, canonical, fingerprint, jsonClone, origin, timestamp, parseCounter, parseId, parseObject,
  parseString, type AsyncRecoveryStorage, type ProtocolObject, type RecoveryState, type RecoveryStorage } from "./protocol.js";
import { deadline, randomUUID, validatePlatform, type ConvoHopPlatform } from "./platform.js";
import { retryableCode, retryDelay } from "./retry.js";
export interface ConvoHopTransportOptions {
  baseUrl: string; credential?: string; namespace: string; incarnation?: string;
  recoveryStorage?: RecoveryStorage; asyncRecoveryStorage?: AsyncRecoveryStorage; fetch?: typeof fetch;
  /** Runtime services that replace missing globals, such as in React Native. See {@link ConvoHopPlatform}. */
  platform?: ConvoHopPlatform;
}
type SessionProbe = "communication.route" | "communication.currentSession";
export interface TransportAuthentication {
  credential: string | undefined; barrier: Promise<void> | undefined; blocked: boolean;
  active: Set<Promise<unknown>>;
  probe: <K extends SessionProbe>(key: K, projectId: string, credential: string,
    observedServingEpoch?: string) => Promise<OperationPayload<K>>;
}
const transportAuthentication = new WeakMap<ConvoHopTransport, TransportAuthentication>();
/** Each transport's {@link beforeSubmitting} hooks by request ID. */
const submissionHooks = new WeakMap<ConvoHopTransport, Map<string, () => void | Promise<void>>>();
/** Each transport's {@link adoptRecovery}. */
const recoveryAdoption = new WeakMap<ConvoHopTransport, (requestId: string) => Promise<boolean>>();
/** Each transport's {@link retainRecovery} callers, each listing the request IDs whose records it still needs. */
const recoveryRetainers = new WeakMap<ConvoHopTransport, Set<() => Iterable<string>>>();
/** A journal keeps at most this many records. */
const journalLimit = 128;
/**
 * How far each resolution state has seen a request go. Merging records never moves a request back, except that of two
 * records that both saw attempts, the one that saw more decides between `unknown` and `rejected`.
 */
const progress = { pending: 0, unknown: 1, rejected: 2, accepted: 3, committed: 4 } as const;
/** A stored record, and what this SDK reads of it: nothing, for a record it can't read. */
interface JournalEntry { readonly record: ProtocolObject; readonly state: RecoveryState | undefined }
/**
 * Parses a stored journal. A record this SDK can't read, such as a newer SDK's record of an operation this one doesn't
 * know, is kept as stored and never used to resend. A journal that isn't a list of at most {@link journalLimit}
 * records with distinct request IDs is rejected rather than dropped.
 */
function parseJournal(saved: string | null | undefined): Map<string, JournalEntry> {
  const journal = new Map<string, JournalEntry>();
  if (!saved) return journal;
  const values: unknown = JSON.parse(saved);
  if (!Array.isArray(values) || values.length > journalLimit) throw new TypeError("Invalid mutation recovery storage");
  for (const item of values) {
    const record = parseObject(item), requestId = parseId(record.requestId);
    if (journal.has(requestId)) throw new TypeError("Duplicate mutation recovery identity");
    let state: RecoveryState | undefined;
    try { state = parseRecord(record); }
    catch (error) { if (!(error instanceof TypeError)) throw error; }
    journal.set(requestId, { record, state });
  }
  return journal;
}
/** When a stored record's request was last attempted: 0 for a record this SDK can't read that has no time it can. */
function lastAttempt({ record, state }: JournalEntry): number {
  const at = state?.lastAttemptAt ?? record.lastAttemptAt;
  return typeof at === "number" && Number.isSafeInteger(at) && at >= 0 ? at : 0;
}
/** Reads a stored record, failing on anything this SDK can't read. */
function parseRecord(v: ProtocolObject): RecoveryState {
  const operation = operationKey(v.operation), resolutionState = v.resolutionState;
  if (operationCatalog[operation].kind !== "mutation" ||
      (resolutionState !== "pending" && resolutionState !== "unknown" && resolutionState !== "rejected" &&
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
  return {
    requestId: parseId(v.requestId), incarnation: parseString(v.incarnation), payloadFingerprint: parseString(v.payloadFingerprint),
    operation, ...(projectId === undefined ? {} : { projectId }), input: parseObject(v.input),
    firstSubmittedAt: Number(v.firstSubmittedAt), retryDeadline: Number(v.retryDeadline), attemptCount: Number(v.attemptCount),
    lastAttemptAt: Number(v.lastAttemptAt), lastAttemptClassification: parseString(v.lastAttemptClassification),
    resolutionState,
    ...(v.mediaAdmissionAttempted === true ? { mediaAdmissionAttempted: true } : {}),
  };
}
/** Whether two records are of one request: the same operation, project, input and incarnation. */
function sameRequest(a: RecoveryState, b: RecoveryState): boolean {
  return a.payloadFingerprint === b.payloadFingerprint && a.incarnation === b.incarnation && a.operation === b.operation &&
    a.projectId === b.projectId && canonical(a.input) === canonical(b.input);
}
/** Whether a record says only that its request was created, so nothing of it can have been sent. */
function unsubmitted(state: RecoveryState): boolean {
  return state.attemptCount === 0 && state.resolutionState === "pending";
}
function settled(state: RecoveryState): boolean {
  return progress[state.resolutionState] >= progress.accepted;
}
/**
 * Whether nothing more can come of a record's request: the authority committed or accepted it, or rejected every
 * attempt and won't take another, because the last rejection isn't retryable or the retry budget is spent. Only such
 * records make room in a full journal.
 */
function final(state: RecoveryState, now: number): boolean {
  return settled(state) || (state.resolutionState === "rejected" &&
    (!retryableCode(state.lastAttemptClassification) || state.attemptCount >= 3 || now > state.retryDeadline));
}
/** The refusal to hold one more record while the journal is full of records that aren't final. */
function recoveryLimit(requestId: string, outcome: string): ConvoHopProblem {
  return new ConvoHopProblem("RECOVERY_LIMIT", requestId, outcome, 409,
    `Recovery storage already holds ${journalLimit} requests that aren't final; retry or resolve them first`);
}
/** The outcome a problem reports of a recorded request: unknown until an attempt's answer says otherwise. */
function outcomeOf(state: RecoveryState): string {
  return state.resolutionState === "pending" ? "unknown" : state.resolutionState;
}
/**
 * Adds to `target` what `other`, another client's record of the same request, knows: the earliest budget, the most
 * attempts, the furthest resolution and any native admission. `target` takes `other`'s classification of the last
 * attempt only when `other` has seen further. Between `unknown` and `rejected`, the record that has seen further
 * decides, since a rejection answers only the attempt it ends. Records of attempts made without knowledge of each
 * other, where neither record has seen both as many attempts and as late an attempt as the other, count one attempt
 * more, and leave the request `unknown` if either does: the other attempt may yet have been applied.
 */
function absorb(target: RecoveryState, other: RecoveryState): void {
  const media = (state: RecoveryState) => Number(state.mediaAdmissionAttempted === true);
  const attempted = (state: RecoveryState) => state.resolutionState === "unknown" || state.resolutionState === "rejected";
  const both = attempted(target) && attempted(other);
  const more = other.attemptCount - target.attemptCount, later = other.lastAttemptAt - target.lastAttemptAt;
  const unaware = both && later !== 0 && Math.sign(more) !== Math.sign(later);
  let further = more || later || progress[other.resolutionState] - progress[target.resolutionState] || media(other) - media(target);
  if (unaware && other.resolutionState !== target.resolutionState) further = other.resolutionState === "unknown" ? 1 : -1;
  if (further > 0) target.lastAttemptClassification = other.lastAttemptClassification;
  if (both ? further > 0 : progress[other.resolutionState] > progress[target.resolutionState])
    target.resolutionState = other.resolutionState;
  target.attemptCount = Math.max(target.attemptCount, other.attemptCount) + Number(unaware);
  target.lastAttemptAt = Math.max(target.lastAttemptAt, other.lastAttemptAt);
  target.firstSubmittedAt = Math.min(target.firstSubmittedAt, other.firstSubmittedAt);
  target.retryDeadline = Math.min(target.retryDeadline, other.retryDeadline);
  if (other.mediaAdmissionAttempted === true) target.mediaAdmissionAttempted = true;
}
/** The failure of an asynchronous journal read or write. The request keeps the outcome already known of it. */
function storageFailure(requestId: string, state: RecoveryState | undefined, cause: unknown, read = false): ConvoHopProblem {
  return new ConvoHopProblem("RECOVERY_STORAGE_FAILURE", requestId,
    state === undefined || state.resolutionState === "pending" ? "unknown" : state.resolutionState, 0,
    read ? "Recovery storage could not be read; retain the original request and its outcome"
      : "Recovery storage did not confirm durability; retain the original request and its outcome", { cause });
}
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
    recoveryAdoption.set(this, async requestId => {
      await this.initializeRecovery();
      await this.#refresh(requestId);
      return this.#states.has(requestId);
    });
    if (this.#asyncStorage === undefined) {
      this.#restore(parseJournal(this.#storage?.getItem(this.#storageKey)));
      this.#recoveryInitialized = true;
    }
  }
  initializeRecovery(): Promise<void> {
    const storage = this.#asyncStorage;
    if (storage === undefined) return Promise.resolve();
    this.#initialization ??= Promise.resolve().then(() => this.#load(storage)).then(journal => {
      this.#restore(journal);
      this.#recoveryInitialized = true;
    });
    return this.#initialization;
  }
  #restore(journal: ReadonlyMap<string, JournalEntry>): void {
    for (const [requestId, { state }] of journal) if (state !== undefined) this.#states.set(requestId, state);
  }
  /** Reads the journal from asynchronous storage. */
  async #load(storage: AsyncRecoveryStorage): Promise<Map<string, JournalEntry>> {
    const saved = await storage.getItem(this.#storageKey);
    if (saved !== null && (typeof saved !== "string" || saved.length === 0))
      throw new TypeError("Invalid asynchronous mutation recovery storage");
    return parseJournal(saved);
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
  /**
   * Saves `state` with this transport's other records, merged into the stored journal so that clients sharing its key,
   * such as a user's tabs, keep each other's records. `unsent` marks a write made before `state`'s request was ever
   * sent: the write that creates it, or the one that counts its first attempt. Such a write fails, writing nothing,
   * rather than replace another request saved under the same ID; the creating write also fails rather than drop
   * another client's unresolved records.
   */
  #persist(state: RecoveryState, unsent?: "creating" | "submitting"): void | Promise<void> {
    const asyncStorage = this.#asyncStorage;
    if (asyncStorage !== undefined) {
      const write = async () => {
        let stored: Map<string, JournalEntry>;
        try { stored = await this.#load(asyncStorage); }
        catch (cause) { throw storageFailure(state.requestId, state, cause, true); }
        const journal = JSON.stringify(this.#merge(stored, state, unsent));
        try { await asyncStorage.setItem(this.#storageKey, journal); }
        catch (cause) { throw storageFailure(state.requestId, state, cause); }
      };
      // A failed write rejects its caller; a later complete one may repair it.
      this.#writes = this.#writes ? this.#writes.then(write, write) : write();
      return this.#writes;
    }
    const storage = this.#storage;
    if (storage !== undefined)
      storage.setItem(this.#storageKey, JSON.stringify(this.#merge(parseJournal(storage.getItem(this.#storageKey)), state, unsent)));
  }
  /**
   * Takes in what a stored journal knows of the requests this transport holds. A record of another request saved under
   * the same ID replaces this transport's record only while nothing of this transport's request can have been sent:
   * while the record is unsubmitted, or is `unsent`, whose first attempt is being counted. So does a record this SDK
   * can't read, which may be of another request, though this transport can't hold it.
   */
  #learn(stored: ReadonlyMap<string, JournalEntry>, unsent?: RecoveryState): void {
    for (const [requestId, { state: saved }] of stored) {
      const held = this.#states.get(requestId);
      if (held === undefined) continue;
      if (saved !== undefined && sameRequest(held, saved)) absorb(held, saved);
      else if (held === unsent || unsubmitted(held)) {
        if (saved === undefined) this.#states.delete(requestId);
        else this.#states.set(requestId, saved);
      }
    }
  }
  /**
   * Makes room for one more record in memory by forgetting the final record attempted longest ago that no command is
   * using and no caller retains, or refuses the request `requestId`, whose outcome is `outcome`, with RECOVERY_LIMIT.
   */
  #reserve(requestId: string, outcome: string): void {
    if (this.#states.size < journalLimit) return;
    const retained = this.#retained(), now = Date.now();
    let forgotten: RecoveryState | undefined;
    for (const value of this.#states.values())
      if (final(value, now) && !this.#active.has(value.requestId) && !retained.has(value.requestId) &&
          (forgotten === undefined || value.lastAttemptAt < forgotten.lastAttemptAt)) forgotten = value;
    if (!forgotten) throw recoveryLimit(requestId, outcome);
    this.#states.delete(forgotten.requestId);
  }
  /** The request IDs whose records {@link retainRecovery} callers still need. */
  #retained(): Set<string> {
    const retained = new Set<string>();
    for (const retainer of recoveryRetainers.get(this) ?? []) for (const requestId of retainer()) retained.add(requestId);
    return retained;
  }
  /**
   * Merges a stored journal with this transport's records into the journal to save: the stored records in their order,
   * each replaced by this transport's record of the request, which keeps any fields this SDK doesn't know from the
   * stored record of that request, then this transport's other records. Records this transport doesn't hold, including
   * those this SDK can't read, stay as stored without entering memory. Over the limit, final records that no caller
   * retains go first, oldest attempt first and those this transport doesn't hold before its own. Then a write that
   * creates `state` fails with RECOVERY_LIMIT, while any other write drops the oldest records this transport doesn't
   * hold that aren't final, counting a record this SDK can't read as not final: its own always fit. A write before
   * `state`'s request was ever sent fails if `state` yielded.
   */
  #merge(stored: ReadonlyMap<string, JournalEntry>, state: RecoveryState, unsent?: "creating" | "submitting"): ProtocolObject[] {
    const created = unsent === "creating";
    this.#learn(stored, unsent === undefined ? undefined : state);
    if (unsent !== undefined && this.#states.get(state.requestId) !== state)
      throw new ConvoHopProblem("IDEMPOTENCY_CONFLICT", state.requestId, "unknown", 409, "Preserve the original request and payload");
    const journal = new Map<string, JournalEntry>();
    for (const [requestId, entry] of stored) {
      const held = this.#states.get(requestId);
      journal.set(requestId, held === undefined ? entry : { state: held,
        record: entry.state !== undefined && sameRequest(held, entry.state) ? { ...entry.record, ...held } : { ...held } });
    }
    for (const [requestId, held] of this.#states) if (!journal.has(requestId)) journal.set(requestId, { record: { ...held }, state: held });
    if (journal.size > journalLimit) {
      const retained = this.#retained(), now = Date.now();
      const done = ([requestId, { state: value }]: [string, JournalEntry]) =>
        value !== undefined && final(value, now) && !retained.has(requestId);
      const oldest = [...journal].sort(([, a], [, b]) => lastAttempt(a) - lastAttempt(b));
      const others = oldest.filter(([requestId]) => !this.#states.has(requestId));
      const dropped = [...others.filter(done),
        ...oldest.filter(entry => entry[1].state !== state && this.#states.has(entry[0]) && done(entry) && !this.#active.has(entry[0])),
        ...(created ? [] : others.filter(entry => !done(entry)))].slice(0, journal.size - journalLimit);
      if (journal.size - dropped.length > journalLimit) {
        if (created) this.#states.delete(state.requestId);
        throw recoveryLimit(state.requestId, created ? "rejected" : outcomeOf(state));
      }
      for (const [requestId] of dropped) {
        journal.delete(requestId);
        this.#states.delete(requestId);
      }
    }
    return [...journal.values()].map(({ record }) => record);
  }
  /** Takes in the stored journal and, when this transport holds no record of `requestId`, the stored one. Never writes. */
  async #refresh(requestId: string): Promise<void> {
    let stored: Map<string, JournalEntry>;
    const asyncStorage = this.#asyncStorage, storage = this.#storage;
    if (asyncStorage !== undefined) {
      try { stored = await this.#load(asyncStorage); }
      catch (cause) { throw storageFailure(requestId, this.#states.get(requestId), cause, true); }
    } else if (storage !== undefined) stored = parseJournal(storage.getItem(this.#storageKey));
    else return;
    this.#learn(stored);
    const saved = stored.get(requestId)?.state;
    if (saved !== undefined && !this.#states.has(requestId)) {
      this.#reserve(requestId, outcomeOf(saved));
      this.#states.set(requestId, saved);
    }
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
        this.#reserve(requestId, "rejected");
        const now = Date.now();
        state = { requestId, incarnation, payloadFingerprint: hash, operation,
          ...(projectId === undefined ? {} : { projectId }), input: jsonClone(input),
          firstSubmittedAt: now, retryDeadline: now + 60000,
          attemptCount: 0, lastAttemptAt: now, lastAttemptClassification: "notSubmitted", resolutionState: "pending" };
        this.#states.set(requestId, state);
        await this.#persist(state, "creating");
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
    const hook = submissionHooks.get(this)?.get(state.requestId);
    if (hook) await hook();
    // Until its first attempt is stored, nothing of this request has been sent: it still yields to another saved under its ID.
    const unsent = unsubmitted(state), prior = state.resolutionState;
    state.attemptCount += 1; state.lastAttemptAt = now;
    const attempt = state.attemptCount;
    if (state.resolutionState === "pending" || state.resolutionState === "rejected") state.resolutionState = "unknown";
    state.lastAttemptClassification = "submitted"; await this.#persist(state, unsent ? "submitting" : undefined);
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
      // A rejection is the request's outcome only if every attempt was rejected: those known before this one, and any
      // other client's attempt that the record took in since, which would have changed its count or time.
      if (error instanceof ConvoHopProblem && error.outcome === "rejected" && (prior === "pending" || prior === "rejected") &&
          state.resolutionState === "unknown" && state.attemptCount === attempt && state.lastAttemptAt === now)
        state.resolutionState = "rejected";
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
    // Another client sharing the journal may have saved this request or learned more of it.
    await this.#refresh(requestId);
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
    try { decoded = JSON.parse(text); } catch {
      // A proxy's or gateway's error page isn't JSON, but its Retry-After still bounds the next attempt.
      const retryAfter = retryDelay(response.headers.get("retry-after"));
      throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", response.status, "Unrecognized authority response",
        retryAfter === undefined ? undefined : { retryAfter });
    }
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
/**
 * @internal Runs `hook` before each submission of `requestId` within its retry budget: after the transport has
 * stored the request's recovery record, and before it counts and sends the attempt, which wait for the hook. A
 * caller that records that the request may have been sent does so here, so storage never holds that note without
 * the record that recovers the request. If the hook throws, nothing is sent and the submission fails with its error.
 * Returns a function that removes the hook.
 */
export function beforeSubmitting(transport: ConvoHopTransport, requestId: string, hook: () => void | Promise<void>): () => void {
  const key = parseId(requestId);
  const hooks = submissionHooks.get(transport) ?? new Map<string, () => void | Promise<void>>();
  submissionHooks.set(transport, hooks);
  hooks.set(key, hook);
  return () => { if (hooks.get(key) === hook) hooks.delete(key); };
}
/**
 * @internal Looks in storage for a recovery record of `requestId` that this transport doesn't hold, such as one saved
 * by another tab sharing the journal, and takes it over, so the request is recovered rather than resolved as lost.
 * Resolves to whether the transport now holds a record of `requestId`.
 */
export async function adoptRecovery(transport: ConvoHopTransport, requestId: string): Promise<boolean> {
  const adopt = recoveryAdoption.get(transport);
  if (!adopt) throw new Error("Missing transport recovery");
  return adopt(parseId(requestId));
}
/**
 * @internal Keeps the records of the request IDs that `requestIds` lists, each time the transport makes room, from
 * being forgotten or dropped, though they are final: a caller that may still resend or report a request retains its
 * record. Returns a function that stops retaining them.
 */
export function retainRecovery(transport: ConvoHopTransport, requestIds: () => Iterable<string>): () => void {
  const retainers = recoveryRetainers.get(transport) ?? new Set<() => Iterable<string>>();
  recoveryRetainers.set(transport, retainers);
  const retainer = () => requestIds();
  retainers.add(retainer);
  return () => { retainers.delete(retainer); };
}
