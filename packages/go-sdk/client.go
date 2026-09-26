// Package comms provides GraphQL clients for project management, trusted
// identity/session issuance, and communications.
package convohop

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// A full page of 100 valid 32768-byte messages can expand considerably when
// control characters are JSON-escaped.
const maxJSONBytes = 32 << 20

// APIError represents either an HTTP error or a GraphQL error. GraphQL errors
// have StatusCode 200 and preserve errors[0].extensions.code.
type APIError struct {
	StatusCode int
	Code       string
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("communications API (%d, %s): %s", e.StatusCode, e.Code, e.Message)
}

// ClientOption configures any of the three clients.
type ClientOption func(*apiClient) error

// WithHTTPClient supplies a custom transport/timeout. Redirects are always
// disabled, even when the supplied client would follow them, to protect bearer
// credentials. The supplied client is copied rather than modified.
func WithHTTPClient(client *http.Client) ClientOption {
	return func(c *apiClient) error {
		if client == nil {
			return errors.New("HTTP client must not be nil")
		}
		copy := *client
		c.http = &copy
		return nil
	}
}

type apiClient struct {
	base  url.URL
	token string
	http  *http.Client
}

func newClient(baseURL, credential, prefix string, options []ClientOption) (apiClient, error) {
	base, err := parseBaseURL(baseURL)
	if err != nil {
		return apiClient{}, err
	}
	if !validCredential(credential, prefix) {
		return apiClient{}, fmt.Errorf("credential must be %s followed by 64 hex characters", prefix)
	}
	c := apiClient{
		base:  *base,
		token: credential,
		http:  &http.Client{Timeout: 30 * time.Second},
	}
	for _, option := range options {
		if option == nil {
			return apiClient{}, errors.New("client option must not be nil")
		}
		if err := option(&c); err != nil {
			return apiClient{}, err
		}
	}
	if c.http == nil {
		return apiClient{}, errors.New("HTTP client must not be nil")
	}
	httpClient := *c.http
	httpClient.CheckRedirect = func(*http.Request, []*http.Request) error {
		return http.ErrUseLastResponse
	}
	c.http = &httpClient
	return c, nil
}

func parseBaseURL(raw string) (*url.URL, error) {
	if raw == "" || strings.TrimSpace(raw) != raw || strings.ContainsAny(raw, "?#") {
		return nil, errors.New("base URL must be an HTTP(S) origin without query or fragment")
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid base URL: %w", err)
	}
	if (parsed.Scheme != "http" && parsed.Scheme != "https") ||
		parsed.Opaque != "" || parsed.Host == "" || parsed.User != nil ||
		(parsed.Path != "" && parsed.Path != "/") || parsed.RawPath != "" {
		return nil, errors.New("base URL must be an HTTP(S) origin without credentials or path")
	}
	host := parsed.Hostname()
	if host == "" {
		return nil, errors.New("base URL must have a host")
	}
	if strings.HasSuffix(parsed.Host, ":") ||
		(strings.Count(parsed.Host, ":") > 1 && !strings.HasPrefix(parsed.Host, "[")) {
		return nil, errors.New("base URL has an invalid host or empty port")
	}
	if port := parsed.Port(); port != "" {
		number, err := strconv.Atoi(port)
		if err != nil || number < 1 || number > 65535 {
			return nil, errors.New("base URL has an invalid port")
		}
	}
	if parsed.Scheme == "http" && host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return nil, errors.New("non-loopback API endpoints require HTTPS")
	}
	return &url.URL{Scheme: parsed.Scheme, Host: parsed.Host, Path: "/"}, nil
}

func validCredential(value, prefix string) bool {
	if len(value) != len(prefix)+64 || !strings.HasPrefix(value, prefix) {
		return false
	}
	for i := len(prefix); i < len(value); i++ {
		if !isHex(value[i]) {
			return false
		}
	}
	return true
}

func isHex(b byte) bool {
	return b >= '0' && b <= '9' || b >= 'a' && b <= 'f' || b >= 'A' && b <= 'F'
}

func validateUUID(name, id string) error {
	if len(id) != 36 {
		return fmt.Errorf("%s must be a UUID", name)
	}
	for i := 0; i < len(id); i++ {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if id[i] != '-' {
				return fmt.Errorf("%s must be a UUID", name)
			}
		} else if !isHex(id[i]) {
			return fmt.Errorf("%s must be a UUID", name)
		}
	}
	return nil
}

func validateNonNilUUID(name, id string) error {
	if err := validateUUID(name, id); err != nil {
		return err
	}
	if strings.EqualFold(id, "00000000-0000-0000-0000-000000000000") {
		return fmt.Errorf("%s must not be a nil UUID", name)
	}
	return nil
}

func validateIdentityID(id string) error {
	if len(id) != 35 || !strings.HasPrefix(id, "ci_") || id == "ci_00000000000000000000000000000000" {
		return errors.New("identity ID must be a service-issued ci_ identifier")
	}
	for i := 3; i < len(id); i++ {
		if id[i] < '0' || id[i] > '9' && (id[i] < 'a' || id[i] > 'f') {
			return errors.New("identity ID must be a service-issued ci_ identifier")
		}
	}
	return nil
}

