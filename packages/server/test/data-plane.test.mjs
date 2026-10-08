import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ScopeRequiredProblem, ConvoHopProblem, ProjectServerClient, operationCatalog } from "@convohop/server";
import { full, reply } from "../../../test/graphql-fixtures.mjs";

const schema = name => JSON.parse(readFileSync(new URL(`../../../schema/${name}`, import.meta.url), "utf8"));
const annotations = schema("annotations.json"), scopeNames = new Set(schema("ir.json").scopes.map(scope => scope.name));
const operationKeys = new Map(Object.entries(operationCatalog).map(([key, operation]) => [operation.operationName, key]));
/** Backend-key operations, each with its alternative scope sets; every scope in one set is required. */
const backendKeyScopes = new Map(Object.entries(annotations.operations).flatMap(([key, operation]) => {
  const alternatives = operation.auth.filter(entry => entry.credential === "backendKey").map(entry => entry.scopes ?? []);
  return alternatives.length ? [[key, alternatives]] : [];
}));
/** Backend-key operations the Server SDK deliberately leaves unwrapped, each with the reason. */
const UNWRAPPED = new Map();

const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), conversationId = crypto.randomUUID();
const principalId = crypto.randomUUID(), memberId = crypto.randomUUID(), deviceId = crypto.randomUUID();
const sessionId = crypto.randomUUID(), messageId = crypto.randomUUID(), liveSessionId = crypto.randomUUID();
const operationId = crypto.randomUUID(), requestId = crypto.randomUUID();
const beyondSafeInteger = "9007199254740993", backendKey = "fixture-backend-key-never-in-errors";

