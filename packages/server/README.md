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
- `secrets` is one `whsec_` secret or an array of them. Pass every secret you
  hold. ConvoHop signs with the current secret, with the next secret while a
  rotation is pending (at most 5 minutes), and with the replaced secret for
  24 hours after the rotation. A `v1` entry that matches any secret is
  accepted. Entries with other version prefixes are ignored.
- `toleranceSeconds` defaults to 300, and `now` defaults to the current time.

`verify()` returns `{ webhookId, timestamp, event }`. The event carries
metadata only: `eventId`, `eventType`, `occurredAt`, `projectId` and
`subjectRef: { id, kind }`. Fetch content through the data plane, for example
with `conversation(id).messages.get()`. Narrow on `event.known`, then on
`event.eventType`. An event type that this SDK doesn't know returns
`known: false` and never throws, so acknowledge it. The event types are
provisional until the webhook contract (ConvoHop/ConveHop#10) merges.
`webhooks.verifySignature()` checks only the headers, timestamp and
signature, and returns `{ webhookId, timestamp }` for bodies you parse
yourself.

A failed check throws `WebhookVerificationError`. Checks run in this order,
and `code` names the first one that failed. The message never contains
secrets, signatures or the body.

| Code | Cause |
| --- | --- |
| `INVALID_SECRET` | No secret, or a secret that isn't `whsec_` followed by padded standard Base64 of 1 to 64 bytes. Fix your configuration. |
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
