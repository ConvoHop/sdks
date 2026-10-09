package convohop

import (
	"context"
	"errors"
	"math/big"
	"slices"
)

// ProjectConfig configures a [ProjectClient].
type ProjectConfig struct {
	// BaseURL is the authority origin, such as https://api.example.com. HTTP
	// is accepted only for localhost, 127.0.0.1 and [::1].
	BaseURL string
	// ProjectID is the project the client calls, a canonical lowercase UUID.
	ProjectID string
	// Incarnation is the project incarnation the client expects, a canonical
	// lowercase UUID. A restored or recreated project has a new incarnation,
	// and requests for the old one fail with INCARNATION_MISMATCH.
	Incarnation string
	// BackendKey is a backend key of the project. Keep it in trusted server
	// runtimes; never ship it to a browser or a mobile app. Leave it empty
	// only for a client that redeems and acknowledges credential deliveries,
	// which a delivery permit authorizes. Every other method of such a client
	// fails with UNAUTHENTICATED and sends nothing.
	BackendKey string
}

// NewProjectClient returns a client for the communication plane of one
// project. It sends nothing until a method is called.
func NewProjectClient(config ProjectConfig, options ...Option) (*ProjectClient, error) {
	if !isUUID(config.ProjectID) || !isUUID(config.Incarnation) {
		return nil, errors.New("convohop: the project ID and incarnation must be canonical lowercase UUIDs")
	}
	s, err := newSettings(options)
	if err != nil {
		return nil, err
	}
	t, err := newTransport(transportConfig{
		baseURL:     config.BaseURL,
		credential:  config.BackendKey,
		projectID:   config.ProjectID,
		incarnation: config.Incarnation,
		storeKey:    "backend:" + config.ProjectID,
		checks:      projectChecks,
		permitOnly:  config.BackendKey == "",
	}, s)
	if err != nil {
		return nil, err
	}
	return &ProjectClient{t: t}, nil
}

// Initialize reads the project route and checks that it names the configured
// project and incarnation. Later communication requests report the serving
// epoch it read. Call it after creating the client, and again to observe a
// newer epoch.
func (c *ProjectClient) Initialize(ctx context.Context, options ...CallOption) error {
	reply, err := c.Route(ctx, options...)
	if err != nil {
		return err
	}
	route := reply.Result
	if route == nil {
		return problem(codeInvalidResponse, reply.RequestID, OutcomeUnknown, 503, "Missing project route")
	}
	if route["projectId"] != c.t.projectID || route["incarnation"] != c.t.incarnation {
		return problem(codeIncarnationMismatch, reply.RequestID, OutcomeUnknown, 409, "Project incarnation changed; explicit recovery is required")
	}
	epoch, _ := route["servingEpoch"].(string)
	if !isCounter(epoch) {
		return problem(codeInvalidResponse, reply.RequestID, OutcomeUnknown, 503, "Invalid project serving epoch")
	}
	c.t.setServingEpoch(epoch)
	return nil
}

// Retry settles a mutation this client recorded with an unknown outcome. It
// reads the request's resolution and returns it once the authority has
// observed the request. Otherwise it sends the request again with its original
// request ID and payload, within the operation's retry budget, and returns the
// resolution read afterwards. It never sends a request under a new identity.
// It fails with a plain error, not a [*Problem], when the client has no
// record of requestID.
func (c *ProjectClient) Retry(ctx context.Context, requestID string) (*RequestResolution, error) {
	return retryResolution(ctx, c.t, requestID)
}

// RecoveryRecords returns copies of the client's recovery records, oldest
// first.
func (c *ProjectClient) RecoveryRecords(ctx context.Context) ([]RecoveryRecord, error) {
	return c.t.records(ctx)
}

func retryResolution(ctx context.Context, t *transport, requestID string) (*RequestResolution, error) {
	resolution, err := t.retry(ctx, requestID)
	if err != nil {
		return nil, err
	}
	var out *RequestResolution
	if err := decodeResult(resolution, &out); err != nil {
		return nil, problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Malformed request resolution")
	}
	return out, nil
}

// projectChecks hold the response checks that the generated echo of request
// IDs does not cover.
var projectChecks = map[string]responseCheck{
	"communication.createPrincipal":        checkPrincipal,
	"communication.issueSession":           checkSession,
	"communication.renewSession":           checkSession,
	"communication.sendMessage":            checkSend,
	"communication.inbox":                  checkInbox,
	"communication.search":                 checkSearch,
	"communication.addMembers":             checkMemberBatch,
	"communication.setBroadcastPermission": checkBroadcastPermission,
	"communication.conversationMute":       checkMute,
	"communication.setConversationMute":    checkMute,
	"communication.sessionRequestOutcome":  checkSessionOutcome,
}