/** One public call per backend-key operation, with the exact generated input it must send. */
const calls = [
  ["communication.capabilities", server => server.capabilities(), undefined],
  ["communication.route", server => server.initialize(), undefined],
  ["communication.resolveRequest", server => server.requests.resolve(requestId), { requestId }],
  ["communication.getOperation", server => server.operation(operationId), { operationId }],
  ["communication.getPrincipal", server => server.principals.get(principalId), { principalId }],
  ["communication.createPrincipal", server => server.principals.create({ externalUserId: "fixture-user" }),
    { externalUserId: "fixture-user" }],
  ["communication.disablePrincipal", server => server.principals.disable({ principalId, expectedRevision: beyondSafeInteger }),
    { principalId, expectedRevision: beyondSafeInteger }],
  ["communication.issueSession", server => server.sessions.issue({ principalId, deviceId }),
    { principalId, deviceId, requestedTtlMs: "900000" }],
  ["communication.renewSession", server => server.sessions.renew({ sessionId, principalId, deviceId,
    expectedRevision: "4", requestedTtlMs: "60000" }),
  { sessionId, principalId, deviceId, expectedRevision: "4", requestedTtlMs: "60000" }],
  ["communication.revokeSession", server => server.sessions.revoke({ sessionId, expectedRevision: "5" }),
    { sessionId, expectedRevision: "5" }],
  ["communication.sessionRequestOutcome", server => server.sessions.outcome(requestId), { requestId }],
  ["communication.createConversation", server => server.conversations.create({ title: "Fixture", props: { topic: "a" },
    members: [{ principalId, role: "moderator" }] }),
  { title: "Fixture", props: { topic: "a" }, members: [{ principalId, role: "moderator" }] }],
  ["communication.getConversation", server => server.conversation(conversationId).get(), { conversationId }],
  ["communication.updateConversation", server => server.conversation(conversationId).update({ expectedRevision: "2",
    title: "Renamed" }), { conversationId, expectedRevision: "2", title: "Renamed" }],
  ["communication.members", server => server.conversation(conversationId).members.list({ cursor: "members-1", limit: 5 }),
    { conversationId, limit: 5, cursor: "members-1" }],
  ["communication.addMember", server => server.conversation(conversationId).members.add({ principalId: memberId,
    role: "member", expectedRevision: "0" }), { conversationId, principalId: memberId, role: "member", expectedRevision: "0" }],
  ["communication.addMembers", server => server.conversation(conversationId).members.addBatch([{ principalId: memberId,
    role: "moderator", expectedRevision: "1" }]),
  { conversationId, members: [{ principalId: memberId, role: "moderator", expectedRevision: "1" }] }],
  ["communication.removeMember", server => server.conversation(conversationId).members.remove({ principalId: memberId,
    expectedRevision: "3" }), { conversationId, principalId: memberId, expectedRevision: "3" }],
  ["communication.setBroadcastPermission", server => server.conversation(conversationId).members.setBroadcastPermission({
    principalId: memberId, allowed: false, expectedMembershipRevision: "3" }),
  { conversationId, principalId: memberId, allowed: false, expectedMembershipRevision: "3" }],
  ["communication.conversationMute", server => server.conversation(conversationId).members.getMute(memberId),
    { conversationId, actAsPrincipalId: memberId }],
  ["communication.setConversationMute", server => server.conversation(conversationId).members.setMute({
    principalId: memberId, muted: true, until: "2030-01-01T00:00:00Z" }),
  { conversationId, muted: true, until: "2030-01-01T00:00:00Z", actAsPrincipalId: memberId }],
  ["communication.historyGrant", server => server.conversation(conversationId).members.grantHistory({ principalId: memberId,
    expectedRevision: "3", membershipEpoch: "2", fromSequence: beyondSafeInteger }),
  { conversationId, principalId: memberId, expectedRevision: "3", membershipEpoch: "2", fromSequence: beyondSafeInteger }],
  ["communication.messages", server => server.conversation(conversationId).messages.list({ actAs: memberId,
    beforeSequence: beyondSafeInteger, limit: 3 }),
  { conversationId, limit: 3, actAsPrincipalId: memberId, beforeSequence: beyondSafeInteger }],
  ["communication.getMessage", server => server.conversation(conversationId).messages.get(messageId, { actAs: memberId }),
    { conversationId, messageId, actAsPrincipalId: memberId }],
  ["communication.sendMessage", server => server.conversation(conversationId).messages.send({ text: "Hello" },
    { actAs: memberId }), { conversationId, text: "Hello", props: {}, actAsPrincipalId: memberId }],
  ["communication.editMessage", server => server.conversation(conversationId).messages.edit({ messageId,
    expectedRevision: "1", text: "Edited" }), { conversationId, messageId, expectedRevision: "1", text: "Edited" }],
  ["communication.deleteMessage", server => server.conversation(conversationId).messages.delete({ messageId,
    expectedRevision: "2" }), { conversationId, messageId, expectedRevision: "2" }],
  ["communication.inbox", server => server.inbox({ actAs: memberId, cursor: "inbox-1", limit: 9 }),
    { limit: 9, cursor: "inbox-1", actAsPrincipalId: memberId }],
  ["communication.search", server => server.search("hello", { conversationIds: [conversationId], limit: 7 }),
    { query: "hello", pageSize: 7, scope: { conversationIds: [conversationId] } }],
  ["communication.currentLiveSession", server => server.conversation(conversationId).live.current(), { conversationId }],
  ["communication.liveSessions", server => server.conversation(conversationId).live.history({ limit: 4 }),
    { conversationId, limit: 4 }],
  ["communication.liveSession", server => server.liveSession(liveSessionId).get(), { liveSessionId }],
  ["communication.liveSessionParticipants", server => server.liveSession(liveSessionId).participants({
    cursor: "participants-1" }), { liveSessionId, cursor: "participants-1" }],
  ["communication.alertLiveSession", server => server.liveSession(liveSessionId).alert({ expectedGeneration: "1",
    principalIds: [memberId] }), { liveSessionId, expectedGeneration: "1", principalIds: [memberId] }],
  ["communication.endLiveSession", server => server.liveSession(liveSessionId).end({ expectedGeneration: "1",
    expectedRevision: "6" }), { liveSessionId, expectedGeneration: "1", expectedRevision: "6" }],
  ["communication.liveSessionOperation", server => server.liveOperation(operationId).get(), { operationId }],
];

