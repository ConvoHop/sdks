# ConvoHop Java and Kotlin server SDK

`com.convohop:convohop-server` is the Java SDK for the current Conversation
and Management APIs. `com.convohop:convohop-server-kotlin` adds coroutine
extensions to it. Use them only in trusted JVM backends, because they hold
secret backend keys and operator credentials. Never put them, or a backend
key, in an Android app or any other client. They aren't published to a
package registry yet: [build them from source](#install-from-source).
The [Java and Kotlin docs](../docs/site/jvm/index.md) have quickstarts with
tested code and the API reference. License: [Apache-2.0](../LICENSE).

## Requirements

- Java 11 or later. CI runs the tests on Java 11, 17, 21 and 25.
- `convohop-server` uses the JDK's `java.net.http.HttpClient` and its own
  JSON codec. Its only dependency is the [JSpecify](https://jspecify.dev)
  nullness annotations, and every package is `@NullMarked`, so Kotlin sees
  exact nullability.
- `convohop-server-kotlin` adds `kotlinx-coroutines-core` and needs Kotlin
  2.2 or later.
- Calls block the calling thread. Clients are safe for concurrent use.

## Install from source

Building needs JDK 17. The build emits Java 11 bytecode.

```sh
cd jvm
./gradlew publishToMavenLocal
```

Then add the local repository to your Gradle build:

```kotlin
repositories {
    mavenLocal()
    mavenCentral()
}

dependencies {
    implementation("com.convohop:convohop-server:0.1.0-SNAPSHOT")
    // Optional, for coroutines.
    implementation("com.convohop:convohop-server-kotlin:0.1.0-SNAPSHOT")
}
```

The Maven group might change to `io.github.convohop` before the first
release. The Java and Kotlin package names stay `com.convohop.server`.

## Application backend

Authenticate the application user before looking up its project-scoped
principal. A caller-supplied principal ID is not proof of login.

```java
import com.convohop.server.ProjectServerClient;
import com.convohop.server.model.SessionBootstrap;

ProjectServerClient server = ProjectServerClient.builder()
    .baseUrl(communicationBase)
    .projectId(projectId)
    .incarnation(incarnation)
    .backendKey(backendKey) // Trusted secret storage only.
    .build();
server.initialize();
String principalId = server.principals().create(authenticatedAccountId).getPrincipalId();
SessionBootstrap bootstrap = server.sessions().issue(principalId, deviceId);
// Return only this user's bootstrap and public project and route metadata.
```

- `baseUrl` is an HTTPS origin, or HTTP on a loopback host for local
  development. The SDK posts to its unversioned `/graphql`, never follows
  redirects, and gives each request 12 seconds. To pass your own
  `HttpClient`, configure it with `HttpClient.Redirect.NEVER`.
- `initialize()` reads the project's route and checks that the project and
  incarnation are the ones you configured. Later requests carry the route's
  serving epoch. If the incarnation changed, it throws
  `IllegalStateException`: recover explicitly instead of switching
  incarnations.
- `principals()` creates, reads and disables principals. `sessions()`
  issues, renews and revokes user sessions. A session lasts 15 minutes unless
  you ask for another lifetime. Its bootstrap holds the user's session token,
  so return it only to that user.
- IDs are canonical UUIDs. Counters such as sequences, revisions and
  lifetimes are decimal strings, never floating-point numbers.

### Conversations

`conversations().create(input)` creates a conversation, and
`server.conversation(id)` returns a handle that sends nothing until you call
it. The helpers check that each reply names the resource the request did.

```java
import com.convohop.server.ServerConversation;
import com.convohop.server.model.MessageAck;

ServerConversation conversation = server.conversation(conversationId);
MessageAck sent = conversation.messages().send("Your order shipped.");
conversation.members().add(principalId, "member", expectedRevision);
```

- `messages()` lists, reads, sends, edits and deletes messages. Reads and
  sends take an optional `actAs` member principal: reads then see what that
  member sees, sends are authored by it, and the authority audits both.
- `members()` lists, adds (one at a time or up to 100 at once) and removes
  members. Roles are `member` and `moderator`.
- Edits, deletions and membership changes take the expected revision, so a
  stale write fails instead of overwriting.
- Every mutation takes an optional request ID. Pass the same ID to repeat a
  mutation safely.

### Errors

Failures are `ConvoHopProblem`, an unchecked exception.

- `getCode()` is the stable error code, such as `RATE_LIMITED`. Always
  handle codes you don't know.
- `getOutcome()` says what is known about the request: `rejected` means it
  had no effect, `committed` or `accepted` means it took effect, and
  `unknown` means it might have. For `unknown`, resolve or retry the same
  request ID (see [Recovery](#recovery)); don't send a new request.
- `getStatus()` is the HTTP status, or 0 when no response arrived.
  `getRequestId()` is the request's ID.
- `getRetryAfter()` is how long the authority asks you to wait before
  resending, for example with `RATE_LIMITED`, or null. It comes from the
  error's `retryAfter` extension, or else from an HTTP `Retry-After` header
  given in seconds. The SDK never waits or resends because of it.
- A key without a required scope gets `ScopeRequiredProblem`, with code
  `SCOPE_REQUIRED`, status 403 and outcome `rejected`. Grant the scope
  instead of retrying. `getScope()` names the missing scope, or is null if
  the authority's message has another wording.
- The SDK's own codes include `TRANSPORT_UNKNOWN` (no response, outcome
  `unknown`), `INVALID_RESPONSE` (a malformed or mismatched reply, outcome
  `unknown`) and `INVALID_REQUEST` (an input the operation doesn't accept).
- Messages never contain credentials.

Invalid arguments throw `IllegalArgumentException` or
`NullPointerException`, and generated input builders throw
`IllegalStateException` when a required field is missing.

## Generated APIs and pages

`server.communication()` and `managementClient.management()` reach every
operation of their plane, with generated input builders and reply classes.
They're generated from the [schemas](../schema) with the other SDKs, so
they always cover operations that have no helper yet. Unlike the helpers,
they don't check that a result names the resource you asked for.

Each cursor-paginated query also gets a `…Pages` method: `membersPages`,
`messagesPages`, `inboxPages`, `searchPages`, `liveSessionsPages` and
`liveSessionParticipantsPages`. It returns a lazy `Iterable` of pages.

```java
import com.convohop.server.model.MemberPage;
import com.convohop.server.model.MembersRequestInput;

MembersRequestInput input = MembersRequestInput.builder().conversationId(conversationId).limit(100).build();
for (MemberPage page : server.communication().membersPages(input)) {
  page.getItems().forEach(this::sync);
}
```

- Nothing is sent until you iterate, and each iteration starts again from
  the input's cursor. Each page is a new request with a new request ID.
- Iteration ends after a page with `complete` set.
- A page with `refreshRequired` set ends iteration with an
  `IllegalStateException`. The authority wants an authorized
  resynchronization, so start again from a fresh read instead of resuming
  from the cursor.
- An incomplete page must have a next cursor that differs from the current
  one. `messagesPages` pages backward, so its next `beforeSequence` must be
  smaller. Otherwise iteration fails with `INVALID_RESPONSE`, and keeps
  failing.
- If a request fails, for example with `RATE_LIMITED`, the iterator keeps
  its position, so the next `hasNext()` requests the same page again.

## Kotlin

`convohop-server-kotlin` turns each plane API into a suspending one. Calls
run on `Dispatchers.IO` unless you pass another dispatcher, and pages
methods return a cold `Flow`. For the blocking client helpers, use
`interruptible`.

```kotlin
import com.convohop.server.kotlin.interruptible
import com.convohop.server.kotlin.suspending
import com.convohop.server.model.MembersRequestInput

val api = server.communication().suspending()
val principal = interruptible { server.principals().create(accountId) }
val input = MembersRequestInput.builder().conversationId(conversationId).limit(100).build()
api.membersPages(input).collect { page -> page.items.forEach(::sync) }
```

Cancelling the calling coroutine interrupts the blocking request. The call
then fails with a `CancellationException` whose cause is the
`TRANSPORT_UNKNOWN` problem, and a mutation stays in the client's recovery
records, so you can resolve or retry it.

## Recovery

Each mutation keeps a recovery record with its request ID, payload and
incarnation. When a mutation's outcome is `unknown`, don't send a new
request:

```java
RequestResolution resolution = server.requests().retry(problem.getRequestId());
```

- `requests().resolve(id)` only reads what the authority knows about a
  request: `notObservedYet`, `accepted` or `committed`.
- `requests().retry(id)` resolves a request this client recorded, then
  resends it with its original ID and payload only if the authority hasn't
  observed it. A mutation is sent at most three times in all, within a
  minute of its first attempt. After that `retry` throws
  `RESOLUTION_REQUIRED`.
- Reusing a request ID with another operation or payload fails with
  `IDEMPOTENCY_CONFLICT` before anything is sent.
- Records live in the client's memory. To keep them across restarts, pass
  `recoveryStorage(...)` to the builder: a `RecoveryStorage` whose `setItem`
  returns only once the value is durable, and throws otherwise. The
  mutation then fails with `RECOVERY_STORAGE_FAILURE`. Records hold request
  inputs, never credentials. `RecoveryStorage.inMemory()` survives client
  re-creation but not restarts. `getRecoveryStates()` lists the records.

## Webhooks

`WebhookVerifier` checks a delivery and returns its event. ConvoHop signs
deliveries with the Standard Webhooks symmetric `v1` scheme.

```java
import com.convohop.server.webhooks.VerifiedWebhook;
import com.convohop.server.webhooks.WebhookHeaders;
import com.convohop.server.webhooks.WebhookVerificationException;
import com.convohop.server.webhooks.WebhookVerifier;

WebhookVerifier verifier = WebhookVerifier.builder().secrets(webhookSecrets).build();

// In a servlet. Read one byte over the limit, so a larger body fails as BODY_TOO_LARGE.
byte[] body = request.getInputStream().readNBytes(4097);
WebhookHeaders headers = name -> Collections.list(request.getHeaders(name));
VerifiedWebhook delivery;
try {
  delivery = verifier.verify(headers, body);
} catch (WebhookVerificationException rejected) {
  response.setStatus(400);
  return;
}
queue.addOnce(delivery.getWebhookId(), delivery.getEvent()); // Process after responding.
response.setStatus(204);
```

Respond `2xx` within 5 s, then process; de-duplicate on `webhook-id`.
Delivery is at least once. Retries and replays keep the `webhook-id`. One
event delivered to two endpoints has the same event ID and different
`webhook-id` values.

- `WebhookHeaders` reads a header's values. Adapt your framework's headers
  with a lambda, with `httpHeaders::allValues` for
  `java.net.http.HttpHeaders`, or with `WebhookHeaders.of(map)` and
  `WebhookHeaders.ofMultiValued(map)`. Names match case-insensitively.
- The body is the exact bytes received, or a string that is their exact
  UTF-8 decoding. Never re-serialize it.
- Pass every `whsec_` secret you hold. ConvoHop signs with the current
  secret, with the next secret while a rotation is pending (at most 5
  minutes), and with the replaced secret for 24 hours after the rotation. A
  `v1` entry that matches any secret is accepted. Entries with other version
  prefixes are ignored.
- `toleranceSeconds` defaults to 300, and `clock` to the system clock.

Every event has `getEventId()`, `getEventType()`, `getOccurredAt()`,
`getProjectId()` and `getSubjectRef()`. Check the subclass:

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

`verifySignature()` checks only the headers, timestamp and signature, for
bodies you parse yourself. A failed check throws
`WebhookVerificationException`. Checks run in this order, and `getCode()`
names the first one that failed. The message never contains secrets,
signatures or the body.

| Code | Cause |
| --- | --- |
| `INVALID_SECRET` | `build()` only: no secret, or a secret that isn't `whsec_` followed by padded standard Base64 of 24 to 64 bytes. Fix your configuration. |
| `MISSING_HEADER` | `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty. |
| `INVALID_HEADER` | One of those headers has more than one value. |
| `INVALID_TIMESTAMP` | `webhook-timestamp` isn't 1 to 15 digits of Unix seconds. |
| `TIMESTAMP_EXPIRED` | The timestamp is more than the tolerance before now. |
| `TIMESTAMP_FUTURE` | The timestamp is more than the tolerance after now. |
| `BODY_TOO_LARGE` | The body is over 4096 bytes. |
| `TOO_MANY_SIGNATURES` | `webhook-signature` has more than 8 entries. ConvoHop sends 1 to 3. |
| `NO_MATCHING_SIGNATURE` | No `v1` entry matches any secret. |
| `INVALID_BODY` | `verify()` only: the signed body isn't a UTF-8 JSON event envelope. |

## Push payloads

ConvoHop doesn't send push notifications for you
([bring your own](../docs/sdk-strategy.md#push-notifications-bring-your-own)).
`PushPayloads` builds APNs, FCM and Web Push requests from a notification
event, following the [push payload contract](../spec/push-payload/README.md).
The builders hold no credentials and send nothing: your push library adds the
device's token or FID and the provider's authorization, encrypts and
VAPID-signs Web Push messages, and sends them. Subscribe a webhook endpoint to
`notification.message`, `notification.call` and
`notification.callCancelled`, and de-duplicate on the event ID.

```java
import com.convohop.server.push.ApnsRequest;
import com.convohop.server.push.PushOptions;
import com.convohop.server.push.PushPayloads;

PushOptions options = PushOptions.builder().title(displayName(event.getSenderId())).build();
// A CallKit app gets incoming calls as VoIP pushes. apnsVoip returns null for other events.
ApnsRequest voip = PushPayloads.apnsVoip(event, bundleId, options);
ApnsRequest alert = voip == null ? PushPayloads.apnsAlert(event, bundleId, options) : null;
```

Each builder returns a request, or null when the event doesn't apply to its
platform or is stale. Send nothing for null.

| Builder | Request | Null for | Limit (bytes) |
| --- | --- | --- | --- |
| `apnsAlert(event, bundleId[, options])` | APNs `getHeaders()` and `getPayload()` for an alert | A `notification.callCancelled` that isn't a missed call | 4096 of the payload |
| `apnsVoip(event, bundleId[, options])` | APNs headers and payload for a PushKit VoIP push, on the `<bundleId>.voip` topic | Every event but `notification.call` | 5120 of the payload |
| `fcm(event[, options])` | An FCM HTTP v1 message without a target, as JSON, with Android options. Add `token` or `fid`, or use `getData()` and the getters with the Firebase Admin SDK. | Stale events only | 4096 of the data |
| `webPush(event[, options])` | RFC 8030 headers (`TTL`, `Urgency` and `Topic`) and a payload for your library to encrypt | Stale events only | 3993 of the payload, the RFC 8291 plaintext limit |

An FCM message goes to the target that the Android app registered: its
registration `token` by default, or its `fid`, the Firebase Installation ID,
when the app's manifest sets `firebase_messaging_installation_id_enabled`.
The Firebase Admin SDK for Java sends to a FID from
[9.10.0](https://github.com/firebase/firebase-admin-java/releases/tag/v9.10.0),
with `Message.Builder.setFid`. That version also deprecates `setToken`, which
still sends to a token.

`PushOptions` sets the visible `title` and `body`, such as the sender's name,
whether a message event's opted-in `preview` becomes the body when you set no
body (it does by default), and the `clock`. The requests carry metadata only
unless you set text or the event carries a preview, set lifetimes and
collapse keys from the event, and shorten text that doesn't fit. See the
[push payload contract](../spec/push-payload/README.md) for the rules, and
[Calls on iOS](../spec/push-payload/README.md#calls-on-ios) for why VoIP
pushes are for `notification.call` only. An invalid bundle ID throws
`IllegalArgumentException`. `WebhookNotificationEvent.parse(json)` validates
a notification event you stored or received another way.

## Management

`ManagementClient` uses the Management origin's unversioned `/graphql` with
an authorized operator access token.

```java
import com.convohop.server.ManagementClient;

ManagementClient management = ManagementClient.builder()
    .baseUrl(managementBase)
    .actorId(operatorId)
    .accessToken(operatorToken)
    .recoveryStorage(privateRequestStorage)
    .build();
management.issueBackendKey(projectId, "orders-service", scopes, expiresAt);
```

`issueBackendKey` accepts the request as an operation. The key is handed over
once, through credential delivery, never as an ordinary result. Redeeming a
delivery needs a transport without a bearer credential, which this SDK
doesn't have yet, so redeem with `@convohop/server`
([credential delivery](../packages/server/README.md#management-and-credential-delivery)).
`management.management()` reaches every other management operation.

## Not yet ported

`@convohop/server` has helpers that this SDK doesn't: inbox, search, calls,
mute, history grants, broadcast, conversation updates, organization,
deployment and project provisioning, credential delivery, and the read-only
session request outcomes. Their operations are all in the generated APIs,
although credential redemption also needs a bearer-less transport (see
[Management](#management)).

## Build and test

```sh
cd jvm
./gradlew build                        # Compile, check, document and test on JDK 17
./gradlew test -PtestJavaVersion=21    # Run the tests on another installed JDK
./gradlew :conformance-driver:installDist
```

The build doesn't download JDKs. For `-PtestJavaVersion`, install the JDK
and, if Gradle doesn't find it, pass its path with
`-Porg.gradle.java.installations.paths=<path>`. To run the
[conformance suite](../spec/conformance/README.md) with the JVM driver, from
the repository root:

```sh
npm run conformance -- --driver conformance/drivers/jvm/build/install/conformance-driver/bin/conformance-driver
```

The build also includes two projects for the
[Java and Kotlin docs](../docs/site/jvm/index.md): `docs-surface` reads the
SDK's public API for the [docs pipeline](../docs/docs-pipeline.md), and
`docs-examples` holds the code that the docs include. The examples' tests
start the conformance mock, so they need Node.js 22 or later and `npm ci` at
the repository root; skip them with `-x :docs-examples:test`. After you
change the public API, from the repository root:

```sh
npm run extract:docs -- jvm   # refresh docs/languages/jvm/surface.json
npm run generate:docs         # regenerate docs/site
npm run test:docs -- jvm      # compile and run the docs examples
```

`src/generated` holds code generated from the schemas: never edit it. From
the repository root, `npm run generate:graphql` regenerates it and
`npm run check:graphql` checks it. See [SDK generation](../docs/sdk-generation.md).

| Path | Contents |
| --- | --- |
| `convohop-server/src/main/java` | The hand-written runtime: clients, transport, recovery, errors, webhooks and push |
| `convohop-server/src/generated/java` | Generated models, the operation catalog and one API class per plane |
| `convohop-server/src/testFixtures/java` | The fake authority and fixtures that the tests share |
| `convohop-server-kotlin/src/main/kotlin` | `interruptible` and the page flows |
| `convohop-server-kotlin/src/generated/kotlin` | Generated suspending APIs |
| `sdkgen-edge` | Compiles the generator's edge-case golden output against the runtime |
| [`../conformance/drivers/jvm`](../conformance/drivers/jvm) | The conformance driver |
| [`../tools/docgen/extractors/jvm`](../tools/docgen/extractors/jvm) | `docs-surface`: the public API extractor that the docs generator runs |
| [`../docs/languages/jvm/examples`](../docs/languages/jvm/examples) | `docs-examples`: the code that the Java and Kotlin docs include, and its tests |
