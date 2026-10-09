// The deterministic mock is the default target. Its HTTP surface, fault injection and control API
// are tested directly here; scenario runs only observe them through a driver.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { operationCatalog } from "../../packages/core/dist/generated/operations.js";
import { ControlClient, ControlError } from "../lib/control.mjs";
import { loadSpec } from "../lib/spec.mjs";
import { checkDescriptor } from "../lib/target.mjs";
import { MAX_DOCUMENT_BYTES } from "../mock/resolvers.mjs";
import { MOCK_CAPABILITIES, startMockTarget } from "../mock/server.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let spec, mock, control;
before(async () => {
  spec = await loadSpec();
  mock = await startMockTarget({ seed: "mock-test" });
  control = new ControlClient(mock.descriptor.control);
});
after(() => mock?.close());

function post(operationKey, { plane = "communication", credential = mock.descriptor.credentials.backend, requestId = randomUUID(),
  context, input, headers = {}, body } = {}) {
  const operation = operationCatalog[operationKey];
  const url = plane === "management" ? mock.descriptor.managementUrl : mock.descriptor.communicationUrl;
  const variables = { context: context ?? { requestId, projectId: mock.descriptor.projectId, incarnation: mock.descriptor.incarnation },
    ...(input === undefined ? {} : { input }) };
  return fetch(`${url}/graphql`, { method: "POST",
    headers: { "content-type": "application/json", ...(credential ? { authorization: `Bearer ${credential}` } : {}), ...headers },
    body: body ?? JSON.stringify({ query: operation.query, operationName: operation.operationName, variables }) });
}
const createPrincipal = (options = {}) => post("communication.createPrincipal",
  { input: { externalUserId: `user-${randomUUID()}` }, ...options });
async function problem(response, status, code) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.equal(body.errors?.length, 1, JSON.stringify(body));
  assert.equal(body.errors[0].extensions.code, code);
  assert.equal(body.errors[0].extensions.status, status);
  return body.errors[0];
}

describe("descriptor", () => {
  test("validates as a target and derives stable identities from the seed", async () => {
    assert.equal(checkDescriptor(mock.descriptor, spec.validators.target), mock.descriptor);
    assert.deepEqual(mock.descriptor.capabilities, [...MOCK_CAPABILITIES]);
    assert.notEqual(mock.descriptor.communicationUrl, mock.descriptor.managementUrl);
    const same = await startMockTarget({ seed: "mock-test" }), other = await startMockTarget({ seed: "other" });
    try {
      for (const key of ["projectId", "incarnation", "managementActorId"]) {
        assert.match(mock.descriptor[key], UUID);
        assert.equal(same.descriptor[key], mock.descriptor[key]);
        assert.notEqual(other.descriptor[key], mock.descriptor[key]);
      }
      assert.notEqual(same.descriptor.communicationUrl, mock.descriptor.communicationUrl);
    } finally {
      await Promise.all([same.close(), other.close()]);
    }
  });
});

