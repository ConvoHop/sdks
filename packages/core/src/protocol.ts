import { validateOutput, type OperationPayload } from "./graphql.js";
import type { V1OperationKey } from "./generated/v1-operations.js";
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
// Structurally identical to the DOM Storage subset, without requiring DOM lib types.
export interface V1RecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface V1AsyncRecoveryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface CommandOptions { requestId?: string }
export interface PageOptions { cursor?: string; limit?: number }
export class V1Problem extends Error {
  /**
   * Whole seconds to wait before resending the same request, when the authority sent a delay (for example with
   * `RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds.
   * The SDK never waits or resends on its own because of it.
   */
  declare readonly retryAfter?: number;
  constructor(readonly code: string, readonly requestId: string, readonly outcome: string,
    readonly status: number, message: string, options?: ErrorOptions & { retryAfter?: number }) {
    super(message, options); this.name = "V1Problem";
    if (options?.retryAfter !== undefined) this.retryAfter = options.retryAfter;
  }
}
/**
 * `SCOPE_REQUIRED`: the backend key lacks a scope the operation requires (403, rejected, not retryable).
 * Classify it by `instanceof V1Problem` and `code`; `scope` is a diagnostic detail.
 */
export class ScopeRequiredProblem extends V1Problem {
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
  retryAfter?: number): V1Problem {
  const options = retryAfter === undefined ? undefined : { retryAfter };
  return code === "SCOPE_REQUIRED" ? new ScopeRequiredProblem(requestId, outcome, status, message, options)
    : new V1Problem(code, requestId, outcome, status, message, options);
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
export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new TypeError("Expected a protocol boolean");
  return value;
}
export function timestamp(value: unknown): string {
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
export function eventPage(value: unknown, incarnation: string, conversationId: string, after?: V1Cursor): V1Page<V1Record> & { nextCursor: V1Cursor } {
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
export function route(value: unknown): V1Route {
  const v = v1Record(value);
  return { projectId: v1Id(v.projectId), incarnation: v1Id(v.incarnation), servingEpoch: v1Counter(v.servingEpoch),
    communicationBase: v1String(v.communicationBase), wssUrl: v1String(v.wssUrl),
    expiresAt: timestamp(v.expiresAt), signature: v1String(v.signature) };
}
export function sessionMetadata(value: unknown): V1Session {
  validateOutput(value, "Session!");
  const v = v1Record(value), expiresAt = timestamp(v.expiresAt), revision = v1Counter(v.sessionRevision);
  if (new Date(expiresAt).toISOString() !== expiresAt || revision === "0")
    throw new TypeError("Invalid session expiry or revision");
  return { sessionId: v1Id(v.sessionId), principalId: v1Id(v.principalId), deviceId: v1Id(v.deviceId),
    incarnation: v1Id(v.incarnation), sessionRevision: revision, expiresAt, status: v1String(v.status) };
}
export function sessionExpiry(value: V1Session): number {
  // The authority also enforces its signed JWT's integer-second expiry without leeway.
  return Math.floor(Date.parse(value.expiresAt) / 1000) * 1000;
}
export function currentSession(proof: OperationPayload<"communication.currentSession">): V1Session {
  const value = sessionMetadata(proof.result);
  if (proof.status !== "ok" || value.status !== "active" ||
      sessionExpiry(value) <= Date.now() || sessionExpiry(value) <= Date.parse(timestamp(proof.serverTime)))
    throw new TypeError("Expected current live session authority evidence");
  return value;
}
export function sameSession(left: V1Session, right: V1Session): boolean {
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
    const v = v1Record(value);
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
