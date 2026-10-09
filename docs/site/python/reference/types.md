# `convohop.types`

Generated request and response models of the ConvoHop GraphQL API, as frozen dataclasses.

**Layer:** Server. **Runtime:** Python 3.11 or later. **Source:** `python/src/convohop`.

## Classes

### `ActorRef` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ActorRef:
    tenant_id: str
    object_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `AddMemberReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AddMemberReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Member | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AddMemberRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AddMemberRequestInput:
    conversation_id: str
    principal_id: str
    role: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `AddMembersInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AddMembersInput:
    conversation_id: str
    members: Sequence[MemberBatchEntryInput]
    def to_dict(self) -> dict[str, Any]: ...
```

### `AddMembersPayload` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AddMembersPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: ConversationMemberBatch
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentAuditEvent` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentAuditEvent:
    event_id: str
    org_id: str
    grant_id: str | None
    actor_kind: str
    actor_id: str | None
    kind: str
    details: dict[str, Any] | None
    occurred_at: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentAuditEventPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentAuditEventPage:
    items: tuple[AgentAuditEvent, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentAuditEventsReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentAuditEventsReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentAuditEventPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentAuditEventsRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentAuditEventsRequestInput:
    org_id: str
    limit: int | None = None
    cursor: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentCredentialPermitReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentCredentialPermitReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: dict[str, Any] | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentCredentialPermitRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentCredentialPermitRequestInput:
    delivery_id: str
    redemption_request_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentGrant` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentGrant:
    grant_id: str
    org_id: str
    signup_id: str
    agent_actor_id: str
    project_id: str | None
    scopes: tuple[str, ...]
    expires_at: str
    revoked_at: str | None
    created_at: str
    keys: tuple[AgentKey, ...]
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentGrantPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentGrantPage:
    items: tuple[AgentGrant, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentGrantsReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentGrantsReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentGrantPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentGrantsRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentGrantsRequestInput:
    org_id: str
    limit: int | None = None
    cursor: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentKey` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentKey:
    operation_id: str
    state: str
    scopes: tuple[str, ...]
    expires_at: str
    key_id: str | None
    delivery_id: str | None
    delivery_expires_at: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentPayment` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentPayment:
    payment_id: str
    amount: str
    currency: str
    state: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentSignupForApprovalReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentSignupForApprovalReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentSignupReview | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentSignupForApprovalRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentSignupForApprovalRequestInput:
    approval_token: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentSignupReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentSignupReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentSignupStatus | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentSignupReview` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentSignupReview:
    signup_id: str
    owner_email: str
    organization_name: str
    agent_name: str
    purpose: str | None
    suggested_plan: str | None
    suggested_scopes: tuple[str, ...]
    suggested_monthly_spend_cap: str | None
    currency: str
    expires_at: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentSignupStatus` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentSignupStatus:
    signup_id: str
    state: str
    org_id: str | None
    deployment_id: str | None
    project_id: str | None
    next_step: str | None
    scopes: tuple[str, ...]
    grant_expires_at: str | None
    keys: tuple[AgentKey, ...]
    incarnation: str | None
    serving_epoch: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `AgentSignupTicket` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AgentSignupTicket:
    signup_id: str
    confirmation_code: str
    expires_at: str
    poll_after_seconds: int
    def to_dict(self) -> dict[str, Any]: ...
```

### `AlertLiveSessionInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AlertLiveSessionInput:
    live_session_id: str
    expected_generation: str
    principal_ids: Sequence[str]
    def to_dict(self) -> dict[str, Any]: ...
```

### `AlertLiveSessionPayload` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class AlertLiveSessionPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: LiveAlertBatch
    def to_dict(self) -> dict[str, Any]: ...
```

### `ApproveAgentSignupReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ApproveAgentSignupReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentSignupStatus | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ApproveAgentSignupRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ApproveAgentSignupRequestInput:
    approval_token: str
    confirmation_code: str
    terms_ref: str
    plan: str
    scopes: Sequence[str]
    monthly_spend_cap: str
    agent_purchase_limit: str | None = None
    grant_expires_at: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `BillingCheckoutSession` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class BillingCheckoutSession:
    org_id: str
    plan_id: str
    url: str
    expires_at: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `BillingPortalSession` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class BillingPortalSession:
    org_id: str
    url: str
    expires_at: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `BroadcastPermissionChanged` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class BroadcastPermissionChanged:
    member: Member
    media_cutoff: LiveMediaCutoff | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `Capabilities` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Capabilities:
    server_release: str
    capability_revision: str
    limits_revision: str
    features: Features | None
    limits: tuple[LimitEntry, ...]
    environment: str
    production_qualified: bool
    media_policy: MediaPolicy | None
    geo_control_authority_id: str | None
    offerings: tuple[str, ...]
    geos: tuple[str, ...]
    installation_profiles: tuple[str, ...]
    portal_identity: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CapabilitiesReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CapabilitiesReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Capabilities | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ConfigureWebhookReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ConfigureWebhookReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ConfigureWebhookRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ConfigureWebhookRequestInput:
    project_id: str
    url: str
    event_types: Sequence[str]
    consent_ref: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `Conversation` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Conversation:
    conversation_id: str
    revision: str
    title: str
    props: dict[str, Any] | None
    latest_sequence: str
    membership: Member | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ConversationLiveInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationLiveInput:
    conversation_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `ConversationMemberBatch` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMemberBatch:
    items: tuple[Member, ...]
    def to_dict(self) -> dict[str, Any]: ...
```

### `ConversationMute` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMute:
    conversation_id: str
    principal_id: str
    muted: bool
    until: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ConversationMuteInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMuteInput:
    conversation_id: str
    act_as_principal_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ConversationMuteReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMuteReply:
    status: str
    request_id: str
    server_time: str
    result: ConversationMute
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateBillingCheckoutSessionReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateBillingCheckoutSessionReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: BillingCheckoutSession | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateBillingCheckoutSessionRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateBillingCheckoutSessionRequestInput:
    org_id: str
    plan_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateBillingPortalSessionReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateBillingPortalSessionReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: BillingPortalSession | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateBillingPortalSessionRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateBillingPortalSessionRequestInput:
    org_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateConversationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateConversationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Conversation | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateConversationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateConversationRequestInput:
    title: str
    props: Mapping[str, Any]
    members: Sequence[MemberInputInput]
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateDeploymentReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateDeploymentReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateDeploymentRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateDeploymentRequestInput:
    org_id: str
    offering: str
    geo_id: str
    installation_profile_id: str
    consent_ref: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateOrganizationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateOrganizationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Organization | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateOrganizationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateOrganizationRequestInput:
    name: str
    terms_ref: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreatePrincipalReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreatePrincipalReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Principal | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreatePrincipalRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreatePrincipalRequestInput:
    external_user_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateProjectReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateProjectReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CreateProjectRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CreateProjectRequestInput:
    deployment_id: str
    name: str
    environment: str
    backend_principal_name: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CredentialDelivery` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CredentialDelivery:
    delivery_id: str
    kind: str
    project_id: str
    installation_id: str
    resource_ref: ResourceRef | None
    expires_at: str
    payload_digest: str
    recipient_actor_ref: ActorRef | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CredentialDeliveryReceipt` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CredentialDeliveryReceipt:
    delivery_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CredentialPermitReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CredentialPermitReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: dict[str, Any] | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `CredentialPermitRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CredentialPermitRequestInput:
    project_id: str
    delivery_id: str
    redemption_request_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CurrentLiveSessionReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CurrentLiveSessionReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSession | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `Cursor` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Cursor:
    incarnation: str
    conversation_id: str
    sequence: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `CutoffScope` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class CutoffScope:
    kind: str
    principal_id: str | None
    session_id: str | None
    device_id: str | None
    call_id: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeleteMessageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeleteMessageReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Message | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeleteMessageRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeleteMessageRequestInput:
    conversation_id: str
    message_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeliveryAck` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeliveryAck:
    delivery_id: str
    acknowledged: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `Deployment` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Deployment:
    deployment_id: str
    org_id: str
    offering: str
    geo_id: str
    installation_id: str
    resource_owner: str
    approved_regions: tuple[str, ...]
    readiness: str
    revision: str
    consent_ref: str
    environment: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeploymentHealth` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentHealth:
    deployment_id: str
    readiness: str
    observed_at: str
    services: tuple[ServiceObservation, ...]
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeploymentHealthReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentHealthReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: DeploymentHealth | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeploymentHealthRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentHealthRequestInput:
    deployment_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeploymentUsage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentUsage:
    deployment_id: str
    source: str
    observed_at: str
    complete: bool
    reason: str
    from_: str
    to: str
    meters: tuple[UsageMeter, ...]
    aggregated_through: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeploymentUsageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentUsageReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: DeploymentUsage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DeploymentUsageRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentUsageRequestInput:
    deployment_id: str
    from_: str | None = None
    to: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DisablePrincipalReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DisablePrincipalReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Principal | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DisablePrincipalRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DisablePrincipalRequestInput:
    principal_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `DisableWebhookReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DisableWebhookReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `DisableWebhookRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class DisableWebhookRequestInput:
    project_id: str
    endpoint_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `EditMessageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class EditMessageReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Message | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `EditMessageRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class EditMessageRequestInput:
    conversation_id: str
    message_id: str
    expected_revision: str
    text: str | None = None
    props: Mapping[str, Any] | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `EndLiveSessionInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class EndLiveSessionInput:
    live_session_id: str
    expected_generation: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `EndLiveSessionPayload` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class EndLiveSessionPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    operation: OperationRef
    result: LiveSessionEndRequested
    def to_dict(self) -> dict[str, Any]: ...
```

### `Features` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Features:
    chat: bool
    inbox: bool
    lexical_search: bool
    typing: bool
    webhooks: bool
    live_sessions: bool
    live_broadcast: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetConversationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetConversationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Conversation | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetConversationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetConversationRequestInput:
    conversation_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetDeploymentReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetDeploymentReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Deployment | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetDeploymentRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetDeploymentRequestInput:
    deployment_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetMessageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetMessageReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Message | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetMessageRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetMessageRequestInput:
    conversation_id: str
    message_id: str
    act_as_principal_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetOperationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetOperationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Operation | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetOperationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetOperationRequestInput:
    operation_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetOrganizationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetOrganizationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Organization | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetOrganizationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetOrganizationRequestInput:
    org_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetPrincipalReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetPrincipalReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Principal | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetPrincipalRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetPrincipalRequestInput:
    principal_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetProjectReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetProjectReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Project | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `GetProjectRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class GetProjectRequestInput:
    project_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `HistoryGrantReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class HistoryGrantReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Member | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `HistoryGrantRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class HistoryGrantRequestInput:
    conversation_id: str
    principal_id: str
    membership_epoch: str
    expected_revision: str
    from_sequence: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `InboxItem` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class InboxItem:
    conversation_id: str
    title: str
    activity_at: str | None
    visibility_epoch: str
    latest_visible_message: Message | None
    has_unread: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `InboxPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class InboxPage:
    items: tuple[InboxItem, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    partial_reason: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `InboxReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class InboxReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: InboxPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `InboxRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class InboxRequestInput:
    limit: int
    cursor: str | None = None
    act_as_principal_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `IssueAgentKeyReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class IssueAgentKeyReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentKey | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `IssueAgentKeyRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class IssueAgentKeyRequestInput:
    scopes: Sequence[str]
    expires_at: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `IssueBackendKeyReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class IssueBackendKeyReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `IssueBackendKeyRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class IssueBackendKeyRequestInput:
    project_id: str
    name: str
    scopes: Sequence[str]
    expires_at: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `IssueSessionReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class IssueSessionReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: SessionBootstrap | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `IssueSessionRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class IssueSessionRequestInput:
    principal_id: str
    device_id: str
    requested_ttl_ms: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `Limit` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Limit:
    maximum: str | None
    unit: str | None
    scope: str | None
    milliseconds: str | None
    policy_id: str | None
    revision: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LimitEntry` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LimitEntry:
    key: str
    value: Limit
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveAlertBatch` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveAlertBatch:
    live_session_id: str
    created: str
    suppressed: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveCredentialIssuance` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveCredentialIssuance:
    live_session_id: str
    participation_id: str
    generation: str
    lease_id: str
    grant_ordinal: str
    admission_expires_at: str
    lease_expires_at: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveCutoffScope` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveCutoffScope:
    kind: LiveCutoffScopeKind
    live_session_id: str
    generation: str
    participation_id: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveMediaCutoff` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveMediaCutoff:
    state: LiveCutoffState
    scope: LiveCutoffScope
    evidence: LiveCutoffEvidence | None
    enforced_at: str | None
    operation_id: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveMediaPermissions` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveMediaPermissions:
    microphone: bool
    camera: bool
    subscribe: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveOperationFailure` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveOperationFailure:
    code: LiveErrorCode
    message: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveParticipantPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveParticipantPage:
    items: tuple[LiveParticipation, ...]
    next_cursor: str | None
    complete: bool
    partial_reason: str | None
    refresh_required: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveParticipantPageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveParticipantPageReply:
    status: str
    request_id: str
    server_time: str
    result: LiveParticipantPage
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveParticipantsInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveParticipantsInput:
    live_session_id: str
    limit: int | None = None
    cursor: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveParticipation` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveParticipation:
    participation_id: str
    principal_id: str
    membership_epoch: str
    role: LiveRole
    state: LiveParticipationState
    permissions: LiveMediaPermissions
    reservation_expires_at: str | None
    native_connection_id: str | None
    media_cutoff: LiveMediaCutoff | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSession` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSession:
    live_session_id: str
    conversation_id: str
    creator_id: str
    kind: LiveSessionKind
    media_profile: LiveMediaProfile
    state: LiveSessionState
    generation: str
    revision: str
    created_at: str
    expires_at: str
    my_participation: LiveParticipation | None
    media_cutoff: LiveMediaCutoff | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionEndRequested` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionEndRequested:
    live_session_id: str
    operation_id: str
    media_cutoff: LiveMediaCutoff
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionInput:
    live_session_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionJoined` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionJoined:
    live_session_id: str
    generation: str
    participation: LiveParticipation
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionLeft` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionLeft:
    live_session_id: str
    participation_id: str
    media_cutoff: LiveMediaCutoff
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionOperation` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionOperation:
    operation_id: str
    request_id: str
    live_session_id: str
    kind: LiveOperationKind
    state: LiveOperationState
    revision: str
    requested_at: str
    completed_at: str | None
    completion: LiveSessionOperationCompletion | None
    failure: LiveOperationFailure | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionOperationCompletion` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionOperationCompletion:
    live_session_id: str
    generation: str
    state: LiveSessionState
    revision: str
    completed_at: str
    media_cutoff: LiveMediaCutoff | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionOperationInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionOperationInput:
    operation_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionOperationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionOperationReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSessionOperation
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionPage:
    items: tuple[LiveSession, ...]
    next_cursor: str | None
    complete: bool
    partial_reason: str | None
    refresh_required: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionPageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionPageReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSessionPage
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSession
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionStarted` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionStarted:
    live_session_id: str
    conversation_id: str
    kind: LiveSessionKind
    media_profile: LiveMediaProfile
    operation_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `LiveSessionsInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionsInput:
    conversation_id: str
    limit: int | None = None
    cursor: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MediaCutoff` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MediaCutoff:
    state: str
    scope: CutoffScope | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MediaPolicy` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MediaPolicy:
    lease_policy_id: str
    max_lease_ms: str
    renew_attempt_ms: str
    prelude_max_bytes: str
    prelude_timeout_ms: str
    clock_profile_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `Member` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Member:
    conversation_id: str
    principal_id: str
    role: str
    status: str
    membership_epoch: str
    visibility_epoch: str
    revision: str
    visible_from_sequence: str
    can_start_broadcast: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `MemberBatchEntryInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MemberBatchEntryInput:
    principal_id: str
    role: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `MemberInputInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MemberInputInput:
    principal_id: str
    role: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `MemberPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MemberPage:
    items: tuple[Member, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MembersReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MembersReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: MemberPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MembersRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MembersRequestInput:
    conversation_id: str
    limit: int
    cursor: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `Message` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Message:
    message_id: str
    conversation_id: str
    author_id: str
    sequence: str
    revision: str
    revision_sequence: str
    created_at: str
    deleted: bool
    text: str | None
    props: dict[str, Any] | None
    edited_at: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MessageAck` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MessageAck:
    message_id: str
    conversation_id: str
    sequence: str
    revision: str
    status: str
    cursor: Cursor | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MessagePage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MessagePage:
    items: tuple[Message, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MessagesReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MessagesReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: MessagePage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `MessagesRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class MessagesRequestInput:
    conversation_id: str
    limit: int
    before_sequence: str | None = None
    act_as_principal_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `Operation` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Operation:
    operation_id: str
    kind: str
    target_ref: ResourceRef | None
    state: str
    revision: str
    requested_at: str
    updated_at: str
    steps: tuple[OperationStep, ...]
    result: OperationResult | None
    blocked_reason: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OperationRef` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OperationRef:
    operation_id: str
    owner: str
    href: str
    state: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `OperationResult` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OperationResult:
    project_id: str | None
    incarnation: str | None
    status: str | None
    backend: str | None
    environment: str | None
    policy_revision: str | None
    expires_at: str | None
    kind: str | None
    resource_ref: ResourceRef | None
    delivery: CredentialDelivery | None
    key_id: str | None
    endpoint_id: str | None
    enabled: bool | None
    live_session_completion: LiveSessionOperationCompletion | None
    replayed_deliveries: int | None
    skipped_deliveries: int | None
    message_preview: bool | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OperationStep` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OperationStep:
    step_id: str
    state: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `Organization` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Organization:
    org_id: str
    name: str
    status: str
    revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationBilling` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationBilling:
    org_id: str
    plan_id: str | None
    standing: str | None
    grace_until: str | None
    subscription_status: str | None
    current_period_end: str | None
    cancel_at_period_end: bool
    catalog_version: str
    configured: bool
    billed: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationBillingReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationBillingReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OrganizationBilling | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationBillingRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationBillingRequestInput:
    org_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationPage:
    items: tuple[Organization, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationSpend` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationSpend:
    org_id: str
    plan_id: str
    currency: str
    catalog_version: str
    monthly_spend_cap: str | None
    agent_purchase_limit: str | None
    updated_at: str | None
    monthly_minimum: str | None
    period_start: str | None
    period_end: str | None
    credits: str | None
    charges: str | None
    margin: str | None
    stop: str | None
    refused_meters: tuple[str, ...]
    evaluated_at: str | None
    usage_through: str | None
    valid_until: str | None
    minimum_credit: str | None
    charge_limit: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationSpendReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationSpendReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OrganizationSpend | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationSpendRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationSpendRequestInput:
    org_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationUsage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationUsage:
    org_id: str
    source: str
    observed_at: str
    complete: bool
    reason: str
    from_: str
    to: str
    meters: tuple[UsageMeter, ...]
    aggregated_through: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationUsageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationUsageReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OrganizationUsage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationUsageRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationUsageRequestInput:
    org_id: str
    from_: str | None = None
    to: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `OrganizationsReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationsReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OrganizationPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `PauseOperationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class PauseOperationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Operation | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `PauseOperationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class PauseOperationRequestInput:
    operation_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `PolicyChangeInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class PolicyChangeInput:
    kind: str
    reason: str | None = None
    hold_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `Principal` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Principal:
    principal_id: str
    external_user_id: str
    status: str
    revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `Project` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Project:
    project_id: str
    deployment_id: str
    name: str
    environment: str
    incarnation: str
    serving_region: str
    serving_epoch: str
    status: str
    revision: str
    policy_revision: str
    message_preview: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `ProjectPolicyReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ProjectPolicyReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ProjectPolicyRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ProjectPolicyRequestInput:
    project_id: str
    expected_revision: str
    change: PolicyChangeInput
    def to_dict(self) -> dict[str, Any]: ...
```

### `ProjectUsage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ProjectUsage:
    project_id: str
    source: str
    observed_at: str
    complete: bool
    reason: str
    from_: str
    to: str
    meters: tuple[UsageMeter, ...]
    aggregated_through: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ProjectUsageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ProjectUsageReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: ProjectUsage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ProjectUsageRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ProjectUsageRequestInput:
    project_id: str
    from_: str | None = None
    to: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `PurchaseAgentCreditsReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class PurchaseAgentCreditsReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentPayment | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `PurchaseAgentCreditsRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class PurchaseAgentCreditsRequestInput:
    amount: str
    shared_payment_token: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `ReadReceipt` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ReadReceipt:
    principal_id: str
    membership_epoch: str
    visibility_epoch: str
    delivered_through_sequence: str | None
    read_through_sequence: str | None
    updated_at: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RejectAgentSignupReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RejectAgentSignupReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentSignupStatus | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RejectAgentSignupRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RejectAgentSignupRequestInput:
    approval_token: str
    suppress_future_requests: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `RemoveMemberReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RemoveMemberReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Member | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RemoveMemberRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RemoveMemberRequestInput:
    conversation_id: str
    principal_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `RenewSessionReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RenewSessionReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: SessionBootstrap | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RenewSessionRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RenewSessionRequestInput:
    session_id: str
    principal_id: str
    device_id: str
    expected_revision: str
    requested_ttl_ms: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `ReplayWebhookDeliveriesReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ReplayWebhookDeliveriesReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ReplayWebhookDeliveriesRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ReplayWebhookDeliveriesRequestInput:
    project_id: str
    endpoint_id: str
    effect_id: str | None = None
    since: str | None = None
    until: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RequestAgentSignupReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RequestAgentSignupReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentSignupTicket | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RequestAgentSignupRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RequestAgentSignupRequestInput:
    owner_email: str
    poll_challenge: str
    organization_name: str
    agent_name: str
    purpose: str | None = None
    suggested_plan: str | None = None
    suggested_scopes: Sequence[str]
    suggested_monthly_spend_cap: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RequestResolution` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RequestResolution:
    state: str
    request_id: str
    checked_at: str
    result_withheld: bool
    receipt: ResolvedReceipt | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ResolveRequestReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ResolveRequestReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: RequestResolution | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ResolveRequestRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ResolveRequestRequestInput:
    request_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `ResolvedReceipt` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ResolvedReceipt:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: RetainedResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ResourceRef` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ResourceRef:
    kind: str
    id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `ResumeOperationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ResumeOperationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Operation | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ResumeOperationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ResumeOperationRequestInput:
    operation_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `RetainedResult` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RetainedResult:
    agent_grant: AgentGrant | None
    agent_signup_status: AgentSignupStatus | None
    billing_checkout_session: BillingCheckoutSession | None
    billing_portal_session: BillingPortalSession | None
    broadcast_permission_changed: BroadcastPermissionChanged | None
    conversation: Conversation | None
    conversation_member_batch: ConversationMemberBatch | None
    conversation_mute: ConversationMute | None
    credential_delivery_receipt: CredentialDeliveryReceipt | None
    delivery_ack: DeliveryAck | None
    live_alert_batch: LiveAlertBatch | None
    live_credential_issuance: LiveCredentialIssuance | None
    live_session_end_requested: LiveSessionEndRequested | None
    live_session_joined: LiveSessionJoined | None
    live_session_left: LiveSessionLeft | None
    live_session_started: LiveSessionStarted | None
    member: Member | None
    message: Message | None
    message_ack: MessageAck | None
    organization: Organization | None
    organization_spend: OrganizationSpend | None
    principal: Principal | None
    read_receipt: ReadReceipt | None
    session_bootstrap: SessionBootstrap | None
    session_revocation: SessionRevocation | None
    signed_proof: dict[str, Any] | None
    def to_dict(self) -> dict[str, Any]: ...
```

Exactly one typed field contains the retained, currently authorized receipt result.

### `RevokeAgentGrantReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeAgentGrantReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: AgentGrant | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RevokeAgentGrantRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeAgentGrantRequestInput:
    grant_id: str
    revoke_issued_sessions: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `RevokeBackendKeyReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeBackendKeyReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RevokeBackendKeyRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeBackendKeyRequestInput:
    project_id: str
    key_id: str
    expected_revision: str
    revoke_issued_sessions: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `RevokeSessionReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeSessionReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: SessionRevocation | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RevokeSessionRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeSessionRequestInput:
    session_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `RotateWebhookSecretReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RotateWebhookSecretReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `RotateWebhookSecretRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RotateWebhookSecretRequestInput:
    project_id: str
    endpoint_id: str
    expected_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `RouteReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RouteReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: dict[str, Any] | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SearchHit` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SearchHit:
    conversation_id: str
    message: Message | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SearchPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SearchPage:
    items: tuple[SearchHit, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SearchReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SearchReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: SearchPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SearchRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SearchRequestInput:
    query: str
    page_size: int
    scope: SearchScopeInput | None = None
    cursor: str | None = None
    act_as_principal_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SearchScopeInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SearchScopeInput:
    conversation_ids: Sequence[str]
    def to_dict(self) -> dict[str, Any]: ...
```

### `SendMessageReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SendMessageReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: MessageAck | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SendMessageRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SendMessageRequestInput:
    conversation_id: str
    text: str
    props: Mapping[str, Any]
    act_as_principal_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `ServiceDetails` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ServiceDetails:
    status: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `ServiceObservation` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class ServiceObservation:
    role: str
    observed_at: str
    details: ServiceDetails | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `Session` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class Session:
    session_id: str
    principal_id: str
    device_id: str
    incarnation: str
    session_revision: str
    expires_at: str
    status: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `SessionBootstrap` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SessionBootstrap:
    session: Session | None
    token_expires_at: str
    session_token: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `SessionRequestOutcome` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SessionRequestOutcome:
    state: str
    request_id: str
    checked_at: str
    operation: str | None
    receipt_id: str | None
    committed_at: str | None
    original_session: Session | None
    current_session: Session | None
    current_state: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SessionRequestOutcomeReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SessionRequestOutcomeReply:
    status: str
    request_id: str
    server_time: str
    result: SessionRequestOutcome
    def to_dict(self) -> dict[str, Any]: ...
```

### `SessionRequestOutcomeRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SessionRequestOutcomeRequestInput:
    request_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `SessionRevocation` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SessionRevocation:
    session_id: str
    status: str
    media_cutoff: MediaCutoff | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SetBroadcastPermissionInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SetBroadcastPermissionInput:
    conversation_id: str
    principal_id: str
    allowed: bool
    expected_membership_revision: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `SetBroadcastPermissionPayload` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SetBroadcastPermissionPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: BroadcastPermissionChanged
    def to_dict(self) -> dict[str, Any]: ...
```

### `SetConversationMuteInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SetConversationMuteInput:
    conversation_id: str
    muted: bool
    until: str | None = None
    act_as_principal_id: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SetConversationMutePayload` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SetConversationMutePayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: ConversationMute
    def to_dict(self) -> dict[str, Any]: ...
```

### `SetSpendControlsReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SetSpendControlsReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OrganizationSpend | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `SetSpendControlsRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class SetSpendControlsRequestInput:
    org_id: str
    monthly_spend_cap: str
    agent_purchase_limit: str | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `UpdateConversationReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class UpdateConversationReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: Conversation | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `UpdateConversationRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class UpdateConversationRequestInput:
    conversation_id: str
    expected_revision: str
    title: str | None = None
    props: Mapping[str, Any] | None = None
    def to_dict(self) -> dict[str, Any]: ...
```

### `UpdateWebhookReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class UpdateWebhookReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: OperationResult | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `UpdateWebhookRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class UpdateWebhookRequestInput:
    project_id: str
    endpoint_id: str
    expected_revision: str
    event_types: Sequence[str]
    enabled: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `UsageMeter` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class UsageMeter:
    meter: str
    unit: str
    quantity: str
    emitted: bool
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookDeliveriesReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookDeliveriesReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: WebhookDeliveryPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookDeliveriesRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookDeliveriesRequestInput:
    project_id: str
    endpoint_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookDelivery` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookDelivery:
    effect_id: str
    event_id: str
    state: str
    attempts: str
    last_outcome: str | None
    next_attempt_at: str
    event_type: str | None
    created_at: str | None
    replayed_at: str | None
    last_attempt_at: str | None
    last_http_status: int | None
    last_latency_ms: int | None
    last_error_code: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookDeliveryPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookDeliveryPage:
    items: tuple[WebhookDelivery, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    observed_at: str | None
    partial_reason: str | None
    source_revision: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookEndpoint` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpoint:
    endpoint_id: str
    url: str
    event_types: tuple[str, ...]
    enabled: bool
    status: str
    disabled_reason: str | None
    revision: str
    secret_version: str
    rotation_pending: bool
    rotation_overlap_until: str | None
    consecutive_failures: int
    failing_since: str | None
    last_success_at: str | None
    last_failure_at: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookEndpointPage` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpointPage:
    items: tuple[WebhookEndpoint, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    observed_at: str | None
    partial_reason: str | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookEndpointsReply` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpointsReply:
    status: str
    request_id: str
    server_time: str | None
    receipt_id: str | None
    committed_at: str | None
    replayed: bool | None
    operation: OperationRef | None
    resource_ref: ResourceRef | None
    result: WebhookEndpointPage | None
    def to_dict(self) -> dict[str, Any]: ...
```

### `WebhookEndpointsRequestInput` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpointsRequestInput:
    project_id: str
    def to_dict(self) -> dict[str, Any]: ...
```

## Types

### `LiveCutoffEvidence` type

```python
LiveCutoffEvidence: TypeAlias = Literal[
    "NATIVE_FENCE",
    "MONOTONIC_BOOT_RETIREMENT",
    "NO_GRANTS_ISSUED",
]
```

### `LiveCutoffScopeKind` type

```python
LiveCutoffScopeKind: TypeAlias = Literal[
    "PARTICIPATION",
    "GENERATION",
]
```

### `LiveCutoffState` type

```python
LiveCutoffState: TypeAlias = Literal[
    "PENDING",
    "ENFORCED",
    "UNKNOWN",
]
```

### `LiveErrorCode` type

```python
LiveErrorCode: TypeAlias = Literal[
    "LIVE_SESSION_EXISTS",
    "LIVE_SESSION_CLOSED",
    "LIVE_SESSION_INTERRUPTED",
    "LIVE_SESSION_CAPACITY",
    "LIVE_ALERT_LIMIT",
    "JOINED_ELSEWHERE",
    "PARTICIPATION_DRAINING",
    "PARTICIPATION_MISMATCH",
    "GENERATION_CONFLICT",
    "MEDIA_NOT_READY",
    "CREDENTIAL_REFRESH_REQUIRED",
    "LIVE_START_CANCELLED",
    "LIVE_PREPARATION_FAILED",
]
```

### `LiveMediaProfile` type

```python
LiveMediaProfile: TypeAlias = Literal[
    "AUDIO_ONLY",
    "AUDIO_VIDEO",
]
```

### `LiveOperationKind` type

```python
LiveOperationKind: TypeAlias = Literal[
    "START",
    "END",
]
```

### `LiveOperationState` type

```python
LiveOperationState: TypeAlias = Literal[
    "RUNNING",
    "COMPLETED",
    "FAILED",
]
```

### `LiveParticipationState` type

```python
LiveParticipationState: TypeAlias = Literal[
    "JOINED",
    "CONNECTING",
    "CONNECTED",
    "DISCONNECTED",
    "LEAVING",
    "LEFT",
]
```

### `LiveRole` type

```python
LiveRole: TypeAlias = Literal[
    "PUBLISHER",
    "VIEWER",
]
```

### `LiveSessionKind` type

```python
LiveSessionKind: TypeAlias = Literal[
    "INTERACTIVE",
    "BROADCAST",
]
```

### `LiveSessionState` type

```python
LiveSessionState: TypeAlias = Literal[
    "PREPARING",
    "READY",
    "ACTIVE",
    "DRAINING",
    "ENDED",
    "FAILED",
]
```
