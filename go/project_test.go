package convohop

import (
	"context"
	"maps"
	"strings"
	"testing"
)

const (
	testPrincipal = "77777777-7777-4777-8777-777777777777"
	testDevice    = "88888888-8888-4888-8888-888888888888"
	testSession   = "99999999-9999-4999-8999-999999999999"
	otherUUID     = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
	outcomeLookup = "communication.sessionRequestOutcome"
)

func ptr[T any](value T) *T {
	return &value
}

// session is a Session of the test incarnation with fields replaced.
func session(fields map[string]any) map[string]any {
	base := map[string]any{
		"sessionId": testSession, "principalId": testPrincipal, "deviceId": testDevice, "incarnation": testIncarnation,
		"sessionRevision": "1", "expiresAt": testTime, "status": "active",
	}
	maps.Copy(base, fields)
	return object("Session", base)
}

func message(conversation string) map[string]any {
	return object("Message", map[string]any{"conversationId": conversation})
}

func member(conversation, principal string) map[string]any {
	return object("Member", map[string]any{"conversationId": conversation, "principalId": principal})
}

func TestProjectResponseChecks(t *testing.T) {
	issue := IssueSessionRequestInput{PrincipalID: testPrincipal, DeviceID: testDevice, RequestedTTLMs: "60000"}
	renew := RenewSessionRequestInput{
		SessionID: testSession, PrincipalID: testPrincipal, DeviceID: testDevice, ExpectedRevision: "1", RequestedTTLMs: "60000",
	}
	scoped := SearchRequestInput{Query: "hi", PageSize: 10, Scope: &SearchScopeInput{ConversationIDs: []UUID{testConversation}}}
	members := AddMembersInput{ConversationID: testConversation, Members: []MemberBatchEntryInput{
		{PrincipalID: testPrincipal, Role: "member", ExpectedRevision: "0"},
		{PrincipalID: testUUID, Role: "member", ExpectedRevision: "0"},
	}}
	permission := SetBroadcastPermissionInput{
		ConversationID: testConversation, PrincipalID: testPrincipal, Allowed: true, ExpectedMembershipRevision: "1",
	}
	mute := func(conversation, principal string) map[string]any {
		return object("ConversationMute", map[string]any{"conversationId": conversation, "principalId": principal, "muted": true})
	}
	inbox := func(item map[string]any) map[string]any {
		return object("InboxPage", map[string]any{"items": []any{object("InboxItem", item)}, "complete": true})
	}
	searchPage := func(hits ...any) map[string]any {
		return object("SearchPage", map[string]any{"items": hits, "complete": true})
	}
	hit := func(conversation string, message any) map[string]any {
		return object("SearchHit", map[string]any{"conversationId": conversation, "message": message})
	}
	batch := func(items ...any) map[string]any {
		return object("ConversationMemberBatch", map[string]any{"items": items})
	}
	broadcast := func(conversation, principal string) map[string]any {
		return object("BroadcastPermissionChanged", map[string]any{"member": member(conversation, principal)})
	}

	cases := []struct {
		name   string
		op     string
		result any
		// mismatch is the start of the expected problem message, or "" when
		// the reply is accepted.
		mismatch string
	}{
		{"principal", "communication.createPrincipal",
			object("Principal", map[string]any{"externalUserId": "user-1"}), ""},
		{"principal of another user", "communication.createPrincipal",
			object("Principal", map[string]any{"externalUserId": "user-2"}), "Principal does not match"},
		{"issued session", "communication.issueSession",
			object("SessionBootstrap", map[string]any{"session": session(nil)}), ""},
		{"issued session without a session", "communication.issueSession",
			object("SessionBootstrap", nil), "Session does not match"},
		{"issued session of another device", "communication.issueSession",
			object("SessionBootstrap", map[string]any{"session": session(map[string]any{"deviceId": otherUUID})}), "Session does not match"},
		{"issued session of another principal", "communication.issueSession",
			object("SessionBootstrap", map[string]any{"session": session(map[string]any{"principalId": otherUUID})}), "Session does not match"},
		{"issued session of another incarnation", "communication.issueSession",
			object("SessionBootstrap", map[string]any{"session": session(map[string]any{"incarnation": otherUUID})}), "Session does not match"},
		{"renewed session", "communication.renewSession",
			object("SessionBootstrap", map[string]any{"session": session(nil)}), ""},
		{"renewed session of another session", "communication.renewSession",
			object("SessionBootstrap", map[string]any{"session": session(map[string]any{"sessionId": otherUUID})}), "Session does not match"},
		{"send receipt of another incarnation", "communication.sendMessage",
			object("MessageAck", map[string]any{
				"conversationId": testConversation, "sequence": "7", "status": "sent",
				"cursor": map[string]any{"incarnation": otherUUID, "conversationId": testConversation, "sequence": "7"},
			}), "Invalid send receipt scope"},
		{"send receipt of another conversation", "communication.sendMessage",
			object("MessageAck", map[string]any{
				"conversationId": otherUUID, "sequence": "7", "status": "sent",
				"cursor": map[string]any{"incarnation": testIncarnation, "conversationId": otherUUID, "sequence": "7"},
			}), "sendMessage conversationId does not match"},
		{"inbox", "communication.inbox",
			inbox(map[string]any{"conversationId": testConversation, "latestVisibleMessage": message(testConversation)}), ""},
		{"inbox item without a message", "communication.inbox",
			inbox(map[string]any{"conversationId": testConversation}), ""},
		{"inbox item with another conversation's message", "communication.inbox",
			inbox(map[string]any{"conversationId": testConversation, "latestVisibleMessage": message(otherUUID)}), "Inbox item does not match"},
		{"search", "communication.search", searchPage(hit(testConversation, message(testConversation))), ""},
		{"search hit without a message", "communication.search",
			searchPage(hit(testConversation, nil)), "Search hit conversation scope does not match its message"},
		{"search hit with another conversation's message", "communication.search",
			searchPage(hit(testConversation, message(otherUUID))), "Search hit conversation scope does not match its message"},
		{"search hit outside the scope", "communication.search",
			searchPage(hit(otherUUID, message(otherUUID))), "Search hit does not match"},
		{"member batch", "communication.addMembers",
			batch(member(testConversation, testUUID), member(testConversation, testPrincipal)), ""},
		{"member batch missing a member", "communication.addMembers",
			batch(member(testConversation, testPrincipal)), "Invalid membership batch result"},
		{"member batch of another conversation", "communication.addMembers",
			batch(member(testConversation, testPrincipal), member(otherUUID, testUUID)), "Membership batch does not match"},
		{"member batch with a repeated member", "communication.addMembers",
			batch(member(testConversation, testPrincipal), member(testConversation, testPrincipal)), "Membership batch does not match"},
		{"member batch with another member", "communication.addMembers",
			batch(member(testConversation, testPrincipal), member(testConversation, otherUUID)), "Membership batch does not match"},
		{"broadcast permission", "communication.setBroadcastPermission", broadcast(testConversation, testPrincipal), ""},
		{"broadcast permission of another member", "communication.setBroadcastPermission",
			broadcast(testConversation, otherUUID), "Member does not match"},
		{"broadcast permission in another conversation", "communication.setBroadcastPermission",
			broadcast(otherUUID, testPrincipal), "Member does not match"},
		{"mute", "communication.conversationMute", mute(testConversation, testPrincipal), ""},
		{"mute of another member", "communication.conversationMute", mute(testConversation, otherUUID), "Mute does not match"},
		{"mute in another conversation", "communication.conversationMute", mute(otherUUID, testPrincipal), "conversationMute conversationId does not match"},
		{"set mute", "communication.setConversationMute", mute(testConversation, testPrincipal), ""},
		{"set mute of another member", "communication.setConversationMute", mute(testConversation, otherUUID), "Mute does not match"},
	}
	calls := map[string]func(context.Context, *ProjectClient) error{
		"communication.createPrincipal": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.CreatePrincipal(ctx, CreatePrincipalRequestInput{ExternalUserID: "user-1"})
			return err
		},
		"communication.issueSession": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.IssueSession(ctx, issue)
			return err
		},
		"communication.renewSession": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.RenewSession(ctx, renew)
			return err
		},
		"communication.sendMessage": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.SendMessage(ctx, sendInput("hi"))
			return err
		},
		"communication.inbox": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.Inbox(ctx, InboxRequestInput{Limit: 10})
			return err
		},
		"communication.search": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.Search(ctx, scoped)
			return err
		},
		"communication.addMembers": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.AddMembers(ctx, members)
			return err
		},
		"communication.setBroadcastPermission": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.SetBroadcastPermission(ctx, permission)
			return err
		},
		"communication.conversationMute": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.ConversationMute(ctx, ConversationMuteInput{ConversationID: testConversation, ActAsPrincipalID: ptr(testPrincipal)})
			return err
		},
		"communication.setConversationMute": func(ctx context.Context, c *ProjectClient) error {
			_, err := c.SetConversationMute(ctx, SetConversationMuteInput{
				ConversationID: testConversation, Muted: true, ActAsPrincipalID: ptr(testPrincipal),
			})
			return err
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, replying(tc.op, func(*exchange) any { return tc.result }))
			err := calls[tc.op](context.Background(), newProject(t, a))
			if tc.mismatch == "" {
				if err != nil {
					t.Fatalf("accepted reply failed: %v", err)
				}
				return
			}
			p := expectProblem(t, err, codeInvalidResponse, OutcomeUnknown, 503)
			if !strings.HasPrefix(p.Message, tc.mismatch) {
				t.Fatalf("message %q, want %q", p.Message, tc.mismatch)
			}
		})
	}
}

