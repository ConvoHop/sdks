"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

Models for the operations the server SDK calls. Enums are string literals. Output objects are frozen
dataclasses built from validated responses. Input objects are frozen dataclasses; fields left as None are omitted.
"""

from __future__ import annotations

import dataclasses as _dc
from collections.abc import Mapping, Sequence
from typing import Any, Literal, TypeAlias


__all__ = [
    "ActorRef",
    "AddMemberReply",
    "AddMemberRequestInput",
    "AddMembersInput",
    "AddMembersPayload",
    "AlertLiveSessionInput",
    "AlertLiveSessionPayload",
    "BillingCheckoutSession",
    "BillingPortalSession",
    "BroadcastPermissionChanged",
    "Capabilities",
    "CapabilitiesReply",
    "Conversation",
    "ConversationLiveInput",
    "ConversationMemberBatch",
    "ConversationMute",
    "ConversationMuteInput",
    "ConversationMuteReply",
    "CreateConversationReply",
    "CreateConversationRequestInput",
    "CreatePrincipalReply",
    "CreatePrincipalRequestInput",
    "CredentialDelivery",
    "CredentialDeliveryReceipt",
    "CurrentLiveSessionReply",
    "Cursor",
    "CutoffScope",
    "DeleteMessageReply",
    "DeleteMessageRequestInput",
    "DeliveryAck",
    "Deployment",
    "DeploymentHealth",
    "DeploymentUsage",
    "DisablePrincipalReply",
    "DisablePrincipalRequestInput",
    "EditMessageReply",
    "EditMessageRequestInput",
    "EndLiveSessionInput",
    "EndLiveSessionPayload",
    "Features",
    "GetConversationReply",
    "GetConversationRequestInput",
    "GetMessageReply",
    "GetMessageRequestInput",
    "GetOperationReply",
    "GetOperationRequestInput",
    "GetPrincipalReply",
    "GetPrincipalRequestInput",
    "HistoryGrantReply",
    "HistoryGrantRequestInput",
    "InboxItem",
    "InboxPage",
    "InboxReply",
    "InboxRequestInput",
    "IssueSessionReply",
    "IssueSessionRequestInput",
    "Limit",
    "LimitEntry",
    "LiveAlertBatch",
    "LiveCredentialIssuance",
    "LiveCutoffEvidence",
    "LiveCutoffScope",
    "LiveCutoffScopeKind",
    "LiveCutoffState",
    "LiveErrorCode",
    "LiveMediaCutoff",
    "LiveMediaPermissions",
    "LiveMediaProfile",
    "LiveOperationFailure",
    "LiveOperationKind",
    "LiveOperationState",
    "LiveParticipantPage",
    "LiveParticipantPageReply",
    "LiveParticipantsInput",
    "LiveParticipation",
    "LiveParticipationState",
    "LiveRole",
    "LiveSession",
    "LiveSessionEndRequested",
    "LiveSessionInput",
    "LiveSessionJoined",
    "LiveSessionKind",
    "LiveSessionLeft",
    "LiveSessionOperation",
    "LiveSessionOperationCompletion",
    "LiveSessionOperationInput",
    "LiveSessionOperationReply",
    "LiveSessionPage",
    "LiveSessionPageReply",
    "LiveSessionReply",
    "LiveSessionStarted",
    "LiveSessionState",
    "LiveSessionsInput",
    "MediaCutoff",
    "MediaPolicy",
    "Member",
    "MemberBatchEntryInput",
    "MemberInputInput",
    "MemberPage",
    "MembersReply",
    "MembersRequestInput",
    "Message",
    "MessageAck",
    "MessagePage",
    "MessagesReply",
    "MessagesRequestInput",
    "Operation",
    "OperationRef",
    "OperationResult",
    "OperationStep",
    "Organization",
    "OrganizationBilling",
    "OrganizationPage",
    "OrganizationUsage",
    "PolicyChangeInput",
    "Principal",
    "Project",
    "ProjectUsage",
    "ReadReceipt",
    "RemoveMemberReply",
    "RemoveMemberRequestInput",
    "RenewSessionReply",
    "RenewSessionRequestInput",
    "RequestResolution",
    "ResolveRequestReply",
    "ResolveRequestRequestInput",
    "ResolvedReceipt",
    "ResourceRef",
    "RetainedResult",
    "RevokeSessionReply",
    "RevokeSessionRequestInput",
    "RouteReply",
    "SearchHit",
    "SearchPage",
    "SearchReply",
    "SearchRequestInput",
    "SearchScopeInput",
    "SendMessageReply",
    "SendMessageRequestInput",
    "ServiceDetails",
    "ServiceObservation",
    "Session",
    "SessionBootstrap",
    "SessionRequestOutcome",
    "SessionRequestOutcomeReply",
    "SessionRequestOutcomeRequestInput",
    "SessionRevocation",
    "SetBroadcastPermissionInput",
    "SetBroadcastPermissionPayload",
    "SetConversationMuteInput",
    "SetConversationMutePayload",
    "UpdateConversationReply",
    "UpdateConversationRequestInput",
    "UsageMeter",
    "WebhookDelivery",
    "WebhookDeliveryPage",
    "WebhookEndpoint",
    "WebhookEndpointPage",
    "ConfigureWebhookReply",
    "ConfigureWebhookRequestInput",
    "CreateBillingCheckoutSessionReply",
    "CreateBillingCheckoutSessionRequestInput",
    "CreateBillingPortalSessionReply",
    "CreateBillingPortalSessionRequestInput",
    "CreateDeploymentReply",
    "CreateDeploymentRequestInput",
    "CreateOrganizationReply",
    "CreateOrganizationRequestInput",
    "CreateProjectReply",
    "CreateProjectRequestInput",
    "CredentialPermitReply",
    "CredentialPermitRequestInput",
    "DeploymentHealthReply",
    "DeploymentHealthRequestInput",
    "DeploymentUsageReply",
    "DeploymentUsageRequestInput",
    "DisableWebhookReply",
    "DisableWebhookRequestInput",
    "GetDeploymentReply",
    "GetDeploymentRequestInput",
    "GetOrganizationReply",
    "GetOrganizationRequestInput",
    "GetProjectReply",
    "GetProjectRequestInput",
    "IssueBackendKeyReply",
    "IssueBackendKeyRequestInput",
    "OrganizationBillingReply",
    "OrganizationBillingRequestInput",
    "OrganizationUsageReply",
    "OrganizationUsageRequestInput",
    "OrganizationsReply",
    "PauseOperationReply",
    "PauseOperationRequestInput",
    "ProjectPolicyReply",
    "ProjectPolicyRequestInput",
    "ProjectUsageReply",
    "ProjectUsageRequestInput",
    "ReplayWebhookDeliveriesReply",
    "ReplayWebhookDeliveriesRequestInput",
    "ResumeOperationReply",
    "ResumeOperationRequestInput",
    "RevokeBackendKeyReply",
    "RevokeBackendKeyRequestInput",
    "RotateWebhookSecretReply",
    "RotateWebhookSecretRequestInput",
    "UpdateWebhookReply",
    "UpdateWebhookRequestInput",
    "WebhookDeliveriesReply",
    "WebhookDeliveriesRequestInput",
    "WebhookEndpointsReply",
    "WebhookEndpointsRequestInput",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ActorRef:
    tenant_id: str
    object_id: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ActorRef:
        return cls(
            tenant_id=data["tenantId"],
            object_id=data["objectId"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "tenantId": self.tenant_id,
            "objectId": self.object_id,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> AddMemberReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Member._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class AddMemberRequestInput:
    conversation_id: str
    principal_id: str
    role: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "principalId": self.principal_id,
            "role": self.role,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class AddMembersInput:
    conversation_id: str
    members: Sequence[MemberBatchEntryInput]

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "members": [item1.to_dict() for item1 in self.members],
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class AddMembersPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: ConversationMemberBatch

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> AddMembersPayload:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            result=ConversationMemberBatch._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class AlertLiveSessionInput:
    live_session_id: str
    expected_generation: str
    principal_ids: Sequence[str]

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "liveSessionId": self.live_session_id,
            "expectedGeneration": self.expected_generation,
            "principalIds": self.principal_ids,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class AlertLiveSessionPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: LiveAlertBatch

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> AlertLiveSessionPayload:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            result=LiveAlertBatch._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class BillingCheckoutSession:
    org_id: str
    plan_id: str
    url: str
    expires_at: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> BillingCheckoutSession:
        return cls(
            org_id=data["orgId"],
            plan_id=data["planId"],
            url=data["url"],
            expires_at=data["expiresAt"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "orgId": self.org_id,
            "planId": self.plan_id,
            "url": self.url,
            "expiresAt": self.expires_at,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class BillingPortalSession:
    org_id: str
    url: str
    expires_at: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> BillingPortalSession:
        return cls(
            org_id=data["orgId"],
            url=data["url"],
            expires_at=data["expiresAt"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "orgId": self.org_id,
            "url": self.url,
            "expiresAt": self.expires_at,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class BroadcastPermissionChanged:
    member: Member
    media_cutoff: LiveMediaCutoff | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> BroadcastPermissionChanged:
        return cls(
            member=Member._from_wire(data["member"]),
            media_cutoff=None if data["mediaCutoff"] is None else LiveMediaCutoff._from_wire(data["mediaCutoff"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "member": self.member.to_dict(),
            "mediaCutoff": None if self.media_cutoff is None else self.media_cutoff.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Capabilities:
        return cls(
            server_release=data["serverRelease"],
            capability_revision=data["capabilityRevision"],
            limits_revision=data["limitsRevision"],
            features=None if data["features"] is None else Features._from_wire(data["features"]),
            limits=tuple(LimitEntry._from_wire(item1) for item1 in data["limits"]),
            environment=data["environment"],
            production_qualified=data["productionQualified"],
            media_policy=None if data["mediaPolicy"] is None else MediaPolicy._from_wire(data["mediaPolicy"]),
            geo_control_authority_id=data["geoControlAuthorityId"],
            offerings=tuple(data["offerings"]),
            geos=tuple(data["geos"]),
            installation_profiles=tuple(data["installationProfiles"]),
            portal_identity=data["portalIdentity"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "serverRelease": self.server_release,
            "capabilityRevision": self.capability_revision,
            "limitsRevision": self.limits_revision,
            "features": None if self.features is None else self.features.to_dict(),
            "limits": [item1.to_dict() for item1 in self.limits],
            "environment": self.environment,
            "productionQualified": self.production_qualified,
            "mediaPolicy": None if self.media_policy is None else self.media_policy.to_dict(),
            "geoControlAuthorityId": self.geo_control_authority_id,
            "offerings": list(self.offerings),
            "geos": list(self.geos),
            "installationProfiles": list(self.installation_profiles),
            "portalIdentity": self.portal_identity,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CapabilitiesReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Capabilities._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Conversation:
    conversation_id: str
    revision: str
    title: str
    props: dict[str, Any] | None
    latest_sequence: str
    membership: Member | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Conversation:
        return cls(
            conversation_id=data["conversationId"],
            revision=data["revision"],
            title=data["title"],
            props=data["props"],
            latest_sequence=data["latestSequence"],
            membership=None if data["membership"] is None else Member._from_wire(data["membership"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "conversationId": self.conversation_id,
            "revision": self.revision,
            "title": self.title,
            "props": self.props,
            "latestSequence": self.latest_sequence,
            "membership": None if self.membership is None else self.membership.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationLiveInput:
    conversation_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMemberBatch:
    items: tuple[Member, ...]

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ConversationMemberBatch:
        return cls(
            items=tuple(Member._from_wire(item1) for item1 in data["items"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMute:
    conversation_id: str
    principal_id: str
    muted: bool
    until: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ConversationMute:
        return cls(
            conversation_id=data["conversationId"],
            principal_id=data["principalId"],
            muted=data["muted"],
            until=data["until"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "conversationId": self.conversation_id,
            "principalId": self.principal_id,
            "muted": self.muted,
            "until": self.until,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMuteInput:
    conversation_id: str
    act_as_principal_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
        }
        if self.act_as_principal_id is not None:
            data["actAsPrincipalId"] = self.act_as_principal_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ConversationMuteReply:
    status: str
    request_id: str
    server_time: str
    result: ConversationMute

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ConversationMuteReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            result=ConversationMute._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CreateConversationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Conversation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreateConversationRequestInput:
    title: str
    props: Mapping[str, Any]
    members: Sequence[MemberInputInput]

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "title": self.title,
            "props": self.props,
            "members": [item1.to_dict() for item1 in self.members],
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CreatePrincipalReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Principal._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreatePrincipalRequestInput:
    external_user_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "externalUserId": self.external_user_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CredentialDelivery:
    delivery_id: str
    kind: str
    project_id: str
    installation_id: str
    resource_ref: ResourceRef | None
    expires_at: str
    payload_digest: str
    recipient_actor_ref: ActorRef | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CredentialDelivery:
        return cls(
            delivery_id=data["deliveryId"],
            kind=data["kind"],
            project_id=data["projectId"],
            installation_id=data["installationId"],
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            expires_at=data["expiresAt"],
            payload_digest=data["payloadDigest"],
            recipient_actor_ref=None if data["recipientActorRef"] is None else ActorRef._from_wire(data["recipientActorRef"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "deliveryId": self.delivery_id,
            "kind": self.kind,
            "projectId": self.project_id,
            "installationId": self.installation_id,
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "expiresAt": self.expires_at,
            "payloadDigest": self.payload_digest,
            "recipientActorRef": None if self.recipient_actor_ref is None else self.recipient_actor_ref.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CredentialDeliveryReceipt:
    delivery_id: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CredentialDeliveryReceipt:
        return cls(
            delivery_id=data["deliveryId"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "deliveryId": self.delivery_id,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CurrentLiveSessionReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSession | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CurrentLiveSessionReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            result=None if data["result"] is None else LiveSession._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Cursor:
    incarnation: str
    conversation_id: str
    sequence: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Cursor:
        return cls(
            incarnation=data["incarnation"],
            conversation_id=data["conversationId"],
            sequence=data["sequence"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "incarnation": self.incarnation,
            "conversationId": self.conversation_id,
            "sequence": self.sequence,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CutoffScope:
    kind: str
    principal_id: str | None
    session_id: str | None
    device_id: str | None
    call_id: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CutoffScope:
        return cls(
            kind=data["kind"],
            principal_id=data["principalId"],
            session_id=data["sessionId"],
            device_id=data["deviceId"],
            call_id=data["callId"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "kind": self.kind,
            "principalId": self.principal_id,
            "sessionId": self.session_id,
            "deviceId": self.device_id,
            "callId": self.call_id,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DeleteMessageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Message._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class DeleteMessageRequestInput:
    conversation_id: str
    message_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "messageId": self.message_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class DeliveryAck:
    delivery_id: str
    acknowledged: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DeliveryAck:
        return cls(
            delivery_id=data["deliveryId"],
            acknowledged=data["acknowledged"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "deliveryId": self.delivery_id,
            "acknowledged": self.acknowledged,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Deployment:
        return cls(
            deployment_id=data["deploymentId"],
            org_id=data["orgId"],
            offering=data["offering"],
            geo_id=data["geoId"],
            installation_id=data["installationId"],
            resource_owner=data["resourceOwner"],
            approved_regions=tuple(data["approvedRegions"]),
            readiness=data["readiness"],
            revision=data["revision"],
            consent_ref=data["consentRef"],
            environment=data["environment"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "deploymentId": self.deployment_id,
            "orgId": self.org_id,
            "offering": self.offering,
            "geoId": self.geo_id,
            "installationId": self.installation_id,
            "resourceOwner": self.resource_owner,
            "approvedRegions": list(self.approved_regions),
            "readiness": self.readiness,
            "revision": self.revision,
            "consentRef": self.consent_ref,
            "environment": self.environment,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentHealth:
    deployment_id: str
    readiness: str
    observed_at: str
    services: tuple[ServiceObservation, ...]

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DeploymentHealth:
        return cls(
            deployment_id=data["deploymentId"],
            readiness=data["readiness"],
            observed_at=data["observedAt"],
            services=tuple(ServiceObservation._from_wire(item1) for item1 in data["services"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "deploymentId": self.deployment_id,
            "readiness": self.readiness,
            "observedAt": self.observed_at,
            "services": [item1.to_dict() for item1 in self.services],
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DeploymentUsage:
        return cls(
            deployment_id=data["deploymentId"],
            source=data["source"],
            observed_at=data["observedAt"],
            complete=data["complete"],
            reason=data["reason"],
            from_=data["from"],
            to=data["to"],
            meters=tuple(UsageMeter._from_wire(item1) for item1 in data["meters"]),
            aggregated_through=data["aggregatedThrough"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "deploymentId": self.deployment_id,
            "source": self.source,
            "observedAt": self.observed_at,
            "complete": self.complete,
            "reason": self.reason,
            "from": self.from_,
            "to": self.to,
            "meters": [item1.to_dict() for item1 in self.meters],
            "aggregatedThrough": self.aggregated_through,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DisablePrincipalReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Principal._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class DisablePrincipalRequestInput:
    principal_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "principalId": self.principal_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> EditMessageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Message._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class EditMessageRequestInput:
    conversation_id: str
    message_id: str
    expected_revision: str
    text: str | None = None
    props: Mapping[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "messageId": self.message_id,
            "expectedRevision": self.expected_revision,
        }
        if self.text is not None:
            data["text"] = self.text
        if self.props is not None:
            data["props"] = self.props
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class EndLiveSessionInput:
    live_session_id: str
    expected_generation: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "liveSessionId": self.live_session_id,
            "expectedGeneration": self.expected_generation,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class EndLiveSessionPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    operation: OperationRef
    result: LiveSessionEndRequested

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> EndLiveSessionPayload:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=OperationRef._from_wire(data["operation"]),
            result=LiveSessionEndRequested._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": self.operation.to_dict(),
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Features:
    chat: bool
    inbox: bool
    lexical_search: bool
    typing: bool
    webhooks: bool
    live_sessions: bool
    live_broadcast: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Features:
        return cls(
            chat=data["chat"],
            inbox=data["inbox"],
            lexical_search=data["lexicalSearch"],
            typing=data["typing"],
            webhooks=data["webhooks"],
            live_sessions=data["liveSessions"],
            live_broadcast=data["liveBroadcast"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "chat": self.chat,
            "inbox": self.inbox,
            "lexicalSearch": self.lexical_search,
            "typing": self.typing,
            "webhooks": self.webhooks,
            "liveSessions": self.live_sessions,
            "liveBroadcast": self.live_broadcast,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> GetConversationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Conversation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class GetConversationRequestInput:
    conversation_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> GetMessageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Message._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class GetMessageRequestInput:
    conversation_id: str
    message_id: str
    act_as_principal_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "messageId": self.message_id,
        }
        if self.act_as_principal_id is not None:
            data["actAsPrincipalId"] = self.act_as_principal_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> GetOperationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Operation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class GetOperationRequestInput:
    operation_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "operationId": self.operation_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> GetPrincipalReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Principal._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class GetPrincipalRequestInput:
    principal_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "principalId": self.principal_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> HistoryGrantReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Member._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class HistoryGrantRequestInput:
    conversation_id: str
    principal_id: str
    membership_epoch: str
    expected_revision: str
    from_sequence: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "principalId": self.principal_id,
            "membershipEpoch": self.membership_epoch,
            "expectedRevision": self.expected_revision,
            "fromSequence": self.from_sequence,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class InboxItem:
    conversation_id: str
    title: str
    activity_at: str | None
    visibility_epoch: str
    latest_visible_message: Message | None
    has_unread: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> InboxItem:
        return cls(
            conversation_id=data["conversationId"],
            title=data["title"],
            activity_at=data["activityAt"],
            visibility_epoch=data["visibilityEpoch"],
            latest_visible_message=None if data["latestVisibleMessage"] is None else Message._from_wire(data["latestVisibleMessage"]),
            has_unread=data["hasUnread"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "conversationId": self.conversation_id,
            "title": self.title,
            "activityAt": self.activity_at,
            "visibilityEpoch": self.visibility_epoch,
            "latestVisibleMessage": None if self.latest_visible_message is None else self.latest_visible_message.to_dict(),
            "hasUnread": self.has_unread,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class InboxPage:
    items: tuple[InboxItem, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    partial_reason: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> InboxPage:
        return cls(
            items=tuple(InboxItem._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
            partial_reason=data["partialReason"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
            "partialReason": self.partial_reason,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> InboxReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else InboxPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class InboxRequestInput:
    limit: int
    cursor: str | None = None
    act_as_principal_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "limit": self.limit,
        }
        if self.cursor is not None:
            data["cursor"] = self.cursor
        if self.act_as_principal_id is not None:
            data["actAsPrincipalId"] = self.act_as_principal_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> IssueSessionReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else SessionBootstrap._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class IssueSessionRequestInput:
    principal_id: str
    device_id: str
    requested_ttl_ms: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "principalId": self.principal_id,
            "deviceId": self.device_id,
            "requestedTtlMs": self.requested_ttl_ms,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Limit:
    maximum: str | None
    unit: str | None
    scope: str | None
    milliseconds: str | None
    policy_id: str | None
    revision: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Limit:
        return cls(
            maximum=data["maximum"],
            unit=data["unit"],
            scope=data["scope"],
            milliseconds=data["milliseconds"],
            policy_id=data["policyId"],
            revision=data["revision"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "maximum": self.maximum,
            "unit": self.unit,
            "scope": self.scope,
            "milliseconds": self.milliseconds,
            "policyId": self.policy_id,
            "revision": self.revision,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LimitEntry:
    key: str
    value: Limit

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LimitEntry:
        return cls(
            key=data["key"],
            value=Limit._from_wire(data["value"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "key": self.key,
            "value": self.value.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveAlertBatch:
    live_session_id: str
    created: str
    suppressed: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveAlertBatch:
        return cls(
            live_session_id=data["liveSessionId"],
            created=data["created"],
            suppressed=data["suppressed"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "created": self.created,
            "suppressed": self.suppressed,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveCredentialIssuance:
    live_session_id: str
    participation_id: str
    generation: str
    lease_id: str
    grant_ordinal: str
    admission_expires_at: str
    lease_expires_at: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveCredentialIssuance:
        return cls(
            live_session_id=data["liveSessionId"],
            participation_id=data["participationId"],
            generation=data["generation"],
            lease_id=data["leaseId"],
            grant_ordinal=data["grantOrdinal"],
            admission_expires_at=data["admissionExpiresAt"],
            lease_expires_at=data["leaseExpiresAt"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "participationId": self.participation_id,
            "generation": self.generation,
            "leaseId": self.lease_id,
            "grantOrdinal": self.grant_ordinal,
            "admissionExpiresAt": self.admission_expires_at,
            "leaseExpiresAt": self.lease_expires_at,
        }


LiveCutoffEvidence: TypeAlias = Literal[
    "NATIVE_FENCE",
    "MONOTONIC_BOOT_RETIREMENT",
    "NO_GRANTS_ISSUED",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveCutoffScope:
    kind: LiveCutoffScopeKind
    live_session_id: str
    generation: str
    participation_id: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveCutoffScope:
        return cls(
            kind=data["kind"],
            live_session_id=data["liveSessionId"],
            generation=data["generation"],
            participation_id=data["participationId"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "kind": self.kind,
            "liveSessionId": self.live_session_id,
            "generation": self.generation,
            "participationId": self.participation_id,
        }


LiveCutoffScopeKind: TypeAlias = Literal[
    "PARTICIPATION",
    "GENERATION",
]


LiveCutoffState: TypeAlias = Literal[
    "PENDING",
    "ENFORCED",
    "UNKNOWN",
]


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


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveMediaCutoff:
    state: LiveCutoffState
    scope: LiveCutoffScope
    evidence: LiveCutoffEvidence | None
    enforced_at: str | None
    operation_id: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveMediaCutoff:
        return cls(
            state=data["state"],
            scope=LiveCutoffScope._from_wire(data["scope"]),
            evidence=data["evidence"],
            enforced_at=data["enforcedAt"],
            operation_id=data["operationId"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "state": self.state,
            "scope": self.scope.to_dict(),
            "evidence": self.evidence,
            "enforcedAt": self.enforced_at,
            "operationId": self.operation_id,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveMediaPermissions:
    microphone: bool
    camera: bool
    subscribe: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveMediaPermissions:
        return cls(
            microphone=data["microphone"],
            camera=data["camera"],
            subscribe=data["subscribe"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "microphone": self.microphone,
            "camera": self.camera,
            "subscribe": self.subscribe,
        }


LiveMediaProfile: TypeAlias = Literal[
    "AUDIO_ONLY",
    "AUDIO_VIDEO",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveOperationFailure:
    code: LiveErrorCode
    message: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveOperationFailure:
        return cls(
            code=data["code"],
            message=data["message"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "code": self.code,
            "message": self.message,
        }


LiveOperationKind: TypeAlias = Literal[
    "START",
    "END",
]


LiveOperationState: TypeAlias = Literal[
    "RUNNING",
    "COMPLETED",
    "FAILED",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveParticipantPage:
    items: tuple[LiveParticipation, ...]
    next_cursor: str | None
    complete: bool
    partial_reason: str | None
    refresh_required: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveParticipantPage:
        return cls(
            items=tuple(LiveParticipation._from_wire(item1) for item1 in data["items"]),
            next_cursor=data["nextCursor"],
            complete=data["complete"],
            partial_reason=data["partialReason"],
            refresh_required=data["refreshRequired"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "nextCursor": self.next_cursor,
            "complete": self.complete,
            "partialReason": self.partial_reason,
            "refreshRequired": self.refresh_required,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveParticipantPageReply:
    status: str
    request_id: str
    server_time: str
    result: LiveParticipantPage

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveParticipantPageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            result=LiveParticipantPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveParticipantsInput:
    live_session_id: str
    limit: int | None = None
    """Defaults to ``50`` on the server."""
    cursor: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "liveSessionId": self.live_session_id,
        }
        if self.limit is not None:
            data["limit"] = self.limit
        if self.cursor is not None:
            data["cursor"] = self.cursor
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveParticipation:
        return cls(
            participation_id=data["participationId"],
            principal_id=data["principalId"],
            membership_epoch=data["membershipEpoch"],
            role=data["role"],
            state=data["state"],
            permissions=LiveMediaPermissions._from_wire(data["permissions"]),
            reservation_expires_at=data["reservationExpiresAt"],
            native_connection_id=data["nativeConnectionId"],
            media_cutoff=None if data["mediaCutoff"] is None else LiveMediaCutoff._from_wire(data["mediaCutoff"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "participationId": self.participation_id,
            "principalId": self.principal_id,
            "membershipEpoch": self.membership_epoch,
            "role": self.role,
            "state": self.state,
            "permissions": self.permissions.to_dict(),
            "reservationExpiresAt": self.reservation_expires_at,
            "nativeConnectionId": self.native_connection_id,
            "mediaCutoff": None if self.media_cutoff is None else self.media_cutoff.to_dict(),
        }


LiveParticipationState: TypeAlias = Literal[
    "JOINED",
    "CONNECTING",
    "CONNECTED",
    "DISCONNECTED",
    "LEAVING",
    "LEFT",
]


LiveRole: TypeAlias = Literal[
    "PUBLISHER",
    "VIEWER",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSession:
        return cls(
            live_session_id=data["liveSessionId"],
            conversation_id=data["conversationId"],
            creator_id=data["creatorId"],
            kind=data["kind"],
            media_profile=data["mediaProfile"],
            state=data["state"],
            generation=data["generation"],
            revision=data["revision"],
            created_at=data["createdAt"],
            expires_at=data["expiresAt"],
            my_participation=None if data["myParticipation"] is None else LiveParticipation._from_wire(data["myParticipation"]),
            media_cutoff=None if data["mediaCutoff"] is None else LiveMediaCutoff._from_wire(data["mediaCutoff"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "conversationId": self.conversation_id,
            "creatorId": self.creator_id,
            "kind": self.kind,
            "mediaProfile": self.media_profile,
            "state": self.state,
            "generation": self.generation,
            "revision": self.revision,
            "createdAt": self.created_at,
            "expiresAt": self.expires_at,
            "myParticipation": None if self.my_participation is None else self.my_participation.to_dict(),
            "mediaCutoff": None if self.media_cutoff is None else self.media_cutoff.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionEndRequested:
    live_session_id: str
    operation_id: str
    media_cutoff: LiveMediaCutoff

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionEndRequested:
        return cls(
            live_session_id=data["liveSessionId"],
            operation_id=data["operationId"],
            media_cutoff=LiveMediaCutoff._from_wire(data["mediaCutoff"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "operationId": self.operation_id,
            "mediaCutoff": self.media_cutoff.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionInput:
    live_session_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "liveSessionId": self.live_session_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionJoined:
    live_session_id: str
    generation: str
    participation: LiveParticipation

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionJoined:
        return cls(
            live_session_id=data["liveSessionId"],
            generation=data["generation"],
            participation=LiveParticipation._from_wire(data["participation"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "generation": self.generation,
            "participation": self.participation.to_dict(),
        }


LiveSessionKind: TypeAlias = Literal[
    "INTERACTIVE",
    "BROADCAST",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionLeft:
    live_session_id: str
    participation_id: str
    media_cutoff: LiveMediaCutoff

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionLeft:
        return cls(
            live_session_id=data["liveSessionId"],
            participation_id=data["participationId"],
            media_cutoff=LiveMediaCutoff._from_wire(data["mediaCutoff"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "participationId": self.participation_id,
            "mediaCutoff": self.media_cutoff.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionOperation:
        return cls(
            operation_id=data["operationId"],
            request_id=data["requestId"],
            live_session_id=data["liveSessionId"],
            kind=data["kind"],
            state=data["state"],
            revision=data["revision"],
            requested_at=data["requestedAt"],
            completed_at=data["completedAt"],
            completion=None if data["completion"] is None else LiveSessionOperationCompletion._from_wire(data["completion"]),
            failure=None if data["failure"] is None else LiveOperationFailure._from_wire(data["failure"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "operationId": self.operation_id,
            "requestId": self.request_id,
            "liveSessionId": self.live_session_id,
            "kind": self.kind,
            "state": self.state,
            "revision": self.revision,
            "requestedAt": self.requested_at,
            "completedAt": self.completed_at,
            "completion": None if self.completion is None else self.completion.to_dict(),
            "failure": None if self.failure is None else self.failure.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionOperationCompletion:
    live_session_id: str
    generation: str
    state: LiveSessionState
    revision: str
    completed_at: str
    media_cutoff: LiveMediaCutoff | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionOperationCompletion:
        return cls(
            live_session_id=data["liveSessionId"],
            generation=data["generation"],
            state=data["state"],
            revision=data["revision"],
            completed_at=data["completedAt"],
            media_cutoff=None if data["mediaCutoff"] is None else LiveMediaCutoff._from_wire(data["mediaCutoff"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "generation": self.generation,
            "state": self.state,
            "revision": self.revision,
            "completedAt": self.completed_at,
            "mediaCutoff": None if self.media_cutoff is None else self.media_cutoff.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionOperationInput:
    operation_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "operationId": self.operation_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionOperationReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSessionOperation

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionOperationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            result=LiveSessionOperation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionPage:
    items: tuple[LiveSession, ...]
    next_cursor: str | None
    complete: bool
    partial_reason: str | None
    refresh_required: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionPage:
        return cls(
            items=tuple(LiveSession._from_wire(item1) for item1 in data["items"]),
            next_cursor=data["nextCursor"],
            complete=data["complete"],
            partial_reason=data["partialReason"],
            refresh_required=data["refreshRequired"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "nextCursor": self.next_cursor,
            "complete": self.complete,
            "partialReason": self.partial_reason,
            "refreshRequired": self.refresh_required,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionPageReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSessionPage

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionPageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            result=LiveSessionPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionReply:
    status: str
    request_id: str
    server_time: str
    result: LiveSession

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            result=LiveSession._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionStarted:
    live_session_id: str
    conversation_id: str
    kind: LiveSessionKind
    media_profile: LiveMediaProfile
    operation_id: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> LiveSessionStarted:
        return cls(
            live_session_id=data["liveSessionId"],
            conversation_id=data["conversationId"],
            kind=data["kind"],
            media_profile=data["mediaProfile"],
            operation_id=data["operationId"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "liveSessionId": self.live_session_id,
            "conversationId": self.conversation_id,
            "kind": self.kind,
            "mediaProfile": self.media_profile,
            "operationId": self.operation_id,
        }


LiveSessionState: TypeAlias = Literal[
    "PREPARING",
    "READY",
    "ACTIVE",
    "DRAINING",
    "ENDED",
    "FAILED",
]


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class LiveSessionsInput:
    conversation_id: str
    limit: int | None = None
    """Defaults to ``50`` on the server."""
    cursor: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
        }
        if self.limit is not None:
            data["limit"] = self.limit
        if self.cursor is not None:
            data["cursor"] = self.cursor
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MediaCutoff:
    state: str
    scope: CutoffScope | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> MediaCutoff:
        return cls(
            state=data["state"],
            scope=None if data["scope"] is None else CutoffScope._from_wire(data["scope"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "state": self.state,
            "scope": None if self.scope is None else self.scope.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MediaPolicy:
    lease_policy_id: str
    max_lease_ms: str
    renew_attempt_ms: str
    prelude_max_bytes: str
    prelude_timeout_ms: str
    clock_profile_id: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> MediaPolicy:
        return cls(
            lease_policy_id=data["leasePolicyId"],
            max_lease_ms=data["maxLeaseMs"],
            renew_attempt_ms=data["renewAttemptMs"],
            prelude_max_bytes=data["preludeMaxBytes"],
            prelude_timeout_ms=data["preludeTimeoutMs"],
            clock_profile_id=data["clockProfileId"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "leasePolicyId": self.lease_policy_id,
            "maxLeaseMs": self.max_lease_ms,
            "renewAttemptMs": self.renew_attempt_ms,
            "preludeMaxBytes": self.prelude_max_bytes,
            "preludeTimeoutMs": self.prelude_timeout_ms,
            "clockProfileId": self.clock_profile_id,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Member:
        return cls(
            conversation_id=data["conversationId"],
            principal_id=data["principalId"],
            role=data["role"],
            status=data["status"],
            membership_epoch=data["membershipEpoch"],
            visibility_epoch=data["visibilityEpoch"],
            revision=data["revision"],
            visible_from_sequence=data["visibleFromSequence"],
            can_start_broadcast=data["canStartBroadcast"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "conversationId": self.conversation_id,
            "principalId": self.principal_id,
            "role": self.role,
            "status": self.status,
            "membershipEpoch": self.membership_epoch,
            "visibilityEpoch": self.visibility_epoch,
            "revision": self.revision,
            "visibleFromSequence": self.visible_from_sequence,
            "canStartBroadcast": self.can_start_broadcast,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MemberBatchEntryInput:
    principal_id: str
    role: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "principalId": self.principal_id,
            "role": self.role,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MemberInputInput:
    principal_id: str
    role: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "principalId": self.principal_id,
            "role": self.role,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MemberPage:
    items: tuple[Member, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> MemberPage:
        return cls(
            items=tuple(Member._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> MembersReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else MemberPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MembersRequestInput:
    conversation_id: str
    limit: int
    cursor: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "limit": self.limit,
        }
        if self.cursor is not None:
            data["cursor"] = self.cursor
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Message:
        return cls(
            message_id=data["messageId"],
            conversation_id=data["conversationId"],
            author_id=data["authorId"],
            sequence=data["sequence"],
            revision=data["revision"],
            revision_sequence=data["revisionSequence"],
            created_at=data["createdAt"],
            deleted=data["deleted"],
            text=data["text"],
            props=data["props"],
            edited_at=data["editedAt"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "messageId": self.message_id,
            "conversationId": self.conversation_id,
            "authorId": self.author_id,
            "sequence": self.sequence,
            "revision": self.revision,
            "revisionSequence": self.revision_sequence,
            "createdAt": self.created_at,
            "deleted": self.deleted,
            "text": self.text,
            "props": self.props,
            "editedAt": self.edited_at,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MessageAck:
    message_id: str
    conversation_id: str
    sequence: str
    revision: str
    status: str
    cursor: Cursor | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> MessageAck:
        return cls(
            message_id=data["messageId"],
            conversation_id=data["conversationId"],
            sequence=data["sequence"],
            revision=data["revision"],
            status=data["status"],
            cursor=None if data["cursor"] is None else Cursor._from_wire(data["cursor"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "messageId": self.message_id,
            "conversationId": self.conversation_id,
            "sequence": self.sequence,
            "revision": self.revision,
            "status": self.status,
            "cursor": None if self.cursor is None else self.cursor.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MessagePage:
    items: tuple[Message, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> MessagePage:
        return cls(
            items=tuple(Message._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> MessagesReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else MessagePage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class MessagesRequestInput:
    conversation_id: str
    limit: int
    before_sequence: str | None = None
    act_as_principal_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "limit": self.limit,
        }
        if self.before_sequence is not None:
            data["beforeSequence"] = self.before_sequence
        if self.act_as_principal_id is not None:
            data["actAsPrincipalId"] = self.act_as_principal_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Operation:
        return cls(
            operation_id=data["operationId"],
            kind=data["kind"],
            target_ref=None if data["targetRef"] is None else ResourceRef._from_wire(data["targetRef"]),
            state=data["state"],
            revision=data["revision"],
            requested_at=data["requestedAt"],
            updated_at=data["updatedAt"],
            steps=tuple(OperationStep._from_wire(item1) for item1 in data["steps"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
            blocked_reason=data["blockedReason"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "operationId": self.operation_id,
            "kind": self.kind,
            "targetRef": None if self.target_ref is None else self.target_ref.to_dict(),
            "state": self.state,
            "revision": self.revision,
            "requestedAt": self.requested_at,
            "updatedAt": self.updated_at,
            "steps": [item1.to_dict() for item1 in self.steps],
            "result": None if self.result is None else self.result.to_dict(),
            "blockedReason": self.blocked_reason,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class OperationRef:
    operation_id: str
    owner: str
    href: str
    state: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OperationRef:
        return cls(
            operation_id=data["operationId"],
            owner=data["owner"],
            href=data["href"],
            state=data["state"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "operationId": self.operation_id,
            "owner": self.owner,
            "href": self.href,
            "state": self.state,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OperationResult:
        return cls(
            project_id=data["projectId"],
            incarnation=data["incarnation"],
            status=data["status"],
            backend=data["backend"],
            environment=data["environment"],
            policy_revision=data["policyRevision"],
            expires_at=data["expiresAt"],
            kind=data["kind"],
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            delivery=None if data["delivery"] is None else CredentialDelivery._from_wire(data["delivery"]),
            key_id=data["keyId"],
            endpoint_id=data["endpointId"],
            enabled=data["enabled"],
            live_session_completion=None if data["liveSessionCompletion"] is None else LiveSessionOperationCompletion._from_wire(data["liveSessionCompletion"]),
            replayed_deliveries=data["replayedDeliveries"],
            skipped_deliveries=data["skippedDeliveries"],
            message_preview=data["messagePreview"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "projectId": self.project_id,
            "incarnation": self.incarnation,
            "status": self.status,
            "backend": self.backend,
            "environment": self.environment,
            "policyRevision": self.policy_revision,
            "expiresAt": self.expires_at,
            "kind": self.kind,
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "delivery": None if self.delivery is None else self.delivery.to_dict(),
            "keyId": self.key_id,
            "endpointId": self.endpoint_id,
            "enabled": self.enabled,
            "liveSessionCompletion": None if self.live_session_completion is None else self.live_session_completion.to_dict(),
            "replayedDeliveries": self.replayed_deliveries,
            "skippedDeliveries": self.skipped_deliveries,
            "messagePreview": self.message_preview,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class OperationStep:
    step_id: str
    state: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OperationStep:
        return cls(
            step_id=data["stepId"],
            state=data["state"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "stepId": self.step_id,
            "state": self.state,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Organization:
    org_id: str
    name: str
    status: str
    revision: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Organization:
        return cls(
            org_id=data["orgId"],
            name=data["name"],
            status=data["status"],
            revision=data["revision"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "orgId": self.org_id,
            "name": self.name,
            "status": self.status,
            "revision": self.revision,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OrganizationBilling:
        return cls(
            org_id=data["orgId"],
            plan_id=data["planId"],
            standing=data["standing"],
            grace_until=data["graceUntil"],
            subscription_status=data["subscriptionStatus"],
            current_period_end=data["currentPeriodEnd"],
            cancel_at_period_end=data["cancelAtPeriodEnd"],
            catalog_version=data["catalogVersion"],
            configured=data["configured"],
            billed=data["billed"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "orgId": self.org_id,
            "planId": self.plan_id,
            "standing": self.standing,
            "graceUntil": self.grace_until,
            "subscriptionStatus": self.subscription_status,
            "currentPeriodEnd": self.current_period_end,
            "cancelAtPeriodEnd": self.cancel_at_period_end,
            "catalogVersion": self.catalog_version,
            "configured": self.configured,
            "billed": self.billed,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationPage:
    items: tuple[Organization, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OrganizationPage:
        return cls(
            items=tuple(Organization._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OrganizationUsage:
        return cls(
            org_id=data["orgId"],
            source=data["source"],
            observed_at=data["observedAt"],
            complete=data["complete"],
            reason=data["reason"],
            from_=data["from"],
            to=data["to"],
            meters=tuple(UsageMeter._from_wire(item1) for item1 in data["meters"]),
            aggregated_through=data["aggregatedThrough"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "orgId": self.org_id,
            "source": self.source,
            "observedAt": self.observed_at,
            "complete": self.complete,
            "reason": self.reason,
            "from": self.from_,
            "to": self.to,
            "meters": [item1.to_dict() for item1 in self.meters],
            "aggregatedThrough": self.aggregated_through,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class PolicyChangeInput:
    kind: str
    reason: str | None = None
    hold_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "kind": self.kind,
        }
        if self.reason is not None:
            data["reason"] = self.reason
        if self.hold_id is not None:
            data["holdId"] = self.hold_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Principal:
    principal_id: str
    external_user_id: str
    status: str
    revision: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Principal:
        return cls(
            principal_id=data["principalId"],
            external_user_id=data["externalUserId"],
            status=data["status"],
            revision=data["revision"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "principalId": self.principal_id,
            "externalUserId": self.external_user_id,
            "status": self.status,
            "revision": self.revision,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Project:
        return cls(
            project_id=data["projectId"],
            deployment_id=data["deploymentId"],
            name=data["name"],
            environment=data["environment"],
            incarnation=data["incarnation"],
            serving_region=data["servingRegion"],
            serving_epoch=data["servingEpoch"],
            status=data["status"],
            revision=data["revision"],
            policy_revision=data["policyRevision"],
            message_preview=data["messagePreview"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "projectId": self.project_id,
            "deploymentId": self.deployment_id,
            "name": self.name,
            "environment": self.environment,
            "incarnation": self.incarnation,
            "servingRegion": self.serving_region,
            "servingEpoch": self.serving_epoch,
            "status": self.status,
            "revision": self.revision,
            "policyRevision": self.policy_revision,
            "messagePreview": self.message_preview,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ProjectUsage:
        return cls(
            project_id=data["projectId"],
            source=data["source"],
            observed_at=data["observedAt"],
            complete=data["complete"],
            reason=data["reason"],
            from_=data["from"],
            to=data["to"],
            meters=tuple(UsageMeter._from_wire(item1) for item1 in data["meters"]),
            aggregated_through=data["aggregatedThrough"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "projectId": self.project_id,
            "source": self.source,
            "observedAt": self.observed_at,
            "complete": self.complete,
            "reason": self.reason,
            "from": self.from_,
            "to": self.to,
            "meters": [item1.to_dict() for item1 in self.meters],
            "aggregatedThrough": self.aggregated_through,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ReadReceipt:
    principal_id: str
    membership_epoch: str
    visibility_epoch: str
    delivered_through_sequence: str | None
    read_through_sequence: str | None
    updated_at: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ReadReceipt:
        return cls(
            principal_id=data["principalId"],
            membership_epoch=data["membershipEpoch"],
            visibility_epoch=data["visibilityEpoch"],
            delivered_through_sequence=data["deliveredThroughSequence"],
            read_through_sequence=data["readThroughSequence"],
            updated_at=data["updatedAt"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "principalId": self.principal_id,
            "membershipEpoch": self.membership_epoch,
            "visibilityEpoch": self.visibility_epoch,
            "deliveredThroughSequence": self.delivered_through_sequence,
            "readThroughSequence": self.read_through_sequence,
            "updatedAt": self.updated_at,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RemoveMemberReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Member._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RemoveMemberRequestInput:
    conversation_id: str
    principal_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "principalId": self.principal_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RenewSessionReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else SessionBootstrap._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RenewSessionRequestInput:
    session_id: str
    principal_id: str
    device_id: str
    expected_revision: str
    requested_ttl_ms: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "sessionId": self.session_id,
            "principalId": self.principal_id,
            "deviceId": self.device_id,
            "expectedRevision": self.expected_revision,
            "requestedTtlMs": self.requested_ttl_ms,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RequestResolution:
    state: str
    request_id: str
    checked_at: str
    result_withheld: bool
    receipt: ResolvedReceipt | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RequestResolution:
        return cls(
            state=data["state"],
            request_id=data["requestId"],
            checked_at=data["checkedAt"],
            result_withheld=data["resultWithheld"],
            receipt=None if data["receipt"] is None else ResolvedReceipt._from_wire(data["receipt"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "state": self.state,
            "requestId": self.request_id,
            "checkedAt": self.checked_at,
            "resultWithheld": self.result_withheld,
            "receipt": None if self.receipt is None else self.receipt.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ResolveRequestReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else RequestResolution._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ResolveRequestRequestInput:
    request_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "requestId": self.request_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ResolvedReceipt:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else RetainedResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ResourceRef:
    kind: str
    id: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ResourceRef:
        return cls(
            kind=data["kind"],
            id=data["id"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "kind": self.kind,
            "id": self.id,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RetainedResult:
    """Exactly one typed field contains the retained, currently authorized receipt result."""

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
    principal: Principal | None
    read_receipt: ReadReceipt | None
    session_bootstrap: SessionBootstrap | None
    session_revocation: SessionRevocation | None
    signed_proof: dict[str, Any] | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RetainedResult:
        return cls(
            billing_checkout_session=None if data["billingCheckoutSession"] is None else BillingCheckoutSession._from_wire(data["billingCheckoutSession"]),
            billing_portal_session=None if data["billingPortalSession"] is None else BillingPortalSession._from_wire(data["billingPortalSession"]),
            broadcast_permission_changed=None if data["broadcastPermissionChanged"] is None else BroadcastPermissionChanged._from_wire(data["broadcastPermissionChanged"]),
            conversation=None if data["conversation"] is None else Conversation._from_wire(data["conversation"]),
            conversation_member_batch=None if data["conversationMemberBatch"] is None else ConversationMemberBatch._from_wire(data["conversationMemberBatch"]),
            conversation_mute=None if data["conversationMute"] is None else ConversationMute._from_wire(data["conversationMute"]),
            credential_delivery_receipt=None if data["credentialDeliveryReceipt"] is None else CredentialDeliveryReceipt._from_wire(data["credentialDeliveryReceipt"]),
            delivery_ack=None if data["deliveryAck"] is None else DeliveryAck._from_wire(data["deliveryAck"]),
            live_alert_batch=None if data["liveAlertBatch"] is None else LiveAlertBatch._from_wire(data["liveAlertBatch"]),
            live_credential_issuance=None if data["liveCredentialIssuance"] is None else LiveCredentialIssuance._from_wire(data["liveCredentialIssuance"]),
            live_session_end_requested=None if data["liveSessionEndRequested"] is None else LiveSessionEndRequested._from_wire(data["liveSessionEndRequested"]),
            live_session_joined=None if data["liveSessionJoined"] is None else LiveSessionJoined._from_wire(data["liveSessionJoined"]),
            live_session_left=None if data["liveSessionLeft"] is None else LiveSessionLeft._from_wire(data["liveSessionLeft"]),
            live_session_started=None if data["liveSessionStarted"] is None else LiveSessionStarted._from_wire(data["liveSessionStarted"]),
            member=None if data["member"] is None else Member._from_wire(data["member"]),
            message=None if data["message"] is None else Message._from_wire(data["message"]),
            message_ack=None if data["messageAck"] is None else MessageAck._from_wire(data["messageAck"]),
            organization=None if data["organization"] is None else Organization._from_wire(data["organization"]),
            principal=None if data["principal"] is None else Principal._from_wire(data["principal"]),
            read_receipt=None if data["readReceipt"] is None else ReadReceipt._from_wire(data["readReceipt"]),
            session_bootstrap=None if data["sessionBootstrap"] is None else SessionBootstrap._from_wire(data["sessionBootstrap"]),
            session_revocation=None if data["sessionRevocation"] is None else SessionRevocation._from_wire(data["sessionRevocation"]),
            signed_proof=data["signedProof"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "billingCheckoutSession": None if self.billing_checkout_session is None else self.billing_checkout_session.to_dict(),
            "billingPortalSession": None if self.billing_portal_session is None else self.billing_portal_session.to_dict(),
            "broadcastPermissionChanged": None if self.broadcast_permission_changed is None else self.broadcast_permission_changed.to_dict(),
            "conversation": None if self.conversation is None else self.conversation.to_dict(),
            "conversationMemberBatch": None if self.conversation_member_batch is None else self.conversation_member_batch.to_dict(),
            "conversationMute": None if self.conversation_mute is None else self.conversation_mute.to_dict(),
            "credentialDeliveryReceipt": None if self.credential_delivery_receipt is None else self.credential_delivery_receipt.to_dict(),
            "deliveryAck": None if self.delivery_ack is None else self.delivery_ack.to_dict(),
            "liveAlertBatch": None if self.live_alert_batch is None else self.live_alert_batch.to_dict(),
            "liveCredentialIssuance": None if self.live_credential_issuance is None else self.live_credential_issuance.to_dict(),
            "liveSessionEndRequested": None if self.live_session_end_requested is None else self.live_session_end_requested.to_dict(),
            "liveSessionJoined": None if self.live_session_joined is None else self.live_session_joined.to_dict(),
            "liveSessionLeft": None if self.live_session_left is None else self.live_session_left.to_dict(),
            "liveSessionStarted": None if self.live_session_started is None else self.live_session_started.to_dict(),
            "member": None if self.member is None else self.member.to_dict(),
            "message": None if self.message is None else self.message.to_dict(),
            "messageAck": None if self.message_ack is None else self.message_ack.to_dict(),
            "organization": None if self.organization is None else self.organization.to_dict(),
            "principal": None if self.principal is None else self.principal.to_dict(),
            "readReceipt": None if self.read_receipt is None else self.read_receipt.to_dict(),
            "sessionBootstrap": None if self.session_bootstrap is None else self.session_bootstrap.to_dict(),
            "sessionRevocation": None if self.session_revocation is None else self.session_revocation.to_dict(),
            "signedProof": self.signed_proof,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RevokeSessionReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else SessionRevocation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeSessionRequestInput:
    session_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "sessionId": self.session_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RouteReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=data["result"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": self.result,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SearchHit:
    conversation_id: str
    message: Message | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SearchHit:
        return cls(
            conversation_id=data["conversationId"],
            message=None if data["message"] is None else Message._from_wire(data["message"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "conversationId": self.conversation_id,
            "message": None if self.message is None else self.message.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SearchPage:
    items: tuple[SearchHit, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SearchPage:
        return cls(
            items=tuple(SearchHit._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SearchReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else SearchPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SearchRequestInput:
    query: str
    page_size: int
    scope: SearchScopeInput | None = None
    cursor: str | None = None
    act_as_principal_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "query": self.query,
            "pageSize": self.page_size,
        }
        if self.scope is not None:
            data["scope"] = self.scope.to_dict()
        if self.cursor is not None:
            data["cursor"] = self.cursor
        if self.act_as_principal_id is not None:
            data["actAsPrincipalId"] = self.act_as_principal_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SearchScopeInput:
    conversation_ids: Sequence[str]

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationIds": self.conversation_ids,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SendMessageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else MessageAck._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SendMessageRequestInput:
    conversation_id: str
    text: str
    props: Mapping[str, Any]
    act_as_principal_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "text": self.text,
            "props": self.props,
        }
        if self.act_as_principal_id is not None:
            data["actAsPrincipalId"] = self.act_as_principal_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ServiceDetails:
    status: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ServiceDetails:
        return cls(
            status=data["status"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ServiceObservation:
    role: str
    observed_at: str
    details: ServiceDetails | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ServiceObservation:
        return cls(
            role=data["role"],
            observed_at=data["observedAt"],
            details=None if data["details"] is None else ServiceDetails._from_wire(data["details"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "role": self.role,
            "observedAt": self.observed_at,
            "details": None if self.details is None else self.details.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class Session:
    session_id: str
    principal_id: str
    device_id: str
    incarnation: str
    session_revision: str
    expires_at: str
    status: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> Session:
        return cls(
            session_id=data["sessionId"],
            principal_id=data["principalId"],
            device_id=data["deviceId"],
            incarnation=data["incarnation"],
            session_revision=data["sessionRevision"],
            expires_at=data["expiresAt"],
            status=data["status"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "sessionId": self.session_id,
            "principalId": self.principal_id,
            "deviceId": self.device_id,
            "incarnation": self.incarnation,
            "sessionRevision": self.session_revision,
            "expiresAt": self.expires_at,
            "status": self.status,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SessionBootstrap:
    session: Session | None
    token_expires_at: str
    session_token: str

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SessionBootstrap:
        return cls(
            session=None if data["session"] is None else Session._from_wire(data["session"]),
            token_expires_at=data["tokenExpiresAt"],
            session_token=data["sessionToken"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "session": None if self.session is None else self.session.to_dict(),
            "tokenExpiresAt": self.token_expires_at,
            "sessionToken": self.session_token,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SessionRequestOutcome:
        return cls(
            state=data["state"],
            request_id=data["requestId"],
            checked_at=data["checkedAt"],
            operation=data["operation"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            original_session=None if data["originalSession"] is None else Session._from_wire(data["originalSession"]),
            current_session=None if data["currentSession"] is None else Session._from_wire(data["currentSession"]),
            current_state=data["currentState"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "state": self.state,
            "requestId": self.request_id,
            "checkedAt": self.checked_at,
            "operation": self.operation,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "originalSession": None if self.original_session is None else self.original_session.to_dict(),
            "currentSession": None if self.current_session is None else self.current_session.to_dict(),
            "currentState": self.current_state,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SessionRequestOutcomeReply:
    status: str
    request_id: str
    server_time: str
    result: SessionRequestOutcome

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SessionRequestOutcomeReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            result=SessionRequestOutcome._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SessionRequestOutcomeRequestInput:
    request_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "requestId": self.request_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SessionRevocation:
    session_id: str
    status: str
    media_cutoff: MediaCutoff | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SessionRevocation:
        return cls(
            session_id=data["sessionId"],
            status=data["status"],
            media_cutoff=None if data["mediaCutoff"] is None else MediaCutoff._from_wire(data["mediaCutoff"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "sessionId": self.session_id,
            "status": self.status,
            "mediaCutoff": None if self.media_cutoff is None else self.media_cutoff.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SetBroadcastPermissionInput:
    conversation_id: str
    principal_id: str
    allowed: bool
    expected_membership_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "principalId": self.principal_id,
            "allowed": self.allowed,
            "expectedMembershipRevision": self.expected_membership_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SetBroadcastPermissionPayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: BroadcastPermissionChanged

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SetBroadcastPermissionPayload:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            result=BroadcastPermissionChanged._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SetConversationMuteInput:
    conversation_id: str
    muted: bool
    until: str | None = None
    act_as_principal_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "muted": self.muted,
        }
        if self.until is not None:
            data["until"] = self.until
        if self.act_as_principal_id is not None:
            data["actAsPrincipalId"] = self.act_as_principal_id
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class SetConversationMutePayload:
    status: str
    request_id: str
    receipt_id: str
    committed_at: str
    replayed: bool
    result: ConversationMute

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> SetConversationMutePayload:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            result=ConversationMute._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "result": self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> UpdateConversationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Conversation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class UpdateConversationRequestInput:
    conversation_id: str
    expected_revision: str
    title: str | None = None
    props: Mapping[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "conversationId": self.conversation_id,
            "expectedRevision": self.expected_revision,
        }
        if self.title is not None:
            data["title"] = self.title
        if self.props is not None:
            data["props"] = self.props
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class UsageMeter:
    meter: str
    unit: str
    quantity: str
    emitted: bool

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> UsageMeter:
        return cls(
            meter=data["meter"],
            unit=data["unit"],
            quantity=data["quantity"],
            emitted=data["emitted"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "meter": self.meter,
            "unit": self.unit,
            "quantity": self.quantity,
            "emitted": self.emitted,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WebhookDelivery:
        return cls(
            effect_id=data["effectId"],
            event_id=data["eventId"],
            state=data["state"],
            attempts=data["attempts"],
            last_outcome=data["lastOutcome"],
            next_attempt_at=data["nextAttemptAt"],
            event_type=data["eventType"],
            created_at=data["createdAt"],
            replayed_at=data["replayedAt"],
            last_attempt_at=data["lastAttemptAt"],
            last_http_status=data["lastHttpStatus"],
            last_latency_ms=data["lastLatencyMs"],
            last_error_code=data["lastErrorCode"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "effectId": self.effect_id,
            "eventId": self.event_id,
            "state": self.state,
            "attempts": self.attempts,
            "lastOutcome": self.last_outcome,
            "nextAttemptAt": self.next_attempt_at,
            "eventType": self.event_type,
            "createdAt": self.created_at,
            "replayedAt": self.replayed_at,
            "lastAttemptAt": self.last_attempt_at,
            "lastHttpStatus": self.last_http_status,
            "lastLatencyMs": self.last_latency_ms,
            "lastErrorCode": self.last_error_code,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookDeliveryPage:
    items: tuple[WebhookDelivery, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    observed_at: str | None
    partial_reason: str | None
    source_revision: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WebhookDeliveryPage:
        return cls(
            items=tuple(WebhookDelivery._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
            observed_at=data["observedAt"],
            partial_reason=data["partialReason"],
            source_revision=data["sourceRevision"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
            "observedAt": self.observed_at,
            "partialReason": self.partial_reason,
            "sourceRevision": self.source_revision,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WebhookEndpoint:
        return cls(
            endpoint_id=data["endpointId"],
            url=data["url"],
            event_types=tuple(data["eventTypes"]),
            enabled=data["enabled"],
            status=data["status"],
            disabled_reason=data["disabledReason"],
            revision=data["revision"],
            secret_version=data["secretVersion"],
            rotation_pending=data["rotationPending"],
            rotation_overlap_until=data["rotationOverlapUntil"],
            consecutive_failures=data["consecutiveFailures"],
            failing_since=data["failingSince"],
            last_success_at=data["lastSuccessAt"],
            last_failure_at=data["lastFailureAt"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "endpointId": self.endpoint_id,
            "url": self.url,
            "eventTypes": list(self.event_types),
            "enabled": self.enabled,
            "status": self.status,
            "disabledReason": self.disabled_reason,
            "revision": self.revision,
            "secretVersion": self.secret_version,
            "rotationPending": self.rotation_pending,
            "rotationOverlapUntil": self.rotation_overlap_until,
            "consecutiveFailures": self.consecutive_failures,
            "failingSince": self.failing_since,
            "lastSuccessAt": self.last_success_at,
            "lastFailureAt": self.last_failure_at,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpointPage:
    items: tuple[WebhookEndpoint, ...]
    complete: bool
    refresh_required: bool
    next_cursor: str | None
    observed_at: str | None
    partial_reason: str | None

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WebhookEndpointPage:
        return cls(
            items=tuple(WebhookEndpoint._from_wire(item1) for item1 in data["items"]),
            complete=data["complete"],
            refresh_required=data["refreshRequired"],
            next_cursor=data["nextCursor"],
            observed_at=data["observedAt"],
            partial_reason=data["partialReason"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "items": [item1.to_dict() for item1 in self.items],
            "complete": self.complete,
            "refreshRequired": self.refresh_required,
            "nextCursor": self.next_cursor,
            "observedAt": self.observed_at,
            "partialReason": self.partial_reason,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ConfigureWebhookReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ConfigureWebhookRequestInput:
    project_id: str
    url: str
    event_types: Sequence[str]
    consent_ref: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "url": self.url,
            "eventTypes": self.event_types,
            "consentRef": self.consent_ref,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CreateBillingCheckoutSessionReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else BillingCheckoutSession._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreateBillingCheckoutSessionRequestInput:
    org_id: str
    plan_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "orgId": self.org_id,
            "planId": self.plan_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CreateBillingPortalSessionReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else BillingPortalSession._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreateBillingPortalSessionRequestInput:
    org_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "orgId": self.org_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CreateDeploymentReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreateDeploymentRequestInput:
    org_id: str
    offering: str
    geo_id: str
    installation_profile_id: str
    consent_ref: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "orgId": self.org_id,
            "offering": self.offering,
            "geoId": self.geo_id,
            "installationProfileId": self.installation_profile_id,
            "consentRef": self.consent_ref,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CreateOrganizationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Organization._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreateOrganizationRequestInput:
    name: str
    terms_ref: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "name": self.name,
            "termsRef": self.terms_ref,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CreateProjectReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CreateProjectRequestInput:
    deployment_id: str
    name: str
    environment: str
    backend_principal_name: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "deploymentId": self.deployment_id,
            "name": self.name,
            "environment": self.environment,
            "backendPrincipalName": self.backend_principal_name,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> CredentialPermitReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=data["result"],
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": self.result,
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class CredentialPermitRequestInput:
    project_id: str
    delivery_id: str
    redemption_request_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "deliveryId": self.delivery_id,
            "redemptionRequestId": self.redemption_request_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DeploymentHealthReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else DeploymentHealth._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentHealthRequestInput:
    deployment_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "deploymentId": self.deployment_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DeploymentUsageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else DeploymentUsage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class DeploymentUsageRequestInput:
    deployment_id: str
    from_: str | None = None
    to: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "deploymentId": self.deployment_id,
        }
        if self.from_ is not None:
            data["from"] = self.from_
        if self.to is not None:
            data["to"] = self.to
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> DisableWebhookReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class DisableWebhookRequestInput:
    project_id: str
    endpoint_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "endpointId": self.endpoint_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> GetDeploymentReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Deployment._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class GetDeploymentRequestInput:
    deployment_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "deploymentId": self.deployment_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> GetOrganizationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Organization._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class GetOrganizationRequestInput:
    org_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "orgId": self.org_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> GetProjectReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Project._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class GetProjectRequestInput:
    project_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> IssueBackendKeyReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class IssueBackendKeyRequestInput:
    project_id: str
    name: str
    scopes: Sequence[str]
    expires_at: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "name": self.name,
            "scopes": self.scopes,
            "expiresAt": self.expires_at,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OrganizationBillingReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OrganizationBilling._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationBillingRequestInput:
    org_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "orgId": self.org_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OrganizationUsageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OrganizationUsage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class OrganizationUsageRequestInput:
    org_id: str
    from_: str | None = None
    to: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "orgId": self.org_id,
        }
        if self.from_ is not None:
            data["from"] = self.from_
        if self.to is not None:
            data["to"] = self.to
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> OrganizationsReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OrganizationPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> PauseOperationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Operation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class PauseOperationRequestInput:
    operation_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "operationId": self.operation_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ProjectPolicyReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ProjectPolicyRequestInput:
    project_id: str
    expected_revision: str
    change: PolicyChangeInput

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "expectedRevision": self.expected_revision,
            "change": self.change.to_dict(),
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ProjectUsageReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else ProjectUsage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ProjectUsageRequestInput:
    project_id: str
    from_: str | None = None
    to: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
        }
        if self.from_ is not None:
            data["from"] = self.from_
        if self.to is not None:
            data["to"] = self.to
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ReplayWebhookDeliveriesReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ReplayWebhookDeliveriesRequestInput:
    project_id: str
    endpoint_id: str
    effect_id: str | None = None
    since: str | None = None
    until: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "endpointId": self.endpoint_id,
        }
        if self.effect_id is not None:
            data["effectId"] = self.effect_id
        if self.since is not None:
            data["since"] = self.since
        if self.until is not None:
            data["until"] = self.until
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> ResumeOperationReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else Operation._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class ResumeOperationRequestInput:
    operation_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "operationId": self.operation_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RevokeBackendKeyReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RevokeBackendKeyRequestInput:
    project_id: str
    key_id: str
    expected_revision: str
    revoke_issued_sessions: bool

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "keyId": self.key_id,
            "expectedRevision": self.expected_revision,
            "revokeIssuedSessions": self.revoke_issued_sessions,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> RotateWebhookSecretReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class RotateWebhookSecretRequestInput:
    project_id: str
    endpoint_id: str
    expected_revision: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "endpointId": self.endpoint_id,
            "expectedRevision": self.expected_revision,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> UpdateWebhookReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else OperationResult._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class UpdateWebhookRequestInput:
    project_id: str
    endpoint_id: str
    expected_revision: str
    event_types: Sequence[str]
    enabled: bool

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "endpointId": self.endpoint_id,
            "expectedRevision": self.expected_revision,
            "eventTypes": self.event_types,
            "enabled": self.enabled,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WebhookDeliveriesReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else WebhookDeliveryPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookDeliveriesRequestInput:
    project_id: str
    endpoint_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
            "endpointId": self.endpoint_id,
        }
        return data


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
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

    @classmethod
    def _from_wire(cls, data: Mapping[str, Any]) -> WebhookEndpointsReply:
        return cls(
            status=data["status"],
            request_id=data["requestId"],
            server_time=data["serverTime"],
            receipt_id=data["receiptId"],
            committed_at=data["committedAt"],
            replayed=data["replayed"],
            operation=None if data["operation"] is None else OperationRef._from_wire(data["operation"]),
            resource_ref=None if data["resourceRef"] is None else ResourceRef._from_wire(data["resourceRef"]),
            result=None if data["result"] is None else WebhookEndpointPage._from_wire(data["result"]),
        )

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name."""
        return {
            "status": self.status,
            "requestId": self.request_id,
            "serverTime": self.server_time,
            "receiptId": self.receipt_id,
            "committedAt": self.committed_at,
            "replayed": self.replayed,
            "operation": None if self.operation is None else self.operation.to_dict(),
            "resourceRef": None if self.resource_ref is None else self.resource_ref.to_dict(),
            "result": None if self.result is None else self.result.to_dict(),
        }


@_dc.dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpointsRequestInput:
    project_id: str

    def to_dict(self) -> dict[str, Any]:
        """The wire form, keyed by GraphQL field name. ``None`` fields are omitted."""
        data: dict[str, Any] = {
            "projectId": self.project_id,
        }
        return data
