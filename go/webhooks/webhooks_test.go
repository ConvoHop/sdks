package webhooks_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/ConvoHop/sdks/go/internal/spectest"
	"github.com/ConvoHop/sdks/go/webhooks"
)

const (
	testID    = "msg_2mFQ0XrZ6m1nO6Ju3k5p8sHdVwE"
	testStamp = int64(1767225600)
)

var (
	testKey     = []byte("0123456789abcdef0123456789abcdef")
	otherKey    = []byte("fedcba9876543210fedcba9876543210")
	testSecrets = []string{secretFor(testKey)}
)

func secretFor(key []byte) string { return "whsec_" + base64.StdEncoding.EncodeToString(key) }

func sign(key []byte, id, stamp string, body []byte) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(id + "." + stamp + "."))
	mac.Write(body)
	return "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func signedHeader(id, stamp, signature string) http.Header {
	header := http.Header{}
	header.Set("webhook-id", id)
	header.Set("webhook-timestamp", stamp)
	header.Set("webhook-signature", signature)
	return header
}

// signed returns the headers of body signed with testKey at testStamp.
func signed(body []byte) http.Header {
	stamp := strconv.FormatInt(testStamp, 10)
	return signedHeader(testID, stamp, sign(testKey, testID, stamp, body))
}

func at(seconds int64) webhooks.Option {
	return webhooks.WithClock(func() time.Time { return time.Unix(seconds, 0) })
}

func codeOf(err error) webhooks.Code {
	var failure *webhooks.Error
	if errors.As(err, &failure) {
		return failure.Code
	}
	return ""
}

func TestVerifySignatureVectors(t *testing.T) {
	var file struct {
		Scheme  string `json:"scheme"`
		Vectors []struct {
			ID               string            `json:"id"`
			Payload          string            `json:"payload"`
			Headers          map[string]string `json:"headers"`
			Secrets          []string          `json:"secrets"`
			NowSeconds       int64             `json:"nowSeconds"`
			ToleranceSeconds int64             `json:"toleranceSeconds"`
			Expected         struct {
				Valid bool    `json:"valid"`
				Code  *string `json:"code"`
			} `json:"expected"`
		} `json:"vectors"`
	}
	if err := json.Unmarshal(spectest.Read(t, "conformance/vectors/webhooks.json"), &file); err != nil {
		t.Fatal(err)
	}
	if file.Scheme != "standard-webhooks-v1" || len(file.Vectors) == 0 {
		t.Fatalf("unexpected vector file: scheme %q, %d vectors", file.Scheme, len(file.Vectors))
	}
	// The driver protocol's codes.
	protocol := map[webhooks.Code]string{
		webhooks.CodeMissingHeader:       "WEBHOOK_HEADERS_MISSING",
		webhooks.CodeInvalidHeader:       "WEBHOOK_HEADERS_MISSING",
		webhooks.CodeInvalidTimestamp:    "WEBHOOK_TIMESTAMP_INVALID",
		webhooks.CodeTimestampExpired:    "WEBHOOK_TIMESTAMP_EXPIRED",
		webhooks.CodeTimestampFuture:     "WEBHOOK_TIMESTAMP_FUTURE",
		webhooks.CodeBodyTooLarge:        "WEBHOOK_SIGNATURE_INVALID",
		webhooks.CodeTooManySignatures:   "WEBHOOK_SIGNATURE_INVALID",
		webhooks.CodeNoMatchingSignature: "WEBHOOK_SIGNATURE_INVALID",
	}
	for _, vector := range file.Vectors {
		t.Run(vector.ID, func(t *testing.T) {
			// Keep the vector's header name case.
			header := http.Header{}
			var id, stamp string
			for name, value := range vector.Headers {
				header[name] = []string{value}
				switch strings.ToLower(name) {
				case "webhook-id":
					id = value
				case "webhook-timestamp":
					stamp = value
				}
			}
			signature, err := webhooks.VerifySignature([]byte(vector.Payload), header, vector.Secrets,
				at(vector.NowSeconds), webhooks.WithTolerance(time.Duration(vector.ToleranceSeconds)*time.Second))
			if !vector.Expected.Valid {
				if code, ok := protocol[codeOf(err)]; !ok || vector.Expected.Code == nil || code != *vector.Expected.Code {
					t.Fatalf("VerifySignature() error = %v; want %v", err, vector.Expected.Code)
				}
				return
			}
			if err != nil {
				t.Fatalf("VerifySignature() error = %v; want none", err)
			}
			if want, _ := strconv.ParseInt(stamp, 10, 64); signature.WebhookID != id || signature.Timestamp != want {
				t.Fatalf("VerifySignature() = %+v; want %s at %d", signature, id, want)
			}
		})
	}
}

