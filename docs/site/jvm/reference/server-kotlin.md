# `com.convohop:convohop-server-kotlin`

Kotlin coroutine extensions for the Java server SDK: suspending APIs, page flows and interruptible blocking calls.

**Layer:** Server. **Runtime:** Kotlin 2.2 or later, on Java 11 or later. **Source:** `jvm/convohop-server-kotlin`.

## Classes

### `CommunicationSuspendApi` class

```java
public class CommunicationSuspendApi
```

Suspending view of `CommunicationApi`. Each call runs on `dispatcher`. Cancelling the calling
coroutine interrupts the blocking request and the call fails with a CancellationException
whose cause is the lost-request problem; a mutation stays in the client's recovery journal.

Package: `com.convohop.server.kotlin`.

#### `CommunicationSuspendApi` constructor

```java
public constructor(api: CommunicationApi, dispatcher: CoroutineDispatcher = Dispatchers.IO)
```

#### `CommunicationSuspendApi.capabilities` method

```java
public suspend fun capabilities(): CapabilitiesReply
```

Suspending `CommunicationApi.capabilities`.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `CommunicationSuspendApi.route` method

```java
public suspend fun route(): RouteReply
```

Suspending `CommunicationApi.route`.

Sends [`communication.route`](../../operations/communication/route.md).

#### `CommunicationSuspendApi.getPrincipal` method

```java
public suspend fun getPrincipal(input: GetPrincipalRequestInput): GetPrincipalReply
```

Suspending `CommunicationApi.getPrincipal`.

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

#### `CommunicationSuspendApi.getConversation` method

```java
public suspend fun getConversation(input: GetConversationRequestInput): GetConversationReply
```

Suspending `CommunicationApi.getConversation`.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `CommunicationSuspendApi.members` method

```java
public suspend fun members(input: MembersRequestInput): MembersReply
```

Suspending `CommunicationApi.members`.

Sends [`communication.members`](../../operations/communication/members.md).

#### `CommunicationSuspendApi.membersPages` method

```java
public fun membersPages(input: MembersRequestInput): Flow<MemberPage>
```

`CommunicationApi.membersPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

Sends [`communication.members`](../../operations/communication/members.md).

#### `CommunicationSuspendApi.messages` method

```java
public suspend fun messages(input: MessagesRequestInput): MessagesReply
```

Suspending `CommunicationApi.messages`.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `CommunicationSuspendApi.messagesPages` method

```java
public fun messagesPages(input: MessagesRequestInput): Flow<MessagePage>
```

`CommunicationApi.messagesPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `CommunicationSuspendApi.getMessage` method

```java
public suspend fun getMessage(input: GetMessageRequestInput): GetMessageReply
```

Suspending `CommunicationApi.getMessage`.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `CommunicationSuspendApi.inbox` method

```java
public suspend fun inbox(input: InboxRequestInput): InboxReply
```

Suspending `CommunicationApi.inbox`.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `CommunicationSuspendApi.inboxPages` method

```java
public fun inboxPages(input: InboxRequestInput): Flow<InboxPage>
```

`CommunicationApi.inboxPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `CommunicationSuspendApi.search` method

```java
public suspend fun search(input: SearchRequestInput): SearchReply
```

Suspending `CommunicationApi.search`.

Sends [`communication.search`](../../operations/communication/search.md).

#### `CommunicationSuspendApi.searchPages` method

```java
public fun searchPages(input: SearchRequestInput): Flow<SearchPage>
```

`CommunicationApi.searchPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

Sends [`communication.search`](../../operations/communication/search.md).

#### `CommunicationSuspendApi.resolveRequest` method

```java
public suspend fun resolveRequest(input: ResolveRequestRequestInput): ResolveRequestReply
```

Suspending `CommunicationApi.resolveRequest`.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `CommunicationSuspendApi.getOperation` method

```java
public suspend fun getOperation(input: GetOperationRequestInput): GetOperationReply
```

Suspending `CommunicationApi.getOperation`.

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `CommunicationSuspendApi.conversationMute` method

```java
public suspend fun conversationMute(input: ConversationMuteInput): ConversationMuteReply
```

