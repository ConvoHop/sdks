# `ConvoHop.Models`

Generated input and result models of the ConvoHop GraphQL API.

**Layer:** Server. **Runtime:** .NET 8 or later. The `netstandard2.0` build also targets .NET Framework 4.7.2 or later, which isn't tested yet. **Source:** `dotnet/src/ConvoHop`.

## Classes

### `AcknowledgeCredentialReply` class

```cs
public sealed class AcknowledgeCredentialReply
{
    public AcknowledgeCredentialReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public DeliveryAck? Result { get; init; }
}
```

The AcknowledgeCredentialReply result.

### `AcknowledgeCredentialRequestInput` class

```cs
public sealed class AcknowledgeCredentialRequestInput
{
    public AcknowledgeCredentialRequestInput(string deliveryId);
    public string DeliveryId { get; set; }
}
```

The AcknowledgeCredentialRequestInput input.

### `ActorRef` class

```cs
public sealed class ActorRef
{
    public ActorRef();
    public string TenantId { get; init; }
    public string ObjectId { get; init; }
}
```

The ActorRef result.

### `AddMemberReply` class

```cs
public sealed class AddMemberReply
{
    public AddMemberReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Member? Result { get; init; }
}
```

The AddMemberReply result.

### `AddMemberRequestInput` class

