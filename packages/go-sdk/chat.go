package threadwave

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	threadFields  = `id title owner state historyOnJoin historyAfterLeave historyAfterRemove lastSequence`
	memberFields  = `membershipId identityId role state joinedSequence exitedSequence`
	messageFields = `id threadId sequence sender clientMessageId body props createdAt`
)

// UserClient uses only an st_ token for end-user GraphQL operations.
type UserClient struct{ api apiClient }

func NewUserClient(baseURL, sessionToken string, options ...ClientOption) (*UserClient, error) {
	api, err := newClient(baseURL, sessionToken, "st_", options)
	if err != nil {
		return nil, err
	}
	return &UserClient{api: api}, nil
}

type ThreadState string

const (
	ThreadActive   ThreadState = "active"
	ThreadArchived ThreadState = "archived"
)

type ThreadRole string

const (
	ThreadRoleOwner     ThreadRole = "owner"
	ThreadRoleModerator ThreadRole = "moderator"
	ThreadRoleMember    ThreadRole = "member"
	ThreadRoleViewer    ThreadRole = "viewer"
)

type MembershipState string

const (
	MemberInvited MembershipState = "invited"
	MemberActive  MembershipState = "active"
	MemberLeft    MembershipState = "left"
	MemberRemoved MembershipState = "removed"
)

type HistoryOnJoin string

const (
	HistorySinceJoin   HistoryOnJoin = "since_join"
	HistoryAllExisting HistoryOnJoin = "all_existing"
)

type HistoryAfterExit string

const (
	HistoryRevoke            HistoryAfterExit = "revoke"
	HistoryPreviouslyVisible HistoryAfterExit = "previously_visible"
)

type Thread struct {
	ID                 string           `json:"id"`
	Title              string           `json:"title"`
	Owner              string           `json:"owner"`
	State              ThreadState      `json:"state"`
	HistoryOnJoin      HistoryOnJoin    `json:"historyOnJoin"`
	HistoryAfterLeave  HistoryAfterExit `json:"historyAfterLeave"`
	HistoryAfterRemove HistoryAfterExit `json:"historyAfterRemove"`
	LastSequence       int64            `json:"lastSequence,string"`
}

func validateThread(thread Thread) error {
	if validateUUID("thread ID in response", thread.ID) != nil ||
		validateTitle(thread.Title) != nil || validateIdentityID(thread.Owner) != nil ||
		(thread.State != ThreadActive && thread.State != ThreadArchived) ||
		(thread.HistoryOnJoin != HistorySinceJoin && thread.HistoryOnJoin != HistoryAllExisting) ||
		!validHistoryAfterExit(thread.HistoryAfterLeave) ||
		!validHistoryAfterExit(thread.HistoryAfterRemove) || thread.LastSequence < 0 {
		return errors.New("invalid thread in response")
	}
	return nil
}

func validHistoryAfterExit(value HistoryAfterExit) bool {
	return value == HistoryRevoke || value == HistoryPreviouslyVisible
}

type CreateThreadRequest struct {
	Title              string
	Members            []string
	HistoryOnJoin      HistoryOnJoin    // Empty uses since_join.
	HistoryAfterLeave  HistoryAfterExit // Empty uses revoke.
	HistoryAfterRemove HistoryAfterExit // Empty uses revoke.
}

