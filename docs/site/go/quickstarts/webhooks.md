# Go webhooks quickstart

Receive ConvoHop events in your Go backend with the `webhooks` package: verify each signed delivery, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

The samples on this page use these imports:

```go snippet=docs/languages/go/examples/webhooks.go#imports
import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"

	convohop "github.com/ConvoHop/sdks/go"
	"github.com/ConvoHop/sdks/go/webhooks"
)
```

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `webhooks.Verify` checks the signature and timestamp against the raw body, and returns the delivery's webhook ID and event. It takes the request's `http.Header`, so it works in any `net/http` handler.

```go snippet=docs/languages/go/examples/webhooks.go#receive
// ReceiveWebhook is your webhook endpoint. secrets are the endpoint's whsec_
// secrets from your secret store. Pass every one you hold, so deliveries keep
// verifying during a secret rotation.
func ReceiveWebhook(secrets []string, enqueue func(webhookID string, event webhooks.Event) error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify rejects bodies over 4096 bytes, so read no more.
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		// The raw bytes, never re-encoded JSON.
		delivery, err := webhooks.Verify(body, r.Header, secrets)
		var failure *webhooks.Error
		if errors.As(err, &failure) && failure.Code != webhooks.CodeInvalidSecret {
			w.WriteHeader(http.StatusBadRequest)
			return
		} else if err != nil {
			// INVALID_SECRET or an invalid option means your configuration is
			// wrong, so fail loudly instead of answering 400.
			log.Print(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		// Respond within 5 seconds and process later. Deduplicate on WebhookID:
		// delivery is at least once.
		if err := enqueue(delivery.WebhookID, delivery.Event); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Verify the exact bytes you received, never re-encoded JSON. A body over 4096 bytes fails.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check returns a `*webhooks.Error`, whose `Code` names the check. Of the codes, only `INVALID_SECRET` means your configuration is wrong, and the [`webhooks.Code` reference](../reference/webhooks.md#code-enum) lists the others. An invalid option is a configuration error too, but returns a plain error.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```go snippet=docs/languages/go/examples/webhooks.go#handle
// Handlers is what your app does with the events it subscribes to.
type Handlers interface {
	ConversationChanged(ctx context.Context, conversation *convohop.Conversation) error
	// Notify pushes to the recipient's devices.
	Notify(ctx context.Context, notification *webhooks.Notification) error
	// EndpointDisabled reports that another of your endpoints kept failing.
	EndpointDisabled(ctx context.Context, endpointID string) error
}

// HandleEvent is your queue worker. Events arrive at least once and in any
// order.
func HandleEvent(ctx context.Context, client *convohop.ProjectClient, event webhooks.Event, handlers Handlers) error {
	switch {
	case !event.Known:
		// A type this SDK doesn't know yet, or an event that doesn't match
		// its type. Acknowledge it and move on.
		return nil
	case event.Notification != nil:
		return handlers.Notify(ctx, event.Notification)
	case event.EventType == webhooks.EventConversationCreated || event.EventType == webhooks.EventConversationUpdated:
		// Events carry only IDs. Read the current state through the API.
		conversation, err := client.GetConversation(ctx, convohop.GetConversationRequestInput{ConversationID: event.SubjectRef.ID})
		if err != nil {
			return err
		}
		return handlers.ConversationChanged(ctx, conversation.Result)
	case event.EventType == webhooks.EventWebhookEndpointDisabled:
		return handlers.EndpointDisabled(ctx, event.SubjectRef.ID)
	default:
		// Other event types your endpoint subscribes to. Acknowledge them and
		// move on.
		return nil
	}
}
```

An event whose type this SDK version doesn't know has `Known` false. So does a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and its `Notification` is nil. Skip those events rather than failing, as `HandleEvent` does.

Notification events, such as `notification.message`, are addressed to one recipient and carry what a push notification needs in `Notification`. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`webhooks.Event` reference](../reference/webhooks.md#event-struct): the fields of every event.