func TestSecrets(t *testing.T) {
	body := []byte(`{}`)
	zeros := func(size int) string { return secretFor(make([]byte, size)) }
	ones := make([]byte, 24)
	for index := range ones {
		ones[index] = 0xff
	}
	valid := secretFor(testKey)
	for name, secrets := range map[string][]string{
		"none":               nil,
		"empty list":         {},
		"empty":              {""},
		"prefix only":        {"whsec_"},
		"no prefix":          {strings.TrimPrefix(valid, "whsec_")},
		"uppercase prefix":   {"WHSEC_" + strings.TrimPrefix(valid, "whsec_")},
		"23 bytes":           {zeros(23)},
		"65 bytes":           {zeros(65)},
		"unpadded":           {strings.TrimRight(zeros(25), "=")},
		"URL alphabet":       {strings.ReplaceAll(secretFor(ones), "/", "_")},
		"line break":         {valid[:20] + "\n" + valid[20:]},
		"trailing space":     {valid + " "},
		"non-canonical bits": {"whsec_" + strings.Repeat("A", 33) + "B=="},
		"one invalid of two": {valid, "whsec_"},
	} {
		if _, err := webhooks.VerifySignature(body, signed(body), secrets, at(testStamp)); !errors.Is(err, webhooks.CodeInvalidSecret) {
			t.Errorf("%s: VerifySignature() error = %v; want %s", name, err, webhooks.CodeInvalidSecret)
		}
	}

	stamp := strconv.FormatInt(testStamp, 10)
	for name, key := range map[string][]byte{"24 bytes": ones, "64 bytes": make([]byte, 64), "25 bytes": make([]byte, 25)} {
		header := signedHeader(testID, stamp, sign(key, testID, stamp, body))
		if _, err := webhooks.VerifySignature(body, header, []string{secretFor(key)}, at(testStamp)); err != nil {
			t.Errorf("%s: VerifySignature() error = %v; want none", name, err)
		}
	}
	// During a rotation, either secret verifies.
	header := signedHeader(testID, stamp, sign(otherKey, testID, stamp, body))
	if _, err := webhooks.VerifySignature(body, header, []string{valid, secretFor(otherKey)}, at(testStamp)); err != nil {
		t.Errorf("rotation: VerifySignature() error = %v; want none", err)
	}
}

