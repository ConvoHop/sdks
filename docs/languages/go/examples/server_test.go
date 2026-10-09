package examples_test

import (
	"encoding/json"
	"maps"
	"slices"
	"testing"

	examples "github.com/ConvoHop/sdks/docs/languages/go/examples"
	convohop "github.com/ConvoHop/sdks/go"
)

func connect(t *testing.T) (*convohop.ProjectClient, convohop.ProjectConfig) {
	t.Helper()
	config := projectConfig(t)
	client, err := examples.Connect(t.Context(), config)
	if err != nil {
		t.Fatal(err)
	}
	return client, config
}

func login(t *testing.T, client *convohop.ProjectClient, config convohop.ProjectConfig, accountID string) *examples.Login {
	t.Helper()
	login, err := examples.BootstrapUser(t.Context(), client, config, accountID, newUUID())
	if err != nil {
		t.Fatal(err)
	}
	return login
}

// room is a conversation between Alice and Bob.
type room struct {
	alice, bob, conversationID string
}

func setUp(t *testing.T, client *convohop.ProjectClient, config convohop.ProjectConfig, title string) room {
	t.Helper()
	alice := login(t, client, config, "alice-"+newUUID()).Session.PrincipalID
	bob := login(t, client, config, "bob-"+newUUID()).Session.PrincipalID
	conversationID, err := examples.CreateConversation(t.Context(), client, title, []string{alice, bob}, newUUID())
	if err != nil {
		t.Fatal(err)
	}
	return room{alice: alice, bob: bob, conversationID: conversationID}
}

func (r room) send(t *testing.T, client *convohop.ProjectClient, authorID, text string) line {
	t.Helper()
	messageID, err := examples.SendAs(t.Context(), client, r.conversationID, authorID, text, newUUID())
	if err != nil {
		t.Fatal(err)
	}
	return line{messageID: messageID, authorID: authorID, text: text}
}

// line is what a test compares of a message.
type line struct {
	messageID, authorID, text string
}

func lines(messages []convohop.Message) []line {
	found := []line{}
	for _, message := range messages {
		text := ""
		if message.Text != nil {
			text = *message.Text
		}
		found = append(found, line{messageID: message.MessageID, authorID: message.AuthorID, text: text})
	}
	return found
}

func TestBootstrapUserReturnsTheSamePrincipalOnEveryLoginAndANewSession(t *testing.T) {
	client, config := connect(t)
	accountID := "carol-" + newUUID()
	first := login(t, client, config, accountID)
	second := login(t, client, config, accountID)
	if second.Session.PrincipalID != first.Session.PrincipalID {
		t.Errorf("the second login's principal is %s, want %s", second.Session.PrincipalID, first.Session.PrincipalID)
	}
	if second.SessionToken == first.SessionToken {
		t.Error("both logins have the same session token")
	}
	if first.Session.Incarnation != config.Incarnation {
		t.Errorf("the session's incarnation is %s, want %s", first.Session.Incarnation, config.Incarnation)
	}

	// What the user's app receives.
	data, err := json.Marshal(first)
	if err != nil {
		t.Fatal(err)
	}
	var sent map[string]any
	if err := json.Unmarshal(data, &sent); err != nil {
		t.Fatal(err)
	}
	if keys, want := slices.Sorted(maps.Keys(sent)), []string{"baseUrl", "projectId", "session", "sessionToken", "tokenExpiresAt"}; !slices.Equal(keys, want) {
		t.Errorf("the login has %v, want %v", keys, want)
	}
	if sent["baseUrl"] != config.BaseURL || sent["projectId"] != config.ProjectID || sent["sessionToken"] != first.SessionToken {
		t.Errorf("the login is %s", data)
	}
}

func TestMessagesAreListedForTheOtherMemberNewestFirst(t *testing.T) {
	client, config := connect(t)
	room := setUp(t, client, config, "Launch plan")
	question := room.send(t, client, room.alice, "Ship it on Monday?")
	answer := room.send(t, client, room.bob, "Monday works.")
	messages, err := examples.LatestMessages(t.Context(), client, room.conversationID, room.bob)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := lines(messages), []line{answer, question}; !slices.Equal(got, want) {
		t.Errorf("LatestMessages returned %v, want %v", got, want)
	}
}

func TestAllMessagesReadsEveryPage(t *testing.T) {
	client, config := connect(t)
	room := setUp(t, client, config, "Long thread")
	var want []line
	for _, author := range []string{room.alice, room.bob, room.alice, room.bob, room.alice} {
		want = slices.Insert(want, 0, room.send(t, client, author, "Message "+newUUID()))
	}
	// The mock returns at most 3 messages a page.
	latest, err := examples.LatestMessages(t.Context(), client, room.conversationID, room.bob)
	if err != nil {
		t.Fatal(err)
	}
	if len(latest) >= len(want) {
		t.Fatalf("the first page has all %d messages, so the test reads one page only", len(latest))
	}
	messages, err := examples.AllMessages(t.Context(), client, room.conversationID, room.bob)
	if err != nil {
		t.Fatal(err)
	}
	if got := lines(messages); !slices.Equal(got, want) {
		t.Errorf("AllMessages returned %v, want %v", got, want)
	}
}

func TestSendOncePostsExactlyOneMessageWhenTheConnectionDrops(t *testing.T) {
	for _, test := range []struct {
		action   string
		attempts []bool
	}{
		{action: "dropBeforeCommit", attempts: []bool{true, false}},
		{action: "dropAfterCommit", attempts: []bool{true}},
	} {
		t.Run(test.action, func(t *testing.T) {
			client, config := connect(t)
			room := setUp(t, client, config, "Lost reply "+test.action)
			injectFault(t, "sendMessage", test.action)
			requestID := newUUID()
			messageID, err := examples.SendOnce(t.Context(), client, room.conversationID, room.alice, "Did it land?", requestID)
			if err != nil {
				t.Fatal(err)
			}
			messages, err := examples.LatestMessages(t.Context(), client, room.conversationID, room.bob)
			if err != nil {
				t.Fatal(err)
			}
			if got, want := lines(messages), []line{{messageID: messageID, authorID: room.alice, text: "Did it land?"}}; messageID == "" || !slices.Equal(got, want) {
				t.Errorf("SendOnce returned %q, and the conversation has %v", messageID, got)
			}
			// The first attempt was dropped. Only a request that never reached
			// the authority is sent again.
			if got := attempts(t, "sendMessage", requestID); !slices.Equal(got, test.attempts) {
				t.Errorf("the mock received %v, want %v", got, test.attempts)
			}
		})
	}
}
