# ConvoHop server SDK

`@convohop/server` is the TypeScript/ESM SDK for the current Management and
Conversation APIs. It runs only in trusted Node.js 22+ runtimes, because it
holds secret backend keys and operator credentials. No hosted service, cloud
provisioner or privileged browser client is included. It isn't on a package
registry yet:
[install it from a GitHub Release](https://github.com/ConvoHop/sdks#install-a-release).
License: [Apache-2.0](LICENSE).

## Runtime and entry point

- `@convohop/server` has one ESM entry point with bundled TypeScript
  declarations, exported only under the `node` condition. Bundlers that
  target browsers can't resolve it, which keeps it out of client bundles.
  CommonJS code on Node.js 22.12 or later can `require()` it.
- It depends only on `@convohop/core`. It never loads `@convohop/client`
  or `livekit-client`.
- It re-exports the public API of `@convohop/core`, such as `ConvoHopProblem`,
  `ConvoHopTransport`, `operationCatalog` and the generated `GraphqlTypes` types. Import
  them from `@convohop/server`, not from `@convohop/core`.

## Application backend

Authenticate the application user before looking up its project-scoped
principal. A caller-supplied principal ID is not proof of login.

```ts
import { ProjectServerClient } from "@convohop/server";

const server = new ProjectServerClient({
  baseUrl: communicationBase,
  projectId,
  incarnation,
  backendKey, // Trusted secret storage only.
});
await server.initialize();
const principalId = await server.createPrincipal(authenticatedAccountId);
const bootstrap = await server.issueSession(principalId, deviceId);
// Return only this user's bootstrap and public project/route metadata.
const conversation = await server.conversations.create({
  title: "Support", props: {},
  members: [
    { principalId, role: "member" },
    { principalId: teammatePrincipalId, role: "member" },
  ],
}, { requestId: ids.create });
await server.conversation(conversation.conversationId).members.setBroadcastPermission({
  principalId, allowed: true, expectedMembershipRevision: "1",
}, { requestId: ids.permission });
```

The independent broadcast grant requires backend `membershipManage`, not
moderator status. Only the creator publishes; native-enforced viewers can
chat. The backend never creates an end-user media connection.
`members.addBatch(entries, {requestId})` atomically accepts 1..100 distinct,
revision-guarded entries; `members.list({limit,cursor})` returns bounded pages.
A conversation supports 2,000 memberships; finite media seat/publisher
limits are separate. Removal/re-add clears the broadcast grant.
`createConversation` and `addMembers` are conveniences for the same generated
operations, not alternate APIs.

Backend scopes/project boundaries still apply; a backend key does not grant
unrestricted end-user message browsing. Session lifetime defaults to 15
minutes. Operator/backend credentials never belong in client bundles, URLs
or logs.

Browser clients can opt into the
[authority-bound session refresh lifecycle](../client/README.md#session-credential-lifetime).
Configure its hook before original-bearer initialization and invoke your
authenticated, account/device-bound renewal endpoint inside that hook:
`communication.renewSession` can invalidate the previous JWT immediately.
Keep the original backend renewal request and its expected revision through
unknown outcomes; SDK hook rejection is not proof of rollback. The additive
`communication.currentSession` query is restricted to the authenticated
current ClientSession, not backend/portal readers or selected session IDs.
`SessionBootstrap` remains the same exported generated bootstrap type.
Its `tokenExpiresAt` equals session `expiresAt`, while effective bearer
expiry is floored to integer seconds and may be up to 999 ms earlier.

## Data-plane methods

`ProjectServerClient` has a typed method for every backend-key operation
in `schema/annotations.json`. A package test fails if an operation is
added without one. The handles that `conversation(id)`, `liveSession(id)`
and `liveOperation(id)` return send nothing until you call a method. Each
method needs the backend-key scope listed:

| Method | Operation | Scope |
| --- | --- | --- |
| `initialize()` | `route` | None |
| `capabilities()` | `capabilities` | None |
| `requests.resolve(requestId)` | `resolveRequest` | None |
| `operation(operationId)` | `getOperation` | None |
| `principals.create(input)`, `createPrincipal(externalUserId)` | `createPrincipal` | `principalManage` |
| `principals.get(principalId)` | `getPrincipal` | `principalManage` |
| `principals.disable(input)` | `disablePrincipal` | `principalManage` |
| `sessions.issue(input)`, `issueSession(principalId, deviceId)` | `issueSession` | `sessionIssue` |
| `sessions.renew(input)` | `renewSession` | `sessionIssue` |
| `sessions.revoke(input)` | `revokeSession` | `sessionManage` |
| `sessions.outcome(requestId)`, `sessionRequestOutcome(requestId)` | `sessionRequestOutcome` | `sessionIssue` and `sessionManage` |
| `conversations.create(input)`, `createConversation(title, members)` | `createConversation` | `conversationManage` |
| `conversation(id).get()` | `getConversation` | `conversationManage` |
| `conversation(id).update(input)` | `updateConversation` | `conversationManage` |
| `conversation(id).members.list(page)` | `members` | `membershipManage` |
| `conversation(id).members.add(input)` | `addMember` | `membershipManage` |
| `conversation(id).members.addBatch(entries)`, `addMembers(conversationId, entries)` | `addMembers` | `membershipManage` |
| `conversation(id).members.remove(input)` | `removeMember` | `membershipManage` |
| `conversation(id).members.setBroadcastPermission(input)` | `setBroadcastPermission` | `membershipManage` |
| `conversation(id).members.getMute(principalId)` | `conversationMute` | `membershipManage` |
| `conversation(id).members.setMute(input)` | `setConversationMute` | `membershipManage` |
| `conversation(id).members.grantHistory(input)` | `historyGrant` | `historyManage` |
| `conversation(id).messages.list(options)` | `messages` | `messageRead` |
| `conversation(id).messages.get(messageId, options)` | `getMessage` | `messageRead` |
| `inbox({ actAs, cursor, limit })` | `inbox` | `messageRead` |
| `search(query, options)` | `search` | `messageRead` |
| `conversation(id).messages.send(message, options)` | `sendMessage` | `messageWrite` |
| `conversation(id).messages.edit(input)` | `editMessage` | `moderation` |
| `conversation(id).messages.delete(input)` | `deleteMessage` | `moderation` |
| `conversation(id).live.current()` | `currentLiveSession` | `callRead` or `callManage` |
| `conversation(id).live.history(page)` | `liveSessions` | `callRead` or `callManage` |
| `liveSession(id).get()` | `liveSession` | `callRead` or `callManage` |
| `liveSession(id).participants(page)` | `liveSessionParticipants` | `callRead` or `callManage` |
| `liveOperation(id).get()`, `liveOperation(id).completed(options)` | `liveSessionOperation` | `callRead` or `callManage` |
| `liveSession(id).alert(input)` | `alertLiveSession` | `callManage` |
| `liveSession(id).end(input)` | `endLiveSession` | `callManage` |

- `callManage` satisfies `callRead`: a key with either scope can read live
  sessions, including ended ones, with their participants and operations.
- Commands take an optional `{ requestId }`. Keep the original ID through
  an unknown outcome, as described in
  [bounded recovery](#generated-operations-and-bounded-recovery).
  `requests.retry(requestId)` is `http.retry`: the resend needs the
  original command's scope.
- Live commands take the `expectedGeneration` and `expectedRevision` you
  observed, so a retry resends the original payload. `liveSession(id).end()`
  returns its operation. `completed()` resolves only after the authority
  reports the media cutoff as enforced. Its timeout throws
  `RESOLUTION_REQUIRED`, which isn't a cutoff.
- `members.getMute` and `members.setMute` act as the named member, and the
  authority audits them. A mute stops that member's `notification.message`
  events until you unmute it or its optional `until` time passes. Calls
  still ring a muted member.
- Each result is checked against its request, for example the conversation,
  message or principal ID. A mismatch throws instead of being returned.

### Acting as a member

Message reads and sends take `{ actAs: principalId }`, which the SDK sends
as `actAsPrincipalId`. The authority audits every committed call that uses
it.

- `messages.list`, `messages.get` and `search` with `actAs` see only what
  that member can see. Without it, `messages.list` and `messages.get` read
  any conversation in the project, and `search` requires `conversationIds`.
  When given, `conversationIds` must name at least one conversation, and
  every hit is checked to be in one of them.
- `inbox` always reads as one member, so `actAs` is required.
- `messages.send` with `actAs` sends as that member. Without it, the backend's
  service principal is the sender.

`actAs` is a per-call option rather than a client bound to one member, so
every call names the principal it acts for:

```ts
const chat = server.conversation(conversationId);
const history = await chat.messages.list({ actAs: principalId, limit: 50 });
await chat.messages.send({ text: "Your order shipped" }, { requestId: ids.notice });
const inbox = await server.inbox({ actAs: principalId });
```

### Errors

Failures are `ConvoHopProblem` errors, re-exported from `@convohop/core`.

- A key without a required scope gets `ScopeRequiredProblem`, a `ConvoHopProblem`
  with `code: "SCOPE_REQUIRED"`, status 403 and outcome `rejected`. Grant
  the scope instead of retrying. `scope` names the missing scope, parsed from
  the authority's message, and is `undefined` if the wording differs. For
  live reads it names `callRead`, although `callManage` also satisfies them.
  `FORBIDDEN` remains for other authorization failures.
- `retryAfter` is the number of whole seconds the authority asks you to wait
  before resending, for example with `RATE_LIMITED`. It comes from the error's
  `retryAfter` extension, or else from an HTTP `Retry-After` header given in
  seconds. The SDK never waits or resends because of it.

## Webhooks

`webhooks.verify()` checks a delivery with Web Crypto and returns its event.
ConvoHop signs deliveries with the Standard Webhooks symmetric `v1` scheme.

```ts
import { webhooks, WebhookVerificationError } from "@convohop/server";

export async function receive(request: Request): Promise<Response> {
  const body = new Uint8Array(await request.arrayBuffer()); // Raw bytes, never re-serialized JSON.
  let delivery;
  try {
    delivery = await webhooks.verify({ headers: request.headers, body, secrets: webhookSecrets });
  } catch (error) {
    if (error instanceof WebhookVerificationError) return new Response(null, { status: 400 });
    throw error;
  }
  queue.addOnce(delivery.webhookId, delivery.event); // Process after responding.
  return new Response(null, { status: 204 });
}
```

Respond `2xx` within 5 s, then process; de-duplicate on `webhook-id`.
Delivery is at least once. Retries and replays keep the `webhook-id`. One
event delivered to two endpoints has the same `eventId` and different
`webhook-id` values.

- `headers` is a `Headers` object or a plain record, such as Node's
  `request.headers`. Names match case-insensitively.
- `body` is the raw body as a `Uint8Array`, or a string that is its exact
  UTF-8 decoding. The SDK verifies those bytes as received and never
  re-serializes them.
- `secrets` is one `whsec_` secret or an array of them. ConvoHop issues
  32-byte secrets, and the SDK accepts the 24 to 64 bytes that Standard
  Webhooks allows. Pass every secret you hold. ConvoHop signs with the
  current secret, with the next secret while a rotation is pending (at most
  5 minutes), and with the replaced secret for 24 hours after the rotation.
  A `v1` entry that matches any secret is accepted. Entries with other
  version prefixes are ignored.
- `toleranceSeconds` defaults to 300, and `now` defaults to the current time.

`verify()` returns `{ webhookId, timestamp, event }`. Every event carries
`eventId`, `eventType`, `occurredAt`, `projectId` and
`subjectRef: { id, kind }`. Resource events carry only that metadata, so
fetch content through the data plane, for example with
`conversation(id).messages.get()`. Per-recipient notification events
(`notification.message`, `notification.call` and
`notification.callCancelled`) also carry the recipient, conversation, sender
and message or call, for your [push notifications](#push-payloads). Narrow on
`event.known`, then on `event.eventType`. An event type that this SDK doesn't
know returns `known: false` and never throws, so acknowledge it. So does a
notification event that doesn't match the
[push payload contract](../../spec/push-payload/README.md), such as one
missing a required field.
`webhooks.verifySignature()` checks only the headers, timestamp and
signature, and returns `{ webhookId, timestamp }` for bodies you parse
yourself.

A failed check throws `WebhookVerificationError`. Checks run in this order,
and `code` names the first one that failed. The message never contains
secrets, signatures or the body.

| Code | Cause |
| --- | --- |
| `INVALID_SECRET` | No secret, or a secret that isn't `whsec_` followed by padded standard Base64 of 24 to 64 bytes. Fix your configuration. |
| `MISSING_HEADER` | `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty. |
| `INVALID_HEADER` | One of those headers is repeated in a header record. A `Headers` object joins repeated values, which then fail a later check. |
| `INVALID_TIMESTAMP` | `webhook-timestamp` isn't 1 to 15 digits of Unix seconds. |
| `TIMESTAMP_EXPIRED` | The timestamp is more than the tolerance before `now`. |
| `TIMESTAMP_FUTURE` | The timestamp is more than the tolerance after `now`. |
| `BODY_TOO_LARGE` | The body is over 4096 bytes. |
| `TOO_MANY_SIGNATURES` | `webhook-signature` has more than 8 entries. ConvoHop sends 1 to 3. |
| `NO_MATCHING_SIGNATURE` | No `v1` entry matches any secret. |
| `INVALID_BODY` | `verify()` only: the signed body isn't a UTF-8 JSON event envelope. |

Invalid arguments throw `RangeError` or `TypeError` instead, for example a
negative tolerance or a body that is neither a string nor a `Uint8Array`.

## Push payloads

ConvoHop doesn't send push notifications for you
([bring your own](../../docs/sdk-strategy.md#push-notifications-bring-your-own)).
`push` builds APNs, FCM and Web Push requests from a verified notification
event. Its builders are pure functions: they hold no credentials and send
nothing. Your push library adds the device token and the APNs or FCM
authorization, encrypts and VAPID-signs Web Push messages, and sends them.
The builders follow the [push payload contract](../../spec/push-payload/README.md).
To receive the events, subscribe a webhook endpoint to
`notification.message`, `notification.call` and `notification.callCancelled`.
Deliveries are at least once and unordered, so deduplicate on `eventId`, as
[Recipients and delivery](../../spec/push-payload/README.md#recipients-and-delivery)
describes.

```ts
import { push, type WebhookEvent, type WebhookNotificationEvent } from "@convohop/server";

// Your queue worker, for events that webhooks.verify() accepted.
export async function handle(event: WebhookEvent): Promise<void> {
  if (!event.known) return;
  switch (event.eventType) {
    case "notification.message":
    case "notification.call":
    case "notification.callCancelled":
      await notify(event);
      break;
    // Your other event types.
  }
}

async function notify(event: WebhookNotificationEvent): Promise<void> {
  const title = await displayName(event.senderId); // Your own text and localization.
  for (const device of await devicesOf(event.recipientId)) { // Your own token store.
    if (device.platform === "ios") {
      // A CallKit app gets incoming calls as VoIP pushes. apnsVoip() returns null for other events.
      const voip = push.apnsVoip(event, { bundleId, title });
      const alert = voip ? null : push.apnsAlert(event, { bundleId, title });
      if (voip) await sendApns(device.voipToken, voip.headers, voip.payload);
      if (alert) await sendApns(device.token, alert.headers, alert.payload);
    } else if (device.platform === "android") {
      const request = push.fcm(event, { title });
      if (request) await sendFcm({ ...request.message, token: device.token });
    } else {
      const request = push.webPush(event, { title });
      if (request) await sendWebPush(device.subscription, JSON.stringify(request.payload), request.headers);
    }
  }
}
```

Each builder returns a request, or `null` when the event doesn't apply to
its platform or is stale. Send nothing for `null`.

| Builder | Request | `null` for | Limit (bytes) |
| --- | --- | --- | --- |
| `push.apnsAlert(event, options)` | APNs `headers` and `payload` for an alert | A `notification.callCancelled` that isn't a missed call | 4096 of `payload` |
| `push.apnsVoip(event, options)` | APNs `headers` and `payload` for a PushKit VoIP push, on the `<bundleId>.voip` topic | Every event but `notification.call` | 5120 of `payload` |
| `push.fcm(event, options?)` | An FCM HTTP v1 `message` with `data` and Android options. Add `token`. | Stale events only | 4096 of `message.data` |
| `push.webPush(event, options?)` | RFC 8030 `headers` (`TTL`, `Urgency` and `Topic`) and a `payload` for your library to encrypt | Stale events only | 3993 of `payload`, the RFC 8291 plaintext limit |

The options are:

- `bundleId`: your app's bundle ID. The APNs builders require it.
- `title` and `body`: the visible text, such as the sender's name. An empty
  string is the same as none.
- `preview` (default `true`): whether a message event's `preview` becomes
  the body when you pass no `body`. Events carry a preview only when the
  project opts in to message previews, with the `management.projectPolicy`
  change `enableMessagePreview`. Previews are off by default.
- `now`: the clock, which defaults to the current time.

The requests follow these rules:

- **Metadata only by default.** Every request carries `convohop`: the
  event's identifiers, without `connected` and the preview. A request has
  message text only when you pass it or the event carries a preview. An
  APNs alert without a body uses a `loc-key` that you define in your app's
  `Localizable.strings`: `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` or
  `CONVOHOP_MISSED_CALL`. Its `mutable-content` lets a Notification Service
  Extension fetch the content with the user's session.
- **Lifetime.** Messages and missed calls stay relevant for a day after
  `occurredAt`, and calls and other cancellations until the ring's
  `expiresAt`, but never more than 28 days. That sets `apns-expiration`, the
  FCM `ttl` and the Web Push `TTL`.
- **Collapse.** Calls and cancellations collapse on the ring's `alertId`, as
  the `apns-collapse-id` of alerts, the FCM `collapse_key` and the Web Push
  `Topic`. A missed-call alert replaces the ring's incoming-call alert.
- **Size.** A request over its limit has its body, and then its title,
  shortened to whole code points followed by `…`. Metadata always fits.
- **FCM.** Requests carry Android options only, at high priority; send to
  Apple devices with the APNs requests. Show a notification for every
  high-priority message, or Android can lower the app's later messages to
  normal priority.
- **`connected`.** An event's `connected` is a hint for your sending policy,
  for example to skip a message push for a user who is online. The builders
  ignore it.
- **Push libraries.** The requests use each service's wire format: APNs
  HTTP/2 headers, an FCM HTTP v1 REST message and RFC 8030 headers. Where
  your library has its own options, pass the values there. `firebase-admin`,
  for example, takes `android` as `{ priority: "high", ttl, collapseKey }`,
  with `ttl` in milliseconds. The `web-push` package sets `Urgency` from its
  `urgency` option, which defaults to `normal`, after adding the headers you
  pass. So pass the request's `headers` as its options,
  `{ TTL: Number(headers.TTL), urgency: headers.Urgency, topic: headers.Topic }`,
  not as `{ headers }`, or call and cancellation pushes go out at normal
  urgency.

iOS requires an app to report every VoIP push to CallKit as an incoming
call. An app that doesn't is terminated, and iOS can stop delivering its
VoIP pushes. So `apnsVoip()` builds requests for `notification.call` only,
and a `notification.callCancelled` reaches iOS another way. An app ringing
through CallKit ends the ringing when its realtime connection reports that
the call stopped ringing, or at `expiresAt` at the latest. A missed call
(`reason` `ended` or `expired`) gets an APNs alert that replaces the
incoming-call alert. `answered` and `declined` get no APNs request. See
[Calls on iOS](../../spec/push-payload/README.md#calls-on-ios).

An invalid option or event throws `PushPayloadError`. Options are checked
first, and the message names the field but never contains its value.

| Code | Cause |
| --- | --- |
| `INVALID_OPTIONS` | An option has the wrong type, `title` or `body` has a lone surrogate, `now` isn't a valid `Date`, or `bundleId` isn't a bundle ID: letters, digits and hyphens in dot-separated parts, at most 155 characters. |
| `INVALID_EVENT` | The event isn't a notification event under the push payload contract. `webhooks.verify()` returns such events as `known: false`. |

## Management and credential delivery

`ConvoHopManagementClient` uses its separately configured Management origin's
unversioned `/graphql`, with an authorized portal credential. The project
client uses Communication `/graphql`. Both reject redirects and unsafe
origins; only explicit loopback HTTP is permitted without TLS.

```ts
import { ConvoHopManagementClient } from "@convohop/server";

const management = new ConvoHopManagementClient({
  baseUrl: managementBase,
  actorId: operatorId,
  accessToken: operatorToken,
  recoveryStorage: privateRequestStorage,
});
const organization = await management.createOrganization("Local team", termsRef);
const accepted = await management.createDeployment(organization.orgId);
// Retain accepted.operation.operationId and poll management.operation(id).
```

Only an explicit loopback origin permits omitted local deployment/project
configuration. Hosted origins require reviewed offering, geoId,
installationProfileId, consentRef, environment and backendPrincipalName.
No local token fallback or qualification-flag shortcut is provided.
Deployment/project readiness precedes dependent operations.

`createProject`, `issueBackendKey` and `deliveryPermit` expose the remaining
provisioning flow. Accepted management work has a durable operation ID, not
a completion promise. Backend credentials use one-time delivery, never an
ordinary retained result. Redeem using a bearer-less `ConvoHopTransport`:

```ts
const result = await deliveryTransport.execute(
  "communication.redeemCredential", projectId, { deliveryId },
  originalRedemptionRequestId, currentPermit,
);
// Persist the capsule in trusted secret storage before acknowledging delivery.
```

The permit is transient authorization for both redemption and
`communication.acknowledgeCredential`, not saved command input. An unknown
delivery command requires a fresh permit and the same original command ID
within its remaining retry budget. Delivery permits cannot authorize generic
request lookup; `http.retry` reports `CREDENTIAL_REQUIRED` rather than making
an unauthorized lookup or fabricating a bearer.

## Generated operations and bounded recovery

Use `http.execute("management.operation", undefined, input, requestId)` or
`http.execute("communication.operation", projectId, input, requestId)`.
Inputs/results derive from the exported schema; there are no REST-shaped
path aliases or payload-shape guessing.

Resolve read-only with the generated `management.resolveRequest` or
`communication.resolveRequest`. `http.retry(id)` resolves first, then only
retries the original unobserved command inside its unchanged finite budget.
Keep the original command ID/input/incarnation; do not substitute a new ID
after uncertainty. Storage may contain application inputs, not tokens,
credential permits or redeemed capsules. GraphQL errors under HTTP 200 and
malformed receipt metadata remain errors.

### Read-only session request outcomes

The optional backend-facing helper reads credential-free evidence for an
**original** `issueSession` or `renewSession` mutation:

```ts
import { type SessionRequestOutcome } from "@convohop/server";

await server.initialize(); // Establish the configured project route/epoch.
const evidence: SessionRequestOutcome =
  await server.sessionRequestOutcome(originalSqlRenewalRequestId);
```

Its exact signature is
`sessionRequestOutcome(requestId: string): Promise<SessionRequestOutcome>`.
The only query input is the original mutation ID; the SDK generates a
different `context.requestId` for each read. Communication project,
incarnation and the initialized serving epoch use the existing transport
context. The provider requires a current Backend with **both** `sessionIssue`
and `sessionManage`, plus its normal project/policy/key/epoch/incarnation
guards. Receipt lookup is scoped to that project's incarnation, backend
actor kind, stable backend principal and original request ID. Replacing a
finite backend key must preserve that authority principal, not merely the
SDK's storage namespace.

The exported discriminated union has these shapes:

| State | Returned fields beyond `requestId` and `checkedAt` |
| --- | --- |
| `notObservedYet` | None |
| `committed`, `currentState: "missing"` | `operation: "issueSession" \| "renewSession"`, `receiptId`, `committedAt`, `originalSession` |
| `committed`, `currentState: "active" \| "expired" \| "revoked"` | The same commit fields plus `currentSession` |

Both session projections contain only the existing seven fields:
`sessionId`, `principalId`, `deviceId`, `incarnation`, `sessionRevision`,
`expiresAt`, `status`. Original `status: "active"` is **historical receipt
evidence**, not present authorization. A present current row preserves the
original tuple and has a revision no lower than the original. Its status
equals its current disposition, including `"expired"`; revocation wins
even after expiry. Equal revisions preserve expiry. A higher-revision,
shorter-TTL renewal may legitimately shorten expiry.

`checkedAt`, `serverTime` and `committedAt` are independently sampled UTC
millisecond timestamps, without guaranteed wall-clock ordering. The
provider evaluates current expiry against SQL time, not `checkedAt`.
The SDK does not recompute disposition from those timestamps or local time.
An active row does **not** prove a valid minted bearer. This read does not
return tokens, claims, delivery permits, raw receipts or bootstrap material,
and cannot renew a session, extend a lease or admit native media.

The helper rejects malformed/contradictory projections, extra fields
(including credential material), wrong identities/incarnations, invalid
positive signed-64-bit revisions and noncanonical timestamps with sanitized
`INVALID_RESPONSE` errors. When the original command is still in the SDK
journal, operation/payload/scope must also match that custody. Selected
nullable GraphQL fields must be present: null commit details are valid only
for `notObservedYet`, and null `currentSession` only for missing/absent
observations. Inapplicable null fields are omitted from the public union.

Absence is **not proof of noncommit or permission to resubmit**. Even a
committed observation never implicitly settles/evicts the SDK journal,
resets its retry budget, substitutes IDs, retries a mutation or invokes
browser refresh. Keep the application's original transactional request and
payload custody. Ordinary `resolveRequest` documents and result withholding
are unchanged; this separate read does not make withheld credentials
materializable. Constructors/default Browser behavior do not call it, and
legacy providers remain usable until this optional helper is invoked.

The generated contract exactly matches authority
`ce86e4bb6d23dbbe73ae99d70b2d44e9d2a0570c`. SDK regressions are source-level
evidence only; managed-database eligibility, maintained Linux/native
qualification and public deployment remain separate publication gates.

### Asynchronous database recovery storage

`ProjectServerClient`, `ConvoHopManagementClient` and the low-level `ConvoHopTransport`
accept optional `asyncRecoveryStorage`, mutually exclusive with the existing
synchronous `recoveryStorage`. Both Server SDK storage types are exported:

```ts
export interface AsyncRecoveryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

Implement that interface using your application's database transactions;
it is not a bundled SQL adapter or migration:

```ts
import { ProjectServerClient, type AsyncRecoveryStorage } from "@convohop/server";

const storage: AsyncRecoveryStorage = applicationSqlRecoveryStorage;
const server = new ProjectServerClient({
  baseUrl: communicationBase, projectId, incarnation, backendKey,
  asyncRecoveryStorage: storage,
});
await server.initialize(); // Restores recovery before querying the route.
const recovery = server.http.recoveryStates;
```

`getItem` returns the complete committed JSON snapshot, or `null` only when
the journal is absent. Read/parse failures reject initialization, never load
an empty fallback. The constructor does not start asynchronous I/O.
`await http.initializeRecovery()` explicitly restores once; `execute`,
`retry` and project `initialize` automatically await the same restore.
Synchronous `http.recoveryStates` throws until restoration succeeds.
A failed restore remains failed for that transport; repair storage and
construct a new client rather than reusing an uninitialized snapshot.

`setItem` must atomically replace the complete snapshot and resolve **only
after durable database commit**. `removeItem` must likewise await a durable
delete; the transport currently never calls it or deletes the journal.
Retention replaces snapshots with at most 128 records, pruning only settled
inactive commands, never unresolved ones. Do not implement these methods
with fire-and-forget writes or success-shaped error handling.

The SDK awaits pending-intent and submitted-attempt writes before sending a
mutation, and awaits receipt/resolution writes before returning success.
Native admission likewise awaits its saved use marker before opening.
An async write failure raises local `ConvoHopProblem` code
`RECOVERY_STORAGE_FAILURE` with the original `requestId`, retained
`outcome` (`unknown`, `committed` or `accepted`) and storage error `cause`.
No mutation is sent when its pre-submit write fails. An attempted submission
can conservatively consume an attempt even if storage failure or elapsed
time prevents network submission; the original three-attempt/60-second
budget is never rolled back or renewed. After authority success, a failed
receipt write does not regress in-memory settled evidence, but a restart
can see only the last durable snapshot. Retain the original identity and
resolve it; inspection is not proof that an in-memory update was persisted.
Tokens, native grants, delivery permits and capsules are never journaled.

Project journals use `convohop.requests:backend:<projectId>`; Management uses
`convohop.requests:management:<actorId>`; low-level transports use
`convohop.requests:<namespace>`. Backend-key rotation does not change the
namespace or stored project/incarnation/identity/budget. A different
incarnation still requires explicit recovery, not deletion of old records.
Reconstruct the trusted client after its previous work settles when replacing
its constructor-owned key. The new key must belong to the same authority
backend principal: a stable project-scoped SDK journal does not prove an
unchanged service actor. Qualify resolution of an old unknown request under
the refreshed key against the real authority, not only a unit transport.

Snapshot writes are serialized **within one transport only**. The
application must coordinate exclusive, fenced ownership of each journal key
across its whole restore/read-modify-write lifetime, including all outstanding
requests and persistence. Acquire ownership before initialization, reject
stale owners in SQL, and discard the client before releasing ownership.
Construct a fresh client from the current journal for the next owner.
Locking each `setItem` alone, an unconditional transactional upsert, or a
last-write-wins store can still lose another client's pending commands.
One small app-service instance can have overlapping deployments/processes;
it does not guarantee a single writer. The SDK supplies no distributed lock,
snapshot merge, SQL schema or migration. Browser `ConvoHopClient` recovery/cursor
storage remains synchronous, including existing `sessionStorage` usage.

Build/test from the root npm workspace:

```sh
npm ci
npm run check:graphql
npm run build
npm test
```

Isolated SDK unit
tests do not establish CockroachDB/WebRTC or hosted-release qualification;
that acceptance belongs to the compatible service's maintained suite.