// CreateThread invites the specified identities; invitees must accept before
// reading or participating in the thread.
func (c *UserClient) CreateThread(ctx context.Context, input CreateThreadRequest) (*Thread, error) {
	if err := validateTitle(input.Title); err != nil {
		return nil, err
	}
	if len(input.Members) > 100 {
		return nil, errors.New("at most 100 members including the owner are allowed")
	}
	for _, member := range input.Members {
		if err := validateIdentityID(member); err != nil {
			return nil, err
		}
	}
	if input.HistoryOnJoin != "" && input.HistoryOnJoin != HistorySinceJoin && input.HistoryOnJoin != HistoryAllExisting {
		return nil, errors.New("history on join must be since_join or all_existing")
	}
	for _, policy := range []HistoryAfterExit{input.HistoryAfterLeave, input.HistoryAfterRemove} {
		if policy != "" && !validHistoryAfterExit(policy) {
			return nil, errors.New("history after exit must be revoke or previously_visible")
		}
	}
	variables := map[string]any{"title": input.Title}
	if input.Members != nil {
		variables["members"] = append([]string{}, input.Members...)
	}
	if input.HistoryOnJoin != "" {
		variables["historyOnJoin"] = input.HistoryOnJoin
	}
	if input.HistoryAfterLeave != "" {
		variables["historyAfterLeave"] = input.HistoryAfterLeave
	}
	if input.HistoryAfterRemove != "" {
		variables["historyAfterRemove"] = input.HistoryAfterRemove
	}
	const query = `mutation CreateThread($title:String!,$members:[String!],$historyOnJoin:String,$historyAfterLeave:String,$historyAfterRemove:String){
		createThread(title:$title,members:$members,historyOnJoin:$historyOnJoin,historyAfterLeave:$historyAfterLeave,historyAfterRemove:$historyAfterRemove){` + threadFields + `}}`
	var thread Thread
	if err := c.api.graphql(ctx, query, variables, "createThread", &thread); err != nil {
		return nil, err
	}
	if err := validateThread(thread); err != nil {
		return nil, err
	}
	if thread.Title != input.Title ||
		input.HistoryOnJoin != "" && thread.HistoryOnJoin != input.HistoryOnJoin ||
		input.HistoryAfterLeave != "" && thread.HistoryAfterLeave != input.HistoryAfterLeave ||
		input.HistoryAfterRemove != "" && thread.HistoryAfterRemove != input.HistoryAfterRemove {
		return nil, errors.New("thread response does not match request")
	}
	return &thread, nil
}

func (c *UserClient) GetThread(ctx context.Context, threadID string) (*Thread, error) {
	if err := validateUUID("thread ID", threadID); err != nil {
		return nil, err
	}
	const query = `query Thread($id:ID!){thread(id:$id){` + threadFields + `}}`
	var thread Thread
	if err := c.api.graphql(ctx, query, map[string]any{"id": threadID}, "thread", &thread); err != nil {
		return nil, err
	}
	if err := validateThread(thread); err != nil {
		return nil, err
	}
	if !strings.EqualFold(thread.ID, threadID) {
		return nil, errors.New("thread response ID does not match request")
	}
	return &thread, nil
}

type ListThreadsOptions struct {
	After string // Optional UUID from ThreadPage.NextAfter.
	Limit int    // 0 uses 50; otherwise 1-100.
}

type ThreadPage struct {
	Items     []Thread `json:"items"`
	NextAfter *string  `json:"nextAfter"`
}

func (c *UserClient) ListThreads(ctx context.Context, options ListThreadsOptions) (*ThreadPage, error) {
	if options.After != "" {
		if err := validateUUID("after", options.After); err != nil {
			return nil, err
		}
	}
	limit, err := boundedLimit(options.Limit)
	if err != nil {
		return nil, err
	}
	variables := map[string]any{"limit": limit}
	if options.After != "" {
		variables["after"] = options.After
	}
	const query = `query Threads($after:ID,$limit:Int){threads(after:$after,limit:$limit){items{` + threadFields + `}nextAfter}}`
	var page ThreadPage
	if err := c.api.graphql(ctx, query, variables, "threads", &page); err != nil {
		return nil, err
	}
	if page.Items == nil {
		return nil, errors.New("invalid thread page in response")
	}
	last := strings.ToLower(options.After)
	for _, thread := range page.Items {
		if err := validateThread(thread); err != nil {
			return nil, err
		}
		current := strings.ToLower(thread.ID)
		if current <= last {
			return nil, errors.New("thread page is not ordered after the cursor")
		}
		last = current
	}
	if len(page.Items) == 0 && options.After == "" {
		if page.NextAfter != nil {
			return nil, errors.New("invalid empty thread page cursor")
		}
	} else if page.NextAfter == nil || !strings.EqualFold(*page.NextAfter, last) {
		return nil, errors.New("thread page cursor does not match last thread")
	}
	return &page, nil
}

func boundedLimit(limit int) (int, error) {
	if limit < 0 || limit > 100 {
		return 0, errors.New("limit must be 1-100 (or 0 for default)")
	}
	if limit == 0 {
		limit = 50
	}
	return limit, nil
}