// committedOutcome is a committed session request outcome with fields
// replaced.
func committedOutcome(fields map[string]any) map[string]any {
	outcome := map[string]any{
		"state": "committed", "operation": "issueSession", "receiptId": testUUID, "committedAt": testTime,
		"originalSession": session(nil), "currentSession": session(nil), "currentState": "active",
	}
	maps.Copy(outcome, fields)
	return outcome
}

// outcomes answers session request outcome lookups with fields and drops
// every other request.
func outcomes(fields map[string]any) func(*exchange) response {
	return func(ex *exchange) response {
		if ex.op.id != outcomeLookup {
			return response{drop: true}
		}
		value := object("SessionRequestOutcome", map[string]any{
			"state": "notObservedYet", "requestId": ex.input["requestId"], "checkedAt": testTime,
		})
		maps.Copy(value, fields)
		return response{body: success(ex.op, ex.requestID, value)}
	}
}

func lookUpOutcome(c *ProjectClient) (*SessionRequestOutcomeReply, error) {
	return c.SessionRequestOutcome(context.Background(), SessionRequestOutcomeRequestInput{RequestID: testRequest})
}

func expectMalformedOutcome(t *testing.T, err error, message string) {
	t.Helper()
	p := expectProblem(t, err, codeInvalidResponse, OutcomeUnknown, 503)
	if !strings.HasPrefix(p.Message, message) {
		t.Fatalf("message %q, want %q", p.Message, message)
	}
}

