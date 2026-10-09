package examples_test

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ConvoHop/sdks/go/push"
	"github.com/ConvoHop/sdks/go/webhooks"
)

// pushVector is a vector of spec/push-payload/vectors.json: a notification
// event, builder options, and the request each builder must return.
type pushVector struct {
	ID         string          `json:"id"`
	Event      json.RawMessage `json:"event"`
	Options    json.RawMessage `json:"options"`
	NowSeconds int64           `json:"nowSeconds"`
	Expected   struct {
		APNSAlert *expectedRequest `json:"apnsAlert"`
		APNSVoIP  *expectedRequest `json:"apnsVoip"`
		FCM       *expectedRequest `json:"fcm"`
		WebPush   *expectedRequest `json:"webPush"`
	} `json:"expected"`
}

// expectedRequest is a builder's request, and the canonical size of its
// measured part in bytes.
type expectedRequest struct {
	Request json.RawMessage `json:"request"`
	Bytes   int             `json:"bytes"`
}

func pushVectors(t *testing.T) []pushVector {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(repoRoot, "spec", "push-payload", "vectors.json"))
	if err != nil {
		t.Fatal(err)
	}
	var document struct {
		Vectors []pushVector `json:"vectors"`
	}
	if err := json.Unmarshal(data, &document); err != nil {
		t.Fatal(err)
	}
	if len(document.Vectors) == 0 {
		t.Fatal("spec/push-payload/vectors.json has no vectors")
	}
	return document.Vectors
}

// builderOptions returns a vector's bundle ID, and its other options as the
// builders' options.
func builderOptions(t *testing.T, vector pushVector) (string, []push.Option) {
	t.Helper()
	var given struct {
		BundleID string  `json:"bundleId"`
		Title    *string `json:"title"`
		Body     *string `json:"body"`
		Preview  *bool   `json:"preview"`
	}
	decoder := json.NewDecoder(bytes.NewReader(vector.Options))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&given); err != nil {
		t.Fatalf("%s: %v: forward the new builder option in Notify", vector.ID, err)
	}
	now := time.Unix(vector.NowSeconds, 0)
	options := []push.Option{push.WithClock(func() time.Time { return now })}
	if given.Title != nil {
		options = append(options, push.WithTitle(*given.Title))
	}
	if given.Body != nil {
		options = append(options, push.WithBody(*given.Body))
	}
	if given.Preview != nil && !*given.Preview {
		options = append(options, push.WithoutPreview())
	}
	return given.BundleID, options
}

// received is a vector's event as your webhook endpoint receives it.
func received(t *testing.T, vector pushVector) *webhooks.Notification {
	t.Helper()
	secret, body := newSecret(), wireJSON(t, vector.Event)
	_, header := signDelivery(t, body, secret)
	delivery, err := webhooks.Verify(body, header, []string{secret})
	if err != nil {
		t.Fatal(err)
	}
	if delivery.Event.Notification == nil {
		t.Fatalf("%s: the event isn't a notification event", vector.ID)
	}
	return delivery.Event.Notification
}

// jsonValue decodes JSON, to compare it after parsing.
func jsonValue(t *testing.T, data []byte) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	return value
}
