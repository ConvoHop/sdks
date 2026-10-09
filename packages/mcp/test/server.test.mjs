import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { InMemoryTransport, LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/server";
import {
  REDACTED, createConvoHopMcpServer, mcpTools, operationMetaKey, retryToolName, withheldOperations,
} from "@convohop/mcp";
import { operationCatalog } from "@convohop/server";
import { ControlClient } from "../../../conformance/lib/control.mjs";
import { startMockTarget } from "../../../conformance/mock/server.mjs";
import { full, reply, resolution } from "../../../test/graphql-fixtures.mjs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const BACKEND_KEY = "fixture-backend-key-never-in-output", PORTAL_TOKEN = "fixture-portal-token-never-in-output";
const DESTRUCTIVE = [
  "communication_delete_message", "communication_disable_principal", "communication_end_live_session",
  "communication_remove_member", "communication_revoke_session", "management_disable_webhook",
  "management_revoke_backend_key", "management_rotate_webhook_secret", "management_update_webhook",
];

/** Connects a raw JSON-RPC client to a new server. `received` keeps every message the client receives. */
async function connect(t, options) {
  const server = createConvoHopMcpServer(options);
  const [client, transport] = InMemoryTransport.createLinkedPair();
  const pending = new Map(), received = [];
  let lastId = 0;
  client.onmessage = message => {
    received.push(message);
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  };
  await server.connect(transport);
  await client.start();
  t.after(() => server.close());
  async function rpc(method, params) {
    const id = ++lastId;
    const response = new Promise(resolve => pending.set(id, resolve));
    await client.send({ jsonrpc: "2.0", id, method, params });
    const message = await response;
    if (message.error) throw new Error(`${method} failed: ${message.error.message}`);
    return message.result;
  }
  const initialized = await rpc("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {},
    clientInfo: { name: "convohop-mcp-test", version: "0.0.0" } });
  await client.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  return {
    initialized, received,
    tools: async () => (await rpc("tools/list", {})).tools,
    call: (name, args) => rpc("tools/call", args === undefined ? { name } : { name, arguments: args }),
  };
}

async function mockTarget(t) {
  const target = await startMockTarget();
  t.after(() => target.close());
  const { descriptor } = target;
  return {
    descriptor, control: new ControlClient(descriptor.control),
    options: { managementUrl: descriptor.managementUrl, portalToken: descriptor.credentials.management,
      communicationUrl: descriptor.communicationUrl, projectId: descriptor.projectId, incarnation: descriptor.incarnation,
      backendKey: descriptor.credentials.backend },
  };
}

/** An authority that answers operations by name and routes every project to itself. */
function fakeAuthority(answers = {}) {
  const projectId = randomUUID(), incarnation = randomUUID(), requests = [];
  const fetch = async (url, init) => {
    const request = JSON.parse(init.body);
    requests.push({ url, authorization: new Headers(init.headers).get("authorization"), ...request });
    const answer = answers[request.operationName] ?? (request.operationName === "CommunicationRoute"
      ? () => reply(request, { result: { projectId, incarnation, servingEpoch: "1" } }) : undefined);
    if (!answer) throw new Error(`Unexpected ${request.operationName}`);
    return answer(request, requests);
  };
  return {
    projectId, requests,
    options: { managementUrl: "https://management.convohop.test", portalToken: PORTAL_TOKEN,
      communicationUrl: "https://communication.convohop.test", projectId, incarnation, backendKey: BACKEND_KEY, fetch },
  };
}

const problem = (request, code, status, message, extensions = {}) => Response.json({ errors: [{ message,
  extensions: { code, requestId: request.variables.context.requestId, outcome: "rejected", status, ...extensions } }] });
const capabilities = request => reply(request, { result: full("Capabilities", { serverRelease: "fixture", capabilityRevision: "1",
  limitsRevision: "1", limits: [], environment: "test", productionQualified: false, offerings: [], geos: [], installationProfiles: [] }) });

test("the server lists every generated tool with its hints and operation annotations, then retry_request", async t => {
  const { initialized, tools } = await connect(t, fakeAuthority().options);
  assert.equal(initialized.protocolVersion, LATEST_PROTOCOL_VERSION);
  assert.deepEqual(initialized.serverInfo, { name: "convohop", title: "ConvoHop", version: manifest.version });
  assert.ok(initialized.capabilities.tools);
  assert.match(initialized.instructions, /call retry_request with its requestId/);
  assert.match(initialized.instructions, /Confirm with the user before calling them/);

  const listed = await tools();
  assert.deepEqual(listed.map(tool => tool.name), [...mcpTools.map(tool => tool.name), retryToolName]);
  for (const definition of mcpTools) {
    const tool = listed.find(value => value.name === definition.name);
    assert.deepEqual(
      { title: tool.title, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations, meta: tool._meta },
      { title: definition.title, description: definition.description, inputSchema: definition.inputSchema,
        annotations: definition.annotations, meta: { [operationMetaKey]: definition.operation } },
      definition.name);
  }
  assert.deepEqual(listed.filter(tool => tool.annotations.destructiveHint).map(tool => tool.name).sort(),
    [...DESTRUCTIVE, retryToolName]);
  const retry = listed.at(-1);
  assert.deepEqual(retry.inputSchema.required, ["requestId"]);
  assert.deepEqual(retry.annotations, { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false });
});

