package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	convohop "github.com/ConvoHop/sdks/go"
	"github.com/ConvoHop/sdks/go/webhooks"
)

const hello = `{"id":1,"method":"hello"}` + "\n"

// exchange runs the driver over input and returns its response lines and exit
// status.
func exchange(t *testing.T, input string) ([]string, int) {
	t.Helper()
	var output bytes.Buffer
	status := run(strings.NewReader(input), &output)
	text := strings.TrimSuffix(output.String(), "\n")
	if text == "" {
		return nil, status
	}
	return strings.Split(text, "\n"), status
}

func requestError(id, code, message string) string {
	return `{"id":` + id + `,"error":{"code":"` + code + `","message":"` + message + `"}}`
}

func TestRequestsBeforeHello(t *testing.T) {
	lines, status := exchange(t, `{"id":7,"method":"reset"}`+"\n"+hello)
	if status != 0 || len(lines) != 2 {
		t.Fatalf("exchange() = %q, %d", lines, status)
	}
	if want := requestError("7", "INVALID_REQUEST", "hello must be the first request"); lines[0] != want {
		t.Errorf("before hello: %s; want %s", lines[0], want)
	}
	if !strings.HasPrefix(lines[1], `{"id":1,"result":{"driver":`) {
		t.Errorf("hello: %s", lines[1])
	}
}

func TestHelloDeclaresTheServerRoles(t *testing.T) {
	lines, _ := exchange(t, hello)
	var response struct {
		Result struct {
			Driver struct {
				Name     string            `json:"name"`
				Language string            `json:"language"`
				Packages map[string]string `json:"packages"`
			} `json:"driver"`
			Roles map[string]struct {
				Operations []string `json:"operations"`
			} `json:"roles"`
			Features []string `json:"features"`
		} `json:"result"`
	}
	if err := json.Unmarshal([]byte(lines[0]), &response); err != nil {
		t.Fatal(err)
	}
	result := response.Result
	if result.Driver.Name != driverName || result.Driver.Language != "go" || result.Driver.Packages[modulePath] == "" {
		t.Errorf("driver = %+v", result.Driver)
	}
	if len(result.Roles) != 2 || len(result.Roles["backend"].Operations) != len(backendOperations) ||
		len(result.Roles["management"].Operations) != len(managementOperations) {
		t.Errorf("roles = %+v", result.Roles)
	}
	if strings.Join(result.Features, ",") != "recovery.eviction,recovery.spentBudget,recovery.storage,retryAfter,webhooks.verify" {
		t.Errorf("features = %q", result.Features)
	}
}

