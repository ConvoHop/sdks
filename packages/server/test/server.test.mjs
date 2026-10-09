import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ConvoHopManagementClient, ProjectServerClient, ConvoHopProblem, operationCatalog } from "@convohop/server";
import { full, reply, resolution } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

test("conversation handles grant broadcast permission through generated backend scope, not a moderator toggle", async () => {
  const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), conversationId = crypto.randomUUID();
  const principalId = crypto.randomUUID(), requestId = crypto.randomUUID(), requests = [];
  const member = { conversationId, principalId, role: "member", status: "active", membershipEpoch: "1",
    visibilityEpoch: "1", revision: "2", visibleFromSequence: "1", canStartBroadcast: true };
  const server = new ProjectServerClient({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation,
    backendKey: "fixture-only", fetch: async (url, options) => {
      const request = JSON.parse(options.body); requests.push(request);
      assert.equal(url, "http://127.0.0.1:18080/graphql");
      return reply(request, { result: { member, mediaCutoff: null } });
    } });
  const handle = server.conversation(conversationId);
  assert.equal(handle.then, undefined);
  assert.equal(requests.length, 0);
  const result = await handle.members.setBroadcastPermission({ principalId, allowed: true,
    expectedMembershipRevision: "1" }, { requestId });
  assert.equal(result.result.member.role, "member");
  assert.equal(result.result.member.canStartBroadcast, true);
  assert.equal(requests[0].operationName, "CommunicationSetBroadcastPermission");
  assert.deepEqual(requests[0].variables.input, { conversationId, principalId, allowed: true, expectedMembershipRevision: "1" });
});

test("backend data-plane calls carry generated actAsPrincipalId and surface SCOPE_REQUIRED as a typed problem", async () => {
  const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), conversationId = crypto.randomUUID();
  const actAsPrincipalId = crypto.randomUUID(), backendKey = "fixture-backend-key-never-in-errors", requests = [];
  const server = new ProjectServerClient({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation, backendKey,
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body); requests.push(request);
      if (request.operationName === "CommunicationInbox")
        return Response.json({ errors: [{ message: "The backend key requires the current messageRead scope",
          extensions: { code: "SCOPE_REQUIRED", requestId: request.variables.context.requestId, outcome: "rejected",
            retryable: false, status: 403 } }] });
      assert.equal(request.operationName, "CommunicationSendMessage");
      return reply(request, { result: { messageId: crypto.randomUUID(), conversationId, sequence: "1", revision: "1",
        status: "sent", cursor: { incarnation, conversationId, sequence: "1" } } });
    } });
  for (const key of ["communication.sendMessage", "communication.messages", "communication.getMessage",
    "communication.inbox", "communication.search"])
    assert.ok(operationCatalog[key].inputFields.includes("actAsPrincipalId"), key);
  for (const key of ["communication.editMessage", "communication.deleteMessage", "communication.events"])
    assert.ok(!operationCatalog[key].inputFields.includes("actAsPrincipalId"), key);

  const requestId = crypto.randomUUID(), send = { conversationId, text: "fixture", props: {}, actAsPrincipalId };
  const sent = await server.http.execute("communication.sendMessage", projectId, send, requestId);
  assert.equal(sent.result.conversationId, conversationId);
  assert.deepEqual(requests[0].variables.input, send);
  await assert.rejects(server.http.execute("communication.sendMessage", projectId,
    { ...send, actAsPrincipalId: crypto.randomUUID() }, requestId), { code: "IDEMPOTENCY_CONFLICT" });
  await assert.rejects(server.http.execute("communication.editMessage", projectId, { conversationId,
    messageId: sent.result.messageId, expectedRevision: "1", text: "fixture", props: {}, actAsPrincipalId }),
  { code: "INVALID_REQUEST", message: "Unknown GraphQL input field" });
  assert.equal(requests.length, 1);

  await assert.rejects(server.http.execute("communication.inbox", projectId, { limit: 10, actAsPrincipalId }), error => {
    assert.ok(error instanceof ConvoHopProblem);
    assert.equal(error.code, "SCOPE_REQUIRED");
    assert.equal(error.outcome, "rejected");
    assert.equal(error.status, 403);
    assert.ok(!String(error).includes(backendKey));
    assert.ok(!JSON.stringify(error).includes(backendKey));
    return true;
  });
  assert.deepEqual(requests[1].variables.input, { limit: 10, actAsPrincipalId });
  assert.equal(requests.length, 2);
});

