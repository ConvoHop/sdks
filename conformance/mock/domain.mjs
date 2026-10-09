// Deterministic in-memory authority used by the conformance mock target.
// It models only the public behaviour exercised by spec/conformance scenarios and the SDK wire tests;
// it is not a backend implementation and must not grow private service logic.
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

// The backend-key scopes of schema/ir.json; conformance/test/spec.test.mjs keeps them, and the scope each
// operation below requires, equal to the IR.
export const SCOPES = Object.freeze(["callManage", "callRead", "conversationManage", "historyManage", "membershipManage",
  "messageRead", "messageWrite", "moderation", "principalManage", "sessionIssue", "sessionManage"]);
// Small server-side page caps force multi-page traversal even though SDKs request 100 items.
export const PAGE_CAPS = Object.freeze({ messages: 3, events: 3, subscription: 50 });
const ROLES = new Set(["member", "moderator"]);

export class Problem extends Error {
  constructor(code, status, message, options = {}) {
    super(message);
    this.name = "Problem";
    this.code = code;
    this.status = status;
    this.outcome = options.outcome ?? "rejected";
    if (options.retryAfterSeconds !== undefined) this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

const iso = (time = Date.now()) => new Date(time).toISOString();
const invalid = message => new Problem("INVALID_REQUEST", 400, message);
const notFound = what => new Problem("NOT_FOUND", 404, `${what} not found`);
const unauthenticated = () => new Problem("UNAUTHENTICATED", 401, "A current credential is required");

export function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return "{" + Object.keys(value).sort().filter(key => value[key] !== undefined)
      .map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  return JSON.stringify(value);
}

export function uuidFrom(text) {
  const bytes = createHash("sha256").update(text).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class Domain {
  constructor({ seed = "convohop-conformance" } = {}) {
    this.seed = seed;
    this.bus = new EventEmitter();
    this.bus.setMaxListeners(0);
    this.projectId = uuidFrom(`${seed}:project`);
    this.incarnation = uuidFrom(`${seed}:incarnation`);
    this.managementActorId = uuidFrom(`${seed}:management-actor`);
    // The mock's backend keys share one service principal, as keys that keep their backend principal across
    // rotation do. Backend messages sent without actAs are authored by it.
    this.backendPrincipalId = uuidFrom(`${seed}:backend-principal`);
    this.servingEpoch = "1";
    this.credentials = Object.freeze({ backend: "mock-backend-key-full", backendLimited: "mock-backend-key-limited",
      backendExpired: "mock-backend-key-expired", management: "mock-management-token" });
    this.reset();
  }

  reset() {
    this.counter = 0;
    this.backendKeys = new Map([
      [this.credentials.backend, { scopes: new Set(SCOPES), expiresAt: Infinity }],
      [this.credentials.backendLimited, { scopes: new Set(SCOPES.filter(scope => scope !== "membershipManage")), expiresAt: Infinity }],
      [this.credentials.backendExpired, { scopes: new Set(SCOPES), expiresAt: 0 }],
    ]);
    this.principals = new Map();
    this.principalsByExternalId = new Map();
    this.sessions = new Map();
    this.conversations = new Map();
    this.receipts = new Map();
  }

  nextId() { return uuidFrom(`${this.seed}:id:${this.counter++}`); }

  authenticate(plane, authorization) {
    const token = /^Bearer (\S+)$/.exec(authorization ?? "")?.[1];
    const rejected = unauthenticated();
    if (token === undefined) throw rejected;
    if (plane === "management") {
      if (token !== this.credentials.management) throw rejected;
      return { kind: "management", scope: `management:${this.managementActorId}` };
    }
    const key = this.backendKeys.get(token);
    if (key) {
      if (Date.now() >= key.expiresAt) throw rejected;
      return { kind: "backend", scopes: key.scopes, principalId: this.backendPrincipalId, scope: `backend:${this.projectId}` };
    }
    const session = this.sessions.get(token);
    if (session && Date.now() < Date.parse(session.expiresAt))
      return { kind: "user", principalId: session.principalId, sessionId: session.sessionId, scope: `user:${session.principalId}` };
    throw rejected;
  }

  // A credential authenticates only in its own project, so another project cannot tell it from an unknown one.
  checkContext(plane, context) {
    if (plane !== "communication") return;
    if (!context.projectId) throw invalid("Communication requests require an explicit project");
    if (context.projectId !== this.projectId) throw unauthenticated();
    if (context.incarnation != null && context.incarnation !== this.incarnation)
      throw new Problem("INCARNATION_MISMATCH", 409, "Project incarnation changed; explicit recovery required");
  }

  // A missing scope is SCOPE_REQUIRED, with the authority's message naming the scope; FORBIDDEN is for every
  // other authorization failure.
  requireBackend(actor, scope) {
    if (actor.kind !== "backend") throw new Problem("FORBIDDEN", 403, "A backend key is required");
    if (!actor.scopes.has(scope)) throw new Problem("SCOPE_REQUIRED", 403, `The backend key requires the current ${scope} scope`);
  }

  // A backend acting as a principal is held to that principal's active membership; absence is NOT_FOUND.
  // User sessions cannot act as anyone else.
  #actingAs(actor, conversationId, principalId, scope) {
    this.requireBackend(actor, scope);
    const conversation = this.#conversation(conversationId);
    const member = conversation.members.get(principalId);
    if (member?.status !== "active" || this.principals.get(principalId)?.status !== "active") throw notFound("Member");
    return { conversation, member };
  }

  route(actor) {
    if (actor.kind !== "user" && actor.kind !== "backend") throw new Problem("FORBIDDEN", 403, "Project credential required");
  }

  // Idempotent mutation boundary keyed by caller scope and request identity.
  commit(actor, requestId, field, input, apply) {
    const key = `${actor.scope}:${requestId}`;
    const fingerprint = createHash("sha256").update(canonical({ field, input })).digest("hex");
    const existing = this.receipts.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new Problem("IDEMPOTENCY_CONFLICT", 409, "Request identity was already used with a different payload");
      return { ...structuredClone(existing.envelope), replayed: true };
    }
    const outcome = apply();
    const now = iso();
    const envelope = outcome.accepted
      ? { status: "accepted", requestId, serverTime: now, receiptId: null, committedAt: null, replayed: false,
          operation: outcome.accepted.operation, resourceRef: outcome.accepted.resourceRef, result: null }
      : { status: "committed", requestId, serverTime: now, receiptId: this.nextId(), committedAt: now, replayed: false,
          operation: null, resourceRef: null, result: outcome.result };
    this.receipts.set(key, { fingerprint, envelope: structuredClone(envelope), retainedKey: outcome.retainedKey ?? null });
    return envelope;
  }

