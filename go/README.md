# ConvoHop Go server SDK

`github.com/ConvoHop/sdks/go` is the Go SDK for the current Conversation and
Management APIs. Use it only in trusted backends, because it holds secret
backend keys and operator credentials. Never put a backend key in a browser,
a mobile app or any other client. No Go release is tagged yet:
[install it from a commit](#install-from-source).
License: [Apache-2.0](LICENSE).

| Package | Contents |
| --- | --- |
| `github.com/ConvoHop/sdks/go` (package `convohop`) | `ProjectClient` for your backend, `ManagementClient` for operators, errors and recovery |
| `github.com/ConvoHop/sdks/go/webhooks` | Webhook verification and typed events |
| `github.com/ConvoHop/sdks/go/push` | APNs, FCM and Web Push payload builders |

## Requirements

- Go 1.26 or later. CI tests the module on the two most recent Go releases,
  matching Go's own support policy.
- The standard library only: the module has no dependencies.
- Every method takes a `context.Context` first and returns when the call
  ends. Clients are safe for concurrent use.

## Install from source

The module is in the `go/` directory of this repository. Until Go releases
are tagged, pin a commit:

```sh
go get github.com/ConvoHop/sdks/go@<commit>
```

Go records the commit as a pseudo-version. Go releases will be tagged
`go/vX.Y.Z`; see [Releasing](../RELEASING.md).

## Application backend

Authenticate the application user before looking up its project-scoped
principal. A caller-supplied principal ID is not proof of login.

```go
import convohop "github.com/ConvoHop/sdks/go"

client, err := convohop.NewProjectClient(convohop.ProjectConfig{
	BaseURL:     communicationBase,
	ProjectID:   projectID,
	Incarnation: incarnation,
	BackendKey:  os.Getenv("CONVOHOP_BACKEND_KEY"), // Trusted secret storage only.
})
if err != nil {
	return err
}
if err := client.Initialize(ctx); err != nil {
	return err
}
principal, err := client.CreatePrincipal(ctx, convohop.CreatePrincipalRequestInput{ExternalUserID: authenticatedAccountID})
if err != nil {
	return err
}
bootstrap, err := client.IssueSession(ctx, convohop.IssueSessionRequestInput{
	PrincipalID: principal.Result.PrincipalID, DeviceID: deviceID, RequestedTTLMs: "900000",
})
if err != nil {
	return err
}
// Return only bootstrap.Result, to this user, with public project and route metadata.
```

- `BaseURL` is an HTTPS origin, or HTTP on `localhost`, `127.0.0.1` or
  `[::1]` for local development, without a path. The SDK posts to its
  unversioned `/graphql`, never follows redirects or sends cookies, and gives
  each HTTP exchange 12 seconds. `WithTimeout` changes that, and
  `WithHTTPClient` sends with a copy of your `*http.Client` that has its
  redirects and cookie jar removed.
- `Initialize` reads the project's route and checks that the project and
  incarnation are the ones you configured. Later requests carry the route's
  serving epoch. If the incarnation changed, it fails with
  `INCARNATION_MISMATCH`: recover explicitly instead of switching
  incarnations.
- `RequestedTTLMs` is the session lifetime in milliseconds; the TypeScript
  and JVM SDKs default to 15 minutes, `"900000"`. The bootstrap holds the
  user's session token, so return it only to that user.
- IDs are canonical lowercase UUIDs (`convohop.UUID`). Counters such as
  sequences, revisions and lifetimes are decimal strings
  (`convohop.Decimal`), never floating-point numbers.

[`example_test.go`](example_test.go) has this flow and the other examples
below as compiled code.

### Methods

Every operation that a backend or an operator can call is a method: the
Communication API's on `ProjectClient` and the Management API's on
`ManagementClient`. Operations that only a user session can call, and
realtime subscriptions, are in the client SDKs instead. A method returns the
authority's reply envelope, with the value in `Result`. Its doc comment gives
its idempotency, retry budget, pagination and the scope a backend key needs:

```sh
go doc github.com/ConvoHop/sdks/go ProjectClient.SendMessage
```

| `ProjectClient` methods | Backend key scope |
| --- | --- |
| `CreatePrincipal`, `GetPrincipal`, `DisablePrincipal` | `principalManage` |
| `IssueSession`, `RenewSession` | `sessionIssue` |
| `RevokeSession` | `sessionManage` |
| `SessionRequestOutcome` | `sessionIssue` and `sessionManage` |
| `CreateConversation`, `GetConversation`, `UpdateConversation` | `conversationManage` |
| `Members`, `AddMember`, `AddMembers`, `RemoveMember`, `SetBroadcastPermission`, `ConversationMute`, `SetConversationMute` | `membershipManage` |
| `HistoryGrant` | `historyManage` |
| `Messages`, `GetMessage`, `Inbox`, `Search` | `messageRead` |
| `SendMessage` | `messageWrite` |
| `EditMessage`, `DeleteMessage` | `moderation` |
| `CurrentLiveSession`, `LiveSession`, `LiveSessions`, `LiveSessionParticipants`, `LiveSessionOperation` | `callRead` or `callManage` |
| `AlertLiveSession`, `EndLiveSession` | `callManage` |
| `Capabilities`, `Route`, `ResolveRequest`, `GetOperation` | None. `ResolveRequest` reads only the key's own requests, and `GetOperation` only operations it takes part in. |
| `RedeemCredential`, `AcknowledgeCredential` | None: a delivery permit authorizes them. See [Credential delivery](#credential-delivery). |

- `Messages`, `GetMessage`, `Inbox`, `Search`, `SendMessage`,
  `ConversationMute` and `SetConversationMute` take an optional
  `ActAsPrincipalID`. Reads then see only what that member sees, sends are
  authored by it, and the authority audits both.
- Writes to an existing resource take its `ExpectedRevision`, so a stale
  write fails instead of overwriting. They include edits, deletions,
  membership and conversation updates, history grants, disabling a
  principal, renewing or revoking a session and ending a live session.
- Required input fields are values. Optional and nullable fields are
  pointers, and nil leaves them out. A nil required list or object is sent
  empty. Page sizes, such as `Limit`, must be 1 to 100.
- The SDK checks each input before sending it. An input the operation
  doesn't accept fails with `INVALID_REQUEST`, and nothing is sent.

### Pages

Each cursor-paginated query also has a `Pages` method that iterates over its
pages:

```go
member := teammatePrincipalID
for page, err := range client.MessagesPages(ctx, convohop.MessagesRequestInput{
	ConversationID: conversationID, Limit: 50, ActAsPrincipalID: &member,
}) {
	if errors.Is(err, convohop.ErrRefreshRequired) {
		break // Start again from the latest message.
	}
	if err != nil {
		return err
	}
	for _, message := range page.Items {
		// ...
	}
}
```

The iterator stops after an error. `ErrRefreshRequired` comes with the page
the authority can't continue consistently, for example after the member's
visibility changed: start again from the first page. An incomplete page must
carry a valid next cursor that advances: a sequence cursor moves in its order,
and an opaque cursor differs from every cursor already sent. Otherwise the
iterator yields an `INVALID_RESPONSE` problem in place of that page, so a
cursor cycle can't repeat pages forever.

### Errors

Every failure that the authority or the transport reports is a
`*convohop.Problem`:

```go
var problem *convohop.Problem
if errors.As(err, &problem) {
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
```

- `Code` is the stable error code. `errors.Is(err, code)` matches it, and
  the `ErrorCode` constants name the documented codes. Always handle codes
  you don't know.
- `Outcome` says what is known about the request: `rejected` means it had no
  effect, `committed` or `accepted` means it took effect, and `unknown` means
  it might have. For `unknown`, settle the same request ID with `Retry` (see
  [Recovery](#recovery)); don't send a new request.
- `Status` is the HTTP status, or 0 when no response was read. `RequestID` is
  the request's ID.
- `RetryAfter()` is how long the authority asks you to wait before sending
  the request again, for example with `RATE_LIMITED`. It comes from the
  error's `retryAfter` extension, or else from an HTTP `Retry-After` header
  given in seconds. The SDK never waits or resends because of it.
- A key without a required scope gets `SCOPE_REQUIRED`, status 403 and
  outcome `rejected`. Grant the scope instead of retrying. `Scope()` names
  the missing scope, and reports false if the authority's message has
  another wording.
- The SDK's own codes include `TRANSPORT_UNKNOWN` (no response was read:
  outcome `unknown`, or `rejected` when the context ended before the request
  was sent), `INVALID_RESPONSE` (a malformed or mismatched reply, outcome
  `unknown`) and `INVALID_REQUEST` (an input the operation doesn't accept).
  `Unwrap()` returns the cause, such as `context.DeadlineExceeded`.
- `Message` is a diagnostic for people, and never contains credentials.

Constructors return plain errors, not `*Problem`, for invalid configuration,
including invalid options. So do two recovery cases that send nothing: a new
mutation when the client's recovery records are full, and `Retry` for a
request ID the client has no record of. See [Recovery](#recovery).

## Recovery

A mutation whose outcome is `unknown` may have taken effect. Settle it under
its original request ID with `Retry`, never by sending it again under a new
one:

```go
requestID := convohop.NewRequestID() // Keep it with the work it identifies.
_, err := client.SendMessage(ctx, input, convohop.WithRequestID(requestID))
var problem *convohop.Problem
if errors.As(err, &problem) && problem.Outcome == convohop.OutcomeUnknown {
	resolution, err := client.Retry(ctx, problem.RequestID)
	if err != nil {
		return err
	}
	log.Println(resolution.State) // committed or accepted, once the authority has observed the request
}
```

- Each mutation leaves a recovery record: its request ID, operation,
  project, incarnation, input and attempts, never credentials. Its
  `ResolutionState` is `unknown` from the first attempt until the authority
  confirms the request, then `committed` or `accepted`. `WithRequestID` sets
  the request ID, and the SDK generates one otherwise. `RecoveryRecords`
  lists the records, oldest first.
- `ResolveRequest` only reads what the authority knows about a request:
  `notObservedYet`, `accepted` or `committed`.
- `Retry` reads the request's resolution and returns it if the authority
  has observed the request. Otherwise it sends the request again with its
  original ID and payload, then returns the resolution it reads afterwards.
  If the client already saw the request take effect, a `notObservedYet`
  resolution fails with `RESOLUTION_REQUIRED` instead.
- A mutation is sent at most 3 times in all, within a minute of its first
  attempt. After that it fails with `RESOLUTION_REQUIRED`: resolve it
  read-only.
- Calling the method again with the same request ID and input also sends
  the request again, within the same budget, and the authority deduplicates
  it by request ID. Concurrent calls with that ID share one attempt. Another
  operation or input under that ID fails with `IDEMPOTENCY_CONFLICT`, and
  nothing is sent.
- Records live in the client's memory unless you pass
  `WithRecoveryStore(store)`. A `RecoveryStore` keeps them under
  `convohop.requests:backend:<projectID>`, or
  `convohop.requests:management:<actorID>` for a `ManagementClient`, and its
  `Store` returns nil only once the data is durable. A client reads its key
  once, on first use, and then replaces the data on every change, so two
  clients for the same project or operator that run at the same time must
  not use the same store. `NewMemoryRecoveryStore()` keeps the records when
  you replace a client within one process, but not across a restart.
- A store failure fails the call with `RECOVERY_STORAGE_FAILURE`. A failed
  load sends nothing, has outcome `rejected` and is tried again by the next
  call. A failed write has the request's known outcome: `unknown` until the
  authority confirms the request.
- A client keeps at most 128 records. A new mutation forgets the oldest
  record whose state is `committed` or `accepted` and that no call is using.
  When there is none, the mutation fails with a plain error and sends
  nothing. Records that stay `unknown`, such as those of rejected requests,
  are never forgotten. `Retry` also fails with a plain error when the client
  has no record of the request ID.

## Management

`ManagementClient` calls the Management API's unversioned `/graphql` with
an operator access token:

```go
management, err := convohop.NewManagementClient(convohop.ManagementConfig{
	BaseURL:     managementBase,
	AccessToken: operatorToken, // Trusted secret storage only.
	ActorID:     operatorID,
}, convohop.WithRecoveryStore(requestStore))
if err != nil {
	return err
}
issued, err := management.IssueBackendKey(ctx, convohop.IssueBackendKeyRequestInput{
	ProjectID: projectID, Name: "orders-service", Scopes: scopes, ExpiresAt: expiresAt,
})
if err != nil {
	return err
}
if issued.Operation != nil {
	// Keep issued.Operation.OperationID, and poll GetOperation until the work completes.
}
```

`ActorID` is the operator's UUID, and names the client's recovery records.
`IssueBackendKey` starts a long-running operation and returns a reference
to it in `Operation`. Poll `GetOperation` with its `OperationID` until the
work completes. The key is never an ordinary result: the operation's result
names a credential `Delivery`, which hands the key over once.

### Credential delivery

1. Ask the `ManagementClient` for a permit: `CredentialPermit` with the
   project, the delivery ID and a new redemption request ID. Its `Result` is
   the permit, a `convohop.SignedProof`. Keep it in memory only.
2. Redeem the delivery with a `ProjectClient` for the project, under the
   redemption request ID. Store the capsule in `Result` in trusted secret
   storage.
3. Acknowledge the delivery with the same permit.

```go
delivery, err := convohop.NewProjectClient(convohop.ProjectConfig{
	BaseURL: communicationBase, ProjectID: projectID, Incarnation: incarnation,
})
if err != nil {
	return err
}
redeemed, err := delivery.RedeemCredential(ctx, permit, convohop.RedeemCredentialRequestInput{DeliveryID: deliveryID},
	convohop.WithRequestID(redemptionRequestID))
if err != nil {
	return err
}
// Store redeemed.Result in trusted secret storage, then acknowledge the delivery.
_, err = delivery.AcknowledgeCredential(ctx, permit, convohop.AcknowledgeCredentialRequestInput{DeliveryID: deliveryID})
```

- `RedeemCredential` and `AcknowledgeCredential` send the permit instead of
  a bearer credential, so the client needs no backend key. The SDK checks
  the permit's shape before sending it. A client without a backend key
  fails every other method with `UNAUTHENTICATED`, and sends nothing.
- When a redemption's outcome is `unknown`, ask for a new permit for the
  same redemption request ID and redeem again under that ID, within the
  retry budget. `Retry` can't settle it: a permit doesn't authorize looking
  the request up, so `Retry` fails with `CREDENTIAL_REQUIRED`.
- Recovery records never hold the permit or the capsule.

## Webhooks

`webhooks.Verify` checks a delivery and returns its event. ConvoHop signs
deliveries with the Standard Webhooks symmetric `v1` scheme.

```go
import "github.com/ConvoHop/sdks/go/webhooks"

http.HandleFunc("POST /convohop/webhooks", func(w http.ResponseWriter, r *http.Request) {
	// Verify rejects bodies over 4096 bytes, so read no more.
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	delivery, err := webhooks.Verify(body, r.Header, webhookSecrets)
	var failure *webhooks.Error
	if errors.As(err, &failure) {
		w.WriteHeader(http.StatusBadRequest)
		return
	} else if err != nil {
		w.WriteHeader(http.StatusInternalServerError) // Invalid options: fix your configuration.
		return
	}
	queue.AddOnce(delivery.WebhookID, delivery.Event) // Process after responding.
	w.WriteHeader(http.StatusNoContent)
})
```

Respond `2xx` within 5 s, then process; de-duplicate on `webhook-id`.
Delivery is at least once. Retries and replays keep the `webhook-id`. One
event delivered to two endpoints has the same event ID and different
`webhook-id` values.

- Pass the body exactly as received, never re-serialized JSON. One leading
  UTF-8 byte order mark is ignored when the event is parsed.
- Pass the request's `http.Header`. Names match case-insensitively, and a
  repeated `webhook-id`, `webhook-timestamp` or `webhook-signature` fails.
- Pass every `whsec_` secret you hold. ConvoHop signs with the current
  secret, with the next secret while a rotation is pending (at most 5
  minutes), and with the replaced secret for 24 hours after the rotation. A
  `v1` entry that matches any secret is accepted. Entries with other version
  prefixes are ignored.
- `WithTolerance` sets the allowed clock distance, a non-negative whole
  number of seconds; `DefaultTolerance` is 5 minutes. `WithClock` replaces
  `time.Now`. An invalid option fails with a plain error, not a
  `*webhooks.Error`.

Every event has `EventID`, `EventType`, `OccurredAt`, `ProjectID` and
`SubjectRef`. `Known` reports whether this SDK knows the event type. An
event it doesn't know never makes verification fail, so acknowledge it:

- Resource events, such as `webhooks.EventMessageCreated`: a change to a
  conversation, member, message, receipt or call. They carry only metadata,
  so fetch the content through the API.
- `webhooks.EventNotificationMessage`, `EventNotificationCall` and
  `EventNotificationCallCancelled`: per-recipient notification events, for
  your [push notifications](#push-payloads). `Notification` holds their
  fields. A notification event that doesn't match the
  [push payload contract](../spec/push-payload/README.md) has a nil
  `Notification` and `Known` false.
- `webhooks.EventWebhookEndpointDisabled`: another of the project's
  endpoints was disabled after repeated failures.

`webhooks.VerifySignature` checks only the headers, timestamp and signature,
for bodies you parse yourself. A failed check returns a `*webhooks.Error`,
and `errors.Is(err, webhooks.CodeTimestampExpired)` matches its `Code`.
Checks run in this order, and `Code` names the first one that failed. The
message never contains secrets, signatures or the body.

| Code | Cause |
| --- | --- |
| `INVALID_SECRET` | No secret, or a secret that isn't `whsec_` followed by padded standard Base64 of 24 to 64 bytes. Fix your configuration. |
| `MISSING_HEADER` | `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty. |
| `INVALID_HEADER` | One of those headers is repeated. |
| `INVALID_TIMESTAMP` | `webhook-timestamp` isn't 1 to 15 digits of Unix seconds. |
| `TIMESTAMP_EXPIRED` | The timestamp is more than the tolerance before now. |
| `TIMESTAMP_FUTURE` | The timestamp is more than the tolerance after now. |
| `BODY_TOO_LARGE` | The body is over 4096 bytes. |
| `TOO_MANY_SIGNATURES` | `webhook-signature` has more than 8 entries. ConvoHop sends 1 to 3. |
| `NO_MATCHING_SIGNATURE` | No `v1` entry matches any secret. |
| `INVALID_BODY` | `Verify` only: the signed body isn't a UTF-8 JSON event envelope. |

## Push payloads

ConvoHop doesn't send push notifications for you
([bring your own](../docs/sdk-strategy.md#push-notifications-bring-your-own)).
The `push` package builds APNs, FCM and Web Push requests from a
notification event, following the
[push payload contract](../spec/push-payload/README.md). The builders hold
no credentials and send nothing: your push library adds the device token and
the provider's authorization, encrypts and VAPID-signs Web Push messages,
and sends them. Subscribe a webhook endpoint to `notification.message`,
`notification.call` and `notification.callCancelled`, and de-duplicate on
the event ID.

```go
import "github.com/ConvoHop/sdks/go/push"

n := delivery.Event.Notification
if n == nil {
	return nil // Not a notification event.
}
title := push.WithTitle(displayName(n.SenderID))
// A CallKit app gets incoming calls as VoIP pushes, and every other notification as an alert.
request, err := push.APNSVoIP(n, bundleID, title)
if err == nil && request == nil {
	request, err = push.APNSAlert(n, bundleID, title)
}
if err != nil || request == nil {
	return err // Nothing to send for nil.
}
// Send request.Headers and request.Payload, as they are, to /3/device/<token>.
```

Each builder returns a request, or nil and no error when the event doesn't
apply to its platform or is stale. Send nothing for nil. A message or a
missed call is stale a day after it occurred, and a call or another
cancellation at its `expiresAt`.

| Builder | Request | Nil for | Limit (bytes) |
| --- | --- | --- | --- |
| `APNSAlert(event, bundleID, options...)` | APNs `Headers` and `Payload` for an alert | Stale events, and a `notification.callCancelled` that isn't a missed call | 4096 of the payload |
| `APNSVoIP(event, bundleID, options...)` | APNs headers and payload for a PushKit VoIP push, on the `<bundleID>.voip` topic | Stale calls, and every event but `notification.call` | 5120 of the payload |
| `FCM(event, options...)` | The body of an FCM HTTP v1 `messages:send` request without a target, with Android options. Add the target, such as `token`. | Stale events | 4096 of the data |
| `WebPush(event, options...)` | RFC 8030 headers (`TTL`, `Urgency` and `Topic`) and a payload for your library to encrypt | Stale events | 3993 of the payload, the RFC 8291 plaintext limit |

`WithTitle` and `WithBody` set the visible text, such as the sender's name.
A message event's opted-in preview becomes the body when you set no body,
unless you pass `WithoutPreview`. `WithClock` replaces `time.Now`. The
requests carry metadata only unless you set text or the event carries a
preview, set lifetimes and collapse keys from the event, and shorten text
that doesn't fit. Payloads are canonical JSON: send their bytes as they
are, because re-encoding them with `encoding/json`, which escapes `<`, `>`
and `&`, can grow them past the limit. See the
[push payload contract](../spec/push-payload/README.md) for the rules, and
[Calls on iOS](../spec/push-payload/README.md#calls-on-ios) for why VoIP
pushes are for `notification.call` only.

A builder that can't build a request returns a `*push.Error` whose message
names the field but never contains its value. `INVALID_OPTIONS`, checked
first, is a nil option, a title or body that isn't valid UTF-8, a nil clock
or an invalid bundle ID. `INVALID_EVENT` is an event that doesn't match the
contract. `Notification` has JSON tags and a `Validate` method, so you can
decode and check a notification event that you stored or received another
way.

## Not included

- The defaults of `@convohop/server`'s helpers, such as a 15-minute session
  lifetime and local deployment and project configuration. Pass every
  input; [Methods](#methods) has the rules.
- The checks that `@convohop/server`'s `sessionRequestOutcome` helper adds.
  `SessionRequestOutcome` checks its reply's types like every method, but
  not the reply's fields against each other or against the recovery
  records.
- Realtime subscriptions and native media, which user sessions use through
  the client SDKs.

## Build and test

```sh
cd go
gofmt -l .                                  # Lists unformatted files: expect none
go vet ./...
CONVOHOP_REQUIRE_SPEC=1 go test -race ./...
```

The tests read the shared vectors in [`../spec`](../spec). They skip those
tests when the module is copied without the repository, unless
`CONVOHOP_REQUIRE_SPEC=1`, as in CI. To run the
[conformance suite](../spec/conformance/README.md) with the Go driver, from
the repository root:

```sh
go -C conformance/drivers/go build -o build/conformance-driver .
npm run conformance -- --driver conformance/drivers/go/build/conformance-driver
```

The `*_gen.go` files are generated from the schemas: never edit them. From
the repository root, `npm run generate:graphql` regenerates them and
`npm run check:graphql` checks them. See
[SDK generation](../docs/sdk-generation.md).

| Path | Contents |
| --- | --- |
| `*.go` | The hand-written runtime: clients, transport, validation, recovery, pages and errors |
| `*_gen.go` | Generated types, the operation catalog and one method per operation |
| `webhooks/` | Webhook verification and events |
| `push/` | The push payload builders |
| `internal/contract/` | The push payload contract's value rules, shared by `webhooks` and `push` |
| `internal/spectest/` | Reads the shared vectors in `../spec` in tests |
| [`../conformance/drivers/go`](../conformance/drivers/go) | The conformance driver |
