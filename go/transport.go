package convohop

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/netip"
	"net/url"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	// maxResponseLength bounds an authority response in UTF-16 code units, as
	// every ConvoHop SDK does.
	maxResponseLength = 1 << 20
	// maxResponseBytes is the longest UTF-8 encoding of a bounded response,
	// with a byte order mark.
	maxResponseBytes = 3*maxResponseLength + 3
	// maxCredentialBytes bounds a backend key or management access token.
	maxCredentialBytes = 8192
	// managementIncarnation is the incarnation of management requests, which
	// never send one.
	managementIncarnation = "management"
)

var errOrigin = errors.New("convohop: use an HTTPS origin, or explicit loopback HTTP for local development")

// responseCheck checks a validated reply against the request that produced it.
type responseCheck func(t *transport, requestID string, input map[string]any, reply any) error

type transportConfig struct {
	baseURL     string
	credential  string
	projectID   string
	incarnation string
	management  bool
	storeKey    string
	checks      map[string]responseCheck
	// permitOnly allows an empty credential: the client can send only
	// operations that a delivery permit authorizes.
	permitOnly bool
}

// transport sends generated operations and keeps the mutation recovery
// records of one client.
type transport struct {
	endpoint    string
	credential  string
	projectID   string
	incarnation string
	management  bool
	client      *http.Client
	timeout     time.Duration
	now         func() time.Time
	checks      map[string]responseCheck
	store       RecoveryStore
	storeKey    string

	mu           sync.Mutex
	servingEpoch string
	states       map[string]*RecoveryRecord
	order        []string
	active       map[string]*activeCall

	loadMu  sync.Mutex
	loaded  atomic.Bool
	storeMu sync.Mutex
}

func newTransport(config transportConfig, s *settings) (*transport, error) {
	origin, err := parseOrigin(config.baseURL)
	if err != nil {
		return nil, err
	}
	if !validCredential(config.credential) && !(config.permitOnly && config.credential == "") {
		return nil, errors.New("convohop: the credential must be 1 to 8192 visible ASCII characters")
	}
	return &transport{
		endpoint:    origin + graphQLPath,
		credential:  config.credential,
		projectID:   config.projectID,
		incarnation: config.incarnation,
		management:  config.management,
		client:      s.client,
		timeout:     s.timeout,
		now:         s.now,
		checks:      config.checks,
		store:       s.store,
		storeKey:    "convohop.requests:" + config.storeKey,
		states:      map[string]*RecoveryRecord{},
		active:      map[string]*activeCall{},
	}, nil
}

// parseOrigin returns the serialized origin of an HTTPS URL, or of an HTTP URL
// whose host is a loopback name. The URL has no credentials, path, query or
// fragment.
func parseOrigin(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil || u.Opaque != "" || u.User != nil || u.RawQuery != "" || u.ForceQuery ||
		strings.Contains(raw, "#") || (u.Path != "" && u.Path != "/") || u.RawPath != "" || u.Host == "" {
		return "", errOrigin
	}
	host := u.Hostname()
	if strings.HasPrefix(u.Host, "[") {
		addr, err := netip.ParseAddr(host)
		if err != nil || !addr.Is6() || addr.Zone() != "" {
			return "", errOrigin
		}
		host = "[" + addr.String() + "]"
	} else if addr, err := netip.ParseAddr(host); err == nil {
		if !addr.Is4() {
			return "", errOrigin
		}
		host = addr.String()
	} else {
		host = strings.ToLower(host)
		if host == "" || strings.Trim(host, "abcdefghijklmnopqrstuvwxyz0123456789.-_") != "" {
			return "", errOrigin
		}
	}
	loopback := host == "localhost" || host == "127.0.0.1" || host == "[::1]"
	if u.Scheme != "https" && (u.Scheme != "http" || !loopback) {
		return "", errOrigin
	}
	if text := u.Port(); text != "" {
		port, err := strconv.Atoi(text)
		if err != nil || port > 65535 {
			return "", errOrigin
		}
		if !(u.Scheme == "https" && port == 443) && !(u.Scheme == "http" && port == 80) {
			host += ":" + strconv.Itoa(port)
		}
	}
	return u.Scheme + "://" + host, nil
}

