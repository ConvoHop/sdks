import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ApiError, InvalidResponseError, ManagementClient, ProjectServerClient, TransportError,
} from "../dist/index.js";

const adminToken = `adm_${"a".repeat(64)}`;
const projectKey = `pk_${"b".repeat(64)}`;
const userToken = `st_${"c".repeat(64)}`;
const projectId = "a6629296-84d7-4e81-a8cd-af471662eeab";
const threadId = "d09e2a22-f993-4b7a-b94c-068e08c3e6af";
const callId = "8e345603-a2b4-4c53-81f9-7b924bb50a56";
const clientId = "5d681045-9fb6-4d5b-af18-5ca5caee66fd";
const identityId = "ci_11111111111111111111111111111111";
const requestId = "674c70cc-41c0-41e9-9797-218087aa3307";
const expiry = new Date(Date.now() + 15 * 60_000).toISOString();
const json = (field, value) => Response.json({ data: { [field]: value } });
const message = {
  id: clientId, threadId, sequence: "6", sender: identityId,
  clientMessageId: clientId, body: "hello", props: { ticketId: 42 }, createdAt: expiry,
};
const call = {
  id: callId, projectId, threadId, mode: "audio", kind: "call",
  owner: identityId, title: "Support", audience: "members", state: "requested",
};

test("credentials and service origins are validated before requests", () => {
  const management = { baseUrl: "http://127.0.0.1:8081", adminToken };
  const project = { baseUrl: "http://127.0.0.1:8080", projectKey };
  for (const baseUrl of [
    "https://management.example.com", "http://localhost.evil:8081",
    "http://127.0.0.1:8081/graphql", "http://127.0.0.1:8081?secret=1",
    "http://127.0.0.1:8081/#fragment", "http://127.0.0.1:8081\n",
    "http://127.0.0.1:8081/v1/../", "http://@127.0.0.1:8081",
  ]) {
    assert.throws(() => new ManagementClient({ ...management, baseUrl }), TypeError);
  }
  assert.throws(() => new ProjectServerClient({ ...project, baseUrl: "http://api.example.com" }), /HTTPS/);
  assert.doesNotThrow(() => new ProjectServerClient({ ...project, baseUrl: "https://api.example.com" }));
  assert.throws(() => new ManagementClient({ ...management, adminToken: projectKey }), /adm_/);
  assert.throws(() => new ProjectServerClient({ ...project, projectKey: adminToken }), /pk_/);
  assert.throws(() => new ProjectServerClient({ ...project, timeoutMs: 0 }), /timeoutMs/);
  assert.throws(() => new ManagementClient({ ...management, fetch: "invalid" }), /fetch/);
  assert.equal(JSON.stringify(new ManagementClient(management)), "{}");
  assert.equal(JSON.stringify(new ProjectServerClient(project)), "{}");
});

test("Management GraphQL provisions, pages and suspends with adm_ only", async () => {
  const requests = [];
  const values = [
    json("createProject", { id: projectId, projectKey }),
    json("projects", {
      items: [{ id: projectId, name: "Team", status: "active" }],
      nextAfter: projectId,
    }),
    json("suspendProject", true),
  ];
  const client = new ManagementClient({
    baseUrl: "http://127.0.0.1:8081", adminToken,
    fetch: async (url, init) => {
      requests.push({ url, init });
      return values.shift();
    },
  });
  assert.deepEqual(await client.createProject("Team"), { id: projectId, projectKey });
  assert.deepEqual(await client.listProjects({ limit: 2 }), {
    items: [{ id: projectId, name: "Team", status: "active" }],
    nextAfter: projectId,
  });
  await client.suspendProject(projectId);
  assert.deepEqual(requests.map(({ url }) => url), Array(3).fill("http://127.0.0.1:8081/graphql"));
  assert.deepEqual(requests.map(({ init }) => JSON.parse(init.body).variables), [
    { name: "Team" }, { limit: 2 }, { id: projectId },
  ]);
  for (const { url, init } of requests) {
    assert.equal(init.headers.Authorization, `Bearer ${adminToken}`);
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "omit");
    assert.equal(init.redirect, "manual");
    assert.ok(!url.includes(adminToken) && !init.body.includes(adminToken));
  }
});