func TestRequestErrors(t *testing.T) {
	const backend = `"role":"backend","baseUrl":"http://127.0.0.1:1","credential":"k"`
	tests := []struct{ name, line, want string }{
		{"invalid JSON", `{"id":`, requestError("null", "INVALID_REQUEST", "Request is not valid JSON")},
		{"two values", `{"id":2,"method":"reset"} {}`, requestError("null", "INVALID_REQUEST", "Request is not valid JSON")},
		{"array", `[2]`, requestError("null", "INVALID_REQUEST", "id must be a positive integer")},
		{"zero id", `{"id":0,"method":"reset"}`, requestError("null", "INVALID_REQUEST", "id must be a positive integer")},
		{"fractional id", `{"id":2.5,"method":"reset"}`, requestError("null", "INVALID_REQUEST", "id must be a positive integer")},
		{"text id", `{"id":"2","method":"reset"}`, requestError("null", "INVALID_REQUEST", "id must be a positive integer")},
		{"unsafe id", `{"id":9007199254740992,"method":"reset"}`, requestError("null", "INVALID_REQUEST", "id must be a positive integer")},
		{"integral id", `{"id":2.0,"method":"reset","params":null}`, `{"id":2,"result":{}}`},
		{"method", `{"id":2,"method":null}`, requestError("2", "INVALID_REQUEST", "method must be a string")},
		{"params", `{"id":2,"method":"reset","params":[]}`, requestError("2", "INVALID_REQUEST", "params must be an object")},
		{"unknown method", `{"id":2,"method":"realtime.stream"}`, requestError("2", "UNKNOWN_METHOD", "Unknown method realtime.stream")},
		{"second hello", `{"id":2,"method":"hello"}`, requestError("2", "INVALID_REQUEST", "hello was already negotiated")},
		{"realtime", `{"id":2,"method":"realtime.subscribe","params":{}}`,
			requestError("2", "UNSUPPORTED", "This driver does not declare the realtime feature")},
		{"user role", `{"id":2,"method":"client.create","params":{"client":"u","role":"user"}}`,
			requestError("2", "UNSUPPORTED", "This driver does not declare the user role")},
		{"unknown role", `{"id":2,"method":"client.create","params":{"client":"u","role":"admin"}}`,
			requestError("2", "INVALID_PARAMS", "role must be one of user, backend, management")},
		{"handle", `{"id":2,"method":"client.create","params":{"client":"a b"}}`,
			requestError("2", "INVALID_PARAMS", "client must match [A-Za-z0-9._:-]{1,64}")},
		{"storage handle", `{"id":2,"method":"client.create","params":{"client":"b",` + backend + `,"storage":""}}`,
			requestError("2", "INVALID_PARAMS", "storage must match [A-Za-z0-9._:-]{1,64}")},
		{"null option", `{"id":2,"method":"client.create","params":{"client":"b",` + backend + `,"projectId":null}}`,
			requestError("2", "INVALID_PARAMS", "projectId must be a string")},
		{"required option", `{"id":2,"method":"client.create","params":{"client":"b",` + backend + `}}`,
			requestError("2", "INVALID_PARAMS", "projectId is required for this role")},
		{"constructor", `{"id":2,"method":"client.create","params":{"client":"b",` + backend + `,"projectId":"p","incarnation":"i"}}`,
			requestError("2", "INVALID_PARAMS", "convohop: the project ID and incarnation must be canonical lowercase UUIDs")},
		{"unknown client", `{"id":2,"method":"invoke","params":{"client":"b","operation":"conversations.get"}}`,
			requestError("2", "UNKNOWN_HANDLE", "Unknown client handle b")},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			lines, status := exchange(t, hello+test.line+"\n")
			if status != 0 || len(lines) != 2 || lines[1] != test.want {
				t.Fatalf("exchange() = %q, %d; want second line %s", lines, status, test.want)
			}
		})
	}
}

func TestFraming(t *testing.T) {
	t.Run("blank lines and CRLF", func(t *testing.T) {
		lines, status := exchange(t, "\n \t\r\n"+strings.TrimSuffix(hello, "\n")+"\r\n"+`{"id":2,"method":"reset"}`+"\r\n")
		if status != 0 || len(lines) != 2 || lines[1] != `{"id":2,"result":{}}` {
			t.Fatalf("exchange() = %q, %d", lines, status)
		}
	})
	t.Run("unterminated last line", func(t *testing.T) {
		lines, status := exchange(t, hello+`{"id":2,"method":"reset"}`)
		if status != 0 || len(lines) != 2 || lines[1] != `{"id":2,"result":{}}` {
			t.Fatalf("exchange() = %q, %d", lines, status)
		}
	})
	t.Run("shutdown ends the session", func(t *testing.T) {
		lines, status := exchange(t, hello+`{"id":2,"method":"shutdown"}`+"\n"+`{"id":3,"method":"reset"}`+"\n")
		if status != 0 || len(lines) != 2 || lines[1] != `{"id":2,"result":{}}` {
			t.Fatalf("exchange() = %q, %d", lines, status)
		}
	})
	t.Run("results keep HTML characters", func(t *testing.T) {
		lines, _ := exchange(t, hello+`{"id":2,"method":"<&>"}`+"\n")
		if want := requestError("2", "UNKNOWN_METHOD", "Unknown method <&>"); lines[1] != want {
			t.Fatalf("response = %s; want %s", lines[1], want)
		}
	})
}