// validCredential reports whether a credential can travel in a bearer header.
func validCredential(credential string) bool {
	if credential == "" || len(credential) > maxCredentialBytes {
		return false
	}
	for i := 0; i < len(credential); i++ {
		if c := credential[i]; c < 0x21 || c > 0x7e {
			return false
		}
	}
	return true
}

func transportUnknown(requestID, message string, cause error) *Problem {
	p := problem(codeTransportUnknown, requestID, OutcomeUnknown, 0, message)
	p.cause = cause
	return p
}

// contextEnded reports a context that ended before anything was sent.
func contextEnded(requestID string, cause error) *Problem {
	p := problem(codeTransportUnknown, requestID, OutcomeRejected, 0, "The context ended before the request was sent")
	p.cause = cause
	return p
}

func (t *transport) clock() int64 { return t.now().UnixMilli() }

// scope is the project a request of op names: the client's project when op
// takes one in its context.
func (t *transport) scope(op *operation) string {
	if _, ok := op.context["projectId"]; ok {
		return t.projectID
	}
	return ""
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func (t *transport) setServingEpoch(epoch string) {
	t.mu.Lock()
	t.servingEpoch = epoch
	t.mu.Unlock()
}

// call sends the operation id and decodes its reply into out, a pointer to
// the generated result pointer.
func (t *transport) call(ctx context.Context, id string, input any, permit any, out any, options []CallOption) error {
	op := catalog.operations[id]
	if op == nil {
		return fmt.Errorf("convohop: unknown operation %s", id)
	}
	var call callSettings
	for _, option := range options {
		if option == nil {
			return invalidRequest("", "A call option is nil")
		}
		option(&call)
	}
	requestID := call.requestID
	if !call.hasID {
		requestID = NewRequestID()
	} else if !isUUID(requestID) {
		return invalidRequest(requestID, "The request ID must be a canonical lowercase nonzero UUID")
	}
	if ctx == nil {
		return invalidRequest(requestID, "A context is required")
	}
	if err := ctx.Err(); err != nil {
		return contextEnded(requestID, err)
	}
	if op.kind != "query" && op.kind != "mutation" {
		return invalidRequest(requestID, "Use graphql-transport-ws for subscriptions")
	}
	in, err := prepareInput(op, input)
	if err != nil {
		return invalidRequest(requestID, "Invalid operation input: "+err.Error())
	}
	if in == nil && op.kind == "mutation" {
		in = map[string]any{}
	}
	proof, err := preparePermit(op, permit)
	if err != nil {
		return invalidRequest(requestID, err.Error())
	}
	if lookedUp, ok := in["requestId"].(string); ok && op.kind == "query" && lookedUp == requestID {
		return invalidRequest(requestID, "A request lookup requires a separate request identity")
	}
	if _, err := t.body(op, in, proof, requestID); err != nil {
		return invalidRequest(requestID, "Invalid operation input: "+err.Error())
	}
	if op.bearer != "" && t.credential == "" {
		return missingCredential(requestID)
	}
	reply, err := t.execute(ctx, op, in, proof, requestID)
	if err != nil {
		return err
	}
	if err := decodeResult(reply, out); err != nil {
		return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Malformed authority response; resolve the original request")
	}
	return nil
}

// decodeResult decodes value into the pointer out, leaving out unchanged on
// failure.
func decodeResult(value any, out any) error {
	target := reflect.ValueOf(out)
	if target.Kind() != reflect.Pointer || target.IsNil() {
		return errors.New("invalid result target")
	}
	fresh := reflect.New(target.Type().Elem())
	if err := decodeInto(value, fresh.Interface()); err != nil {
		return err
	}
	target.Elem().Set(fresh.Elem())
	return nil
}

// preparePermit converts a credential delivery permit, which only permit
// operations take and require.
func preparePermit(op *operation, permit any) (any, error) {
	if isNil(permit) {
		if op.permitField != "" {
			return nil, errors.New("A credential delivery permit is required")
		}
		return nil, nil
	}
	if op.permitField == "" {
		return nil, errors.New("A credential delivery permit is only valid for redemption or acknowledgement")
	}
	value, err := protocolValue(permit)
	if err != nil {
		return nil, errors.New("Invalid credential delivery permit: " + err.Error())
	}
	checked, err := checkInput(value, op.permitType, 0)
	if err != nil {
		return nil, errors.New("Invalid credential delivery permit: " + err.Error())
	}
	return checked, nil
}

// body is the canonical GraphQL request body.
func (t *transport) body(op *operation, input map[string]any, permit any, requestID string) (string, error) {
	scope := map[string]any{"requestId": requestID}
	if _, ok := op.context["projectId"]; ok {
		if t.projectID == "" {
			return "", errors.New("communication operations require an explicit project")
		}
		scope["projectId"] = t.projectID
	}
	if op.permitField != "" && permit != nil {
		scope[op.permitField] = permit
	}
	if _, ok := op.context["incarnation"]; ok && !t.management {
		scope["incarnation"] = t.incarnation
	}
	if _, ok := op.context["observedServingEpoch"]; ok {
		t.mu.Lock()
		epoch := t.servingEpoch
		t.mu.Unlock()
		if epoch != "" {
			scope["observedServingEpoch"] = epoch
		}
	}
	variables := map[string]any{"context": scope}
	if op.input != "" && input != nil {
		variables["input"] = input
	}
	return canonical(map[string]any{"operationName": op.operationName, "query": op.document, "variables": variables})
}

// execute sends a prepared request and checks the reply against it.
func (t *transport) execute(ctx context.Context, op *operation, input map[string]any, permit any, requestID string) (any, error) {
	if err := t.ensureLoaded(ctx, requestID); err != nil {
		return nil, err
	}
	var reply any
	var err error
	if op.kind == "mutation" {
		reply, err = t.mutate(ctx, op, input, permit, requestID, false)
	} else {
		reply, err = t.request(ctx, op, input, permit, requestID)
	}
	if err != nil {
		return nil, err
	}
	if catalog.isResolve(op) {
		err = t.resolved(ctx, op, input, requestID, reply)
	} else {
		err = echoCheck(op, requestID, input, reply)
	}
	if err != nil {
		return nil, err
	}
	if check := t.checks[op.id]; check != nil {
		if err := check(t, requestID, input, reply); err != nil {
			return nil, err
		}
	}
	return reply, nil
}

// request performs one HTTP exchange and returns the validated reply.
func (t *transport) request(ctx context.Context, op *operation, input map[string]any, permit any, requestID string) (any, error) {
	body, err := t.body(op, input, permit, requestID)
	if err != nil {
		return nil, invalidRequest(requestID, "Invalid operation input: "+err.Error())
	}
	ctx, cancel := context.WithTimeout(ctx, t.timeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, t.endpoint, strings.NewReader(body))
	if err != nil {
		return nil, transportUnknown(requestID, "Authority response unavailable; resolve the original request", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if op.bearer != "" {
		request.Header.Set("Authorization", "Bearer "+t.credential)
	}
	response, err := t.client.Do(request)
	if err != nil {
		return nil, transportUnknown(requestID, "Authority response unavailable; resolve the original request", err)
	}
	defer response.Body.Close()
	data, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes+1))
	if err != nil {
		return nil, transportUnknown(requestID, "Incomplete authority response; resolve the original request", err)
	}
	status := response.StatusCode
	if len(data) > maxResponseBytes {
		return nil, problem(codeInvalidResponse, requestID, OutcomeUnknown, status, "Authority response exceeds the bound")
	}
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))
	if utf16Length(data) > maxResponseLength {
		return nil, problem(codeInvalidResponse, requestID, OutcomeUnknown, status, "Authority response exceeds the bound")
	}
	decoded, err := decodeJSON(data)
	if err != nil {
		return nil, problem(codeInvalidResponse, requestID, OutcomeUnknown, status, "Unrecognized authority response")
	}
	return interpret(op, requestID, response, decoded)
}