describe("GraphQL endpoint", () => {
  before(() => control.reset());

  test("executes generated documents with the requested selection and echoes the request identity", async () => {
    const requestId = randomUUID();
    const response = await createPrincipal({ requestId, input: { externalUserId: "mock-test-alice" } });
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.createPrincipal.status, "committed");
    assert.equal(data.createPrincipal.requestId, requestId);
    assert.equal(data.createPrincipal.replayed, false);
    assert.match(data.createPrincipal.result.principalId, UUID);
    assert.deepEqual(Object.keys(data.createPrincipal).sort(), ["committedAt", "operation", "receiptId", "replayed", "requestId",
      "resourceRef", "result", "serverTime", "status"]);
  });

  test("replays a repeated request identity and rejects one reused with a different payload", async () => {
    const requestId = randomUUID(), input = { externalUserId: `user-${randomUUID()}` };
    const first = await (await createPrincipal({ requestId, input })).json();
    const again = await (await createPrincipal({ requestId, input })).json();
    assert.equal(again.data.createPrincipal.replayed, true);
    assert.deepEqual(again.data.createPrincipal.result, first.data.createPrincipal.result);
    assert.equal(again.data.createPrincipal.receiptId, first.data.createPrincipal.receiptId);
    const conflict = await problem(await createPrincipal({ requestId, input: { externalUserId: "someone-else" } }), 409, "IDEMPOTENCY_CONFLICT");
    assert.equal(conflict.extensions.requestId, requestId);
  });

  test("authenticates every request against the plane and project", async () => {
    const requestId = randomUUID();
    const missing = await problem(await createPrincipal({ credential: null, requestId }), 401, "UNAUTHENTICATED");
    assert.equal(missing.extensions.requestId, requestId);
    await problem(await createPrincipal({ credential: mock.descriptor.credentials.backendExpired }), 401, "UNAUTHENTICATED");
    await problem(await createPrincipal({ credential: mock.descriptor.credentials.management }), 401, "UNAUTHENTICATED");
    await problem(await createPrincipal({ headers: { authorization: `Basic ${mock.descriptor.credentials.backend}` } }), 401, "UNAUTHENTICATED");
    const unknown = await problem(await createPrincipal({ credential: "not-a-mock-credential" }), 401, "UNAUTHENTICATED");
    const otherProject = await problem(await createPrincipal({ context: { requestId, projectId: randomUUID(),
      incarnation: mock.descriptor.incarnation } }), 401, "UNAUTHENTICATED");
    assert.equal(otherProject.message, unknown.message, "another project cannot tell a valid credential from an unknown one");
    await problem(await createPrincipal({ context: { requestId, projectId: mock.descriptor.projectId, incarnation: randomUUID() } }),
      409, "INCARNATION_MISMATCH");
    await problem(await post("management.capabilities", { plane: "management" }), 401, "UNAUTHENTICATED");
  });

  test("rejects requests that are not one valid GraphQL operation with one root field", async () => {
    const url = `${mock.descriptor.communicationUrl}/graphql`;
    const get = await fetch(url);
    assert.equal(get.headers.get("allow"), "POST");
    await problem(get, 405, "METHOD_NOT_ALLOWED");
    await problem(await fetch(url, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }), 415, "UNSUPPORTED_MEDIA_TYPE");
    await problem(await createPrincipal({ body: "{ not json" }), 400, "GRAPHQL_INVALID_REQUEST");
    await problem(await createPrincipal({ body: JSON.stringify({ query: 42 }) }), 400, "GRAPHQL_INVALID_REQUEST");
    const invalid = await problem(await createPrincipal({ body: JSON.stringify({ query: "{ nope }" }) }), 400, "GRAPHQL_INVALID_REQUEST");
    assert.equal(invalid.message, "GraphQL document does not validate");
    const twoFields = `query Two($context: RequestContextInput!) { a: capabilities(context: $context) { status } ` +
      `b: capabilities(context: $context) { status } }`;
    const two = await problem(await createPrincipal({ body: JSON.stringify({ query: twoFields,
      variables: { context: { requestId: randomUUID(), projectId: mock.descriptor.projectId } } }) }), 400, "GRAPHQL_INVALID_REQUEST");
    assert.equal(two.message, "Requests must select exactly one root field");
    await problem(await post("communication.createPrincipal", { plane: "management", credential: mock.descriptor.credentials.management,
      input: { externalUserId: "x" } }), 400, "GRAPHQL_INVALID_REQUEST");
    const { query, operationName } = operationCatalog["communication.createPrincipal"];
    const padded = bytes => JSON.stringify({ query: `${query}\n#${"x".repeat(bytes - Buffer.byteLength(query) - 2)}`, operationName,
      variables: { context: { requestId: randomUUID(), projectId: mock.descriptor.projectId, incarnation: mock.descriptor.incarnation },
        input: { externalUserId: `user-${randomUUID()}` } } });
    assert.equal((await createPrincipal({ body: padded(MAX_DOCUMENT_BYTES) })).status, 200);
    const large = await problem(await createPrincipal({ body: padded(MAX_DOCUMENT_BYTES + 1) }), 400, "GRAPHQL_QUERY_LIMIT");
    assert.equal(large.message, `GraphQL documents are limited to ${MAX_DOCUMENT_BYTES} bytes`);
    await problem(await fetch(`${mock.descriptor.communicationUrl}/elsewhere`), 404, "NOT_FOUND");
  });

  test("answers schema fields it does not implement with FEATURE_UNSUPPORTED", async () => {
    const unsupported = await problem(await post("communication.capabilities"), 422, "FEATURE_UNSUPPORTED");
    assert.equal(unsupported.message, "capabilities is not offered by the conformance mock");
    await problem(await post("management.capabilities", { plane: "management", credential: mock.descriptor.credentials.management }),
      422, "FEATURE_UNSUPPORTED");
  });

  test("lets backend keys message as an active member and names a missing scope", async () => {
    const result = async (response, field) => {
      assert.equal(response.status, 200);
      return (await response.json()).data[field].result;
    };
    const principal = async () => (await result(await createPrincipal(), "createPrincipal")).principalId;
    const alice = await principal(), carol = await principal();
    const { conversationId } = await result(await post("communication.createConversation",
      { input: { title: "Acting as a member", props: {}, members: [{ principalId: alice, role: "member" }] } }), "createConversation");
    const send = (input, options = {}) =>
      post("communication.sendMessage", { input: { conversationId, text: "hello", props: {}, ...input }, ...options });
    const asAlice = await result(await send({ actAsPrincipalId: alice }), "sendMessage");
    const asService = await result(await send({}), "sendMessage");
    const read = (input, options = {}) => post("communication.messages", { input: { conversationId, limit: 10, ...input }, ...options });
    for (const page of [await result(await read({}), "messages"), await result(await read({ actAsPrincipalId: alice }), "messages")]) {
      assert.deepEqual(page.items.map(item => item.messageId), [asService.messageId, asAlice.messageId]);
      assert.equal(page.items[1].authorId, alice);
      assert.match(page.items[0].authorId, UUID);
      assert.notEqual(page.items[0].authorId, alice);
    }
    await problem(await send({ actAsPrincipalId: carol }), 404, "NOT_FOUND");
    await problem(await read({ actAsPrincipalId: carol }), 404, "NOT_FOUND");
    const { sessionToken } = await result(await post("communication.issueSession",
      { input: { principalId: alice, deviceId: randomUUID(), requestedTtlMs: "60000" } }), "issueSession");
    await problem(await send({ actAsPrincipalId: alice }, { credential: sessionToken }), 403, "FORBIDDEN");
    await problem(await read({ actAsPrincipalId: alice }, { credential: sessionToken }), 403, "FORBIDDEN");
    const missing = await problem(await post("communication.members", { credential: mock.descriptor.credentials.backendLimited,
      input: { conversationId, limit: 10 } }), 403, "SCOPE_REQUIRED");
    assert.equal(missing.message, "The backend key requires the current membershipManage scope");
  });
});

