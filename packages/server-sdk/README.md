# ConvoHop Node server SDK

`@convohop/server-sdk` is unpublished Node.js 24+ TypeScript/ESM source for
the current Management and Conversation APIs. Source license:
[Apache-2.0](../../LICENSE). No hosted service, cloud provisioner or privileged
browser client is included.

## Application backend

Authenticate the application user before looking up its project-scoped
principal. A caller-supplied principal ID is not proof of login.

```ts
import { V1ProjectServerClient } from "@convohop/server-sdk";

const server = new V1ProjectServerClient({
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
[authority-bound session refresh lifecycle](../browser-sdk/README.md#session-credential-lifetime).
Configure its hook before original-bearer initialization and invoke your
authenticated, account/device-bound renewal endpoint inside that hook:
`communication.renewSession` can invalidate the previous JWT immediately.
Keep the original backend renewal request and its expected revision through
unknown outcomes; SDK hook rejection is not proof of rollback. The additive
`communication.currentSession` query is restricted to the authenticated
current ClientSession, not backend/portal readers or selected session IDs.
`V1SessionBootstrap` remains the same exported generated bootstrap type.
Its `tokenExpiresAt` equals session `expiresAt`, while effective bearer
expiry is floored to integer seconds and may be up to 999 ms earlier.

## Management and credential delivery

`V1ManagementClient` uses its separately configured Management origin's
unversioned `/graphql`, with an authorized portal credential. The project
client uses Communication `/graphql`. Both reject redirects and unsafe
origins; only explicit loopback HTTP is permitted without TLS.

```ts
import { V1ManagementClient } from "@convohop/server-sdk";

const management = new V1ManagementClient({
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
ordinary retained result. Redeem using a bearer-less `V1Transport`:

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

### Asynchronous database recovery storage

`V1ProjectServerClient`, `V1ManagementClient` and the low-level `V1Transport`
accept optional `asyncRecoveryStorage`, mutually exclusive with the existing
synchronous `recoveryStorage`. Both Server SDK storage types are exported:

```ts
export interface V1AsyncRecoveryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

Implement that interface using your application's database transactions;
it is not a bundled SQL adapter or migration:

```ts
import { V1ProjectServerClient, type V1AsyncRecoveryStorage } from "@convohop/server-sdk";

const storage: V1AsyncRecoveryStorage = applicationSqlRecoveryStorage;
const server = new V1ProjectServerClient({
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
An async write failure raises local `V1Problem` code
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
snapshot merge, SQL schema or migration. Browser `V1Client` recovery/cursor
storage remains synchronous, including existing `sessionStorage` usage.

Build/test from the root npm workspace:

```sh
npm ci
npm run check:graphql
npm run build
npm test
```

The Browser package is the local workspace dependency. Isolated SDK unit
tests do not establish CockroachDB/WebRTC or hosted-release qualification;
that acceptance belongs to the compatible service's maintained suite.
`V1*` is a current SDK/domain name, not a selectable endpoint version.
