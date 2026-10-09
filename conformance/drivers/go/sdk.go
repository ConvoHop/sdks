package main

// sdk.go is the only file that uses the SDK: retarget the driver here.

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"runtime/debug"
	"slices"
	"time"

	convohop "github.com/ConvoHop/sdks/go"
	"github.com/ConvoHop/sdks/go/webhooks"
)

// modulePath is the SDK module under test.
const modulePath = "github.com/ConvoHop/sdks/go"

// roleList names every role of the protocol, in the order of its messages.
const roleList = "user, backend, management"

// declaredRoles are the roles this driver implements: the Go SDK is a server
// SDK, so it has no user client.
var declaredRoles = []string{"backend", "management"}

// features are the optional protocol features the driver implements. The Go
// SDK has no realtime client.
var features = []string{"recovery.eviction", "recovery.spentBudget", "recovery.storage", "retryAfter", "webhooks.verify"}

func isRole(role string) bool {
	return role == "user" || role == "backend" || role == "management"
}

func declares(role string) bool { return slices.Contains(declaredRoles, role) }

// packages reports the version of the SDK module the driver was built with.
// A module replaced by a directory, as in this repository, is "(devel)".
func packages() map[string]string {
	version := "unknown"
	if info, ok := debug.ReadBuildInfo(); ok {
		version = "(devel)"
		for _, dep := range info.Deps {
			if dep.Path != modulePath {
				continue
			}
			if dep.Replace != nil {
				dep = dep.Replace
			}
			if dep.Version != "" {
				version = dep.Version
			}
		}
	}
	return map[string]string{modulePath: version}
}

// recoveryStore is a named in-memory recovery store; every client created
// with that name shares it.
type recoveryStore = convohop.MemoryRecoveryStore

func newRecoveryStore() *recoveryStore { return convohop.NewMemoryRecoveryStore() }

// client is one SDK client: a backend client or a management client.
type client struct {
	role       string
	project    *convohop.ProjectClient
	management *convohop.ManagementClient
}

// clientSpec is a decoded client.create request. The optional fields are nil
// when absent.
type clientSpec struct {
	role        string
	baseURL     string
	credential  string
	projectID   *string
	incarnation *string
	principalID *string
	actorID     *string
	store       *recoveryStore
}

func required(value *string, name string) (string, error) {
	if value == nil {
		return "", invalid("%s is required for this role", name)
	}
	return *value, nil
}

// newClient constructs an SDK client without network I/O. Constructor
// failures are INVALID_PARAMS.
func newClient(spec clientSpec) (*client, error) {
	var options []convohop.Option
	if spec.store != nil {
		options = append(options, convohop.WithRecoveryStore(spec.store))
	}
	switch spec.role {
	case "backend":
		projectID, err := required(spec.projectID, "projectId")
		if err != nil {
			return nil, err
		}
		incarnation, err := required(spec.incarnation, "incarnation")
		if err != nil {
			return nil, err
		}
		project, err := convohop.NewProjectClient(convohop.ProjectConfig{
			BaseURL: spec.baseURL, ProjectID: projectID, Incarnation: incarnation, BackendKey: spec.credential,
		}, options...)
		if err != nil {
			return nil, &paramsError{message: err.Error()}
		}
		return &client{role: spec.role, project: project}, nil
	case "management":
		actorID, err := required(spec.actorID, "actorId")
		if err != nil {
			return nil, err
		}
		management, err := convohop.NewManagementClient(convohop.ManagementConfig{
			BaseURL: spec.baseURL, AccessToken: spec.credential, ActorID: actorID,
		}, options...)
		if err != nil {
			return nil, &paramsError{message: err.Error()}
		}
		return &client{role: spec.role, management: management}, nil
	}
	return nil, failure("UNSUPPORTED", "This driver does not declare the %s role", spec.role)
}

// call runs a prepared operation.
type call func(ctx context.Context) (any, error)

// operation decodes the arguments of one catalog operation for client C. It
// records decoding failures in p rather than calling the SDK.
type operation[C any] struct {
	name    string
	prepare func(client C, p params) call
}