test("project key mints identity sessions; st_ operates chat, calls and WS", async () => {
  const requests = [];
  let socket;
  let socketUrl;
  let protocol;
  const client = new ProjectServerClient({
    baseUrl: "http://127.0.0.1:8080", projectKey,
    fetch: async (url, init) => {
      requests.push({ url, init });
      const { query } = JSON.parse(init.body);
      if (query.includes("issueIdentityToken(")) {
        return json("issueIdentityToken", { token: userToken, expiresAt: expiry });
      }
      if (query.includes("createCall(")) return json("createCall", call);
      if (query.includes("joinMedia(")) return json("joinMedia", {
        participantId: clientId, serverUrl: "ws://localhost:7880",
        token: "livekit-grant", expiresAt: expiry,
      });
      return json("sendMessage", message);
    },
  });
  assert.deepEqual(await client.mintIdentityToken(identityId), { token: userToken, expiresAt: expiry });
  const user = await client.asIdentity(identityId, {
    socketFactory: (url, subprotocol) => {
      socketUrl = url;
      protocol = subprotocol;
      socket = {
        readyState: 1,
        sent: [],
        onopen: null, onmessage: null, onerror: null, onclose: null,
        send(text) { this.sent.push(JSON.parse(text)); },
        close() { this.readyState = 3; },
      };
      return socket;
    },
  });
  assert.equal((await user.createCall(threadId, "Support", "audio")).threadId, threadId);
  assert.equal((await user.joinMedia(callId)).token, "livekit-grant");
  assert.equal((await user.sendMessage(threadId, "hello", {
    props: { ticketId: 42 }, clientMessageId: clientId,
  })).props.ticketId, 42);
  const stream = user.subscribeThread(threadId, { onEvent: () => {}, onError: () => {} });
  socket.onopen(new Event("open"));
  assert.equal(socketUrl, "ws://127.0.0.1:8080/graphql");
  assert.equal(protocol, "graphql-transport-ws");
  assert.deepEqual(socket.sent[0], { type: "connection_init", payload: { token: userToken } });
  stream.close();

  assert.deepEqual(requests.map(({ init }) => init.headers.Authorization), [
    `Bearer ${projectKey}`, `Bearer ${projectKey}`,
    `Bearer ${userToken}`, `Bearer ${userToken}`, `Bearer ${userToken}`,
  ]);
  assert.deepEqual(JSON.parse(requests[0].init.body).variables, { identityId });
  for (const { url, init } of requests) {
    assert.equal(url, "http://127.0.0.1:8080/graphql");
    assert.ok(!url.includes(projectKey) && !url.includes(userToken));
    assert.ok(!init.body.includes(projectKey) && !init.body.includes(userToken));
  }
});

test("invalid project/token/page responses and typed GraphQL errors fail explicitly", async () => {
  const management = new ManagementClient({
    baseUrl: "http://localhost:8081", adminToken,
    fetch: async () => json("projects", { items: [], nextAfter: projectId }),
  });
  await assert.rejects(management.createProject("é".repeat(65)), /128 UTF-8 bytes/);
  await assert.rejects(management.listProjects({ limit: 101 }), /limit/);
  await assert.rejects(management.listProjects(), InvalidResponseError);

  let count = 0;
  const project = new ProjectServerClient({
    baseUrl: "http://localhost:8080", projectKey,
    fetch: async () => {
      count++;
      return json("issueIdentityToken", { token: projectKey, expiresAt: expiry });
    },
  });
  for (const invalid of ["", ".", "..", "alice", "ci_" + "0".repeat(32), "ci_" + "A".repeat(32)]) {
    await assert.rejects(project.mintIdentityToken(invalid), /identityId/);
  }
  await assert.rejects(project.createIdentity("invalid"), /requestId/);
  await assert.rejects(project.createIdentity("00000000-0000-0000-0000-000000000000"), /requestId/);
  assert.equal(count, 0);
  await assert.rejects(project.asIdentity(identityId), InvalidResponseError);
  await assert.rejects(
    new ProjectServerClient({
      baseUrl: "http://localhost:8080", projectKey,
      fetch: async () => json("createIdentity", { id: "alice" }),
    }).createIdentity(requestId),
    InvalidResponseError,
  );

  const errorClient = (fetcher) => new ProjectServerClient({
    baseUrl: "http://localhost:8080", projectKey, fetch: fetcher,
  });
  await assert.rejects(
    errorClient(async () => Response.json({ errors: [
      { message: "not found", extensions: { code: "NOT_FOUND" } },
    ], data: { issueIdentityToken: { token: userToken, expiresAt: expiry } } })).mintIdentityToken(identityId),
    (error) => error instanceof ApiError && error.status === 200 && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    errorClient(async () => Response.json({
      error: { code: "unauthenticated", message: "authentication required" },
    }, { status: 401 })).mintIdentityToken(identityId),
    (error) => error instanceof ApiError && error.status === 401 && error.code === "unauthenticated",
  );
  await assert.rejects(
    errorClient(async () => { throw new Error(`network: ${projectKey}`); }).mintIdentityToken(identityId),
    (error) => error instanceof TransportError && !error.message.includes(projectKey),
  );
  for (const response of [
    Response.json({ error: "unavailable" }, { status: 503 }),
    new Response("not JSON", { status: 503 }),
    Response.json({ data: { issueIdentityToken: { token: userToken, expiresAt: "not a date" } } }),
    new Response(null, { status: 302, headers: { Location: "https://example.com/collect" } }),
  ]) {
    await assert.rejects(errorClient(async () => response).mintIdentityToken(identityId), InvalidResponseError);
  }
});

test("server creates a stable identity from an idempotency UUID", async () => {
  const requests = [];
  const project = new ProjectServerClient({
    baseUrl: "http://localhost:8080", projectKey,
    fetch: async (_url, init) => {
      requests.push(JSON.parse(init.body));
      return json("createIdentity", { id: identityId });
    },
  });
  assert.deepEqual(await project.createIdentity(requestId), { id: identityId });
  assert.deepEqual(await project.createIdentity(requestId), { id: identityId });
  assert.deepEqual(requests.map(({ variables }) => variables), [
    { requestId }, { requestId },
  ]);
  assert.ok(requests.every(({ query }) => query.includes("createIdentity(requestId:$requestId)")));
});
