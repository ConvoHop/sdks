package convohop

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"slices"
	"sync"
)

// maxRecoveryRecords bounds the recovery records a client keeps.
const maxRecoveryRecords = 128

// RecoveryStore persists the mutation recovery records of a client, so a
// restarted process can still resolve or retry its requests. Records hold
// request identity, payload and attempt counts; they never hold credentials.
// Implementations must be safe for concurrent use.
//
// A client reads its key once, on first use, and then replaces the data on
// every change. The key names the project, or the operator for a
// [ManagementClient], so two clients for the same project or operator that
// run at the same time must not use the same store.
type RecoveryStore interface {
	// Load returns the data last stored under key, or no data when nothing
	// is stored.
	Load(ctx context.Context, key string) ([]byte, error)
	// Store replaces the data under key. Return nil only once the data is
	// durable.
	Store(ctx context.Context, key string, data []byte) error
}

// MemoryRecoveryStore is a [RecoveryStore] in process memory. It keeps a
// client's recovery records when you replace the client within one process;
// it does not survive a restart. The zero value is ready to use.
type MemoryRecoveryStore struct {
	mu   sync.Mutex
	data map[string][]byte
}

// NewMemoryRecoveryStore returns an empty [MemoryRecoveryStore].
func NewMemoryRecoveryStore() *MemoryRecoveryStore { return &MemoryRecoveryStore{} }

// Load returns a copy of the data stored under key.
func (s *MemoryRecoveryStore) Load(_ context.Context, key string) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return bytes.Clone(s.data[key]), nil
}

// Store keeps a copy of data under key.
func (s *MemoryRecoveryStore) Store(_ context.Context, key string, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.data == nil {
		s.data = map[string][]byte{}
	}
	s.data[key] = bytes.Clone(data)
	return nil
}

// RecoveryRecord is what a client keeps about a mutation until its outcome is
// known. Times are milliseconds since the Unix epoch.
type RecoveryRecord struct {
	// RequestID identifies the mutation.
	RequestID string `json:"requestId"`
	// Incarnation is the project incarnation the mutation was sent to, or
	// "management" for management mutations.
	Incarnation string `json:"incarnation"`
	// PayloadFingerprint is the SHA-256 digest of the canonical operation,
	// project and input.
	PayloadFingerprint string `json:"payloadFingerprint"`
	// Operation is the operation ID, such as communication.sendMessage.
	Operation string `json:"operation"`
	// ProjectID is the project of a communication mutation.
	ProjectID string `json:"projectId,omitempty"`
	// Input is the input object the mutation sends on every attempt.
	Input map[string]any `json:"input"`
	// FirstSubmittedAt is when the record was created.
	FirstSubmittedAt int64 `json:"firstSubmittedAt"`
	// RetryDeadline is the last time the request may be sent.
	RetryDeadline int64 `json:"retryDeadline"`
	// AttemptCount counts the attempts sent so far.
	AttemptCount int64 `json:"attemptCount"`
	// LastAttemptAt is when the last attempt was sent.
	LastAttemptAt int64 `json:"lastAttemptAt"`
	// LastAttemptClassification describes the last attempt: notSubmitted,
	// submitted, authorityReceipt, an error code or opaqueTransportFailure.
	LastAttemptClassification string `json:"lastAttemptClassification"`
	// ResolutionState is pending before the first attempt, unknown until the
	// authority confirms it, then committed or accepted.
	ResolutionState string `json:"resolutionState"`
	// MediaAdmissionAttempted marks credentials used for native media
	// admission, which must never be issued again.
	MediaAdmissionAttempted bool `json:"mediaAdmissionAttempted,omitempty"`
}

func (r *RecoveryRecord) settled() bool {
	return r.ResolutionState == "committed" || r.ResolutionState == "accepted"
}

func (r *RecoveryRecord) clone() RecoveryRecord {
	copied := *r
	copied.Input, _ = deepCopy(r.Input).(map[string]any)
	return copied
}

// activeCall is a mutation in flight. Calls with its request ID wait for it.
type activeCall struct {
	identity string
	done     chan struct{}
	reply    any
	err      error
}

var errRecoveryRecord = errors.New("invalid recovery record")

// ensureLoaded restores stored recovery records before the first request.
// A failed load sends nothing and is tried again by the next call.
func (t *transport) ensureLoaded(ctx context.Context, requestID string) error {
	if t.store == nil || t.loaded.Load() {
		return nil
	}
	t.loadMu.Lock()
	defer t.loadMu.Unlock()
	if t.loaded.Load() {
		return nil
	}
	data, err := t.store.Load(ctx, t.storeKey)
	if err != nil {
		p := problem(codeRecoveryStorageFailure, requestID, OutcomeRejected, 0, "Recovery storage could not be read; no request was sent")
		p.cause = err
		return p
	}
	if err := t.restore(data); err != nil {
		p := problem(codeRecoveryStorageFailure, requestID, OutcomeRejected, 0, "Recovery storage holds invalid records; no request was sent")
		p.cause = err
		return p
	}
	t.loaded.Store(true)
	return nil
}

