package convohop

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

const mediaFields = `id projectId threadId mode kind owner title audience state`

type MediaKind string

const (
	MediaCall      MediaKind = "call"
	MediaBroadcast MediaKind = "broadcast"
)

type CallMode string

const (
	CallAudio CallMode = "audio"
	CallVideo CallMode = "video"
)

func validCallMode(mode CallMode) bool {
	return mode == CallAudio || mode == CallVideo
}

type AudiencePolicy string

const (
	AudienceMembers AudiencePolicy = "members"
	AudienceProject AudiencePolicy = "project"
)

type MediaState string

const (
	MediaRequested MediaState = "requested"
	MediaStarting  MediaState = "starting"
	MediaLive      MediaState = "live"
	MediaStopping  MediaState = "stopping"
	MediaEnded     MediaState = "ended"
	MediaFailed    MediaState = "failed"
)

type MediaRole string

const (
	RoleOwner     MediaRole = "owner"
	RolePublisher MediaRole = "publisher"
	RoleViewer    MediaRole = "viewer"
)

func validMediaRole(role MediaRole) bool {
	return role == RoleOwner || role == RolePublisher || role == RoleViewer
}

type MediaSession struct {
	ID        string         `json:"id"`
	ProjectID string         `json:"projectId"`
	ThreadID  *string        `json:"threadId"` // Present for calls only.
	Mode      *CallMode      `json:"mode"`     // Present for calls only.
	Kind      MediaKind      `json:"kind"`
	Owner     string         `json:"owner"`
	Title     string         `json:"title"`
	Audience  AudiencePolicy `json:"audience"`
	State     MediaState     `json:"state"`
}

func validateMediaSession(session MediaSession) error {
	if validateUUID("media ID in response", session.ID) != nil ||
		validateUUID("project ID in response", session.ProjectID) != nil ||
		validateIdentityID(session.Owner) != nil || validateTitle(session.Title) != nil ||
		(session.Audience != AudienceMembers && session.Audience != AudienceProject) {
		return errors.New("invalid media session in response")
	}
	switch session.State {
	case MediaRequested, MediaStarting, MediaLive, MediaStopping, MediaEnded, MediaFailed:
	default:
		return errors.New("invalid media state in response")
	}
	switch session.Kind {
	case MediaCall:
		if session.ThreadID == nil || validateUUID("thread ID in call", *session.ThreadID) != nil ||
			session.Mode == nil || !validCallMode(*session.Mode) || session.Audience != AudienceMembers {
			return errors.New("invalid call thread or mode in response")
		}
	case MediaBroadcast:
		if session.ThreadID != nil || session.Mode != nil {
			return errors.New("broadcast has a call thread or mode in response")
		}
	default:
		return errors.New("invalid media kind in response")
	}
	return nil
}

type CreateCallRequest struct {
	ThreadID   string
	Title      string
	Mode       CallMode
	Publishers []string
}

type CreateBroadcastRequest struct {
	Title      string
	Publishers []string
	Audience   AudiencePolicy // Empty uses members.
}

func validatePublishers(publishers []string) error {
	if len(publishers) > 100 {
		return errors.New("at most 100 stage members are allowed")
	}
	for _, publisher := range publishers {
		if err := validateIdentityID(publisher); err != nil {
			return err
		}
	}
	return nil
}

// CreateCall provisions an audio or video call attached to an active thread.
// Publishing tracks still requires a separate LiveKit client.
func (c *UserClient) CreateCall(ctx context.Context, input CreateCallRequest) (*MediaSession, error) {
	if err := validateUUID("thread ID", input.ThreadID); err != nil {
		return nil, err
	}
	if err := validateTitle(input.Title); err != nil {
		return nil, err
	}
	if !validCallMode(input.Mode) {
		return nil, errors.New("call mode must be audio or video")
	}
	if err := validatePublishers(input.Publishers); err != nil {
		return nil, err
	}
	variables := map[string]any{
		"threadId": input.ThreadID, "title": input.Title, "mode": input.Mode,
	}
	if input.Publishers != nil {
		variables["publishers"] = append([]string{}, input.Publishers...)
	}
	const query = `mutation CreateCall($threadId:ID!,$title:String!,$mode:String!,$publishers:[ID!]){
		createCall(threadId:$threadId,title:$title,mode:$mode,publishers:$publishers){` + mediaFields + `}}`
	var result MediaSession
	if err := c.api.graphql(ctx, query, variables, "createCall", &result); err != nil {
		return nil, err
	}
	if err := validateMediaSession(result); err != nil {
		return nil, err
	}
	if result.Kind != MediaCall || result.Title != input.Title ||
		!strings.EqualFold(*result.ThreadID, input.ThreadID) || *result.Mode != input.Mode {
		return nil, errors.New("call response does not match request")
	}
	return &result, nil
}

