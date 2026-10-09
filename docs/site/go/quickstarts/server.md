# Go server quickstart

Call ConvoHop from your Go backend with `github.com/ConvoHop/sdks/go`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, and recover a send whose response was lost.

## Before you start

You need Go 1.26 or later and the `github.com/ConvoHop/sdks/go` module ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

The samples on this page use these imports:

```go snippet=docs/languages/go/examples/server.go#imports
import (
	"context"
	"errors"

	convohop "github.com/ConvoHop/sdks/go"
)
```

## Connect

`NewProjectClient` checks your configuration and sends nothing. `Initialize` reads your project's route before the first call. It fails with a `*convohop.Problem` whose code is `INCARNATION_MISMATCH` when the project has a new incarnation.

```go snippet=docs/languages/go/examples/server.go#connect
// Connect creates a client for your project and reads the project's route.
// Create one client when your backend starts and share it: it is safe for
// concurrent use. config.BackendKey comes from your secret store. Never send
// it to a browser or an app.
func Connect(ctx context.Context, config convohop.ProjectConfig) (*convohop.ProjectClient, error) {
	client, err := convohop.NewProjectClient(config)
	if err != nil {
		return nil, err
	}
	if err := client.Initialize(ctx); err != nil {
		return nil, err
	}
	return client, nil
}
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```go snippet=docs/languages/go/examples/server.go#bootstrap
// Login is what your login endpoint returns, as JSON, to the signed-in user's
// app.
type Login struct {
	*convohop.SessionBootstrap
	BaseURL   string `json:"baseUrl"`
	ProjectID string `json:"projectId"`
}

// BootstrapUser runs after your own authentication. accountID is your user's
// ID: never trust a principal ID that a browser sends.
func BootstrapUser(ctx context.Context, client *convohop.ProjectClient, config convohop.ProjectConfig, accountID, deviceID string) (*Login, error) {
	// The same principal on every login.
	principal, err := client.CreatePrincipal(ctx, convohop.CreatePrincipalRequestInput{ExternalUserID: accountID})
	if err != nil {
		return nil, err
	}
	session, err := client.IssueSession(ctx, convohop.IssueSessionRequestInput{
		PrincipalID:    principal.Result.PrincipalID,
		DeviceID:       deviceID,
		RequestedTTLMs: "900000", // 15 minutes.
	})
	if err != nil {
		return nil, err
	}
	return &Login{SessionBootstrap: session.Result, BaseURL: config.BaseURL, ProjectID: config.ProjectID}, nil
}
```

`CreatePrincipal` returns the same principal for the same external user ID, so call it on every login. A session token acts only as its principal. `RequestedTTLMs` is the session's lifetime in milliseconds, as a decimal string like every counter.

## Create a conversation

Commands such as `CreateConversation` take a request ID that identifies the action. Create one per action with `convohop.NewRequestID()`, pass it with `convohop.WithRequestID`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```go snippet=docs/languages/go/examples/server.go#create-conversation
// CreateConversation creates a conversation with the given members, and
// returns its ID.
func CreateConversation(ctx context.Context, client *convohop.ProjectClient, title string, principalIDs []string, requestID string) (string, error) {
	members := make([]convohop.MemberInputInput, 0, len(principalIDs))
	for _, principalID := range principalIDs {
		members = append(members, convohop.MemberInputInput{PrincipalID: principalID, Role: "member"})
	}
	conversation, err := client.CreateConversation(ctx, convohop.CreateConversationRequestInput{
		Title:   title,
		Members: members,
	}, convohop.WithRequestID(requestID))
	if err != nil {
		return "", err
	}
	return conversation.Result.ConversationID, nil
}
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, set `ActAsPrincipalID` to the member's principal ID. The authority checks what that member can do and audits the call. With a nil `ActAsPrincipalID`, the backend's own service principal sends the message.