func (c *UserClient) ListThreadInvitations(ctx context.Context, limit int) ([]Thread, error) {
	limit, err := boundedLimit(limit)
	if err != nil {
		return nil, err
	}
	const query = `query ThreadInvitations($limit:Int){threadInvitations(limit:$limit){` + threadFields + `}}`
	var threads []Thread
	if err := c.api.graphql(ctx, query, map[string]any{"limit": limit}, "threadInvitations", &threads); err != nil {
		return nil, err
	}
	if threads == nil {
		return nil, errors.New("invalid thread invitations in response")
	}
	for _, thread := range threads {
		if err := validateThread(thread); err != nil {
			return nil, err
		}
	}
	return threads, nil
}

type ThreadMember struct {
	MembershipID   string          `json:"membershipId"`
	IdentityID     string          `json:"identityId"`
	Role           ThreadRole      `json:"role"`
	State          MembershipState `json:"state"`
	JoinedSequence *int64          `json:"joinedSequence,string"`
	ExitedSequence *int64          `json:"exitedSequence,string"`
}

func validateThreadMember(member ThreadMember) error {
	if validateUUID("membership ID in response", member.MembershipID) != nil ||
		validateIdentityID(member.IdentityID) != nil ||
		(member.Role != ThreadRoleOwner && member.Role != ThreadRoleModerator &&
			member.Role != ThreadRoleMember && member.Role != ThreadRoleViewer) ||
		(member.State != MemberInvited && member.State != MemberActive &&
			member.State != MemberLeft && member.State != MemberRemoved) ||
		member.JoinedSequence != nil && *member.JoinedSequence < 0 ||
		member.ExitedSequence != nil && *member.ExitedSequence < 0 {
		return errors.New("invalid thread member in response")
	}
	return nil
}

func threadVariables(threadID string) (map[string]any, error) {
	if err := validateUUID("thread ID", threadID); err != nil {
		return nil, err
	}
	return map[string]any{"threadId": threadID}, nil
}

func (c *UserClient) ListThreadMembers(ctx context.Context, threadID string) ([]ThreadMember, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	const query = `query ThreadMembers($threadId:ID!){threadMembers(threadId:$threadId){` + memberFields + `}}`
	var members []ThreadMember
	if err := c.api.graphql(ctx, query, variables, "threadMembers", &members); err != nil {
		return nil, err
	}
	if members == nil {
		return nil, errors.New("invalid thread members in response")
	}
	for _, member := range members {
		if err := validateThreadMember(member); err != nil {
			return nil, err
		}
	}
	return members, nil
}

type InviteThreadMemberRequest struct {
	IdentityID string
	Role       ThreadRole // Empty uses member.
}

func (c *UserClient) InviteThreadMember(ctx context.Context, threadID string, input InviteThreadMemberRequest) (*ThreadMember, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	if err := validateIdentityID(input.IdentityID); err != nil {
		return nil, err
	}
	if input.Role != "" && input.Role != ThreadRoleModerator &&
		input.Role != ThreadRoleMember && input.Role != ThreadRoleViewer {
		return nil, errors.New("thread invitation role must be moderator, member or viewer")
	}
	variables["identityId"] = input.IdentityID
	if input.Role != "" {
		variables["role"] = input.Role
	}
	const query = `mutation InviteThreadMember($threadId:ID!,$identityId:ID!,$role:String){
		inviteThreadMember(threadId:$threadId,identityId:$identityId,role:$role){` + memberFields + `}}`
	var member ThreadMember
	if err := c.api.graphql(ctx, query, variables, "inviteThreadMember", &member); err != nil {
		return nil, err
	}
	if err := validateThreadMember(member); err != nil {
		return nil, err
	}
	if member.IdentityID != input.IdentityID || input.Role != "" && member.Role != input.Role {
		return nil, errors.New("thread member response does not match request")
	}
	return &member, nil
}

func (c *UserClient) AcceptThreadInvitation(ctx context.Context, threadID string) (*ThreadMember, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	const query = `mutation AcceptThreadInvitation($threadId:ID!){
		acceptThreadInvitation(threadId:$threadId){` + memberFields + `}}`
	var member ThreadMember
	if err := c.api.graphql(ctx, query, variables, "acceptThreadInvitation", &member); err != nil {
		return nil, err
	}
	if err := validateThreadMember(member); err != nil {
		return nil, err
	}
	if member.State != MemberActive {
		return nil, errors.New("accepted thread invitation is not active")
	}
	return &member, nil
}

func (c *UserClient) LeaveThread(ctx context.Context, threadID string) error {
	variables, err := threadVariables(threadID)
	if err != nil {
		return err
	}
	const query = `mutation LeaveThread($threadId:ID!){leaveThread(threadId:$threadId)}`
	return c.api.graphqlBool(ctx, query, variables, "leaveThread")
}