test("each tool runs the SDK catalog operation with the same plane, kind and input fields", () => {
  assert.equal(mcpTools.length, 61);
  for (const tool of mcpTools) {
    const entry = operationCatalog[tool.operation.id];
    assert.ok(entry, tool.operation.id);
    assert.equal(tool.name, `${entry.plane}_${entry.field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`);
    assert.deepEqual([entry.plane, entry.kind], [tool.operation.plane, tool.operation.kind], tool.name);
    assert.deepEqual(Object.keys(tool.inputSchema.properties).sort(), [...entry.inputFields].sort(), tool.name);
    assert.equal(tool.operation.credential, tool.operation.plane === "management" ? "portalCredential" : "backendKey");
    assert.equal(tool.annotations.readOnlyHint, tool.operation.kind === "query");
    assert.equal(tool.annotations.destructiveHint, tool.operation.destructive);
  }
  assert.deepEqual(Object.keys(withheldOperations).sort(),
    ["communication.issueSession", "communication.renewSession", "management.createBillingCheckoutSession",
      "management.createBillingPortalSession", "management.credentialPermit"]);
  for (const id of Object.keys(withheldOperations)) {
    assert.ok(operationCatalog[id], id);
    assert.ok(!mcpTools.some(tool => tool.operation.id === id), id);
  }
});

test("read-only mode lists only the query tools", async t => {
  const { initialized, tools } = await connect(t, { ...fakeAuthority().options, readOnly: true });
  const listed = await tools();
  assert.deepEqual(listed.map(tool => tool.name),
    mcpTools.filter(tool => tool.operation.kind === "query").map(tool => tool.name));
  assert.ok(listed.every(tool => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint));
  assert.doesNotMatch(initialized.instructions, /retry_request/);
  assert.match(initialized.instructions, /Only read-only tools are available/);
});

test("each plane lists its tools only when all of its options are set", async t => {
  const { managementUrl, portalToken, fetch, ...communication } = fakeAuthority().options;
  for (const [options, plane] of [[{ managementUrl, portalToken, fetch }, "management"], [{ ...communication, fetch }, "communication"]]) {
    const listed = await (await connect(t, options)).tools();
    assert.deepEqual(listed.map(tool => tool.name),
      [...mcpTools.filter(tool => tool.operation.plane === plane).map(tool => tool.name), retryToolName], plane);
  }
  assert.throws(() => createConvoHopMcpServer({}),
    new TypeError("Configure the management plane, the communication plane or both"));
  assert.throws(() => createConvoHopMcpServer({ managementUrl }), new TypeError("Set managementUrl and portalToken together"));
  assert.throws(() => createConvoHopMcpServer({ managementUrl, portalToken, backendKey: BACKEND_KEY }),
    new TypeError("Set communicationUrl, projectId, incarnation and backendKey together"));
});

