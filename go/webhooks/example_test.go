package webhooks_test

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ConvoHop/sdks/go/webhooks"
)

func ExampleVerify() {
	body := []byte(`{"eventId":"0b3c5d7e-9f1a-4b2c-8d3e-4f5a6b7c8d9e","eventType":"message.created",` +
		`"occurredAt":"2026-01-01T00:00:00Z","projectId":"8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d",` +
		`"subjectRef":{"id":"d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d","kind":"message"}}`)
	header := http.Header{}
	header.Set("Webhook-Id", "msg_example")
	header.Set("Webhook-Timestamp", "1767225600")
	header.Set("Webhook-Signature", "v1,foyHjf7jeHSp2H4BkTZoJQpN+ySaVYS4ZiB2mRzzoX8=")
	// A fixture secret. Load yours from your secret store.
	secrets := []string{"whsec_ZXhhbXBsZS1rZXktZm9yLWdvLWRvY3Mtb25seS0zMmI="}
	// A fixed clock keeps the example's delivery inside the tolerance.
	clock := webhooks.WithClock(func() time.Time { return time.Unix(1767225600, 0) })

	delivery, err := webhooks.Verify(body, header, secrets, clock)
	if err != nil {
		fmt.Println(err)
		return
	}
	event := delivery.Event
	fmt.Println(delivery.WebhookID, event.Known, event.EventType, event.SubjectRef.Kind, event.SubjectRef.ID)

	tampered := []byte(strings.Replace(string(body), "message.created", "message.deleted", 1))
	_, err = webhooks.Verify(tampered, header, secrets, clock)
	fmt.Println(err)
	// Output:
	// msg_example true message.created message d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d
	// convohop webhooks: NO_MATCHING_SIGNATURE: No v1 webhook signature matches the configured secrets
}

// A handler verifies the raw body before trusting it, responds within 5
// seconds and processes afterwards. Delivery is at least once, so
// deduplicate on the webhook ID.
func Example_handler() {
	// Every secret you hold, so that deliveries verify during a rotation.
	secrets := strings.Fields(os.Getenv("CONVOHOP_WEBHOOK_SECRETS"))
	http.HandleFunc("POST /convohop/webhooks", func(w http.ResponseWriter, r *http.Request) {
		// Verify rejects bodies over 4096 bytes, so read no more.
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		delivery, err := webhooks.Verify(body, r.Header, secrets)
		var failure *webhooks.Error
		if errors.As(err, &failure) {
			w.WriteHeader(http.StatusBadRequest)
			return
		} else if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		enqueueOnce(delivery.WebhookID, delivery.Event)
		w.WriteHeader(http.StatusNoContent)
	})
}

// enqueueOnce stands for your queue, which skips webhook IDs it has seen.
func enqueueOnce(webhookID string, event webhooks.Event) {}