test("the IR grants backend keys only the explicit data-plane scopes and documents SCOPE_REQUIRED", () => {
  const ir = JSON.parse(readFileSync(new URL("../../../schema/ir.json", import.meta.url), "utf8"));
  const operation = id => {
    const found = ir.operations.find(item => item.id === id);
    assert.ok(found, id);
    return found;
  };
  const backendScopes = id => operation(id).auth.filter(entry => entry.credential === "backendKey").map(entry => entry.scopes);
  for (const name of ["messageRead", "messageWrite", "callRead"]) assert.ok(ir.scopes.some(scope => scope.name === name), name);

  for (const [id, scope] of [["communication.sendMessage", "messageWrite"], ["communication.messages", "messageRead"],
    ["communication.getMessage", "messageRead"], ["communication.inbox", "messageRead"], ["communication.search", "messageRead"]]) {
    assert.equal(operation(id).layer, "both", id);
    assert.deepEqual(backendScopes(id), [[scope]], id);
  }
  for (const id of ["communication.currentLiveSession", "communication.liveSession", "communication.liveSessions",
    "communication.liveSessionParticipants", "communication.liveSessionOperation"])
    assert.deepEqual(backendScopes(id), [["callRead"], ["callManage"]], id);
  // Read scopes never authorize moderation or live-session control.
  for (const id of ["communication.editMessage", "communication.deleteMessage"]) assert.deepEqual(backendScopes(id), [["moderation"]], id);
  for (const id of ["communication.alertLiveSession", "communication.endLiveSession"]) assert.deepEqual(backendScopes(id), [["callManage"]], id);
  for (const id of ["communication.events", "communication.receipts", "communication.reportReceipt", "communication.typing"]) {
    assert.equal(operation(id).layer, "client", id);
    assert.deepEqual(backendScopes(id), [], id);
  }

  const scopeRequired = ir.errors.codes.find(code => code.name === "SCOPE_REQUIRED");
  assert.deepEqual([scopeRequired?.origin, scopeRequired?.status, scopeRequired?.retryable], ["server", 403, false]);
  for (const item of ir.operations)
    if (item.auth.some(entry => entry.credential === "backendKey" && entry.scopes))
      assert.ok(item.errors.codes.includes("SCOPE_REQUIRED"), item.id);
});

test("backend onboarding uses current generated operations and returns the typed scoped bootstrap", async () => {
  const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), principalId = crypto.randomUUID();
  const deviceId = crypto.randomUUID(), conversationId = crypto.randomUUID(), requests = [];
  const session = { sessionId: crypto.randomUUID(), principalId, deviceId, incarnation,
    sessionRevision: "1", expiresAt: new Date(Date.now() + 900000).toISOString(), status: "active" };
  const issued = { session, sessionToken: "fixture-user-session", tokenExpiresAt: session.expiresAt };
  const client = new ProjectServerClient({ baseUrl: "http://localhost:18080", projectId, incarnation,
    backendKey: "fixture-backend", fetch: async (url, options) => {
      assert.equal(url, "http://localhost:18080/graphql");
      assert.equal(options.headers.authorization, "Bearer fixture-backend");
      const request = JSON.parse(options.body); requests.push(request);
      assert.equal(request.variables.context.projectId, projectId);
      assert.equal(request.variables.context.incarnation, incarnation);
      switch (request.operationName) {
        case "CommunicationRoute": return reply(request, { result: { projectId, incarnation, servingEpoch: "2" } });
        case "CommunicationCreatePrincipal": return reply(request, { result: {
          principalId, externalUserId: "authenticated-account", status: "active", revision: "1",
        } });
        case "CommunicationIssueSession": return reply(request, { result: issued });
        case "CommunicationCreateConversation": return reply(request, { result: full("Conversation", {
          conversationId, revision: "1", title: "Support", props: {}, latestSequence: "1",
        }) });
        default: throw new Error("Unexpected operation");
      }
    } });
  await client.initialize();
  assert.equal(await client.createPrincipal("authenticated-account"), principalId);
  assert.deepEqual(await client.issueSession(principalId, deviceId), issued);
  assert.equal((await client.createConversation("Support", [{ principalId, role: "member" }])).conversationId, conversationId);
  assert.deepEqual(requests[2].variables.input, { principalId, deviceId, requestedTtlMs: "900000" });
  assert.ok(requests.slice(1).every(request => request.variables.context.observedServingEpoch === "2"));
  assert.ok(client.http.recoveryStates.every(state => !JSON.stringify(state).includes("fixture-user-session")));
});