  resolve(actor, requestId) {
    const entry = this.receipts.get(`${actor.scope}:${requestId}`);
    const checkedAt = iso();
    if (!entry) return { state: "notObservedYet", requestId, checkedAt, resultWithheld: false, receipt: null };
    const { envelope, retainedKey } = entry;
    return { state: envelope.status, requestId, checkedAt, resultWithheld: envelope.status === "committed" && !retainedKey,
      receipt: { ...structuredClone(envelope), replayed: false,
        result: retainedKey ? { [retainedKey]: structuredClone(envelope.result) } : null } };
  }

  createPrincipal(actor, { externalUserId }) {
    this.requireBackend(actor, "principalManage");
    if (!externalUserId || externalUserId.length > 256) throw invalid("externalUserId must contain 1..256 characters");
    const existing = this.principalsByExternalId.get(externalUserId);
    if (existing) return { result: { ...this.principals.get(existing) }, retainedKey: "principal" };
    const principal = { principalId: this.nextId(), externalUserId, status: "active", revision: "1" };
    this.principals.set(principal.principalId, principal);
    this.principalsByExternalId.set(externalUserId, principal.principalId);
    return { result: { ...principal }, retainedKey: "principal" };
  }

  issueSession(actor, { principalId, deviceId, requestedTtlMs }) {
    this.requireBackend(actor, "sessionIssue");
    if (!this.principals.has(principalId)) throw notFound("Principal");
    const ttl = BigInt(requestedTtlMs);
    if (ttl < 1000n || ttl > 86400000n) throw invalid("requestedTtlMs must be within 1000..86400000");
    const session = { sessionId: this.nextId(), principalId, deviceId, incarnation: this.incarnation,
      sessionRevision: "1", expiresAt: iso(Date.now() + Number(ttl)), status: "active" };
    const sessionToken = `mock-session.${session.sessionId}`;
    this.sessions.set(sessionToken, session);
    // Bearer material is never retained for request resolution.
    return { result: { session: { ...session }, tokenExpiresAt: session.expiresAt, sessionToken }, retainedKey: null };
  }