// field walks path through decoded objects.
func field(value any, path ...string) any {
	for _, key := range path {
		record, ok := value.(map[string]any)
		if !ok {
			return nil
		}
		value = record[key]
	}
	return value
}

// resultItems returns the items of a page reply.
func resultItems(reply any) []map[string]any {
	list, _ := field(reply, "result", "items").([]any)
	items := make([]map[string]any, 0, len(list))
	for _, item := range list {
		if record, ok := item.(map[string]any); ok {
			items = append(items, record)
		}
	}
	return items
}

func checkPrincipal(_ *transport, requestID string, input map[string]any, reply any) error {
	if principal, ok := field(reply, "result").(map[string]any); ok && principal["externalUserId"] != input["externalUserId"] {
		return mismatch(requestID, "Principal")
	}
	return nil
}

// checkSession requires an issued or renewed session for the requested
// principal, device and session, in the client's incarnation.
func checkSession(t *transport, requestID string, input map[string]any, reply any) error {
	bootstrap, ok := field(reply, "result").(map[string]any)
	if !ok {
		return nil
	}
	session, ok := bootstrap["session"].(map[string]any)
	if !ok || session["principalId"] != input["principalId"] || session["deviceId"] != input["deviceId"] ||
		session["incarnation"] != t.incarnation {
		return mismatch(requestID, "Session")
	}
	if sessionID, renew := input["sessionId"]; renew && session["sessionId"] != sessionID {
		return mismatch(requestID, "Session")
	}
	return nil
}

// checkSend requires a sent message whose cursor names its conversation,
// sequence and the client's incarnation.
func checkSend(t *transport, requestID string, input map[string]any, reply any) error {
	receipt, ok := field(reply, "result").(map[string]any)
	if !ok {
		return nil
	}
	cursor, _ := receipt["cursor"].(map[string]any)
	conversationID := input["conversationId"]
	if receipt["status"] != "sent" || receipt["conversationId"] != conversationID || cursor == nil ||
		!isUUIDValue(cursor["incarnation"]) || !isUUIDValue(cursor["conversationId"]) || !isCounter(cursor["sequence"]) ||
		cursor["conversationId"] != conversationID || cursor["sequence"] != receipt["sequence"] ||
		cursor["incarnation"] != t.incarnation {
		return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Invalid send receipt scope")
	}
	return nil
}

func checkInbox(_ *transport, requestID string, _ map[string]any, reply any) error {
	for _, item := range resultItems(reply) {
		if latest, ok := item["latestVisibleMessage"].(map[string]any); ok && latest["conversationId"] != item["conversationId"] {
			return mismatch(requestID, "Inbox item")
		}
	}
	return nil
}

// checkSearch requires every hit to carry a message of its conversation, and
// a scoped search to stay in its conversations.
func checkSearch(_ *transport, requestID string, input map[string]any, reply any) error {
	scope, scoped := field(input, "scope", "conversationIds").([]any)
	for _, hit := range resultItems(reply) {
		message, ok := hit["message"].(map[string]any)
		if !ok || message["conversationId"] != hit["conversationId"] {
			return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Search hit conversation scope does not match its message")
		}
		if scoped && !slices.Contains(scope, hit["conversationId"]) {
			return mismatch(requestID, "Search hit")
		}
	}
	return nil
}

// checkMemberBatch requires one membership of the conversation for each
// requested principal.
func checkMemberBatch(_ *transport, requestID string, input map[string]any, reply any) error {
	batch, ok := field(reply, "result").(map[string]any)
	if !ok {
		return nil
	}
	requested, _ := input["members"].([]any)
	items, _ := batch["items"].([]any)
	if len(items) != len(requested) {
		return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Invalid membership batch result")
	}
	principals := make(map[string]bool, len(requested))
	for _, entry := range requested {
		principal, _ := field(entry, "principalId").(string)
		principals[principal] = true
	}
	for _, item := range items {
		principal, _ := field(item, "principalId").(string)
		if field(item, "conversationId") != input["conversationId"] || !principals[principal] {
			return mismatch(requestID, "Membership batch")
		}
		delete(principals, principal)
	}
	return nil
}

func checkBroadcastPermission(_ *transport, requestID string, input map[string]any, reply any) error {
	member, ok := field(reply, "result", "member").(map[string]any)
	if ok && (member["principalId"] != input["principalId"] || member["conversationId"] != input["conversationId"]) {
		return mismatch(requestID, "Member")
	}
	return nil
}

// checkMute requires the mute of the member the request acted as.
func checkMute(_ *transport, requestID string, input map[string]any, reply any) error {
	if mute, ok := field(reply, "result").(map[string]any); ok && mute["principalId"] != input["actAsPrincipalId"] {
		return mismatch(requestID, "Mute")
	}
	return nil
}

