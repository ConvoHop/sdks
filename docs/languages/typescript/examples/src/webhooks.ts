// Webhooks quickstart snippets. test/webhooks.test.ts signs deliveries and runs them.

// #region receive
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
// #endregion receive

// #region handle
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
// #endregion handle