func (c *UserClient) RemoveThreadMember(ctx context.Context, threadID, identityID string) error {
	variables, err := threadVariables(threadID)
	if err != nil {
		return err
	}
	if err := validateIdentityID(identityID); err != nil {
		return err
	}
	variables["identityId"] = identityID
	const query = `mutation RemoveThreadMember($threadId:ID!,$identityId:ID!){
		removeThreadMember(threadId:$threadId,identityId:$identityId)}`
	return c.api.graphqlBool(ctx, query, variables, "removeThreadMember")
}

func (c *UserClient) ChangeThreadRole(ctx context.Context, threadID, identityID string, role ThreadRole) (*ThreadMember, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	if err := validateIdentityID(identityID); err != nil {
		return nil, err
	}
	if role != ThreadRoleModerator && role != ThreadRoleMember && role != ThreadRoleViewer {
		return nil, errors.New("thread role must be moderator, member or viewer; transfer ownership separately")
	}
	variables["identityId"], variables["role"] = identityID, role
	const query = `mutation ChangeThreadRole($threadId:ID!,$identityId:ID!,$role:String!){
		changeThreadRole(threadId:$threadId,identityId:$identityId,role:$role){` + memberFields + `}}`
	var member ThreadMember
	if err := c.api.graphql(ctx, query, variables, "changeThreadRole", &member); err != nil {
		return nil, err
	}
	if err := validateThreadMember(member); err != nil {
		return nil, err
	}
	if member.IdentityID != identityID || member.Role != role {
		return nil, errors.New("thread role response does not match request")
	}
	return &member, nil
}

func (c *UserClient) TransferThreadOwner(ctx context.Context, threadID, identityID string) (*Thread, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	if err := validateIdentityID(identityID); err != nil {
		return nil, err
	}
	variables["identityId"] = identityID
	const query = `mutation TransferThreadOwner($threadId:ID!,$identityId:ID!){
		transferThreadOwner(threadId:$threadId,identityId:$identityId){` + threadFields + `}}`
	var thread Thread
	if err := c.api.graphql(ctx, query, variables, "transferThreadOwner", &thread); err != nil {
		return nil, err
	}
	if err := validateThread(thread); err != nil {
		return nil, err
	}
	if !strings.EqualFold(thread.ID, threadID) || thread.Owner != identityID {
		return nil, errors.New("thread owner response does not match request")
	}
	return &thread, nil
}

func (c *UserClient) ArchiveThread(ctx context.Context, threadID string) (*Thread, error) {
	return c.setThreadState(ctx, threadID, ThreadArchived)
}

func (c *UserClient) ReopenThread(ctx context.Context, threadID string) (*Thread, error) {
	return c.setThreadState(ctx, threadID, ThreadActive)
}

func (c *UserClient) setThreadState(ctx context.Context, threadID string, state ThreadState) (*Thread, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	field := "archiveThread"
	if state == ThreadActive {
		field = "reopenThread"
	}
	query := `mutation ThreadState($threadId:ID!){` + field + `(threadId:$threadId){` + threadFields + `}}`
	var thread Thread
	if err := c.api.graphql(ctx, query, variables, field, &thread); err != nil {
		return nil, err
	}
	if err := validateThread(thread); err != nil {
		return nil, err
	}
	if !strings.EqualFold(thread.ID, threadID) || thread.State != state {
		return nil, errors.New("thread state response does not match request")
	}
	return &thread, nil
}

type SendMessageRequest struct {
	ClientMessageID string
	Body            string
	Props           map[string]any // Optional JSON object; nil uses {}.
}

type Message struct {
	ID              string         `json:"id"`
	ThreadID        string         `json:"threadId"`
	Sequence        int64          `json:"sequence,string"`
	Sender          string         `json:"sender"`
	ClientMessageID string         `json:"clientMessageId"`
	Body            string         `json:"body"`
	Props           map[string]any `json:"props"`
	CreatedAt       time.Time      `json:"createdAt"`
}

