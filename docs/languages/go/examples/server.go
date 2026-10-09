// Package examples holds the Go samples of the ConvoHop docs. The quickstarts
// include regions of these files, and the tests in this directory run them:
// the server samples against the conformance mock, the webhooks samples on
// signed deliveries, and the push samples on every push payload vector.
package examples

// #region imports
import (
	"context"
	"errors"

	convohop "github.com/ConvoHop/sdks/go"
)

// #endregion imports

// #region connect

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

// #endregion connect

// #region bootstrap

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

// #endregion bootstrap

// #region create-conversation

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

// #endregion create-conversation

// #region send-message

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

// #endregion send-message

// #region list-messages

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

// #endregion list-messages

// #region all-messages

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

// #endregion all-messages

// #region recover

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

// #endregion recover