function serverWith(respond) {
  const requests = [];
  const server = new ProjectServerClient({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation, backendKey,
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body), key = operationKeys.get(request.operationName);
      assert.ok(key, request.operationName);
      assert.equal(options.headers.authorization, `Bearer ${backendKey}`);
      requests.push({ key, input: request.variables.input, requestId: request.variables.context.requestId });
      return respond(request, key);
    } });
  return { server, requests };
}
function graphqlError(request, code, status, message, extensions = {}) {
  return Response.json({ errors: [{ message, extensions: { code, requestId: request.variables.context.requestId,
    outcome: "rejected", retryable: code !== "SCOPE_REQUIRED", status, ...extensions } }] });
}
function message(conversation, fields = {}) {
  return full("Message", { messageId: crypto.randomUUID(), conversationId: conversation, authorId: principalId,
    sequence: "1", revision: "1", revisionSequence: "1", createdAt: new Date().toISOString(), deleted: false,
    text: "Fixture", props: {}, ...fields });
}

test("every annotated backend-key operation has a typed Server SDK method, or a documented exemption", async () => {
  const wrapped = calls.map(([key]) => key);
  assert.equal(new Set(wrapped).size, wrapped.length, "one call per operation");
  for (const [key, reason] of UNWRAPPED) {
    assert.ok(backendKeyScopes.has(key), `${key} is not a backend-key operation`);
    assert.ok(typeof reason === "string" && reason.trim().length > 0, `${key} needs a reason`);
    assert.equal(wrapped.includes(key), false, `${key} is both wrapped and exempt`);
  }
  assert.deepEqual([...wrapped].sort(), [...backendKeyScopes.keys()].filter(key => !UNWRAPPED.has(key)).sort());
  for (const [key, alternatives] of backendKeyScopes)
    for (const scope of alternatives.flat()) assert.ok(scopeNames.has(scope), `${key}: unknown scope ${scope}`);

  const { server, requests } = serverWith((request, key) => {
    const scope = backendKeyScopes.get(key)[0]?.[0];
    return scope === undefined
      ? graphqlError(request, "RATE_LIMITED", 429, "Rate limited", { retryAfter: 2 })
      : graphqlError(request, "SCOPE_REQUIRED", 403, `The backend key requires the current ${scope} scope`);
  });
  for (const [key, call, input] of calls) {
    const before = requests.length, scope = backendKeyScopes.get(key)[0]?.[0];
    await assert.rejects(call(server), error => {
      assert.ok(error instanceof ConvoHopProblem, key);
      assert.equal(error.requestId, requests.at(-1).requestId, key);
      assert.equal(error.message.includes(backendKey), false, key);
      if (scope === undefined) {
        assert.equal(error instanceof ScopeRequiredProblem, false, key);
        assert.equal(error.code, "RATE_LIMITED", key);
        assert.equal(error.retryAfter, 2, key);
      } else {
        assert.ok(error instanceof ScopeRequiredProblem, key);
        assert.equal(error.name, "ScopeRequiredProblem", key);
        assert.deepEqual([error.code, error.status, error.outcome, error.scope], ["SCOPE_REQUIRED", 403, "rejected", scope], key);
      }
      return true;
    }, key);
    assert.equal(requests.length, before + 1, key);
    assert.equal(requests.at(-1).key, key);
    assert.deepEqual(requests.at(-1).input, input, key);
  }
});

test("call reads accept callRead or callManage, as the README documents", () => {
  for (const key of ["communication.currentLiveSession", "communication.liveSession", "communication.liveSessions",
    "communication.liveSessionParticipants", "communication.liveSessionOperation"])
    assert.deepEqual(backendKeyScopes.get(key), [["callRead"], ["callManage"]], key);
  for (const key of ["communication.alertLiveSession", "communication.endLiveSession"])
    assert.deepEqual(backendKeyScopes.get(key), [["callManage"]], key);
});

