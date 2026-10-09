// The React Native driver's SDK module: the reference protocol loop, ../ts/dist/driver.mjs, loads it in place of the
// reference's sdk.mjs (see driver.mjs). It maps catalog operations to the @convohop/client calls an app makes on the
// React Native platform. Apps hold user sessions, never backend keys, so it declares only the user role, and the
// runner's fixture driver serves the backend and management clients that set scenarios up.
import { createRequire } from "node:module";
import { ConvoHopClient, ConvoHopProblem, parseCursor, parseMessage } from "@convohop/client";
import { createPlatform } from "@convohop/react-native";
import { ParamsError, optionalText, text } from "../ts/dist/params.mjs";

export const DRIVER = Object.freeze({ name: "convohop-react-native", version: "0.1.0", language: "typescript" });
export const ROLES = Object.freeze(["user"]);
// A client SDK doesn't verify webhooks: that is the backend's job.
export const FEATURES = Object.freeze(["realtime", "realtime.reconnectPolicy", "recovery.eviction", "recovery.storage", "retryAfter"]);

// One platform for the process, as an app creates one and shares it between clients.
const platform = createPlatform();

/** The same projection of SDK failures as the reference driver's (spec/conformance/driver-protocol.md). */
export function driverError(error) {
  if (error instanceof ConvoHopProblem) return { code: error.code, status: error.status === 0 ? null : error.status,
    outcome: error.outcome, requestId: error.requestId,
    retryAfterMs: error.retryAfter === undefined ? null : error.retryAfter * 1000, message: error.message };
  return { code: "SDK_ERROR", status: null, outcome: null, requestId: null, retryAfterMs: null,
    message: error instanceof Error ? error.message : "Non-error rejection" };
}

const later = work => new Promise((resolve, reject) => setTimeout(() => {
  try { resolve(work()); } catch (error) { reject(error); }
}, 0));

/**
 * In-memory recovery storage with AsyncStorage's promise API, which apps pass as `asyncRecoveryStorage`. Each call
 * settles on a later task, in order, as a native storage module's would.
 */
export class MemoryStorage {
  #values = new Map();
  getItem(key) { return later(() => this.#values.get(key) ?? null); }
  setItem(key, value) { return later(() => { this.#values.set(key, String(value)); }); }
  removeItem(key) { return later(() => { this.#values.delete(key); }); }
}

function required(value, name) {
  if (value === undefined) throw new ParamsError(`${name} is required for this role`);
  return value;
}

/** Constructs a user client on the React Native platform without network I/O; validation failures are INVALID_PARAMS. */
export function createClient(spec) {
  if (spec.role !== "user") throw new ParamsError(`The React Native SDK has no ${spec.role} clients`);
  try {
    return { role: "user", sdk: new ConvoHopClient({ baseUrl: spec.baseUrl, projectId: required(spec.projectId, "projectId"),
      incarnation: required(spec.incarnation, "incarnation"), principalId: required(spec.principalId, "principalId"),
      sessionToken: spec.credential, platform, ...(spec.storage === undefined ? {} : { asyncRecoveryStorage: spec.storage }) }) };
  } catch (error) {
    if (error instanceof ParamsError) throw error;
    throw new ParamsError(error instanceof Error ? error.message : "Invalid client options");
  }
}

function decode(parse, value, name) {
  try { return parse(value); }
  catch { throw new ParamsError(`${name} is not a valid protocol value`); }
}

const message = args => decode(parseMessage, args.message, "message");
const cursor = args => args.after === undefined ? undefined : decode(parseCursor, args.after, "after");

// A user session always acts as its own principal; silently ignoring actAs would hide a scenario error.
function own(args) {
  if (args.actAs !== undefined) throw new ParamsError("actAs is only available to backend clients");
  return args;
}

// The reference driver's user operations; conformance/test/react-native-driver.test.mjs keeps the two lists equal.
const user = new Map(Object.entries({
  "route.initialize": client => client.initialize(),
  "conversations.get": (client, args) => client.getConversation(text(args, "conversationId")),
  "messages.list": (client, args) => client.messages(text(own(args), "conversationId"), optionalText(args, "beforeSequence")),
  "messages.send": (client, args) =>
    client.send(text(own(args), "conversationId"), text(args, "text"), optionalText(args, "requestId")),
  "messages.edit": (client, args) => client.edit(message(args), text(args, "text"), optionalText(args, "requestId")),
  "messages.delete": (client, args) => client.delete(message(args), optionalText(args, "requestId")),
  "events.list": (client, args) => client.events(text(args, "conversationId"), cursor(args)),
  "requests.resolve": (client, args) => client.requests.resolve(text(args, "requestId")),
  "requests.retry": (client, args) => client.requests.retry(text(args, "requestId")),
}));

export const OPERATIONS = Object.freeze({ user: [...user.keys()], backend: [], management: [] });

/** Starts an operation; undefined means the role does not implement it. Decoding failures throw ParamsError. */
export function operation(client, name, args) {
  return client.role === "user" ? user.get(name)?.(client.sdk, args) : undefined;
}

/** Opens the SDK's replay-then-subscribe watcher; resolves once initial reconciliation has been applied. */
export function watch(client, conversationId, sink) {
  if (client.role !== "user") throw new ParamsError("Realtime subscriptions require a user client");
  return client.sdk.watch(conversationId, async events => sink.events(events), error => sink.error(driverError(error)));
}

// The protocol loop answers webhooks.verify with UNSUPPORTED, because FEATURES omits it.
export function verifyWebhook() {
  throw new Error("The React Native SDK does not verify webhooks");
}

const require = createRequire(import.meta.url);
export const PACKAGES = Object.freeze(Object.fromEntries(["@convohop/core", "@convohop/client", "@convohop/react-native"]
  .map(name => [name, require(`${name}/package.json`).version ?? "unknown"])));
