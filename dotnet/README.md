# ConvoHop .NET server SDK

`ConvoHop` is the .NET SDK for the current Conversation and Management APIs.
Use it only in trusted .NET backends, because it holds secret backend keys
and operator credentials. Never put it, or a backend key, in a MAUI, Blazor
WebAssembly, Unity or other client app. It isn't on NuGet yet:
[build it from source](#install-from-source). The
[.NET docs](../docs/site/dotnet/index.md) have quickstarts with tested code
and the API reference. License: [Apache-2.0](../LICENSE).

## Requirements

- The package has `netstandard2.0` and `net10.0` assets. CI runs the tests on
  .NET 8, 9 and 10. The `netstandard2.0` asset should also run on .NET
  Framework 4.7.2 or later, but that isn't tested.
- The `net10.0` asset has no dependencies. The `netstandard2.0` asset
  depends on `System.Text.Json`, `Microsoft.Bcl.AsyncInterfaces` and
  `Microsoft.Bcl.TimeProvider`. JSON uses `System.Text.Json` source
  generation, never reflection or Newtonsoft.Json.
- Nullable reference types are enabled and annotated throughout. Every
  method that sends a request is asynchronous and takes a
  `CancellationToken`. Clients are safe for concurrent use.

## Install from source

Building needs the .NET 10 SDK that [`global.json`](../global.json) selects.
From the repository root, pack the library into a folder:

```sh
dotnet pack dotnet/src/ConvoHop -c Release -o "$PWD/dotnet/artifacts"
```

Then, from your own project's directory, add that folder as a package source
and add the package. `dotnet nuget add source` writes to the closest
`NuGet.config` above the current directory, or to your user-wide one. If
your configuration uses package source mapping, also map `ConvoHop` to the
new source.

```sh
dotnet nuget add source /path/to/sdks/dotnet/artifacts --name convohop-local
dotnet add package ConvoHop --version 0.1.0
```

The build is deterministic and has Source Link, so debuggers can step into
the matching source. Its symbols are in `ConvoHop.0.1.0.snupkg`.

## Application backend

Authenticate the application user before looking up its project-scoped
principal. A caller-supplied principal ID is not proof of login.

```csharp
using ConvoHop;
using ConvoHop.Models;

var server = new ProjectServerClient(new ProjectServerClientOptions
{
    BaseUrl = communicationBase,
    ProjectId = projectId,
    Incarnation = incarnation,
    BackendKey = backendKey, // Trusted secret storage only.
});
await server.InitializeAsync(cancellationToken);
Principal principal = await server.Principals.CreateAsync(authenticatedAccountId, cancellationToken: cancellationToken);
SessionBootstrap bootstrap = await server.Sessions.IssueAsync(principal.PrincipalId, deviceId,
    cancellationToken: cancellationToken);
// Return only this user's bootstrap and public project and route metadata.
```

- `BaseUrl` is an HTTPS origin, or HTTP on a loopback host for local
  development. The SDK posts to its unversioned `/graphql`, never follows
  redirects, and gives each request 12 seconds. To pass your own
  `HttpClient`, create it from an `HttpClientHandler` or
  `SocketsHttpHandler` with `AllowAutoRedirect = false`.
- `InitializeAsync()` reads the project's route and checks that the project
  and incarnation are the ones you configured. Later requests carry the
  route's serving epoch. If the incarnation changed, it throws
  `InvalidOperationException`: recover explicitly instead of switching
  incarnations. Call it again after `WRONG_REGION`.
- `Principals` creates, reads and disables principals. `Sessions` issues,
  renews and revokes user sessions, and `GetOutcomeAsync` reads what became
  of an original issue or renewal request. A session lasts 15 minutes unless
  you ask for another lifetime. Its bootstrap holds the user's session
  token, so return it only to that user.
- IDs are canonical UUIDs. Counters such as sequences, revisions and
  lifetimes are decimal strings, never floating-point numbers.
- `TimeProvider` sets the clock for retry budgets, timeouts and polling.

### Conversations

`Conversations.CreateAsync(input)` creates a conversation, and
`server.Conversation(id)` returns a handle that sends nothing until you call
it. The helpers check that each reply names the resource the request did,
and throw `INVALID_RESPONSE` instead of returning a mismatch.

```csharp
ServerConversation conversation = server.Conversation(conversationId);
MessageAck sent = await conversation.Messages.SendAsync("Your order shipped.", cancellationToken: cancellationToken);
await conversation.Members.AddAsync(principalId, "member", expectedRevision, cancellationToken: cancellationToken);
```

Each helper needs the backend-key scope listed:

| Method | Operation | Scope |
| --- | --- | --- |
| `InitializeAsync()` | `route` | None |
| `GetCapabilitiesAsync()` | `capabilities` | None |
| `Requests.ResolveAsync(requestId)` | `resolveRequest` | None |
| `GetOperationAsync(operationId)` | `getOperation` | None |
| `Principals.CreateAsync`, `GetAsync`, `DisableAsync` | `createPrincipal`, `getPrincipal`, `disablePrincipal` | `principalManage` |
| `Sessions.IssueAsync`, `RenewAsync` | `issueSession`, `renewSession` | `sessionIssue` |
| `Sessions.RevokeAsync` | `revokeSession` | `sessionManage` |
| `Sessions.GetOutcomeAsync(requestId)` | `sessionRequestOutcome` | `sessionIssue` and `sessionManage` |
| `Conversations.CreateAsync`, `Conversation(id).GetAsync`, `UpdateAsync` | `createConversation`, `getConversation`, `updateConversation` | `conversationManage` |
| `Conversation(id).Members.ListAsync`, `AddAsync`, `AddBatchAsync`, `RemoveAsync`, `SetBroadcastPermissionAsync`, `GetMuteAsync`, `SetMuteAsync` | `members`, `addMember`, `addMembers`, `removeMember`, `setBroadcastPermission`, `conversationMute`, `setConversationMute` | `membershipManage` |
| `Conversation(id).Members.GrantHistoryAsync` | `historyGrant` | `historyManage` |
| `Conversation(id).Messages.ListAsync`, `GetAsync`, `GetInboxAsync`, `SearchAsync` | `messages`, `getMessage`, `inbox`, `search` | `messageRead` |
| `Conversation(id).Messages.SendAsync` | `sendMessage` | `messageWrite` |
| `Conversation(id).Messages.EditAsync`, `DeleteAsync` | `editMessage`, `deleteMessage` | `moderation` |
| `Conversation(id).Live.GetCurrentAsync`, `ListHistoryAsync`, `LiveSession(id).GetAsync`, `ListParticipantsAsync`, `LiveOperation(id).GetAsync`, `WaitForCompletionAsync` | `currentLiveSession`, `liveSessions`, `liveSession`, `liveSessionParticipants`, `liveSessionOperation` | `callRead` or `callManage` |
| `LiveSession(id).AlertAsync`, `EndAsync` | `alertLiveSession`, `endLiveSession` | `callManage` |

- Every mutation takes an optional request ID. Pass the same ID to repeat a
  mutation safely (see [Recovery](#recovery)).
- Edits, deletions, membership and session changes take the expected
  revision, so a stale write fails instead of overwriting. Live commands
  take the `expectedGeneration` and `expectedRevision` you observed.
- Message reads and sends, and `SearchAsync`, take an optional `actAs`
  member principal: reads then see what that member sees, sends are
  authored by it, and the authority audits both. `GetInboxAsync` always
  reads as one member. Without `actAs`, `SearchAsync` needs
  `conversationIds`.
- `LiveSession(id).EndAsync` returns its operation.
  `WaitForCompletionAsync` returns only after the authority reports the
  media cutoff as enforced. Its timeout throws `RESOLUTION_REQUIRED`, which
  isn't a cutoff.
- `GetMuteAsync` and `SetMuteAsync` act as the named member. A mute stops
  that member's `notification.message` events until you unmute it or its
  optional `until` time passes. Calls still ring a muted member.

### Errors

Failures are `ConvoHopException`.

- `Code` is the stable error code, such as `RATE_LIMITED`. Always handle
  codes you don't know.
- `Outcome` says what is known about the request: `rejected` means it had no
  effect, `committed` or `accepted` means it took effect, and `unknown` means
  it might have. For `unknown`, resolve or retry the same request ID (see
  [Recovery](#recovery)); don't send a new request.
- `Status` is the HTTP status, or 0 when no response arrived. `RequestId` is
  the request's ID.
- `RetryAfter` is how long the authority asks you to wait before resending,
  for example with `RATE_LIMITED`, or null. It comes from the error's
  `retryAfter` extension, or else from an HTTP `Retry-After` header given in
  seconds. The SDK never waits or resends because of it.
- A key without a required scope gets `ScopeRequiredException`, with code
  `SCOPE_REQUIRED`, status 403 and outcome `rejected`. Grant the scope
  instead of retrying. `Scope` names the missing scope, or is null if the
  authority's message has another wording. `FORBIDDEN` remains for other
  authorization failures.
- The SDK's own codes include `TRANSPORT_UNKNOWN` (no response, outcome
  `unknown`), `INVALID_RESPONSE` (a malformed or mismatched reply, outcome
  `unknown`) and `INVALID_REQUEST` (an input the operation doesn't accept).
- Messages never contain credentials.

Cancelling a call throws `OperationCanceledException`. A cancelled mutation
might still take effect, so pass your own request ID to mutations you might
cancel, and resolve or retry that ID afterwards.

Invalid arguments throw `ArgumentException`, `ArgumentNullException` or
`ArgumentOutOfRangeException` before anything is sent.

## Generated APIs and pages

`server.Communication` and `managementClient.Management` reach every
operation of their plane, with generated input and reply classes in
`ConvoHop.Models`. They're generated from the [schemas](../schema) with the
other SDKs, so they always cover operations that have no helper. Unlike the
helpers, they don't check that a result names the resource you asked for.

Each cursor-paginated query also gets a `…PagesAsync` method:
`MembersPagesAsync`, `MessagesPagesAsync`, `InboxPagesAsync`,
`SearchPagesAsync`, `LiveSessionsPagesAsync` and
`LiveSessionParticipantsPagesAsync`. It returns a lazy
`IAsyncEnumerable` of pages.

```csharp
var input = new MembersRequestInput(conversationId, limit: 100);
await foreach (MemberPage page in server.Communication.MembersPagesAsync(input).WithCancellation(cancellationToken))
{
    foreach (Member member in page.Items) Sync(member);
}
```

- Nothing is sent until you enumerate, and each enumeration starts again
  from the input as it was when you called the method. Each page is a new
  request with a new request ID.
- Enumeration ends after a page with `Complete` set.
- A page with `RefreshRequired` set ends enumeration with an
  `InvalidOperationException`. The authority wants an authorized
  resynchronization, so start again from a fresh read instead of resuming
  from the cursor.
- An incomplete page must have a next cursor that differs from the current
  one. `MessagesPagesAsync` pages backward, so its next `BeforeSequence` must
  be smaller. Otherwise enumeration fails with `INVALID_RESPONSE`, and keeps
  failing.
- `await foreach` stops at the first exception. If you drive the enumerator
  yourself and a request fails, for example with `RATE_LIMITED`, it keeps
  its position, so the next `MoveNextAsync()` requests the same page again.

## Recovery

Each mutation keeps a recovery record with its request ID, payload and
incarnation. When a mutation's outcome is `unknown`, don't send a new
request:

```csharp
RequestResolution resolution = await server.Requests.RetryAsync(exception.RequestId, cancellationToken);
```

- `Requests.ResolveAsync(id)` only reads what the authority knows about a
  request: `notObservedYet`, `accepted` or `committed`.
- `Requests.RetryAsync(id)` resolves a request this client recorded, then
  resends it with its original ID and payload only if the authority hasn't
  observed it. A mutation is sent at most three times in all, within a
  minute of its first attempt. After that `RetryAsync` throws
  `RESOLUTION_REQUIRED`.
- Reusing a request ID with another operation or payload fails with
  `IDEMPOTENCY_CONFLICT` before anything is sent.
- Records live in the client's memory. To keep them across restarts, set
  `RecoveryStorage` in the options to an `IRecoveryStorage` whose
  `SetItemAsync` completes only once the value is durable, and throws
  otherwise. The mutation then fails with `RECOVERY_STORAGE_FAILURE`.
  Records hold request inputs, never credentials.
  `InMemoryRecoveryStorage` survives client re-creation but not restarts.
  `server.Transport.GetRecoveryStatesAsync()` lists the records.

## Webhooks

`Webhooks.Verify` checks a delivery and returns its event. ConvoHop signs
deliveries with the Standard Webhooks symmetric `v1` scheme.

```csharp
using ConvoHop;

// In an ASP.NET Core minimal API.
app.MapPost("/webhooks/convohop", async (HttpRequest request, CancellationToken cancellationToken) =>
{
    // Read one byte over the limit, so a larger body fails as BodyTooLarge.
    var body = new byte[4097];
    int length = 0, read;
    while (length < body.Length && (read = await request.Body.ReadAsync(body.AsMemory(length), cancellationToken)) > 0)
        length += read;
    VerifiedWebhookDelivery delivery;
    try
    {
        delivery = Webhooks.Verify(WebhookHeaders.From(request.Headers), body.AsSpan(0, length), webhookSecrets);
    }
    catch (WebhookVerificationException)
    {
        return Results.BadRequest();
    }
    queue.AddOnce(delivery.WebhookId, delivery.Event); // Process after responding.
    return Results.NoContent();
});
```

Respond `2xx` within 5 s, then process; de-duplicate on `webhook-id`.
Delivery is at least once. Retries and replays keep the `webhook-id`. One
event delivered to two endpoints has the same event ID and different
`webhook-id` values.

- `WebhookHeaders.From` adapts ASP.NET Core's `request.Headers`,
  `HttpHeaders`, a dictionary, or a lookup function. Names match
  case-insensitively.
- The body is the exact bytes received, or a string that is their exact
  UTF-8 decoding. Never re-serialize it.
- Pass every `whsec_` secret you hold. ConvoHop signs with the current
  secret, with the next secret while a rotation is pending (at most 5
  minutes), and with the replaced secret for 24 hours after the rotation. A
  `v1` entry that matches any secret is accepted. Entries with other version
  prefixes are ignored.
- `toleranceSeconds` defaults to 300, and `now` to the current time.

Every event has `EventId`, `EventType`, `OccurredAt`, `ProjectId` and
`SubjectRef`. Check the subclass:

- `WebhookResourceEvent`: a change to a conversation, member, message,
  receipt or call. It carries only metadata, so fetch the content through
  the API.
- `WebhookMessageNotificationEvent`, `WebhookCallNotificationEvent` and
  `WebhookCallCancelledNotificationEvent`: per-recipient notification events,
  all `WebhookNotificationEvent`, for your [push notifications](#push-payloads).
- `WebhookEndpointDisabledEvent`: another of the project's endpoints was
  disabled after repeated failures.
- `WebhookUnknownEvent`: an event type this SDK doesn't know, or a
  notification event that doesn't match the
  [push payload contract](../spec/push-payload/README.md). It never makes
  verification fail, so acknowledge it.

`Webhooks.VerifySignature` checks only the headers, timestamp and signature,
for bodies you parse yourself. A failed check throws
`WebhookVerificationException`. Checks run in this order, and `Code` names
the first one that failed. The message never contains secrets, signatures
or the body.

| Code | Cause |
| --- | --- |
| `InvalidSecret` | No secret, or a secret that isn't `whsec_` followed by padded standard Base64 of 24 to 64 bytes. Fix your configuration. |
| `MissingHeader` | `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty. |
| `InvalidHeader` | One of those headers has more than one value. |
| `InvalidTimestamp` | `webhook-timestamp` isn't 1 to 15 digits of Unix seconds. |
| `TimestampExpired` | The timestamp is more than the tolerance before now. |
| `TimestampFuture` | The timestamp is more than the tolerance after now. |
| `BodyTooLarge` | The body is over 4096 bytes. |
| `TooManySignatures` | `webhook-signature` has more than 8 entries. ConvoHop sends 1 to 3. |
| `NoMatchingSignature` | No `v1` entry matches any secret. |
| `InvalidBody` | `Verify` only: the signed body isn't a UTF-8 JSON event envelope. |

## Push payloads

ConvoHop doesn't send push notifications for you
([bring your own](../docs/sdk-strategy.md#push-notifications-bring-your-own)).
`PushPayloads` builds APNs, FCM and Web Push requests from a notification
event, following the [push payload contract](../spec/push-payload/README.md).
The builders hold no credentials and send nothing: your push library adds the
device's token or FID and the provider's authorization, encrypts and
VAPID-signs Web Push messages, and sends them. Subscribe a webhook endpoint
to `notification.message`, `notification.call` and
`notification.callCancelled`, and de-duplicate on the event ID.

```csharp
using ConvoHop;

var options = new ApnsPushOptions(bundleId) { Title = DisplayName(notification.SenderId) };
// A CallKit app gets incoming calls as VoIP pushes. ApnsVoip returns null for other events.
ApnsVoipRequest? voip = PushPayloads.ApnsVoip(notification, options);
ApnsAlertRequest? alert = voip == null ? PushPayloads.ApnsAlert(notification, options) : null;
```

Each builder returns a request, or null when the event doesn't apply to its
platform or is stale. Send nothing for null.

| Builder | Request | Null for | Limit (bytes) |
| --- | --- | --- | --- |
| `ApnsAlert(notification, apnsOptions)` | APNs `Headers` and `PayloadJson` for an alert | A `notification.callCancelled` that isn't a missed call | 4096 of the payload |
| `ApnsVoip(notification, apnsOptions)` | APNs headers and payload for a PushKit VoIP push, on the `<bundleId>.voip` topic | Every event but `notification.call` | 5120 of the payload |
| `Fcm(notification[, options])` | `MessageJson`, an FCM HTTP v1 message without a target, with Android options. Add `token` or `fid`, or use `Data` and `Android` with the Firebase Admin SDK. | Stale events only | 4096 of the data |
| `WebPush(notification[, options])` | RFC 8030 `Headers` (`TTL`, `Urgency` and `Topic`) and a `PayloadJson` for your library to encrypt | Stale events only | 3993 of the payload, the RFC 8291 plaintext limit |

`PushOptions` sets the visible `Title` and `Body`, such as the sender's
name, whether a message event's opted-in preview becomes the body when you
set no body (`Preview`, true by default), and the clock (`Now`).
`ApnsPushOptions` adds the app's `BundleId`. The requests carry metadata
only unless you set text or the event carries a preview, set lifetimes and
collapse keys from the event, and shorten text that doesn't fit. See the
[push payload contract](../spec/push-payload/README.md) for the rules, and
[Calls on iOS](../spec/push-payload/README.md#calls-on-ios) for why VoIP
pushes are for `notification.call` only.

An FCM message goes to the target that the Android app registered: its
registration `token` by default, or its `fid`, the Firebase Installation ID,
when the app's manifest sets `firebase_messaging_installation_id_enabled`.
The Firebase Admin SDK for .NET, `FirebaseAdmin`, sends to a FID from
[3.6.0](https://github.com/firebase/firebase-admin-dotnet/releases/tag/v3.6.0),
with `Message.Fid`. From that version, `Message.Token` is obsolete (warning
CS0618) and still sends.

Invalid options throw `PushPayloadException` with code `InvalidOptions`.
Each builder also takes a `JsonElement`, to validate a notification event you
stored or received another way; one that doesn't match the contract throws
`InvalidEvent`.

## Management and credential delivery

`ConvoHopManagementClient` uses the Management origin's unversioned
`/graphql` with an authorized operator access token.

```csharp
using ConvoHop;

var management = new ConvoHopManagementClient(new ConvoHopManagementClientOptions
{
    BaseUrl = managementBase,
    ActorId = operatorId,
    AccessToken = operatorToken,
    RecoveryStorage = privateRequestStorage,
});
Organization organization = await management.CreateOrganizationAsync("Local team", termsRef, cancellationToken: cancellationToken);
CreateDeploymentReply accepted = await management.CreateDeploymentAsync(organization.OrgId, cancellationToken: cancellationToken);
// Keep accepted's operation ID and poll management.GetOperationAsync(id).
```

- Only a loopback origin may omit the deployment and project configuration.
  For a hosted origin, pass `DeploymentOptions` (the reviewed `Offering`,
  `GeoId`, `InstallationProfileId` and `ConsentRef`) to
  `CreateDeploymentAsync`, and `ProjectOptions` (`Environment` and
  `BackendPrincipalName`) to `CreateProjectAsync`. Without them, they throw
  `ArgumentException` before sending anything.
- Accepted management work has a durable operation ID, not a completion
  task. Wait until a deployment or project is ready before you use it.
- `CreateProjectAsync`, `IssueBackendKeyAsync` and `GetDeliveryPermitAsync`
  complete the provisioning flow. `management.Management` reaches every
  other management operation.

A backend key is handed over once, through credential delivery, never as an
ordinary result. Redeem the delivery with a `ConvoHopTransport` that has no
`Credential`, passing the permit from `GetDeliveryPermitAsync`:

```csharp
using ConvoHop;
using ConvoHop.Models;

var delivery = new ConvoHopTransport(new ConvoHopTransportOptions
{
    BaseUrl = communicationBase,
    Namespace = "credential-delivery:" + projectId,
    Incarnation = incarnation,
});
RedeemCredentialReply reply = await delivery.ExecuteAsync(Operations.Communication.RedeemCredential, projectId,
    new RedeemCredentialRequestInput(deliveryId), redemptionRequestId, permit, cancellationToken);
// Store the key in trusted secret storage before you acknowledge the delivery.
```

The permit authorizes both redemption and `acknowledgeCredential`. It isn't
saved with the request. After an `unknown` outcome, get a fresh permit and
resend with the same original request ID within its remaining retry budget.
A permit can't authorize request lookup, so `RetryAsync` on that transport
throws `CREDENTIAL_REQUIRED`.

## Build and test

From the repository root, with the .NET 10 SDK that
[`global.json`](../global.json) selects:

```sh
dotnet build dotnet/ConvoHop.slnx -c Release -maxcpucount:2
dotnet test dotnet/test/ConvoHop.Tests -c Release --no-build -f net10.0
dotnet pack dotnet/src/ConvoHop -c Release -o dotnet/artifacts
```

The tests target .NET 8, 9 and 10. `net8.0` and `net9.0` test the library's
`netstandard2.0` build and `net10.0` tests its `net10.0` build. Without `-f`,
`dotnet test` runs all three, so it needs the .NET 8 and 9 runtimes as well.
`dotnet pack` writes the package and its symbol package, with Source Link,
to `dotnet/artifacts`. Nothing here pushes them to a feed. CI packs twice
from clean builds, with `-p:DeterministicTimestamp` set to the commit time,
and checks that the packages are byte-identical.

To run the [conformance suite](../spec/conformance/README.md) with the .NET
driver:

```sh
npm ci
dotnet build conformance/drivers/dotnet -c Release
npm run conformance -- --driver "dotnet conformance/drivers/dotnet/bin/Release/net10.0/ConvoHop.Conformance.dll"
```

The driver in `bin/Release/net8.0/` runs the `netstandard2.0` build on the
.NET 8 runtime.

Two projects outside `dotnet/` serve the
[.NET docs](../docs/site/dotnet/index.md):
`tools/docgen/extractors/dotnet` reads the SDK's public API from its sources
for the [docs pipeline](../docs/docs-pipeline.md), and
`docs/languages/dotnet/examples` holds the code that the docs include, with
tests on .NET 8 and 10. The tests start the conformance mock, so they need
Node.js 22 or later and `npm ci` at the repository root. After you change the
public API or its doc comments, from the repository root:

```sh
npm run extract:docs -- dotnet          # refresh docs/languages/dotnet/surface.json
npm run generate:docs                   # regenerate docs/site
npm run test:docs -- --install dotnet   # restore, build and run the docs examples
```

`src/ConvoHop/Generated` holds code generated from the schemas: never edit
it. `npm run generate:graphql` regenerates it and `npm run check:graphql`
checks it. See [SDK generation](../docs/sdk-generation.md).

| Path | Contents |
| --- | --- |
| `src/ConvoHop` | The hand-written runtime: clients, transport, recovery, errors, webhooks and push |
| `src/ConvoHop/Generated` | Generated models, the operation catalog and one API class per plane |
| `test/ConvoHop.Tests` | xUnit tests, with the fake authority and fixtures in `TestSupport` |
| `test/ConvoHop.SdkgenEdge`, `test/ConvoHop.SdkgenEdge.AllLayers` | Compile the generator's edge-case golden output against the runtime |
| [`../conformance/drivers/dotnet`](../conformance/drivers/dotnet) | The conformance driver |
| [`../tools/docgen/extractors/dotnet`](../tools/docgen/extractors/dotnet) | The docs pipeline's surface extractor, built on Roslyn, and its xUnit tests |
| [`../docs/languages/dotnet`](../docs/languages/dotnet) | The .NET docs' pages, their tested examples and the extracted surface |