// interpret turns a decoded GraphQL response into a reply or a [Problem].
func interpret(op *operation, requestID string, response *http.Response, decoded any) (any, error) {
	status := response.StatusCode
	malformed := problem(codeInvalidResponse, requestID, OutcomeUnknown, status, "Malformed authority response; resolve the original request")
	graphql, ok := decoded.(map[string]any)
	if !ok {
		return nil, malformed
	}
	if errs, ok := graphql["errors"].([]any); ok && len(errs) > 0 {
		first, ok := errs[0].(map[string]any)
		if !ok {
			return nil, malformed
		}
		extensions := map[string]any{}
		if raw := first["extensions"]; raw != nil {
			if extensions, ok = raw.(map[string]any); !ok {
				return nil, malformed
			}
		}
		code := stringOr(extensions["code"], string(codeGraphQLError))
		outcome := stringOr(extensions["outcome"], string(OutcomeUnknown))
		message := stringOr(first["message"], "GraphQL rejected the request")
		return nil, authorityProblem(code, requestID, outcome, errorStatus(extensions["status"]), message,
			extensions["retryAfter"], response.Header)
	}
	if status < 200 || status > 299 {
		code := stringOr(graphql["code"], string(codeHTTPFailure))
		outcome := stringOr(graphql["outcome"], string(OutcomeUnknown))
		message := stringOr(graphql["message"], "Authority rejected the request")
		return nil, authorityProblem(code, requestID, outcome, status, message, graphql["retryAfter"], response.Header)
	}
	data, ok := graphql["data"].(map[string]any)
	if !ok {
		return nil, malformed
	}
	raw, present := data[op.field]
	if !present {
		return nil, malformed
	}
	value, err := validateOutput(raw, op.result, 0)
	if err != nil {
		return nil, malformed
	}
	if !op.envelope {
		return value, nil
	}
	envelope, ok := value.(map[string]any)
	if !ok {
		return nil, malformed
	}
	state, _ := envelope["status"].(string)
	if (state != "ok" && state != "committed" && state != "accepted") || !isUUIDValue(envelope["requestId"]) {
		return nil, malformed
	}
	if envelope["requestId"] != requestID {
		return nil, problem(codeInvalidResponse, requestID, OutcomeUnknown, status, "Mismatched authority request identity")
	}
	if op.kind == "mutation" {
		switch state {
		case "committed":
			if _, ok := envelope["replayed"].(bool); !ok || !isUUIDValue(envelope["receiptId"]) || !isTimestamp(envelope["committedAt"]) {
				return nil, malformed
			}
		case "accepted":
			operation, _ := envelope["operation"].(map[string]any)
			if !isUUIDValue(operation["operationId"]) {
				return nil, malformed
			}
		default:
			return nil, malformed
		}
	}
	return envelope, nil
}

