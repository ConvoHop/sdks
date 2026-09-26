package threadwave

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"
)

func localOrigins() (string, string, error) {
	api := os.Getenv("COMMS_API_URL")
	management := os.Getenv("COMMS_MANAGEMENT_URL")
	if api == "" || management == "" {
		return "", "", fmt.Errorf("set COMMS_API_URL and COMMS_MANAGEMENT_URL to run live API tests")
	}
	return api, management, nil
}

func TestLocalOriginsUseExplicitOverrides(t *testing.T) {
	t.Setenv("COMMS_API_URL", "http://127.0.0.1:24000")
	t.Setenv("COMMS_MANAGEMENT_URL", "http://127.0.0.1:24001")
	api, management, err := localOrigins()
	if err != nil {
		t.Fatal(err)
	}
	if api != "http://127.0.0.1:24000" || management != "http://127.0.0.1:24001" {
		t.Fatalf("unexpected local origins: %s, %s", api, management)
	}
	t.Setenv("COMMS_MANAGEMENT_URL", "")
	if _, _, err := localOrigins(); err == nil {
		t.Fatal("missing Management origin must fail explicitly")
	}
}

func TestLocalIncomingCallAPI(t *testing.T) {
	adminToken := os.Getenv("COMMS_LIVE_ADMIN_TOKEN")
	if adminToken == "" {
		t.Skip("set COMMS_LIVE_ADMIN_TOKEN to exercise the local APIs")
	}
	apiURL, managementURL, err := localOrigins()
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	management, err := NewManagementClient(managementURL, adminToken)
	if err != nil {
		t.Fatal(err)
	}
	id, err := NewMessageID()
	if err != nil {
		t.Fatal(err)
	}
	project, err := management.CreateProject(ctx, CreateProjectRequest{Name: "Go call feed smoke " + id[:8]})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := management.SuspendProject(cleanupCtx, project.ProjectID); err != nil {
			t.Errorf("suspend smoke project: %v", err)
		}
	})

	server, err := NewProjectClient(apiURL, project.ProjectKey)
	if err != nil {
		t.Fatal(err)
	}
	var identities [3]Identity
	var tokens [3]SessionToken
	for i := range identities {
		requestID, err := NewMessageID()
		if err != nil {
			t.Fatal(err)
		}
		registered, err := server.CreateIdentity(ctx, requestID)
		if err != nil {
			t.Fatal(err)
		}
		session, err := server.MintIdentityToken(ctx, registered.ID)
		if err != nil {
			t.Fatal(err)
		}
		identities[i], tokens[i] = *registered, *session
	}
	owner, err := NewUserClient(apiURL, tokens[0].Token)
	if err != nil {
		t.Fatal(err)
	}
	member, err := NewUserClient(apiURL, tokens[1].Token)
	if err != nil {
		t.Fatal(err)
	}
	outsider, err := NewUserClient(apiURL, tokens[2].Token)
	if err != nil {
		t.Fatal(err)
	}
	thread, err := owner.CreateThread(ctx, CreateThreadRequest{
		Title: "Go incoming smoke thread", Members: []string{identities[1].ID},
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := member.AcceptThreadInvitation(ctx, thread.ID); err != nil {
		t.Fatal(err)
	}

	before, err := member.ListIncomingCalls(ctx, PageOptions{Limit: 1})
	if err != nil {
		t.Fatal(err)
	}
	if len(before.Items) != 0 {
		t.Fatal("new project unexpectedly contains incoming calls")
	}
	call, err := owner.CreateCall(ctx, CreateCallRequest{
		ThreadID: thread.ID, Title: "Go incoming smoke", Mode: CallAudio,
		Publishers: []string{identities[1].ID},
	})
	if err != nil {
		t.Fatal(err)
	}
	stopped := false
	t.Cleanup(func() {
		if stopped {
			return
		}
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if _, err := owner.StopMedia(cleanupCtx, call.ID); err != nil {
			t.Errorf("stop smoke call: %v", err)
		}
	})
	live, err := owner.StartMedia(ctx, call.ID)
	if err != nil {
		t.Fatal(err)
	}
	if live.State != MediaLive {
		t.Fatalf("call state = %s, want live", live.State)
	}
	snapshot, err := member.SyncIncomingCalls(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(snapshot.Items) != 1 || snapshot.Items[0].Call.ID != call.ID {
		t.Fatal("member did not discover the live call by snapshot")
	}
	outsiderInbox, err := outsider.ListIncomingCalls(ctx, PageOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if len(outsiderInbox.Items) != 0 {
		t.Fatal("outsider discovered another user's invitation")
	}
	ringingEvents, err := member.ListCallEvents(ctx, PageOptions{After: before.Cursor})
	if err != nil {
		t.Fatal(err)
	}
	foundRing := false
	for _, event := range ringingEvents.Items {
		foundRing = foundRing ||
			event.Kind == CallRinging && event.CallID == call.ID && event.Call != nil &&
				event.Call.ThreadID == thread.ID && event.Call.Mode == CallAudio
	}
	if !foundRing {
		t.Fatal("member did not receive the live ringing event")
	}
	if err := member.DeclineCall(ctx, call.ID); err != nil {
		t.Fatal(err)
	}
	if err := member.DeclineCall(ctx, call.ID); err != nil {
		t.Fatalf("repeated decline was not idempotent: %v", err)
	}
	memberEvents, err := member.ListCallEvents(ctx, PageOptions{After: ringingEvents.NextAfter})
	if err != nil {
		t.Fatal(err)
	}
	declined := false
	for _, event := range memberEvents.Items {
		if event.CallID != call.ID {
			continue
		}
		declined = declined || event.Kind == CallDeclined && event.Call == nil
	}
	if !declined {
		t.Fatal("member did not receive the private decline event")
	}
	ownerEvents, err := owner.ListCallEvents(ctx, PageOptions{After: before.Cursor})
	if err != nil {
		t.Fatal(err)
	}
	foundOwnerDecline := false
	for _, event := range ownerEvents.Items {
		foundOwnerDecline = foundOwnerDecline ||
			event.Kind == CallDeclined && event.CallID == call.ID &&
				event.IdentityID == identities[1].ID && event.Call != nil
	}
	if !foundOwnerDecline {
		t.Fatal("owner did not receive the member's decline with call details")
	}
	outsiderEvents, err := outsider.ListCallEvents(ctx, PageOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if len(outsiderEvents.Items) != 0 {
		t.Fatal("outsider received another user's call events")
	}
	if _, err := owner.StopMedia(ctx, call.ID); err != nil {
		t.Fatal(err)
	}
	stopped = true
	for _, user := range []*UserClient{outsider, member, owner} {
		if err := user.RevokeSession(ctx); err != nil {
			t.Fatal(err)
		}
	}
}