Suspending `CommunicationApi.conversationMute`.

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `CommunicationSuspendApi.currentLiveSession` method

```java
public suspend fun currentLiveSession(input: ConversationLiveInput): CurrentLiveSessionReply
```

Suspending `CommunicationApi.currentLiveSession`.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `CommunicationSuspendApi.liveSession` method

```java
public suspend fun liveSession(input: LiveSessionInput): LiveSessionReply
```

Suspending `CommunicationApi.liveSession`.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `CommunicationSuspendApi.liveSessions` method

```java
public suspend fun liveSessions(input: LiveSessionsInput): LiveSessionPageReply
```

Suspending `CommunicationApi.liveSessions`.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `CommunicationSuspendApi.liveSessionsPages` method

```java
public fun liveSessionsPages(input: LiveSessionsInput): Flow<LiveSessionPage>
```

`CommunicationApi.liveSessionsPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `CommunicationSuspendApi.liveSessionParticipants` method

```java
public suspend fun liveSessionParticipants(input: LiveParticipantsInput): LiveParticipantPageReply
```

Suspending `CommunicationApi.liveSessionParticipants`.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `CommunicationSuspendApi.liveSessionParticipantsPages` method

```java
public fun liveSessionParticipantsPages(input: LiveParticipantsInput): Flow<LiveParticipantPage>
```

`CommunicationApi.liveSessionParticipantsPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `CommunicationSuspendApi.liveSessionOperation` method

```java
public suspend fun liveSessionOperation(input: LiveSessionOperationInput): LiveSessionOperationReply
```

Suspending `CommunicationApi.liveSessionOperation`.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `CommunicationSuspendApi.sessionRequestOutcome` method

```java
public suspend fun sessionRequestOutcome(input: SessionRequestOutcomeRequestInput): SessionRequestOutcomeReply
```

Suspending `CommunicationApi.sessionRequestOutcome`.

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `CommunicationSuspendApi.createPrincipal` method

```java
public suspend fun createPrincipal(input: CreatePrincipalRequestInput, requestId: String? = null): CreatePrincipalReply
```

Suspending `CommunicationApi.createPrincipal`.

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `CommunicationSuspendApi.disablePrincipal` method

```java
public suspend fun disablePrincipal(input: DisablePrincipalRequestInput, requestId: String? = null): DisablePrincipalReply
```

Suspending `CommunicationApi.disablePrincipal`.

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `CommunicationSuspendApi.issueSession` method

```java
public suspend fun issueSession(input: IssueSessionRequestInput, requestId: String? = null): IssueSessionReply
```

Suspending `CommunicationApi.issueSession`.

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `CommunicationSuspendApi.renewSession` method

```java
public suspend fun renewSession(input: RenewSessionRequestInput, requestId: String? = null): RenewSessionReply
```

Suspending `CommunicationApi.renewSession`.

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

#### `CommunicationSuspendApi.revokeSession` method

```java
public suspend fun revokeSession(input: RevokeSessionRequestInput, requestId: String? = null): RevokeSessionReply
```

Suspending `CommunicationApi.revokeSession`.

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `CommunicationSuspendApi.createConversation` method

```java
public suspend fun createConversation(input: CreateConversationRequestInput, requestId: String? = null): CreateConversationReply
```

Suspending `CommunicationApi.createConversation`.

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `CommunicationSuspendApi.updateConversation` method

```java
public suspend fun updateConversation(input: UpdateConversationRequestInput, requestId: String? = null): UpdateConversationReply
```

Suspending `CommunicationApi.updateConversation`.

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

#### `CommunicationSuspendApi.addMember` method

```java
public suspend fun addMember(input: AddMemberRequestInput, requestId: String? = null): AddMemberReply
```

Suspending `CommunicationApi.addMember`.

Sends [`communication.addMember`](../../operations/communication/addMember.md).

#### `CommunicationSuspendApi.addMembers` method

```java
public suspend fun addMembers(input: AddMembersInput, requestId: String? = null): AddMembersPayload
```

Suspending `CommunicationApi.addMembers`.

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

#### `CommunicationSuspendApi.removeMember` method

```java
public suspend fun removeMember(input: RemoveMemberRequestInput, requestId: String? = null): RemoveMemberReply
```

