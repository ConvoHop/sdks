import test from "node:test";
import assert from "node:assert/strict";
import { V1ManagementClient } from "../dist/index.js";

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