test("actAs, search scope and page bounds are checked before any request is sent", async () => {
  const { server, requests } = serverWith(request => reply(request, { result: full("SearchPage", {
    items: [], complete: true, refreshRequired: false }) }));
  await assert.rejects(server.inbox({}), { name: "TypeError", message: "The inbox requires actAs" });
  await assert.rejects(server.inbox(), TypeError);
  await assert.rejects(server.search("hello"), { name: "TypeError", message: "Backend search requires actAs or conversationIds" });
  for (const options of [{ conversationIds: [] }, { actAs: memberId, conversationIds: [] }])
    await assert.rejects(server.search("hello", options),
      { name: "TypeError", message: "Search conversationIds must name at least one conversation" });
  await assert.rejects(server.search("hello", { actAs: "not-a-uuid" }), TypeError);
  await assert.rejects(server.conversation(conversationId).messages.send({ text: "x" }, { actAs: "not-a-uuid" }), TypeError);
  await assert.rejects(server.conversation(conversationId).messages.list({ limit: 0 }), RangeError);
  await assert.rejects(server.inbox({ actAs: memberId, limit: 101 }), RangeError);
  await assert.rejects(server.liveSession(liveSessionId).participants({ limit: 1.5 }), RangeError);
  await assert.rejects(server.conversation(conversationId).members.add({ principalId: memberId, role: "owner",
    expectedRevision: "0" }), { name: "TypeError", message: "Invalid membership role" });
  assert.throws(() => server.conversation("not-a-uuid"), TypeError);
  assert.equal(requests.length, 0);

  const page = await server.search("hello", { actAs: memberId });
  assert.deepEqual(page.items, []);
  assert.deepEqual(requests.map(request => request.input), [{ query: "hello", pageSize: 100, actAsPrincipalId: memberId }]);
});

test("results that do not match the request are rejected rather than returned", async () => {
  const otherConversation = crypto.randomUUID(), sent = { cursor: incarnation };
  const { server } = serverWith((request, key) => {
    switch (key) {
      case "communication.sendMessage": return reply(request, { result: full("MessageAck", { messageId,
        conversationId, sequence: "7", revision: "1", status: "sent",
        cursor: { incarnation: sent.cursor, conversationId, sequence: "7" } }) });
      case "communication.messages": return reply(request, { result: full("MessagePage", {
        items: [message(otherConversation)], complete: true, refreshRequired: false }) });
      case "communication.search": return reply(request, { result: full("SearchPage", {
        items: [{ conversationId: otherConversation, message: message(otherConversation) }], complete: true,
        refreshRequired: false }) });
      case "communication.createPrincipal": return reply(request, { result: full("Principal", { principalId,
        externalUserId: "someone-else", status: "active", revision: "1" }) });
      default: throw new Error(`Unexpected ${key}`);
    }
  });
  const conversation = server.conversation(conversationId);
  const receipt = await conversation.messages.send({ text: "Hello" }, { actAs: memberId });
  assert.deepEqual(receipt.cursor, { incarnation, conversationId, sequence: "7" });
  sent.cursor = crypto.randomUUID();
  await assert.rejects(conversation.messages.send({ text: "Hello" }), { name: "TypeError", message: "Invalid send receipt scope" });
  await assert.rejects(conversation.messages.list(), { name: "TypeError", message: "Message page does not match the request" });
  await assert.rejects(server.search("hello", { conversationIds: [conversationId] }),
    { name: "TypeError", message: "Search hit does not match the request" });
  await assert.rejects(server.principals.create({ externalUserId: "fixture-user" }),
    { name: "TypeError", message: "Principal does not match the request" });
});

test("member mutes act as the member and reject a result for anyone else", async () => {
  const muted = { conversationId, principalId: memberId, muted: true, until: "2030-01-01T00:00:00Z" };
  const answers = [muted, { ...muted, muted: false, until: null }, { ...muted, principalId }];
  const { server, requests } = serverWith(request => reply(request, { result: full("ConversationMute", answers.shift()) }));
  const members = server.conversation(conversationId).members;
  await assert.rejects(members.setMute({ principalId: memberId, muted: "yes" }),
    { name: "TypeError", message: "muted must be a boolean" });
  await assert.rejects(members.setMute({ principalId: "not-a-uuid", muted: false }), TypeError);
  await assert.rejects(members.getMute("not-a-uuid"), TypeError);
  assert.equal(requests.length, 0);

  assert.deepEqual(await members.setMute({ principalId: memberId, muted: true, until: muted.until }, { requestId }), muted);
  assert.deepEqual(await members.setMute({ principalId: memberId, muted: false }),
    { ...muted, muted: false, until: null });
  await assert.rejects(members.getMute(memberId), { name: "TypeError", message: "Mute does not match the request" });
  assert.deepEqual(requests.map(request => [request.key, request.input]), [
    ["communication.setConversationMute", { conversationId, muted: true, until: muted.until, actAsPrincipalId: memberId }],
    ["communication.setConversationMute", { conversationId, muted: false, actAsPrincipalId: memberId }],
    ["communication.conversationMute", { conversationId, actAsPrincipalId: memberId }],
  ]);
  assert.equal(requests[0].requestId, requestId);
});

