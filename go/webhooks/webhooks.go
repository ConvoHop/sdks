// Package webhooks verifies ConvoHop webhook deliveries.
//
// ConvoHop signs deliveries with the Standard Webhooks symmetric scheme:
// HMAC-SHA256 over the delivery's webhook-id, webhook-timestamp and raw body,
// carried as v1 signatures. Verify the body exactly as received, before
// parsing or re-encoding it, respond 2xx within 5 seconds and process the
// event afterwards. Deliveries are at least once: discard duplicates by
// webhook-id.
//
//	// Verify rejects bodies over 4096 bytes, so read no more.
//	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
//	if err != nil {
//		http.Error(w, "unreadable body", http.StatusBadRequest)
//		return
//	}
//	delivery, err := webhooks.Verify(body, r.Header, secrets)
//	if err != nil {
//		http.Error(w, "invalid delivery", http.StatusBadRequest)
//		return
//	}
//	w.WriteHeader(http.StatusNoContent)
//
// Events carry metadata only; fetch a resource through the API when you need
// its content. A notification event's [Notification] is the input of the push
// package's builders.
package webhooks

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Code is why a delivery failed verification. Code implements error so that
// errors.Is(err, CodeTimestampExpired) matches an [*Error] with that code.
type Code string

// Error returns the code as an error message.
func (c Code) Error() string { return "convohop webhooks: " + string(c) }

// Verification failure codes. Checks run in the order listed and stop at the
// first failure.
const (
	// CodeInvalidSecret means no secret is given, or one is not whsec_
	// followed by padded standard Base64 of 24 to 64 bytes. It is your
	// configuration, not the sender.
	CodeInvalidSecret Code = "INVALID_SECRET"
	// CodeMissingHeader means webhook-id, webhook-timestamp or
	// webhook-signature is absent or empty.
	CodeMissingHeader Code = "MISSING_HEADER"
	// CodeInvalidHeader means one of those headers is repeated.
	CodeInvalidHeader Code = "INVALID_HEADER"
	// CodeInvalidTimestamp means webhook-timestamp is not 1 to 15 ASCII
	// digits (integer Unix seconds).
	CodeInvalidTimestamp Code = "INVALID_TIMESTAMP"
	// CodeTimestampExpired means the timestamp is more than the tolerance
	// before now.
	CodeTimestampExpired Code = "TIMESTAMP_EXPIRED"
	// CodeTimestampFuture means the timestamp is more than the tolerance
	// after now.
	CodeTimestampFuture Code = "TIMESTAMP_FUTURE"
	// CodeBodyTooLarge means the body exceeds 4096 bytes.
	CodeBodyTooLarge Code = "BODY_TOO_LARGE"
	// CodeTooManySignatures means webhook-signature has more than 8 entries.
	CodeTooManySignatures Code = "TOO_MANY_SIGNATURES"
	// CodeNoMatchingSignature means no v1 signature matches any secret.
	CodeNoMatchingSignature Code = "NO_MATCHING_SIGNATURE"
	// CodeInvalidBody means the signed body is not a UTF-8 JSON event
	// envelope. Only [Verify] reports it.
	CodeInvalidBody Code = "INVALID_BODY"
)

// Error is a delivery that failed verification. Its message never contains
// secrets, signatures or the body.
type Error struct {
	// Code is why the delivery failed.
	Code Code
	// Message is a human-readable diagnostic.
	Message string
}

func (e *Error) Error() string {
	return "convohop webhooks: " + string(e.Code) + ": " + e.Message
}

// Is reports whether target is the error's [Code].
func (e *Error) Is(target error) bool {
	code, ok := target.(Code)
	return ok && code == e.Code
}

func failure(code Code, message string) error {
	return &Error{Code: code, Message: message}
}

// DefaultTolerance is the default allowed distance between a delivery's
// webhook-timestamp and the verifier's clock.
const DefaultTolerance = 5 * time.Minute

// Option configures verification.
type Option func(*settings)

