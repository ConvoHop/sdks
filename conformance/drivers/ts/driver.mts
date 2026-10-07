// ConvoHop conformance reference driver: NDJSON over stdio, protocol v1 (spec/conformance/driver-protocol.md).
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { ParamsError, counter, handle, integer, isRecord, optionalText, record, text, type Args } from "./params.mjs";
import { FEATURES, MemoryStorage, OPERATIONS, PACKAGES, ROLES, createClient, driverError, operation, verifyWebhook, watch,
  type DriverError, type RealtimeHandle, type Role, type SdkClient } from "./sdk.mjs";

const PROTOCOL_VERSION = 1;
const DRIVER = { name: "convohop-typescript-reference", version: "0.1.0", language: "typescript" } as const;

type ProtocolCode = "INVALID_REQUEST" | "PROTOCOL_VERSION_UNSUPPORTED" | "UNKNOWN_METHOD" | "INVALID_PARAMS" |
  "UNKNOWN_HANDLE" | "UNSUPPORTED" | "DRIVER_FAILURE";

class ProtocolError extends Error {
  constructor(readonly code: ProtocolCode, message: string) { super(message); }
}

interface Subscription {
  readonly client: string;
  readonly events: unknown[];
  readonly errors: DriverError[];
  readonly waiters: Set<() => void>;
  stream: RealtimeHandle | undefined;
  stopped: boolean;
}

const isRole = (value: string): value is Role => ROLES.some(role => role === value);

// --roles narrows the declared roles, e.g. "--roles user" to behave like a client-only SDK driver.
function declaredRoles(): readonly Role[] {
  const { values } = parseArgs({ options: { roles: { type: "string" } }, strict: true });
  if (values.roles === undefined) return ROLES;
  const requested = values.roles.split(",").map(role => role.trim());
  if (!requested.every(isRole)) {
    process.stderr.write(`--roles must be a comma-separated subset of ${ROLES.join(", ")}\n`);
    process.exit(2);
  }
  return ROLES.filter(role => requested.includes(role));
}

const roles = declaredRoles();
const clients = new Map<string, SdkClient>();
const subscriptions = new Map<string, Subscription>();
const storages = new Map<string, MemoryStorage>();
let negotiated = false;

function client(args: Args): [string, SdkClient] {
  const name = text(args, "client"), found = clients.get(name);
  if (!found) throw new ProtocolError("UNKNOWN_HANDLE", `Unknown client handle ${name}`);
  return [name, found];
}

function subscription(args: Args): [string, Subscription] {
  const name = text(args, "subscription"), found = subscriptions.get(name);
  if (!found) throw new ProtocolError("UNKNOWN_HANDLE", `Unknown subscription handle ${name}`);
  return [name, found];
}

function stop(entry: Subscription): void {
  entry.stopped = true;
  entry.stream?.close();
  for (const wake of entry.waiters) wake();
}

function hello(args: Args): unknown {
  if (negotiated) throw new ProtocolError("INVALID_REQUEST", "hello was already negotiated");
  const versions = args.protocolVersions;
  if (!Array.isArray(versions) || !versions.every(version => Number.isSafeInteger(version)))
    throw new ParamsError("protocolVersions must be an array of integers");
  if (!versions.includes(PROTOCOL_VERSION))
    throw new ProtocolError("PROTOCOL_VERSION_UNSUPPORTED", `This driver speaks protocol version ${PROTOCOL_VERSION}`);
  negotiated = true;
  return { protocolVersion: PROTOCOL_VERSION, driver: { ...DRIVER, packages: PACKAGES },
    roles: Object.fromEntries(roles.map(role => [role, { operations: OPERATIONS[role] }])), features: FEATURES };
}

function createHandle(args: Args): unknown {
  const name = handle(args, "client");
  if (clients.has(name)) throw new ParamsError(`Client handle ${name} already exists`);
  const role = text(args, "role");
  if (!isRole(role)) throw new ParamsError(`role must be one of ${ROLES.join(", ")}`);
  if (!roles.includes(role)) throw new ProtocolError("UNSUPPORTED", `This driver does not declare the ${role} role`);
  const storageName = args.storage === undefined ? undefined : handle(args, "storage");
  const storage = storageName === undefined ? undefined : storages.get(storageName) ?? new MemoryStorage();
  clients.set(name, createClient({ role, baseUrl: text(args, "baseUrl"), credential: text(args, "credential"),
    projectId: optionalText(args, "projectId"), incarnation: optionalText(args, "incarnation"),
    principalId: optionalText(args, "principalId"), actorId: optionalText(args, "actorId"), storage }));
  if (storageName !== undefined && storage) storages.set(storageName, storage);
  return {};
}

function closeHandle(args: Args): unknown {
  const [name] = client(args);
  clients.delete(name);
  for (const [id, entry] of subscriptions) if (entry.client === name) { stop(entry); subscriptions.delete(id); }
  return {};
}

async function invoke(args: Args): Promise<unknown> {
  const [, target] = client(args);
  const name = text(args, "operation");
  const input = args.args === undefined ? {} : record(args.args, "args");
  try {
    const pending = operation(target, name, input);
    if (!pending) throw new ProtocolError("UNSUPPORTED", `The ${target.role} role does not implement ${name}`);
    return { ok: true, value: (await pending) ?? null };
  } catch (error) {
    if (error instanceof ParamsError || error instanceof ProtocolError) throw error;
    return { ok: false, error: driverError(error) };
  }
}