func names[C any](operations []operation[C]) []string {
	list := make([]string, 0, len(operations))
	for _, op := range operations {
		list = append(list, op.name)
	}
	return list
}

func find[C any](operations []operation[C], name string) (operation[C], bool) {
	for _, op := range operations {
		if op.name == name {
			return op, true
		}
	}
	return operation[C]{}, false
}

func operationNames(role string) []string {
	switch role {
	case "backend":
		return names(backendOperations)
	case "management":
		return names(managementOperations)
	}
	return nil
}

// prepare decodes an operation's arguments. The returned call reports SDK
// failures; the error is a request the driver cannot carry out.
func prepare(target *client, name string, p params) (call, error) {
	var run call
	found := false
	switch target.role {
	case "backend":
		var op operation[*convohop.ProjectClient]
		if op, found = find(backendOperations, name); found {
			run = op.prepare(target.project, p)
		}
	case "management":
		var op operation[*convohop.ManagementClient]
		if op, found = find(managementOperations, name); found {
			run = op.prepare(target.management, p)
		}
	}
	if !found {
		return nil, failure("UNSUPPORTED", "The %s role does not implement %s", target.role, name)
	}
	if err := p.Err(); err != nil {
		return nil, err
	}
	return run, nil
}

// requestOptions carries an optional requestId, which a retry of the same
// logical request reuses.
func requestOptions(p params) []convohop.CallOption {
	if requestID := p.optionalText("requestId"); requestID != nil {
		return []convohop.CallOption{convohop.WithRequestID(*requestID)}
	}
	return nil
}

// message decodes a message that an earlier step returned, as edit and
// delete need its identity and revision.
func message(p params) convohop.Message {
	var current convohop.Message
	if p.Err() != nil {
		return current
	}
	encoded, err := json.Marshal(p.values["message"])
	if err == nil {
		err = json.Unmarshal(encoded, &current)
	}
	if err != nil || current.ConversationID == "" || current.MessageID == "" || current.Revision == "" {
		p.fail(invalid("message is not a valid protocol value"))
	}
	return current
}

// The TypeScript SDK's defaults for arguments the catalog makes optional.
const (
	defaultSessionTTLMs = "900000"
	defaultPageLimit    = 100
)

// errNoResult reports a successful reply without the result an operation
// returns.
var errNoResult = errors.New("the reply has no result")