describe("faults", () => {
  before(() => control.reset());

  test("a rate-limit fault answers 429 with Retry-After once, then the field recovers", async () => {
    await control.fault({ field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 7 });
    const requestId = randomUUID(), input = { externalUserId: `user-${randomUUID()}` };
    const limited = await createPrincipal({ requestId, input });
    assert.equal(limited.headers.get("retry-after"), "7");
    const error = await problem(limited, 429, "RATE_LIMITED");
    assert.equal(error.extensions.retryAfter, 7);
    assert.equal(error.extensions.requestId, requestId);
    const retried = await createPrincipal({ requestId, input });
    assert.equal(retried.status, 200);
    assert.equal((await retried.json()).data.createPrincipal.replayed, false);
    const { entries } = await control.waitLog({ kind: "request", match: { requestId }, count: 2 });
    assert.deepEqual(entries.map(({ status, code, dropped, field, plane }) => ({ status, code, dropped, field, plane })), [
      { status: 429, code: "RATE_LIMITED", dropped: false, field: "createPrincipal", plane: "communication" },
      { status: 200, code: null, dropped: false, field: "createPrincipal", plane: "communication" },
    ]);
  });

  test("faults wait for an authenticated request on their own plane and field", async () => {
    await control.fault({ field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 1 });
    await control.fault({ plane: "management", field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 1 });
    await problem(await createPrincipal({ credential: null }), 401, "UNAUTHENTICATED");
    await problem(await createPrincipal(), 429, "RATE_LIMITED");
    assert.equal((await createPrincipal()).status, 200);
    await control.reset();
  });

  test("drops close the connection before or after the commit", async () => {
    const input = { externalUserId: `user-${randomUUID()}` };
    await control.fault({ field: "createPrincipal", action: "dropBeforeCommit" });
    const before = randomUUID();
    await assert.rejects(createPrincipal({ requestId: before, input }), TypeError);
    assert.equal((await (await createPrincipal({ requestId: before, input })).json()).data.createPrincipal.replayed, false);

    await control.fault({ field: "createPrincipal", action: "dropAfterCommit" });
    const afterCommit = randomUUID(), other = { externalUserId: `user-${randomUUID()}` };
    await assert.rejects(createPrincipal({ requestId: afterCommit, input: other }), TypeError);
    assert.equal((await (await createPrincipal({ requestId: afterCommit, input: other })).json()).data.createPrincipal.replayed, true);
    const { entries } = await control.waitLog({ kind: "request", match: { dropped: true }, count: 2 });
    assert.deepEqual(entries.map(entry => [entry.requestId, entry.status]), [[before, 0], [afterCommit, 0]]);
  });
});