func (c *UserClient) CreateBroadcast(ctx context.Context, input CreateBroadcastRequest) (*MediaSession, error) {
	if err := validateTitle(input.Title); err != nil {
		return nil, err
	}
	if err := validatePublishers(input.Publishers); err != nil {
		return nil, err
	}
	audience := input.Audience
	if audience == "" {
		audience = AudienceMembers
	}
	if audience != AudienceMembers && audience != AudienceProject {
		return nil, errors.New("audience must be members or project")
	}
	variables := map[string]any{"title": input.Title, "audience": audience}
	if input.Publishers != nil {
		variables["publishers"] = append([]string{}, input.Publishers...)
	}
	const query = `mutation CreateBroadcast($title:String!,$publishers:[ID!],$audience:String){
		createBroadcast(title:$title,publishers:$publishers,audience:$audience){` + mediaFields + `}}`
	var result MediaSession
	if err := c.api.graphql(ctx, query, variables, "createBroadcast", &result); err != nil {
		return nil, err
	}
	if err := validateMediaSession(result); err != nil {
		return nil, err
	}
	if result.Kind != MediaBroadcast || result.Title != input.Title || result.Audience != audience {
		return nil, errors.New("broadcast response does not match request")
	}
	return &result, nil
}

func mediaVariables(mediaID string) (map[string]any, error) {
	if err := validateUUID("media ID", mediaID); err != nil {
		return nil, err
	}
	return map[string]any{"id": mediaID}, nil
}

func (c *UserClient) GetMedia(ctx context.Context, mediaID string) (*MediaSession, error) {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return nil, err
	}
	const query = `query MediaSession($id:ID!){mediaSession(id:$id){` + mediaFields + `}}`
	var result MediaSession
	if err := c.api.graphql(ctx, query, variables, "mediaSession", &result); err != nil {
		return nil, err
	}
	if err := validateMediaSession(result); err != nil {
		return nil, err
	}
	if !strings.EqualFold(result.ID, mediaID) {
		return nil, errors.New("media response ID does not match request")
	}
	return &result, nil
}

// StartMedia returns the current state. A broadcast may still be starting;
// poll GetMedia for live before attempting HLS playback.
func (c *UserClient) StartMedia(ctx context.Context, mediaID string) (*MediaSession, error) {
	return c.transitionMedia(ctx, mediaID, "startMedia")
}

func (c *UserClient) StopMedia(ctx context.Context, mediaID string) (*MediaSession, error) {
	return c.transitionMedia(ctx, mediaID, "stopMedia")
}

func (c *UserClient) transitionMedia(ctx context.Context, mediaID, field string) (*MediaSession, error) {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return nil, err
	}
	query := `mutation MediaTransition($id:ID!){` + field + `(id:$id){` + mediaFields + `}}`
	var result MediaSession
	if err := c.api.graphql(ctx, query, variables, field, &result); err != nil {
		return nil, err
	}
	if err := validateMediaSession(result); err != nil {
		return nil, err
	}
	if !strings.EqualFold(result.ID, mediaID) {
		return nil, errors.New("media response ID does not match request")
	}
	return &result, nil
}

type MediaMember struct {
	IdentityID string    `json:"identityId"`
	Role       MediaRole `json:"role"`
}

// MediaMembers retains the Items wrapper for the Go API; GraphQL returns an
// array directly rather than an object containing items.
type MediaMembers struct {
	Items []MediaMember
}

