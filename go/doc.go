// Package convohop is the ConvoHop server SDK for Go.
//
// [ProjectClient] calls the communication plane of one project with a backend
// key, and [ManagementClient] calls the management plane with an operator
// access token. Use both only in trusted server runtimes: never ship a backend
// key or an access token to a browser or a mobile app. Issue short-lived user
// sessions for those instead.
//
// Every method takes a context first and sends one GraphQL request to the
// authority's /graphql endpoint. It returns the reply, or an error that is a
// [*Problem] for every failure the authority or the transport reports:
//
//	client, err := convohop.NewProjectClient(convohop.ProjectConfig{
//		BaseURL:     "https://api.example.com",
//		ProjectID:   projectID,
//		Incarnation: incarnation,
//		BackendKey:  os.Getenv("CONVOHOP_BACKEND_KEY"),
//	})
//	if err != nil {
//		return err
//	}
//	if err := client.Initialize(ctx); err != nil {
//		return err
//	}
//	reply, err := client.SendMessage(ctx, convohop.SendMessageRequestInput{
//		ConversationID: conversationID,
//		Text:           "Hello",
//	})
//
// # Request identity and outcomes
//
// Each request has a request ID, a random UUID unless [WithRequestID] names
// one. Classify a [Problem] by its Code and Outcome. [OutcomeUnknown] means
// the request may have taken effect: the network failed, the context ended
// or the response was malformed. Never resend a mutation under a new request
// ID in that case. Call Retry with the Problem's RequestID instead. Retry reads
// the request's resolution and resends the original payload only when the
// authority has not observed it, within the operation's retry budget.
//
// A mutation's request ID and payload are recorded before the first attempt.
// Sending the same request ID with a different payload fails with
// IDEMPOTENCY_CONFLICT. Concurrent calls with the same request ID and payload
// share one attempt. Pass [WithRecoveryStore] to keep these records across
// restarts. Records hold request IDs, payloads and attempt counts, never
// credentials.
//
// A client keeps at most 128 records. A record is final once its request
// committed or was accepted, or once the authority rejected every attempt and
// won't take another: the last rejection's code is one the API documents as
// not retryable, other than WRONG_REGION, or the retry budget is spent. When
// all 128 places are taken, a new mutation forgets the final record whose
// last attempt is the oldest, of those no call in progress is using. When no
// record is final, the mutation fails with [ErrorCodeRecoveryLimit], outcome
// [OutcomeRejected] and status 409, and sends nothing. Sending a recorded
// request ID again needs no new place.
//
// # Pages
//
// Paginated queries also have a Pages method, an iterator that requests each
// page with a new request ID until the complete page. A page sequence that the
// authority can no longer continue yields [ErrRefreshRequired].
//
// The webhooks package verifies webhook deliveries, and the push package
// builds push notification payloads.
package convohop