Suspending `CommunicationApi.removeMember`.

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `CommunicationSuspendApi.historyGrant` method

```java
public suspend fun historyGrant(input: HistoryGrantRequestInput, requestId: String? = null): HistoryGrantReply
```

Suspending `CommunicationApi.historyGrant`.

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

#### `CommunicationSuspendApi.sendMessage` method

```java
public suspend fun sendMessage(input: SendMessageRequestInput, requestId: String? = null): SendMessageReply
```

Suspending `CommunicationApi.sendMessage`.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `CommunicationSuspendApi.editMessage` method

```java
public suspend fun editMessage(input: EditMessageRequestInput, requestId: String? = null): EditMessageReply
```

Suspending `CommunicationApi.editMessage`.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `CommunicationSuspendApi.deleteMessage` method

```java
public suspend fun deleteMessage(input: DeleteMessageRequestInput, requestId: String? = null): DeleteMessageReply
```

Suspending `CommunicationApi.deleteMessage`.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `CommunicationSuspendApi.setBroadcastPermission` method

```java
public suspend fun setBroadcastPermission(input: SetBroadcastPermissionInput, requestId: String? = null): SetBroadcastPermissionPayload
```

Suspending `CommunicationApi.setBroadcastPermission`.

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

#### `CommunicationSuspendApi.setConversationMute` method

```java
public suspend fun setConversationMute(input: SetConversationMuteInput, requestId: String? = null): SetConversationMutePayload
```

Suspending `CommunicationApi.setConversationMute`.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `CommunicationSuspendApi.alertLiveSession` method

```java
public suspend fun alertLiveSession(input: AlertLiveSessionInput, requestId: String? = null): AlertLiveSessionPayload
```

Suspending `CommunicationApi.alertLiveSession`.

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `CommunicationSuspendApi.endLiveSession` method

```java
public suspend fun endLiveSession(input: EndLiveSessionInput, requestId: String? = null): EndLiveSessionPayload
```

Suspending `CommunicationApi.endLiveSession`.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

#### `CommunicationSuspendApi.redeemCredential` method

```java
public suspend fun redeemCredential(input: RedeemCredentialRequestInput, credentialDeliveryPermit: Map<String, Any?>, requestId: String? = null): RedeemCredentialReply
```

Suspending `CommunicationApi.redeemCredential`.

Sends [`communication.redeemCredential`](../../operations/communication/redeemCredential.md).

#### `CommunicationSuspendApi.acknowledgeCredential` method

```java
public suspend fun acknowledgeCredential(input: AcknowledgeCredentialRequestInput, credentialDeliveryPermit: Map<String, Any?>, requestId: String? = null): AcknowledgeCredentialReply
```

Suspending `CommunicationApi.acknowledgeCredential`.

Sends [`communication.acknowledgeCredential`](../../operations/communication/acknowledgeCredential.md).

### `ManagementSuspendApi` class

```java
public class ManagementSuspendApi
```

Suspending view of `ManagementApi`. Each call runs on `dispatcher`. Cancelling the calling
coroutine interrupts the blocking request and the call fails with a CancellationException
whose cause is the lost-request problem; a mutation stays in the client's recovery journal.

Package: `com.convohop.server.kotlin`.

#### `ManagementSuspendApi` constructor

```java
public constructor(api: ManagementApi, dispatcher: CoroutineDispatcher = Dispatchers.IO)
```

#### `ManagementSuspendApi.capabilities` method

```java
public suspend fun capabilities(): CapabilitiesReply
```

Suspending `ManagementApi.capabilities`.

Sends [`management.capabilities`](../../operations/management/capabilities.md).

#### `ManagementSuspendApi.organizations` method

```java
public suspend fun organizations(): OrganizationsReply
```

Suspending `ManagementApi.organizations`.

Sends [`management.organizations`](../../operations/management/organizations.md).

#### `ManagementSuspendApi.getOrganization` method

```java
public suspend fun getOrganization(input: GetOrganizationRequestInput): GetOrganizationReply
```

Suspending `ManagementApi.getOrganization`.

Sends [`management.getOrganization`](../../operations/management/getOrganization.md).