func (c *UserClient) ListMediaMembers(ctx context.Context, mediaID string) (*MediaMembers, error) {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return nil, err
	}
	const query = `query MediaMembers($id:ID!){mediaMembers(id:$id){identityId role}}`
	var members []MediaMember
	if err := c.api.graphql(ctx, query, variables, "mediaMembers", &members); err != nil {
		return nil, err
	}
	if members == nil {
		return nil, errors.New("invalid media members in response")
	}
	for _, member := range members {
		if validateIdentityID(member.IdentityID) != nil || !validMediaRole(member.Role) {
			return nil, errors.New("invalid media member in response")
		}
	}
	return &MediaMembers{Items: members}, nil
}

type SetMediaMemberRequest struct {
	IdentityID string
	Role       MediaRole
}

func (c *UserClient) SetMediaMember(ctx context.Context, mediaID string, input SetMediaMemberRequest) error {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return err
	}
	if err := validateIdentityID(input.IdentityID); err != nil {
		return err
	}
	if input.Role != RolePublisher && input.Role != RoleViewer {
		return errors.New("media member role must be publisher or viewer")
	}
	variables["identityId"], variables["role"] = input.IdentityID, input.Role
	const query = `mutation SetMediaMember($id:ID!,$identityId:ID!,$role:String!){
		setMediaMember(id:$id,identityId:$identityId,role:$role)}`
	return c.api.graphqlBool(ctx, query, variables, "setMediaMember")
}

func (c *UserClient) RemoveMediaMember(ctx context.Context, mediaID, identityID string) error {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return err
	}
	if err := validateIdentityID(identityID); err != nil {
		return err
	}
	variables["identityId"] = identityID
	const query = `mutation RemoveMediaMember($id:ID!,$identityId:ID!){
		removeMediaMember(id:$id,identityId:$identityId)}`
	return c.api.graphqlBool(ctx, query, variables, "removeMediaMember")
}

type JoinMediaRequest struct {
	RenewParticipantID string // Optional ID from a previous JoinMedia grant.
}

type JoinCredential struct {
	ParticipantID string    `json:"participantId"`
	ServerURL     string    `json:"serverUrl"`
	Token         string    `json:"token"`
	ExpiresAt     time.Time `json:"expiresAt"`
}

// JoinMedia obtains a short-lived LiveKit grant, not proof of connection.
func (c *UserClient) JoinMedia(ctx context.Context, mediaID string, input JoinMediaRequest) (*JoinCredential, error) {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return nil, err
	}
	if input.RenewParticipantID != "" {
		if err := validateNonNilUUID("renew participant ID", input.RenewParticipantID); err != nil {
			return nil, err
		}
		variables["renewParticipantId"] = input.RenewParticipantID
	}
	const query = `mutation JoinMedia($id:ID!,$renewParticipantId:ID){
		joinMedia(id:$id,renewParticipantId:$renewParticipantId){participantId serverUrl token expiresAt}}`
	var result JoinCredential
	if err := c.api.graphql(ctx, query, variables, "joinMedia", &result); err != nil {
		return nil, err
	}
	if validateUUID("participant ID in response", result.ParticipantID) != nil ||
		result.ServerURL == "" || result.Token == "" || result.ExpiresAt.IsZero() {
		return nil, errors.New("invalid join credential in response")
	}
	return &result, nil
}

type MediaParticipant struct {
	ID         string     `json:"id"`
	IdentityID string     `json:"identityId"`
	Role       MediaRole  `json:"role"`
	IssuedAt   time.Time  `json:"issuedAt"`
	ExpiresAt  time.Time  `json:"expiresAt"`
	RevokedAt  *time.Time `json:"revokedAt"`
	Connected  bool       `json:"connected"`
}

type MediaParticipants struct {
	Items []MediaParticipant
}

func (c *UserClient) ListMediaParticipants(ctx context.Context, mediaID string) (*MediaParticipants, error) {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return nil, err
	}
	const query = `query MediaParticipants($id:ID!){
		mediaParticipants(id:$id){id identityId role issuedAt expiresAt revokedAt connected}}`
	var participants []MediaParticipant
	if err := c.api.graphql(ctx, query, variables, "mediaParticipants", &participants); err != nil {
		return nil, err
	}
	if participants == nil {
		return nil, errors.New("invalid media participants in response")
	}
	for _, participant := range participants {
		if validateUUID("participant ID in response", participant.ID) != nil ||
			validateIdentityID(participant.IdentityID) != nil || !validMediaRole(participant.Role) ||
			participant.IssuedAt.IsZero() || participant.ExpiresAt.IsZero() {
			return nil, errors.New("invalid media participant in response")
		}
	}
	return &MediaParticipants{Items: participants}, nil
}