// SendMessage returns the committed message for both first sends and
// idempotent retries. Reuse the same client ID, body, and props on retry.
func (c *UserClient) SendMessage(ctx context.Context, threadID string, input SendMessageRequest) (*Message, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	if err := validateNonNilUUID("client message ID", input.ClientMessageID); err != nil {
		return nil, err
	}
	if err := validateBody(input.Body); err != nil {
		return nil, err
	}
	variables["clientMessageId"], variables["body"] = input.ClientMessageID, input.Body
	if input.Props != nil {
		variables["props"] = input.Props
	}
	const query = `mutation SendMessage($threadId:ID!,$clientMessageId:ID!,$body:String!,$props:JSON){
		sendMessage(threadId:$threadId,clientMessageId:$clientMessageId,body:$body,props:$props){` + messageFields + `}}`
	var message Message
	if err := c.api.graphql(ctx, query, variables, "sendMessage", &message); err != nil {
		return nil, err
	}
	if err := validateMessage(message, threadID); err != nil {
		return nil, err
	}
	if !strings.EqualFold(message.ClientMessageID, input.ClientMessageID) || message.Body != input.Body {
		return nil, errors.New("message response does not match request")
	}
	return &message, nil
}

func validateMessage(message Message, threadID string) error {
	if validateUUID("message ID in response", message.ID) != nil ||
		validateUUID("thread ID in message", message.ThreadID) != nil ||
		validateUUID("client message ID in response", message.ClientMessageID) != nil ||
		!strings.EqualFold(message.ThreadID, threadID) ||
		message.Sequence < 1 || validateIdentityID(message.Sender) != nil ||
		validateBody(message.Body) != nil || message.Props == nil || message.CreatedAt.IsZero() {
		return errors.New("invalid message in response")
	}
	return nil
}

type PageOptions struct {
	After int64 // Last acknowledged sequence; 0 starts at the beginning.
	Limit int   // 0 uses 50; otherwise 1-100.
}

type MessagePage struct {
	Items     []Message `json:"items"`
	NextAfter int64     `json:"nextAfter,string"`
	Cursor    int64     `json:"cursor,string"`
	HasMore   bool      `json:"hasMore"`
}

func (c *UserClient) ListThreadMessages(ctx context.Context, threadID string, options PageOptions) (*MessagePage, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	page, err := pageVariables(options.After, options.Limit)
	if err != nil {
		return nil, err
	}
	for key, value := range page {
		variables[key] = value
	}
	const query = `query ThreadMessages($threadId:ID!,$after:String,$limit:Int){
		threadMessages(threadId:$threadId,after:$after,limit:$limit){
			items{` + messageFields + `}nextAfter cursor hasMore}}`
	var wire struct {
		Items     []Message `json:"items"`
		NextAfter *string   `json:"nextAfter"`
		Cursor    *string   `json:"cursor"`
		HasMore   *bool     `json:"hasMore"`
	}
	if err := c.api.graphql(ctx, query, variables, "threadMessages", &wire); err != nil {
		return nil, err
	}
	if wire.Items == nil || wire.NextAfter == nil || wire.Cursor == nil || wire.HasMore == nil {
		return nil, errors.New("invalid message page in response")
	}
	nextAfter, err := parseSequence("message cursor", *wire.NextAfter)
	if err != nil {
		return nil, err
	}
	cursor, err := parseSequence("message high-water", *wire.Cursor)
	if err != nil {
		return nil, err
	}
	last := options.After
	for _, message := range wire.Items {
		if err := validateMessage(message, threadID); err != nil {
			return nil, err
		}
		if message.Sequence <= last {
			return nil, errors.New("message page is not ordered after the cursor")
		}
		last = message.Sequence
	}
	if nextAfter != last || *wire.HasMore && nextAfter <= options.After {
		return nil, errors.New("message page cursor does not match last sequence")
	}
	return &MessagePage{Items: wire.Items, NextAfter: nextAfter, Cursor: cursor, HasMore: *wire.HasMore}, nil
}

// ListMessages is an alias for ListThreadMessages.
func (c *UserClient) ListMessages(ctx context.Context, threadID string, options PageOptions) (*MessagePage, error) {
	return c.ListThreadMessages(ctx, threadID, options)
}

func (c *UserClient) RevokeSession(ctx context.Context) error {
	const query = `mutation RevokeSession{revokeSession}`
	return c.api.graphqlBool(ctx, query, map[string]any{}, "revokeSession")
}

func validateSequencePage(after, nextAfter, last int64, hasMore bool) error {
	if nextAfter < after || nextAfter < last || hasMore && nextAfter <= after {
		return fmt.Errorf("page cursor is not ordered after the supplied cursor")
	}
	return nil
}