func TestHeaders(t *testing.T) {
	body := []byte(`{}`)
	for _, test := range []struct {
		name    string
		edit    func(http.Header)
		code    webhooks.Code
		message string
	}{
		{"missing id", func(h http.Header) { h.Del("webhook-id") },
			webhooks.CodeMissingHeader, "Missing webhook-id header"},
		{"missing timestamp", func(h http.Header) { h.Del("webhook-timestamp") },
			webhooks.CodeMissingHeader, "Missing webhook-timestamp header"},
		{"missing signature", func(h http.Header) { h.Del("webhook-signature") },
			webhooks.CodeMissingHeader, "Missing webhook-signature header"},
		{"empty id", func(h http.Header) { h.Set("webhook-id", "") },
			webhooks.CodeMissingHeader, "Missing webhook-id header"},
		{"no values", func(h http.Header) { h["Webhook-Id"] = []string{} },
			webhooks.CodeMissingHeader, "Missing webhook-id header"},
		{"repeated value", func(h http.Header) { h.Add("webhook-id", testID) },
			webhooks.CodeInvalidHeader, "Repeated webhook-id header"},
		{"repeated across name cases", func(h http.Header) { h["webhook-signature"] = h["Webhook-Signature"] },
			webhooks.CodeInvalidHeader, "Repeated webhook-signature header"},
		{"non-ASCII case fold", func(h http.Header) { h["webhoo\u212a-id"] = h["Webhook-Id"]; h.Del("webhook-id") },
			webhooks.CodeMissingHeader, "Missing webhook-id header"},
		{"headers before timestamp format", func(h http.Header) { h.Set("webhook-timestamp", "x"); h.Del("webhook-signature") },
			webhooks.CodeMissingHeader, "Missing webhook-signature header"},
	} {
		header := signed(body)
		test.edit(header)
		_, err := webhooks.VerifySignature(body, header, testSecrets, at(testStamp))
		if want := "convohop webhooks: " + string(test.code) + ": " + test.message; err == nil || err.Error() != want {
			t.Errorf("%s: VerifySignature() error = %v; want %s", test.name, err, want)
		}
	}
	if _, err := webhooks.VerifySignature(body, nil, testSecrets, at(testStamp)); !errors.Is(err, webhooks.CodeMissingHeader) {
		t.Errorf("nil header: VerifySignature() error = %v; want %s", err, webhooks.CodeMissingHeader)
	}
	// Keys that net/http didn't canonicalize still match.
	lower := http.Header{}
	for name, values := range signed(body) {
		lower[strings.ToLower(name)] = values
	}
	if _, err := webhooks.VerifySignature(body, lower, testSecrets, at(testStamp)); err != nil {
		t.Errorf("lowercase names: VerifySignature() error = %v; want none", err)
	}
}

func TestTimestamps(t *testing.T) {
	body := []byte(`{}`)
	check := func(stamp string, options ...webhooks.Option) error {
		header := signedHeader(testID, stamp, sign(testKey, testID, stamp, body))
		_, err := webhooks.VerifySignature(body, header, testSecrets, options...)
		return err
	}
	for _, stamp := range []string{"abc", "-1767225600", "+1767225600", "1767225600.0", " 1767225600",
		"1767225600 ", "0x10", "1e9", "1000000000000000", "\uff11767225600"} {
		if err := check(stamp, at(testStamp)); !errors.Is(err, webhooks.CodeInvalidTimestamp) {
			t.Errorf("stamp %q: error = %v; want %s", stamp, err, webhooks.CodeInvalidTimestamp)
		}
	}
	// The stamp is signed as sent; leading zeros are digits.
	if err := check("01767225600", at(testStamp)); err != nil {
		t.Errorf("leading zero: error = %v; want none", err)
	}
	if err := check("999999999999999", at(testStamp)); !errors.Is(err, webhooks.CodeTimestampFuture) {
		t.Errorf("15 digits: error = %v; want %s", err, webhooks.CodeTimestampFuture)
	}
	if err := check("0", at(testStamp)); !errors.Is(err, webhooks.CodeTimestampExpired) {
		t.Errorf("zero: error = %v; want %s", err, webhooks.CodeTimestampExpired)
	}

	stamp := strconv.FormatInt(testStamp, 10)
	zero := webhooks.WithTolerance(0)
	for _, test := range []struct {
		name    string
		options []webhooks.Option
		want    webhooks.Code
	}{
		{"default tolerance, oldest", []webhooks.Option{at(testStamp + 300)}, ""},
		{"default tolerance, expired", []webhooks.Option{at(testStamp + 301)}, webhooks.CodeTimestampExpired},
		{"default tolerance, furthest ahead", []webhooks.Option{at(testStamp - 300)}, ""},
		{"default tolerance, future", []webhooks.Option{at(testStamp - 301)}, webhooks.CodeTimestampFuture},
		{"zero tolerance", []webhooks.Option{at(testStamp), zero}, ""},
		{"zero tolerance, expired", []webhooks.Option{at(testStamp + 1), zero}, webhooks.CodeTimestampExpired},
		{"zero tolerance, future", []webhooks.Option{zero, at(testStamp - 1)}, webhooks.CodeTimestampFuture},
		{"wide tolerance", []webhooks.Option{at(testStamp + 86400), webhooks.WithTolerance(24 * time.Hour)}, ""},
		{"fractional clock floors", []webhooks.Option{webhooks.WithClock(func() time.Time {
			return time.Unix(testStamp+300, 999_999_999)
		})}, ""},
		{"earliest clock", []webhooks.Option{at(math.MinInt64)}, webhooks.CodeTimestampFuture},
		{"latest clock", []webhooks.Option{at(math.MaxInt64)}, webhooks.CodeTimestampExpired},
	} {
		if err := check(stamp, test.options...); codeOf(err) != test.want || (err == nil) != (test.want == "") {
			t.Errorf("%s: error = %v; want %q", test.name, err, test.want)
		}
	}
}