test("management key issuance and permits retain generated inputs, not result secrets", async () => {
  const projectId = crypto.randomUUID(), deliveryId = crypto.randomUUID(), redemptionRequestId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60000).toISOString(), requests = [];
  const client = new ConvoHopManagementClient({ baseUrl: "http://localhost:18081", actorId: crypto.randomUUID(),
    accessToken: "fixture-operator", fetch: async (_url, options) => {
      assert.equal(options.headers.authorization, "Bearer fixture-operator");
      const request = JSON.parse(options.body); requests.push(request);
      assert.equal(request.variables.context.projectId, undefined);
      if (request.operationName === "ManagementIssueBackendKey")
        return reply(request, { status: "accepted",
          operation: { operationId: crypto.randomUUID(), owner: "management", href: "/graphql", state: "requested" },
          resourceRef: { kind: "project", id: projectId } });
      if (request.operationName === "ManagementCredentialPermit")
        return reply(request, { result: { signature: "fixture-secret-permit" } });
      throw new Error("Unexpected operation");
    } });
  await client.issueBackendKey(projectId, "backend", ["membershipManage"], expiresAt);
  assert.deepEqual(await client.deliveryPermit(projectId, deliveryId, redemptionRequestId), { signature: "fixture-secret-permit" });
  assert.deepEqual(requests[0].variables.input, { projectId, name: "backend", scopes: ["membershipManage"], expiresAt });
  assert.deepEqual(requests[1].variables.input, { projectId, deliveryId, redemptionRequestId });
  assert.ok(client.http.recoveryStates.every(state => !JSON.stringify(state).includes("fixture-secret-permit")));
});

test("usage queries use generated management operations and keep meter quantities as decimal strings", async () => {
  const deploymentId = crypto.randomUUID(), projectId = crypto.randomUUID(), orgId = crypto.randomUUID(), requests = [];
  const from = "2026-10-01T00:00:00.000Z", to = "2026-10-01T05:00:00.000Z", reason = "Usage aggregation has not reported yet";
  const scopes = { ManagementDeploymentUsage: ["DeploymentUsage", { deploymentId }],
    ManagementProjectUsage: ["ProjectUsage", { projectId }], ManagementOrganizationUsage: ["OrganizationUsage", { orgId }] };
  let quantity = "9223372036854775807";
  const client = new ConvoHopManagementClient({ baseUrl: "http://localhost:18081", actorId: crypto.randomUUID(),
    accessToken: "fixture-operator", fetch: async (_url, options) => {
      const request = JSON.parse(options.body); requests.push(request);
      if (!Object.hasOwn(scopes, request.operationName)) throw new Error("Unexpected operation");
      const [type, scope] = scopes[request.operationName];
      return reply(request, { result: full(type, { ...scope, source: "usage-rollup", observedAt: to, complete: false,
        reason, from, to, meters: [
          full("UsageMeter", { meter: "api_calls", unit: "call", quantity, emitted: true }),
          full("UsageMeter", { meter: "egress_gb", unit: "byte", quantity: "0", emitted: false }),
        ] }) });
    } });
  const payloads = [
    await client.http.execute("management.deploymentUsage", undefined, { deploymentId, from, to }),
    await client.http.execute("management.projectUsage", undefined, { projectId }),
    await client.http.execute("management.organizationUsage", undefined, { orgId, to }),
  ];
  assert.deepEqual(requests.map(request => request.operationName),
    ["ManagementDeploymentUsage", "ManagementProjectUsage", "ManagementOrganizationUsage"]);
  assert.deepEqual(requests.map(request => request.variables.input), [{ deploymentId, from, to }, { projectId }, { orgId, to }]);
  assert.ok(requests.every(request => request.variables.context.projectId === undefined));
  for (const [index, scope] of [{ deploymentId }, { projectId }, { orgId }].entries())
    assert.deepEqual(payloads[index].result, { ...scope, source: "usage-rollup", observedAt: to, complete: false, reason,
      from, to, aggregatedThrough: null, meters: [
        { meter: "api_calls", unit: "call", quantity: "9223372036854775807", emitted: true },
        { meter: "egress_gb", unit: "byte", quantity: "0", emitted: false },
      ] });
  for (const malformed of [5, "-1", "1.5", "01", "9223372036854775808"]) {
    quantity = malformed;
    await assert.rejects(client.http.execute("management.projectUsage", undefined, { projectId }),
      { name: "ConvoHopProblem", code: "INVALID_RESPONSE" }, String(malformed));
  }
  assert.equal(requests.length, 8);
});