test("tools run their operations against the conformance mock", async t => {
  const { descriptor, options } = await mockTarget(t);
  const { call, received } = await connect(t, options);

  const route = await call("communication_route");
  assert.equal(route.isError, undefined);
  assert.equal(route.structuredContent.result.projectId, descriptor.projectId);
  assert.deepEqual(JSON.parse(route.content[0].text), route.structuredContent);

  const externalUserId = `mcp-${randomUUID()}`;
  const principal = await call("communication_create_principal", { externalUserId });
  assert.equal(principal.structuredContent.status, "committed");
  assert.equal(principal.structuredContent.result.externalUserId, externalUserId);
  const { principalId } = principal.structuredContent.result;

  const created = await call("communication_create_conversation",
    { title: "MCP", props: { topic: "tools" }, members: [{ principalId, role: "member" }] });
  assert.equal(created.structuredContent.status, "committed");
  const read = await call("communication_get_conversation", { conversationId: created.structuredContent.result.conversationId });
  assert.equal(read.structuredContent.status, "ok");
  assert.deepEqual([read.structuredContent.result.title, read.structuredContent.result.props], ["MCP", { topic: "tools" }]);

  const key = await call("management_issue_backend_key", { projectId: descriptor.projectId, name: "mcp",
    scopes: ["messageRead"], expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  assert.equal(key.structuredContent.status, "accepted");
  assert.equal(key.structuredContent.operation.owner, "management");

  const text = JSON.stringify(received);
  assert.ok(!text.includes(options.backendKey) && !text.includes(options.portalToken));
});

test("retry_request resolves an unknown mutation outcome and resends only a request the authority never saw", async t => {
  const { control, options } = await mockTarget(t);
  const { call } = await connect(t, options);
  for (const action of ["dropAfterCommit", "dropBeforeCommit"]) {
    await control.fault({ field: "createPrincipal", action });
    const externalUserId = `mcp-${action}`;
    const lost = await call("communication_create_principal", { externalUserId });
    const { requestId } = lost.structuredContent;
    assert.equal(lost.isError, true);
    assert.deepEqual([lost.structuredContent.code, lost.structuredContent.outcome], ["TRANSPORT_UNKNOWN", "unknown"]);
    assert.equal(lost.structuredContent.next,
      `Call retry_request with requestId ${requestId}. Don't call this tool again: that sends a new request.`);
    assert.match(lost.content[0].text, new RegExp(
      `^ConvoHop TRANSPORT_UNKNOWN: .+\\noutcome: unknown\\nrequestId: ${requestId}\\nnext: Call retry_request`));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const resolved = await call(retryToolName, { requestId });
      assert.equal(resolved.isError, undefined, action);
      assert.deepEqual([resolved.structuredContent.state, resolved.structuredContent.requestId], ["committed", requestId]);
      assert.equal(resolved.structuredContent.receipt.result.principal.externalUserId, externalUserId);
    }
    const sent = await control.waitLog({ kind: "request", match: { field: "createPrincipal", requestId } });
    assert.equal(sent.entries.length, action === "dropBeforeCommit" ? 2 : 1, action);
  }

  const unknown = randomUUID();
  const refused = await call(retryToolName, { requestId: unknown });
  assert.equal(refused.isError, true);
  assert.deepEqual(refused.structuredContent, { outcome: "unknown", requestId: unknown, message: "This server process sent " +
    "no mutation with this requestId, so it can't resend it. management_resolve_request or communication_resolve_request " +
    "can look the request up." });
});

test("a mutation that the transport can't record is reported as rejected without sending it", async t => {
  const authority = fakeAuthority({
    CommunicationDisablePrincipal: request => problem(request, "NOT_FOUND", 404, "Unknown principal"),
    CommunicationResolveRequest: request => reply(request, { result: resolution(request.variables.input.requestId, "notObservedYet") }),
  });
  const { call } = await connect(t, authority.options);
  // The transport keeps every mutation it hasn't seen committed or accepted, up to 128.
  for (let count = 0; count < 128; count += 1) {
    const rejected = await call("communication_disable_principal", { principalId: randomUUID(), expectedRevision: "1" });
    assert.equal(rejected.structuredContent.outcome, "rejected");
  }
  const sent = authority.requests.length;
  const refused = await call("communication_disable_principal", { principalId: randomUUID(), expectedRevision: "1" });
  assert.equal(refused.isError, true);
  assert.deepEqual(refused.structuredContent, { outcome: "rejected", requestId: refused.structuredContent.requestId,
    message: "Resolve outstanding mutations before creating more" });
  assert.equal(authority.requests.length, sent, "nothing was sent");
  const lookup = await call("communication_resolve_request", { requestId: refused.structuredContent.requestId });
  assert.equal(lookup.structuredContent.result.state, "notObservedYet", "queries still reach the authority");
});

test("authority and validation failures are structured tool errors with the outcome and the next step", async t => {
  const { control, descriptor, options } = await mockTarget(t);
  const { call } = await connect(t, { ...options, backendKey: descriptor.credentials.backendLimited });

  const denied = await call("communication_add_members", { conversationId: randomUUID(),
    members: [{ principalId: randomUUID(), role: "member", expectedRevision: "0" }] });
  assert.equal(denied.isError, true);
  assert.deepEqual(denied.structuredContent, { code: "SCOPE_REQUIRED", outcome: "rejected",
    requestId: denied.structuredContent.requestId, status: 403,
    message: "The backend key requires the current membershipManage scope", scope: "membershipManage" });

  await control.fault({ field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 7 });
  const limited = await call("communication_create_principal", { externalUserId: "mcp-rate-limited" });
  assert.deepEqual(limited.structuredContent, { code: "RATE_LIMITED", outcome: "rejected",
    requestId: limited.structuredContent.requestId, status: 429, message: "Request rate exceeded; retry later",
    retryAfter: 7, next: "The authority asked to wait 7 seconds before sending again." });

  const unsupported = await call("communication_get_principal", { principalId: randomUUID() });
  assert.deepEqual([unsupported.structuredContent.code, unsupported.structuredContent.outcome, unsupported.structuredContent.next],
    ["FEATURE_UNSUPPORTED", "rejected", undefined]);

  const invalid = await call("communication_create_principal", { externalUserId: 5 });
  assert.equal(invalid.isError, true);
  assert.match(invalid.content[0].text, /externalUserId must be string/);
  const extra = await call("communication_route", { projectId: descriptor.projectId });
  assert.equal(extra.isError, true);
  assert.match(extra.content[0].text, /must NOT have additional properties/);
});

test("results and errors never carry the configured credentials or credential fields", async t => {
  const sessionToken = "fixture-session-token-never-in-output", tokenExpiresAt = new Date().toISOString();
  const issued = randomUUID(), proven = randomUUID();
  const authority = fakeAuthority({
    CommunicationResolveRequest: request => {
      const { requestId } = request.variables.input;
      return reply(request, { result: resolution(requestId, "committed", requestId === issued
        ? { sessionBootstrap: { session: null, tokenExpiresAt, sessionToken } }
        : { signedProof: { signature: "fixture-signature" } }) });
    },
    CommunicationGetPrincipal: request => problem(request, "INVALID_REQUEST", 400,
      `The credential ${BACKEND_KEY} is malformed`),
    ManagementCapabilities: request => problem(request, "UNAUTHENTICATED", 401, `Bearer ${PORTAL_TOKEN} expired`),
  });
  const { call, received } = await connect(t, authority.options);

  const session = await call("communication_resolve_request", { requestId: issued });
  assert.equal(session.isError, undefined);
  assert.deepEqual(session.structuredContent.result.receipt.result.sessionBootstrap,
    { session: null, tokenExpiresAt, sessionToken: REDACTED });
  const proof = await call("communication_resolve_request", { requestId: proven });
  assert.equal(proof.structuredContent.result.receipt.result.signedProof, REDACTED);
  assert.equal(proof.structuredContent.result.requestId, proven);

  const rejected = await call("communication_get_principal", { principalId: randomUUID() });
  assert.equal(rejected.structuredContent.message, `The credential ${REDACTED} is malformed`);
  const unauthenticated = await call("management_capabilities");
  assert.equal(unauthenticated.structuredContent.message, `Bearer ${REDACTED} expired`);
  assert.match(unauthenticated.content[0].text, /^ConvoHop UNAUTHENTICATED: Bearer \[REDACTED\] expired\n/);

  const text = JSON.stringify(received);
  for (const secret of [BACKEND_KEY, PORTAL_TOKEN, sessionToken, "fixture-signature"]) assert.ok(!text.includes(secret), secret);
  // The credentials still authenticate the requests.
  assert.deepEqual([...new Set(authority.requests.map(request => request.authorization))],
    [`Bearer ${BACKEND_KEY}`, `Bearer ${PORTAL_TOKEN}`]);
});

test("a failed route sends nothing, and WRONG_REGION routes the next call again", async t => {
  let routes = 0, moved = false;
  const authority = fakeAuthority({
    CommunicationRoute: request => {
      routes += 1;
      if (routes === 1) throw new TypeError("fetch failed");
      return reply(request, { result: { projectId: authority.projectId, incarnation: authority.options.incarnation,
        servingEpoch: String(routes) } });
    },
    CommunicationCapabilities: request => {
      if (moved) return capabilities(request);
      moved = true;
      return problem(request, "WRONG_REGION", 409, "Route again");
    },
  });
  const { call } = await connect(t, authority.options);

  const unrouted = await call("communication_capabilities");
  assert.equal(unrouted.isError, true);
  assert.deepEqual([unrouted.structuredContent.code, unrouted.structuredContent.outcome], ["TRANSPORT_UNKNOWN", "rejected"]);
  assert.match(unrouted.structuredContent.message, /^Routing to the project failed, so the request was not sent: /);
  assert.deepEqual(authority.requests.map(request => request.operationName), ["CommunicationRoute"]);

  const wrongRegion = await call("communication_capabilities");
  assert.equal(wrongRegion.structuredContent.code, "WRONG_REGION");
  const served = await call("communication_capabilities");
  assert.equal(served.isError, undefined);
  assert.equal(served.structuredContent.result.serverRelease, "fixture");
  assert.deepEqual(authority.requests.map(request => request.operationName), ["CommunicationRoute", "CommunicationRoute",
    "CommunicationCapabilities", "CommunicationRoute", "CommunicationCapabilities"]);
});