func TestBodyLimit(t *testing.T) {
	exact := []byte(strings.Repeat("a", 4096))
	if _, err := webhooks.VerifySignature(exact, signed(exact), testSecrets, at(testStamp)); err != nil {
		t.Errorf("4096 bytes: error = %v; want none", err)
	}
	over := []byte(strings.Repeat("a", 4097))
	if _, err := webhooks.VerifySignature(over, signed(over), testSecrets, at(testStamp)); !errors.Is(err, webhooks.CodeBodyTooLarge) {
		t.Errorf("4097 bytes: error = %v; want %s", err, webhooks.CodeBodyTooLarge)
	}
	// The body is checked before the signature count.
	header := signed(over)
	header.Set("webhook-signature", strings.Repeat(header.Get("webhook-signature")+" ", 9))
	if _, err := webhooks.VerifySignature(over, header, testSecrets, at(testStamp)); !errors.Is(err, webhooks.CodeBodyTooLarge) {
		t.Errorf("4097 bytes and 9 signatures: error = %v; want %s", err, webhooks.CodeBodyTooLarge)
	}
}

func TestSignatureEntries(t *testing.T) {
	body := []byte(`{"a":1}`)
	stamp := strconv.FormatInt(testStamp, 10)
	valid := sign(testKey, testID, stamp, body)
	encoded := strings.TrimPrefix(valid, "v1,")
	other := sign(otherKey, testID, stamp, body)
	short := "v1," + base64.StdEncoding.EncodeToString(make([]byte, 16))
	for _, test := range []struct {
		name, signature string
		want            webhooks.Code
	}{
		{"valid", valid, ""},
		{"valid last of 8", strings.Repeat(other+" ", 7) + valid, ""},
		{"9 entries", strings.Repeat(other+" ", 8) + valid, webhooks.CodeTooManySignatures},
		{"extra spaces", "  " + other + "   " + valid + " ", ""},
		{"spaces aren't entries", strings.Repeat(" ", 20) + valid + strings.Repeat(" ", 20), ""},
		{"invalid entries are skipped", "garbage v1 v1, ,x " + short + " " + valid, ""},
		{"other version", "v2," + encoded, webhooks.CodeNoMatchingSignature},
		{"uppercase version", "V1," + encoded, webhooks.CodeNoMatchingSignature},
		{"no version", "," + encoded, webhooks.CodeNoMatchingSignature},
		{"no comma", "v1" + encoded, webhooks.CodeNoMatchingSignature},
		{"unpadded", "v1," + strings.TrimRight(encoded, "="), webhooks.CodeNoMatchingSignature},
		{"trailing comma", valid + ",", webhooks.CodeNoMatchingSignature},
		{"16 bytes", short, webhooks.CodeNoMatchingSignature},
		{"tab separated", other + "\t" + valid, webhooks.CodeNoMatchingSignature},
		{"wrong key", other, webhooks.CodeNoMatchingSignature},
	} {
		header := signedHeader(testID, stamp, test.signature)
		if _, err := webhooks.VerifySignature(body, header, testSecrets, at(testStamp)); codeOf(err) != test.want || (err == nil) != (test.want == "") {
			t.Errorf("%s: error = %v; want %q", test.name, err, test.want)
		}
	}
	for name, edit := range map[string]func(http.Header){
		"body":      func(http.Header) {},
		"id":        func(h http.Header) { h.Set("webhook-id", testID+"x") },
		"timestamp": func(h http.Header) { h.Set("webhook-timestamp", strconv.FormatInt(testStamp+1, 10)) },
	} {
		header := signedHeader(testID, stamp, valid)
		edit(header)
		signedBody := body
		if name == "body" {
			signedBody = []byte(`{"a":2}`)
		}
		if _, err := webhooks.VerifySignature(signedBody, header, testSecrets, at(testStamp)); !errors.Is(err, webhooks.CodeNoMatchingSignature) {
			t.Errorf("tampered %s: error = %v; want %s", name, err, webhooks.CodeNoMatchingSignature)
		}
	}
}

