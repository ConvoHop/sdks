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

The permit is transient authorization, not saved command input. An unknown
redemption requires a fresh permit bound to the same original request ID;
generic recovery will not replay a persisted permit or fabricate a bearer.

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