function cutoff(state) {
  return full("LiveMediaCutoff", { state, operationId, enforcedAt: state === "ENFORCED" ? new Date().toISOString() : null,
    scope: full("LiveCutoffScope", { kind: "GENERATION", liveSessionId, generation: "1" }) });
}
function liveOperation(state, fields = {}) {
  return full("LiveSessionOperation", { operationId, requestId, liveSessionId, kind: "END", state, revision: "7",
    requestedAt: new Date().toISOString(), ...fields });
}
function liveServer(states) {
  return serverWith((request, key) => {
    if (key === "communication.endLiveSession") return reply(request, {
      operation: full("OperationRef", { operationId, owner: "communication", href: `/operations/${operationId}`,
        state: "running" }),
      result: { liveSessionId, operationId, mediaCutoff: cutoff("PENDING") } });
    assert.equal(key, "communication.liveSessionOperation");
    return reply(request, { result: states.shift() });
  });
}

test("ending a live session completes only with an enforced media cutoff", async () => {
  const completion = full("LiveSessionOperationCompletion", { liveSessionId, generation: "1", state: "ENDED",
    revision: "8", completedAt: new Date().toISOString(), mediaCutoff: cutoff("ENFORCED") });
  const { server, requests } = liveServer([liveOperation("RUNNING"),
    liveOperation("COMPLETED", { completedAt: new Date().toISOString(), completion })]);
  const operation = await server.liveSession(liveSessionId).end({ expectedGeneration: "1", expectedRevision: "6" },
    { requestId });
  assert.equal(operation.operationId, operationId);
  assert.equal(operation.receipt.requestId, requestId);
  assert.deepEqual(await operation.completed({ timeoutMs: 5000 }), completion);
  assert.deepEqual(requests.map(request => request.key), ["communication.endLiveSession",
    "communication.liveSessionOperation", "communication.liveSessionOperation"]);

  const unenforced = liveServer([liveOperation("COMPLETED", { completedAt: new Date().toISOString(),
    completion: { ...completion, mediaCutoff: cutoff("PENDING") } })]);
  await assert.rejects((await unenforced.server.liveSession(liveSessionId).end({ expectedGeneration: "1",
    expectedRevision: "6" })).completed(), { name: "TypeError", message: "Completed live operation is missing its completion evidence" });

  const failed = liveServer([liveOperation("FAILED", { completedAt: new Date().toISOString(),
    failure: { code: "LIVE_SESSION_CLOSED", message: "The live session already ended" } })]);
  await assert.rejects((await failed.server.liveSession(liveSessionId).end({ expectedGeneration: "1",
    expectedRevision: "6" }, { requestId })).completed(), error => {
    assert.ok(error instanceof ConvoHopProblem);
    assert.deepEqual([error.code, error.requestId, error.outcome, error.status], ["LIVE_SESSION_CLOSED", requestId, "accepted", 409]);
    return true;
  });

  const pending = liveServer([liveOperation("RUNNING"), liveOperation("RUNNING")]);
  await assert.rejects(pending.server.liveOperation(operationId).completed({ timeoutMs: 1 }),
    { name: "ConvoHopProblem", code: "RESOLUTION_REQUIRED", outcome: "accepted" });
  await assert.rejects(pending.server.liveOperation(operationId).completed({ timeoutMs: 0 }), RangeError);

  const moved = liveServer([liveOperation("RUNNING"), liveOperation("RUNNING", { liveSessionId: crypto.randomUUID() })]);
  const reattached = moved.server.liveOperation(operationId);
  assert.equal((await reattached.get()).liveSessionId, liveSessionId);
  await assert.rejects(reattached.get(), { name: "TypeError", message: "Live operation scope changed" });
});
