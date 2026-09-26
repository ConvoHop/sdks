import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ApiError, ConvoHopClient, GraphQLSubscription, InvalidResponseError,
} from "../dist/index.js";

const token = `st_${"a".repeat(64)}`;
const threadId = "33d9e132-d26d-4df9-92b0-5877cb1f3265";
const mediaId = "c65bcf38-a73d-436d-91cf-81d671b49a44";
const messageId = "f5b0126a-a68b-4895-bb43-d558b9ca1126";
const recipientId = "d24021e7-9869-476f-8ef1-d8be8af13767";
const aliceId = "ci_11111111111111111111111111111111";
const bobId = "ci_22222222222222222222222222222222";
const timestamp = "2026-09-25T00:00:00Z";
const message = (sequence, props = {}) => ({
  id: messageId,
  threadId,
  sequence,
  sender: aliceId,
  clientMessageId: recipientId,
  body: "hello",
  props,
  createdAt: timestamp,
});
const thread = {
  id: threadId,
  title: "Support",
  owner: aliceId,
  state: "active",
  historyOnJoin: "since_join",
  historyAfterLeave: "revoke",
  historyAfterRemove: "revoke",
  lastSequence: "0",
};
const event = (sequence, kind = "message.created") => ({
  eventId: messageId,
  threadId,
  sequence,
  kind,
  actor: aliceId,
  message: kind === "message.created" ? message(sequence) : null,
  identityId: null,
  callId: null,
  createdAt: timestamp,
});
const call = {
  id: mediaId,
  projectId: threadId,
  threadId,
  mode: "audio",
  owner: aliceId,
  title: "Support call",
  role: "publisher",
};
const callEvent = (sequence, kind, details = call) => ({
  eventId: recipientId,
  sequence,
  kind,
  callId: mediaId,
  identityId: bobId,
  call: details,
  createdAt: timestamp,
});
const media = {
  id: mediaId,
  projectId: threadId,
  threadId,
  mode: "audio",
  kind: "call",
  owner: aliceId,
  title: "Audio support",
  audience: "members",
  state: "requested",
};
const result = (field, value) => Response.json({ data: { [field]: value } });
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

class FakeSocket {
  onopen = null;
  onmessage = null;
  onerror = null;
  onclose = null;
  readyState = 0;
  sent = [];

  open() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }
  emit(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
  send(text) {
    assert.equal(this.readyState, 1);
    this.sent.push(JSON.parse(text));
  }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

test("browser SDK uses only GraphQL with st_ credentials, JSON props, and exact decimal cursors", async () => {
  const requests = [];
  const client = new ConvoHopClient({
    baseUrl: "http://localhost:8080/",
    sessionToken: token,
    fetch: async (url, options) => {
      requests.push({ url, options });
      const { query } = JSON.parse(options.body);
      if (query.includes("sendMessage(")) return result("sendMessage", message("9007199254740993", { case: { id: 42 } }));
      if (query.includes("threadMessages(")) {
        return result("threadMessages", {
          items: [message("9007199254740993")],
          nextAfter: "9007199254740993",
          cursor: "9007199254740995",
          hasMore: false,
        });
      }
      if (query.includes("threadMembers(")) return result("threadMembers", [{
        membershipId: recipientId, identityId: bobId, role: "member",
        state: "active", joinedSequence: "1", exitedSequence: null,
      }]);
      return result("thread", thread);
    },
  });
  const props = { case: { id: 42 } };
  const sent = await client.sendMessage(threadId, "hello", { clientMessageId: recipientId, props });
  assert.equal(sent.sequence, "9007199254740993");
  assert.deepEqual(sent.props, props);
  const page = await client.threadMessages(threadId, "9007199254740992");
  assert.equal(page.cursor, "9007199254740995");
  assert.equal((await client.getThread(threadId)).state, "active");
  assert.deepEqual((await client.threadMembers(threadId))[0].identityId, bobId);
  for (const { url, options } of requests) {
    assert.equal(url, "http://localhost:8080/graphql");
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "manual");
    assert.ok(!url.includes(token));
  }
  assert.deepEqual(JSON.parse(requests[0].options.body).variables, {
    threadId,
    clientMessageId: recipientId,
    body: "hello",
    props,
  });
  assert.equal(JSON.parse(requests[1].options.body).variables.after, "9007199254740992");
  assert.throws(
    () => new ConvoHopClient({ baseUrl: "http://localhost:8080", sessionToken: `pk_${"a".repeat(64)}` }),
    /st_/,
  );
  assert.throws(
    () => new ConvoHopClient({ baseUrl: "http://example.com", sessionToken: token }),
    /HTTPS/,
  );
  assert.throws(() => client.getThread(".."), /UUID/);
  assert.throws(() => client.createThread("Team", ["alice"]), /identityId/);
  assert.throws(() => client.sendMessage(threadId, "hello", { props: [] }), /JSON object/);
  await assert.rejects(client.threadMessages(threadId, "9007199254740993.5"), /decimal i64/);
});

