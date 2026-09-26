package convohop

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestGraphQLCallBroadcastParticipantsAndNativeHLS(t *testing.T) {
	var requests, creations, joins atomic.Int32
	threadID, mode := testThreadID, CallAudio
	call := MediaSession{
		ID: testMediaID, ProjectID: testProjectID, ThreadID: &threadID, Mode: &mode,
		Kind: MediaCall, Owner: "ci_11111111111111111111111111111111", Title: "Call",
		Audience: AudienceMembers, State: MediaRequested,
	}
	broadcast := MediaSession{
		ID: testBroadcastID, ProjectID: testProjectID, Kind: MediaBroadcast,
		Owner: "ci_11111111111111111111111111111111", Title: "Briefing", Audience: AudienceProject, State: MediaRequested,
	}
	now := time.Date(2026, 9, 25, 0, 0, 0, 0, time.UTC)
	joined := JoinCredential{
		ParticipantID: testParticipantID, ServerURL: "ws://127.0.0.1:7880",
		Token: "join_example", ExpiresAt: now.Add(time.Minute),
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		if r.URL.Path != "/graphql" {
			assertRequest(t, r, http.MethodGet, r.URL.Path, testSessionToken)
			switch r.URL.Path {
			case "/media/" + testBroadcastID + "/hls/master.m3u8":
				w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
				_, _ = io.WriteString(w, "#EXTM3U\nvariant_hi/playlist.m3u8\n")
			case "/media/" + testBroadcastID + "/hls/variant_hi/playlist.m3u8":
				w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
				_, _ = io.WriteString(w, "#EXTM3U\nsegment_000001.ts\n")
			case "/media/" + testBroadcastID + "/hls/variant_lo/segment_000001.ts":
				w.Header().Set("Content-Type", "video/mp2t")
				_, _ = w.Write([]byte{0x47, 0x00, 0x01})
			case "/media/" + testBroadcastID + "/hls/variant_lo/segment_000002.ts":
				respondJSON(t, w, http.StatusNotFound, map[string]any{
					"error": map[string]string{"code": "not_found", "message": "resource not found"},
				})
			default:
				t.Errorf("unexpected native media route %s", r.URL.Path)
				w.WriteHeader(http.StatusNotFound)
			}
			return
		}
		request := readGraphQLRequest(t, r, testSessionToken)
		switch {
		case strings.Contains(request.Query, "createCall("):
			creations.Add(1)
			assertVariables(t, request, `{"threadId":"`+testThreadID+`","title":"Call","mode":"audio","publishers":["ci_22222222222222222222222222222222"]}`)
			respondGraphQL(t, w, "createCall", call)
		case strings.Contains(request.Query, "createBroadcast("):
			creations.Add(1)
			assertVariables(t, request, `{"title":"Briefing","publishers":["ci_22222222222222222222222222222222"],"audience":"project"}`)
			respondGraphQL(t, w, "createBroadcast", broadcast)
		case strings.Contains(request.Query, "mediaSession("):
			if string(request.Variables["id"]) == `"`+testBroadcastID+`"` {
				current := broadcast
				current.State = MediaLive
				respondGraphQL(t, w, "mediaSession", current)
			} else {
				current := call
				current.State = MediaLive
				respondGraphQL(t, w, "mediaSession", current)
			}
		case strings.Contains(request.Query, "startMedia("):
			if string(request.Variables["id"]) == `"`+testBroadcastID+`"` {
				current := broadcast
				current.State = MediaStarting
				respondGraphQL(t, w, "startMedia", current)
			} else {
				current := call
				current.State = MediaLive
				respondGraphQL(t, w, "startMedia", current)
			}
		case strings.Contains(request.Query, "stopMedia("):
			current := call
			if string(request.Variables["id"]) == `"`+testBroadcastID+`"` {
				current = broadcast
			}
			current.State = MediaEnded
			respondGraphQL(t, w, "stopMedia", current)
		case strings.Contains(request.Query, "mediaMembers("):
			respondGraphQL(t, w, "mediaMembers", []MediaMember{
				{IdentityID: "ci_11111111111111111111111111111111", Role: RoleOwner}, {IdentityID: "ci_22222222222222222222222222222222", Role: RolePublisher},
			})
		case strings.Contains(request.Query, "setMediaMember("):
			assertVariables(t, request, `{"id":"`+testMediaID+`","identityId":"ci_22222222222222222222222222222222","role":"publisher"}`)
			respondGraphQL(t, w, "setMediaMember", true)
		case strings.Contains(request.Query, "removeMediaMember("):
			assertVariables(t, request, `{"id":"`+testMediaID+`","identityId":"ci_22222222222222222222222222222222"}`)
			respondGraphQL(t, w, "removeMediaMember", true)
		case strings.Contains(request.Query, "joinMedia("):
			switch joins.Add(1) {
			case 1:
				assertVariables(t, request, `{"id":"`+testMediaID+`"}`)
			case 2:
				assertVariables(t, request, `{"id":"`+testMediaID+`","renewParticipantId":"`+testParticipantID+`"}`)
			}
			respondGraphQL(t, w, "joinMedia", joined)
		case strings.Contains(request.Query, "mediaParticipants("):
			respondGraphQL(t, w, "mediaParticipants", []MediaParticipant{
				{ID: testParticipantID, IdentityID: "ci_22222222222222222222222222222222", Role: RolePublisher,
					IssuedAt: now, ExpiresAt: now.Add(time.Minute), Connected: false},
			})
		case strings.Contains(request.Query, "removeMediaParticipant("):
			assertVariables(t, request, `{"id":"`+testMediaID+`","participantId":"`+testParticipantID+`"}`)
			respondGraphQL(t, w, "removeMediaParticipant", true)
		case strings.Contains(request.Query, "muteMediaParticipant("):
			assertVariables(t, request, `{"id":"`+testMediaID+`","participantId":"`+
				testParticipantID+`","trackSid":"TR_123","muted":true}`)
			respondGraphQL(t, w, "muteMediaParticipant", true)
		default:
			t.Errorf("unexpected GraphQL media query: %s", request.Query)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	createdCall, err := client.CreateCall(ctx, CreateCallRequest{
		ThreadID: threadID, Title: "Call", Mode: CallAudio, Publishers: []string{"ci_22222222222222222222222222222222"},
	})
	if err != nil || createdCall.ID != testMediaID || createdCall.State != MediaRequested ||
		createdCall.Mode == nil || *createdCall.Mode != CallAudio || *createdCall.ThreadID != testThreadID {
		t.Fatalf("create audio call: %+v, %v", createdCall, err)
	}
	createdBroadcast, err := client.CreateBroadcast(ctx, CreateBroadcastRequest{
		Title: "Briefing", Publishers: []string{"ci_22222222222222222222222222222222"}, Audience: AudienceProject,
	})
	if err != nil || createdBroadcast.ID != testBroadcastID ||
		createdBroadcast.Audience != AudienceProject || createdBroadcast.Mode != nil {
		t.Fatalf("create broadcast: %+v, %v", createdBroadcast, err)
	}
	if creations.Load() != 2 {
		t.Error("did not issue separate GraphQL call and broadcast mutations")
	}
	startedCall, err := client.StartMedia(ctx, testMediaID)
	if err != nil || startedCall.State != MediaLive {
		t.Fatalf("start call: %+v, %v", startedCall, err)
	}
	startedBroadcast, err := client.StartMedia(ctx, testBroadcastID)
	if err != nil || startedBroadcast.State != MediaStarting {
		t.Fatalf("broadcast must report starting: %+v, %v", startedBroadcast, err)
	}
	if current, err := client.GetMedia(ctx, testBroadcastID); err != nil || current.State != MediaLive {
		t.Fatalf("refreshed broadcast: %+v, %v", current, err)
	}
	if current, err := client.GetMedia(ctx, testMediaID); err != nil || current.State != MediaLive {
		t.Fatalf("get call: %+v, %v", current, err)
	}
	members, err := client.ListMediaMembers(ctx, testMediaID)
	if err != nil || len(members.Items) != 2 || members.Items[1].Role != RolePublisher {
		t.Fatalf("media roster: %+v, %v", members, err)
	}
	if err := client.SetMediaMember(ctx, testMediaID, SetMediaMemberRequest{IdentityID: "ci_22222222222222222222222222222222", Role: RolePublisher}); err != nil {
		t.Fatal(err)
	}
	if err := client.RemoveMediaMember(ctx, testMediaID, "ci_22222222222222222222222222222222"); err != nil {
		t.Fatal(err)
	}
	grant, err := client.JoinMedia(ctx, testMediaID, JoinMediaRequest{})
	if err != nil || grant.ParticipantID != testParticipantID || grant.Token != "join_example" {
		t.Fatalf("join: %+v, %v", grant, err)
	}
	if _, err := client.JoinMedia(ctx, testMediaID, JoinMediaRequest{RenewParticipantID: grant.ParticipantID}); err != nil {
		t.Fatal(err)
	}
	participants, err := client.ListMediaParticipants(ctx, testMediaID)
	if err != nil || len(participants.Items) != 1 || participants.Items[0].Connected ||
		participants.Items[0].RevokedAt != nil {
		t.Fatalf("participant snapshot: %+v, %v", participants, err)
	}
	if err := client.MuteMediaParticipant(ctx, testMediaID, testParticipantID,
		MuteMediaParticipantRequest{TrackSID: "TR_123", Muted: true}); err != nil {
		t.Fatal(err)
	}
	if err := client.RemoveMediaParticipant(ctx, testMediaID, testParticipantID); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{
		"master.m3u8", "variant_hi/playlist.m3u8", "variant_lo/segment_000001.ts",
	} {
		asset, err := client.GetHLSAsset(ctx, testBroadcastID, name)
		if err != nil {
			t.Fatalf("asset %s: %v", name, err)
		}
		data, err := io.ReadAll(asset.Body)
		asset.Body.Close()
		if err != nil || len(data) == 0 || asset.ContentType == "" {
			t.Fatalf("asset %s: %d bytes, %q, %v", name, len(data), asset.ContentType, err)
		}
	}
	_, err = client.GetHLSAsset(ctx, testBroadcastID, "variant_lo/segment_000002.ts")
	var apiErr *APIError
	if !errors.As(err, &apiErr) || apiErr.Code != "not_found" || apiErr.StatusCode != 404 {
		t.Fatalf("HLS HTTP error: %v", err)
	}
	if ended, err := client.StopMedia(ctx, testMediaID); err != nil || ended.State != MediaEnded {
		t.Fatalf("stop call: %+v, %v", ended, err)
	}
	if ended, err := client.StopMedia(ctx, testBroadcastID); err != nil || ended.State != MediaEnded {
		t.Fatalf("stop broadcast: %+v, %v", ended, err)
	}

	before := requests.Load()
	if err := client.SetMediaMember(ctx, testMediaID, SetMediaMemberRequest{IdentityID: "ci_22222222222222222222222222222222", Role: RoleOwner}); err == nil {
		t.Error("accepted ownership transfer as a media role update")
	}
	if _, err := client.JoinMedia(ctx, testMediaID, JoinMediaRequest{RenewParticipantID: "bad"}); err == nil {
		t.Error("accepted invalid renewal ID")
	}
	if err := client.MuteMediaParticipant(ctx, testMediaID, testParticipantID,
		MuteMediaParticipantRequest{TrackSID: "bad/track"}); err == nil {
		t.Error("accepted invalid track SID")
	}
	if _, err := client.GetHLSAsset(ctx, testBroadcastID, "../secret"); err == nil {
		t.Error("accepted asset traversal")
	}
	if _, err := client.CreateCall(ctx, CreateCallRequest{ThreadID: threadID, Title: "Bad"}); err == nil {
		t.Error("accepted call without an audio/video mode")
	}
	if _, err := client.CreateBroadcast(ctx, CreateBroadcastRequest{Title: "Bad", Audience: "everyone"}); err == nil {
		t.Error("accepted unsupported audience")
	}
	if requests.Load() != before {
		t.Error("sent invalid media request to server")
	}
}

func TestRejectsMismatchedMediaResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		respondGraphQL(t, w, "mediaSession", MediaSession{
			ID: testBroadcastID, ProjectID: testProjectID, Kind: MediaCall,
			Owner: "ci_11111111111111111111111111111111", Title: "Call", Audience: AudienceMembers, State: MediaLive,
		})
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.GetMedia(context.Background(), testMediaID); err == nil {
		t.Error("accepted malformed media session")
	}
}
