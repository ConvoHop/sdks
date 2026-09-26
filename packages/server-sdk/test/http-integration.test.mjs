import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { InvalidResponseError, ManagementClient, ProjectServerClient } from "../dist/index.js";

const adminToken = `adm_${"a".repeat(64)}`;
const projectKey = `pk_${"b".repeat(64)}`;
const userToken = `st_${"c".repeat(64)}`;
const projectId = "a6629296-84d7-4e81-a8cd-af471662eeab";
const threadId = "d09e2a22-f993-4b7a-b94c-068e08c3e6af";
const mediaId = "8e345603-a2b4-4c53-81f9-7b924bb50a56";
const identityId = "ci_11111111111111111111111111111111";

test("loopback GraphQL traffic isolates credentials and never follows redirects", async (t) => {
  const seen = [];
  let tokenRequests = 0;
  let redirected = false;
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    seen.push({ path: request.url, auth: request.headers.authorization, body });
    const send = (status, field, value) => {
      response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ data: { [field]: value } }));
    };
    if (request.url === "/graphql" && request.method === "POST" &&
        body.query.includes("createProject") && request.headers.authorization === `Bearer ${adminToken}`) {
      send(200, "createProject", { id: projectId, projectKey });
    } else if (body.query.includes("projects(") && request.headers.authorization === `Bearer ${adminToken}`) {
      send(200, "projects", {
        items: [{ id: projectId, name: "Team", status: "active" }], nextAfter: projectId,
      });
    } else if (body.query.includes("issueIdentityToken(") && request.headers.authorization === `Bearer ${projectKey}`) {
      if (++tokenRequests === 2) {
        response.writeHead(307, { Location: "/capture" });
        response.end();
      } else {
        send(200, "issueIdentityToken", {
          token: userToken, expiresAt: new Date(Date.now() + 900_000).toISOString(),
        });
      }
    } else if (request.url === "/capture") {
      redirected = true;
      send(200, "issueIdentityToken", { token: userToken });
    } else if (body.query.includes("createCall(") && request.headers.authorization === `Bearer ${userToken}`) {
      send(200, "createCall", {
        id: mediaId, projectId, threadId, mode: "audio", kind: "call",
        owner: identityId, title: "Support", audience: "members", state: "requested",
      });
    } else if (body.query.includes("joinMedia(") && request.headers.authorization === `Bearer ${userToken}`) {
      send(200, "joinMedia", {
        participantId: projectId, serverUrl: "ws://localhost:7880",
        token: "livekit-grant", expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
    } else {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { code: "unauthenticated", message: "authentication required" } }));
    }
  });
  server.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const management = new ManagementClient({ baseUrl, adminToken });
  assert.equal((await management.createProject("Team")).projectKey, projectKey);
  assert.equal((await management.listProjects()).items[0].id, projectId);
  const project = new ProjectServerClient({ baseUrl, projectKey });
  const user = await project.asIdentity(identityId);
  assert.equal((await user.createCall(threadId, "Support", "audio")).id, mediaId);
  assert.equal((await user.joinMedia(mediaId)).token, "livekit-grant");
  await assert.rejects(
    project.mintIdentityToken(identityId),
    (error) => error instanceof InvalidResponseError && error.status === 307,
  );
  assert.equal(redirected, false);
  assert.deepEqual(seen.map(({ auth }) => auth), [
    `Bearer ${adminToken}`, `Bearer ${adminToken}`, `Bearer ${projectKey}`,
    `Bearer ${userToken}`, `Bearer ${userToken}`, `Bearer ${projectKey}`,
  ]);
  assert.ok(seen.every(({ path, body }) =>
    path === "/graphql" &&
    !path.includes(adminToken) && !path.includes(projectKey) &&
    !JSON.stringify(body).includes(projectKey) && !JSON.stringify(body).includes(userToken)));
});
