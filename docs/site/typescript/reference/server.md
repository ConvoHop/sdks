# `@convohop/server`

Server SDK for trusted Node.js runtimes: backend-key data-plane calls, management, webhook verification and push requests.

**Layer:** Server. **Runtime:** Node.js 22 or later. **Source:** `packages/server`.

## Classes

### `ConvoHopManagementClient` class

```ts
class ConvoHopManagementClient
```

Operator-token client for organizations, deployments, projects and backend keys.

#### `ConvoHopManagementClient.http` property

```ts
readonly http: ConvoHopTransport
```

#### `ConvoHopManagementClient` constructor

```ts
constructor(options: {
    baseUrl: string;
    accessToken: string;
    actorId: string;
    recoveryStorage?: RecoveryStorage;
    asyncRecoveryStorage?: AsyncRecoveryStorage;
    fetch?: typeof fetch;
})
```

#### `ConvoHopManagementClient.createOrganization` method

```ts
createOrganization(name: string, termsRef: string): Promise<{
    orgId: string;
    name: string;
    status: string;
    revision: string;
}>
```

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `ConvoHopManagementClient.createDeployment` method

```ts
createDeployment(orgId: string, configuration?: DeploymentOptions): Promise<{
    status: string;
    requestId: string;
    serverTime: string | null;
    receiptId: string | null;
    committedAt: string | null;
    replayed: boolean | null;
    operation: {
        operationId: string;
        owner: string;
        href: string;
        state: string;
    } | null;
    resourceRef: {
        kind: string;
        id: string;
    } | null;
    result: { … } | null;
}>
```

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `ConvoHopManagementClient.createProject` method

```ts
createProject(deploymentId: string, name: string, configuration?: ProjectOptions): Promise<{
    status: string;
    requestId: string;
    serverTime: string | null;
    receiptId: string | null;
    committedAt: string | null;
    replayed: boolean | null;
    operation: {
        operationId: string;
        owner: string;
        href: string;
        state: string;
    } | null;
    resourceRef: {
        kind: string;
        id: string;
    } | null;
    result: { … } | null;
}>
```

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `ConvoHopManagementClient.operation` method

```ts
operation(operationId: string): Promise<{
    operationId: string;
    kind: string;
    state: string;
    revision: string;
    requestedAt: string;
    updatedAt: string;
    blockedReason: string | null;
    targetRef: {
        kind: string;
        id: string;
    } | null;
    steps: Array<{
        stepId: string;
        state: string;
    }>;
    result: { … } | null;
}>
```

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `ConvoHopManagementClient.issueBackendKey` method

```ts
issueBackendKey(projectId: string, name: string, scopes: string[], expiresAt: string): Promise<{
    status: string;
    requestId: string;
    serverTime: string | null;
    receiptId: string | null;
    committedAt: string | null;
    replayed: boolean | null;
    operation: {
        operationId: string;
        owner: string;
        href: string;
        state: string;
    } | null;
    resourceRef: {
        kind: string;
        id: string;
    } | null;
    result: { … } | null;
}>
```

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `ConvoHopManagementClient.deliveryPermit` method

```ts
deliveryPermit(projectId: string, deliveryId: string, redemptionRequestId: string): Promise<ProtocolObject>
```

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

### `ConvoHopProblem` class

```ts
class ConvoHopProblem extends Error
```

Re-exported from `@convohop/core`.

#### `ConvoHopProblem.code` property

```ts
readonly code: string
```

#### `ConvoHopProblem.requestId` property

```ts
readonly requestId: string
```

#### `ConvoHopProblem.outcome` property

```ts
readonly outcome: string
```

#### `ConvoHopProblem.status` property

```ts
readonly status: number
```

#### `ConvoHopProblem.retryAfter` property

```ts
readonly retryAfter?: number
```