type settings struct {
	tolerance int64
	now       func() time.Time
	err       error
}

func (s *settings) fail(message string) {
	if s.err == nil {
		s.err = errors.New("convohop webhooks: " + message)
	}
}

// WithTolerance sets the allowed distance between a delivery's
// webhook-timestamp and now, inclusive. It must be a non-negative whole
// number of seconds. The default is [DefaultTolerance].
func WithTolerance(tolerance time.Duration) Option {
	return func(s *settings) {
		if tolerance < 0 || tolerance%time.Second != 0 {
			s.fail("WithTolerance requires a non-negative whole number of seconds")
			return
		}
		s.tolerance = int64(tolerance / time.Second)
	}
}

// WithClock replaces time.Now. Use it in tests.
func WithClock(now func() time.Time) Option {
	return func(s *settings) {
		if now == nil {
			s.fail("WithClock requires a clock")
			return
		}
		s.now = now
	}
}

// Signature is a verified delivery's identity.
type Signature struct {
	// WebhookID is the delivery's webhook-id. It stays the same when a
	// delivery is retried; use it to discard duplicates.
	WebhookID string
	// Timestamp is the delivery's webhook-timestamp, in Unix seconds.
	Timestamp int64
}

// Delivery is a verified delivery and its event.
type Delivery struct {
	Signature
	Event Event
}

const (
	bodyLimit       = 4096
	signatureLimit  = 8
	signatureBytes  = 32
	secretPrefix    = "whsec_"
	secretMinBytes  = 24
	secretMaxBytes  = 64
	headerID        = "webhook-id"
	headerTimestamp = "webhook-timestamp"
	headerSignature = "webhook-signature"
)

var (
	base64Pattern = regexp.MustCompile(`^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$`)
	stampPattern  = regexp.MustCompile(`^[0-9]{1,15}$`)
)

// Verify verifies a delivery's signature and timestamp, then parses its
// event. Pass the body exactly as received and the request's headers. The
// delivery is valid when any v1 signature matches any of secrets, the
// endpoint's whsec_ secrets: the current one and, during a rotation, the
// other. A failed delivery returns an [*Error]; an invalid option returns
// another error.
func Verify(body []byte, header http.Header, secrets []string, options ...Option) (Delivery, error) {
	signature, err := verify(body, header, secrets, options)
	if err != nil {
		return Delivery{}, err
	}
	event, err := parseEvent(body)
	if err != nil {
		return Delivery{}, err
	}
	return Delivery{Signature: signature, Event: event}, nil
}

// VerifySignature verifies only a delivery's signature and timestamp, for
// bodies you parse yourself. It fails like [Verify], except that it never
// reports [CodeInvalidBody].
func VerifySignature(body []byte, header http.Header, secrets []string, options ...Option) (Signature, error) {
	return verify(body, header, secrets, options)
}