const malformedOutcome = "Malformed session request outcome"

func TestSessionRequestOutcome(t *testing.T) {
	cases := []struct {
		name     string
		fields   map[string]any
		accepted bool
	}{
		{"not observed", nil, true},
		{"not observed with details", map[string]any{"operation": "issueSession"}, false},
		{"committed", committedOutcome(nil), true},
		{"renewal", committedOutcome(map[string]any{"operation": "renewSession"}), true},
		{"missing current session", committedOutcome(map[string]any{"currentState": "missing", "currentSession": nil}), true},
		{"missing state with a current session", committedOutcome(map[string]any{"currentState": "missing"}), false},
		{"revoked", committedOutcome(map[string]any{
			"currentState": "revoked", "currentSession": session(map[string]any{"status": "revoked", "sessionRevision": "2"}),
		}), true},
		{"expired", committedOutcome(map[string]any{
			"currentState": "expired", "currentSession": session(map[string]any{"status": "expired"}),
		}), true},
		{"current status differs from its state", committedOutcome(map[string]any{"currentState": "expired"}), false},
		{"unknown current state", committedOutcome(map[string]any{
			"currentState": "paused", "currentSession": session(map[string]any{"status": "paused"}),
		}), false},
		{"current revision behind the original", committedOutcome(map[string]any{
			"originalSession": session(map[string]any{"sessionRevision": "2"}),
		}), false},
		{"same revision with another expiry", committedOutcome(map[string]any{
			"currentSession": session(map[string]any{"expiresAt": "2026-01-02T03:04:06.000Z"}),
		}), false},
		{"current session of another session", committedOutcome(map[string]any{
			"currentSession": session(map[string]any{"sessionId": otherUUID, "sessionRevision": "2"}),
		}), false},
		{"original session of another incarnation", committedOutcome(map[string]any{
			"originalSession": session(map[string]any{"incarnation": otherUUID}),
			"currentSession":  session(map[string]any{"incarnation": otherUUID}),
		}), false},
		{"zero revision", committedOutcome(map[string]any{
			"originalSession": session(map[string]any{"sessionRevision": "0"}),
		}), false},
		{"original session not active", committedOutcome(map[string]any{
			"originalSession": session(map[string]any{"status": "revoked"}),
		}), false},
		{"missing original session", committedOutcome(map[string]any{"originalSession": nil}), false},
		{"another operation", committedOutcome(map[string]any{"operation": "createPrincipal"}), false},
		{"unknown state", committedOutcome(map[string]any{"state": "accepted"}), false},
		{"missing receipt", committedOutcome(map[string]any{"receiptId": nil}), false},
		{"missing commit time", committedOutcome(map[string]any{"committedAt": nil}), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			reply, err := lookUpOutcome(newProject(t, newAuthority(t, outcomes(tc.fields))))
			if !tc.accepted {
				expectMalformedOutcome(t, err, malformedOutcome)
				return
			}
			if err != nil {
				t.Fatalf("accepted outcome failed: %v", err)
			}
			if reply.Result.RequestID != testRequest {
				t.Fatalf("outcome of %s", reply.Result.RequestID)
			}
		})
	}
	t.Run("another request", func(t *testing.T) {
		_, err := lookUpOutcome(newProject(t, newAuthority(t, outcomes(map[string]any{"requestId": otherUUID}))))
		expectMalformedOutcome(t, err, "sessionRequestOutcome requestId does not match")
	})
}

