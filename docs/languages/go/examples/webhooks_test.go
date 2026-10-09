package examples_test

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"slices"
	"strings"
	"testing"

	examples "github.com/ConvoHop/sdks/docs/languages/go/examples"
	convohop "github.com/ConvoHop/sdks/go"
	"github.com/ConvoHop/sdks/go/webhooks"
)

// queued is a delivery that the webhook endpoint enqueued.
type queued struct {
	webhookID string
	event     webhooks.Event
}

type queue struct{ received []queued }

func (q *queue) enqueue(webhookID string, event webhooks.Event) error {
	q.received = append(q.received, queued{webhookID: webhookID, event: event})
	return nil
}

// handled is a call to one of the Handlers.
type handled struct {
	handler string
	value   any
}

type recordingHandlers struct{ calls []handled }

func (h *recordingHandlers) ConversationChanged(_ context.Context, conversation *convohop.Conversation) error {
	h.calls = append(h.calls, handled{"ConversationChanged", [2]string{conversation.ConversationID, conversation.Title}})
	return nil
}

func (h *recordingHandlers) Notify(_ context.Context, notification *webhooks.Notification) error {
	h.calls = append(h.calls, handled{"Notify", notification})
	return nil
}

func (h *recordingHandlers) EndpointDisabled(_ context.Context, endpointID string) error {
	h.calls = append(h.calls, handled{"EndpointDisabled", endpointID})
	return nil
}

func TestReceiveWebhookAcceptsASignedDeliveryDuringASecretRotation(t *testing.T) {
	current, upcoming := newSecret(), newSecret()
	var queue queue
	endpoint := examples.ReceiveWebhook([]string{current, upcoming}, queue.enqueue)
	event := envelope(webhooks.EventConversationCreated, "conversation", newUUID(), "project-1")
	body := wireJSON(t, event)
	for _, secret := range []string{current, upcoming} {
		webhookID, header := signDelivery(t, body, secret)
		if status := deliver(endpoint, header, body); status != 204 {
			t.Fatalf("the endpoint answered %d, want 204", status)
		}
		if got := queue.received[len(queue.received)-1].webhookID; got != webhookID {
			t.Errorf("the endpoint enqueued webhook ID %s, want %s", got, webhookID)
		}
	}
	received := queue.received[0].event
	if !received.Known || received.EventID != event["eventId"] || received.EventType != webhooks.EventConversationCreated {
		t.Errorf("the endpoint enqueued %+v", received)
	}
}

func TestReceiveWebhookAnswers400WithoutEnqueuingADeliveryThatFailsVerification(t *testing.T) {
	secret := newSecret()
	var queue queue
	endpoint := examples.ReceiveWebhook([]string{secret}, queue.enqueue)
	event := envelope(webhooks.EventMessageCreated, "message", newUUID(), "project-1")
	body := wireJSON(t, event)

	_, signed := signDelivery(t, body, secret)
	event["eventType"] = webhooks.EventMessageDeleted
	tampered := wireJSON(t, event)
	_, wrongSecret := signDelivery(t, body, newSecret())
	unsigned := signed.Clone()
	unsigned.Del("Webhook-Signature")
	for name, delivery := range map[string]struct {
		header http.Header
		body   []byte
	}{
		"tampered":     {signed, tampered},
		"wrong secret": {wrongSecret, body},
		"unsigned":     {unsigned, body},
	} {
		if status := deliver(endpoint, delivery.header, delivery.body); status != 400 {
			t.Errorf("the endpoint answered %d to a %s delivery, want 400", status, name)
		}
	}
	if len(queue.received) != 0 {
		t.Errorf("the endpoint enqueued %d deliveries", len(queue.received))
	}
}

func TestReceiveWebhookAnswers500WhenItsOwnSecretIsMisconfigured(t *testing.T) {
	var logged bytes.Buffer
	previous := log.Writer()
	log.SetOutput(&logged)
	t.Cleanup(func() { log.SetOutput(previous) })

	var queue queue
	endpoint := examples.ReceiveWebhook([]string{"not-a-webhook-secret"}, queue.enqueue)
	body := wireJSON(t, envelope(webhooks.EventConversationCreated, "conversation", newUUID(), "project-1"))
	_, header := signDelivery(t, body, newSecret())
	if status := deliver(endpoint, header, body); status != 500 {
		t.Errorf("the endpoint answered %d, want 500", status)
	}
	if !strings.Contains(logged.String(), string(webhooks.CodeInvalidSecret)) {
		t.Errorf("the endpoint logged %q", logged.String())
	}
	if len(queue.received) != 0 {
		t.Errorf("the endpoint enqueued %d deliveries", len(queue.received))
	}
}

func TestHandleEventReadsChangedConversationsAndRoutesNotifications(t *testing.T) {
	client, config := connect(t)
	alice := login(t, client, config, "alice-"+newUUID()).Session.PrincipalID
	conversationID, err := examples.CreateConversation(t.Context(), client, "Webhooks", []string{alice}, newUUID())
	if err != nil {
		t.Fatal(err)
	}
	vectors := pushVectors(t)
	found := slices.IndexFunc(vectors, func(vector pushVector) bool {
		var event struct {
			EventType string `json:"eventType"`
		}
		return json.Unmarshal(vector.Event, &event) == nil && event.EventType == webhooks.EventNotificationMessage
	})
	if found < 0 {
		t.Fatal("no push vector has a notification.message event")
	}
	notification := vectors[found].Event

	secret := newSecret()
	var queue queue
	endpoint := examples.ReceiveWebhook([]string{secret}, queue.enqueue)
	for _, event := range []any{
		envelope(webhooks.EventConversationCreated, "conversation", conversationID, config.ProjectID),
		envelope(webhooks.EventMessageCreated, "message", newUUID(), config.ProjectID),
		notification,
		envelope(webhooks.EventWebhookEndpointDisabled, "webhookEndpoint", "endpoint-orders", config.ProjectID),
		// A type from a newer ConvoHop.
		envelope("thread.archived", "thread", newUUID(), config.ProjectID),
		// Known types whose events don't match them: an endpoint-disabled
		// event about a conversation, and a notification event outside the
		// push payload contract.
		envelope(webhooks.EventWebhookEndpointDisabled, "conversation", conversationID, config.ProjectID),
		envelope(webhooks.EventNotificationMessage, "message", newUUID(), config.ProjectID),
	} {
		body := wireJSON(t, event)
		_, header := signDelivery(t, body, secret)
		if status := deliver(endpoint, header, body); status != 204 {
			t.Fatalf("the endpoint answered %d to %s, want 204", status, body)
		}
	}

	var handlers recordingHandlers
	for _, delivery := range queue.received {
		if err := examples.HandleEvent(t.Context(), client, delivery.event, &handlers); err != nil {
			t.Fatal(err)
		}
	}
	notified := queue.received[2].event.Notification
	want := []handled{
		{"ConversationChanged", [2]string{conversationID, "Webhooks"}},
		{"Notify", notified},
		{"EndpointDisabled", "endpoint-orders"},
	}
	if notified == nil || !slices.Equal(handlers.calls, want) {
		t.Errorf("HandleEvent called %+v, want %+v", handlers.calls, want)
	}
	for _, delivery := range queue.received[4:] {
		if delivery.event.Known {
			t.Errorf("event %s %s about a %s is Known", delivery.event.EventID, delivery.event.EventType, delivery.event.SubjectRef.Kind)
		}
	}
}