test("HTTP and GraphQL errors never become partial successes", async () => {
  const client = (fetcher) => new ConvoHopClient({
    baseUrl: "http://localhost:8080", sessionToken: token, fetch: fetcher,
  });
  await assert.rejects(
    client(async () => Response.json({
      data: { thread },
      errors: [{ message: "resource not found", extensions: { code: "NOT_FOUND" } }],
    })).getThread(threadId),
    (error) => error instanceof ApiError && error.status === 200 && error.code === "NOT_FOUND",
  );
  await assert.rejects(
    client(async () => Response.json({
      error: { code: "unauthenticated", message: "session expired" },
    }, { status: 401 })).getThread(threadId),
    (error) => error instanceof ApiError && error.status === 401 && error.code === "unauthenticated",
  );
  await assert.rejects(
    client(async () => result("threadMessages", {
      items: [], nextAfter: "0", cursor: "1", hasMore: true,
    })).threadMessages(threadId),
    InvalidResponseError,
  );
  await assert.rejects(
    client(async () => new Response(null, { status: 307, headers: { Location: "https://evil.test" } }))
      .getThread(threadId),
    (error) => error instanceof InvalidResponseError && error.status === 307,
  );
});

test("thread subscriptions authenticate in the first frame, support sparse replay and acknowledge callbacks", async () => {
  const sockets = [];
  const received = [];
  const errors = [];
  const client = new ConvoHopClient({
    baseUrl: "http://localhost:8080",
    sessionToken: token,
    socketFactory: (url, protocol) => {
      const socket = new FakeSocket();
      sockets.push({ url, protocol, socket });
      return socket;
    },
  });
  const subscription = client.subscribeThread(threadId, {
    after: "0",
    onEvent: async (item) => { received.push(item.sequence); },
    onError: (error) => { errors.push(error); },
  });
  assert.ok(subscription instanceof GraphQLSubscription);
  assert.equal(sockets[0].url, "ws://localhost:8080/graphql");
  assert.equal(sockets[0].protocol, "graphql-transport-ws");
  assert.ok(!sockets[0].url.includes(token));
  sockets[0].socket.open();
  assert.deepEqual(sockets[0].socket.sent, [{ type: "connection_init", payload: { token } }]);
  sockets[0].socket.emit({ type: "connection_ack" });
  await flush();
  assert.deepEqual(sockets[0].socket.sent[1].payload.variables, { id: threadId, after: "0" });
  sockets[0].socket.emit({ type: "next", id: "1", payload: { data: { threadEvents: event("1") } } });
  sockets[0].socket.emit({ type: "next", id: "1", payload: { data: { threadEvents: event("3") } } });
  await flush();
  assert.deepEqual(received, ["1", "3"]);
  assert.equal(subscription.after, "3");

  sockets[0].socket.close(1006);
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(sockets.length, 2);
  sockets[1].socket.open();
  sockets[1].socket.emit({ type: "connection_ack" });
  await flush();
  assert.equal(sockets[1].socket.sent[1].payload.variables.after, "3");
  sockets[1].socket.emit({ type: "next", id: "1", payload: { data: { threadEvents: event("3") } } });
  sockets[1].socket.emit({ type: "next", id: "1", payload: { data: { threadEvents: event("9") } } });
  await flush();
  assert.deepEqual(received, ["1", "3", "9"]);
  assert.equal(subscription.after, "9");
  assert.equal(errors.length, 1);
  subscription.close();
  assert.equal(sockets[1].socket.sent.at(-1).type, "complete");
});

