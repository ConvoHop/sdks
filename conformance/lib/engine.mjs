// Executes analysed scenarios against one target through the driver under test (the primary) and an
// optional fixture driver that serves roles the primary does not declare (spec/conformance/README.md#execution).
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { ControlClient } from "./control.mjs";
import { DriverFailure, startDriver } from "./driver-client.mjs";
import { MissingValue, Scope } from "./interpolate.mjs";
import { deepEqual } from "./json-schema.mjs";
import { match, show, validateMatcher } from "./matchers.mjs";

const REQUEST_TIMEOUT_MS = 90_000;
const DEFAULT_COLLECT_TIMEOUT_MS = 10_000;
const DEFAULT_WAIT_LOG_TIMEOUT_MS = 5_000;
const MESSAGE_LIMIT = 1_000;
const MIN_SECRET_LENGTH = 8;
// Saved values with these keys are bearer material and are redacted from failure messages.
const SECRET_KEYS = new Set(["sessionToken", "token", "accessToken", "credential", "connectToken", "transportToken"]);

/** A scenario expectation did not hold. */
export class StepFailure extends Error {
  constructor(message) { super(message); this.name = "StepFailure"; }
}

const reason = error => error instanceof Error ? error.message : String(error);
const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const plural = (count, word) => `${word}${count === 1 ? "" : "s"}`;

export const formatSdkError = error =>
  `${error.code} (status ${error.status ?? "none"}, outcome ${error.outcome ?? "none"}): ${error.message}`;