func (c *UserClient) RemoveMediaParticipant(ctx context.Context, mediaID, participantID string) error {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return err
	}
	if err := validateUUID("participant ID", participantID); err != nil {
		return err
	}
	variables["participantId"] = participantID
	const query = `mutation RemoveMediaParticipant($id:ID!,$participantId:ID!){
		removeMediaParticipant(id:$id,participantId:$participantId)}`
	return c.api.graphqlBool(ctx, query, variables, "removeMediaParticipant")
}

type MuteMediaParticipantRequest struct {
	TrackSID string
	Muted    bool
}

func (c *UserClient) MuteMediaParticipant(ctx context.Context, mediaID, participantID string, input MuteMediaParticipantRequest) error {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return err
	}
	if err := validateUUID("participant ID", participantID); err != nil {
		return err
	}
	if len(input.TrackSID) == 0 || len(input.TrackSID) > 128 {
		return errors.New("track SID must be 1-128 ASCII letters, digits, underscores or hyphens")
	}
	for i := range input.TrackSID {
		b := input.TrackSID[i]
		if !(b >= 'a' && b <= 'z' || b >= 'A' && b <= 'Z' ||
			b >= '0' && b <= '9' || b == '_' || b == '-') {
			return errors.New("track SID must be 1-128 ASCII letters, digits, underscores or hyphens")
		}
	}
	variables["participantId"], variables["trackSid"], variables["muted"] =
		participantID, input.TrackSID, input.Muted
	const query = `mutation MuteMediaParticipant($id:ID!,$participantId:ID!,$trackSid:String!,$muted:Boolean!){
		muteMediaParticipant(id:$id,participantId:$participantId,trackSid:$trackSid,muted:$muted)}`
	return c.api.graphqlBool(ctx, query, variables, "muteMediaParticipant")
}

// HLSAsset streams an authenticated native HTTP asset. Close Body, and fetch
// every referenced playlist and segment with the same st_ bearer credential.
type HLSAsset struct {
	Body        io.ReadCloser
	ContentType string
}

func validHLSName(name string) bool {
	if name == "master.m3u8" {
		return true
	}
	parts := strings.Split(name, "/")
	if len(parts) != 2 || (parts[0] != "variant_hi" && parts[0] != "variant_lo") {
		return false
	}
	if parts[1] == "playlist.m3u8" {
		return true
	}
	number, ok := strings.CutPrefix(parts[1], "segment_")
	if !ok {
		return false
	}
	number, ok = strings.CutSuffix(number, ".ts")
	if !ok || len(number) < 6 || len(number) > 12 {
		return false
	}
	for i := range number {
		if number[i] < '0' || number[i] > '9' {
			return false
		}
	}
	return true
}

func (c *UserClient) GetHLSAsset(ctx context.Context, mediaID, name string) (*HLSAsset, error) {
	if err := validateUUID("media ID", mediaID); err != nil {
		return nil, err
	}
	if !validHLSName(name) {
		return nil, errors.New("invalid HLS asset name")
	}
	response, err := c.api.send(ctx, http.MethodGet, "/media/"+mediaID+"/hls/"+name, nil)
	if err != nil {
		return nil, err
	}
	if response.StatusCode != http.StatusOK {
		defer response.Body.Close()
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			return nil, decodeAPIError(response)
		}
		return nil, &APIError{
			StatusCode: response.StatusCode,
			Code:       "unexpected_status",
			Message:    "unexpected successful HTTP status",
		}
	}
	contentType := response.Header.Get("Content-Type")
	if contentType == "" {
		response.Body.Close()
		return nil, errors.New("HLS asset response has no content type")
	}
	return &HLSAsset{Body: response.Body, ContentType: contentType}, nil
}
