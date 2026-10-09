package examples_test

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	convohop "github.com/ConvoHop/sdks/go"
)

// newUUID returns a random version 4 UUID.
var newUUID = convohop.NewRequestID

// newSecret returns a new webhook endpoint secret.
func newSecret() string {
	key := make([]byte, 32)
	_, _ = rand.Read(key) // It never fails.
	return "whsec_" + base64.StdEncoding.EncodeToString(key)
}

// wireJSON encodes a value as ConvoHop sends it: compact JSON, with text left
// as UTF-8 rather than escaped.
func wireJSON(t *testing.T, value any) []byte {
	t.Helper()
	var body bytes.Buffer
	encoder := json.NewEncoder(&body)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		t.Fatal(err)
	}
	return bytes.TrimSuffix(body.Bytes(), []byte("\n"))
}

// signDelivery signs a body the way ConvoHop does: Standard Webhooks, with
// HMAC-SHA256 over "id.timestamp.body". It returns the webhook ID and the
// request's headers.
func signDelivery(t *testing.T, body []byte, secret string) (string, http.Header) {
	t.Helper()
	key, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(secret, "whsec_"))
	if err != nil {
		t.Fatal(err)
	}
	webhookID := "msg_" + newUUID()
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(webhookID + "." + timestamp + "."))
	mac.Write(body)
	header := http.Header{}
	header.Set("Content-Type", "application/json")
	header.Set("Webhook-Id", webhookID)
	header.Set("Webhook-Timestamp", timestamp)
	header.Set("Webhook-Signature", "v1,"+base64.StdEncoding.EncodeToString(mac.Sum(nil)))
	return webhookID, header
}

// deliver posts a delivery to a webhook endpoint, and returns the response's
// status.
func deliver(endpoint http.Handler, header http.Header, body []byte) int {
	request := httptest.NewRequest(http.MethodPost, "/webhooks/convohop", bytes.NewReader(body))
	request.Header = header.Clone()
	response := httptest.NewRecorder()
	endpoint.ServeHTTP(response, request)
	return response.Code
}

// envelope is an event of a type without fields of its own.
func envelope(eventType, kind, subjectID, projectID string) map[string]any {
	return map[string]any{
		"eventId":    newUUID(),
		"eventType":  eventType,
		"occurredAt": time.Now().UTC().Format("2006-01-02T15:04:05.000Z07:00"),
		"projectId":  projectID,
		"subjectRef": map[string]string{"kind": kind, "id": subjectID},
	}
}