```cs
public sealed class AddMemberRequestInput
{
    public AddMemberRequestInput(string conversationId, string principalId, string role, string expectedRevision);
    public string ConversationId { get; set; }
    public string PrincipalId { get; set; }
    public string Role { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The AddMemberRequestInput input.

### `AddMembersInput` class

```cs
public sealed class AddMembersInput
{
    public AddMembersInput(string conversationId, IReadOnlyList<MemberBatchEntryInput> members);
    public string ConversationId { get; set; }
    public IReadOnlyList<MemberBatchEntryInput> Members { get; set; }
}
```

The AddMembersInput input.

### `AddMembersPayload` class

```cs
public sealed class AddMembersPayload
{
    public AddMembersPayload();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ReceiptId { get; init; }
    public string CommittedAt { get; init; }
    public bool Replayed { get; init; }
    public ConversationMemberBatch Result { get; init; }
}
```

The AddMembersPayload result.

### `AlertLiveSessionInput` class

```cs
public sealed class AlertLiveSessionInput
{
    public AlertLiveSessionInput(string liveSessionId, string expectedGeneration, IReadOnlyList<string> principalIds);
    public string LiveSessionId { get; set; }
    public string ExpectedGeneration { get; set; }
    public IReadOnlyList<string> PrincipalIds { get; set; }
}
```

The AlertLiveSessionInput input.

### `AlertLiveSessionPayload` class

```cs
public sealed class AlertLiveSessionPayload
{
    public AlertLiveSessionPayload();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ReceiptId { get; init; }
    public string CommittedAt { get; init; }
    public bool Replayed { get; init; }
    public LiveAlertBatch Result { get; init; }
}
```

The AlertLiveSessionPayload result.

### `BillingCheckoutSession` class

```cs
public sealed class BillingCheckoutSession
{
    public BillingCheckoutSession();
    public string OrgId { get; init; }
    public string PlanId { get; init; }
    public string Url { get; init; }
    public string ExpiresAt { get; init; }
}
```

The BillingCheckoutSession result.

### `BillingPortalSession` class

```cs
public sealed class BillingPortalSession
{
    public BillingPortalSession();
    public string OrgId { get; init; }
    public string Url { get; init; }
    public string? ExpiresAt { get; init; }
}
```

The BillingPortalSession result.

### `BroadcastPermissionChanged` class

```cs
public sealed class BroadcastPermissionChanged
{
    public BroadcastPermissionChanged();
    public Member Member { get; init; }
    public LiveMediaCutoff? MediaCutoff { get; init; }
}
```

The BroadcastPermissionChanged result.

### `Capabilities` class

```cs
public sealed class Capabilities
{
    public Capabilities();
    public string ServerRelease { get; init; }
    public string CapabilityRevision { get; init; }
    public string LimitsRevision { get; init; }
    public Features? Features { get; init; }
    public IReadOnlyList<LimitEntry> Limits { get; init; }
    public string Environment { get; init; }
    public bool ProductionQualified { get; init; }
    public MediaPolicy? MediaPolicy { get; init; }
    public string? GeoControlAuthorityId { get; init; }
    public IReadOnlyList<string> Offerings { get; init; }
    public IReadOnlyList<string> Geos { get; init; }
    public IReadOnlyList<string> InstallationProfiles { get; init; }
    public string? PortalIdentity { get; init; }
}
```

The Capabilities result.

### `CapabilitiesReply` class

```cs
public sealed class CapabilitiesReply
{
    public CapabilitiesReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Capabilities? Result { get; init; }
}
```

The CapabilitiesReply result.

### `ConfigureWebhookReply` class

```cs
public sealed class ConfigureWebhookReply
{
    public ConfigureWebhookReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The ConfigureWebhookReply result.

### `ConfigureWebhookRequestInput` class

```cs
public sealed class ConfigureWebhookRequestInput
{
    public ConfigureWebhookRequestInput(string projectId, string url, IReadOnlyList<string> eventTypes, string consentRef);
    public string ProjectId { get; set; }
    public string Url { get; set; }
    public IReadOnlyList<string> EventTypes { get; set; }
    public string ConsentRef { get; set; }
}
```

The ConfigureWebhookRequestInput input.

### `Conversation` class

```cs
public sealed class Conversation
{
    public Conversation();
    public string ConversationId { get; init; }
    public string Revision { get; init; }
    public string Title { get; init; }
    public JsonElement? Props { get; init; }
    public string LatestSequence { get; init; }
    public Member? Membership { get; init; }
}
```

The Conversation result.

### `ConversationLiveInput` class

```cs
public sealed class ConversationLiveInput
{
    public ConversationLiveInput(string conversationId);
    public string ConversationId { get; set; }
}
```

The ConversationLiveInput input.

### `ConversationMemberBatch` class

```cs
public sealed class ConversationMemberBatch
{
    public ConversationMemberBatch();
    public IReadOnlyList<Member> Items { get; init; }
}
```

The ConversationMemberBatch result.

### `ConversationMute` class

```cs
public sealed class ConversationMute
{
    public ConversationMute();
    public string ConversationId { get; init; }
    public string PrincipalId { get; init; }
    public bool Muted { get; init; }
    public string? Until { get; init; }
}
```

The ConversationMute result.

### `ConversationMuteInput` class

```cs
public sealed class ConversationMuteInput
{
    public ConversationMuteInput(string conversationId);
    public string ConversationId { get; set; }
    public string? ActAsPrincipalId { get; set; }
}
```

The ConversationMuteInput input.

### `ConversationMuteReply` class

```cs
public sealed class ConversationMuteReply
{
    public ConversationMuteReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ServerTime { get; init; }
    public ConversationMute Result { get; init; }
}
```

The ConversationMuteReply result.

### `CreateBillingCheckoutSessionReply` class

```cs
public sealed class CreateBillingCheckoutSessionReply
{
    public CreateBillingCheckoutSessionReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public BillingCheckoutSession? Result { get; init; }
}
```

The CreateBillingCheckoutSessionReply result.

### `CreateBillingCheckoutSessionRequestInput` class

```cs
public sealed class CreateBillingCheckoutSessionRequestInput
{
    public CreateBillingCheckoutSessionRequestInput(string orgId, string planId);
    public string OrgId { get; set; }
    public string PlanId { get; set; }
}
```

The CreateBillingCheckoutSessionRequestInput input.

### `CreateBillingPortalSessionReply` class

```cs
public sealed class CreateBillingPortalSessionReply
{
    public CreateBillingPortalSessionReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public BillingPortalSession? Result { get; init; }
}
```

The CreateBillingPortalSessionReply result.

### `CreateBillingPortalSessionRequestInput` class

```cs
public sealed class CreateBillingPortalSessionRequestInput
{
    public CreateBillingPortalSessionRequestInput(string orgId);
    public string OrgId { get; set; }
}
```

The CreateBillingPortalSessionRequestInput input.

### `CreateConversationReply` class

```cs
public sealed class CreateConversationReply
{
    public CreateConversationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Conversation? Result { get; init; }
}
```

The CreateConversationReply result.

### `CreateConversationRequestInput` class

```cs
public sealed class CreateConversationRequestInput
{
    public CreateConversationRequestInput(string title, JsonElement props, IReadOnlyList<MemberInputInput> members);
    public string Title { get; set; }
    public JsonElement Props { get; set; }
    public IReadOnlyList<MemberInputInput> Members { get; set; }
}
```

The CreateConversationRequestInput input.

### `CreateDeploymentReply` class

```cs
public sealed class CreateDeploymentReply
{
    public CreateDeploymentReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The CreateDeploymentReply result.

### `CreateDeploymentRequestInput` class

```cs
public sealed class CreateDeploymentRequestInput
{
    public CreateDeploymentRequestInput(string orgId, string offering, string geoId, string installationProfileId, string consentRef);
    public string OrgId { get; set; }
    public string Offering { get; set; }
    public string GeoId { get; set; }
    public string InstallationProfileId { get; set; }
    public string ConsentRef { get; set; }
}
```

The CreateDeploymentRequestInput input.

### `CreateOrganizationReply` class

```cs
public sealed class CreateOrganizationReply
{
    public CreateOrganizationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Organization? Result { get; init; }
}
```

The CreateOrganizationReply result.

### `CreateOrganizationRequestInput` class

```cs
public sealed class CreateOrganizationRequestInput
{
    public CreateOrganizationRequestInput(string name, string termsRef);
    public string Name { get; set; }
    public string TermsRef { get; set; }
}
```

The CreateOrganizationRequestInput input.

### `CreatePrincipalReply` class

```cs
public sealed class CreatePrincipalReply
{
    public CreatePrincipalReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Principal? Result { get; init; }
}
```

The CreatePrincipalReply result.

### `CreatePrincipalRequestInput` class

```cs
public sealed class CreatePrincipalRequestInput
{
    public CreatePrincipalRequestInput(string externalUserId);
    public string ExternalUserId { get; set; }
}
```

The CreatePrincipalRequestInput input.

### `CreateProjectReply` class

```cs
public sealed class CreateProjectReply
{
    public CreateProjectReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The CreateProjectReply result.

### `CreateProjectRequestInput` class

```cs
public sealed class CreateProjectRequestInput
{
    public CreateProjectRequestInput(string deploymentId, string name, string environment, string backendPrincipalName);
    public string DeploymentId { get; set; }
    public string Name { get; set; }
    public string Environment { get; set; }
    public string BackendPrincipalName { get; set; }
}
```

The CreateProjectRequestInput input.

### `CredentialCapsule` class

```cs
public sealed class CredentialCapsule
{
    public CredentialCapsule();
    public string Kind { get; init; }
    public string? KeyId { get; init; }
    public string? BackendPrincipalId { get; init; }
    public string? BackendKey { get; init; }
    public string? ExpiresAt { get; init; }
    public string? EndpointId { get; init; }
    public string? SecretVersion { get; init; }
    public string? Secret { get; init; }
}
```

The CredentialCapsule result.

### `CredentialDelivery` class

```cs
public sealed class CredentialDelivery
{
    public CredentialDelivery();
    public string DeliveryId { get; init; }
    public string Kind { get; init; }
    public string ProjectId { get; init; }
    public string InstallationId { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public string ExpiresAt { get; init; }
    public string PayloadDigest { get; init; }
    public ActorRef? RecipientActorRef { get; init; }
}
```

The CredentialDelivery result.

### `CredentialDeliveryReceipt` class

```cs
public sealed class CredentialDeliveryReceipt
{
    public CredentialDeliveryReceipt();
    public string DeliveryId { get; init; }
}
```

The CredentialDeliveryReceipt result.

### `CredentialPermitReply` class

```cs
public sealed class CredentialPermitReply
{
    public CredentialPermitReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public JsonElement? Result { get; init; }
}
```

The CredentialPermitReply result.

### `CredentialPermitRequestInput` class

```cs
public sealed class CredentialPermitRequestInput
{
    public CredentialPermitRequestInput(string projectId, string deliveryId, string redemptionRequestId);
    public string ProjectId { get; set; }
    public string DeliveryId { get; set; }
    public string RedemptionRequestId { get; set; }
}
```

The CredentialPermitRequestInput input.

### `CurrentLiveSessionReply` class

```cs
public sealed class CurrentLiveSessionReply
{
    public CurrentLiveSessionReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ServerTime { get; init; }
    public LiveSession? Result { get; init; }
}
```

The CurrentLiveSessionReply result.

### `Cursor` class

```cs
public sealed class Cursor
{
    public Cursor();
    public string Incarnation { get; init; }
    public string ConversationId { get; init; }
    public string Sequence { get; init; }
}
```

The Cursor result.

### `CutoffScope` class

```cs
public sealed class CutoffScope
{
    public CutoffScope();
    public string Kind { get; init; }
    public string? PrincipalId { get; init; }
    public string? SessionId { get; init; }
    public string? DeviceId { get; init; }
    public string? CallId { get; init; }
}
```

The CutoffScope result.

### `DeleteMessageReply` class

```cs
public sealed class DeleteMessageReply
{
    public DeleteMessageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Message? Result { get; init; }
}
```

The DeleteMessageReply result.

### `DeleteMessageRequestInput` class

```cs
public sealed class DeleteMessageRequestInput
{
    public DeleteMessageRequestInput(string conversationId, string messageId, string expectedRevision);
    public string ConversationId { get; set; }
    public string MessageId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The DeleteMessageRequestInput input.

### `DeliveryAck` class

```cs
public sealed class DeliveryAck
{
    public DeliveryAck();
    public string DeliveryId { get; init; }
    public bool Acknowledged { get; init; }
}
```

The DeliveryAck result.

### `Deployment` class

```cs
public sealed class Deployment
{
    public Deployment();
    public string DeploymentId { get; init; }
    public string OrgId { get; init; }
    public string Offering { get; init; }
    public string GeoId { get; init; }
    public string InstallationId { get; init; }
    public string ResourceOwner { get; init; }
    public IReadOnlyList<string> ApprovedRegions { get; init; }
    public string Readiness { get; init; }
    public string Revision { get; init; }
    public string ConsentRef { get; init; }
    public string Environment { get; init; }
}
```

The Deployment result.

### `DeploymentHealth` class

```cs
public sealed class DeploymentHealth
{
    public DeploymentHealth();
    public string DeploymentId { get; init; }
    public string Readiness { get; init; }
    public string ObservedAt { get; init; }
    public IReadOnlyList<ServiceObservation> Services { get; init; }
}
```

The DeploymentHealth result.

### `DeploymentHealthReply` class

```cs
public sealed class DeploymentHealthReply
{
    public DeploymentHealthReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public DeploymentHealth? Result { get; init; }
}
```

The DeploymentHealthReply result.

### `DeploymentHealthRequestInput` class

```cs
public sealed class DeploymentHealthRequestInput
{
    public DeploymentHealthRequestInput(string deploymentId);
    public string DeploymentId { get; set; }
}
```

The DeploymentHealthRequestInput input.

### `DeploymentUsage` class

```cs
public sealed class DeploymentUsage
{
    public DeploymentUsage();
    public string DeploymentId { get; init; }
    public string Source { get; init; }
    public string ObservedAt { get; init; }
    public bool Complete { get; init; }
    public string Reason { get; init; }
    public string From { get; init; }
    public string To { get; init; }
    public IReadOnlyList<UsageMeter> Meters { get; init; }
    public string? AggregatedThrough { get; init; }
}
```

The DeploymentUsage result.

### `DeploymentUsageReply` class

```cs
public sealed class DeploymentUsageReply
{
    public DeploymentUsageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public DeploymentUsage? Result { get; init; }
}
```

The DeploymentUsageReply result.

### `DeploymentUsageRequestInput` class

```cs
public sealed class DeploymentUsageRequestInput
{
    public DeploymentUsageRequestInput(string deploymentId);
    public string DeploymentId { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
}
```

The DeploymentUsageRequestInput input.

### `DisablePrincipalReply` class

```cs
public sealed class DisablePrincipalReply
{
    public DisablePrincipalReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Principal? Result { get; init; }
}
```

The DisablePrincipalReply result.

### `DisablePrincipalRequestInput` class

```cs
public sealed class DisablePrincipalRequestInput
{
    public DisablePrincipalRequestInput(string principalId, string expectedRevision);
    public string PrincipalId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The DisablePrincipalRequestInput input.

### `DisableWebhookReply` class

```cs
public sealed class DisableWebhookReply
{
    public DisableWebhookReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The DisableWebhookReply result.

### `DisableWebhookRequestInput` class

```cs
public sealed class DisableWebhookRequestInput
{
    public DisableWebhookRequestInput(string projectId, string endpointId, string expectedRevision);
    public string ProjectId { get; set; }
    public string EndpointId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The DisableWebhookRequestInput input.

### `EditMessageReply` class

```cs
public sealed class EditMessageReply
{
    public EditMessageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Message? Result { get; init; }
}
```

The EditMessageReply result.

### `EditMessageRequestInput` class

```cs
public sealed class EditMessageRequestInput
{
    public EditMessageRequestInput(string conversationId, string messageId, string expectedRevision);
    public string ConversationId { get; set; }
    public string MessageId { get; set; }
    public string ExpectedRevision { get; set; }
    public string? Text { get; set; }
    public JsonElement? Props { get; set; }
}
```

The EditMessageRequestInput input.

### `EndLiveSessionInput` class

```cs
public sealed class EndLiveSessionInput
{
    public EndLiveSessionInput(string liveSessionId, string expectedGeneration, string expectedRevision);
    public string LiveSessionId { get; set; }
    public string ExpectedGeneration { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The EndLiveSessionInput input.

### `EndLiveSessionPayload` class

```cs
public sealed class EndLiveSessionPayload
{
    public EndLiveSessionPayload();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ReceiptId { get; init; }
    public string CommittedAt { get; init; }
    public bool Replayed { get; init; }
    public OperationRef Operation { get; init; }
    public LiveSessionEndRequested Result { get; init; }
}
```

The EndLiveSessionPayload result.

### `Features` class

```cs
public sealed class Features
{
    public Features();
    public bool Chat { get; init; }
    public bool Inbox { get; init; }
    public bool LexicalSearch { get; init; }
    public bool Typing { get; init; }
    public bool Webhooks { get; init; }
    public bool LiveSessions { get; init; }
    public bool LiveBroadcast { get; init; }
}
```

The Features result.

### `GetConversationReply` class

```cs
public sealed class GetConversationReply
{
    public GetConversationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Conversation? Result { get; init; }
}
```

The GetConversationReply result.

### `GetConversationRequestInput` class

```cs
public sealed class GetConversationRequestInput
{
    public GetConversationRequestInput(string conversationId);
    public string ConversationId { get; set; }
}
```

The GetConversationRequestInput input.

### `GetDeploymentReply` class

```cs
public sealed class GetDeploymentReply
{
    public GetDeploymentReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Deployment? Result { get; init; }
}
```

The GetDeploymentReply result.

### `GetDeploymentRequestInput` class

```cs
public sealed class GetDeploymentRequestInput
{
    public GetDeploymentRequestInput(string deploymentId);
    public string DeploymentId { get; set; }
}
```

The GetDeploymentRequestInput input.

### `GetMessageReply` class

```cs
public sealed class GetMessageReply
{
    public GetMessageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Message? Result { get; init; }
}
```

The GetMessageReply result.

### `GetMessageRequestInput` class

```cs
public sealed class GetMessageRequestInput
{
    public GetMessageRequestInput(string conversationId, string messageId);
    public string ConversationId { get; set; }
    public string MessageId { get; set; }
    public string? ActAsPrincipalId { get; set; }
}
```

The GetMessageRequestInput input.

### `GetOperationReply` class

```cs
public sealed class GetOperationReply
{
    public GetOperationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Operation? Result { get; init; }
}
```

The GetOperationReply result.

### `GetOperationRequestInput` class

```cs
public sealed class GetOperationRequestInput
{
    public GetOperationRequestInput(string operationId);
    public string OperationId { get; set; }
}
```

The GetOperationRequestInput input.

### `GetOrganizationReply` class

```cs
public sealed class GetOrganizationReply
{
    public GetOrganizationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Organization? Result { get; init; }
}
```

The GetOrganizationReply result.

### `GetOrganizationRequestInput` class

```cs
public sealed class GetOrganizationRequestInput
{
    public GetOrganizationRequestInput(string orgId);
    public string OrgId { get; set; }
}
```

The GetOrganizationRequestInput input.

### `GetPrincipalReply` class

```cs
public sealed class GetPrincipalReply
{
    public GetPrincipalReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Principal? Result { get; init; }
}
```

The GetPrincipalReply result.

### `GetPrincipalRequestInput` class

```cs
public sealed class GetPrincipalRequestInput
{
    public GetPrincipalRequestInput(string principalId);
    public string PrincipalId { get; set; }
}
```

The GetPrincipalRequestInput input.

### `GetProjectReply` class

```cs
public sealed class GetProjectReply
{
    public GetProjectReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Project? Result { get; init; }
}
```

The GetProjectReply result.

### `GetProjectRequestInput` class

```cs
public sealed class GetProjectRequestInput
{
    public GetProjectRequestInput(string projectId);
    public string ProjectId { get; set; }
}
```

The GetProjectRequestInput input.

### `HistoryGrantReply` class

```cs
public sealed class HistoryGrantReply
{
    public HistoryGrantReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Member? Result { get; init; }
}
```

The HistoryGrantReply result.

### `HistoryGrantRequestInput` class

```cs
public sealed class HistoryGrantRequestInput
{
    public HistoryGrantRequestInput(string conversationId, string principalId, string membershipEpoch, string expectedRevision, string fromSequence);
    public string ConversationId { get; set; }
    public string PrincipalId { get; set; }
    public string MembershipEpoch { get; set; }
    public string ExpectedRevision { get; set; }
    public string FromSequence { get; set; }
}
```

The HistoryGrantRequestInput input.

### `InboxItem` class

```cs
public sealed class InboxItem
{
    public InboxItem();
    public string ConversationId { get; init; }
    public string Title { get; init; }
    public string? ActivityAt { get; init; }
    public string VisibilityEpoch { get; init; }
    public Message? LatestVisibleMessage { get; init; }
    public bool HasUnread { get; init; }
}
```

The InboxItem result.

### `InboxPage` class

```cs
public sealed class InboxPage
{
    public InboxPage();
    public IReadOnlyList<InboxItem> Items { get; init; }
    public bool Complete { get; init; }
    public bool RefreshRequired { get; init; }
    public string? NextCursor { get; init; }
    public string? PartialReason { get; init; }
}
```

The InboxPage result.

### `InboxReply` class

```cs
public sealed class InboxReply
{
    public InboxReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public InboxPage? Result { get; init; }
}
```

The InboxReply result.

### `InboxRequestInput` class

```cs
public sealed class InboxRequestInput
{
    public InboxRequestInput(int limit);
    public int Limit { get; set; }
    public string? Cursor { get; set; }
    public string? ActAsPrincipalId { get; set; }
}
```

The InboxRequestInput input.

### `IssueBackendKeyReply` class

```cs
public sealed class IssueBackendKeyReply
{
    public IssueBackendKeyReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The IssueBackendKeyReply result.

### `IssueBackendKeyRequestInput` class

```cs
public sealed class IssueBackendKeyRequestInput
{
    public IssueBackendKeyRequestInput(string projectId, string name, IReadOnlyList<string> scopes, string expiresAt);
    public string ProjectId { get; set; }
    public string Name { get; set; }
    public IReadOnlyList<string> Scopes { get; set; }
    public string ExpiresAt { get; set; }
}
```

The IssueBackendKeyRequestInput input.

### `IssueSessionReply` class

```cs
public sealed class IssueSessionReply
{
    public IssueSessionReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public SessionBootstrap? Result { get; init; }
}
```

The IssueSessionReply result.

### `IssueSessionRequestInput` class

```cs
public sealed class IssueSessionRequestInput
{
    public IssueSessionRequestInput(string principalId, string deviceId, string requestedTtlMs);
    public string PrincipalId { get; set; }
    public string DeviceId { get; set; }
    public string RequestedTtlMs { get; set; }
}
```

The IssueSessionRequestInput input.

### `Limit` class

```cs
public sealed class Limit
{
    public Limit();
    public string? Maximum { get; init; }
    public string? Unit { get; init; }
    public string? Scope { get; init; }
    public string? Milliseconds { get; init; }
    public string? PolicyId { get; init; }
    public string? Revision { get; init; }
}
```

The Limit result.

### `LimitEntry` class

```cs
public sealed class LimitEntry
{
    public LimitEntry();
    public string Key { get; init; }
    public Limit Value { get; init; }
}
```

The LimitEntry result.

### `LiveAlertBatch` class

```cs
public sealed class LiveAlertBatch
{
    public LiveAlertBatch();
    public string LiveSessionId { get; init; }
    public string Created { get; init; }
    public string Suppressed { get; init; }
}
```

The LiveAlertBatch result.

### `LiveCredentialIssuance` class

```cs
public sealed class LiveCredentialIssuance
{
    public LiveCredentialIssuance();
    public string LiveSessionId { get; init; }
    public string ParticipationId { get; init; }
    public string Generation { get; init; }
    public string LeaseId { get; init; }
    public string GrantOrdinal { get; init; }
    public string AdmissionExpiresAt { get; init; }
    public string LeaseExpiresAt { get; init; }
}
```

The LiveCredentialIssuance result.

### `LiveCutoffScope` class

```cs
public sealed class LiveCutoffScope
{
    public LiveCutoffScope();
    public LiveCutoffScopeKind Kind { get; init; }
    public string LiveSessionId { get; init; }
    public string Generation { get; init; }
    public string? ParticipationId { get; init; }
}
```

The LiveCutoffScope result.

### `LiveMediaCutoff` class

```cs
public sealed class LiveMediaCutoff
{
    public LiveMediaCutoff();
    public LiveCutoffState State { get; init; }
    public LiveCutoffScope Scope { get; init; }
    public LiveCutoffEvidence? Evidence { get; init; }
    public string? EnforcedAt { get; init; }
    public string? OperationId { get; init; }
}
```

The LiveMediaCutoff result.

### `LiveMediaPermissions` class

```cs
public sealed class LiveMediaPermissions
{
    public LiveMediaPermissions();
    public bool Microphone { get; init; }
    public bool Camera { get; init; }
    public bool Subscribe { get; init; }
}
```

The LiveMediaPermissions result.

### `LiveOperationFailure` class

```cs
public sealed class LiveOperationFailure
{
    public LiveOperationFailure();
    public LiveErrorCode Code { get; init; }
    public string Message { get; init; }
}
```

The LiveOperationFailure result.

### `LiveParticipantPage` class

```cs
public sealed class LiveParticipantPage
{
    public LiveParticipantPage();
    public IReadOnlyList<LiveParticipation> Items { get; init; }
    public string? NextCursor { get; init; }
    public bool Complete { get; init; }
    public string? PartialReason { get; init; }
    public bool RefreshRequired { get; init; }
}
```

The LiveParticipantPage result.

### `LiveParticipantPageReply` class

```cs
public sealed class LiveParticipantPageReply
{
    public LiveParticipantPageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ServerTime { get; init; }
    public LiveParticipantPage Result { get; init; }
}
```

The LiveParticipantPageReply result.

### `LiveParticipantsInput` class

```cs
public sealed class LiveParticipantsInput
{
    public LiveParticipantsInput(string liveSessionId);
    public string LiveSessionId { get; set; }
    public int? Limit { get; set; }
    public string? Cursor { get; set; }
}
```

The LiveParticipantsInput input.

### `LiveParticipation` class

```cs
public sealed class LiveParticipation
{
    public LiveParticipation();
    public string ParticipationId { get; init; }
    public string PrincipalId { get; init; }
    public string MembershipEpoch { get; init; }
    public LiveRole Role { get; init; }
    public LiveParticipationState State { get; init; }
    public LiveMediaPermissions Permissions { get; init; }
    public string? ReservationExpiresAt { get; init; }
    public string? NativeConnectionId { get; init; }
    public LiveMediaCutoff? MediaCutoff { get; init; }
}
```

The LiveParticipation result.

### `LiveSession` class

```cs
public sealed class LiveSession
{
    public LiveSession();
    public string LiveSessionId { get; init; }
    public string ConversationId { get; init; }
    public string CreatorId { get; init; }
    public LiveSessionKind Kind { get; init; }
    public LiveMediaProfile MediaProfile { get; init; }
    public LiveSessionState State { get; init; }
    public string Generation { get; init; }
    public string Revision { get; init; }
    public string CreatedAt { get; init; }
    public string ExpiresAt { get; init; }
    public LiveParticipation? MyParticipation { get; init; }
    public LiveMediaCutoff? MediaCutoff { get; init; }
}
```

The LiveSession result.

### `LiveSessionEndRequested` class

```cs
public sealed class LiveSessionEndRequested
{
    public LiveSessionEndRequested();
    public string LiveSessionId { get; init; }
    public string OperationId { get; init; }
    public LiveMediaCutoff MediaCutoff { get; init; }
}
```

The LiveSessionEndRequested result.

### `LiveSessionInput` class

```cs
public sealed class LiveSessionInput
{
    public LiveSessionInput(string liveSessionId);
    public string LiveSessionId { get; set; }
}
```

The LiveSessionInput input.

### `LiveSessionJoined` class

```cs
public sealed class LiveSessionJoined
{
    public LiveSessionJoined();
    public string LiveSessionId { get; init; }
    public string Generation { get; init; }
    public LiveParticipation Participation { get; init; }
}
```

The LiveSessionJoined result.

### `LiveSessionLeft` class

```cs
public sealed class LiveSessionLeft
{
    public LiveSessionLeft();
    public string LiveSessionId { get; init; }
    public string ParticipationId { get; init; }
    public LiveMediaCutoff MediaCutoff { get; init; }
}
```

The LiveSessionLeft result.

### `LiveSessionOperation` class

```cs
public sealed class LiveSessionOperation
{
    public LiveSessionOperation();
    public string OperationId { get; init; }
    public string RequestId { get; init; }
    public string LiveSessionId { get; init; }
    public LiveOperationKind Kind { get; init; }
    public LiveOperationState State { get; init; }
    public string Revision { get; init; }
    public string RequestedAt { get; init; }
    public string? CompletedAt { get; init; }
    public LiveSessionOperationCompletion? Completion { get; init; }
    public LiveOperationFailure? Failure { get; init; }
}
```

The LiveSessionOperation result.

### `LiveSessionOperationCompletion` class

```cs
public sealed class LiveSessionOperationCompletion
{
    public LiveSessionOperationCompletion();
    public string LiveSessionId { get; init; }
    public string Generation { get; init; }
    public LiveSessionState State { get; init; }
    public string Revision { get; init; }
    public string CompletedAt { get; init; }
    public LiveMediaCutoff? MediaCutoff { get; init; }
}
```

The LiveSessionOperationCompletion result.

### `LiveSessionOperationInput` class

```cs
public sealed class LiveSessionOperationInput
{
    public LiveSessionOperationInput(string operationId);
    public string OperationId { get; set; }
}
```

The LiveSessionOperationInput input.

### `LiveSessionOperationReply` class

```cs
public sealed class LiveSessionOperationReply
{
    public LiveSessionOperationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ServerTime { get; init; }
    public LiveSessionOperation Result { get; init; }
}
```

The LiveSessionOperationReply result.

### `LiveSessionPage` class

```cs
public sealed class LiveSessionPage
{
    public LiveSessionPage();
    public IReadOnlyList<LiveSession> Items { get; init; }
    public string? NextCursor { get; init; }
    public bool Complete { get; init; }
    public string? PartialReason { get; init; }
    public bool RefreshRequired { get; init; }
}
```

The LiveSessionPage result.

### `LiveSessionPageReply` class

```cs
public sealed class LiveSessionPageReply
{
    public LiveSessionPageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ServerTime { get; init; }
    public LiveSessionPage Result { get; init; }
}
```

The LiveSessionPageReply result.

### `LiveSessionReply` class

```cs
public sealed class LiveSessionReply
{
    public LiveSessionReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ServerTime { get; init; }
    public LiveSession Result { get; init; }
}
```

The LiveSessionReply result.

### `LiveSessionStarted` class

```cs
public sealed class LiveSessionStarted
{
    public LiveSessionStarted();
    public string LiveSessionId { get; init; }
    public string ConversationId { get; init; }
    public LiveSessionKind Kind { get; init; }
    public LiveMediaProfile MediaProfile { get; init; }
    public string OperationId { get; init; }
}
```

The LiveSessionStarted result.

### `LiveSessionsInput` class

```cs
public sealed class LiveSessionsInput
{
    public LiveSessionsInput(string conversationId);
    public string ConversationId { get; set; }
    public int? Limit { get; set; }
    public string? Cursor { get; set; }
}
```

The LiveSessionsInput input.

### `MediaCutoff` class

```cs
public sealed class MediaCutoff
{
    public MediaCutoff();
    public string State { get; init; }
    public CutoffScope? Scope { get; init; }
}
```

The MediaCutoff result.

### `MediaPolicy` class

```cs
public sealed class MediaPolicy
{
    public MediaPolicy();
    public string LeasePolicyId { get; init; }
    public string MaxLeaseMs { get; init; }
    public string RenewAttemptMs { get; init; }
    public string PreludeMaxBytes { get; init; }
    public string PreludeTimeoutMs { get; init; }
    public string ClockProfileId { get; init; }
}
```

The MediaPolicy result.

### `Member` class

```cs
public sealed class Member
{
    public Member();
    public string ConversationId { get; init; }
    public string PrincipalId { get; init; }
    public string Role { get; init; }
    public string Status { get; init; }
    public string MembershipEpoch { get; init; }
    public string VisibilityEpoch { get; init; }
    public string Revision { get; init; }
    public string VisibleFromSequence { get; init; }
    public bool CanStartBroadcast { get; init; }
}
```

The Member result.

### `MemberBatchEntryInput` class

```cs
public sealed class MemberBatchEntryInput
{
    public MemberBatchEntryInput(string principalId, string role, string expectedRevision);
    public string PrincipalId { get; set; }
    public string Role { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The MemberBatchEntryInput input.

### `MemberInputInput` class

```cs
public sealed class MemberInputInput
{
    public MemberInputInput(string principalId, string role);
    public string PrincipalId { get; set; }
    public string Role { get; set; }
}
```

The MemberInputInput input.

### `MemberPage` class

```cs
public sealed class MemberPage
{
    public MemberPage();
    public IReadOnlyList<Member> Items { get; init; }
    public bool Complete { get; init; }
    public bool RefreshRequired { get; init; }
    public string? NextCursor { get; init; }
}
```

The MemberPage result.

### `MembersReply` class

```cs
public sealed class MembersReply
{
    public MembersReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public MemberPage? Result { get; init; }
}
```

The MembersReply result.

### `MembersRequestInput` class

```cs
public sealed class MembersRequestInput
{
    public MembersRequestInput(string conversationId, int limit);
    public string ConversationId { get; set; }
    public int Limit { get; set; }
    public string? Cursor { get; set; }
}
```

The MembersRequestInput input.

### `Message` class

```cs
public sealed class Message
{
    public Message();
    public string MessageId { get; init; }
    public string ConversationId { get; init; }
    public string AuthorId { get; init; }
    public string Sequence { get; init; }
    public string Revision { get; init; }
    public string RevisionSequence { get; init; }
    public string CreatedAt { get; init; }
    public bool Deleted { get; init; }
    public string? Text { get; init; }
    public JsonElement? Props { get; init; }
    public string? EditedAt { get; init; }
}
```

The Message result.

### `MessageAck` class

```cs
public sealed class MessageAck
{
    public MessageAck();
    public string MessageId { get; init; }
    public string ConversationId { get; init; }
    public string Sequence { get; init; }
    public string Revision { get; init; }
    public string Status { get; init; }
    public Cursor? Cursor { get; init; }
}
```

The MessageAck result.

### `MessagePage` class

```cs
public sealed class MessagePage
{
    public MessagePage();
    public IReadOnlyList<Message> Items { get; init; }
    public bool Complete { get; init; }
    public bool RefreshRequired { get; init; }
    public string? NextCursor { get; init; }
}
```

The MessagePage result.

### `MessagesReply` class

```cs
public sealed class MessagesReply
{
    public MessagesReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public MessagePage? Result { get; init; }
}
```

The MessagesReply result.

### `MessagesRequestInput` class

```cs
public sealed class MessagesRequestInput
{
    public MessagesRequestInput(string conversationId, int limit);
    public string ConversationId { get; set; }
    public int Limit { get; set; }
    public string? BeforeSequence { get; set; }
    public string? ActAsPrincipalId { get; set; }
}
```

The MessagesRequestInput input.

### `Operation` class

```cs
public sealed class Operation
{
    public Operation();
    public string OperationId { get; init; }
    public string Kind { get; init; }
    public ResourceRef? TargetRef { get; init; }
    public string State { get; init; }
    public string Revision { get; init; }
    public string RequestedAt { get; init; }
    public string UpdatedAt { get; init; }
    public IReadOnlyList<OperationStep> Steps { get; init; }
    public OperationResult? Result { get; init; }
    public string? BlockedReason { get; init; }
}
```

The Operation result.

### `OperationRef` class

```cs
public sealed class OperationRef
{
    public OperationRef();
    public string OperationId { get; init; }
    public string Owner { get; init; }
    public string Href { get; init; }
    public string State { get; init; }
}
```

The OperationRef result.

### `OperationResult` class

```cs
public sealed class OperationResult
{
    public OperationResult();
    public string? ProjectId { get; init; }
    public string? Incarnation { get; init; }
    public string? Status { get; init; }
    public string? Backend { get; init; }
    public string? Environment { get; init; }
    public string? PolicyRevision { get; init; }
    public string? ExpiresAt { get; init; }
    public string? Kind { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public CredentialDelivery? Delivery { get; init; }
    public string? KeyId { get; init; }
    public string? EndpointId { get; init; }
    public bool? Enabled { get; init; }
    public LiveSessionOperationCompletion? LiveSessionCompletion { get; init; }
    public int? ReplayedDeliveries { get; init; }
    public int? SkippedDeliveries { get; init; }
    public bool? MessagePreview { get; init; }
}
```

The OperationResult result.

### `OperationStep` class

```cs
public sealed class OperationStep
{
    public OperationStep();
    public string StepId { get; init; }
    public string State { get; init; }
}
```

The OperationStep result.

### `Organization` class

```cs
public sealed class Organization
{
    public Organization();
    public string OrgId { get; init; }
    public string Name { get; init; }
    public string Status { get; init; }
    public string Revision { get; init; }
}
```

The Organization result.

### `OrganizationBilling` class

```cs
public sealed class OrganizationBilling
{
    public OrganizationBilling();
    public string OrgId { get; init; }
    public string? PlanId { get; init; }
    public string? Standing { get; init; }
    public string? GraceUntil { get; init; }
    public string? SubscriptionStatus { get; init; }
    public string? CurrentPeriodEnd { get; init; }
    public bool CancelAtPeriodEnd { get; init; }
    public string CatalogVersion { get; init; }
    public bool Configured { get; init; }
    public bool Billed { get; init; }
}
```

The OrganizationBilling result.

### `OrganizationBillingReply` class

```cs
public sealed class OrganizationBillingReply
{
    public OrganizationBillingReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OrganizationBilling? Result { get; init; }
}
```

The OrganizationBillingReply result.

### `OrganizationBillingRequestInput` class

```cs
public sealed class OrganizationBillingRequestInput
{
    public OrganizationBillingRequestInput(string orgId);
    public string OrgId { get; set; }
}
```

The OrganizationBillingRequestInput input.

### `OrganizationPage` class

```cs
public sealed class OrganizationPage
{
    public OrganizationPage();
    public IReadOnlyList<Organization> Items { get; init; }
    public bool Complete { get; init; }
    public bool RefreshRequired { get; init; }
    public string? NextCursor { get; init; }
}
```

The OrganizationPage result.

### `OrganizationUsage` class

```cs
public sealed class OrganizationUsage
{
    public OrganizationUsage();
    public string OrgId { get; init; }
    public string Source { get; init; }
    public string ObservedAt { get; init; }
    public bool Complete { get; init; }
    public string Reason { get; init; }
    public string From { get; init; }
    public string To { get; init; }
    public IReadOnlyList<UsageMeter> Meters { get; init; }
    public string? AggregatedThrough { get; init; }
}
```

The OrganizationUsage result.

### `OrganizationUsageReply` class

```cs
public sealed class OrganizationUsageReply
{
    public OrganizationUsageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OrganizationUsage? Result { get; init; }
}
```

The OrganizationUsageReply result.

### `OrganizationUsageRequestInput` class

```cs
public sealed class OrganizationUsageRequestInput
{
    public OrganizationUsageRequestInput(string orgId);
    public string OrgId { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
}
```

The OrganizationUsageRequestInput input.

### `OrganizationsReply` class

```cs
public sealed class OrganizationsReply
{
    public OrganizationsReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OrganizationPage? Result { get; init; }
}
```

The OrganizationsReply result.

### `PauseOperationReply` class

```cs
public sealed class PauseOperationReply
{
    public PauseOperationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Operation? Result { get; init; }
}
```

The PauseOperationReply result.

### `PauseOperationRequestInput` class

```cs
public sealed class PauseOperationRequestInput
{
    public PauseOperationRequestInput(string operationId, string expectedRevision);
    public string OperationId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The PauseOperationRequestInput input.

### `PolicyChangeInput` class

```cs
public sealed class PolicyChangeInput
{
    public PolicyChangeInput(string kind);
    public string Kind { get; set; }
    public string? Reason { get; set; }
    public string? HoldId { get; set; }
}
```

The PolicyChangeInput input.

### `Principal` class

```cs
public sealed class Principal
{
    public Principal();
    public string PrincipalId { get; init; }
    public string ExternalUserId { get; init; }
    public string Status { get; init; }
    public string Revision { get; init; }
}
```

The Principal result.

### `Project` class

```cs
public sealed class Project
{
    public Project();
    public string ProjectId { get; init; }
    public string DeploymentId { get; init; }
    public string Name { get; init; }
    public string Environment { get; init; }
    public string Incarnation { get; init; }
    public string ServingRegion { get; init; }
    public string ServingEpoch { get; init; }
    public string Status { get; init; }
    public string Revision { get; init; }
    public string PolicyRevision { get; init; }
    public bool MessagePreview { get; init; }
}
```

The Project result.

### `ProjectPolicyReply` class

```cs
public sealed class ProjectPolicyReply
{
    public ProjectPolicyReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The ProjectPolicyReply result.

### `ProjectPolicyRequestInput` class

```cs
public sealed class ProjectPolicyRequestInput
{
    public ProjectPolicyRequestInput(string projectId, string expectedRevision, PolicyChangeInput change);
    public string ProjectId { get; set; }
    public string ExpectedRevision { get; set; }
    public PolicyChangeInput Change { get; set; }
}
```

The ProjectPolicyRequestInput input.

### `ProjectUsage` class

```cs
public sealed class ProjectUsage
{
    public ProjectUsage();
    public string ProjectId { get; init; }
    public string Source { get; init; }
    public string ObservedAt { get; init; }
    public bool Complete { get; init; }
    public string Reason { get; init; }
    public string From { get; init; }
    public string To { get; init; }
    public IReadOnlyList<UsageMeter> Meters { get; init; }
    public string? AggregatedThrough { get; init; }
}
```

The ProjectUsage result.

### `ProjectUsageReply` class

```cs
public sealed class ProjectUsageReply
{
    public ProjectUsageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public ProjectUsage? Result { get; init; }
}
```

The ProjectUsageReply result.

### `ProjectUsageRequestInput` class

```cs
public sealed class ProjectUsageRequestInput
{
    public ProjectUsageRequestInput(string projectId);
    public string ProjectId { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
}
```

The ProjectUsageRequestInput input.

### `ReadReceipt` class

```cs
public sealed class ReadReceipt
{
    public ReadReceipt();
    public string PrincipalId { get; init; }
    public string MembershipEpoch { get; init; }
    public string VisibilityEpoch { get; init; }
    public string? DeliveredThroughSequence { get; init; }
    public string? ReadThroughSequence { get; init; }
    public string? UpdatedAt { get; init; }
}
```

The ReadReceipt result.

### `RedeemCredentialReply` class

```cs
public sealed class RedeemCredentialReply
{
    public RedeemCredentialReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public CredentialCapsule? Result { get; init; }
}
```

The RedeemCredentialReply result.

### `RedeemCredentialRequestInput` class

```cs
public sealed class RedeemCredentialRequestInput
{
    public RedeemCredentialRequestInput(string deliveryId);
    public string DeliveryId { get; set; }
}
```

The RedeemCredentialRequestInput input.

### `RemoveMemberReply` class

```cs
public sealed class RemoveMemberReply
{
    public RemoveMemberReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Member? Result { get; init; }
}
```

The RemoveMemberReply result.

### `RemoveMemberRequestInput` class

```cs
public sealed class RemoveMemberRequestInput
{
    public RemoveMemberRequestInput(string conversationId, string principalId, string expectedRevision);
    public string ConversationId { get; set; }
    public string PrincipalId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The RemoveMemberRequestInput input.

### `RenewSessionReply` class

```cs
public sealed class RenewSessionReply
{
    public RenewSessionReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public SessionBootstrap? Result { get; init; }
}
```

The RenewSessionReply result.

### `RenewSessionRequestInput` class

```cs
public sealed class RenewSessionRequestInput
{
    public RenewSessionRequestInput(string sessionId, string principalId, string deviceId, string expectedRevision, string requestedTtlMs);
    public string SessionId { get; set; }
    public string PrincipalId { get; set; }
    public string DeviceId { get; set; }
    public string ExpectedRevision { get; set; }
    public string RequestedTtlMs { get; set; }
}
```

The RenewSessionRequestInput input.

### `ReplayWebhookDeliveriesReply` class

```cs
public sealed class ReplayWebhookDeliveriesReply
{
    public ReplayWebhookDeliveriesReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The ReplayWebhookDeliveriesReply result.

### `ReplayWebhookDeliveriesRequestInput` class

```cs
public sealed class ReplayWebhookDeliveriesRequestInput
{
    public ReplayWebhookDeliveriesRequestInput(string projectId, string endpointId);
    public string ProjectId { get; set; }
    public string EndpointId { get; set; }
    public string? EffectId { get; set; }
    public string? Since { get; set; }
    public string? Until { get; set; }
}
```

The ReplayWebhookDeliveriesRequestInput input.

### `RequestResolution` class

```cs
public sealed class RequestResolution
{
    public RequestResolution();
    public string State { get; init; }
    public string RequestId { get; init; }
    public string CheckedAt { get; init; }
    public bool ResultWithheld { get; init; }
    public ResolvedReceipt? Receipt { get; init; }
}
```

The RequestResolution result.

### `ResolveRequestReply` class

```cs
public sealed class ResolveRequestReply
{
    public ResolveRequestReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public RequestResolution? Result { get; init; }
}
```

The ResolveRequestReply result.

### `ResolveRequestRequestInput` class

```cs
public sealed class ResolveRequestRequestInput
{
    public ResolveRequestRequestInput(string requestId);
    public string RequestId { get; set; }
}
```

The ResolveRequestRequestInput input.

### `ResolvedReceipt` class

```cs
public sealed class ResolvedReceipt
{
    public ResolvedReceipt();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public RetainedResult? Result { get; init; }
}
```

The ResolvedReceipt result.

### `ResourceRef` class

```cs
public sealed class ResourceRef
{
    public ResourceRef();
    public string Kind { get; init; }
    public string Id { get; init; }
}
```

The ResourceRef result.

### `ResumeOperationReply` class

```cs
public sealed class ResumeOperationReply
{
    public ResumeOperationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Operation? Result { get; init; }
}
```

The ResumeOperationReply result.

### `ResumeOperationRequestInput` class

```cs
public sealed class ResumeOperationRequestInput
{
    public ResumeOperationRequestInput(string operationId, string expectedRevision);
    public string OperationId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The ResumeOperationRequestInput input.

### `RetainedResult` class

```cs
public sealed class RetainedResult
{
    public RetainedResult();
    public BillingCheckoutSession? BillingCheckoutSession { get; init; }
    public BillingPortalSession? BillingPortalSession { get; init; }
    public BroadcastPermissionChanged? BroadcastPermissionChanged { get; init; }
    public Conversation? Conversation { get; init; }
    public ConversationMemberBatch? ConversationMemberBatch { get; init; }
    public ConversationMute? ConversationMute { get; init; }
    public CredentialDeliveryReceipt? CredentialDeliveryReceipt { get; init; }
    public DeliveryAck? DeliveryAck { get; init; }
    public LiveAlertBatch? LiveAlertBatch { get; init; }
    public LiveCredentialIssuance? LiveCredentialIssuance { get; init; }
    public LiveSessionEndRequested? LiveSessionEndRequested { get; init; }
    public LiveSessionJoined? LiveSessionJoined { get; init; }
    public LiveSessionLeft? LiveSessionLeft { get; init; }
    public LiveSessionStarted? LiveSessionStarted { get; init; }
    public Member? Member { get; init; }
    public Message? Message { get; init; }
    public MessageAck? MessageAck { get; init; }
    public Organization? Organization { get; init; }
    public Principal? Principal { get; init; }
    public ReadReceipt? ReadReceipt { get; init; }
    public SessionBootstrap? SessionBootstrap { get; init; }
    public SessionRevocation? SessionRevocation { get; init; }
    public JsonElement? SignedProof { get; init; }
}
```

Exactly one typed field contains the retained, currently authorized receipt result.

### `RevokeBackendKeyReply` class

```cs
public sealed class RevokeBackendKeyReply
{
    public RevokeBackendKeyReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The RevokeBackendKeyReply result.

### `RevokeBackendKeyRequestInput` class

```cs
public sealed class RevokeBackendKeyRequestInput
{
    public RevokeBackendKeyRequestInput(string projectId, string keyId, string expectedRevision, bool revokeIssuedSessions);
    public string ProjectId { get; set; }
    public string KeyId { get; set; }
    public string ExpectedRevision { get; set; }
    public bool RevokeIssuedSessions { get; set; }
}
```

The RevokeBackendKeyRequestInput input.

### `RevokeSessionReply` class

```cs
public sealed class RevokeSessionReply
{
    public RevokeSessionReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public SessionRevocation? Result { get; init; }
}
```

The RevokeSessionReply result.

### `RevokeSessionRequestInput` class

```cs
public sealed class RevokeSessionRequestInput
{
    public RevokeSessionRequestInput(string sessionId, string expectedRevision);
    public string SessionId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The RevokeSessionRequestInput input.

### `RotateWebhookSecretReply` class

```cs
public sealed class RotateWebhookSecretReply
{
    public RotateWebhookSecretReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The RotateWebhookSecretReply result.

### `RotateWebhookSecretRequestInput` class

```cs
public sealed class RotateWebhookSecretRequestInput
{
    public RotateWebhookSecretRequestInput(string projectId, string endpointId, string expectedRevision);
    public string ProjectId { get; set; }
    public string EndpointId { get; set; }
    public string ExpectedRevision { get; set; }
}
```

The RotateWebhookSecretRequestInput input.

### `RouteReply` class

```cs
public sealed class RouteReply
{
    public RouteReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public JsonElement? Result { get; init; }
}
```

The RouteReply result.

### `SearchHit` class

```cs
public sealed class SearchHit
{
    public SearchHit();
    public string ConversationId { get; init; }
    public Message? Message { get; init; }
}
```

The SearchHit result.

### `SearchPage` class

```cs
public sealed class SearchPage
{
    public SearchPage();
    public IReadOnlyList<SearchHit> Items { get; init; }
    public bool Complete { get; init; }
    public bool RefreshRequired { get; init; }
    public string? NextCursor { get; init; }
}
```

The SearchPage result.

### `SearchReply` class

```cs
public sealed class SearchReply
{
    public SearchReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public SearchPage? Result { get; init; }
}
```

The SearchReply result.

### `SearchRequestInput` class

```cs
public sealed class SearchRequestInput
{
    public SearchRequestInput(string query, int pageSize);
    public string Query { get; set; }
    public int PageSize { get; set; }
    public SearchScopeInput? Scope { get; set; }
    public string? Cursor { get; set; }
    public string? ActAsPrincipalId { get; set; }
}
```

The SearchRequestInput input.

### `SearchScopeInput` class

```cs
public sealed class SearchScopeInput
{
    public SearchScopeInput(IReadOnlyList<string> conversationIds);
    public IReadOnlyList<string> ConversationIds { get; set; }
}
```

The SearchScopeInput input.

### `SendMessageReply` class

```cs
public sealed class SendMessageReply
{
    public SendMessageReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public MessageAck? Result { get; init; }
}
```

The SendMessageReply result.

### `SendMessageRequestInput` class

```cs
public sealed class SendMessageRequestInput
{
    public SendMessageRequestInput(string conversationId, string text, JsonElement props);
    public string ConversationId { get; set; }
    public string Text { get; set; }
    public JsonElement Props { get; set; }
    public string? ActAsPrincipalId { get; set; }
}
```

The SendMessageRequestInput input.

### `ServiceDetails` class

```cs
public sealed class ServiceDetails
{
    public ServiceDetails();
    public string Status { get; init; }
}
```

The ServiceDetails result.

### `ServiceObservation` class

```cs
public sealed class ServiceObservation
{
    public ServiceObservation();
    public string Role { get; init; }
    public string ObservedAt { get; init; }
    public ServiceDetails? Details { get; init; }
}
```

The ServiceObservation result.

### `Session` class

```cs
public sealed class Session
{
    public Session();
    public string SessionId { get; init; }
    public string PrincipalId { get; init; }
    public string DeviceId { get; init; }
    public string Incarnation { get; init; }
    public string SessionRevision { get; init; }
    public string ExpiresAt { get; init; }
    public string Status { get; init; }
}
```

The Session result.

### `SessionBootstrap` class

```cs
public sealed class SessionBootstrap
{
    public SessionBootstrap();
    public Session? Session { get; init; }
    public string TokenExpiresAt { get; init; }
    public string SessionToken { get; init; }
}
```

The SessionBootstrap result.

### `SessionRequestOutcome` class

```cs
public sealed class SessionRequestOutcome
{
    public SessionRequestOutcome();
    public string State { get; init; }
    public string RequestId { get; init; }
    public string CheckedAt { get; init; }
    public string? Operation { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public Session? OriginalSession { get; init; }
    public Session? CurrentSession { get; init; }
    public string? CurrentState { get; init; }
}
```

The SessionRequestOutcome result.

### `SessionRequestOutcomeReply` class

```cs
public sealed class SessionRequestOutcomeReply
{
    public SessionRequestOutcomeReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ServerTime { get; init; }
    public SessionRequestOutcome Result { get; init; }
}
```

The SessionRequestOutcomeReply result.

### `SessionRequestOutcomeRequestInput` class

```cs
public sealed class SessionRequestOutcomeRequestInput
{
    public SessionRequestOutcomeRequestInput(string requestId);
    public string RequestId { get; set; }
}
```

The SessionRequestOutcomeRequestInput input.

### `SessionRevocation` class

```cs
public sealed class SessionRevocation
{
    public SessionRevocation();
    public string SessionId { get; init; }
    public string Status { get; init; }
    public MediaCutoff? MediaCutoff { get; init; }
}
```

The SessionRevocation result.

### `SetBroadcastPermissionInput` class

```cs
public sealed class SetBroadcastPermissionInput
{
    public SetBroadcastPermissionInput(string conversationId, string principalId, bool allowed, string expectedMembershipRevision);
    public string ConversationId { get; set; }
    public string PrincipalId { get; set; }
    public bool Allowed { get; set; }
    public string ExpectedMembershipRevision { get; set; }
}
```

The SetBroadcastPermissionInput input.

### `SetBroadcastPermissionPayload` class

```cs
public sealed class SetBroadcastPermissionPayload
{
    public SetBroadcastPermissionPayload();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ReceiptId { get; init; }
    public string CommittedAt { get; init; }
    public bool Replayed { get; init; }
    public BroadcastPermissionChanged Result { get; init; }
}
```

The SetBroadcastPermissionPayload result.

### `SetConversationMuteInput` class

```cs
public sealed class SetConversationMuteInput
{
    public SetConversationMuteInput(string conversationId, bool muted);
    public string ConversationId { get; set; }
    public bool Muted { get; set; }
    public string? Until { get; set; }
    public string? ActAsPrincipalId { get; set; }
}
```

The SetConversationMuteInput input.

### `SetConversationMutePayload` class

```cs
public sealed class SetConversationMutePayload
{
    public SetConversationMutePayload();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string ReceiptId { get; init; }
    public string CommittedAt { get; init; }
    public bool Replayed { get; init; }
    public ConversationMute Result { get; init; }
}
```

The SetConversationMutePayload result.

### `UpdateConversationReply` class

```cs
public sealed class UpdateConversationReply
{
    public UpdateConversationReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public Conversation? Result { get; init; }
}
```

The UpdateConversationReply result.

### `UpdateConversationRequestInput` class

```cs
public sealed class UpdateConversationRequestInput
{
    public UpdateConversationRequestInput(string conversationId, string expectedRevision);
    public string ConversationId { get; set; }
    public string ExpectedRevision { get; set; }
    public string? Title { get; set; }
    public JsonElement? Props { get; set; }
}
```

The UpdateConversationRequestInput input.

### `UpdateWebhookReply` class

```cs
public sealed class UpdateWebhookReply
{
    public UpdateWebhookReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public OperationResult? Result { get; init; }
}
```

The UpdateWebhookReply result.

### `UpdateWebhookRequestInput` class

```cs
public sealed class UpdateWebhookRequestInput
{
    public UpdateWebhookRequestInput(string projectId, string endpointId, string expectedRevision, IReadOnlyList<string> eventTypes, bool enabled);
    public string ProjectId { get; set; }
    public string EndpointId { get; set; }
    public string ExpectedRevision { get; set; }
    public IReadOnlyList<string> EventTypes { get; set; }
    public bool Enabled { get; set; }
}
```

The UpdateWebhookRequestInput input.

### `UsageMeter` class

```cs
public sealed class UsageMeter
{
    public UsageMeter();
    public string Meter { get; init; }
    public string Unit { get; init; }
    public string Quantity { get; init; }
    public bool Emitted { get; init; }
}
```

The UsageMeter result.

### `WebhookDeliveriesReply` class

```cs
public sealed class WebhookDeliveriesReply
{
    public WebhookDeliveriesReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public WebhookDeliveryPage? Result { get; init; }
}
```

The WebhookDeliveriesReply result.

### `WebhookDeliveriesRequestInput` class

```cs
public sealed class WebhookDeliveriesRequestInput
{
    public WebhookDeliveriesRequestInput(string projectId, string endpointId);
    public string ProjectId { get; set; }
    public string EndpointId { get; set; }
}
```

The WebhookDeliveriesRequestInput input.

### `WebhookDelivery` class

```cs
public sealed class WebhookDelivery
{
    public WebhookDelivery();
    public string EffectId { get; init; }
    public string EventId { get; init; }
    public string State { get; init; }
    public string Attempts { get; init; }
    public string? LastOutcome { get; init; }
    public string NextAttemptAt { get; init; }
    public string? EventType { get; init; }
    public string? CreatedAt { get; init; }
    public string? ReplayedAt { get; init; }
    public string? LastAttemptAt { get; init; }
    public int? LastHttpStatus { get; init; }
    public int? LastLatencyMs { get; init; }
    public string? LastErrorCode { get; init; }
}
```

The WebhookDelivery result.

### `WebhookDeliveryPage` class

```cs
public sealed class WebhookDeliveryPage
{
    public WebhookDeliveryPage();
    public IReadOnlyList<WebhookDelivery> Items { get; init; }
    public bool Complete { get; init; }
    public bool RefreshRequired { get; init; }
    public string? NextCursor { get; init; }
    public string? ObservedAt { get; init; }
    public string? PartialReason { get; init; }
    public string? SourceRevision { get; init; }
}
```

The WebhookDeliveryPage result.

### `WebhookEndpoint` class

```cs
public sealed class WebhookEndpoint
{
    public WebhookEndpoint();
    public string EndpointId { get; init; }
    public string Url { get; init; }
    public IReadOnlyList<string> EventTypes { get; init; }
    public bool Enabled { get; init; }
    public string Status { get; init; }
    public string? DisabledReason { get; init; }
    public string Revision { get; init; }
    public string SecretVersion { get; init; }
    public bool RotationPending { get; init; }
    public string? RotationOverlapUntil { get; init; }
    public int ConsecutiveFailures { get; init; }
    public string? FailingSince { get; init; }
    public string? LastSuccessAt { get; init; }
    public string? LastFailureAt { get; init; }
}
```

The WebhookEndpoint result.

### `WebhookEndpointPage` class

```cs
public sealed class WebhookEndpointPage
{
    public WebhookEndpointPage();
    public IReadOnlyList<WebhookEndpoint> Items { get; init; }
    public bool Complete { get; init; }
    public bool RefreshRequired { get; init; }
    public string? NextCursor { get; init; }
    public string? ObservedAt { get; init; }
    public string? PartialReason { get; init; }
}
```

The WebhookEndpointPage result.

### `WebhookEndpointsReply` class

```cs
public sealed class WebhookEndpointsReply
{
    public WebhookEndpointsReply();
    public string Status { get; init; }
    public string RequestId { get; init; }
    public string? ServerTime { get; init; }
    public string? ReceiptId { get; init; }
    public string? CommittedAt { get; init; }
    public bool? Replayed { get; init; }
    public OperationRef? Operation { get; init; }
    public ResourceRef? ResourceRef { get; init; }
    public WebhookEndpointPage? Result { get; init; }
}
```

The WebhookEndpointsReply result.

### `WebhookEndpointsRequestInput` class

```cs
public sealed class WebhookEndpointsRequestInput
{
    public WebhookEndpointsRequestInput(string projectId);
    public string ProjectId { get; set; }
}
```

The WebhookEndpointsRequestInput input.

## Enums

### `LiveCutoffEvidence` enum

```cs
public enum LiveCutoffEvidence
{
    NativeFence = 0,
    MonotonicBootRetirement = 1,
    NoGrantsIssued = 2,
}
```

The LiveCutoffEvidence enum.

### `LiveCutoffScopeKind` enum

```cs
public enum LiveCutoffScopeKind
{
    Participation = 0,
    Generation = 1,
}
```

The LiveCutoffScopeKind enum.

### `LiveCutoffState` enum

```cs
public enum LiveCutoffState
{
    Pending = 0,
    Enforced = 1,
    Unknown = 2,
}
```

The LiveCutoffState enum.

### `LiveErrorCode` enum

```cs
public enum LiveErrorCode
{
    LiveSessionExists = 0,
    LiveSessionClosed = 1,
    LiveSessionInterrupted = 2,
    LiveSessionCapacity = 3,
    LiveAlertLimit = 4,
    JoinedElsewhere = 5,
    ParticipationDraining = 6,
    ParticipationMismatch = 7,
    GenerationConflict = 8,
    MediaNotReady = 9,
    CredentialRefreshRequired = 10,
    LiveStartCancelled = 11,
    LivePreparationFailed = 12,
}
```

The LiveErrorCode enum.

### `LiveMediaProfile` enum

```cs
public enum LiveMediaProfile
{
    AudioOnly = 0,
    AudioVideo = 1,
}
```

The LiveMediaProfile enum.

### `LiveOperationKind` enum

```cs
public enum LiveOperationKind
{
    Start = 0,
    End = 1,
}
```

The LiveOperationKind enum.

### `LiveOperationState` enum

```cs
public enum LiveOperationState
{
    Running = 0,
    Completed = 1,
    Failed = 2,
}
```

The LiveOperationState enum.

### `LiveParticipationState` enum

```cs
public enum LiveParticipationState
{
    Joined = 0,
    Connecting = 1,
    Connected = 2,
    Disconnected = 3,
    Leaving = 4,
    Left = 5,
}
```

The LiveParticipationState enum.

### `LiveRole` enum

```cs
public enum LiveRole
{
    Publisher = 0,
    Viewer = 1,
}
```

The LiveRole enum.

### `LiveSessionKind` enum

```cs
public enum LiveSessionKind
{
    Interactive = 0,
    Broadcast = 1,
}
```

The LiveSessionKind enum.

### `LiveSessionState` enum

```cs
public enum LiveSessionState
{
    Preparing = 0,
    Ready = 1,
    Active = 2,
    Draining = 3,
    Ended = 4,
    Failed = 5,
}
```

The LiveSessionState enum.