describe("control API", () => {
  before(() => control.reset());

  test("rejects malformed faults", async () => {
    for (const fault of [{ action: "rateLimit", retryAfterSeconds: 1 }, { field: "createPrincipal", action: "explode" },
      { plane: "media", field: "createPrincipal", action: "dropBeforeCommit" }, { field: "createPrincipal", action: "rateLimit" },
      { field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 0 },
      { field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 1.5 }])
      await assert.rejects(control.fault(fault), { name: "ControlError", message: /^control \/fault returned HTTP 400: / });
  });

  test("waits for log entries, including ones that arrive later, and times out with what it saw", async () => {
    const requestId = randomUUID();
    const waiting = control.waitLog({ kind: "request", match: { requestId }, timeoutMs: 5000 });
    await createPrincipal({ requestId });
    const { entries } = await waiting;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].status, 200);
    assert.ok(Number.isSafeInteger(entries[0].sequence));
    await assert.rejects(control.waitLog({ kind: "request", match: { requestId }, count: 2, timeoutMs: 50 }), {
      name: "ControlError",
      message: `timed out after 50 ms waiting for 2 request log entries matching ${JSON.stringify({ requestId })} (saw 1)` });
  });

  test("resets the domain, faults and log", async () => {
    await control.fault({ field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 3 });
    await control.reset();
    const response = await fetch(`${mock.descriptor.control}/log`);
    assert.deepEqual(await response.json(), { entries: [] });
    assert.equal((await createPrincipal()).status, 200);
    assert.deepEqual(await control.realtimeDrop({}), { closed: 0 });
  });

  test("answers unknown endpoints and malformed waits with errors", async () => {
    const unknown = await fetch(`${mock.descriptor.control}/teleport`, { method: "POST", body: "{}" });
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), { error: "unknown control endpoint" });
    const wait = await fetch(`${mock.descriptor.control}/log/wait`, { method: "POST", body: "{}" });
    assert.equal(wait.status, 400);
    assert.equal((await fetch(`${mock.descriptor.managementUrl}/__conformance/log`)).status, 404);
    await assert.rejects(new ControlClient("http://127.0.0.1:1/").reset(), error =>
      error instanceof ControlError && /^control \/reset failed: /.test(error.message));
  });
});

