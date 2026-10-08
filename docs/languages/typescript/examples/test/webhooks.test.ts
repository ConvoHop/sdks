import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { WebhookVerificationError, type WebhookEvent } from "@convohop/server";
import { bootstrapUser, connect, createConversation, type ServerConfig } from "../src/server.ts";
import { handleEvent, webhookHandler, type EventHandlers } from "../src/webhooks.ts";
import { newSecret, signDelivery } from "./deliveries.ts";
import { startMock, type MockTarget } from "./mock.ts";
import { pushVectors } from "./vectors.ts";

let target: MockTarget;
let config: ServerConfig;

before(async () => {
  target = await startMock();
  const { communicationUrl, projectId, incarnation, credentials } = target.descriptor;
  config = { baseUrl: communicationUrl, projectId, incarnation, backendKey: credentials.backend };
});
after(() => target.close());

function delivery(event: object, secret: string, { body = JSON.stringify(event) } = {}) {
  const { id, headers } = signDelivery(JSON.stringify(event), secret);
  return { id, request: () => new Request("https://app.example/webhooks/convohop", { method: "POST", headers, body }) };
}

function envelope(eventType: string, subjectRef: { kind: string; id: string }) {
  return { eventId: randomUUID(), eventType, occurredAt: new Date().toISOString(), projectId: config.projectId, subjectRef };
}

function queue() {
  const received: Array<{ webhookId: string; event: WebhookEvent }> = [];
  return { received, enqueue: async (webhookId: string, event: WebhookEvent) => void received.push({ webhookId, event }) };
}

test("webhookHandler accepts a signed delivery, including during a secret rotation", async () => {
  const [current, next] = [newSecret(), newSecret()];
  const { received, enqueue } = queue();
  const handler = webhookHandler([current, next], enqueue);
  const event = envelope("conversation.created", { kind: "conversation", id: randomUUID() });
  for (const secret of [current, next]) {
    const signed = delivery(event, secret);
    const response = await handler(signed.request());
    assert.equal(response.status, 204);
    assert.equal(received.at(-1)?.webhookId, signed.id);
  }
  assert.deepEqual(received[0]?.event, { ...event, known: true });
});

test("webhookHandler answers 400 without enqueuing a delivery that fails verification", async () => {
  const secret = newSecret();
  const { received, enqueue } = queue();
  const handler = webhookHandler([secret], enqueue);
  const event = envelope("message.created", { kind: "message", id: randomUUID() });
  const tampered = delivery(event, secret, { body: JSON.stringify({ ...event, eventType: "message.deleted" }) });
  assert.equal((await handler(tampered.request())).status, 400);
  const wrongSecret = delivery(event, newSecret());
  assert.equal((await handler(wrongSecret.request())).status, 400);
  const unsigned = new Request("https://app.example/webhooks/convohop", { method: "POST", body: JSON.stringify(event) });
  assert.equal((await handler(unsigned)).status, 400);
  assert.deepEqual(received, []);
});

test("webhookHandler throws when its own secret is misconfigured", async () => {
  const handler = webhookHandler(["not-a-webhook-secret"], queue().enqueue);
  const signed = delivery(envelope("conversation.created", { kind: "conversation", id: randomUUID() }), newSecret());
  await assert.rejects(handler(signed.request()),
    error => error instanceof WebhookVerificationError && error.code === "INVALID_SECRET");
});

test("handleEvent reads changed conversations and routes notifications", async () => {
  const server = await connect(config);
  const login = await bootstrapUser(server, config, `alice-${randomUUID()}`, randomUUID());
  const conversationId = await createConversation(server, "Webhooks", [login.session.principalId], randomUUID());
  const notification = (await pushVectors()).find(vector => vector.event.eventType === "notification.message")?.event;
  assert.ok(notification);

  const secret = newSecret();
  const { received, enqueue } = queue();
  const handler = webhookHandler([secret], enqueue);
  for (const event of [
    envelope("conversation.created", { kind: "conversation", id: conversationId }),
    envelope("message.created", { kind: "message", id: randomUUID() }),
    notification,
    envelope("webhook.endpointDisabled", { kind: "webhookEndpoint", id: "endpoint-orders" }),
    envelope("thread.archived", { kind: "thread", id: randomUUID() }), // A type from a newer ConvoHop.
  ]) assert.equal((await handler(delivery(event, secret).request())).status, 204);

  const calls: unknown[] = [];
  const handlers: EventHandlers = {
    conversationChanged: async conversation => void calls.push(["conversationChanged", conversation.conversationId, conversation.title]),
    notify: async event => void calls.push(["notify", event]),
    endpointDisabled: async endpointId => void calls.push(["endpointDisabled", endpointId]),
  };
  for (const { event } of received) await handleEvent(server, event, handlers);
  assert.deepEqual(calls, [
    ["conversationChanged", conversationId, "Webhooks"],
    ["notify", received[2]?.event],
    ["endpointDisabled", "endpoint-orders"],
  ]);
  assert.equal(received[2]?.event.known, true);
  assert.equal(received[4]?.event.known, false);
});