// restore adds stored records after checking every field, since a stored
// record can authorize a resend.
func (t *transport) restore(data []byte) error {
	if len(data) == 0 {
		return nil
	}
	decoded, err := decodeJSON(data)
	if err != nil {
		return err
	}
	items, ok := decoded.([]any)
	if !ok || len(items) > maxRecoveryRecords {
		return errors.New("invalid mutation recovery storage")
	}
	restored := make([]*RecoveryRecord, 0, len(items))
	seen := make(map[string]bool, len(items))
	for _, item := range items {
		record, err := restoreRecord(item)
		if err != nil {
			return err
		}
		if seen[record.RequestID] {
			return errors.New("duplicate mutation recovery identity")
		}
		seen[record.RequestID] = true
		restored = append(restored, record)
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	for _, record := range restored {
		if _, exists := t.states[record.RequestID]; !exists {
			t.order = append(t.order, record.RequestID)
		}
		t.states[record.RequestID] = record
	}
	return nil
}

func restoreRecord(item any) (*RecoveryRecord, error) {
	v, ok := item.(map[string]any)
	if !ok {
		return nil, errRecoveryRecord
	}
	name, _ := v["operation"].(string)
	op := catalog.operations[name]
	resolution, _ := v["resolutionState"].(string)
	if op == nil || op.kind != "mutation" ||
		(resolution != "pending" && resolution != "unknown" && resolution != "committed" && resolution != "accepted") {
		return nil, errRecoveryRecord
	}
	_, scoped := op.context["projectId"]
	projectID, hasProject := v["projectId"]
	if hasProject != scoped || (hasProject && !isUUIDValue(projectID)) {
		return nil, errors.New("invalid recovery project scope")
	}
	var clock [4]int64
	for i, key := range []string{"firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt"} {
		number, ok := v[key].(json.Number)
		if !ok {
			return nil, errors.New("invalid recovery clock or count")
		}
		value, ok := safeInteger(number)
		if !ok || value < 0 {
			return nil, errors.New("invalid recovery clock or count")
		}
		clock[i] = value
	}
	media, hasMedia := v["mediaAdmissionAttempted"]
	if hasMedia && media != true {
		return nil, errors.New("invalid native admission marker")
	}
	requestID, _ := v["requestId"].(string)
	incarnation, okIncarnation := v["incarnation"].(string)
	payload, okPayload := v["payloadFingerprint"].(string)
	classification, okClassification := v["lastAttemptClassification"].(string)
	input, okInput := v["input"].(map[string]any)
	if !isUUID(requestID) || !okIncarnation || !okPayload || !okClassification || !okInput {
		return nil, errRecoveryRecord
	}
	project, _ := projectID.(string)
	return &RecoveryRecord{
		RequestID: requestID, Incarnation: incarnation, PayloadFingerprint: payload, Operation: name,
		ProjectID: project, Input: input, FirstSubmittedAt: clock[0], RetryDeadline: clock[1],
		AttemptCount: clock[2], LastAttemptAt: clock[3], LastAttemptClassification: classification,
		ResolutionState: resolution, MediaAdmissionAttempted: hasMedia,
	}, nil
}

// persist stores every record. The failure names requestID and its outcome.
// It ignores ctx cancellation: a record must not be lost because the caller
// stopped waiting.
func (t *transport) persist(ctx context.Context, requestID string) error {
	if t.store == nil {
		return nil
	}
	t.storeMu.Lock()
	defer t.storeMu.Unlock()
	t.mu.Lock()
	data, err := t.snapshot()
	outcome := OutcomeUnknown
	if state := t.states[requestID]; state != nil && state.ResolutionState != "pending" {
		outcome = Outcome(state.ResolutionState)
	}
	t.mu.Unlock()
	if err == nil {
		err = t.store.Store(context.WithoutCancel(ctx), t.storeKey, data)
	}
	if err != nil {
		p := problem(codeRecoveryStorageFailure, requestID, outcome, 0,
			"Recovery storage did not confirm durability; retain the original request and its outcome")
		p.cause = err
		return p
	}
	return nil
}

// snapshot encodes every record in creation order. The caller holds t.mu.
func (t *transport) snapshot() ([]byte, error) {
	records := make([]*RecoveryRecord, 0, len(t.order))
	for _, id := range t.order {
		records = append(records, t.states[id])
	}
	var b bytes.Buffer
	encoder := json.NewEncoder(&b)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(records); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(b.Bytes(), []byte("\n")), nil
}

// records returns copies of the recovery records in creation order.
func (t *transport) records(ctx context.Context) ([]RecoveryRecord, error) {
	if ctx == nil {
		return nil, invalidRequest("", "A context is required")
	}
	if err := t.ensureLoaded(ctx, ""); err != nil {
		return nil, err
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	records := make([]RecoveryRecord, 0, len(t.order))
	for _, id := range t.order {
		records = append(records, t.states[id].clone())
	}
	return records, nil
}

// mutate sends a mutation once its recovery record is stored. Calls that share
// an in-flight request ID share its outcome; a different payload under that ID
// is a conflict.
func (t *transport) mutate(ctx context.Context, op *operation, input map[string]any, permit any, requestID string, retry bool) (any, error) {
	identity, err := canonical(map[string]any{"operation": op.id, "projectId": nullable(t.scope(op)), "input": input, "incarnation": t.incarnation})
	if err != nil {
		return nil, invalidRequest(requestID, "Invalid operation input: "+err.Error())
	}
	t.mu.Lock()
	if active := t.active[requestID]; active != nil {
		t.mu.Unlock()
		if active.identity != identity {
			return nil, idempotencyConflict(requestID)
		}
		select {
		case <-active.done:
			if active.err != nil {
				return nil, active.err
			}
			return deepCopy(active.reply), nil
		case <-ctx.Done():
			return nil, transportUnknown(requestID, "The context ended while the original request was in flight; resolve the original request", ctx.Err())
		}
	}
	call := &activeCall{identity: identity, done: make(chan struct{})}
	t.active[requestID] = call
	t.mu.Unlock()
	call.reply, call.err = t.mutateOnce(ctx, op, input, permit, requestID, retry)
	t.mu.Lock()
	delete(t.active, requestID)
	t.mu.Unlock()
	close(call.done)
	if call.err != nil {
		return nil, call.err
	}
	return deepCopy(call.reply), nil
}

func (t *transport) mutateOnce(ctx context.Context, op *operation, input map[string]any, permit any, requestID string, retry bool) (any, error) {
	scope := t.scope(op)
	hash, err := fingerprint(map[string]any{"operation": op.id, "projectId": nullable(scope), "input": input})
	if err != nil {
		return nil, invalidRequest(requestID, "Invalid operation input: "+err.Error())
	}
	encoded, _ := canonical(input)
	t.mu.Lock()
	state := t.states[requestID]
	if state != nil {
		stored, err := canonical(state.Input)
		if err != nil || state.PayloadFingerprint != hash || state.Incarnation != t.incarnation ||
			state.Operation != op.id || state.ProjectID != scope || stored != encoded {
			t.mu.Unlock()
			return nil, idempotencyConflict(requestID)
		}
	}
	if retry && (state == nil || state.settled() || state.MediaAdmissionAttempted) {
		t.mu.Unlock()
		return nil, resolutionRequired(requestID, "The original request is no longer eligible for resend")
	}
	if state == nil {
		if len(t.states) >= maxRecoveryRecords && !t.evictSettled() {
			t.mu.Unlock()
			return nil, errors.New("convohop: resolve outstanding mutations before creating more")
		}
		now := t.clock()
		copied, _ := deepCopy(input).(map[string]any)
		state = &RecoveryRecord{
			RequestID: requestID, Incarnation: t.incarnation, PayloadFingerprint: hash, Operation: op.id,
			ProjectID: scope, Input: copied, FirstSubmittedAt: now, RetryDeadline: now + int64(op.windowMs),
			LastAttemptAt: now, LastAttemptClassification: "notSubmitted", ResolutionState: "pending",
		}
		t.states[requestID] = state
		t.order = append(t.order, requestID)
		t.mu.Unlock()
		if err := t.persist(ctx, requestID); err != nil {
			return nil, err
		}
	} else {
		t.mu.Unlock()
	}
	return t.submit(ctx, op, state, permit, retry)
}

// evictSettled forgets the oldest settled record that is not in flight. The
// caller holds t.mu.
func (t *transport) evictSettled() bool {
	for i, id := range t.order {
		if t.states[id].settled() && t.active[id] == nil {
			delete(t.states, id)
			t.order = slices.Delete(t.order, i, i+1)
			return true
		}
	}
	return false
}

// submit sends one attempt within the retry budget and records its outcome.
func (t *transport) submit(ctx context.Context, op *operation, state *RecoveryRecord, permit any, retry bool) (any, error) {
	requestID := state.RequestID
	t.mu.Lock()
	if state.Incarnation != t.incarnation {
		t.mu.Unlock()
		return nil, incarnationMismatch(requestID)
	}
	now := t.clock()
	if state.AttemptCount >= int64(op.maxAttempts) || now > state.RetryDeadline || now < state.FirstSubmittedAt || now < state.LastAttemptAt {
		t.mu.Unlock()
		return nil, resolutionRequired(requestID, "Retry budget expired or clock changed; resolve this request read-only")
	}
	state.AttemptCount++
	state.LastAttemptAt = now
	if state.ResolutionState == "pending" {
		state.ResolutionState = "unknown"
	}
	state.LastAttemptClassification = "submitted"
	t.mu.Unlock()
	if err := t.persist(ctx, requestID); err != nil {
		return nil, err
	}
	t.mu.Lock()
	now = t.clock()
	if now > state.RetryDeadline || now < state.FirstSubmittedAt || now < state.LastAttemptAt ||
		(retry && (state.settled() || state.MediaAdmissionAttempted)) {
		t.mu.Unlock()
		return nil, resolutionRequired(requestID, "The original request is no longer eligible for resend")
	}
	input := state.Input
	t.mu.Unlock()
	reply, err := t.request(ctx, op, input, permit, requestID)
	if err != nil {
		classification := "opaqueTransportFailure"
		var p *Problem
		if errors.As(err, &p) {
			classification = string(p.Code)
		}
		t.mu.Lock()
		state.LastAttemptClassification = classification
		t.mu.Unlock()
		if failure := t.persist(ctx, requestID); failure != nil {
			if errors.As(failure, &p) {
				p.cause = errors.Join(p.cause, err)
			}
			return nil, failure
		}
		return nil, err
	}
	outcome := "committed"
	if envelope, ok := reply.(map[string]any); ok && op.envelope {
		outcome, _ = envelope["status"].(string)
	}
	t.mu.Lock()
	if state.ResolutionState != "committed" {
		state.ResolutionState = outcome
	}
	state.LastAttemptClassification = "authorityReceipt"
	t.mu.Unlock()
	if err := t.persist(ctx, requestID); err != nil {
		return nil, err
	}
	return reply, nil
}

// retry resends a recorded mutation whose outcome is unknown, after checking
// that the authority has not observed it, and returns its current resolution.
func (t *transport) retry(ctx context.Context, requestID string) (map[string]any, error) {
	if ctx == nil {
		return nil, invalidRequest(requestID, "A context is required")
	}
	if err := ctx.Err(); err != nil {
		return nil, contextEnded(requestID, err)
	}
	if !isUUID(requestID) {
		return nil, invalidRequest(requestID, "The request ID must be a canonical lowercase nonzero UUID")
	}
	if err := t.ensureLoaded(ctx, requestID); err != nil {
		return nil, err
	}
	t.mu.Lock()
	state := t.states[requestID]
	var record RecoveryRecord
	if state != nil {
		record = state.clone()
	}
	t.mu.Unlock()
	if state == nil {
		return nil, errors.New("convohop: no recovery record exists; do not invent a replacement identity")
	}
	if record.Incarnation != t.incarnation {
		return nil, incarnationMismatch(requestID)
	}
	op := catalog.operations[record.Operation]
	if op.permitField != "" {
		return nil, problem(codeCredentialRequired, requestID, OutcomeUnknown, 409,
			"Delivery permits cannot authorize request lookup; obtain a current permit and submit the same delivery identity explicitly")
	}
	if !op.resolvable {
		return nil, problem(codeInvalidRequest, requestID, OutcomeUnknown, 400,
			"The operation's requests cannot be looked up; send the same request ID and payload again explicitly")
	}
	if t.credential == "" {
		return nil, missingCredential(requestID)
	}
	resolution, err := t.resolve(ctx, op, requestID)
	if err != nil {
		return nil, err
	}
	switch resolution["state"] {
	case "committed", "accepted":
		return resolution, nil
	case "notObservedYet":
	default:
		return nil, problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, "Unknown request resolution state")
	}
	t.mu.Lock()
	observed := state.settled() || state.MediaAdmissionAttempted
	t.mu.Unlock()
	if observed {
		return nil, resolutionRequired(requestID, "Previously observed commit or native admission cannot be retried from absent evidence")
	}
	hash, err := fingerprint(map[string]any{"operation": record.Operation, "projectId": nullable(record.ProjectID), "input": record.Input})
	if err != nil || hash != record.PayloadFingerprint {
		return nil, problem(codeRecoveryStorageFailure, requestID, OutcomeUnknown, 0, "Recovery input fingerprint changed")
	}
	if _, err := t.mutate(ctx, op, record.Input, nil, requestID, true); err != nil {
		return nil, err
	}
	return t.resolve(ctx, op, requestID)
}
