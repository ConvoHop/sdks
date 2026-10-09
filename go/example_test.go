package convohop_test

import (
	"context"
	"errors"
	"log"
	"os"

	convohop "github.com/ConvoHop/sdks/go"
)

// Values your backend already holds. The examples compile but don't run.
var (
	ctx                    = context.Background()
	communicationBase      = "https://api.example.com"
	projectID              = "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d"
	incarnation            = "1f2e3d4c-5b6a-4987-8a6b-5c4d3e2f1a0b"
	authenticatedAccountID = "account-42"
	deviceID               = "6b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"
	teammatePrincipalID    = "0b3c5d7e-9f1a-4b2c-8d3e-4f5a6b7c8d9e"
	conversationID         = "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d"
	client                 *convohop.ProjectClient
)

// An application backend creates a principal for a signed-in user, issues
// the user a session and creates a conversation.
func Example() {
	client, err := convohop.NewProjectClient(convohop.ProjectConfig{
		BaseURL:     communicationBase,
		ProjectID:   projectID,
		Incarnation: incarnation,
		BackendKey:  os.Getenv("CONVOHOP_BACKEND_KEY"), // Trusted secret storage only.
	})
	if err != nil {
		log.Fatal(err)
	}
	if err := client.Initialize(ctx); err != nil {
		log.Fatal(err)
	}
	principal, err := client.CreatePrincipal(ctx, convohop.CreatePrincipalRequestInput{ExternalUserID: authenticatedAccountID})
	if err != nil {
		log.Fatal(err)
	}
	principalID := principal.Result.PrincipalID
	bootstrap, err := client.IssueSession(ctx, convohop.IssueSessionRequestInput{
		PrincipalID: principalID, DeviceID: deviceID, RequestedTTLMs: "900000",
	})
	if err != nil {
		log.Fatal(err)
	}
	_ = bootstrap.Result // Return only this user's bootstrap and public project metadata.
	conversation, err := client.CreateConversation(ctx, convohop.CreateConversationRequestInput{
		Title: "Support",
		Members: []convohop.MemberInputInput{
			{PrincipalID: principalID, Role: "member"},
			{PrincipalID: teammatePrincipalID, Role: "member"},
		},
	}, convohop.WithRequestID(convohop.NewRequestID()))
	if err != nil {
		log.Fatal(err)
	}
	_, err = client.SendMessage(ctx, convohop.SendMessageRequestInput{
		ConversationID: conversation.Result.ConversationID,
		Text:           "Welcome",
	})
	if err != nil {
		log.Fatal(err)
	}
}

// A mutation with an unknown outcome may have taken effect. Settle it under
// its original request ID with Retry, never by sending it again under a new
// one.
func ExampleProjectClient_Retry() {
	requestID := convohop.NewRequestID() // Keep it with the work it identifies.
	input := convohop.SendMessageRequestInput{ConversationID: conversationID, Text: "Your order shipped"}
	_, err := client.SendMessage(ctx, input, convohop.WithRequestID(requestID))
	var problem *convohop.Problem
	if errors.As(err, &problem) && problem.Outcome == convohop.OutcomeUnknown {
		resolution, err := client.Retry(ctx, problem.RequestID)
		if err != nil {
			log.Fatal(err)
		}
		log.Println(resolution.State) // committed or accepted, once the authority has observed the request
	}
}

// A Pages method iterates a paginated query. Act as a member to see only
// what that member can see.
func ExampleProjectClient_MessagesPages() {
	member := teammatePrincipalID
	pages := client.MessagesPages(ctx, convohop.MessagesRequestInput{
		ConversationID: conversationID, Limit: 50, ActAsPrincipalID: &member,
	})
	for page, err := range pages {
		if errors.Is(err, convohop.ErrRefreshRequired) {
			break // Start again from the latest message.
		}
		if err != nil {
			log.Fatal(err)
		}
		for _, message := range page.Items {
			if message.Text != nil {
				log.Println(message.Sequence, *message.Text)
			}
		}
	}
}

// Classify a failure by its code and outcome, never by its message.
func ExampleProblem() {
	_, err := client.CreatePrincipal(ctx, convohop.CreatePrincipalRequestInput{ExternalUserID: authenticatedAccountID})
	var problem *convohop.Problem
	if !errors.As(err, &problem) {
		return
	}
	switch {
	case errors.Is(err, convohop.ErrorCodeScopeRequired):
		scope, _ := problem.Scope()
		log.Printf("grant the backend key the %s scope", scope)
	case errors.Is(err, convohop.ErrorCodeRateLimited):
		wait, _ := problem.RetryAfter()
		log.Printf("wait %s, then send again with request ID %s", wait, problem.RequestID)
	case problem.Outcome == convohop.OutcomeUnknown:
		log.Printf("settle request %s with Retry", problem.RequestID)
	}
}

// An operator issues a backend key. The key is never an ordinary result: the
// completed operation names a credential delivery, which hands it over once.
func ExampleManagementClient_IssueBackendKey() {
	management, err := convohop.NewManagementClient(convohop.ManagementConfig{
		BaseURL:     "https://management.example.com",
		AccessToken: os.Getenv("CONVOHOP_OPERATOR_TOKEN"), // Trusted secret storage only.
		ActorID:     "5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d",
	}, convohop.WithRecoveryStore(convohop.NewMemoryRecoveryStore()))
	if err != nil {
		log.Fatal(err)
	}
	issued, err := management.IssueBackendKey(ctx, convohop.IssueBackendKeyRequestInput{
		ProjectID: projectID, Name: "orders-service",
		Scopes: []string{"principalManage", "sessionIssue"}, ExpiresAt: "2027-10-01T00:00:00Z",
	})
	if err != nil {
		log.Fatal(err)
	}
	if issued.Operation == nil {
		return
	}
	// Keep the operation ID, and poll until the work completes.
	operation, err := management.GetOperation(ctx, convohop.GetOperationRequestInput{OperationID: issued.Operation.OperationID})
	if err != nil {
		log.Fatal(err)
	}
	if work := operation.Result; work != nil && work.Result != nil && work.Result.Delivery != nil {
		log.Println(work.Result.Delivery.DeliveryID) // Redeem it with a permit from CredentialPermit.
	}
}

// A client without a backend key redeems a credential delivery with the
// permit that the management plane issued for it.
func ExampleProjectClient_RedeemCredential() {
	delivery, err := convohop.NewProjectClient(convohop.ProjectConfig{
		BaseURL: communicationBase, ProjectID: projectID, Incarnation: incarnation,
	})
	if err != nil {
		log.Fatal(err)
	}
	var permit convohop.SignedProof                 // From ManagementClient.CredentialPermit, never stored.
	deliveryID, redemptionRequestID := "...", "..." // The IDs the permit names.
	redeemed, err := delivery.RedeemCredential(ctx, permit, convohop.RedeemCredentialRequestInput{DeliveryID: deliveryID},
		convohop.WithRequestID(redemptionRequestID))
	if err != nil {
		log.Fatal(err)
	}
	_ = redeemed.Result // Store the capsule in trusted secret storage, then acknowledge the delivery.
	_, err = delivery.AcknowledgeCredential(ctx, permit, convohop.AcknowledgeCredentialRequestInput{DeliveryID: deliveryID})
	if err != nil {
		log.Fatal(err)
	}
}