#### `ManagementSuspendApi.getDeployment` method

```java
public suspend fun getDeployment(input: GetDeploymentRequestInput): GetDeploymentReply
```

Suspending `ManagementApi.getDeployment`.

Sends [`management.getDeployment`](../../operations/management/getDeployment.md).

#### `ManagementSuspendApi.getProject` method

```java
public suspend fun getProject(input: GetProjectRequestInput): GetProjectReply
```

Suspending `ManagementApi.getProject`.

Sends [`management.getProject`](../../operations/management/getProject.md).

#### `ManagementSuspendApi.deploymentHealth` method

```java
public suspend fun deploymentHealth(input: DeploymentHealthRequestInput): DeploymentHealthReply
```

Suspending `ManagementApi.deploymentHealth`.

Sends [`management.deploymentHealth`](../../operations/management/deploymentHealth.md).

#### `ManagementSuspendApi.deploymentUsage` method

```java
public suspend fun deploymentUsage(input: DeploymentUsageRequestInput): DeploymentUsageReply
```

Suspending `ManagementApi.deploymentUsage`.

Sends [`management.deploymentUsage`](../../operations/management/deploymentUsage.md).

#### `ManagementSuspendApi.projectUsage` method

```java
public suspend fun projectUsage(input: ProjectUsageRequestInput): ProjectUsageReply
```

Suspending `ManagementApi.projectUsage`.

Sends [`management.projectUsage`](../../operations/management/projectUsage.md).

#### `ManagementSuspendApi.organizationUsage` method

```java
public suspend fun organizationUsage(input: OrganizationUsageRequestInput): OrganizationUsageReply
```

Suspending `ManagementApi.organizationUsage`.

Sends [`management.organizationUsage`](../../operations/management/organizationUsage.md).

#### `ManagementSuspendApi.organizationBilling` method

```java
public suspend fun organizationBilling(input: OrganizationBillingRequestInput): OrganizationBillingReply
```

Suspending `ManagementApi.organizationBilling`.

#### `ManagementSuspendApi.webhookEndpoints` method

```java
public suspend fun webhookEndpoints(input: WebhookEndpointsRequestInput): WebhookEndpointsReply
```

Suspending `ManagementApi.webhookEndpoints`.

Sends [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md).

#### `ManagementSuspendApi.webhookDeliveries` method

```java
public suspend fun webhookDeliveries(input: WebhookDeliveriesRequestInput): WebhookDeliveriesReply
```

Suspending `ManagementApi.webhookDeliveries`.

Sends [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md).

#### `ManagementSuspendApi.resolveRequest` method

```java
public suspend fun resolveRequest(input: ResolveRequestRequestInput): ResolveRequestReply
```

Suspending `ManagementApi.resolveRequest`.

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `ManagementSuspendApi.getOperation` method

```java
public suspend fun getOperation(input: GetOperationRequestInput): GetOperationReply
```

Suspending `ManagementApi.getOperation`.

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `ManagementSuspendApi.agentSignupForApproval` method

```java
public suspend fun agentSignupForApproval(input: AgentSignupForApprovalRequestInput): AgentSignupForApprovalReply
```

Suspending `ManagementApi.agentSignupForApproval`.

#### `ManagementSuspendApi.agentSignup` method

```java
public suspend fun agentSignup(): AgentSignupReply
```

Suspending `ManagementApi.agentSignup`.

#### `ManagementSuspendApi.agentGrants` method

```java
public suspend fun agentGrants(input: AgentGrantsRequestInput): AgentGrantsReply
```

Suspending `ManagementApi.agentGrants`.

#### `ManagementSuspendApi.agentGrantsPages` method

```java
public fun agentGrantsPages(input: AgentGrantsRequestInput): Flow<AgentGrantPage>
```

