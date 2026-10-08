import { validateOutput, type OperationPayload } from "./graphql.js";
import type { OperationKey } from "./generated/operations.js";
export type ProtocolObject = Record<string, unknown>;
export type ConversationCursor = NonNullable<NonNullable<OperationPayload<"communication.events">["result"]>["nextCursor"]>;
export interface ItemPage<T> { items: T[]; complete: boolean; refreshRequired: boolean; nextCursor?: unknown }
export type ConversationMessage = NonNullable<OperationPayload<"communication.getMessage">["result"]>;
export type SendReceipt = NonNullable<OperationPayload<"communication.sendMessage">["result"]> & { cursor: ConversationCursor };
export type SearchHit = NonNullable<OperationPayload<"communication.search">["result"]>["items"][number] & { message: ConversationMessage };
export type Membership = NonNullable<OperationPayload<"communication.members">["result"]>["items"][number];
export type Conversation = NonNullable<OperationPayload<"communication.getConversation">["result"]>;
export type SessionMetadata = OperationPayload<"communication.currentSession">["result"];
type SessionResult = NonNullable<OperationPayload<"communication.issueSession">["result"]>;
export type SessionBootstrap = SessionResult & { session: NonNullable<SessionResult["session"]> };
export type SessionRefresh = (current: Readonly<SessionMetadata>) => Promise<SessionBootstrap>;
export type SessionRefreshState = "disabled" | "uninitialized" | "ready" | "refreshing" | "blocked";
export interface ProjectRoute {
  projectId: string; incarnation: string; servingEpoch: string; communicationBase: string;
  wssUrl: string; expiresAt: string; signature: string;
}
export interface RecoveryState {
  requestId: string; incarnation: string; payloadFingerprint: string;
  operation: OperationKey; projectId?: string; input: ProtocolObject;
  firstSubmittedAt: number; retryDeadline: number; attemptCount: number; lastAttemptAt: number;
  lastAttemptClassification: string; resolutionState: "pending" | "unknown" | "committed" | "accepted";
  mediaAdmissionAttempted?: true;
}
// Structurally identical to the DOM Storage subset, without requiring DOM lib types.
export interface RecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface AsyncRecoveryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface CommandOptions { requestId?: string }
export interface PageOptions { cursor?: string; limit?: number }
export class ConvoHopProblem extends Error {
  /**
   * Whole seconds to wait before resending the same request, when the authority sent a delay (for example with
   * `RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds.
   * The SDK never waits or resends on its own because of it.
   */
  declare readonly retryAfter?: number;
  constructor(readonly code: string, readonly requestId: string, readonly outcome: string,
    readonly status: number, message: string, options?: ErrorOptions & { retryAfter?: number }) {
    super(message, options); this.name = "ConvoHopProblem";
    if (options?.retryAfter !== undefined) this.retryAfter = options.retryAfter;
  }
}
/**
 * `SCOPE_REQUIRED`: the backend key lacks a scope the operation requires (403, rejected, not retryable).
 * Classify it by `instanceof ConvoHopProblem` and `code`; `scope` is a diagnostic detail.
 */