var backendOperations = []operation[*convohop.ProjectClient]{
	{"route.initialize", func(c *convohop.ProjectClient, _ params) call {
		return func(ctx context.Context) (any, error) { return nil, c.Initialize(ctx) }
	}},
	{"principals.create", func(c *convohop.ProjectClient, p params) call {
		input := convohop.CreatePrincipalRequestInput{ExternalUserID: p.text("externalUserId")}
		return func(ctx context.Context) (any, error) {
			reply, err := c.CreatePrincipal(ctx, input)
			if err != nil {
				return nil, err
			}
			if reply.Result == nil {
				return nil, errNoResult
			}
			return map[string]any{"principalId": reply.Result.PrincipalID}, nil
		}
	}},
	{"sessions.issue", func(c *convohop.ProjectClient, p params) call {
		input := convohop.IssueSessionRequestInput{
			PrincipalID: p.text("principalId"), DeviceID: p.text("deviceId"), RequestedTTLMs: defaultSessionTTLMs,
		}
		if ttl := p.optionalText("requestedTtlMs"); ttl != nil {
			input.RequestedTTLMs = *ttl
		}
		return func(ctx context.Context) (any, error) {
			reply, err := c.IssueSession(ctx, input)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
	{"conversations.create", func(c *convohop.ProjectClient, p params) call {
		fields := p.nested("input", "input")
		input := convohop.CreateConversationRequestInput{
			Title: fields.text("title"), Props: convohop.Properties(fields.record("props", "input.props")),
		}
		for _, member := range fields.entries("members") {
			input.Members = append(input.Members, convohop.MemberInputInput{
				PrincipalID: member.text("principalId"), Role: member.text("role"),
			})
		}
		options := requestOptions(p)
		return func(ctx context.Context) (any, error) {
			reply, err := c.CreateConversation(ctx, input, options...)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
	{"conversations.get", func(c *convohop.ProjectClient, p params) call {
		input := convohop.GetConversationRequestInput{ConversationID: p.text("conversationId")}
		return func(ctx context.Context) (any, error) {
			reply, err := c.GetConversation(ctx, input)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
	{"members.list", func(c *convohop.ProjectClient, p params) call {
		input := convohop.MembersRequestInput{ConversationID: p.text("conversationId"), Limit: defaultPageLimit}
		if limit, ok := p.integer("limit", 1, 100); ok {
			input.Limit = limit
		}
		input.Cursor = p.optionalText("cursor")
		return func(ctx context.Context) (any, error) {
			reply, err := c.Members(ctx, input)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
	{"members.add", func(c *convohop.ProjectClient, p params) call {
		input := convohop.AddMembersInput{ConversationID: p.text("conversationId")}
		for _, member := range p.entries("members") {
			input.Members = append(input.Members, convohop.MemberBatchEntryInput{
				PrincipalID: member.text("principalId"), Role: member.text("role"),
				ExpectedRevision: member.text("expectedRevision"),
			})
		}
		options := requestOptions(p)
		return func(ctx context.Context) (any, error) {
			reply, err := c.AddMembers(ctx, input, options...)
			if err != nil {
				return nil, err
			}
			return reply.Result.Items, nil
		}
	}},
	{"messages.list", func(c *convohop.ProjectClient, p params) call {
		input := convohop.MessagesRequestInput{
			BeforeSequence: p.optionalText("beforeSequence"), ConversationID: p.text("conversationId"),
			Limit: defaultPageLimit, ActAsPrincipalID: p.optionalText("actAs"),
		}
		return func(ctx context.Context) (any, error) {
			reply, err := c.Messages(ctx, input)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
	{"messages.send", func(c *convohop.ProjectClient, p params) call {
		input := convohop.SendMessageRequestInput{
			ConversationID: p.text("conversationId"), Text: p.text("text"), Props: convohop.Properties{},
			ActAsPrincipalID: p.optionalText("actAs"),
		}
		options := requestOptions(p)
		return func(ctx context.Context) (any, error) {
			reply, err := c.SendMessage(ctx, input, options...)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
	{"messages.edit", func(c *convohop.ProjectClient, p params) call {
		current := message(p)
		text := p.text("text")
		input := convohop.EditMessageRequestInput{
			ConversationID: current.ConversationID, MessageID: current.MessageID,
			ExpectedRevision: current.Revision, Text: &text,
		}
		options := requestOptions(p)
		return func(ctx context.Context) (any, error) {
			reply, err := c.EditMessage(ctx, input, options...)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
	{"messages.delete", func(c *convohop.ProjectClient, p params) call {
		current := message(p)
		input := convohop.DeleteMessageRequestInput{
			ConversationID: current.ConversationID, MessageID: current.MessageID, ExpectedRevision: current.Revision,
		}
		options := requestOptions(p)
		return func(ctx context.Context) (any, error) {
			reply, err := c.DeleteMessage(ctx, input, options...)
			if err != nil {
				return nil, err
			}
			return reply.Result, nil
		}
	}},
}

var managementOperations = []operation[*convohop.ManagementClient]{
	{"backendKeys.issue", func(c *convohop.ManagementClient, p params) call {
		input := convohop.IssueBackendKeyRequestInput{
			ProjectID: p.text("projectId"), Name: p.text("name"), Scopes: p.strings("scopes"),
			ExpiresAt: p.text("expiresAt"),
		}
		return func(ctx context.Context) (any, error) { return c.IssueBackendKey(ctx, input) }
	}},
}

// sdkFailure is the language-neutral projection of an SDK failure
// (spec/conformance/driver-protocol.md).
type sdkFailure struct {
	Code         string  `json:"code"`
	Status       *int    `json:"status"`
	Outcome      *string `json:"outcome"`
	RequestID    *string `json:"requestId"`
	RetryAfterMs *int64  `json:"retryAfterMs"`
	Message      string  `json:"message"`
}

func sdkError(err error) sdkFailure {
	var problem *convohop.Problem
	if !errors.As(err, &problem) {
		return sdkFailure{Code: "SDK_ERROR", Message: err.Error()}
	}
	projection := sdkFailure{Code: string(problem.Code), Message: problem.Message}
	// The SDK reports "no authority response" as status 0; the protocol uses null.
	if problem.Status != 0 {
		status := problem.Status
		projection.Status = &status
	}
	if problem.Outcome != "" {
		outcome := string(problem.Outcome)
		projection.Outcome = &outcome
	}
	if problem.RequestID != "" {
		requestID := problem.RequestID
		projection.RequestID = &requestID
	}
	if delay, ok := problem.RetryAfter(); ok {
		milliseconds := delay.Milliseconds()
		projection.RetryAfterMs = &milliseconds
	}
	if projection.Message == "" {
		projection.Message = problem.Error()
	}
	return projection
}

// maxDateSeconds is the latest instant JavaScript's Date represents, which
// bounds nowSeconds in every driver.
const maxDateSeconds = 8_640_000_000_000

// maxToleranceSeconds is the largest tolerance a time.Duration holds. The
// protocol allows up to 2^53-1 seconds; the driver refuses what Go cannot
// represent rather than shorten it.
const maxToleranceSeconds = math.MaxInt64 / int64(time.Second)

type webhookVerdict struct {
	Valid bool    `json:"valid"`
	Code  *string `json:"code"`
}

// webhookCode projects the SDK's finer codes onto the protocol's. Size limits
// are the sender's contract, so a delivery beyond them cannot carry a valid
// signature.
func webhookCode(code webhooks.Code) (string, error) {
	switch code {
	case webhooks.CodeMissingHeader, webhooks.CodeInvalidHeader:
		return "WEBHOOK_HEADERS_MISSING", nil
	case webhooks.CodeInvalidTimestamp:
		return "WEBHOOK_TIMESTAMP_INVALID", nil
	case webhooks.CodeTimestampExpired:
		return "WEBHOOK_TIMESTAMP_EXPIRED", nil
	case webhooks.CodeTimestampFuture:
		return "WEBHOOK_TIMESTAMP_FUTURE", nil
	case webhooks.CodeBodyTooLarge, webhooks.CodeTooManySignatures, webhooks.CodeNoMatchingSignature:
		return "WEBHOOK_SIGNATURE_INVALID", nil
	case webhooks.CodeInvalidSecret:
		return "", invalid("secrets must be whsec_ secrets")
	}
	return "", failure("DRIVER_FAILURE", "Signature verification failed with %s", code)
}

// verifyWebhook verifies one delivery's signature with the SDK
// (driver-protocol.md, webhooks.verify).
func verifyWebhook(p params) (any, error) {
	headers := p.textRecord("headers")
	secrets := p.strings("secrets")
	if err := p.Err(); err != nil {
		return nil, err
	}
	if len(secrets) == 0 {
		return nil, invalid("secrets must not be empty")
	}
	now, hasNow := p.integer("nowSeconds", 0, maxDateSeconds)
	tolerance, hasTolerance := p.integer("toleranceSeconds", 0, maxToleranceSeconds)
	if err := p.Err(); err != nil {
		return nil, err
	}
	if !hasNow || !hasTolerance {
		return nil, invalid("nowSeconds and toleranceSeconds are required")
	}
	payload := p.text("payload")
	if err := p.Err(); err != nil {
		return nil, err
	}
	// Keep each name's case: the SDK matches header names case-insensitively.
	header := http.Header{}
	for name, value := range headers {
		header[name] = []string{value}
	}
	_, err := webhooks.VerifySignature([]byte(payload), header, secrets,
		webhooks.WithClock(func() time.Time { return time.Unix(now, 0) }),
		webhooks.WithTolerance(time.Duration(tolerance)*time.Second))
	if err == nil {
		return webhookVerdict{Valid: true}, nil
	}
	var rejection *webhooks.Error
	if !errors.As(err, &rejection) {
		return nil, err
	}
	code, err := webhookCode(rejection.Code)
	if err != nil {
		return nil, err
	}
	return webhookVerdict{Code: &code}, nil
}