async function subscribe(args: Args): Promise<unknown> {
  const [owner, target] = client(args);
  if (target.role !== "user") throw new ParamsError("Realtime subscriptions require a user client");
  const name = handle(args, "subscription");
  if (subscriptions.has(name)) throw new ParamsError(`Subscription handle ${name} already exists`);
  const conversationId = text(args, "conversationId");
  const entry: Subscription = { client: owner, events: [], errors: [], waiters: new Set(), stream: undefined, stopped: false };
  const wake = (): void => { for (const waiter of entry.waiters) waiter(); };
  try {
    entry.stream = await watch(target, conversationId, {
      events: events => { if (!entry.stopped) { entry.events.push(...events); wake(); } },
      error: error => { if (!entry.stopped) { entry.errors.push(error); wake(); } },
    });
  } catch (error) {
    if (error instanceof ParamsError) throw error;
    return { ok: false, error: driverError(error) };
  }
  subscriptions.set(name, entry);
  return { ok: true };
}

function condition(until: Args): (entry: Subscription) => boolean {
  const count = integer(until, "count", 0, 100_000), sequence = counter(until, "sequence");
  if (until.closed !== undefined && until.closed !== true) throw new ParamsError("until.closed must be true when present");
  const closed = until.closed === true;
  return entry => (count === undefined || entry.events.length >= count) && (sequence === undefined ||
    entry.events.some(event => isRecord(event) && typeof event.sequence === "string" && BigInt(event.sequence) >= sequence)) &&
    (!closed || entry.stream?.closed === true);
}

async function collect(args: Args): Promise<unknown> {
  const [, entry] = subscription(args);
  const reached = condition(args.until === undefined ? {} : record(args.until, "until"));
  const timeoutMs = integer(args, "timeoutMs", 0, 60_000), settleMs = integer(args, "settleMs", 0, 10_000) ?? 0;
  if (timeoutMs === undefined) throw new ParamsError("timeoutMs is required");
  const finished = (): boolean => reached(entry) || entry.stopped || entry.stream?.closed === true;
  if (!finished()) await new Promise<void>(resolve => {
    const done = (): void => { clearTimeout(timer); entry.waiters.delete(check); resolve(); };
    const check = (): void => { if (finished()) done(); };
    const timer = setTimeout(done, timeoutMs);
    entry.waiters.add(check);
  });
  if (settleMs) await delay(settleMs);
  const satisfied = reached(entry), closed = entry.stream?.closed === true;
  return { events: structuredClone(entry.events), errors: structuredClone(entry.errors), closed,
    timedOut: !satisfied && !closed };
}

function closeSubscription(args: Args): unknown {
  const [name, entry] = subscription(args);
  stop(entry);
  subscriptions.delete(name);
  return {};
}

function reset(): unknown {
  for (const entry of subscriptions.values()) stop(entry);
  subscriptions.clear(); clients.clear(); storages.clear();
  return {};
}

function dispatch(method: string, args: Args): unknown {
  if (!negotiated && method !== "hello") throw new ProtocolError("INVALID_REQUEST", "hello must be the first request");
  switch (method) {
    case "hello": return hello(args);
    case "client.create": return createHandle(args);
    case "client.close": return closeHandle(args);
    case "invoke": return invoke(args);
    case "realtime.subscribe": return subscribe(args);
    case "realtime.collect": return collect(args);
    case "realtime.close": return closeSubscription(args);
    case "webhooks.verify": return verifyWebhook(args);
    case "reset": return reset();
    case "shutdown": return {};
    default: throw new ProtocolError("UNKNOWN_METHOD", `Unknown method ${method}`);
  }
}

function write(message: unknown, then?: () => void): void {
  process.stdout.write(`${JSON.stringify(message)}\n`, then);
}

function failure(error: unknown): { code: ProtocolCode; message: string } {
  if (error instanceof ProtocolError) return { code: error.code, message: error.message };
  if (error instanceof ParamsError) return { code: "INVALID_PARAMS", message: error.message };
  return { code: "DRIVER_FAILURE", message: error instanceof Error ? error.message : "Driver failure" };
}

async function handleLine(line: string): Promise<void> {
  if (!line.trim()) return;
  let request: unknown;
  try { request = JSON.parse(line); }
  catch { write({ id: null, error: { code: "INVALID_REQUEST", message: "Request is not valid JSON" } }); return; }
  const id = isRecord(request) && typeof request.id === "number" && Number.isSafeInteger(request.id) && request.id >= 1
    ? request.id : null;
  try {
    if (!isRecord(request) || id === null) throw new ProtocolError("INVALID_REQUEST", "id must be a positive integer");
    const method = request.method, params = request.params ?? {};
    if (typeof method !== "string") throw new ProtocolError("INVALID_REQUEST", "method must be a string");
    if (!isRecord(params)) throw new ProtocolError("INVALID_REQUEST", "params must be an object");
    const result = await dispatch(method, params);
    if (method === "shutdown") { reset(); write({ id, result }, () => process.exit(0)); return; }
    write({ id, result });
  } catch (error) {
    write({ id, error: failure(error) });
  }
}

process.stdout.on("error", () => process.exit(0));
let queue = Promise.resolve();
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", line => { queue = queue.then(() => handleLine(line)); });
input.on("close", () => { queue = queue.then(() => { reset(); process.exit(0); }); });