var (
	outcomeProofFields   = []string{"status", "requestId", "serverTime", "result"}
	outcomeDetailFields  = []string{"operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState"}
	outcomeResultFields  = append([]string{"state", "requestId", "checkedAt"}, outcomeDetailFields...)
	outcomeSessionFields = []string{"sessionId", "principalId", "deviceId", "incarnation", "sessionRevision", "expiresAt", "status"}
	sessionIdentity      = []string{"sessionId", "principalId", "deviceId", "incarnation"}
)

// checkSessionOutcome accepts only session request outcomes consistent with
// the original request this client recorded, if any.
func checkSessionOutcome(t *transport, requestID string, input map[string]any, reply any) error {
	lookedUp, _ := input["requestId"].(string)
	if !t.sessionOutcome(lookedUp, reply) {
		return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503,
			"Malformed session request outcome; retain the original request and payload")
	}
	return nil
}

// exactFields returns value as an object with exactly the given fields.
func exactFields(value any, fields []string) (map[string]any, bool) {
	record, ok := value.(map[string]any)
	if !ok || len(record) != len(fields) {
		return nil, false
	}
	for _, name := range fields {
		if _, ok := record[name]; !ok {
			return nil, false
		}
	}
	return record, true
}

func (t *transport) sessionOutcome(lookedUp string, reply any) bool {
	proof, ok := exactFields(reply, outcomeProofFields)
	if !ok || proof["status"] != "ok" || !isTimestamp(proof["serverTime"]) {
		return false
	}
	value, ok := exactFields(proof["result"], outcomeResultFields)
	if !ok || value["requestId"] != lookedUp || !isTimestamp(value["checkedAt"]) {
		return false
	}
	var custody *RecoveryRecord
	t.mu.Lock()
	if state := t.states[lookedUp]; state != nil {
		record := state.clone()
		custody = &record
	}
	t.mu.Unlock()
	if custody != nil && (custody.ProjectID != t.projectID || custody.Incarnation != t.incarnation ||
		(custody.Operation != "communication.issueSession" && custody.Operation != "communication.renewSession")) {
		return false
	}
	if value["state"] == "notObservedYet" {
		for _, name := range outcomeDetailFields {
			if value[name] != nil {
				return false
			}
		}
		return true
	}
	operation, _ := value["operation"].(string)
	if value["state"] != "committed" || (operation != "issueSession" && operation != "renewSession") ||
		(custody != nil && custody.Operation != "communication."+operation) {
		return false
	}
	original, ok := t.outcomeSession(value["originalSession"])
	if !ok || original["status"] != "active" {
		return false
	}
	if custody != nil {
		in := custody.Input
		if in["principalId"] != original["principalId"] || in["deviceId"] != original["deviceId"] {
			return false
		}
		if operation == "renewSession" {
			expected, _ := in["expectedRevision"].(string)
			if in["sessionId"] != original["sessionId"] || !isCounter(expected) || !follows(original["sessionRevision"].(string), expected) {
				return false
			}
		}
	}
	if !isUUIDValue(value["receiptId"]) || !isTimestamp(value["committedAt"]) {
		return false
	}
	state := value["currentState"]
	if state == "missing" {
		return value["currentSession"] == nil
	}
	if state != "active" && state != "expired" && state != "revoked" {
		return false
	}
	current, ok := t.outcomeSession(value["currentSession"])
	if !ok || current["status"] != state {
		return false
	}
	for _, name := range sessionIdentity {
		if current[name] != original[name] {
			return false
		}
	}
	order := compareDecimal(current["sessionRevision"].(string), original["sessionRevision"].(string))
	return order > 0 || (order == 0 && current["expiresAt"] == original["expiresAt"])
}

// outcomeSession returns a session of a session request outcome: a session of
// the client's incarnation with a positive revision.
func (t *transport) outcomeSession(value any) (map[string]any, bool) {
	session, ok := exactFields(value, outcomeSessionFields)
	if !ok {
		return nil, false
	}
	for _, name := range sessionIdentity {
		if !isUUIDValue(session[name]) {
			return nil, false
		}
	}
	revision, _ := session["sessionRevision"].(string)
	if session["incarnation"] != t.incarnation || !isCounter(revision) || revision == "0" || !isTimestamp(session["expiresAt"]) {
		return nil, false
	}
	return session, true
}

// follows reports whether the counter next is one more than previous.
func follows(next, previous string) bool {
	a, okA := new(big.Int).SetString(previous, 10)
	b, okB := new(big.Int).SetString(next, 10)
	return okA && okB && a.Add(a, big.NewInt(1)).Cmp(b) == 0
}
