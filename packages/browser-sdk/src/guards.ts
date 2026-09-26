import { InvalidResponseError, isIdentityId, isRecord, requireCursor, requireUuid } from "./graphql.js";
import type {
  CallEvent, CallPage, CallSummary, ChatMessage, IncomingCall, IncomingCallsPage, MediaJoin,
  MediaMember, MediaParticipant, MediaSession, Thread, ThreadEvent, ThreadMember, ThreadPage,
  TimelinePage,
} from "./types.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sequence = /^(?:0|[1-9][0-9]*)$/;
const isUuid = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
const isSequence = (value: unknown): value is string => typeof value === "string" &&
  sequence.test(value) && BigInt(value) <= 9223372036854775807n;
const isString = (value: unknown): value is string => typeof value === "string";
const nullable = <T>(value: unknown, guard: (item: unknown) => item is T): value is T | null =>
  value === null || guard(value);
const oneOf = (value: unknown, values: readonly string[]): value is string =>
  typeof value === "string" && values.includes(value);

export function expect<T>(value: unknown, field: string, guard: (value: unknown) => value is T): T {
  if (!guard(value)) throw new InvalidResponseError(200, `GraphQL returned an invalid ${field} result`);
  return value;
}

export function isThread(value: unknown): value is Thread {
  return isRecord(value) && isUuid(value.id) && isString(value.title) && isString(value.owner) &&
    oneOf(value.state, ["active", "archived"]) &&
    oneOf(value.historyOnJoin, ["since_join", "all_existing"]) &&
    oneOf(value.historyAfterLeave, ["revoke", "previously_visible"]) &&
    oneOf(value.historyAfterRemove, ["revoke", "previously_visible"]) &&
    isSequence(value.lastSequence);
}

export function isThreadMember(value: unknown): value is ThreadMember {
  return isRecord(value) && isUuid(value.membershipId) && isIdentityId(value.identityId) &&
    oneOf(value.role, ["owner", "moderator", "member", "viewer"]) &&
    oneOf(value.state, ["invited", "active", "left", "removed"]) &&
    nullable(value.joinedSequence, isSequence) && nullable(value.exitedSequence, isSequence);
}

export function isThreadPage(value: unknown): value is ThreadPage {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isThread) &&
    nullable(value.nextAfter, isUuid);
}

export function isMessage(value: unknown): value is ChatMessage {
  return isRecord(value) && isUuid(value.id) && isUuid(value.threadId) &&
    isSequence(value.sequence) && isString(value.sender) && isUuid(value.clientMessageId) &&
    isString(value.body) && isRecord(value.props) && isString(value.createdAt);
}

export function isThreadEvent(value: unknown): value is ThreadEvent {
  return isRecord(value) && isUuid(value.eventId) && isUuid(value.threadId) &&
    isSequence(value.sequence) && isString(value.kind) && isString(value.actor) &&
    nullable(value.message, isMessage) && nullable(value.identityId, isIdentityId) &&
    nullable(value.callId, isUuid) && isString(value.createdAt);
}

export function isTimelinePage<T>(
  value: unknown, guard: (item: unknown) => item is T,
): value is TimelinePage<T> {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(guard) &&
    isSequence(value.nextAfter) && isSequence(value.cursor) && typeof value.hasMore === "boolean";
}

export function isMediaSession(value: unknown): value is MediaSession {
  return isRecord(value) && isUuid(value.id) && isUuid(value.projectId) &&
    nullable(value.threadId, isUuid) && nullable(value.mode, (item): item is "audio" | "video" =>
      oneOf(item, ["audio", "video"])) &&
    oneOf(value.kind, ["call", "broadcast"]) && isString(value.owner) &&
    isString(value.title) && oneOf(value.audience, ["members", "project"]) &&
    oneOf(value.state, ["requested", "starting", "live", "stopping", "ended", "failed"]);
}

export function isMediaMember(value: unknown): value is MediaMember {
  return isRecord(value) && isIdentityId(value.identityId) &&
    oneOf(value.role, ["owner", "publisher", "viewer"]);
}

export function isMediaParticipant(value: unknown): value is MediaParticipant {
  return isRecord(value) && isUuid(value.id) && isIdentityId(value.identityId) &&
    oneOf(value.role, ["owner", "publisher", "viewer"]) && isString(value.issuedAt) &&
    isString(value.expiresAt) && nullable(value.revokedAt, isString) &&
    typeof value.connected === "boolean";
}

export function isMediaJoin(value: unknown): value is MediaJoin {
  return isRecord(value) && isUuid(value.participantId) &&
    isString(value.serverUrl) && isString(value.token) && isString(value.expiresAt);
}

export function isCall(value: unknown): value is CallSummary {
  return isRecord(value) && isUuid(value.id) && isUuid(value.projectId) &&
    isUuid(value.threadId) && oneOf(value.mode, ["audio", "video"]) &&
    isString(value.owner) && isString(value.title) &&
    oneOf(value.role, ["owner", "publisher", "viewer"]);
}

export function isIncomingCall(value: unknown): value is IncomingCall {
  return isRecord(value) && isCall(value.call) &&
    isSequence(value.sequence) && isString(value.invitedAt);
}

export function isIncomingPage(value: unknown): value is IncomingCallsPage {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isIncomingCall) &&
    isSequence(value.nextAfter) && isSequence(value.cursor) && typeof value.hasMore === "boolean";
}

export function isCallEvent(value: unknown): value is CallEvent {
  return isRecord(value) && isUuid(value.eventId) && isSequence(value.sequence) &&
    oneOf(value.kind, ["call.ringing", "call.accepted", "call.declined", "call.ended", "call.revoked"]) &&
    isUuid(value.callId) && isIdentityId(value.identityId) && nullable(value.call, isCall) &&
    (value.call === null || value.call.id === value.callId) &&
    (value.kind !== "call.revoked" || value.call === null) &&
    isString(value.createdAt);
}

export function isCallPage(value: unknown): value is CallPage {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isCallEvent) &&
    isSequence(value.nextAfter) && typeof value.hasMore === "boolean";
}

export function pageAfter(after: string, nextAfter: string, hasMore: boolean): void {
  requireCursor(after);
  requireCursor(nextAfter);
  if (BigInt(nextAfter) < BigInt(after) || (hasMore && nextAfter === after)) {
    throw new InvalidResponseError(200, "GraphQL returned an invalid pagination cursor");
  }
}

export function uuidAfter(after: string | undefined, page: ThreadPage): void {
  if (after !== undefined) requireUuid(after, "after");
  const expected = page.items.at(-1)?.id ?? after ?? null;
  if (page.nextAfter !== expected) {
    throw new InvalidResponseError(200, "GraphQL returned an invalid thread pagination cursor");
  }
}