test("membership batches use generated GraphQL and preserve original identity and decimal revisions", async () => {
  const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), conversationId = crypto.randomUUID();
  const requestId = crypto.randomUUID(), principalId = crypto.randomUUID(), requests = [];
  const client = new ProjectServerClient({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation,
    backendKey: "pk_fixture-only", fetch: async (url, options) => {
      const request = JSON.parse(options.body); requests.push({ url, request });
      return reply(request, { result: { items: [{
          conversationId, principalId, role: "member", status: "active", membershipEpoch: "1",
          visibilityEpoch: "1", revision: "1", visibleFromSequence: "1", canStartBroadcast: false,
        }] } });
    } });
  const members = [{ principalId, role: "member", expectedRevision: "9223372036854775807" }];
  assert.equal((await client.addMembers(conversationId, members, requestId))[0].canStartBroadcast, false);
  assert.equal(requests[0].url, "http://127.0.0.1:18080/graphql");
  assert.equal(requests[0].request.operationName, "CommunicationAddMembers");
  assert.equal(requests[0].request.variables.context.requestId, requestId);
  assert.deepEqual(requests[0].request.variables.input, { conversationId, members });
  for (const invalid of [[], Array(101).fill(members[0]), [members[0], members[0]]])
    await assert.rejects(client.addMembers(conversationId, invalid), /1\.\.100 distinct/);
  assert.equal(requests.length, 1);
});

test("hosted management requires explicit deployment and project inputs without local fallback", async () => {
  const calls = [];
  const client = new ConvoHopManagementClient({ baseUrl: "https://management.example.test", actorId: crypto.randomUUID(),
    accessToken: "fixture-only", fetch: async (url, options) => {
      const request = JSON.parse(options.body); calls.push({ url, request });
      const field = request.operationName === "ManagementCreateProject" ? "createProject" : "createDeployment";
      return reply(request, { status: "accepted",
        operation: { operationId: crypto.randomUUID(), owner: "management", href: "/graphql", state: "requested" },
        resourceRef: { kind: field === "createProject" ? "project" : "deployment", id: crypto.randomUUID() } });
    } });
  const identity = crypto.randomUUID();
  await assert.rejects(client.createDeployment(identity), /explicit/);
  await assert.rejects(client.createProject(identity, "Pilot"), /explicit/);
  assert.equal(calls.length, 0);
  const configuration = { offering: "managedShared", geoId: "fixture-region", installationProfileId: "fixture-profile", consentRef: "fixture-consent" };
  await client.createDeployment(identity, configuration);
  await client.createProject(identity, "Pilot", { environment: "prod", backendPrincipalName: "pilot-server" });
  assert.deepEqual(calls[0].request.variables.input, { ...configuration, orgId: identity });
  assert.deepEqual(calls[1].request.variables.input, { deploymentId: identity, name: "Pilot", environment: "prod", backendPrincipalName: "pilot-server" });
  assert.ok(calls.every(call => call.url === "https://management.example.test/graphql"));
});

test("async project recovery restores before route access and survives scoped backend-key rotation", async () => {
  const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), principalId = crypto.randomUUID();
  const requestId = crypto.randomUUID(), conversationId = crypto.randomUUID();
  const key = "convohop.requests:backend:" + projectId;
  const read = Promise.withResolvers(), entered = Promise.withResolvers();
  let blocked = Infinity;
  const saved = asyncStorage({ onRead: async () => {
    if (saved.reads.length === blocked) { entered.resolve(); await read.promise; }
  } });
  const input = { title: "original", props: {}, members: [{ principalId, role: "member" }] };
  const clientOptions = { baseUrl: "http://localhost:18080", projectId, incarnation, asyncRecoveryStorage: saved };
  const first = new ProjectServerClient({ ...clientOptions, backendKey: "fixture-original-backend",
    fetch: async (_url, init) => {
      assert.equal(init.headers.authorization, "Bearer " + "fixture-original-backend");
      throw new Error("response lost");
    } });
  await assert.rejects(first.conversations.create(input, { requestId }), { code: "TRANSPORT_UNKNOWN" });
  const original = first.http.recoveryStates[0], requests = [];
  let committed = false, mutations = 0;
  const refreshedKey = "fixture-refreshed-backend";
  const restarted = new ProjectServerClient({ ...clientOptions, backendKey: refreshedKey, fetch: async (_url, init) => {
    assert.equal(init.headers.authorization, "Bearer " + refreshedKey);
    const request = JSON.parse(init.body); requests.push(request);
    assert.equal(request.variables.context.projectId, projectId);
    assert.equal(request.variables.context.incarnation, incarnation);
    if (request.operationName === "CommunicationRoute")
      return reply(request, { result: { projectId, incarnation, servingEpoch: "2" } });
    if (request.operationName === "CommunicationResolveRequest")
      return reply(request, { result: resolution(requestId, committed ? "committed" : "notObservedYet") });
    assert.equal(request.operationName, "CommunicationCreateConversation");
    assert.equal(request.variables.context.requestId, requestId);
    assert.deepEqual(request.variables.input, input);
    mutations++; committed = true;
    return reply(request, { result: full("Conversation", { conversationId, revision: "1",
      title: "original", props: {}, latestSequence: "1" }) });
  } });
  assert.throws(() => restarted.http.recoveryStates, /initializeRecovery/);
  // The first client restored once and merged each write into the stored journal; the restart's restore is held.
  const before = saved.reads.length;
  assert.equal(before, 1 + saved.writes.length);
  blocked = before + 1;
  const initialized = restarted.initialize();
  await entered.promise;
  assert.equal(requests.length, 0);
  assert.deepEqual(saved.reads.slice(before), [key]);
  read.resolve();
  await initialized;
  assert.deepEqual(restarted.http.recoveryStates, first.http.recoveryStates);
  assert.equal(restarted.http.servingEpoch, "2");
  assert.equal((await restarted.http.retry(requestId)).state, "committed");
  const current = restarted.http.recoveryStates[0];
  for (const field of ["requestId", "payloadFingerprint", "firstSubmittedAt", "retryDeadline", "incarnation", "projectId"])
    assert.equal(current[field], original[field]);
  assert.deepEqual(current.input, original.input);
  assert.equal(current.attemptCount, 2);
  assert.equal(mutations, 1);
  assert.equal(restarted.http.durableRecovery, true);
  assert.deepEqual(requests.map(request => request.operationName), [
    "CommunicationRoute", "CommunicationResolveRequest", "CommunicationCreateConversation", "CommunicationResolveRequest",
  ]);
  assert.ok(saved.writes.every(({ key: namespace, value }) => namespace === key && !value.includes("fixture-")));
  assert.equal(saved.removals.length, 0);
});