func verify(body []byte, header http.Header, secrets []string, options []Option) (Signature, error) {
	s := &settings{tolerance: int64(DefaultTolerance / time.Second), now: time.Now}
	for _, option := range options {
		if option == nil {
			s.fail("nil option")
			continue
		}
		option(s)
	}
	if s.err != nil {
		return Signature{}, s.err
	}
	keys, err := secretKeys(secrets)
	if err != nil {
		return Signature{}, err
	}
	webhookID, err := headerValue(header, headerID)
	if err != nil {
		return Signature{}, err
	}
	stamp, err := headerValue(header, headerTimestamp)
	if err != nil {
		return Signature{}, err
	}
	signatures, err := headerValue(header, headerSignature)
	if err != nil {
		return Signature{}, err
	}
	if !stampPattern.MatchString(stamp) {
		return Signature{}, failure(CodeInvalidTimestamp, "webhook-timestamp must be integer Unix seconds")
	}
	// At most 15 digits, so it always fits.
	timestamp, _ := strconv.ParseInt(stamp, 10, 64)
	// Compared without overflow for any clock: timestamp is at most 15
	// digits and the tolerance at most about 2^33 seconds.
	now := s.now().Unix()
	if now > timestamp && now-timestamp > s.tolerance {
		return Signature{}, failure(CodeTimestampExpired, "webhook-timestamp is older than the tolerance")
	}
	if timestamp > now && timestamp-s.tolerance > now {
		return Signature{}, failure(CodeTimestampFuture, "webhook-timestamp is further ahead than the tolerance")
	}
	if len(body) > bodyLimit {
		return Signature{}, failure(CodeBodyTooLarge, "Webhook body exceeds 4096 bytes")
	}
	var entries []string
	for _, entry := range strings.Split(signatures, " ") {
		if entry != "" {
			entries = append(entries, entry)
		}
	}
	if len(entries) > signatureLimit {
		return Signature{}, failure(CodeTooManySignatures, "webhook-signature has more than 8 entries")
	}
	var offered [][]byte
	for _, entry := range entries {
		version, encoded, found := strings.Cut(entry, ",")
		if !found || version != "v1" {
			continue
		}
		if candidate, ok := base64Bytes(encoded); ok && len(candidate) == signatureBytes {
			offered = append(offered, candidate)
		}
	}
	signed := make([]byte, 0, len(webhookID)+len(stamp)+2+len(body))
	signed = append(append(append(append(append(signed, webhookID...), '.'), stamp...), '.'), body...)
	for _, key := range keys {
		mac := hmac.New(sha256.New, key)
		mac.Write(signed)
		expected := mac.Sum(nil)
		for _, candidate := range offered {
			if hmac.Equal(expected, candidate) {
				return Signature{WebhookID: webhookID, Timestamp: timestamp}, nil
			}
		}
	}
	return Signature{}, failure(CodeNoMatchingSignature, "No v1 webhook signature matches the configured secrets")
}

// base64Bytes decodes strict padded standard Base64. Non-canonical encodings
// are rejected, so byte equality matches text equality.
func base64Bytes(value string) ([]byte, bool) {
	if !base64Pattern.MatchString(value) {
		return nil, false
	}
	decoded, err := base64.StdEncoding.DecodeString(value)
	if err != nil || base64.StdEncoding.EncodeToString(decoded) != value {
		return nil, false
	}
	return decoded, true
}

func secretKeys(secrets []string) ([][]byte, error) {
	if len(secrets) == 0 {
		return nil, failure(CodeInvalidSecret, "At least one webhook secret is required")
	}
	keys := make([][]byte, 0, len(secrets))
	for _, secret := range secrets {
		encoded, found := strings.CutPrefix(secret, secretPrefix)
		key, ok := base64Bytes(encoded)
		if !found || !ok || len(key) < secretMinBytes || len(key) > secretMaxBytes {
			return nil, failure(CodeInvalidSecret,
				"A webhook secret must be whsec_ followed by padded standard Base64 of 24 to 64 bytes")
		}
		keys = append(keys, key)
	}
	return keys, nil
}

// headerValue returns the only value of the header name. Names match ASCII
// case-insensitively, so headers built without canonical keys still match.
func headerValue(header http.Header, name string) (string, error) {
	var values []string
	for key, value := range header {
		if sameName(key, name) {
			values = append(values, value...)
		}
	}
	if len(values) > 1 {
		return "", failure(CodeInvalidHeader, "Repeated "+name+" header")
	}
	if len(values) == 0 || values[0] == "" {
		return "", failure(CodeMissingHeader, "Missing "+name+" header")
	}
	return values[0], nil
}

// sameName reports whether key is the lowercase header name, ignoring ASCII
// case. HTTP field names are ASCII.
func sameName(key, name string) bool {
	if len(key) != len(name) {
		return false
	}
	for index := 0; index < len(key); index++ {
		character := key[index]
		if 'A' <= character && character <= 'Z' {
			character += 'a' - 'A'
		}
		if character != name[index] {
			return false
		}
	}
	return true
}
