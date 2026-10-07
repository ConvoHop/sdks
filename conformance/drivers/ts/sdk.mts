// The only driver module that imports SDK packages: retarget the reference driver here.
import { createRequire } from "node:module";
import { V1Client, V1Problem, v1Cursor, v1Message } from "@convohop/client";
import type { V1Cursor, V1Graphql, V1Message, V1Record, V1RecoveryStorage } from "@convohop/client";
import { V1ManagementClient, V1ProjectServerClient, WebhookVerificationError, webhooks } from "@convohop/server";
import type { WebhookVerificationCode } from "@convohop/server";
import { ParamsError, entries, integer, isRecord, optionalText, record, strings, text, type Args } from "./params.mjs";

export type Role = "user" | "backend" | "management";
export const ROLES: readonly Role[] = ["user", "backend", "management"];

/** Language-neutral projection of an SDK failure (spec/conformance/driver-protocol.md). */
export interface DriverError {
  code: string; status: number | null; outcome: string | null; requestId: string | null;
  retryAfterMs: number | null; message: string;
}

export const FEATURES: readonly string[] = ["realtime", "recovery.storage", "retryAfter", "webhooks.verify"];

export function driverError(error: unknown): DriverError {
  // The SDK reports transport failures with status 0; the protocol uses null for "no authority HTTP status".
  if (error instanceof V1Problem) return { code: error.code, status: error.status === 0 ? null : error.status,
    outcome: error.outcome, requestId: error.requestId,
    retryAfterMs: error.retryAfter === undefined ? null : error.retryAfter * 1000, message: error.message };
  return { code: "SDK_ERROR", status: null, outcome: null, requestId: null, retryAfterMs: null,
    message: error instanceof Error ? error.message : "Non-error rejection" };
}