  #conversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw notFound("Conversation");
    return conversation;
  }

  // Users see only conversations with a current membership; absence and denial look identical.
  // Backend keys need the operation's scope, and operations without one refuse them.
  #visible(actor, conversationId, scope) {
    if (actor.kind === "backend") {
      if (scope === undefined) throw new Problem("FORBIDDEN", 403, "This operation requires a user session");
      this.requireBackend(actor, scope);
      return { conversation: this.#conversation(conversationId), member: null };
    }
    if (actor.kind !== "user") throw new Problem("FORBIDDEN", 403, "Project credential required");
    const conversation = this.conversations.get(conversationId);
    const member = conversation?.members.get(actor.principalId);
    if (!conversation || !member || member.status !== "active") throw notFound("Conversation");
    return { conversation, member };
  }

  #append(conversation, type, subjectRef, payload) {
    conversation.sequence += 1n;
    const event = { eventId: this.nextId(), conversationId: conversation.conversationId, sequence: String(conversation.sequence),
      type, occurredAt: iso(), subjectRef, payload };
    conversation.events.push(event);
    this.bus.emit("event", conversation, event);
    return event;
  }

  // Founding members see the conversation from its first event; later members from their own admission.
  #addMember(conversation, principalId, role, visibleFromSequence = String(conversation.sequence + 1n)) {
    const member = { conversationId: conversation.conversationId, principalId, role, status: "active", membershipEpoch: "1",
      visibilityEpoch: "1", revision: "1", visibleFromSequence, canStartBroadcast: false };
    conversation.members.set(principalId, member);
    this.#append(conversation, "member.added", { kind: "member", id: principalId },
      { principalId, membershipEpoch: "1", visibilityEpoch: "1", revision: "1" });
    return member;
  }

  #view(conversation, member) {
    return { conversationId: conversation.conversationId, revision: conversation.revision, title: conversation.title,
      props: structuredClone(conversation.props), latestSequence: String(conversation.sequence),
      membership: member ? { ...member } : null };
  }

  #principals(entries) {
    if (new Set(entries.map(entry => entry.principalId)).size !== entries.length) throw invalid("Members must be distinct");
    for (const entry of entries) {
      if (!ROLES.has(entry.role)) throw invalid("Member role must be member or moderator");
      if (!this.principals.has(entry.principalId)) throw notFound("Principal");
    }
  }

  createConversation(actor, { title, props, members }) {
    this.requireBackend(actor, "conversationManage");
    if (!title || title.length > 200) throw invalid("title must contain 1..200 characters");
    if (members.length > 100) throw invalid("A conversation starts with at most 100 members");
    this.#principals(members);
    const conversation = { conversationId: this.nextId(), title, props: structuredClone(props), revision: "1", sequence: 0n,
      members: new Map(), messages: new Map(), events: [] };
    this.conversations.set(conversation.conversationId, conversation);
    this.#append(conversation, "conversation.created", { kind: "conversation", id: conversation.conversationId }, { revision: "1" });
    for (const entry of members) this.#addMember(conversation, entry.principalId, entry.role, "1");
    return { result: this.#view(conversation, null), retainedKey: "conversation" };
  }

  getConversation(actor, { conversationId }) {
    const { conversation, member } = this.#visible(actor, conversationId, "conversationManage");
    return this.#view(conversation, member);
  }

  addMembers(actor, { conversationId, members }) {
    this.requireBackend(actor, "membershipManage");
    const conversation = this.#conversation(conversationId);
    if (members.length < 1 || members.length > 100) throw invalid("A membership batch requires 1..100 entries");
    this.#principals(members);
    for (const entry of members) {
      const current = conversation.members.get(entry.principalId);
      if ((current?.revision ?? "0") !== entry.expectedRevision)
        throw new Problem("REVISION_CONFLICT", 409, "Membership revision changed; read the current member and retry");
    }
    const items = members.map(entry => {
      const current = conversation.members.get(entry.principalId);
      if (!current) return { ...this.#addMember(conversation, entry.principalId, entry.role) };
      if (current.role !== entry.role) {
        current.role = entry.role;
        current.revision = String(BigInt(current.revision) + 1n);
        this.#append(conversation, "member.roleChanged", { kind: "member", id: entry.principalId },
          { principalId: entry.principalId, revision: current.revision });
      }
      return { ...current };
    });
    return { result: { items }, retainedKey: "conversationMemberBatch" };
  }

  members(actor, { conversationId, limit, cursor }) {
    const { conversation } = this.#visible(actor, conversationId, "membershipManage");
    if (cursor != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cursor))
      throw invalid("Unknown member cursor");
    const ordered = [...conversation.members.values()].sort((a, b) => a.principalId < b.principalId ? -1 : 1)
      .filter(member => cursor == null || member.principalId > cursor);
    const items = ordered.slice(0, limit).map(member => ({ ...member }));
    const complete = ordered.length <= items.length;
    return { items, complete, refreshRequired: false, nextCursor: complete ? null : items.at(-1).principalId };
  }

  // The IR's authorOrModerator condition for user sessions; backend keys moderate with the moderation scope.
  #message(conversation, messageId, actor, member) {
    const message = conversation.messages.get(messageId);
    if (!message) throw notFound("Message");
    if (member && message.authorId !== actor.principalId && member.role !== "moderator")
      throw new Problem("FORBIDDEN", 403, "Only the author or a moderator can change this message");
    return message;
  }

  // User sessions send as themselves; backend keys as actAs, or without it as their service principal.
  sendMessage(actor, { conversationId, text, props, actAsPrincipalId }) {
    const { conversation, member } = actAsPrincipalId == null
      ? this.#visible(actor, conversationId, "messageWrite")
      : this.#actingAs(actor, conversationId, actAsPrincipalId, "messageWrite");
    if (!text || text.length > 4000) throw invalid("text must contain 1..4000 characters");
    const sequence = String(conversation.sequence + 1n);
    const message = { messageId: this.nextId(), conversationId, authorId: member?.principalId ?? actor.principalId, sequence,
      revision: "1", revisionSequence: sequence, createdAt: iso(), deleted: false, text, props: structuredClone(props),
      editedAt: null };
    conversation.messages.set(message.messageId, message);
    this.#append(conversation, "message.created", { kind: "message", id: message.messageId },
      { messageId: message.messageId, revision: "1", revisionSequence: sequence });
    return { result: { messageId: message.messageId, conversationId, sequence, revision: "1", status: "sent",
      cursor: { incarnation: this.incarnation, conversationId, sequence } }, retainedKey: "messageAck" };
  }

  #revise(actor, { conversationId, messageId, expectedRevision }, type, change) {
    const { conversation, member } = this.#visible(actor, conversationId, "moderation");
    const message = this.#message(conversation, messageId, actor, member);
    if (message.deleted) throw new Problem("MESSAGE_DELETED", 409, "Message was deleted");
    if (message.revision !== expectedRevision) throw new Problem("REVISION_CONFLICT", 409, "Message revision changed");
    change(message);
    message.revision = String(BigInt(message.revision) + 1n);
    message.revisionSequence = String(conversation.sequence + 1n);
    message.editedAt = iso();
    this.#append(conversation, type, { kind: "message", id: messageId },
      { messageId, revision: message.revision, revisionSequence: message.revisionSequence });
    return { result: structuredClone(message), retainedKey: "message" };
  }

  editMessage(actor, input) {
    if (input.text == null && input.props == null) throw invalid("An edit requires text or props");
    if (input.text != null && (!input.text || input.text.length > 4000)) throw invalid("text must contain 1..4000 characters");
    return this.#revise(actor, input, "message.edited", message => {
      if (input.text != null) message.text = input.text;
      if (input.props != null) message.props = structuredClone(input.props);
    });
  }

  // A tombstone keeps the message's identity and revisions but no content.
  deleteMessage(actor, input) {
    return this.#revise(actor, input, "message.deleted", message => {
      message.deleted = true; message.text = null; message.props = null;
    });
  }

  // User sessions, and backend keys acting as a member, read from that member's visibility floor; backend keys
  // without actAs read the whole history.
  messages(actor, { conversationId, limit, beforeSequence, actAsPrincipalId }) {
    const { conversation, member } = actAsPrincipalId == null
      ? this.#visible(actor, conversationId, "messageRead")
      : this.#actingAs(actor, conversationId, actAsPrincipalId, "messageRead");
    const floor = BigInt(member?.visibleFromSequence ?? "1");
    const before = beforeSequence == null ? undefined : BigInt(beforeSequence);
    const ordered = [...conversation.messages.values()]
      .filter(message => BigInt(message.sequence) >= floor && (before === undefined || BigInt(message.sequence) < before))
      .sort((a, b) => BigInt(b.sequence) > BigInt(a.sequence) ? 1 : -1);
    const items = ordered.slice(0, Math.min(limit, PAGE_CAPS.messages)).map(message => structuredClone(message));
    const complete = ordered.length <= items.length;
    return { items, complete, refreshRequired: false, nextCursor: complete ? null : items.at(-1).sequence };
  }

  // Validates a replay cursor and returns the exclusive lower bound visible to the caller.
  replayStart(actor, conversationId, after) {
    const { conversation, member } = this.#visible(actor, conversationId);
    const floor = BigInt(member?.visibleFromSequence ?? "1") - 1n;
    if (after == null) return { conversation, start: floor };
    if (after.incarnation !== this.incarnation || after.conversationId !== conversationId)
      throw new Problem("CURSOR_SCOPE_MISMATCH", 409, "Cursor belongs to another conversation or incarnation");
    const sequence = BigInt(after.sequence);
    if (sequence > conversation.sequence) throw new Problem("CURSOR_AHEAD", 409, "Cursor is ahead of the authority");
    return { conversation, start: sequence > floor ? sequence : floor };
  }

  eventPage(conversation, start, cap) {
    const pending = conversation.events.filter(event => BigInt(event.sequence) > start);
    const items = pending.slice(0, cap).map(event => structuredClone(event));
    return { items, complete: pending.length <= items.length, refreshRequired: false,
      nextCursor: { incarnation: this.incarnation, conversationId: conversation.conversationId,
        sequence: items.length ? items.at(-1).sequence : String(start) } };
  }

  events(actor, { conversationId, limit, after }) {
    const { conversation, start } = this.replayStart(actor, conversationId, after);
    return this.eventPage(conversation, start, Math.min(limit, PAGE_CAPS.events));
  }

  // Reads one message from the same visibility floor as messages; a message below it is NOT_FOUND.
  getMessage(actor, { conversationId, messageId, actAsPrincipalId }) {
    const { conversation, member } = actAsPrincipalId == null
      ? this.#visible(actor, conversationId, "messageRead")
      : this.#actingAs(actor, conversationId, actAsPrincipalId, "messageRead");
    const message = conversation.messages.get(messageId);
    if (!message || BigInt(message.sequence) < BigInt(member?.visibleFromSequence ?? "1")) throw notFound("Message");
    return structuredClone(message);
  }

  // Receipt progress is kept beside the membership, so member reads keep their shape.
  #receipt(conversation, member) {
    const progress = conversation.receiptProgress?.get(member.principalId);
    return { principalId: member.principalId, membershipEpoch: member.membershipEpoch, visibilityEpoch: member.visibilityEpoch,
      deliveredThroughSequence: progress?.delivered ?? null, readThroughSequence: progress?.read ?? null,
      updatedAt: progress?.updatedAt ?? null };
  }

  // Receipts are user-session reads, one per active member in principal order. (this.receipts holds request receipts.)
  readReceipts(actor, { conversationId, limit, cursor }) {
    const { conversation } = this.#visible(actor, conversationId);
    if (cursor != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cursor))
      throw invalid("Unknown receipt cursor");
    const ordered = [...conversation.members.values()].filter(member => member.status === "active")
      .sort((a, b) => a.principalId < b.principalId ? -1 : 1)
      .filter(member => cursor == null || member.principalId > cursor);
    const items = ordered.slice(0, limit).map(member => this.#receipt(conversation, member));
    const complete = ordered.length <= items.length;
    return { items, complete, refreshRequired: false, nextCursor: complete ? null : items.at(-1).principalId };
  }

  // Progress names a visible, non-deleted message at the caller's current epochs and only moves forward. A read
  // also counts as delivered, and each advance appends a receipt.reported event.
  reportReceipt(actor, { conversationId, kind, membershipEpoch, visibilityEpoch, throughSequence }) {
    const { conversation, member } = this.#visible(actor, conversationId);
    if (member.membershipEpoch !== membershipEpoch || member.visibilityEpoch !== visibilityEpoch)
      throw new Problem("REVISION_CONFLICT", 409, "Membership epochs changed; read the conversation and retry");
    if (kind !== "delivered" && kind !== "read") throw invalid("Receipt kind must be delivered or read");
    const through = BigInt(throughSequence);
    if (through < BigInt(member.visibleFromSequence) ||
        ![...conversation.messages.values()].some(message => message.sequence === throughSequence && !message.deleted))
      throw invalid("Receipts require a currently visible, non-deleted message");
    conversation.receiptProgress ??= new Map();
    const current = conversation.receiptProgress.get(member.principalId) ?? { delivered: null, read: null };
    if (through > BigInt(current[kind] ?? "0")) {
      const advance = value => value != null && BigInt(value) >= through ? value : throughSequence;
      conversation.receiptProgress.set(member.principalId, { delivered: advance(current.delivered),
        read: kind === "read" ? advance(current.read) : current.read, updatedAt: iso() });
      this.#append(conversation, "receipt.reported", { kind: "member", id: member.principalId },
        { principalId: member.principalId, membershipEpoch, visibilityEpoch, kind, throughSequence });
    }
    return { result: this.#receipt(conversation, member), retainedKey: "readReceipt" };
  }

  issueBackendKey(actor, { projectId, name, scopes, expiresAt }) {
    if (actor.kind !== "management") throw new Problem("FORBIDDEN", 403, "Management credential required");
    if (projectId !== this.projectId) throw notFound("Project");
    if (!name || name.length > 100) throw invalid("name must contain 1..100 characters");
    if (!scopes.length || new Set(scopes).size !== scopes.length || scopes.some(scope => !SCOPES.includes(scope)))
      throw invalid("scopes must be distinct known backend scopes");
    const expiry = Date.parse(expiresAt);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(expiresAt) || !(expiry > Date.now()))
      throw invalid("expiresAt must be a future UTC millisecond timestamp");
    // The key is minted when the queued operation runs and its reference arrives with credential delivery, so the
    // receipt names the project.
    return { accepted: { operation: { operationId: this.nextId(), owner: "management", href: "/graphql", state: "requested" },
      resourceRef: { kind: "project", id: projectId } } };
  }
}