func validateTitle(title string) error {
	if strings.TrimSpace(title) == "" || len(title) > 128 {
		return errors.New("title/name must contain text and be at most 128 UTF-8 bytes")
	}
	for _, r := range title {
		if unicode.IsControl(r) {
			return errors.New("title/name must not contain control characters")
		}
	}
	return nil
}

func validateBody(body string) error {
	if strings.TrimSpace(body) == "" || len(body) > 32768 || strings.ContainsRune(body, 0) {
		return errors.New("body must contain text, be at most 32768 UTF-8 bytes and contain no NUL")
	}
	return nil
}

func pageVariables(after int64, limit int) (map[string]any, error) {
	if after < 0 || limit < 0 || limit > 100 {
		return nil, errors.New("after must be nonnegative and limit must be 1-100 (or 0 for default)")
	}
	if limit == 0 {
		limit = 50
	}
	return map[string]any{"after": strconv.FormatInt(after, 10), "limit": limit}, nil
}

func parseSequence(name, value string) (int64, error) {
	if value == "" || (len(value) > 1 && value[0] == '0') {
		return 0, fmt.Errorf("invalid %s in response", name)
	}
	for i := range value {
		if value[i] < '0' || value[i] > '9' {
			return 0, fmt.Errorf("invalid %s in response", name)
		}
	}
	number, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid %s in response: %w", name, err)
	}
	return number, nil
}

func (c *apiClient) send(ctx context.Context, method, path string, body any) (*http.Response, error) {
	if ctx == nil {
		return nil, errors.New("context must not be nil")
	}
	if c.http == nil {
		return nil, errors.New("client must be initialized with its constructor")
	}
	address := c.base
	address.Path = path
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("encode request: %w", err)
		}
		reader = bytes.NewReader(encoded)
	}
	request, err := http.NewRequestWithContext(ctx, method, address.String(), reader)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+c.token)
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Cache-Control", "no-store")
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := c.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("%s %s: %w", method, address.Redacted(), err)
	}
	return response, nil
}

// graphql selects a single non-null root field. GraphQL failures are reported
// in the response body even when the HTTP request succeeded.
func (c *apiClient) graphql(ctx context.Context, query string, variables any, field string, output any) error {
	response, err := c.send(ctx, http.MethodPost, "/graphql", struct {
		Query     string `json:"query"`
		Variables any    `json:"variables"`
	}{Query: query, Variables: variables})
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		if response.StatusCode >= 200 && response.StatusCode < 300 {
			return &APIError{
				StatusCode: response.StatusCode,
				Code:       "unexpected_status",
				Message:    "unexpected successful HTTP status",
			}
		}
		return decodeAPIError(response)
	}
	data, err := readJSONBody(response.Body)
	if err != nil {
		return fmt.Errorf("read GraphQL response: %w", err)
	}
	var envelope struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message    string `json:"message"`
			Extensions struct {
				Code string `json:"code"`
			} `json:"extensions"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		return invalidGraphQLResponse()
	}
	if len(envelope.Errors) > 0 {
		first := envelope.Errors[0]
		if first.Message == "" || first.Extensions.Code == "" {
			return invalidGraphQLResponse()
		}
		return &APIError{StatusCode: response.StatusCode, Code: first.Extensions.Code, Message: first.Message}
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(envelope.Data, &fields); err != nil || fields == nil {
		return invalidGraphQLResponse()
	}
	raw, found := fields[field]
	if !found || len(raw) == 0 || bytes.Equal(raw, []byte("null")) {
		return invalidGraphQLResponse()
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if err := decoder.Decode(output); err != nil {
		return fmt.Errorf("decode GraphQL %s: %w", field, err)
	}
	return nil
}

func (c *apiClient) graphqlBool(ctx context.Context, query string, variables any, field string) error {
	var success bool
	if err := c.graphql(ctx, query, variables, field, &success); err != nil {
		return err
	}
	if !success {
		return invalidGraphQLResponse()
	}
	return nil
}

func invalidGraphQLResponse() error {
	return &APIError{
		StatusCode: http.StatusOK,
		Code:       "invalid_response",
		Message:    "service returned an invalid GraphQL response",
	}
}

func readJSONBody(body io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(body, maxJSONBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxJSONBytes {
		return nil, fmt.Errorf("JSON response exceeds %d bytes", maxJSONBytes)
	}
	return data, nil
}

func decodeAPIError(response *http.Response) error {
	data, err := readJSONBody(response.Body)
	if err != nil {
		return fmt.Errorf("read HTTP %d error: %w", response.StatusCode, err)
	}
	var envelope struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil ||
		envelope.Error.Code == "" || envelope.Error.Message == "" {
		return &APIError{
			StatusCode: response.StatusCode,
			Code:       "invalid_response",
			Message:    "service returned an invalid error response",
		}
	}
	return &APIError{
		StatusCode: response.StatusCode,
		Code:       envelope.Error.Code,
		Message:    envelope.Error.Message,
	}
}

// NewMessageID generates a random v4 UUID for SendMessageRequest.ClientMessageID.
// Reuse the same ID and body when retrying the same logical send.
func NewMessageID() (string, error) {
	var id [16]byte
	if _, err := rand.Read(id[:]); err != nil {
		return "", fmt.Errorf("generate message ID: %w", err)
	}
	id[6] = id[6]&0x0f | 0x40
	id[8] = id[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", id[0:4], id[4:6], id[6:8], id[8:10], id[10:]), nil
}