Whole seconds to wait before resending the same request, when the authority sent a delay (for example with
`RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds.
The SDK never waits or resends on its own because of it.

#### `ConvoHopProblem` constructor

```ts
constructor(code: string, requestId: string, outcome: string, status: number, message: string, options?: ErrorOptions & {
    retryAfter?: number;
})
```

### `ConvoHopTransport` class

```ts
class ConvoHopTransport
```

Re-exported from `@convohop/core`.

#### `ConvoHopTransport.baseUrl` property

```ts
readonly baseUrl: string
```

#### `ConvoHopTransport.durableRecovery` property

```ts
readonly durableRecovery: boolean
```

#### `ConvoHopTransport.incarnation` property

```ts
incarnation: string
```

#### `ConvoHopTransport.servingEpoch` property

```ts
servingEpoch: string | undefined
```

#### `ConvoHopTransport` constructor

```ts
constructor(options: ConvoHopTransportOptions)
```

#### `ConvoHopTransport.initializeRecovery` method

```ts
initializeRecovery(): Promise<void>
```

#### `ConvoHopTransport.recoveryStates` property

```ts
get recoveryStates(): readonly RecoveryState[]
```

#### `ConvoHopTransport.execute` method

```ts
execute<K extends OperationKey>(key: K, projectId: string | undefined, input: OperationInput<K>, requestId?: string, credentialDeliveryPermit?: ProtocolObject): Promise<OperationPayload<K>>
```

#### `ConvoHopTransport.retry` method

```ts
retry(requestId: string): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>>
```

### `ProjectServerClient` class

```ts
class ProjectServerClient
```

Backend-key client for one project. Runs only in trusted server runtimes; never ship a backend key to a browser.

Every backend-key operation in `schema/annotations.json` has a typed method here; the README lists each method with
the scope it needs. A key without that scope fails with `ScopeRequiredProblem`. Message reads and sends accept
`{ actAs: principalId }` to act as a member; the inbox requires it. Handles from `conversation(id)`,
`liveSession(id)` and `liveOperation(id)` send nothing until a method is called.

#### `ProjectServerClient.projectId` property

```ts
readonly projectId: string
```

#### `ProjectServerClient.http` property

```ts
readonly http: ConvoHopTransport
```

#### `ProjectServerClient` constructor

```ts
constructor(options: {
    baseUrl: string;
    projectId: string;
    backendKey: string;
    incarnation: string;
    recoveryStorage?: RecoveryStorage;
    asyncRecoveryStorage?: AsyncRecoveryStorage;
    fetch?: typeof fetch;
})
```

#### `ProjectServerClient.conversations` property

```ts
readonly conversations: { … }
```

##### `ProjectServerClient.conversations.create` property

```ts
create: (input: GraphqlTypes.CreateConversationRequestInput, options?: CommandOptions) => Promise<Conversation>
```

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `ProjectServerClient.conversation` method

```ts
conversation(conversationId: string): ServerConversation
```

#### `ProjectServerClient.liveSession` method

```ts
liveSession(liveSessionId: string): ServerLiveSession
```

#### `ProjectServerClient.liveOperation` method

```ts
liveOperation(operationId: string): ServerLiveOperation
```

Reattaches to a live operation by ID, for example after a restart or a `RESOLUTION_REQUIRED` timeout.

#### `ProjectServerClient.principals` property

```ts
readonly principals: { … }
```

##### `ProjectServerClient.principals.create` property

```ts
create: (input: {
    externalUserId: string;
}, options?: CommandOptions) => Promise<Principal>
```

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

##### `ProjectServerClient.principals.get` property

```ts
get: (principalId: string) => Promise<Principal>
```

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

##### `ProjectServerClient.principals.disable` property

```ts
disable: (input: {
    principalId: string;
    expectedRevision: string;
}, options?: CommandOptions) => Promise<Principal>
```

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `ProjectServerClient.sessions` property

```ts
readonly sessions: { … }
```

##### `ProjectServerClient.sessions.issue` property

```ts
issue: (input: {
    principalId: string;
    deviceId: string;
    requestedTtlMs?: string;
}, options?: CommandOptions) => Promise<SessionBootstrap>
```

Issues a user session (`sessionIssue`). The TTL is a decimal string of milliseconds and defaults to 15 minutes.

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

##### `ProjectServerClient.sessions.renew` property

```ts
renew: (input: {
    sessionId: string;
    principalId: string;
    deviceId: string;
    expectedRevision: string;
    requestedTtlMs?: string;
}, options?: CommandOptions) => Promise<SessionBootstrap>
```

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

##### `ProjectServerClient.sessions.revoke` property

```ts
revoke: (input: {
    sessionId: string;
    expectedRevision: string;
}, options?: CommandOptions) => Promise<SessionRevocation>
```

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

##### `ProjectServerClient.sessions.outcome` property

```ts
outcome: (requestId: string) => Promise<SessionRequestOutcome>
```

Reads the outcome of an issue or renew request (`sessionIssue` and `sessionManage`).

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `ProjectServerClient.requests` property

```ts
readonly requests: { … }
```

##### `ProjectServerClient.requests.resolve` property

```ts
resolve: (requestId: string) => Promise<RequestResolution>
```

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

##### `ProjectServerClient.requests.retry` property

```ts
retry: (requestId: string) => Promise<RequestResolution>
```

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ProjectServerClient.capabilities` method

```ts
capabilities(): Promise<Capabilities>
```

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `ProjectServerClient.operation` method

```ts
operation(operationId: string): Promise<OperationStatus>
```

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `ProjectServerClient.inbox` method

```ts
inbox(options: InboxOptions): Promise<InboxPage>
```

Lists the conversations visible to the `actAs` member, as that member's inbox (`messageRead`; audited).

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `ProjectServerClient.search` method

```ts
search(query: string, options?: SearchOptions): Promise<SearchPage>
```

Searches messages (`messageRead`) as the `actAs` member, or within `conversationIds`.

Sends [`communication.search`](../../operations/communication/search.md).

#### `ProjectServerClient.initialize` method

```ts
initialize(): Promise<void>
```

Sends [`communication.route`](../../operations/communication/route.md).

#### `ProjectServerClient.createPrincipal` method

```ts
createPrincipal(externalUserId: string): Promise<string>
```

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `ProjectServerClient.issueSession` method

```ts
issueSession(principalId: string, deviceId: string, requestedTtlMs?: string): Promise<SessionBootstrap>
```

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `ProjectServerClient.sessionRequestOutcome` method

```ts
sessionRequestOutcome(requestId: string): Promise<SessionRequestOutcome>
```

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `ProjectServerClient.createConversation` method

```ts
createConversation(title: string, members: {
    principalId: string;
    role: "member" | "moderator";
}[]): Promise<Conversation>
```

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `ProjectServerClient.addMembers` method

```ts
addMembers(conversationId: string, members: GraphqlTypes.MemberBatchEntryInput[], requestId?: string): Promise<Membership[]>
```

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

### `PushPayloadError` class

```ts
class PushPayloadError extends Error
```

A push payload that couldn't be built. The message names the field but never contains its value.

#### `PushPayloadError.code` property

```ts
readonly code: PushPayloadCode
```

#### `PushPayloadError` constructor

```ts
constructor(code: PushPayloadCode, message: string)
```

### `ScopeRequiredProblem` class

```ts
class ScopeRequiredProblem extends ConvoHopProblem
```

`SCOPE_REQUIRED`: the backend key lacks a scope the operation requires (403, rejected, not retryable).
Classify it by `instanceof ConvoHopProblem` and `code`; `scope` is a diagnostic detail.

Re-exported from `@convohop/core`.

#### `ScopeRequiredProblem.code` property

```ts
readonly code: "SCOPE_REQUIRED"
```

#### `ScopeRequiredProblem.scope` property

```ts
readonly scope: string | undefined
```

The missing scope. The authority names it only in the message, so this is `undefined` when the message does not
match the documented wording. A missing read scope is reported as the read scope even where its manage scope
(for example `callManage` for `callRead`) would also satisfy the operation.

#### `ScopeRequiredProblem` constructor

```ts
constructor(requestId: string, outcome: string, status: number, message: string, options?: ErrorOptions & {
    retryAfter?: number;
})
```

#### `ScopeRequiredProblem.requestId` property

```ts
readonly requestId: string
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.outcome` property

```ts
readonly outcome: string
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.status` property

```ts
readonly status: number
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.retryAfter` property

```ts
readonly retryAfter?: number
```

Whole seconds to wait before resending the same request, when the authority sent a delay (for example with
`RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds.
The SDK never waits or resends on its own because of it.

Inherited from `ConvoHopProblem`.

### `ServerConversation` class

```ts
class ServerConversation
```

Backend view of one conversation. Creating the handle sends no request; each method needs the scope named in the
README. Message reads and sends accept `actAs` to act as a member principal.

#### `ServerConversation.client` property

```ts
readonly client: ProjectServerClient
```

#### `ServerConversation.conversationId` property

```ts
readonly conversationId: string
```

#### `ServerConversation.messages` property

```ts
readonly messages: { … }
```

##### `ServerConversation.messages.list` method

```ts
list(options?: MessageListOptions): Promise<MessagePage>
```

Sends [`communication.messages`](../../operations/communication/messages.md).

##### `ServerConversation.messages.get` method

```ts
get(messageId: string, options?: ActAsOptions): Promise<ConversationMessage>
```

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

##### `ServerConversation.messages.send` method

```ts
send(message: {
    text: string;
    props?: ProtocolObject;
}, options?: ActAsCommandOptions): Promise<SendReceipt>
```

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

##### `ServerConversation.messages.edit` method

```ts
edit(input: Omit<GraphqlTypes.EditMessageRequestInput, "conversationId">, options?: CommandOptions): Promise<ConversationMessage>
```

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

##### `ServerConversation.messages.delete` method

```ts
delete(input: Omit<GraphqlTypes.DeleteMessageRequestInput, "conversationId">, options?: CommandOptions): Promise<ConversationMessage>
```

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ServerConversation.members` property

```ts
readonly members: { … }
```

##### `ServerConversation.members.list` method

```ts
list(options?: PageOptions): Promise<MemberPage>
```

Sends [`communication.members`](../../operations/communication/members.md).

##### `ServerConversation.members.add` method

```ts
add(input: {
    principalId: string;
    role: MemberRole;
    expectedRevision: string;
}, options?: CommandOptions): Promise<Membership>
```

Sends [`communication.addMember`](../../operations/communication/addMember.md).

##### `ServerConversation.members.addBatch` method

```ts
addBatch(members: GraphqlTypes.MemberBatchEntryInput[], options?: CommandOptions): Promise<Membership[]>
```

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

##### `ServerConversation.members.remove` method

```ts
remove(input: {
    principalId: string;
    expectedRevision: string;
}, options?: CommandOptions): Promise<Membership>
```

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

##### `ServerConversation.members.grantHistory` method

```ts
grantHistory(input: Omit<GraphqlTypes.HistoryGrantRequestInput, "conversationId">, options?: CommandOptions): Promise<Membership>
```

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

##### `ServerConversation.members.setBroadcastPermission` method

```ts
setBroadcastPermission(input: Omit<GraphqlTypes.SetBroadcastPermissionInput, "conversationId">, options?: CommandOptions): Promise<OperationPayload<"communication.setBroadcastPermission">>
```

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

##### `ServerConversation.members.getMute` method

```ts
getMute(principalId: string): Promise<ConversationMute>
```

Reads a member's mute, acting as that member; audited.

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

##### `ServerConversation.members.setMute` method

```ts
setMute(input: SetMemberMuteInput, options?: CommandOptions): Promise<ConversationMute>
```

Sets a member's mute, acting as that member; audited. Calls still ring a muted member.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `ServerConversation.live` property

```ts
readonly live: { … }
```

##### `ServerConversation.live.current` method

```ts
current(): Promise<LiveSession | null>
```

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

##### `ServerConversation.live.history` method

```ts
history(options?: PageOptions): Promise<LiveSessionPage>
```

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `ServerConversation` constructor

```ts
constructor(client: ProjectServerClient, conversationId: string)
```

#### `ServerConversation.get` method

```ts
get(): Promise<Conversation>
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `ServerConversation.update` method

```ts
update(input: Omit<GraphqlTypes.UpdateConversationRequestInput, "conversationId">, options?: CommandOptions): Promise<Conversation>
```

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

### `ServerLiveOperation` class

```ts
class ServerLiveOperation
```

A live start or end operation. The first read locks its live session and kind; later reads must match.

#### `ServerLiveOperation.client` property

```ts
readonly client: ProjectServerClient
```

#### `ServerLiveOperation.receipt` property

```ts
readonly receipt?: LiveEndReceipt | undefined
```

#### `ServerLiveOperation.operationId` property

```ts
readonly operationId: string
```

#### `ServerLiveOperation` constructor

```ts
constructor(client: ProjectServerClient, operationId: string, receipt?: LiveEndReceipt | undefined)
```

#### `ServerLiveOperation.get` method

```ts
get(): Promise<LiveOperation>
```

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `ServerLiveOperation.completed` method

```ts
completed(options?: LiveWaitOptions): Promise<LiveOperationCompletion>
```

Polls until the operation completes. An END completion must carry an enforced media cutoff. A failure throws a
`ConvoHopProblem` with the live error code; the deadline throws `RESOLUTION_REQUIRED`, which is not a cutoff.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

### `ServerLiveSession` class

```ts
class ServerLiveSession
```

Backend view of one live session (`callRead` or `callManage` to read; `callManage` to alert or end). Creating the
handle sends no request. Mutations take the generation and revision you observed, so a retry with the same
`requestId` resends the original payload.

#### `ServerLiveSession.client` property

```ts
readonly client: ProjectServerClient
```

#### `ServerLiveSession.liveSessionId` property

```ts
readonly liveSessionId: string
```

#### `ServerLiveSession` constructor

```ts
constructor(client: ProjectServerClient, liveSessionId: string)
```

#### `ServerLiveSession.get` method

```ts
get(): Promise<LiveSession>
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `ServerLiveSession.participants` method

```ts
participants(options?: PageOptions): Promise<LiveParticipantPage>
```

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `ServerLiveSession.alert` method

```ts
alert(input: {
    expectedGeneration: string;
    principalIds: readonly string[];
}, options?: CommandOptions): Promise<LiveAlertBatch>
```

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `ServerLiveSession.end` method

```ts
end(input: {
    expectedGeneration: string;
    expectedRevision: string;
}, options?: CommandOptions): Promise<ServerLiveOperation>
```

Requests the end. The returned operation completes once the authority has enforced the media cutoff.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

### `WebhookVerificationError` class

```ts
class WebhookVerificationError extends Error
```

A delivery that failed verification. The message never contains secrets, signatures or the body.

#### `WebhookVerificationError.code` property

```ts
readonly code: WebhookVerificationCode
```

#### `WebhookVerificationError` constructor

```ts
constructor(code: WebhookVerificationCode, message: string)
```

## Interfaces

### `ActAsCommandOptions` interface

```ts
interface ActAsCommandOptions extends ActAsOptions, CommandOptions
```

#### `ActAsCommandOptions.actAs` property

```ts
actAs?: string
```

Inherited from `ActAsOptions`.

#### `ActAsCommandOptions.requestId` property

```ts
requestId?: string
```

Inherited from `CommandOptions`.

### `ActAsOptions` interface

```ts
interface ActAsOptions
```

Acts as a member principal. Reads are scoped to that member's visibility, sends are authored by it; audited.

#### `ActAsOptions.actAs` property

```ts
actAs?: string
```

### `ApnsPushOptions` interface

```ts
interface ApnsPushOptions extends PushOptions
```

#### `ApnsPushOptions.bundleId` property

```ts
bundleId: string
```

The app's bundle ID: the `apns-topic` of alerts. VoIP pushes use `<bundleId>.voip`.

#### `ApnsPushOptions.title` property

```ts
title?: string | undefined
```

The visible title, such as the sender's or conversation's name. Omitted when empty.

Inherited from `PushOptions`.

#### `ApnsPushOptions.body` property

```ts
body?: string | undefined
```

The visible body. Replaces the message preview. Omitted when empty.

Inherited from `PushOptions`.

#### `ApnsPushOptions.preview` property

```ts
preview?: boolean
```

Whether a message event's preview becomes the body when `body` is empty. Defaults to `true`.

Inherited from `PushOptions`.

#### `ApnsPushOptions.now` property

```ts
now?: Date
```

The clock for the TTL and expiration. Defaults to the current time.

Inherited from `PushOptions`.

### `AsyncRecoveryStorage` interface

```ts
interface AsyncRecoveryStorage
```

Re-exported from `@convohop/core`.

#### `AsyncRecoveryStorage.getItem` method

```ts
getItem(key: string): Promise<string | null>
```

#### `AsyncRecoveryStorage.setItem` method

```ts
setItem(key: string, value: string): Promise<void>
```

#### `AsyncRecoveryStorage.removeItem` method

```ts
removeItem(key: string): Promise<void>
```

### `CommandOptions` interface

```ts
interface CommandOptions
```

Re-exported from `@convohop/core`.

#### `CommandOptions.requestId` property

```ts
requestId?: string
```

### `Connectivity` interface

```ts
interface Connectivity
```

Network reachability.

Re-exported from `@convohop/core`.

#### `Connectivity.online` property

```ts
readonly online: boolean
```

Whether the device may reach the network. Report `true` when it isn't known.

#### `Connectivity.subscribe` method

```ts
subscribe(listener: (online: boolean) => void): () => void
```

Calls `listener` when reachability changes, until the returned function is called.

### `ConvoHopPlatform` interface

```ts
interface ConvoHopPlatform
```

Runtime services for runtimes that lack a browser global, such as React Native. Every field is optional and
falls back to the global of the same name, looked up when it is used. The transport uses `randomUUID`, `sha256`
and `URL`; `@convohop/client` also uses `WebSocket`, `connectivity` and `lifecycle`.

Re-exported from `@convohop/core`.

#### `ConvoHopPlatform.randomUUID` property

```ts
randomUUID?: () => string
```

A new random UUID in canonical lowercase form. Default: `crypto.randomUUID()`.

#### `ConvoHopPlatform.sha256` property

```ts
sha256?: (data: Uint8Array) => Promise<Uint8Array>
```

The 32-byte SHA-256 digest of `data`. Default: `crypto.subtle.digest("SHA-256", data)`.

#### `ConvoHopPlatform.URL` property

```ts
URL?: PlatformURLConstructor
```

A WHATWG URL constructor. Default: the global `URL`. The SDK checks it before first use and refuses one that doesn't conform.

#### `ConvoHopPlatform.WebSocket` property

```ts
WebSocket?: PlatformWebSocketConstructor
```

Opens the realtime connection. Default: the global `WebSocket`.

#### `ConvoHopPlatform.connectivity` property

```ts
connectivity?: Connectivity
```

Network reachability. The outbox waits while offline. Coming online starts a waiting outbox entry and realtime
reconnection at once. Default in browsers: `navigator.onLine` and `online`/`offline` events; elsewhere always online.

#### `ConvoHopPlatform.lifecycle` property

```ts
lifecycle?: Lifecycle
```

Foreground state. Returning to `active` starts waiting realtime reconnection, due outbox entries and due session
renewal at once. It never changes retry budgets, request IDs or payloads. Default in browsers: page visibility.

### `ConvoHopTransportOptions` interface

```ts
interface ConvoHopTransportOptions
```

Re-exported from `@convohop/core`.

#### `ConvoHopTransportOptions.baseUrl` property

```ts
baseUrl: string
```

#### `ConvoHopTransportOptions.credential` property

```ts
credential?: string
```

#### `ConvoHopTransportOptions.namespace` property

```ts
namespace: string
```

#### `ConvoHopTransportOptions.incarnation` property

```ts
incarnation?: string
```

#### `ConvoHopTransportOptions.recoveryStorage` property

```ts
recoveryStorage?: RecoveryStorage
```

#### `ConvoHopTransportOptions.asyncRecoveryStorage` property

```ts
asyncRecoveryStorage?: AsyncRecoveryStorage
```

#### `ConvoHopTransportOptions.fetch` property

```ts
fetch?: typeof fetch
```

#### `ConvoHopTransportOptions.platform` property

```ts
platform?: ConvoHopPlatform
```

Runtime services that replace missing globals, such as in React Native. See `ConvoHopPlatform`.

### `InboxOptions` interface

```ts
interface InboxOptions extends PageOptions
```

The inbox is always read as one member, so `actAs` is required.

#### `InboxOptions.actAs` property

```ts
actAs: string
```

#### `InboxOptions.cursor` property

```ts
cursor?: string
```

Inherited from `PageOptions`.

#### `InboxOptions.limit` property

```ts
limit?: number
```

Inherited from `PageOptions`.

### `ItemPage` interface

```ts
interface ItemPage<T>
```

Re-exported from `@convohop/core`.

#### `ItemPage.items` property

```ts
items: T[]
```

#### `ItemPage.complete` property

```ts
complete: boolean
```

#### `ItemPage.refreshRequired` property

```ts
refreshRequired: boolean
```

#### `ItemPage.nextCursor` property

```ts
nextCursor?: unknown
```

### `Lifecycle` interface

```ts
interface Lifecycle
```

Whether the app is in the foreground.

Re-exported from `@convohop/core`.

#### `Lifecycle.state` property

```ts
readonly state: LifecycleState
```

#### `Lifecycle.subscribe` method

```ts
subscribe(listener: (state: LifecycleState) => void): () => void
```

Calls `listener` when the state changes, until the returned function is called.

### `LiveWaitOptions` interface

```ts
interface LiveWaitOptions
```

#### `LiveWaitOptions.signal` property

```ts
signal?: AbortSignal
```

#### `LiveWaitOptions.timeoutMs` property

```ts
timeoutMs?: number
```

### `MessageListOptions` interface

```ts
interface MessageListOptions extends ActAsOptions
```

#### `MessageListOptions.beforeSequence` property

```ts
beforeSequence?: string
```

#### `MessageListOptions.limit` property

```ts
limit?: number
```

#### `MessageListOptions.actAs` property

```ts
actAs?: string
```

Inherited from `ActAsOptions`.

### `OperationTypes` interface

```ts
interface OperationTypes
```

Re-exported from `@convohop/core`.

### `PageOptions` interface

```ts
interface PageOptions
```

Re-exported from `@convohop/core`.

#### `PageOptions.cursor` property

```ts
cursor?: string
```

#### `PageOptions.limit` property

```ts
limit?: number
```

### `PlatformURL` interface

```ts
interface PlatformURL
```

The parts of a WHATWG `URL` the SDKs read.

Re-exported from `@convohop/core`.

#### `PlatformURL.href` property

```ts
readonly href: string
```

#### `PlatformURL.origin` property

```ts
readonly origin: string
```

#### `PlatformURL.protocol` property

```ts
readonly protocol: string
```

#### `PlatformURL.username` property

```ts
readonly username: string
```

#### `PlatformURL.password` property

```ts
readonly password: string
```

#### `PlatformURL.host` property

```ts
readonly host: string
```

#### `PlatformURL.hostname` property

```ts
readonly hostname: string
```

#### `PlatformURL.port` property

```ts
readonly port: string
```

#### `PlatformURL.pathname` property

```ts
readonly pathname: string
```

#### `PlatformURL.search` property

```ts
readonly search: string
```

#### `PlatformURL.hash` property

```ts
readonly hash: string
```

### `PlatformWebSocket` interface

```ts
interface PlatformWebSocket
```

The parts of a `WebSocket` the client uses.

Re-exported from `@convohop/core`.

#### `PlatformWebSocket.onopen` property

```ts
onopen: Handler<unknown> | null
```

#### `PlatformWebSocket.onmessage` property

```ts
onmessage: Handler<{
    readonly data: unknown;
}> | null
```

#### `PlatformWebSocket.onerror` property

```ts
onerror: Handler<unknown> | null
```

#### `PlatformWebSocket.onclose` property

```ts
onclose: Handler<{
    readonly code: number;
}> | null
```

#### `PlatformWebSocket.send` method

```ts
send(data: string): void
```

#### `PlatformWebSocket.close` method

```ts
close(code?: number, reason?: string): void
```

### `ProjectRoute` interface

```ts
interface ProjectRoute
```

Re-exported from `@convohop/core`.

#### `ProjectRoute.projectId` property

```ts
projectId: string
```

#### `ProjectRoute.incarnation` property

```ts
incarnation: string
```

#### `ProjectRoute.servingEpoch` property

```ts
servingEpoch: string
```

#### `ProjectRoute.communicationBase` property

```ts
communicationBase: string
```

#### `ProjectRoute.wssUrl` property

```ts
wssUrl: string
```

#### `ProjectRoute.expiresAt` property

```ts
expiresAt: string
```

#### `ProjectRoute.signature` property

```ts
signature: string
```

### `PushOptions` interface

```ts
interface PushOptions
```

#### `PushOptions.title` property

```ts
title?: string | undefined
```

The visible title, such as the sender's or conversation's name. Omitted when empty.

#### `PushOptions.body` property

```ts
body?: string | undefined
```

The visible body. Replaces the message preview. Omitted when empty.

#### `PushOptions.preview` property

```ts
preview?: boolean
```

Whether a message event's preview becomes the body when `body` is empty. Defaults to `true`.

#### `PushOptions.now` property

```ts
now?: Date
```

The clock for the TTL and expiration. Defaults to the current time.

### `RecoveryState` interface

```ts
interface RecoveryState
```

Re-exported from `@convohop/core`.

#### `RecoveryState.requestId` property

```ts
requestId: string
```

#### `RecoveryState.incarnation` property

```ts
incarnation: string
```

#### `RecoveryState.payloadFingerprint` property

```ts
payloadFingerprint: string
```

#### `RecoveryState.operation` property

```ts
operation: OperationKey
```

#### `RecoveryState.projectId` property

```ts
projectId?: string
```

#### `RecoveryState.input` property

```ts
input: ProtocolObject
```

#### `RecoveryState.firstSubmittedAt` property

```ts
firstSubmittedAt: number
```

#### `RecoveryState.retryDeadline` property

```ts
retryDeadline: number
```

#### `RecoveryState.attemptCount` property

```ts
attemptCount: number
```

#### `RecoveryState.lastAttemptAt` property

```ts
lastAttemptAt: number
```

#### `RecoveryState.lastAttemptClassification` property

```ts
lastAttemptClassification: string
```

#### `RecoveryState.resolutionState` property

```ts
resolutionState: "pending" | "unknown" | "committed" | "accepted"
```

#### `RecoveryState.mediaAdmissionAttempted` property

```ts
mediaAdmissionAttempted?: true
```

### `RecoveryStorage` interface

```ts
interface RecoveryStorage
```

Re-exported from `@convohop/core`.

#### `RecoveryStorage.getItem` method

```ts
getItem(key: string): string | null
```

#### `RecoveryStorage.setItem` method

```ts
setItem(key: string, value: string): void
```

#### `RecoveryStorage.removeItem` method

```ts
removeItem(key: string): void
```

### `SearchOptions` interface

```ts
interface SearchOptions extends PageOptions, ActAsOptions
```

Search as the `actAs` member, or across `conversationIds` (1 or more) with the backend's own visibility.

#### `SearchOptions.conversationIds` property

```ts
conversationIds?: readonly string[]
```

#### `SearchOptions.cursor` property

```ts
cursor?: string
```

Inherited from `PageOptions`.

#### `SearchOptions.limit` property

```ts
limit?: number
```

Inherited from `PageOptions`.

#### `SearchOptions.actAs` property

```ts
actAs?: string
```

Inherited from `ActAsOptions`.

### `SetMemberMuteInput` interface

```ts
interface SetMemberMuteInput
```

Mutes or unmutes a member's message push notifications. `until` (RFC 3339, in the future) applies only to a mute.

#### `SetMemberMuteInput.principalId` property

```ts
principalId: string
```

#### `SetMemberMuteInput.muted` property

```ts
muted: boolean
```

#### `SetMemberMuteInput.until` property

```ts
until?: string
```

### `WebhookCallCancelledNotificationEvent` interface

```ts
interface WebhookCallCancelledNotificationEvent extends WebhookNotificationFields
```

A ring that stopped for the recipient. Only recipients of the ring's `notification.call` get it.

#### `WebhookCallCancelledNotificationEvent.eventType` property

```ts
eventType: "notification.callCancelled"
```

#### `WebhookCallCancelledNotificationEvent.subjectRef` property

```ts
subjectRef: { … }
```

##### `WebhookCallCancelledNotificationEvent.subjectRef.id` property

```ts
id: string
```

##### `WebhookCallCancelledNotificationEvent.subjectRef.kind` property

```ts
kind: "liveSession"
```

#### `WebhookCallCancelledNotificationEvent.liveSessionId` property

```ts
liveSessionId: string
```

#### `WebhookCallCancelledNotificationEvent.alertId` property

```ts
alertId: string
```

The `alertId` of the ring that stopped.

#### `WebhookCallCancelledNotificationEvent.expiresAt` property

```ts
expiresAt: string
```

The stopped ring's original deadline (RFC 3339).

#### `WebhookCallCancelledNotificationEvent.mediaProfile` property

```ts
mediaProfile: WebhookCallMediaProfile
```

#### `WebhookCallCancelledNotificationEvent.reason` property

```ts
reason: WebhookCallCancelReason
```

#### `WebhookCallCancelledNotificationEvent.known` property

```ts
known: true
```

Inherited from `WebhookNotificationFields`.

#### `WebhookCallCancelledNotificationEvent.recipientId` property

```ts
recipientId: string
```

The principal to notify. Each recipient gets its own event.

Inherited from `WebhookNotificationFields`.

#### `WebhookCallCancelledNotificationEvent.conversationId` property

```ts
conversationId: string
```

Inherited from `WebhookNotificationFields`.

#### `WebhookCallCancelledNotificationEvent.senderId` property

```ts
senderId: string
```

The principal who sent the message or started the ringing.

Inherited from `WebhookNotificationFields`.

#### `WebhookCallCancelledNotificationEvent.connected` property

```ts
connected: boolean
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending
policy: it isn't per device, and it can change before you send. The push builders ignore it.

Inherited from `WebhookNotificationFields`.

#### `WebhookCallCancelledNotificationEvent.eventId` property

```ts
eventId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookCallCancelledNotificationEvent.occurredAt` property

```ts
occurredAt: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookCallCancelledNotificationEvent.projectId` property

```ts
projectId: string
```

Inherited from `WebhookEnvelope`.

### `WebhookCallNotificationEvent` interface

```ts
interface WebhookCallNotificationEvent extends WebhookNotificationFields
```

An incoming call: one ring for the recipient.

#### `WebhookCallNotificationEvent.eventType` property

```ts
eventType: "notification.call"
```

#### `WebhookCallNotificationEvent.subjectRef` property

```ts
subjectRef: { … }
```

##### `WebhookCallNotificationEvent.subjectRef.id` property

```ts
id: string
```

##### `WebhookCallNotificationEvent.subjectRef.kind` property

```ts
kind: "liveSession"
```

#### `WebhookCallNotificationEvent.liveSessionId` property

```ts
liveSessionId: string
```

#### `WebhookCallNotificationEvent.alertId` property

```ts
alertId: string
```

This ring for this recipient. A later ring of the same call has a new `alertId`.

#### `WebhookCallNotificationEvent.expiresAt` property

```ts
expiresAt: string
```

When the ringing stops (RFC 3339).

#### `WebhookCallNotificationEvent.mediaProfile` property

```ts
mediaProfile: WebhookCallMediaProfile
```

#### `WebhookCallNotificationEvent.known` property

```ts
known: true
```

Inherited from `WebhookNotificationFields`.

#### `WebhookCallNotificationEvent.recipientId` property

```ts
recipientId: string
```

The principal to notify. Each recipient gets its own event.

Inherited from `WebhookNotificationFields`.

#### `WebhookCallNotificationEvent.conversationId` property

```ts
conversationId: string
```

Inherited from `WebhookNotificationFields`.

#### `WebhookCallNotificationEvent.senderId` property

```ts
senderId: string
```

The principal who sent the message or started the ringing.

Inherited from `WebhookNotificationFields`.

#### `WebhookCallNotificationEvent.connected` property

```ts
connected: boolean
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending
policy: it isn't per device, and it can change before you send. The push builders ignore it.

Inherited from `WebhookNotificationFields`.

#### `WebhookCallNotificationEvent.eventId` property

```ts
eventId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookCallNotificationEvent.occurredAt` property

```ts
occurredAt: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookCallNotificationEvent.projectId` property

```ts
projectId: string
```

Inherited from `WebhookEnvelope`.

### `WebhookDelivery` interface

```ts
interface WebhookDelivery extends WebhookSignature
```

#### `WebhookDelivery.event` property

```ts
event: WebhookEvent
```

#### `WebhookDelivery.webhookId` property

```ts
webhookId: string
```

Inherited from `WebhookSignature`.

#### `WebhookDelivery.timestamp` property

```ts
timestamp: number
```

Inherited from `WebhookSignature`.

### `WebhookEndpointDisabledEvent` interface

```ts
interface WebhookEndpointDisabledEvent extends WebhookEnvelope
```

One of the project's other webhook endpoints was disabled after repeated failures. `subjectRef.id` names it.

#### `WebhookEndpointDisabledEvent.known` property

```ts
known: true
```

#### `WebhookEndpointDisabledEvent.eventType` property

```ts
eventType: "webhook.endpointDisabled"
```

#### `WebhookEndpointDisabledEvent.subjectRef` property

```ts
subjectRef: { … }
```

##### `WebhookEndpointDisabledEvent.subjectRef.id` property

```ts
id: string
```

##### `WebhookEndpointDisabledEvent.subjectRef.kind` property

```ts
kind: "webhookEndpoint"
```

#### `WebhookEndpointDisabledEvent.eventId` property

```ts
eventId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookEndpointDisabledEvent.occurredAt` property

```ts
occurredAt: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookEndpointDisabledEvent.projectId` property

```ts
projectId: string
```

Inherited from `WebhookEnvelope`.

### `WebhookMessageNotificationEvent` interface

```ts
interface WebhookMessageNotificationEvent extends WebhookNotificationFields
```

A message for the recipient.

#### `WebhookMessageNotificationEvent.eventType` property

```ts
eventType: "notification.message"
```

#### `WebhookMessageNotificationEvent.subjectRef` property

```ts
subjectRef: { … }
```

##### `WebhookMessageNotificationEvent.subjectRef.id` property

```ts
id: string
```

##### `WebhookMessageNotificationEvent.subjectRef.kind` property

```ts
kind: "message"
```

#### `WebhookMessageNotificationEvent.messageId` property

```ts
messageId: string
```

#### `WebhookMessageNotificationEvent.preview` property

```ts
preview?: WebhookNotificationPreview
```

#### `WebhookMessageNotificationEvent.known` property

```ts
known: true
```

Inherited from `WebhookNotificationFields`.

#### `WebhookMessageNotificationEvent.recipientId` property

```ts
recipientId: string
```

The principal to notify. Each recipient gets its own event.

Inherited from `WebhookNotificationFields`.

#### `WebhookMessageNotificationEvent.conversationId` property

```ts
conversationId: string
```

Inherited from `WebhookNotificationFields`.

#### `WebhookMessageNotificationEvent.senderId` property

```ts
senderId: string
```

The principal who sent the message or started the ringing.

Inherited from `WebhookNotificationFields`.

#### `WebhookMessageNotificationEvent.connected` property

```ts
connected: boolean
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending
policy: it isn't per device, and it can change before you send. The push builders ignore it.

Inherited from `WebhookNotificationFields`.

#### `WebhookMessageNotificationEvent.eventId` property

```ts
eventId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookMessageNotificationEvent.occurredAt` property

```ts
occurredAt: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookMessageNotificationEvent.projectId` property

```ts
projectId: string
```

Inherited from `WebhookEnvelope`.

### `WebhookNotificationPreview` interface

```ts
interface WebhookNotificationPreview
```

The start of the message text. Present only when the project opts in to previews and the message has text.

#### `WebhookNotificationPreview.text` property

```ts
text: string
```

1 to 512 Unicode code points.

#### `WebhookNotificationPreview.truncated` property

```ts
truncated: boolean
```

Whether the message text continues after `text`.

### `WebhookResourceEvent` interface

```ts
interface WebhookResourceEvent extends WebhookEnvelope
```

A change to a conversation, member, message, receipt or call. `subjectRef` names the resource.

#### `WebhookResourceEvent.known` property

```ts
known: true
```

#### `WebhookResourceEvent.eventType` property

```ts
eventType: Exclude<WebhookEventType, "webhook.endpointDisabled" | WebhookNotificationEventType>
```

#### `WebhookResourceEvent.eventId` property

```ts
eventId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookResourceEvent.occurredAt` property

```ts
occurredAt: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookResourceEvent.projectId` property

```ts
projectId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookResourceEvent.subjectRef` property

```ts
subjectRef: { … }
```

Inherited from `WebhookEnvelope`.

##### `WebhookResourceEvent.subjectRef.id` property

```ts
id: string
```

##### `WebhookResourceEvent.subjectRef.kind` property

```ts
kind: string
```

### `WebhookSignature` interface

```ts
interface WebhookSignature
```

A verified delivery's `webhook-id` and `webhook-timestamp` (Unix seconds).

#### `WebhookSignature.webhookId` property

```ts
webhookId: string
```

#### `WebhookSignature.timestamp` property

```ts
timestamp: number
```

### `WebhookUnknownEvent` interface

```ts
interface WebhookUnknownEvent extends WebhookEnvelope
```

An event this SDK does not know, including a `notification.*` event that doesn't match the push payload contract.
Acknowledge it; it never makes `verify()` throw.

#### `WebhookUnknownEvent.known` property

```ts
known: false
```

#### `WebhookUnknownEvent.eventId` property

```ts
eventId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookUnknownEvent.eventType` property

```ts
eventType: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookUnknownEvent.occurredAt` property

```ts
occurredAt: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookUnknownEvent.projectId` property

```ts
projectId: string
```

Inherited from `WebhookEnvelope`.

#### `WebhookUnknownEvent.subjectRef` property

```ts
subjectRef: { … }
```

Inherited from `WebhookEnvelope`.

##### `WebhookUnknownEvent.subjectRef.id` property

```ts
id: string
```

##### `WebhookUnknownEvent.subjectRef.kind` property

```ts
kind: string
```

### `WebhookVerifyOptions` interface

```ts
interface WebhookVerifyOptions
```

#### `WebhookVerifyOptions.headers` property

```ts
headers: WebhookHeaders
```

#### `WebhookVerifyOptions.body` property

```ts
body: string | Uint8Array
```

The exact request body bytes, or their exact UTF-8 decoding. Never re-serialized JSON.

#### `WebhookVerifyOptions.secrets` property

```ts
secrets: string | readonly string[]
```

The endpoint's `whsec_` secrets: the current one and, during a rotation, the next or replaced one.

#### `WebhookVerifyOptions.toleranceSeconds` property

```ts
toleranceSeconds?: number
```

Allowed distance between `webhook-timestamp` and `now`, in whole seconds, inclusive. Defaults to 300.

#### `WebhookVerifyOptions.now` property

```ts
now?: Date
```

The verifier's clock. Defaults to the current time.

## Types

### `ApnsAlert` type

```ts
type ApnsAlert = { … }
```

#### `ApnsAlert.title` property

```ts
title?: string
```

#### `ApnsAlert.body` property

```ts
body?: string
```

#### `ApnsAlert.loc-key` property

```ts
"loc-key"?: string
```

Present when there is no body: `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` or `CONVOHOP_MISSED_CALL`.

### `ApnsAlertRequest` type

```ts
type ApnsAlertRequest = { … }
```

#### `ApnsAlertRequest.headers` property

```ts
headers: ApnsHeaders
```

#### `ApnsAlertRequest.payload` property

```ts
payload: { … }
```

##### `ApnsAlertRequest.payload.aps` property

```ts
aps: { … }
```

###### `ApnsAlertRequest.payload.aps.alert` property

```ts
alert: ApnsAlert
```

###### `ApnsAlertRequest.payload.aps.sound` property

```ts
sound: string
```

###### `ApnsAlertRequest.payload.aps.mutable-content` property

```ts
"mutable-content": 0 | 1
```

###### `ApnsAlertRequest.payload.aps.thread-id` property

```ts
"thread-id": string
```

##### `ApnsAlertRequest.payload.convohop` property

```ts
convohop: PushData
```

### `ApnsHeaders` type

```ts
type ApnsHeaders = { … }
```

HTTP/2 headers for APNs. Your APNs client adds `authorization` and sends to `/3/device/<token>`.

#### `ApnsHeaders.apns-push-type` property

```ts
"apns-push-type": "alert" | "voip"
```

#### `ApnsHeaders.apns-topic` property

```ts
"apns-topic": string
```

#### `ApnsHeaders.apns-priority` property

```ts
"apns-priority": "5" | "10"
```

#### `ApnsHeaders.apns-expiration` property

```ts
"apns-expiration": string
```

Unix seconds after which APNs stops trying to deliver.

#### `ApnsHeaders.apns-collapse-id` property

```ts
"apns-collapse-id"?: string
```

Calls and missed calls: the ring's collapse key, so a missed-call alert replaces the ring's incoming-call alert.

### `ApnsVoipRequest` type

```ts
type ApnsVoipRequest = { … }
```

#### `ApnsVoipRequest.headers` property

```ts
headers: ApnsHeaders
```

#### `ApnsVoipRequest.payload` property

```ts
payload: { … }
```

##### `ApnsVoipRequest.payload.convohop` property

```ts
convohop: PushData
```

### `Capabilities` type

```ts
type Capabilities = NonNullable<OperationPayload<"communication.capabilities">["result"]>
```

### `Conversation` type

```ts
type Conversation = NonNullable<OperationPayload<"communication.getConversation">["result"]>
```

Re-exported from `@convohop/core`.

### `ConversationCursor` type

```ts
type ConversationCursor = NonNullable<NonNullable<OperationPayload<"communication.events">["result"]>["nextCursor"]>
```

Re-exported from `@convohop/core`.

### `ConversationMessage` type

```ts
type ConversationMessage = NonNullable<OperationPayload<"communication.getMessage">["result"]>
```

Re-exported from `@convohop/core`.

### `ConversationMute` type

```ts
type ConversationMute = OperationPayload<"communication.conversationMute">["result"]
```

Whether a member muted message push notifications for a conversation, and until when.

Re-exported from `@convohop/core`.

### `DeploymentOptions` type

```ts
type DeploymentOptions = Omit<GraphqlTypes.CreateDeploymentRequestInput, "orgId">
```

### `FcmRequest` type

```ts
type FcmRequest = { … }
```

#### `FcmRequest.message` property

```ts
message: { … }
```

An FCM HTTP v1 REST `messages:send` message without a target: add `token`. `convohop` is `PushData` as JSON.
Firebase Admin SDKs take `android` in their own form, such as `firebase-admin`'s `ttl` in milliseconds.

##### `FcmRequest.message.data` property

```ts
data: { … }
```

###### `FcmRequest.message.data.convohop` property

```ts
convohop: string
```

##### `FcmRequest.message.android` property

```ts
android: { … }
```

###### `FcmRequest.message.android.priority` property

```ts
priority: "NORMAL" | "HIGH"
```

###### `FcmRequest.message.android.ttl` property

```ts
ttl: string
```

###### `FcmRequest.message.android.collapse_key` property

```ts
collapse_key?: string
```

### `InboxPage` type

```ts
type InboxPage = NonNullable<OperationPayload<"communication.inbox">["result"]>
```

### `LifecycleState` type

```ts
type LifecycleState = "active" | "background"
```

Re-exported from `@convohop/core`.

### `LiveAlertBatch` type

```ts
type LiveAlertBatch = OperationPayload<"communication.alertLiveSession">["result"]
```

### `LiveEndReceipt` type

```ts
type LiveEndReceipt = OperationPayload<"communication.endLiveSession">
```

### `LiveOperation` type

```ts
type LiveOperation = OperationPayload<"communication.liveSessionOperation">["result"]
```

### `LiveOperationCompletion` type

```ts
type LiveOperationCompletion = NonNullable<LiveOperation["completion"]>
```

### `LiveParticipantPage` type

```ts
type LiveParticipantPage = OperationPayload<"communication.liveSessionParticipants">["result"]
```

### `LiveSession` type

```ts
type LiveSession = OperationPayload<"communication.liveSession">["result"]
```

### `LiveSessionPage` type

```ts
type LiveSessionPage = OperationPayload<"communication.liveSessions">["result"]
```

### `MemberPage` type

```ts
type MemberPage = NonNullable<OperationPayload<"communication.members">["result"]>
```

### `MemberRole` type

```ts
type MemberRole = "member" | "moderator"
```

### `Membership` type

```ts
type Membership = NonNullable<OperationPayload<"communication.members">["result"]>["items"][number]
```

Re-exported from `@convohop/core`.

### `MessagePage` type

```ts
type MessagePage = NonNullable<OperationPayload<"communication.messages">["result"]>
```

### `OperationInput` type

```ts
type OperationInput<K extends OperationKey> = OperationTypes[K]["variables"] extends {
    input?: infer I;
} ? NonNullable<I> : Record<string, never>
```

Re-exported from `@convohop/core`.

### `OperationKey` type

```ts
type OperationKey = keyof OperationTypes
```

Re-exported from `@convohop/core`.

### `OperationPayload` type

```ts
type OperationPayload<K extends OperationKey> = OperationTypes[K]["result"][FieldName<K> & keyof OperationTypes[K]["result"]]
```

Re-exported from `@convohop/core`.

### `OperationStatus` type

```ts
type OperationStatus = NonNullable<OperationPayload<"communication.getOperation">["result"]>
```

### `PlatformURLConstructor` type

```ts
type PlatformURLConstructor = new (url: string, base?: string) => PlatformURL
```

A WHATWG URL constructor, such as the global `URL` or a polyfill's.

Re-exported from `@convohop/core`.

### `PlatformWebSocketConstructor` type

```ts
type PlatformWebSocketConstructor = new (url: string, protocols?: string | string[]) => PlatformWebSocket
```

Re-exported from `@convohop/core`.

### `Principal` type

```ts
type Principal = NonNullable<OperationPayload<"communication.getPrincipal">["result"]>
```

### `ProjectOptions` type

```ts
type ProjectOptions = Omit<GraphqlTypes.CreateProjectRequestInput, "deploymentId" | "name">
```

### `ProtocolObject` type

```ts
type ProtocolObject = Record<string, unknown>
```

Re-exported from `@convohop/core`.

### `PushData` type

```ts
type PushData = { … }
```

The `convohop` metadata every payload carries for your app: the event's fields without `subjectRef`, `connected`
and `preview`. APNs VoIP, FCM and Web Push payloads also carry the visible `title` and `body` here, because they
have no visible alert of their own.

#### `PushData.eventId` property

```ts
eventId: string
```

#### `PushData.eventType` property

```ts
eventType: WebhookNotificationEvent["eventType"]
```

#### `PushData.occurredAt` property

```ts
occurredAt: string
```

#### `PushData.projectId` property

```ts
projectId: string
```

#### `PushData.recipientId` property

```ts
recipientId: string
```

#### `PushData.conversationId` property

```ts
conversationId: string
```

#### `PushData.senderId` property

```ts
senderId: string
```

#### `PushData.messageId` property

```ts
messageId?: string
```

#### `PushData.liveSessionId` property

```ts
liveSessionId?: string
```

#### `PushData.alertId` property

```ts
alertId?: string
```

#### `PushData.expiresAt` property

```ts
expiresAt?: string
```

#### `PushData.mediaProfile` property

```ts
mediaProfile?: WebhookCallMediaProfile
```

#### `PushData.reason` property

```ts
reason?: WebhookCallCancelReason
```

#### `PushData.title` property

```ts
title?: string
```

#### `PushData.body` property

```ts
body?: string
```

### `PushPayloadCode` type

```ts
type PushPayloadCode = "INVALID_EVENT" | "INVALID_OPTIONS"
```

Why a push payload couldn't be built:
- `INVALID_OPTIONS`: an option has the wrong type, `title` or `body` has a lone surrogate, `now` isn't a valid
  `Date`, or `bundleId` isn't an app bundle ID. Options are checked first.
- `INVALID_EVENT`: the event doesn't match the push payload contract.

### `RequestResolution` type

```ts
type RequestResolution = NonNullable<OperationPayload<"communication.resolveRequest">["result"]>
```

### `SearchHit` type

```ts
type SearchHit = NonNullable<OperationPayload<"communication.search">["result"]>["items"][number] & {
    message: ConversationMessage;
}
```

Re-exported from `@convohop/core`.

### `SearchPage` type

```ts
type SearchPage = Omit<NonNullable<OperationPayload<"communication.search">["result"]>, "items"> & {
    items: SearchHit[];
}
```

### `SendReceipt` type

```ts
type SendReceipt = NonNullable<OperationPayload<"communication.sendMessage">["result"]> & {
    cursor: ConversationCursor;
}
```

Re-exported from `@convohop/core`.

### `SessionBootstrap` type

```ts
type SessionBootstrap = SessionResult & {
    session: NonNullable<SessionResult["session"]>;
}
```

Re-exported from `@convohop/core`.

### `SessionMetadata` type

```ts
type SessionMetadata = OperationPayload<"communication.currentSession">["result"]
```

Re-exported from `@convohop/core`.

### `SessionRefresh` type

```ts
type SessionRefresh = (current: Readonly<SessionMetadata>) => Promise<SessionBootstrap>
```

Re-exported from `@convohop/core`.

### `SessionRefreshState` type

```ts
type SessionRefreshState = "disabled" | "uninitialized" | "ready" | "refreshing" | "blocked"
```

Re-exported from `@convohop/core`.

### `SessionRequestOutcome` type

```ts
type SessionRequestOutcome = (SessionOutcomeRead & {
    state: "notObservedYet";
}) | (CommittedSessionOutcome & {
    currentState: "missing";
}) | (CommittedSessionOutcome & {
    currentState: "active" | "expired" | "revoked";
    currentSession: SessionMetadata;
})
```

### `SessionRevocation` type

```ts
type SessionRevocation = NonNullable<OperationPayload<"communication.revokeSession">["result"]>
```

### `WebPushRequest` type

```ts
type WebPushRequest = { … }
```

#### `WebPushRequest.headers` property

```ts
headers: { … }
```

RFC 8030 headers for your Web Push library, which encrypts the payload (RFC 8291) and signs (VAPID).
Where it sets `TTL`, `Urgency` or `Topic` from its own options, pass the values there, or its defaults replace them.

##### `WebPushRequest.headers.TTL` property

```ts
TTL: string
```

##### `WebPushRequest.headers.Urgency` property

```ts
Urgency: "very-low" | "low" | "normal" | "high"
```

##### `WebPushRequest.headers.Topic` property

```ts
Topic?: string
```

#### `WebPushRequest.payload` property

```ts
payload: { … }
```

##### `WebPushRequest.payload.convohop` property

```ts
convohop: PushData
```

### `WebhookCallCancelReason` type

```ts
type WebhookCallCancelReason = "answered" | "declined" | "ended" | "expired" | (string & {})
```

Why a call stopped ringing for the recipient. `answered` and `declined` (by the recipient, on any device) only stop
the ringing. `ended` (the call ended or stopped ringing before the recipient answered) and `expired` (nobody answered
by `expiresAt`) are missed calls. Treat an unknown reason as stop ringing, without a missed-call alert.

### `WebhookCallMediaProfile` type

```ts
type WebhookCallMediaProfile = "AUDIO_ONLY" | "AUDIO_VIDEO" | (string & {})
```

A call's media profile. Unknown profiles pass through.

### `WebhookEvent` type

```ts
type WebhookEvent = WebhookResourceEvent | WebhookEndpointDisabledEvent | WebhookNotificationEvent | WebhookUnknownEvent
```

A verified delivery's event. Narrow on `known`, then on `eventType`.

### `WebhookEventType` type

```ts
type WebhookEventType = "conversation.created" | "conversation.updated" | "member.added" | "member.roleChanged" | "member.historyExpanded" | "member.removed" | "member.broadcastPermissionChanged" | "message.created" | "message.edited" | "message.deleted" | "receipt.reported" | "live.started" | "live.participationChanged" | "live.alerted" | "live.ready" | "live.connected" | "live.ended" | "webhook.endpointDisabled" | WebhookNotificationEventType
```

Webhook event types the authority sends. The `notification.*` types follow the push payload contract in
`spec/push-payload/`.

### `WebhookHeaders` type

```ts
type WebhookHeaders = {
    get(name: string): string | null;
} | Readonly<Record<string, string | readonly string[] | undefined>>
```

A `Headers` object, or a record such as Node's `IncomingMessage.headers`. Names match case-insensitively.

### `WebhookNotificationEvent` type

```ts
type WebhookNotificationEvent = WebhookMessageNotificationEvent | WebhookCallNotificationEvent | WebhookCallCancelledNotificationEvent
```

A per-recipient notification event: the input of the push payload builders. The contract is `spec/push-payload/`.

### `WebhookNotificationEventType` type

```ts
type WebhookNotificationEventType = "notification.message" | "notification.call" | "notification.callCancelled"
```

Per-recipient notification event types, for your push notifications: a message for the recipient, an incoming
call, and a call that stopped ringing for the recipient. The contract is `spec/push-payload/`.

### `WebhookVerificationCode` type

```ts
type WebhookVerificationCode = "INVALID_SECRET" | "MISSING_HEADER" | "INVALID_HEADER" | "INVALID_TIMESTAMP" | "TIMESTAMP_EXPIRED" | "TIMESTAMP_FUTURE" | "BODY_TOO_LARGE" | "TOO_MANY_SIGNATURES" | "NO_MATCHING_SIGNATURE" | "INVALID_BODY"
```

Why a delivery failed verification. Checks run in this order and stop at the first failure:
- `INVALID_SECRET`: no secret is given, or one is not `whsec_` followed by padded standard Base64 of 24 to 64 bytes.
  This is your configuration, not the sender.
- `MISSING_HEADER`: `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty.
- `INVALID_HEADER`: one of those headers is repeated.
- `INVALID_TIMESTAMP`: `webhook-timestamp` is not 1 to 15 ASCII digits (integer Unix seconds).
- `TIMESTAMP_EXPIRED`: the timestamp is more than `toleranceSeconds` before now.
- `TIMESTAMP_FUTURE`: the timestamp is more than `toleranceSeconds` after now.
- `BODY_TOO_LARGE`: the body exceeds 4096 bytes.
- `TOO_MANY_SIGNATURES`: `webhook-signature` has more than 8 entries.
- `NO_MATCHING_SIGNATURE`: no `v1` entry matches any secret.
- `INVALID_BODY`: `verify()` only; the signed body is not a UTF-8 JSON event envelope.

## Functions

### `parseConversation` function

```ts
function parseConversation(value: unknown): Conversation
```

Re-exported from `@convohop/core`.

### `parseCounter` function

```ts
function parseCounter(value: unknown): string
```

Re-exported from `@convohop/core`.

### `parseCursor` function

```ts
function parseCursor(value: unknown): ConversationCursor
```

Re-exported from `@convohop/core`.

### `parseId` function

```ts
function parseId(value: unknown): string
```

Re-exported from `@convohop/core`.

### `parseMembership` function

```ts
function parseMembership(value: unknown): Membership
```

Re-exported from `@convohop/core`.

### `parseMessage` function

```ts
function parseMessage(value: unknown): ConversationMessage
```

Re-exported from `@convohop/core`.

### `parseObject` function

```ts
function parseObject(value: unknown): ProtocolObject
```

Re-exported from `@convohop/core`.

### `parsePage` function

```ts
function parsePage<T>(value: unknown, parse: (value: unknown) => T): ItemPage<T>
```

Re-exported from `@convohop/core`.

### `parseSearchHit` function

```ts
function parseSearchHit(value: unknown): SearchHit
```

Re-exported from `@convohop/core`.

### `parseString` function

```ts
function parseString(value: unknown): string
```

Re-exported from `@convohop/core`.

## Constants

### `operationCatalog` constant

```ts
const operationCatalog: Record<OperationKey, OperationCatalogEntry>
```

Re-exported from `@convohop/core`.

### `push` constant

```ts
const push: Readonly<{ … }>
```

Builds provider requests from per-recipient notification events (`notification.message`, `notification.call` and
`notification.callCancelled`), as `webhooks.verify()` returns them. Each builder validates its options and then the
event, throwing `PushPayloadError`, and returns `null` when the event doesn't apply to the platform or is stale.
Payloads are metadata-only unless you pass `title` or `body`, or the event carries an opted-in message preview.
The contract is `spec/push-payload/`.

#### `push.apnsAlert` method

```ts
apnsAlert(event: WebhookNotificationEvent, options: ApnsPushOptions): ApnsAlertRequest | null
```

An APNs alert for a message, an incoming call, or a missed call (`callCancelled` with reason `ended` or
`expired`); `null` for other cancellations. At most 4096 bytes.

#### `push.apnsVoip` method

```ts
apnsVoip(event: WebhookNotificationEvent, options: ApnsPushOptions): ApnsVoipRequest | null
```

An APNs VoIP push for an incoming call; `null` for other events. iOS requires you to report every VoIP push to
CallKit as a call. At most 5120 bytes.

#### `push.fcm` method

```ts
fcm(event: WebhookNotificationEvent, options?: PushOptions): FcmRequest | null
```

An FCM data message for any notification event. At most 4096 bytes of `data` as JSON.

#### `push.webPush` method

```ts
webPush(event: WebhookNotificationEvent, options?: PushOptions): WebPushRequest | null
```

A Web Push message for any notification event. At most 3993 bytes, the RFC 8291 plaintext limit.

### `webhooks` constant

```ts
const webhooks: Readonly<{ … }>
```

Verifies ConvoHop webhook deliveries (Standard Webhooks symmetric `v1`) with Web Crypto. Pass the raw body; respond
`2xx` within 5 s, then process; de-duplicate on `webhook-id`. Failures throw `WebhookVerificationError`.

#### `webhooks.verify` method

```ts
verify(options: WebhookVerifyOptions): Promise<WebhookDelivery>
```

Verifies the signature and timestamp, then parses the metadata-only event.

#### `webhooks.verifySignature` method

```ts
verifySignature(options: WebhookVerifyOptions): Promise<WebhookSignature>
```

Verifies only the signature and timestamp, for bodies you parse yourself.

## Namespaces

### `GraphqlTypes` namespace

```ts
namespace GraphqlTypes
```

Re-exported from `@convohop/core`.
