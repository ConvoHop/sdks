# TypeScript webhooks quickstart

Receive ConvoHop events in your backend with `@convohop/server`: verify each signed delivery, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `webhooks.verify` checks the signature and timestamp against the raw body, and returns the event.

```ts snippet=docs/languages/typescript/examples/src/webhooks.ts#receive
import { webhooks, WebhookVerificationError, type WebhookEvent } from "@convohop/server";

// A fetch-style handler: Request in, Response out. secrets are the endpoint's whsec_ secrets from your
// secret store. Pass every one you hold, so deliveries keep verifying during a secret rotation.
export function webhookHandler(
  secrets: readonly string[],
  enqueue: (webhookId: string, event: WebhookEvent) => Promise<void>,
): (request: Request) => Promise<Response> {
  return async request => {
    const body = new Uint8Array(await request.arrayBuffer()); // The raw bytes, never re-serialized JSON.
    let delivery;
    try {
      delivery = await webhooks.verify({ headers: request.headers, body, secrets });
    } catch (error) {
      // INVALID_SECRET means your configuration is wrong, so fail loudly instead of answering 400.
      if (error instanceof WebhookVerificationError && error.code !== "INVALID_SECRET") {
        return new Response(null, { status: 400 });
      }
      throw error;
    }
    // Respond within 5 seconds and process later. Deduplicate on webhookId: delivery is at least once.
    await enqueue(delivery.webhookId, delivery.event);
    return new Response(null, { status: 204 });
  };
}
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check throws `WebhookVerificationError`, whose `code` names the check. Only `INVALID_SECRET` means your configuration is wrong. The [`webhooks` reference](../reference/server.md#webhooks-constant) lists the others.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```ts snippet=docs/languages/typescript/examples/src/webhooks.ts#handle
import type { Conversation, ProjectServerClient, WebhookNotificationEvent } from "@convohop/server";

// What your app does with the events it subscribes to.
export interface EventHandlers {
  conversationChanged(conversation: Conversation): Promise<void>;
  notify(event: WebhookNotificationEvent): Promise<void>; // Push to the recipient's devices.
  endpointDisabled(endpointId: string): Promise<void>;
}

// Your queue worker. Events arrive at least once and in any order.
export async function handleEvent(
  server: ProjectServerClient,
  event: WebhookEvent,
  handlers: EventHandlers,
): Promise<void> {
  if (!event.known) return; // A type this SDK doesn't know yet. Acknowledge it and move on.
  switch (event.eventType) {
    case "conversation.created":
    case "conversation.updated":
      // Events carry only IDs. Read the current state through the API.
      await handlers.conversationChanged(await server.conversation(event.subjectRef.id).get());
      break;
    case "notification.message":
    case "notification.call":
    case "notification.callCancelled":
      await handlers.notify(event);
      break;
    case "webhook.endpointDisabled":
      await handlers.endpointDisabled(event.subjectRef.id); // Another of your endpoints kept failing.
      break;
    default:
      break; // Other event types your endpoint subscribes to.
  }
}
```

`event.known` is `false` for an event type that this SDK version doesn't know, and for a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md). Skip those events rather than failing, as `handleEvent` does.

Notification events, such as `notification.message`, are addressed to one recipient and carry what a push notification needs. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`WebhookEvent` reference](../reference/server.md#webhookevent-type): every event type and its fields.