test("project async write failure prevents authority effects and retains the supplied command identity", async () => {
  const requestId = crypto.randomUUID(), projectId = crypto.randomUUID(), incarnation = crypto.randomUUID();
  const saved = asyncStorage({ onWrite: async () => { throw new Error("database unavailable"); } });
  let fetches = 0;
  const client = new ProjectServerClient({ baseUrl: "http://localhost:18080", projectId, incarnation,
    backendKey: "fixture-backend", asyncRecoveryStorage: saved, fetch: async () => { fetches++; } });
  await assert.rejects(client.conversations.create({ title: "original", props: {}, members: [] }, { requestId }),
    { code: "RECOVERY_STORAGE_FAILURE", requestId, outcome: "unknown" });
  assert.equal(fetches, 0);
  assert.equal(client.http.recoveryStates[0].requestId, requestId);
  assert.equal(client.http.recoveryStates[0].projectId, projectId);
  assert.equal(client.http.recoveryStates[0].incarnation, incarnation);
  assert.equal(client.http.recoveryStates[0].attemptCount, 0);
});

test("management forwards async storage and scopes the journal to the actor rather than credentials", async () => {
  const actorId = crypto.randomUUID(), saved = asyncStorage();
  const client = new ConvoHopManagementClient({ baseUrl: "http://localhost:18081", actorId,
    accessToken: "fixture-operator", asyncRecoveryStorage: saved, fetch: async (_url, init) => {
      return reply(JSON.parse(init.body), { result: {
        orgId: crypto.randomUUID(), name: "original", status: "active", revision: "1",
      } });
    } });
  await client.createOrganization("original", "fixture");
  const key = "convohop.requests:management:" + actorId;
  // Restored once; each write merges into the stored journal.
  assert.deepEqual(saved.reads, Array(1 + saved.writes.length).fill(key));
  assert.ok(saved.writes.every(value => value.key === key && !value.value.includes("fixture-operator")));
});

test("both Server SDK constructors reject conflicting storage before loading either adapter", () => {
  let reads = 0;
  const recoveryStorage = { getItem: () => { reads++; return null; }, setItem() {}, removeItem() {} };
  const saved = asyncStorage();
  const common = { baseUrl: "http://localhost:18080", recoveryStorage, asyncRecoveryStorage: saved };
  assert.throws(() => new ProjectServerClient({ ...common, projectId: crypto.randomUUID(), incarnation: crypto.randomUUID(),
    backendKey: "fixture-backend" }), /recoveryStorage.*asyncRecoveryStorage/);
  assert.throws(() => new ConvoHopManagementClient({ ...common, actorId: crypto.randomUUID(),
    accessToken: "fixture-operator" }), /recoveryStorage.*asyncRecoveryStorage/);
  assert.equal(reads, 0);
  assert.equal(saved.reads.length, 0);
});