`ManagementApi.agentGrantsPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

#### `ManagementSuspendApi.agentAuditEvents` method

```java
public suspend fun agentAuditEvents(input: AgentAuditEventsRequestInput): AgentAuditEventsReply
```

Suspending `ManagementApi.agentAuditEvents`.

#### `ManagementSuspendApi.agentAuditEventsPages` method

```java
public fun agentAuditEventsPages(input: AgentAuditEventsRequestInput): Flow<AgentAuditEventPage>
```

`ManagementApi.agentAuditEventsPages` as a cold flow. Each collection starts again from `input`, and each page is requested
on `dispatcher` when the collector is ready for it.

#### `ManagementSuspendApi.organizationSpend` method

```java
public suspend fun organizationSpend(input: OrganizationSpendRequestInput): OrganizationSpendReply
```

Suspending `ManagementApi.organizationSpend`.

#### `ManagementSuspendApi.createOrganization` method

```java
public suspend fun createOrganization(input: CreateOrganizationRequestInput, requestId: String? = null): CreateOrganizationReply
```

Suspending `ManagementApi.createOrganization`.

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `ManagementSuspendApi.createDeployment` method

```java
public suspend fun createDeployment(input: CreateDeploymentRequestInput, requestId: String? = null): CreateDeploymentReply
```

Suspending `ManagementApi.createDeployment`.

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `ManagementSuspendApi.createProject` method

```java
public suspend fun createProject(input: CreateProjectRequestInput, requestId: String? = null): CreateProjectReply
```

Suspending `ManagementApi.createProject`.

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `ManagementSuspendApi.issueBackendKey` method

```java
public suspend fun issueBackendKey(input: IssueBackendKeyRequestInput, requestId: String? = null): IssueBackendKeyReply
```

Suspending `ManagementApi.issueBackendKey`.

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `ManagementSuspendApi.revokeBackendKey` method

```java
public suspend fun revokeBackendKey(input: RevokeBackendKeyRequestInput, requestId: String? = null): RevokeBackendKeyReply
```

Suspending `ManagementApi.revokeBackendKey`.

Sends [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md).

#### `ManagementSuspendApi.projectPolicy` method

```java
public suspend fun projectPolicy(input: ProjectPolicyRequestInput, requestId: String? = null): ProjectPolicyReply
```

Suspending `ManagementApi.projectPolicy`.

Sends [`management.projectPolicy`](../../operations/management/projectPolicy.md).

#### `ManagementSuspendApi.credentialPermit` method

```java
public suspend fun credentialPermit(input: CredentialPermitRequestInput, requestId: String? = null): CredentialPermitReply
```

Suspending `ManagementApi.credentialPermit`.

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

#### `ManagementSuspendApi.pauseOperation` method

```java
public suspend fun pauseOperation(input: PauseOperationRequestInput, requestId: String? = null): PauseOperationReply
```

Suspending `ManagementApi.pauseOperation`.

Sends [`management.pauseOperation`](../../operations/management/pauseOperation.md).

#### `ManagementSuspendApi.resumeOperation` method

```java
public suspend fun resumeOperation(input: ResumeOperationRequestInput, requestId: String? = null): ResumeOperationReply
```

Suspending `ManagementApi.resumeOperation`.

Sends [`management.resumeOperation`](../../operations/management/resumeOperation.md).

#### `ManagementSuspendApi.createBillingCheckoutSession` method

```java
public suspend fun createBillingCheckoutSession(input: CreateBillingCheckoutSessionRequestInput, requestId: String? = null): CreateBillingCheckoutSessionReply
```

Suspending `ManagementApi.createBillingCheckoutSession`.

#### `ManagementSuspendApi.createBillingPortalSession` method

```java
public suspend fun createBillingPortalSession(input: CreateBillingPortalSessionRequestInput, requestId: String? = null): CreateBillingPortalSessionReply
```

Suspending `ManagementApi.createBillingPortalSession`.

#### `ManagementSuspendApi.configureWebhook` method

```java
public suspend fun configureWebhook(input: ConfigureWebhookRequestInput, requestId: String? = null): ConfigureWebhookReply
```

Suspending `ManagementApi.configureWebhook`.

Sends [`management.configureWebhook`](../../operations/management/configureWebhook.md).

#### `ManagementSuspendApi.updateWebhook` method

```java
public suspend fun updateWebhook(input: UpdateWebhookRequestInput, requestId: String? = null): UpdateWebhookReply
```

Suspending `ManagementApi.updateWebhook`.

Sends [`management.updateWebhook`](../../operations/management/updateWebhook.md).

#### `ManagementSuspendApi.rotateWebhookSecret` method

```java
public suspend fun rotateWebhookSecret(input: RotateWebhookSecretRequestInput, requestId: String? = null): RotateWebhookSecretReply
```

Suspending `ManagementApi.rotateWebhookSecret`.

Sends [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md).

#### `ManagementSuspendApi.disableWebhook` method

```java
public suspend fun disableWebhook(input: DisableWebhookRequestInput, requestId: String? = null): DisableWebhookReply
```

Suspending `ManagementApi.disableWebhook`.

Sends [`management.disableWebhook`](../../operations/management/disableWebhook.md).

#### `ManagementSuspendApi.replayWebhookDeliveries` method

```java
public suspend fun replayWebhookDeliveries(input: ReplayWebhookDeliveriesRequestInput, requestId: String? = null): ReplayWebhookDeliveriesReply
```

Suspending `ManagementApi.replayWebhookDeliveries`.

Sends [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md).

#### `ManagementSuspendApi.requestAgentSignup` method

```java
public suspend fun requestAgentSignup(input: RequestAgentSignupRequestInput, requestId: String? = null): RequestAgentSignupReply
```

Suspending `ManagementApi.requestAgentSignup`.

#### `ManagementSuspendApi.rejectAgentSignup` method

```java
public suspend fun rejectAgentSignup(input: RejectAgentSignupRequestInput, requestId: String? = null): RejectAgentSignupReply
```

Suspending `ManagementApi.rejectAgentSignup`.

#### `ManagementSuspendApi.approveAgentSignup` method

```java
public suspend fun approveAgentSignup(input: ApproveAgentSignupRequestInput, requestId: String? = null): ApproveAgentSignupReply
```

Suspending `ManagementApi.approveAgentSignup`.

#### `ManagementSuspendApi.issueAgentKey` method

```java
public suspend fun issueAgentKey(input: IssueAgentKeyRequestInput, requestId: String? = null): IssueAgentKeyReply
```

Suspending `ManagementApi.issueAgentKey`.

#### `ManagementSuspendApi.agentCredentialPermit` method

```java
public suspend fun agentCredentialPermit(input: AgentCredentialPermitRequestInput, requestId: String? = null): AgentCredentialPermitReply
```

Suspending `ManagementApi.agentCredentialPermit`.

#### `ManagementSuspendApi.revokeAgentGrant` method

```java
public suspend fun revokeAgentGrant(input: RevokeAgentGrantRequestInput, requestId: String? = null): RevokeAgentGrantReply
```

Suspending `ManagementApi.revokeAgentGrant`.

#### `ManagementSuspendApi.setSpendControls` method

```java
public suspend fun setSpendControls(input: SetSpendControlsRequestInput, requestId: String? = null): SetSpendControlsReply
```

Suspending `ManagementApi.setSpendControls`.

#### `ManagementSuspendApi.purchaseAgentCredits` method

```java
public suspend fun purchaseAgentCredits(input: PurchaseAgentCreditsRequestInput, requestId: String? = null): PurchaseAgentCreditsReply
```

Suspending `ManagementApi.purchaseAgentCredits`.

## Functions

### `interruptible` function

```java
public suspend fun <T> interruptible(dispatcher: CoroutineDispatcher = Dispatchers.IO, call: () -> T): T
```

Runs a blocking SDK `call` on `dispatcher` and interrupts it when the calling coroutine is cancelled.
The suspending plane APIs run every call this way; use it for the blocking client helpers too, as in
`interruptible { server.principals().create(accountId) }`.

The transport reports an interrupted request as a lost request whose outcome is unknown, not as an
`InterruptedException`. Left alone, that problem would complete the cancelled coroutine as a failure
and cancel its parent, so a failure that races cancellation becomes a `CancellationException` whose
cause is the original problem. A mutation stays in the client's recovery journal either way.

Package: `com.convohop.server.kotlin`.

### `suspending` function

```java
public fun CommunicationApi.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): CommunicationSuspendApi
public fun ManagementApi.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): ManagementSuspendApi
```

A suspending view of this plane API whose calls run on `dispatcher`.

Package: `com.convohop.server.kotlin`.