/** Synchronous in-memory recovery storage; one named instance is shared by every client created with that name. */
export class MemoryStorage implements V1RecoveryStorage {
  readonly #values = new Map<string, string>();
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
  removeItem(key: string): void { this.#values.delete(key); }
}

export interface ClientSpec {
  role: Role; baseUrl: string; credential: string;
  projectId: string | undefined; incarnation: string | undefined; principalId: string | undefined;
  actorId: string | undefined; storage: MemoryStorage | undefined;
}

export type SdkClient =
  | { role: "user"; sdk: V1Client }
  | { role: "backend"; sdk: V1ProjectServerClient }
  | { role: "management"; sdk: V1ManagementClient };

function required(value: string | undefined, name: string): string {
  if (value === undefined) throw new ParamsError(`${name} is required for this role`);
  return value;
}

/** Constructs an SDK client without network I/O; constructor validation failures are INVALID_PARAMS. */
export function createClient(spec: ClientSpec): SdkClient {
  const storage = spec.storage === undefined ? {} : { recoveryStorage: spec.storage };
  try {
    switch (spec.role) {
      case "user": return { role: "user", sdk: new V1Client({ baseUrl: spec.baseUrl,
        projectId: required(spec.projectId, "projectId"), incarnation: required(spec.incarnation, "incarnation"),
        principalId: required(spec.principalId, "principalId"), sessionToken: spec.credential, ...storage }) };
      case "backend": return { role: "backend", sdk: new V1ProjectServerClient({ baseUrl: spec.baseUrl,
        projectId: required(spec.projectId, "projectId"), incarnation: required(spec.incarnation, "incarnation"),
        backendKey: spec.credential, ...storage }) };
      case "management": return { role: "management", sdk: new V1ManagementClient({ baseUrl: spec.baseUrl,
        accessToken: spec.credential, actorId: required(spec.actorId, "actorId"), ...storage }) };
    }
  } catch (error) {
    if (error instanceof ParamsError) throw error;
    throw new ParamsError(error instanceof Error ? error.message : "Invalid client options");
  }
}

type Operation<C> = (client: C, args: Args) => Promise<unknown>;

function decode<T>(parse: (value: unknown) => T, value: unknown, name: string): T {
  try { return parse(value); }
  catch { throw new ParamsError(`${name} is not a valid protocol value`); }
}

const message = (args: Args): V1Message => decode(v1Message, args.message, "message");
const cursor = (args: Args): V1Cursor | undefined => args.after === undefined ? undefined : decode(v1Cursor, args.after, "after");

function conversationInput(args: Args): V1Graphql.CreateConversationRequestInput {
  const input = record(args.input, "input");
  return { title: text(input, "title"), props: record(input.props, "input.props"),
    members: entries(input, "members").map(member => ({ principalId: text(member, "principalId"), role: text(member, "role") })) };
}

function batch(args: Args): V1Graphql.MemberBatchEntryInput[] {
  return entries(args, "members").map(member => ({ principalId: text(member, "principalId"), role: text(member, "role"),
    expectedRevision: text(member, "expectedRevision") }));
}

function page(args: Args): { limit?: number; cursor?: string } {
  const limit = integer(args, "limit", 1, 100), after = optionalText(args, "cursor");
  return { ...(limit === undefined ? {} : { limit }), ...(after === undefined ? {} : { cursor: after }) };
}

function idempotency(args: Args): { requestId?: string } {
  const requestId = optionalText(args, "requestId");
  return requestId === undefined ? {} : { requestId };
}

function actAs(args: Args): { actAs?: string } {
  const principalId = optionalText(args, "actAs");
  return principalId === undefined ? {} : { actAs: principalId };
}

// A user session always acts as its own principal; silently ignoring actAs would hide a scenario error.
function own(args: Args): Args {
  if (args.actAs !== undefined) throw new ParamsError("actAs is only available to backend clients");
  return args;
}

const user = new Map<string, Operation<V1Client>>(Object.entries({
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
} satisfies Record<string, Operation<V1Client>>));

const backend = new Map<string, Operation<V1ProjectServerClient>>(Object.entries({
  "route.initialize": async client => { await client.initialize(); return null; },
  "principals.create": async (client, args) => ({ principalId: await client.createPrincipal(text(args, "externalUserId")) }),
  "sessions.issue": (client, args) =>
    client.issueSession(text(args, "principalId"), text(args, "deviceId"), optionalText(args, "requestedTtlMs")),
  "conversations.create": (client, args) => client.conversations.create(conversationInput(args), idempotency(args)),
  "conversations.get": (client, args) => client.conversation(text(args, "conversationId")).get(),
  "members.list": (client, args) => client.conversation(text(args, "conversationId")).members.list(page(args)),
  "members.add": (client, args) => client.addMembers(text(args, "conversationId"), batch(args), optionalText(args, "requestId")),
  "messages.list": (client, args) => {
    const beforeSequence = optionalText(args, "beforeSequence");
    return client.conversation(text(args, "conversationId")).messages.list({ ...actAs(args),
      ...(beforeSequence === undefined ? {} : { beforeSequence }) });
  },
  "messages.send": (client, args) => client.conversation(text(args, "conversationId")).messages.send({ text: text(args, "text") },
    { ...actAs(args), ...idempotency(args) }),
  "messages.edit": (client, args) => {
    const current = message(args);
    return client.conversation(current.conversationId).messages.edit({ messageId: current.messageId,
      expectedRevision: current.revision, text: text(args, "text") }, idempotency(args));
  },
  "messages.delete": (client, args) => {
    const current = message(args);
    return client.conversation(current.conversationId).messages.delete({ messageId: current.messageId,
      expectedRevision: current.revision }, idempotency(args));
  },
} satisfies Record<string, Operation<V1ProjectServerClient>>));

const management = new Map<string, Operation<V1ManagementClient>>(Object.entries({
  "backendKeys.issue": (client, args) =>
    client.issueBackendKey(text(args, "projectId"), text(args, "name"), strings(args, "scopes"), text(args, "expiresAt")),
} satisfies Record<string, Operation<V1ManagementClient>>));

export const OPERATIONS: Readonly<Record<Role, readonly string[]>> = {
  user: [...user.keys()], backend: [...backend.keys()], management: [...management.keys()],
};

/** Starts an operation; undefined means the role does not implement it. Decoding failures throw ParamsError. */
export function operation(client: SdkClient, name: string, args: Args): Promise<unknown> | undefined {
  switch (client.role) {
    case "user": return user.get(name)?.(client.sdk, args);
    case "backend": return backend.get(name)?.(client.sdk, args);
    case "management": return management.get(name)?.(client.sdk, args);
  }
}

export interface RealtimeSink { events(events: readonly V1Record[]): void; error(error: DriverError): void }
export interface RealtimeHandle { close(): void; readonly closed: boolean }

/** Opens the SDK's replay-then-subscribe watcher; resolves once initial reconciliation has been applied. */
export function watch(client: SdkClient, conversationId: string, sink: RealtimeSink): Promise<RealtimeHandle> {
  if (client.role !== "user") throw new ParamsError("Realtime subscriptions require a user client");
  return client.sdk.watch(conversationId, async events => sink.events(events), error => sink.error(driverError(error)));
}

export interface WebhookVerdict { valid: boolean; code: string | null }

// The SDK's finer codes projected onto the protocol's webhookCode. Size limits are the sender's contract, so a
// delivery beyond them cannot carry a valid signature.
function webhookCode(code: WebhookVerificationCode): string {
  switch (code) {
    case "MISSING_HEADER": case "INVALID_HEADER": return "WEBHOOK_HEADERS_MISSING";
    case "INVALID_TIMESTAMP": return "WEBHOOK_TIMESTAMP_INVALID";
    case "TIMESTAMP_EXPIRED": return "WEBHOOK_TIMESTAMP_EXPIRED";
    case "TIMESTAMP_FUTURE": return "WEBHOOK_TIMESTAMP_FUTURE";
    case "BODY_TOO_LARGE": case "TOO_MANY_SIGNATURES": case "NO_MATCHING_SIGNATURE": return "WEBHOOK_SIGNATURE_INVALID";
    case "INVALID_SECRET": throw new ParamsError("secrets must be whsec_ secrets");
    case "INVALID_BODY": throw new Error("Signature verification does not parse the body");
  }
}

const MAX_DATE_SECONDS = 8_640_000_000_000;

/** Verifies one delivery's signature with the SDK (driver-protocol.md, webhooks.verify). */
export async function verifyWebhook(args: Args): Promise<WebhookVerdict> {
  const headers = Object.fromEntries(Object.entries(record(args.headers, "headers")).map(([name, value]) => {
    if (typeof value !== "string") throw new ParamsError(`headers.${name} must be a string`);
    return [name, value] as const;
  }));
  const secrets = strings(args, "secrets");
  if (secrets.length === 0) throw new ParamsError("secrets must not be empty");
  const nowSeconds = integer(args, "nowSeconds", 0, MAX_DATE_SECONDS);
  const toleranceSeconds = integer(args, "toleranceSeconds", 0, Number.MAX_SAFE_INTEGER);
  if (nowSeconds === undefined || toleranceSeconds === undefined) throw new ParamsError("nowSeconds and toleranceSeconds are required");
  try {
    await webhooks.verifySignature({ headers, body: text(args, "payload"), secrets, toleranceSeconds,
      now: new Date(nowSeconds * 1000) });
    return { valid: true, code: null };
  } catch (error) {
    if (error instanceof WebhookVerificationError) return { valid: false, code: webhookCode(error.code) };
    throw error;
  }
}

const require = createRequire(import.meta.url);

function version(name: string): string {
  const manifest: unknown = require(`${name}/package.json`);
  return isRecord(manifest) && typeof manifest.version === "string" ? manifest.version : "unknown";
}

export const PACKAGES: Readonly<Record<string, string>> = Object.fromEntries(
  ["@convohop/core", "@convohop/client", "@convohop/server"].map(name => [name, version(name)]));