func TestInvoke(t *testing.T) {
	const id = "9a3c0d1e-4a6b-4c8d-9e0f-112233445566"
	create := `{"id":2,"method":"client.create","params":{"client":"b","role":"backend","baseUrl":"http://127.0.0.1:1",` +
		`"credential":"k","projectId":"` + id + `","incarnation":"` + id + `","storage":"s"}}`
	requests := []string{
		create,
		create,
		`{"id":3,"method":"invoke","params":{"client":"b","operation":"events.list"}}`,
		`{"id":4,"method":"invoke","params":{"client":"b","operation":"members.list","args":{"conversationId":"c","limit":0}}}`,
		`{"id":5,"method":"invoke","params":{"client":"b","operation":"members.list","args":null}}`,
		`{"id":6,"method":"invoke","params":{"client":"b","operation":"messages.delete","args":{"message":{"messageId":"m"}}}}`,
		`{"id":7,"method":"invoke","params":{"client":"b","operation":"conversations.create","args":{"input":{"title":"t","props":[]}}}}`,
		`{"id":8,"method":"invoke","params":{"client":"b","operation":"messages.send","args":{"conversationId":"` + id +
			`","text":"hi","requestId":"not-a-uuid"}}}`,
		`{"id":9,"method":"client.close","params":{"client":"b"}}`,
		`{"id":10,"method":"invoke","params":{"client":"b","operation":"messages.send"}}`,
	}
	lines, _ := exchange(t, hello+strings.Join(requests, "\n")+"\n")
	want := []string{
		`{"id":2,"result":{}}`,
		requestError("2", "INVALID_PARAMS", "Client handle b already exists"),
		requestError("3", "UNSUPPORTED", "The backend role does not implement events.list"),
		requestError("4", "INVALID_PARAMS", "limit must be an integer in 1..100"),
		requestError("5", "INVALID_PARAMS", "args must be an object"),
		requestError("6", "INVALID_PARAMS", "message is not a valid protocol value"),
		requestError("7", "INVALID_PARAMS", "input.props must be an object"),
		"", // An SDK failure is a result; checked below.
		`{"id":9,"result":{}}`,
		requestError("10", "UNKNOWN_HANDLE", "Unknown client handle b"),
	}
	if len(lines) != len(want)+1 {
		t.Fatalf("exchange() = %q", lines)
	}
	for index, expected := range want {
		if expected != "" && lines[index+1] != expected {
			t.Errorf("response %d = %s; want %s", index+2, lines[index+1], expected)
		}
	}
	var response struct {
		ID     int64 `json:"id"`
		Result struct {
			OK    bool       `json:"ok"`
			Error sdkFailure `json:"error"`
		} `json:"result"`
	}
	if err := json.Unmarshal([]byte(lines[8]), &response); err != nil {
		t.Fatal(err)
	}
	failure := response.Result.Error
	if response.ID != 8 || response.Result.OK || failure.Code != "INVALID_REQUEST" || failure.Outcome == nil ||
		*failure.Outcome != "rejected" || failure.RequestID == nil || *failure.RequestID != "not-a-uuid" {
		t.Errorf("SDK failure = %s", lines[8])
	}
}

func TestSDKErrorProjection(t *testing.T) {
	encoded := func(err error) string {
		t.Helper()
		value, encodeErr := json.Marshal(sdkError(err))
		if encodeErr != nil {
			t.Fatal(encodeErr)
		}
		return string(value)
	}
	if got, want := encoded(errors.New("boom")),
		`{"code":"SDK_ERROR","status":null,"outcome":null,"requestId":null,"retryAfterMs":null,"message":"boom"}`; got != want {
		t.Errorf("plain error = %s; want %s", got, want)
	}
	problem := &convohop.Problem{Code: "TRANSPORT_UNKNOWN", Outcome: convohop.OutcomeUnknown, RequestID: "r"}
	if got, want := encoded(problem), `{"code":"TRANSPORT_UNKNOWN","status":null,"outcome":"unknown","requestId":"r",`+
		`"retryAfterMs":null,"message":`+mustQuote(t, problem.Error())+`}`; got != want {
		t.Errorf("problem = %s; want %s", got, want)
	}
	problem = &convohop.Problem{Code: "NOT_FOUND", Status: 404, Outcome: convohop.OutcomeRejected, Message: "gone"}
	if got, want := encoded(problem), `{"code":"NOT_FOUND","status":404,"outcome":"rejected","requestId":null,`+
		`"retryAfterMs":null,"message":"gone"}`; got != want {
		t.Errorf("problem = %s; want %s", got, want)
	}
}