test("failed event callback does not advance the cursor and subscription errors stop the socket", async () => {
  const sockets = [];
  const errors = [];
  const client = new ConvoHopClient({
    baseUrl: "http://localhost:8080", sessionToken: token,
    socketFactory: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
  });
  const stream = client.subscribeCalls({
    onEvent: async () => { throw new Error("consumer failed"); },
    onError: (error) => { errors.push(error); },
  });
  sockets[0].open();
  sockets[0].emit({ type: "connection_ack" });
  sockets[0].emit({
    type: "next", id: "1",
    payload: { data: { callEvents: callEvent("4", "call.revoked", null) } },
  });
  await flush();
  assert.equal(stream.after, "0");
  assert.equal(errors[0].message, "consumer failed");
  assert.equal(sockets[0].readyState, 3);

  const revoked = client.subscribeCalls({
    onEvent: () => {},
    onError: (error) => { errors.push(error); },
  });
  sockets[1].open();
  sockets[1].emit({ type: "connection_ack" });
  sockets[1].emit({
    type: "next", id: "1", payload: {
      errors: [{ message: "session revoked", extensions: { code: "UNAUTHENTICATED" } }],
    },
  });
  await flush();
  assert.equal(errors[1].code, "UNAUTHENTICATED");
  assert.equal(sockets[1].readyState, 3);
  revoked.close();
});

test("thread-scoped media, nullable revoked call details and HLS assets use the right transport", async () => {
  const operations = [];
  const client = new ConvoHopClient({
    baseUrl: "http://localhost:8080", sessionToken: token,
    fetch: async (_url, init) => {
      const { query, variables } = JSON.parse(init.body);
      operations.push({ query, variables });
      if (query.includes("createCall(")) return result("createCall", media);
      if (query.includes("callEvents(")) {
        return result("callEvents", { items: [callEvent("41", "call.revoked", null)],
          nextAfter: "41", hasMore: false });
      }
      if (query.includes("joinMedia(")) return result("joinMedia", {
        participantId: recipientId, serverUrl: "ws://localhost:7880",
        token: "livekit-grant", expiresAt: timestamp,
      });
      return result("removeMediaParticipant", true);
    },
  });
  assert.equal((await client.createCall(threadId, "Audio support", "audio", [bobId])).threadId, threadId);
  assert.equal((await client.joinMedia(mediaId)).token, "livekit-grant");
  await client.removeMediaParticipant(mediaId, recipientId);
  const page = await client.callEvents("40");
  assert.equal(page.items[0].call, null);
  assert.equal(page.items[0].sequence, "41");
  assert.deepEqual(operations[0].variables, {
    threadId, title: "Audio support", mode: "audio", publishers: [bobId],
  });
  const playback = client.playbackRequest(mediaId);
  assert.equal(playback.url, `http://localhost:8080/media/${mediaId}/hls/master.m3u8`);
  assert.equal(playback.headers.Authorization, `Bearer ${token}`);
});

test("updating an st_ token rotates WebSockets after acknowledgement without losing the chat cursor", async () => {
  const sockets = [];
  const requests = [];
  const fresh = `st_${"b".repeat(64)}`;
  let acknowledge;
  const client = new ConvoHopClient({
    baseUrl: "http://localhost:8080", sessionToken: token,
    fetch: async (_url, init) => {
      requests.push(init.headers.Authorization);
      return result("thread", thread);
    },
    socketFactory: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
  });
  const stream = client.subscribeThread(threadId, {
    onEvent: async () => { await new Promise((resolve) => { acknowledge = resolve; }); },
    onError: (error) => { throw error; },
  });
  sockets[0].open();
  sockets[0].emit({ type: "connection_ack" });
  await flush();
  sockets[0].emit({ type: "next", id: "1", payload: { data: { threadEvents: event("4") } } });
  await flush();
  assert.equal(stream.after, "0");
  assert.throws(() => client.updateSessionToken(`pk_${"c".repeat(64)}`), /st_/);
  assert.throws(() => client.updateSessionToken(token), /must differ/);
  client.updateSessionToken(`st_${"c".repeat(64)}`);
  client.updateSessionToken(fresh);
  assert.equal(sockets[0].readyState, 3);
  assert.equal(sockets.length, 1);
  acknowledge();
  await flush();
  assert.equal(stream.after, "4");
  assert.equal(sockets.length, 2);
  sockets[1].open();
  assert.deepEqual(sockets[1].sent[0], { type: "connection_init", payload: { token: fresh } });
  sockets[1].emit({ type: "connection_ack" });
  await flush();
  assert.equal(sockets[1].sent[1].payload.variables.after, "4");
  await client.getThread(threadId);
  assert.deepEqual(requests, [`Bearer ${fresh}`]);
  assert.equal(client.playbackRequest(mediaId).headers.Authorization, `Bearer ${fresh}`);
  stream.close();
});