func stringOr(value any, fallback string) string {
	if s, ok := value.(string); ok {
		return s
	}
	return fallback
}

// errorStatus is a GraphQL error's status extension, or 503.
func errorStatus(value any) int {
	if number, ok := value.(json.Number); ok {
		if status, ok := safeInteger(number); ok && status >= math.MinInt32 && status <= math.MaxInt32 {
			return int(status)
		}
	}
	return 503
}

func authorityProblem(code, requestID, outcome string, status int, message string, retryAfter any, header http.Header) *Problem {
	p := problem(ErrorCode(code), requestID, Outcome(outcome), status, message)
	p.retryAfter, p.hasRetryAfter = retryDelay(retryAfter)
	if values := header.Values("Retry-After"); !p.hasRetryAfter && len(values) == 1 {
		p.retryAfter, p.hasRetryAfter = retryDelay(values[0])
	}
	return p
}

// retryDelay reads a whole-second delay: a string of 1 to 10 digits or a safe
// non-negative integer. Anything else is ignored.
func retryDelay(value any) (time.Duration, bool) {
	var seconds int64
	switch v := value.(type) {
	case string:
		if v == "" || len(v) > 10 || strings.Trim(v, "0123456789") != "" {
			return 0, false
		}
		seconds, _ = strconv.ParseInt(v, 10, 64)
	case json.Number:
		n, ok := safeInteger(v)
		if !ok || n < 0 {
			return 0, false
		}
		seconds = n
	default:
		return 0, false
	}
	if seconds > int64(math.MaxInt64/time.Second) {
		return math.MaxInt64, true
	}
	return time.Duration(seconds) * time.Second, true
}