func TestSessionRequestOutcomeCustody(t *testing.T) {
	issue := func(ctx context.Context, c *ProjectClient) error {
		_, err := c.IssueSession(ctx, IssueSessionRequestInput{
			PrincipalID: testPrincipal, DeviceID: testDevice, RequestedTTLMs: "60000",
		}, WithRequestID(testRequest))
		return err
	}
	renew := func(ctx context.Context, c *ProjectClient) error {
		_, err := c.RenewSession(ctx, RenewSessionRequestInput{
			SessionID: testSession, PrincipalID: testPrincipal, DeviceID: testDevice, ExpectedRevision: "1", RequestedTTLMs: "60000",
		}, WithRequestID(testRequest))
		return err
	}
	send := func(ctx context.Context, c *ProjectClient) error {
		_, err := c.SendMessage(ctx, sendInput("hi"), WithRequestID(testRequest))
		return err
	}
	renewed := func(fields map[string]any) map[string]any {
		values := map[string]any{"operation": "renewSession", "originalSession": session(map[string]any{"sessionRevision": "2"}),
			"currentSession": session(map[string]any{"sessionRevision": "2"})}
		maps.Copy(values, fields)
		return committedOutcome(values)
	}
	cases := []struct {
		name     string
		custody  func(context.Context, *ProjectClient) error
		fields   map[string]any
		accepted bool
	}{
		{"issue not observed", issue, nil, true},
		{"issue committed", issue, committedOutcome(nil), true},
		{"issue reported as a renewal", issue, renewed(nil), false},
		{"issue for another device", issue, committedOutcome(map[string]any{
			"originalSession": session(map[string]any{"deviceId": otherUUID}),
			"currentSession":  session(map[string]any{"deviceId": otherUUID}),
		}), false},
		{"issue for another principal", issue, committedOutcome(map[string]any{
			"originalSession": session(map[string]any{"principalId": otherUUID}),
			"currentSession":  session(map[string]any{"principalId": otherUUID}),
		}), false},
		{"renewal committed", renew, renewed(nil), true},
		{"renewal reported as an issue", renew, committedOutcome(nil), false},
		{"renewal skipping a revision", renew, renewed(map[string]any{
			"originalSession": session(map[string]any{"sessionRevision": "3"}),
			"currentSession":  session(map[string]any{"sessionRevision": "3"}),
		}), false},
		{"renewal of another session", renew, renewed(map[string]any{
			"originalSession": session(map[string]any{"sessionId": otherUUID, "sessionRevision": "2"}),
			"currentSession":  session(map[string]any{"sessionId": otherUUID, "sessionRevision": "2"}),
		}), false},
		{"message request", send, nil, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			client := newProject(t, newAuthority(t, outcomes(tc.fields)))
			expectProblem(t, tc.custody(context.Background(), client), codeTransportUnknown, OutcomeUnknown, 0)
			_, err := lookUpOutcome(client)
			if !tc.accepted {
				expectMalformedOutcome(t, err, malformedOutcome)
				return
			}
			if err != nil {
				t.Fatalf("accepted outcome failed: %v", err)
			}
		})
	}
}