```go snippet=docs/languages/go/examples/server.go#send-message
// SendAs sends a message as a member, and returns its ID. Without
// ActAsPrincipalID, the backend's own principal is the sender.
func SendAs(ctx context.Context, client *convohop.ProjectClient, conversationID, authorID, text, requestID string) (string, error) {
	ack, err := client.SendMessage(ctx, convohop.SendMessageRequestInput{
		ConversationID:   conversationID,
		Text:             text,
		ActAsPrincipalID: &authorID,
	}, convohop.WithRequestID(requestID))
	if err != nil {
		return "", err
	}
	return ack.Result.MessageID, nil
}
```

```go snippet=docs/languages/go/examples/server.go#list-messages
// LatestMessages reads what one member can see, newest first.
func LatestMessages(ctx context.Context, client *convohop.ProjectClient, conversationID, readerID string) ([]convohop.Message, error) {
	page, err := client.Messages(ctx, convohop.MessagesRequestInput{
		ConversationID:   conversationID,
		Limit:            20,
		ActAsPrincipalID: &readerID,
	})
	if err != nil {
		return nil, err
	}
	return page.Result.Items, nil
}
```

A page holds at most `Limit` messages. Each paginated query, such as `Messages`, also has a `Pages` method that iterates over every page:

```go snippet=docs/languages/go/examples/server.go#all-messages
// AllMessages reads every message one member can see, newest first, a page
// at a time.
func AllMessages(ctx context.Context, client *convohop.ProjectClient, conversationID, readerID string) ([]convohop.Message, error) {
	var messages []convohop.Message
	pages := client.MessagesPages(ctx, convohop.MessagesRequestInput{
		ConversationID:   conversationID,
		Limit:            50,
		ActAsPrincipalID: &readerID,
	})
	for page, err := range pages {
		if err != nil {
			// errors.Is(err, convohop.ErrRefreshRequired) means that what the
			// member can see changed while you read: start again.
			return nil, err
		}
		messages = append(messages, page.Items...)
	}
	return messages, nil
}
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it fails with a `*convohop.Problem` whose `Outcome` is `convohop.OutcomeUnknown`. Sending again with a new request ID could post the message twice. Instead, `Retry` asks the authority about the original request. It returns the committed result, or resends the original command first if the authority never received it.

```go snippet=docs/languages/go/examples/server.go#recover
// SendOnce sends a message exactly once, even when the response is lost. It
// returns the message's ID, or "" when the authority withholds the result.
//
// A lost response leaves the outcome unknown: the message may or may not
// exist. Ask about the same request ID instead of sending with a new one,
// which could post the message twice.
func SendOnce(ctx context.Context, client *convohop.ProjectClient, conversationID, authorID, text, requestID string) (string, error) {
	messageID, err := SendAs(ctx, client, conversationID, authorID, text, requestID)
	var problem *convohop.Problem
	if !errors.As(err, &problem) || problem.Outcome != convohop.OutcomeUnknown {
		return messageID, err
	}
	// Resolves the request first, and resends the original only if the
	// authority never saw it.
	resolution, retryErr := client.Retry(ctx, requestID)
	if retryErr != nil {
		return "", retryErr
	}
	if resolution.State != "committed" {
		return "", err
	}
	if receipt := resolution.Receipt; receipt != nil && receipt.Result != nil && receipt.Result.MessageAck != nil {
		return receipt.Result.MessageAck.MessageID, nil
	}
	return "", nil
}
```

Retry with the same `ProjectClient`, which keeps the original request in memory. It sends a request at most three times, within a minute of the first attempt. After that, `Retry` fails with a `*convohop.Problem` whose code is `RESOLUTION_REQUIRED` instead of resending. To retry after a restart, create the client with `convohop.WithRecoveryStore`, as [recovery](https://github.com/ConvoHop/sdks/blob/main/go/README.md#recovery) describes. Recovery records hold request inputs, never tokens or keys.

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectClient` reference](../reference/convohop.md#projectclient-struct): every method, with the operation it sends.