func mustQuote(t *testing.T, text string) string {
	t.Helper()
	quoted, err := json.Marshal(text)
	if err != nil {
		t.Fatal(err)
	}
	return string(quoted)
}

func TestWebhookCodes(t *testing.T) {
	for code, want := range map[webhooks.Code]string{
		webhooks.CodeMissingHeader:       "WEBHOOK_HEADERS_MISSING",
		webhooks.CodeInvalidHeader:       "WEBHOOK_HEADERS_MISSING",
		webhooks.CodeInvalidTimestamp:    "WEBHOOK_TIMESTAMP_INVALID",
		webhooks.CodeTimestampExpired:    "WEBHOOK_TIMESTAMP_EXPIRED",
		webhooks.CodeTimestampFuture:     "WEBHOOK_TIMESTAMP_FUTURE",
		webhooks.CodeBodyTooLarge:        "WEBHOOK_SIGNATURE_INVALID",
		webhooks.CodeTooManySignatures:   "WEBHOOK_SIGNATURE_INVALID",
		webhooks.CodeNoMatchingSignature: "WEBHOOK_SIGNATURE_INVALID",
	} {
		if got, err := webhookCode(code); err != nil || got != want {
			t.Errorf("webhookCode(%s) = %q, %v; want %q", code, got, err, want)
		}
	}
	var param *paramsError
	if _, err := webhookCode(webhooks.CodeInvalidSecret); !errors.As(err, &param) {
		t.Errorf("webhookCode(%s) error = %v; want a params error", webhooks.CodeInvalidSecret, err)
	}
	var protocol *protocolError
	if _, err := webhookCode(webhooks.CodeInvalidBody); !errors.As(err, &protocol) || protocol.code != "DRIVER_FAILURE" {
		t.Errorf("webhookCode(%s) error = %v; want a driver failure", webhooks.CodeInvalidBody, err)
	}
}

func TestVerifyParams(t *testing.T) {
	const secret = `"whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"`
	tests := []struct{ name, params, want string }{
		{"no secrets", `{"headers":{},"secrets":[],"nowSeconds":1,"toleranceSeconds":1,"payload":""}`, "secrets must not be empty"},
		{"header value", `{"headers":{"b":"x","a":1,"c":2},"secrets":[` + secret + `]}`, "headers.a must be a string"},
		{"clock", `{"headers":{},"secrets":[` + secret + `],"toleranceSeconds":1,"payload":""}`,
			"nowSeconds and toleranceSeconds are required"},
		{"tolerance", `{"headers":{},"secrets":[` + secret + `],"nowSeconds":1,"toleranceSeconds":9223372037,"payload":""}`,
			"toleranceSeconds must be an integer in 0..9223372036"},
		{"secret", `{"headers":{"webhook-id":"m","webhook-timestamp":"1","webhook-signature":"v1,c2ln"},"secrets":["s"],` +
			`"nowSeconds":1,"toleranceSeconds":1,"payload":""}`, "secrets must be whsec_ secrets"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			lines, _ := exchange(t, hello+`{"id":2,"method":"webhooks.verify","params":`+test.params+"}\n")
			if want := requestError("2", "INVALID_PARAMS", test.want); len(lines) != 2 || lines[1] != want {
				t.Fatalf("exchange() = %q; want second line %s", lines, want)
			}
		})
	}
}

func TestSafeInteger(t *testing.T) {
	for text, want := range map[string]bool{
		"1": true, "1.0": true, "1e3": true, "-0": true, "9007199254740991": true, "-9007199254740991": true,
		"9007199254740992": false, "1.5": false, "1e400": false,
	} {
		if _, got := safeInteger(json.Number(text)); got != want {
			t.Errorf("safeInteger(%s) = %t; want %t", text, got, want)
		}
	}
	if _, ok := safeInteger("1"); ok {
		t.Error("safeInteger accepted a string")
	}
}
