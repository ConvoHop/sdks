package examples

// #region imports
import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"

	convohop "github.com/ConvoHop/sdks/go"
	"github.com/ConvoHop/sdks/go/webhooks"
)

// #endregion imports

// #region receive

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

// #endregion receive

// #region handle

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

// #endregion handle