// echoCheck requires every subject of a reply to carry the IDs its request
// named.
func echoCheck(op *operation, requestID string, input map[string]any, reply any) error {
	if len(op.echo) == 0 {
		return nil
	}
	subjects := []any{reply}
	for _, segment := range op.subject {
		var next []any
		for _, subject := range subjects {
			record, _ := subject.(map[string]any)
			switch child := record[segment].(type) {
			case nil:
			case []any:
				next = append(next, child...)
			default:
				next = append(next, child)
			}
		}
		subjects = next
	}
	for _, subject := range subjects {
		record, ok := subject.(map[string]any)
		if !ok {
			continue
		}
		for _, field := range op.echo {
			want, ok := input[field].(string)
			got := record[field]
			if ok && got != nil && got != want {
				return mismatch(requestID, op.field+" "+field)
			}
		}
	}
	return nil
}

// resolved checks a request resolution against the looked-up request and
// records settled outcomes.
func (t *transport) resolved(ctx context.Context, op *operation, input map[string]any, requestID string, reply any) error {
	envelope, _ := reply.(map[string]any)
	resolution, ok := envelope["result"].(map[string]any)
	if !ok {
		return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Missing request resolution")
	}
	lookedUp, _ := input["requestId"].(string)
	changed := resolution["requestId"] != lookedUp
	if receipt := resolution["receipt"]; receipt != nil {
		record, ok := receipt.(map[string]any)
		changed = changed || !ok || record["requestId"] != lookedUp
	}
	if changed {
		return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Request resolution identity changed")
	}
	t.mu.Lock()
	state := t.states[lookedUp]
	if state == nil {
		t.mu.Unlock()
		return nil
	}
	if state.ProjectID != t.scope(op) || state.Incarnation != t.incarnation {
		t.mu.Unlock()
		return resolutionRequired(requestID, "Resolve within the original project and incarnation")
	}
	outcome, _ := resolution["state"].(string)
	if outcome != "committed" && outcome != "accepted" {
		t.mu.Unlock()
		return nil
	}
	if state.ResolutionState != "committed" {
		state.ResolutionState = outcome
	}
	state.LastAttemptClassification = "authorityReceipt"
	t.mu.Unlock()
	return t.persist(ctx, lookedUp)
}

// resolve reads the current resolution of a recorded mutation.
func (t *transport) resolve(ctx context.Context, op *operation, requestID string) (map[string]any, error) {
	lookup := catalog.resolveOperation(op)
	if lookup == nil {
		return nil, problem(codeInvalidRequest, requestID, OutcomeUnknown, 400, "The operation's plane has no request lookup")
	}
	reply, err := t.execute(ctx, lookup, map[string]any{"requestId": requestID}, nil, NewRequestID())
	if err != nil {
		return nil, err
	}
	envelope, _ := reply.(map[string]any)
	resolution, ok := envelope["result"].(map[string]any)
	if !ok {
		return nil, problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Missing request resolution")
	}
	return resolution, nil
}