function walk(value, path) {
  let current = value;
  for (const segment of path.split(".")) {
    if (!isObject(current) || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

/** Adds bearer material found under SECRET_KEYS anywhere in `value` to `into`. */
export function collectSecrets(value, into = new Set()) {
  if (Array.isArray(value)) value.forEach(item => collectSecrets(item, into));
  else if (isObject(value)) for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEYS.has(key) && typeof item === "string" && item.length >= MIN_SECRET_LENGTH) into.add(item);
    else collectSecrets(item, into);
  }
  return into;
}

export function redact(text, secrets) {
  let result = text;
  for (const secret of [...secrets].sort((left, right) => right.length - left.length))
    if (secret.length >= MIN_SECRET_LENGTH) result = result.replaceAll(secret, "[redacted]");
  return result;
}

const truncate = text => text.length > MESSAGE_LIMIT ? `${text.slice(0, MESSAGE_LIMIT - 3)}...` : text;

/** One driver process the runner talks to, restarted when it dies during a scenario. */
export class DriverSlot {
  #options;

  constructor(kind, command, options) {
    this.kind = kind;
    this.command = command;
    this.#options = options;
    this.driver = undefined;
    this.hello = undefined;
    this.failure = undefined;
  }

  get started() { return this.hello !== undefined; }

  get label() {
    const name = this.hello ? ` ${this.hello.driver.name}` : "";
    return this.kind === "primary" ? `driver${name}` : `fixture driver${name}`;
  }

  async start() {
    const { driver, hello } = await startDriver(this.command, this.#options);
    this.driver = driver;
    this.hello = hello;
    return hello;
  }

  serves(role) { return this.started && Object.hasOwn(this.hello.roles, role); }

  implements(role, operation) { return this.serves(role) && this.hello.roles[role].operations.includes(operation); }

  declares(feature) { return this.started && this.hello.features.includes(feature); }

  /** Replaces a driver that died; a failed or inconsistent restart leaves the slot unusable. */
  async recover() {
    if (!this.started || this.failure !== undefined || this.driver.alive) return;
    await this.driver.shutdown();
    try {
      const { driver, hello } = await startDriver(this.command, this.#options);
      if (!deepEqual(hello, this.hello)) {
        await driver.shutdown();
        throw new Error("the restarted driver declared different roles, operations or features");
      }
      this.driver = driver;
    } catch (error) {
      this.failure = `it died and could not be restarted: ${reason(error)}`;
    }
  }

  async stop() { if (this.driver) await this.driver.shutdown(); }
}

export class Engine {
  /**
   * @param descriptor validated target descriptor
   * @param primary started DriverSlot for the driver under test
   * @param fixture optional DriverSlot (started or not) for roles the primary lacks
   * @param vectors webhook vectors by id
   */
  constructor({ descriptor, primary, fixture, vectors }) {
    this.descriptor = descriptor;
    this.capabilities = new Set(descriptor.capabilities ?? []);
    this.primary = primary;
    this.fixture = fixture;
    this.vectors = vectors;
    this.control = descriptor.control === undefined ? undefined : new ControlClient(descriptor.control);
    // Bearer material learned anywhere in the run stays redacted for the rest of it: a driver's
    // stderr tail and a failed restart can repeat what an earlier scenario used.
    this.secrets = new Set(Object.values(descriptor.credentials ?? {}));
  }

  get slots() { return [this.primary, this.fixture].filter(slot => slot?.started); }

  /** The driver that serves `role`: the primary when it declares the role, otherwise a started fixture. */
  slotFor(role) {
    if (this.primary.serves(role)) return this.primary;
    if (this.fixture?.serves(role)) return this.fixture;
    return undefined;
  }

  /** Why a scenario cannot run against this target and these drivers; empty when it can. */
  skipReasons({ roles, operations, features, capabilities, targetFields }) {
    const reasons = [];
    const unserved = [...roles].filter(role => !this.slotFor(role));
    if (unserved.length) reasons.push(`no driver declares the ${unserved.join(", ")} ${plural(unserved.length, "role")}`);
    const primaryFeature = [...features].some(entry => entry.startsWith("primary:"));
    if (roles.size && !primaryFeature && ![...roles].some(role => this.primary.serves(role)))
      reasons.push(`it only uses ${[...roles].join(", ")} clients, which the driver under test does not declare`);
    for (const entry of operations) {
      const [role, operation] = entry.split(":");
      const slot = this.slotFor(role);
      if (slot && !slot.implements(role, operation)) reasons.push(`${slot.label} does not implement ${operation} for ${role} clients`);
    }
    for (const entry of features) {
      const [owner, feature] = entry.split(":");
      const slot = owner === "primary" ? this.primary : this.slotFor(owner);
      if (slot && !slot.declares(feature)) reasons.push(`${slot.label} does not declare feature ${feature}`);
    }
    for (const capability of capabilities)
      if (!this.capabilities.has(capability)) reasons.push(`target lacks capability ${capability}`);
    for (const field of targetFields)
      if (walk(this.descriptor, field) === undefined) reasons.push(`target does not provide ${field}`);
    return [...new Set(reasons)];
  }

  async runScenario({ definition, requirements }) {
    const started = performance.now();
    const finish = (status, extra = {}) => ({ id: definition.id, title: definition.title, covers: definition.covers, status,
      durationMs: Math.round(performance.now() - started), ...extra });
    const reasons = this.skipReasons(requirements);
    if (reasons.length) return finish("skipped", { reason: reasons.join("; ") });
    const broken = this.slots.find(slot => slot.failure !== undefined);
    if (broken) return finish("failed", { failure: { step: null, do: null,
      message: truncate(redact(`${broken.label} is unusable: ${broken.failure}`, this.secrets)) } });

    const state = { scope: new Scope(this.descriptor), clients: new Map(), subscriptions: new Map() };
    let outcome;
    try {
      await this.#prepare();
    } catch (error) {
      outcome = finish("failed", { failure: { step: null, do: null, message: `preparing the scenario failed: ${this.#describe(error)}` } });
    }
    if (!outcome) {
      for (const [index, step] of definition.steps.entries()) {
        try {
          await this.#execute(step, state);
        } catch (error) {
          outcome = error instanceof MissingValue ? finish("skipped", { reason: error.message })
            : finish("failed", { failure: { step: index + 1, do: step.do, message: this.#describe(error) } });
          break;
        }
      }
    }
    for (const slot of this.slots) await slot.recover();
    return outcome ?? finish("passed");
  }

  async #prepare() {
    for (const slot of this.slots) await slot.driver.request("reset", {}, { timeoutMs: 30_000 });
    if (this.capabilities.has("control.reset")) await this.control.reset();
  }

  #describe(error) {
    let text = reason(error);
    if (error instanceof DriverFailure) {
      for (const slot of this.slots) {
        if (slot.driver.alive) continue;
        const tail = slot.driver.stderrTail(15);
        text += `\n(${slot.label} died${tail ? `; stderr:\n${tail}` : " without writing to stderr"})`;
      }
    }
    return truncate(redact(text, this.secrets));
  }

  #execute(step, state) {
    switch (step.do) {
      case "client.create": return this.#createClient(step, state);
      case "client.close": return this.#closeClient(step, state);
      case "invoke": return this.#invoke(step, state);
      case "realtime.subscribe": return this.#subscribe(step, state);
      case "realtime.collect": return this.#collect(step, state);
      case "realtime.close": return this.#closeSubscription(step, state);
      case "webhooks.verify": return this.#verify(step);
      case "control.fault": return this.#fault(step, state);
      case "control.realtimeDrop": return this.#drop(step, state);
      case "control.waitLog": return this.#waitLog(step, state);
      case "sleep": return delay(step.ms);
      default: throw new StepFailure(`unknown step ${step.do}`);
    }
  }

  #client(handle, state) {
    const entry = state.clients.get(handle);
    if (!entry) throw new StepFailure(`client ${handle} is not open`);
    return entry;
  }

  #subscription(handle, state) {
    const entry = state.subscriptions.get(handle);
    if (!entry) throw new StepFailure(`subscription ${handle} is not open`);
    return entry;
  }

  #text(value, field) {
    if (typeof value !== "string" || !value) throw new StepFailure(`${field} must resolve to a non-empty string, not ${show(value)}`);
    return value;
  }

  #expect(actual, pattern, state, context) {
    const resolved = state.scope.interpolate(pattern);
    const problems = validateMatcher(resolved);
    if (problems.length) throw new StepFailure(`the expectation is invalid after interpolation: ${problems.join("; ")}`);
    const failures = match(actual, resolved);
    if (!failures.length) return;
    const shown = failures.slice(0, 8).join("\n  ");
    throw new StepFailure(`${context}:\n  ${shown}${failures.length > 8 ? `\n  ... and ${failures.length - 8} more` : ""}`);
  }

  #save(name, value, state) {
    collectSecrets(value, this.secrets);
    if (name !== undefined) state.scope.saved.set(name, structuredClone(value));
  }

  async #createClient(step, state) {
    const slot = this.slotFor(step.role);
    const optional = ["principalId", "projectId", "incarnation", "actorId", "baseUrl", "storage"];
    const values = {};
    for (const field of ["credential", ...optional])
      if (step[field] !== undefined) values[field] = this.#text(state.scope.interpolate(step[field]), field);
    const management = step.role === "management";
    const params = { client: step.client, role: step.role, credential: values.credential,
      baseUrl: values.baseUrl ?? (management ? this.descriptor.managementUrl : this.descriptor.communicationUrl) };
    if (management) params.actorId = values.actorId ?? this.descriptor.managementActorId;
    else {
      params.projectId = values.projectId ?? this.descriptor.projectId;
      params.incarnation = values.incarnation ?? this.descriptor.incarnation;
    }
    if (values.principalId !== undefined) params.principalId = values.principalId;
    if (values.storage !== undefined) params.storage = values.storage;
    if (params.credential.length >= MIN_SECRET_LENGTH) this.secrets.add(params.credential);
    await slot.driver.request("client.create", params);
    state.clients.set(step.client, { slot, role: step.role });
  }

  async #closeClient(step, state) {
    const { slot } = this.#client(step.client, state);
    await slot.driver.request("client.close", { client: step.client });
    state.clients.delete(step.client);
    for (const [handle, entry] of state.subscriptions) if (entry.client === step.client) state.subscriptions.delete(handle);
  }

  async #invoke(step, state) {
    const { slot } = this.#client(step.client, state);
    const params = { client: step.client, operation: step.operation };
    if (step.args !== undefined) params.args = state.scope.interpolate(step.args);
    const result = await slot.driver.request("invoke", params, { timeoutMs: REQUEST_TIMEOUT_MS });
    // Learn bearer material before any expectation can echo it into a failure message.
    if (result.ok) collectSecrets(result.value, this.secrets);
    if (step.expect !== undefined && Object.hasOwn(step.expect, "error")) {
      if (result.ok) throw new StepFailure(`${step.operation} succeeded but an error was expected; it returned ${show(result.value)}`);
      this.#expect(result.error, step.expect.error, state,
        `${step.operation} failed with ${formatSdkError(result.error)}, which does not match the expected error`);
      this.#save(step.save, result.error, state);
      return;
    }
    if (!result.ok) throw new StepFailure(`${step.operation} failed with ${formatSdkError(result.error)}`);
    if (step.expect !== undefined) this.#expect(result.value, step.expect.value, state, `${step.operation} returned an unexpected value`);
    this.#save(step.save, result.value, state);
  }

  async #subscribe(step, state) {
    const { slot } = this.#client(step.client, state);
    const conversationId = this.#text(state.scope.interpolate(step.conversationId), "conversationId");
    const result = await slot.driver.request("realtime.subscribe",
      { client: step.client, subscription: step.subscription, conversationId }, { timeoutMs: REQUEST_TIMEOUT_MS });
    if (step.expect === undefined) {
      if (!result.ok) throw new StepFailure(`subscribing failed with ${formatSdkError(result.error)}`);
      state.subscriptions.set(step.subscription, { slot, client: step.client });
      return;
    }
    if (result.ok) throw new StepFailure("subscribing succeeded but an error was expected");
    this.#expect(result.error, step.expect.error, state,
      `subscribing failed with ${formatSdkError(result.error)}, which does not match the expected error`);
  }

  async #collect(step, state) {
    const { slot } = this.#subscription(step.subscription, state);
    const timeoutMs = step.timeoutMs ?? DEFAULT_COLLECT_TIMEOUT_MS, settleMs = step.settleMs ?? 0;
    const params = { subscription: step.subscription, timeoutMs };
    if (settleMs) params.settleMs = settleMs;
    if (step.until !== undefined) {
      params.until = state.scope.interpolate(step.until);
      if (params.until.sequence !== undefined) this.#text(params.until.sequence, "until.sequence");
    }
    const result = await slot.driver.request("realtime.collect", params, { timeoutMs: timeoutMs + settleMs + 10_000 });
    const expected = { errors: [], closed: step.until?.closed === true, timedOut: false, ...step.expect };
    const received = () => {
      const last = result.events.at(-1);
      const sequence = isObject(last) && typeof last.sequence === "string" ? `, last sequence ${last.sequence}` : "";
      return `${result.events.length} ${plural(result.events.length, "event")}${sequence}`;
    };
    if (step.expect?.errors === undefined && result.errors.length)
      throw new StepFailure(`the subscription reported ${plural(result.errors.length, "error")}: ${result.errors.map(formatSdkError).join("; ")}`);
    this.#expect(result.errors, expected.errors, state, "the subscription reported unexpected errors");
    if (result.closed !== expected.closed)
      throw new StepFailure(result.closed ? `the subscription closed unexpectedly after ${received()}`
        : `the subscription was expected to close but stayed open (${received()})`);
    if (result.timedOut !== expected.timedOut)
      throw new StepFailure(result.timedOut ? `the subscription did not reach ${show(params.until)} within ${timeoutMs} ms (${received()})`
        : "the wait was expected to time out but its condition was met");
    if (expected.events !== undefined) this.#expect(result.events, expected.events, state, "the subscription delivered unexpected events");
    this.#save(step.save, result, state);
  }

  async #closeSubscription(step, state) {
    const { slot } = this.#subscription(step.subscription, state);
    await slot.driver.request("realtime.close", { subscription: step.subscription });
    state.subscriptions.delete(step.subscription);
  }

  async #verify(step) {
    const vector = this.vectors.get(step.vector);
    const { payload, headers, secrets, nowSeconds, toleranceSeconds, expected } = vector;
    const result = await this.primary.driver.request("webhooks.verify", { payload, headers, secrets, nowSeconds, toleranceSeconds });
    if (!deepEqual(result, expected))
      throw new StepFailure(`vector ${vector.id} (${vector.title}) expected ${show(expected)} but the driver returned ${show(result)}`);
  }

  async #fault(step, state) {
    const values = state.scope.interpolate({ plane: step.plane, field: step.field, action: step.action });
    await this.control.fault({ ...values, retryAfterSeconds: step.retryAfterSeconds });
  }

  async #drop(step, state) {
    const values = {};
    for (const field of ["conversationId", "code", "reason"]) if (step[field] !== undefined) values[field] = state.scope.interpolate(step[field]);
    const result = await this.control.realtimeDrop(values);
    if (step.expect !== undefined) this.#expect(result.closed, step.expect.closed, state, "the target closed an unexpected number of sockets");
  }

  async #waitLog(step, state) {
    const result = await this.control.waitLog({ kind: step.kind, match: state.scope.interpolate(step.match ?? {}),
      count: step.count ?? 1, timeoutMs: step.timeoutMs ?? DEFAULT_WAIT_LOG_TIMEOUT_MS });
    if (step.expect !== undefined) this.#expect(result.entries, step.expect, state, "the target log has unexpected entries");
    this.#save(step.save, result.entries, state);
  }
}
