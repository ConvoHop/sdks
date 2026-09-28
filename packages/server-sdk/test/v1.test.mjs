import test from "node:test";
import assert from "node:assert/strict";
import { V1ManagementClient, V1ProjectServerClient } from "../dist/index.js";

test("membership batches use generated GraphQL and preserve original identity and decimal revisions", async () => {
  const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), conversationId = crypto.randomUUID();
  const requestId = crypto.randomUUID(), principalId = crypto.randomUUID(), requests = [];
  const client = new V1ProjectServerClient({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation,
    backendKey: "pk_fixture-only", fetch: async (url, options) => {
      const request = JSON.parse(options.body); requests.push({ url, request });
      return Response.json({ data: { addMembers: { status: "committed", requestId, receiptId: crypto.randomUUID(),
        committedAt: new Date().toISOString(), replayed: false, result: { items: [{
          conversationId, principalId, role: "member", status: "active", membershipEpoch: "1",
          visibilityEpoch: "1", revision: "1", visibleFromSequence: "1", canStartBroadcast: false,
        }] } } } });
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
  const client = new V1ManagementClient({ baseUrl: "https://management.example.test", actorId: crypto.randomUUID(),
    accessToken: "fixture-only", fetch: async (url, options) => {
      const request = JSON.parse(options.body); calls.push({ url, request });
      const field = request.operationName === "ManagementCreateProject" ? "createProject" : "createDeployment";
      return Response.json({ data: { [field]: { status: "accepted", requestId: request.variables.context.requestId,
        operation: { operationId: crypto.randomUUID() }, resourceRef: { id: crypto.randomUUID() } } } });
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