func TestOptions(t *testing.T) {
	for name, test := range map[string]struct {
		options []webhooks.Option
		message string
	}{
		"nil option":           {[]webhooks.Option{nil}, "nil option"},
		"nil clock":            {[]webhooks.Option{webhooks.WithClock(nil)}, "WithClock requires a clock"},
		"negative tolerance":   {[]webhooks.Option{webhooks.WithTolerance(-time.Second)}, "WithTolerance requires a non-negative whole number of seconds"},
		"fractional tolerance": {[]webhooks.Option{webhooks.WithTolerance(1500 * time.Millisecond)}, "WithTolerance requires a non-negative whole number of seconds"},
		"first error wins":     {[]webhooks.Option{webhooks.WithClock(nil), nil}, "WithClock requires a clock"},
	} {
		// Options are checked before the secrets and headers.
		for _, verify := range []func() error{
			func() error { _, err := webhooks.Verify([]byte(`{}`), nil, nil, test.options...); return err },
			func() error { _, err := webhooks.VerifySignature([]byte(`{}`), nil, nil, test.options...); return err },
		} {
			err := verify()
			if want := "convohop webhooks: " + test.message; err == nil || err.Error() != want {
				t.Errorf("%s: error = %v; want %s", name, err, want)
			}
			if codeOf(err) != "" {
				t.Errorf("%s: an option error is a verification failure: %v", name, err)
			}
		}
	}
}

func TestErrorContract(t *testing.T) {
	body := []byte(`{"marker":"b0dy-c0ntent"}`)
	header := signed(body)
	_, err := webhooks.VerifySignature(body, header, testSecrets, at(testStamp+301))
	if want := "convohop webhooks: TIMESTAMP_EXPIRED: webhook-timestamp is older than the tolerance"; err == nil || err.Error() != want {
		t.Fatalf("error = %v; want %s", err, want)
	}
	if !errors.Is(err, webhooks.CodeTimestampExpired) || errors.Is(err, webhooks.CodeTimestampFuture) {
		t.Errorf("errors.Is doesn't match only the error's code: %v", err)
	}
	if got := webhooks.CodeTimestampExpired.Error(); got != "convohop webhooks: TIMESTAMP_EXPIRED" {
		t.Errorf("Code.Error() = %q", got)
	}
	// No failure echoes a secret, signature, header value or the body.
	offered := strings.TrimPrefix(header.Get("webhook-signature"), "v1,")
	failures := []error{err}
	for _, options := range [][]webhooks.Option{{at(testStamp)}, {at(testStamp - 301)}} {
		_, err := webhooks.VerifySignature(body, header, []string{secretFor(otherKey)}, options...)
		failures = append(failures, err)
	}
	_, err = webhooks.VerifySignature(body, header, []string{"whsec_c2VjcmV0"}, at(testStamp))
	failures = append(failures, err)
	invalid := []byte(`{"marker":"b0dy-c0ntent"`)
	_, err = webhooks.Verify(invalid, signed(invalid), testSecrets, at(testStamp))
	failures = append(failures, err)
	for _, failure := range failures {
		if failure == nil {
			t.Fatal("an expected failure is nil")
		}
		for _, value := range []string{"b0dy-c0ntent", "c2VjcmV0", secretFor(otherKey)[6:], offered, testID, "1767225"} {
			if strings.Contains(failure.Error(), value) {
				t.Errorf("%q contains %q", failure.Error(), value)
			}
		}
	}
}