describe("receipts and single-message reads", () => {
  before(() => control.reset());

  const result = async (response, field) => {
    assert.equal(response.status, 200);
    return (await response.json()).data[field].result;
  };
  async function room() {
    const principal = async () => (await result(await createPrincipal(), "createPrincipal")).principalId;
    const alice = await principal(), bob = await principal(), carol = await principal();
    const { conversationId } = await result(await post("communication.createConversation", { input: { title: "Receipts", props: {},
      members: [{ principalId: alice, role: "member" }, { principalId: bob, role: "member" }] } }), "createConversation");
    const session = async principalId => (await result(await post("communication.issueSession",
      { input: { principalId, deviceId: randomUUID(), requestedTtlMs: "60000" } }), "issueSession")).sessionToken;
    const tokens = { alice: await session(alice), bob: await session(bob), carol: await session(carol) };
    const send = async text => result(await post("communication.sendMessage",
      { credential: tokens.alice, input: { conversationId, text, props: {} } }), "sendMessage");
    return { alice, bob, carol, conversationId, tokens, first: await send("first"), second: await send("second") };
  }
  const latest = async (conversationId, credential) => (await result(await post("communication.getConversation",
    { credential, input: { conversationId } }), "getConversation")).latestSequence;

  test("getMessage reads one message from the caller's visibility floor", async () => {
    const { carol, conversationId, tokens, first } = await room();
    const read = (messageId, options = {}) => post("communication.getMessage", { input: { conversationId, messageId }, ...options });
    const message = await result(await read(first.messageId, { credential: tokens.bob }), "getMessage");
    assert.equal(message.messageId, first.messageId);
    assert.equal(message.sequence, first.sequence);
    assert.equal(message.text, "first");
    assert.deepEqual(await result(await read(first.messageId), "getMessage"), message);
    assert.deepEqual(await result(await read(first.messageId, { credential: mock.descriptor.credentials.backendLimited }), "getMessage"),
      message);
    await problem(await read(randomUUID(), { credential: tokens.bob }), 404, "NOT_FOUND");
    await problem(await read(first.messageId, { credential: tokens.carol }), 404, "NOT_FOUND");
    await result(await post("communication.addMembers", { input: { conversationId,
      members: [{ principalId: carol, role: "member", expectedRevision: "0" }] } }), "addMembers");
    await problem(await read(first.messageId, { credential: tokens.carol }), 404, "NOT_FOUND");
  });

  test("a deleted message reads back as a tombstone without text or props", async () => {
    const { conversationId, tokens, first } = await room();
    const tombstone = await result(await post("communication.deleteMessage", { credential: tokens.alice,
      input: { conversationId, messageId: first.messageId, expectedRevision: "1" } }), "deleteMessage");
    assert.deepEqual([tombstone.messageId, tombstone.revision, tombstone.deleted, tombstone.text, tombstone.props],
      [first.messageId, "2", true, null, null]);
    assert.deepEqual(await result(await post("communication.getMessage", { credential: tokens.bob,
      input: { conversationId, messageId: first.messageId } }), "getMessage"), tombstone);
  });

  test("reportReceipt advances progress at the current epochs and emits receipt.reported once per advance", async () => {
    const { bob, conversationId, tokens, first, second } = await room();
    const report = (input, options = {}) => post("communication.reportReceipt", { credential: tokens.bob,
      input: { conversationId, kind: "read", membershipEpoch: "1", visibilityEpoch: "1", throughSequence: first.sequence, ...input },
      ...options });
    const before = await latest(conversationId, tokens.bob);
    const read = await result(await report({}), "reportReceipt");
    assert.deepEqual({ ...read, updatedAt: typeof read.updatedAt }, { principalId: bob, membershipEpoch: "1", visibilityEpoch: "1",
      deliveredThroughSequence: first.sequence, readThroughSequence: first.sequence, updatedAt: "string" });
    const after = await latest(conversationId, tokens.bob);
    assert.equal(BigInt(after), BigInt(before) + 1n);
    const events = await result(await post("communication.events", { credential: tokens.bob, input: { conversationId, limit: 10,
      after: { incarnation: mock.descriptor.incarnation, conversationId, sequence: before } } }), "events");
    // Event payloads are one typed object; fields an event type does not use are null.
    const present = payload => Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null));
    assert.deepEqual(events.items.map(({ sequence, type, subjectRef, payload }) => ({ sequence, type, subjectRef,
      payload: present(payload) })), [{
      sequence: after, type: "receipt.reported", subjectRef: { kind: "member", id: bob },
      payload: { principalId: bob, membershipEpoch: "1", visibilityEpoch: "1", kind: "read", throughSequence: first.sequence } }]);

    const unchanged = await result(await report({ kind: "delivered" }), "reportReceipt");
    assert.equal(unchanged.deliveredThroughSequence, first.sequence);
    assert.equal(await latest(conversationId, tokens.bob), after);
    const delivered = await result(await report({ kind: "delivered", throughSequence: second.sequence }), "reportReceipt");
    assert.deepEqual([delivered.deliveredThroughSequence, delivered.readThroughSequence], [second.sequence, first.sequence]);

    await problem(await report({ membershipEpoch: "2" }), 409, "REVISION_CONFLICT");
    await problem(await report({ visibilityEpoch: "2" }), 409, "REVISION_CONFLICT");
    await problem(await report({ kind: "seen" }), 400, "INVALID_REQUEST");
    await problem(await report({ throughSequence: "1" }), 400, "INVALID_REQUEST");
    await problem(await report({ throughSequence: String(BigInt(after) + 5n) }), 400, "INVALID_REQUEST");
    await problem(await report({}, { credential: tokens.carol }), 404, "NOT_FOUND");
    await problem(await report({}, { credential: mock.descriptor.credentials.backend }), 403, "FORBIDDEN");
  });

  test("a repeated reportReceipt request replays, and resolution returns the retained receipt", async () => {
    const { conversationId, tokens, first } = await room();
    const requestId = randomUUID();
    const input = { conversationId, kind: "read", membershipEpoch: "1", visibilityEpoch: "1", throughSequence: first.sequence };
    const committed = (await (await post("communication.reportReceipt", { credential: tokens.bob, requestId, input })).json())
      .data.reportReceipt;
    const replayed = (await (await post("communication.reportReceipt", { credential: tokens.bob, requestId, input })).json())
      .data.reportReceipt;
    assert.equal(replayed.replayed, true);
    assert.deepEqual(replayed.result, committed.result);
    const resolution = await result(await post("communication.resolveRequest", { credential: tokens.bob, input: { requestId } }),
      "resolveRequest");
    assert.equal(resolution.state, "committed");
    assert.equal(resolution.resultWithheld, false);
    assert.deepEqual(resolution.receipt.result.readReceipt, committed.result);
  });

  test("receipts pages the active members' progress in principal order for members only", async () => {
    const { alice, bob, conversationId, tokens, first } = await room();
    await result(await post("communication.reportReceipt", { credential: tokens.bob, input: { conversationId, kind: "delivered",
      membershipEpoch: "1", visibilityEpoch: "1", throughSequence: first.sequence } }), "reportReceipt");
    const list = (input, options = {}) => post("communication.receipts",
      { credential: tokens.alice, input: { conversationId, limit: 10, ...input }, ...options });
    const all = await result(await list({}), "receipts");
    assert.equal(all.complete, true);
    assert.equal(all.nextCursor, null);
    const [low, high] = [alice, bob].sort();
    assert.deepEqual(all.items.map(item => item.principalId), [low, high]);
    const byPrincipal = new Map(all.items.map(item => [item.principalId, item]));
    assert.deepEqual(byPrincipal.get(alice), { principalId: alice, membershipEpoch: "1", visibilityEpoch: "1",
      deliveredThroughSequence: null, readThroughSequence: null, updatedAt: null });
    assert.equal(byPrincipal.get(bob).deliveredThroughSequence, first.sequence);
    assert.equal(byPrincipal.get(bob).readThroughSequence, null);
    const page = await result(await list({ limit: 1 }), "receipts");
    assert.deepEqual([page.items.length, page.complete, page.nextCursor], [1, false, low]);
    const rest = await result(await list({ limit: 1, cursor: page.nextCursor }), "receipts");
    assert.deepEqual([rest.items[0].principalId, rest.complete], [high, true]);
    await problem(await list({ cursor: "not-a-cursor" }), 400, "INVALID_REQUEST");
    await problem(await list({}, { credential: tokens.carol }), 404, "NOT_FOUND");
    await problem(await list({}, { credential: mock.descriptor.credentials.backend }), 403, "FORBIDDEN");
  });
});