export class ScopeRequiredProblem extends ConvoHopProblem {
  declare readonly code: "SCOPE_REQUIRED";
  /**
   * The missing scope. The authority names it only in the message, so this is `undefined` when the message does not
   * match the documented wording. A missing read scope is reported as the read scope even where its manage scope
   * (for example `callManage` for `callRead`) would also satisfy the operation.
   */
  readonly scope: string | undefined;
  constructor(requestId: string, outcome: string, status: number, message: string,
    options?: ErrorOptions & { retryAfter?: number }) {
    super("SCOPE_REQUIRED", requestId, outcome, status, message, options);
    this.name = "ScopeRequiredProblem";
    this.scope = /^The backend key requires the current ([a-z][A-Za-z0-9]{0,63}) scope$/.exec(message)?.[1];
  }
}
/** Builds the most specific problem class for an authority error code. */
export function authorityProblem(code: string, requestId: string, outcome: string, status: number, message: string,
  retryAfter?: number): ConvoHopProblem {
  const options = retryAfter === undefined ? undefined : { retryAfter };
  return code === "SCOPE_REQUIRED" ? new ScopeRequiredProblem(requestId, outcome, status, message, options)
    : new ConvoHopProblem(code, requestId, outcome, status, message, options);
}
export function parseObject(value: unknown): ProtocolObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid protocol object");
  return value as ProtocolObject;
}
export function parseString(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("Expected a protocol string");
  return value;
}
export function parseId(value: unknown): string {
  const id = parseString(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ||
      id === "00000000-0000-0000-0000-000000000000") throw new TypeError("Expected a canonical nonzero UUID");
  return id;
}
export function parseCounter(value: unknown): string {
  const counter = parseString(value);
  if (!/^(0|[1-9][0-9]*)$/.test(counter) || BigInt(counter) > 9223372036854775807n) throw new TypeError("Expected a canonical decimal counter");
  return counter;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new TypeError("Expected a protocol boolean");
  return value;
}
export function timestamp(value: unknown): string {
  const time = parseString(value);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(time) || !Number.isFinite(Date.parse(time))) throw new TypeError("Expected a UTC millisecond timestamp");
  return time;
}
export function parseCursor(value: unknown): ConversationCursor {
  const v = parseObject(value);
  return { incarnation: parseId(v.incarnation), conversationId: parseId(v.conversationId), sequence: parseCounter(v.sequence) };
}
export function parsePage<T>(value: unknown, parse: (value: unknown) => T): ItemPage<T> {
  const v = parseObject(value);
  if (!Array.isArray(v.items) || v.items.length > 100) throw new TypeError("Invalid bounded page");
  return { items: v.items.map(parse), complete: boolean(v.complete), refreshRequired: boolean(v.refreshRequired),
    ...(v.nextCursor === undefined ? {} : { nextCursor: v.nextCursor }) };
}
export function eventPage(value: unknown, incarnation: string, conversationId: string, after?: ConversationCursor): ItemPage<ProtocolObject> & { nextCursor: ConversationCursor } {
  validateOutput(value, "EventPage");
  const result = parsePage(value, parseObject), cursor = parseCursor(result.nextCursor);
  if (cursor.conversationId !== conversationId || cursor.incarnation !== incarnation ||
      (after && BigInt(cursor.sequence) < BigInt(after.sequence))) throw new TypeError("Invalid authoritative replay frontier");
  let previous = BigInt(after?.sequence ?? "0");
  for (const event of result.items) {
    const sequence = BigInt(parseCounter(event.sequence));
    if (parseId(event.conversationId) !== conversationId || sequence <= previous || sequence > BigInt(cursor.sequence))
      throw new TypeError("Invalid ordered event scope");
    parseId(event.eventId); previous = sequence;
  }
  return { ...result, nextCursor: cursor };
}
export function parseMessage(value: unknown): ConversationMessage {
  validateOutput(value, "Message!");
  return value as ConversationMessage;
}
export function parseSearchHit(value: unknown): SearchHit {
  const v = parseObject(value), conversationId = parseId(v.conversationId), message = parseMessage(v.message);
  if (message.conversationId !== conversationId) throw new TypeError("Search hit conversation scope does not match its message");
  return { conversationId, message };
}
export function parseMembership(value: unknown): Membership {
  validateOutput(value, "Member!");
  return value as Membership;
}
export function parseConversation(value: unknown): Conversation {
  validateOutput(value, "Conversation!");
  return value as Conversation;
}
export function route(value: unknown): ProjectRoute {
  const v = parseObject(value);
  return { projectId: parseId(v.projectId), incarnation: parseId(v.incarnation), servingEpoch: parseCounter(v.servingEpoch),
    communicationBase: parseString(v.communicationBase), wssUrl: parseString(v.wssUrl),
    expiresAt: timestamp(v.expiresAt), signature: parseString(v.signature) };
}
export function sessionMetadata(value: unknown): SessionMetadata {
  validateOutput(value, "Session!");
  const v = parseObject(value), expiresAt = timestamp(v.expiresAt), revision = parseCounter(v.sessionRevision);
  if (new Date(expiresAt).toISOString() !== expiresAt || revision === "0")
    throw new TypeError("Invalid session expiry or revision");
  return { sessionId: parseId(v.sessionId), principalId: parseId(v.principalId), deviceId: parseId(v.deviceId),
    incarnation: parseId(v.incarnation), sessionRevision: revision, expiresAt, status: parseString(v.status) };
}
export function sessionExpiry(value: SessionMetadata): number {
  // The authority also enforces its signed JWT's integer-second expiry without leeway.
  return Math.floor(Date.parse(value.expiresAt) / 1000) * 1000;
}
export function currentSession(proof: OperationPayload<"communication.currentSession">): SessionMetadata {
  const value = sessionMetadata(proof.result);
  if (proof.status !== "ok" || value.status !== "active" ||
      sessionExpiry(value) <= Date.now() || sessionExpiry(value) <= Date.parse(timestamp(proof.serverTime)))
    throw new TypeError("Expected current live session authority evidence");
  return value;
}
export function sameSession(left: SessionMetadata, right: SessionMetadata): boolean {
  return left.sessionId === right.sessionId && left.principalId === right.principalId &&
    left.deviceId === right.deviceId && left.incarnation === right.incarnation;
}
export function origin(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))))
    throw new TypeError("Use an HTTPS origin, or explicit loopback HTTP for local development");
  return url.origin;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const v = parseObject(value);
    return "{" + Object.keys(v).sort().map(key => JSON.stringify(key) + ":" + canonical(v[key])).join(",") + "}";
  }
  if (typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) throw new TypeError("Unsafe protocol number");
  const result = JSON.stringify(value);
  if (result === undefined) throw new TypeError("JSON payload cannot contain undefined values");
  return result;
}
export async function fingerprint(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return "sha256:" + [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, "0")).join("");
}
