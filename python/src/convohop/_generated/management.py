"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

Typed ``management`` operations. Organizations, deployments, projects, backend keys and webhooks.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from .operations import OPERATIONS, AsyncInvoker, SyncInvoker
from .types import (
    BillingCheckoutSession,
    BillingPortalSession,
    Capabilities,
    Deployment,
    DeploymentHealth,
    DeploymentUsage,
    GetOperationRequestInput,
    Operation,
    Organization,
    OrganizationBilling,
    OrganizationPage,
    OrganizationUsage,
    PolicyChangeInput,
    Project,
    ProjectUsage,
    RequestResolution,
    ResolveRequestRequestInput,
    WebhookDeliveryPage,
    WebhookEndpointPage,
    ConfigureWebhookReply,
    ConfigureWebhookRequestInput,
    CreateBillingCheckoutSessionRequestInput,
    CreateBillingPortalSessionRequestInput,
    CreateDeploymentReply,
    CreateDeploymentRequestInput,
    CreateOrganizationRequestInput,
    CreateProjectReply,
    CreateProjectRequestInput,
    CredentialPermitRequestInput,
    DeploymentHealthRequestInput,
    DeploymentUsageRequestInput,
    DisableWebhookReply,
    DisableWebhookRequestInput,
    GetDeploymentRequestInput,
    GetOrganizationRequestInput,
    GetProjectRequestInput,
    IssueBackendKeyReply,
    IssueBackendKeyRequestInput,
    OrganizationBillingRequestInput,
    OrganizationUsageRequestInput,
    PauseOperationRequestInput,
    ProjectPolicyReply,
    ProjectPolicyRequestInput,
    ProjectUsageRequestInput,
    ReplayWebhookDeliveriesReply,
    ReplayWebhookDeliveriesRequestInput,
    ResumeOperationRequestInput,
    RevokeBackendKeyReply,
    RevokeBackendKeyRequestInput,
    RotateWebhookSecretReply,
    RotateWebhookSecretRequestInput,
    UpdateWebhookReply,
    UpdateWebhookRequestInput,
    WebhookDeliveriesRequestInput,
    WebhookEndpointsRequestInput,
)


__all__ = [
    "AsyncManagementOperations",
    "ManagementOperations",
]


class ManagementOperations(SyncInvoker):
    """Synchronous ``management`` operations. Organizations, deployments, projects, backend keys and webhooks."""

    __slots__ = ()

    def capabilities(self) -> Capabilities:
        """Describe the management features and limits the authority supports.

        Authorization: ``portalCredential``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.capabilities"], None, None)
        return Capabilities._from_wire(_envelope["result"])

    def organizations(self) -> OrganizationPage:
        """List the organizations the caller can access.

        Authorization: ``portalCredential``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``bounded``. One bounded page without a cursor input. complete reports whether every item fit.
        """
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.organizations"], None, None)
        return OrganizationPage._from_wire(_envelope["result"])

    def get_organization(
        self,
        *,
        org_id: str,
    ) -> Organization:
        """Read an organization.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetOrganizationRequestInput(
            org_id=org_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.getOrganization"], _input, None)
        return Organization._from_wire(_envelope["result"])

    def get_deployment(
        self,
        *,
        deployment_id: str,
    ) -> Deployment:
        """Read a deployment.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetDeploymentRequestInput(
            deployment_id=deployment_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.getDeployment"], _input, None)
        return Deployment._from_wire(_envelope["result"])

    def get_project(
        self,
        *,
        project_id: str,
    ) -> Project:
        """Read a project.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetProjectRequestInput(
            project_id=project_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.getProject"], _input, None)
        return Project._from_wire(_envelope["result"])

    def deployment_health(
        self,
        *,
        deployment_id: str,
    ) -> DeploymentHealth:
        """Read the health of a deployment.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = DeploymentHealthRequestInput(
            deployment_id=deployment_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.deploymentHealth"], _input, None)
        return DeploymentHealth._from_wire(_envelope["result"])

    def deployment_usage(
        self,
        *,
        deployment_id: str,
        from_: str | None = None,
        to: str | None = None,
    ) -> DeploymentUsage:
        """Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = DeploymentUsageRequestInput(
            deployment_id=deployment_id,
            from_=from_,
            to=to,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.deploymentUsage"], _input, None)
        return DeploymentUsage._from_wire(_envelope["result"])

    def project_usage(
        self,
        *,
        project_id: str,
        from_: str | None = None,
        to: str | None = None,
    ) -> ProjectUsage:
        """Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ProjectUsageRequestInput(
            project_id=project_id,
            from_=from_,
            to=to,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.projectUsage"], _input, None)
        return ProjectUsage._from_wire(_envelope["result"])

    def organization_usage(
        self,
        *,
        org_id: str,
        from_: str | None = None,
        to: str | None = None,
    ) -> OrganizationUsage:
        """Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = OrganizationUsageRequestInput(
            org_id=org_id,
            from_=from_,
            to=to,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.organizationUsage"], _input, None)
        return OrganizationUsage._from_wire(_envelope["result"])

    def organization_billing(
        self,
        *,
        org_id: str,
    ) -> OrganizationBilling:
        """Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = OrganizationBillingRequestInput(
            org_id=org_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.organizationBilling"], _input, None)
        return OrganizationBilling._from_wire(_envelope["result"])

    def webhook_endpoints(
        self,
        *,
        project_id: str,
    ) -> WebhookEndpointPage:
        """List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``bounded``. One bounded page without a cursor input. complete reports whether every item fit.
        """
        _input = WebhookEndpointsRequestInput(
            project_id=project_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.webhookEndpoints"], _input, None)
        return WebhookEndpointPage._from_wire(_envelope["result"])

    def webhook_deliveries(
        self,
        *,
        project_id: str,
        endpoint_id: str,
    ) -> WebhookDeliveryPage:
        """List recent deliveries of a webhook endpoint.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``bounded``. One bounded page without a cursor input. complete reports whether every item fit.
        """
        _input = WebhookDeliveriesRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.webhookDeliveries"], _input, None)
        return WebhookDeliveryPage._from_wire(_envelope["result"])

    def resolve_request(
        self,
        *,
        request_id: str,
    ) -> RequestResolution:
        """Look up the stored outcome of an earlier management mutation by its requestId.

        Authorization: ``portalCredential``, when ``ownRequest``: The caller made the original request.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ResolveRequestRequestInput(
            request_id=request_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.resolveRequest"], _input, None)
        return RequestResolution._from_wire(_envelope["result"])

    def get_operation(
        self,
        *,
        operation_id: str,
    ) -> Operation:
        """Read the state of a long-running management operation.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetOperationRequestInput(
            operation_id=operation_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.getOperation"], _input, None)
        return Operation._from_wire(_envelope["result"])

    def create_organization(
        self,
        *,
        name: str,
        terms_ref: str,
        request_id: str | None = None,
    ) -> Organization:
        """Create an organization.

        Authorization: ``portalCredential``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateOrganizationRequestInput(
            name=name,
            terms_ref=terms_ref,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.createOrganization"], _input, request_id)
        return Organization._from_wire(_envelope["result"])

    def create_deployment(
        self,
        *,
        org_id: str,
        offering: str,
        geo_id: str,
        installation_profile_id: str,
        consent_ref: str,
        request_id: str | None = None,
    ) -> CreateDeploymentReply:
        """Create a deployment in an organization. Completes asynchronously.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateDeploymentRequestInput(
            org_id=org_id,
            offering=offering,
            geo_id=geo_id,
            installation_profile_id=installation_profile_id,
            consent_ref=consent_ref,
        ).to_dict()
        return CreateDeploymentReply._from_wire(self._invoke(OPERATIONS["management.createDeployment"], _input, request_id))

    def create_project(
        self,
        *,
        deployment_id: str,
        name: str,
        environment: str,
        backend_principal_name: str,
        request_id: str | None = None,
    ) -> CreateProjectReply:
        """Create a project in a ready deployment. Completes asynchronously.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateProjectRequestInput(
            deployment_id=deployment_id,
            name=name,
            environment=environment,
            backend_principal_name=backend_principal_name,
        ).to_dict()
        return CreateProjectReply._from_wire(self._invoke(OPERATIONS["management.createProject"], _input, request_id))

    def issue_backend_key(
        self,
        *,
        project_id: str,
        name: str,
        scopes: Sequence[str],
        expires_at: str,
        request_id: str | None = None,
    ) -> IssueBackendKeyReply:
        """Issue a scoped backend key. The secret is delivered once through a credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = IssueBackendKeyRequestInput(
            project_id=project_id,
            name=name,
            scopes=scopes,
            expires_at=expires_at,
        ).to_dict()
        return IssueBackendKeyReply._from_wire(self._invoke(OPERATIONS["management.issueBackendKey"], _input, request_id))

    def revoke_backend_key(
        self,
        *,
        project_id: str,
        key_id: str,
        expected_revision: str,
        revoke_issued_sessions: bool,
        request_id: str | None = None,
    ) -> RevokeBackendKeyReply:
        """Revoke a backend key, optionally revoking the sessions it issued.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RevokeBackendKeyRequestInput(
            project_id=project_id,
            key_id=key_id,
            expected_revision=expected_revision,
            revoke_issued_sessions=revoke_issued_sessions,
        ).to_dict()
        return RevokeBackendKeyReply._from_wire(self._invoke(OPERATIONS["management.revokeBackendKey"], _input, request_id))

    def project_policy(
        self,
        *,
        project_id: str,
        expected_revision: str,
        change: PolicyChangeInput,
        request_id: str | None = None,
    ) -> ProjectPolicyReply:
        """Change the policy of a project.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ProjectPolicyRequestInput(
            project_id=project_id,
            expected_revision=expected_revision,
            change=change,
        ).to_dict()
        return ProjectPolicyReply._from_wire(self._invoke(OPERATIONS["management.projectPolicy"], _input, request_id))

    def credential_permit(
        self,
        *,
        project_id: str,
        delivery_id: str,
        redemption_request_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        """Issue a signed permit that authorizes redeeming one credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CredentialPermitRequestInput(
            project_id=project_id,
            delivery_id=delivery_id,
            redemption_request_id=redemption_request_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.credentialPermit"], _input, request_id)
        _value: dict[str, Any] = _envelope["result"]
        return _value

    def pause_operation(
        self,
        *,
        operation_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Operation:
        """Pause a long-running operation.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = PauseOperationRequestInput(
            operation_id=operation_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.pauseOperation"], _input, request_id)
        return Operation._from_wire(_envelope["result"])

    def resume_operation(
        self,
        *,
        operation_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Operation:
        """Resume a paused operation.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ResumeOperationRequestInput(
            operation_id=operation_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.resumeOperation"], _input, request_id)
        return Operation._from_wire(_envelope["result"])

    def create_billing_checkout_session(
        self,
        *,
        org_id: str,
        plan_id: str,
        request_id: str | None = None,
    ) -> BillingCheckoutSession:
        """Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``singleUse``. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateBillingCheckoutSessionRequestInput(
            org_id=org_id,
            plan_id=plan_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.createBillingCheckoutSession"], _input, request_id)
        return BillingCheckoutSession._from_wire(_envelope["result"])

    def create_billing_portal_session(
        self,
        *,
        org_id: str,
        request_id: str | None = None,
    ) -> BillingPortalSession:
        """Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``singleUse``. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateBillingPortalSessionRequestInput(
            org_id=org_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["management.createBillingPortalSession"], _input, request_id)
        return BillingPortalSession._from_wire(_envelope["result"])

    def configure_webhook(
        self,
        *,
        project_id: str,
        url: str,
        event_types: Sequence[str],
        consent_ref: str,
        request_id: str | None = None,
    ) -> ConfigureWebhookReply:
        """Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ConfigureWebhookRequestInput(
            project_id=project_id,
            url=url,
            event_types=event_types,
            consent_ref=consent_ref,
        ).to_dict()
        return ConfigureWebhookReply._from_wire(self._invoke(OPERATIONS["management.configureWebhook"], _input, request_id))

    def update_webhook(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        expected_revision: str,
        event_types: Sequence[str],
        enabled: bool,
        request_id: str | None = None,
    ) -> UpdateWebhookReply:
        """Change the event types of a webhook endpoint, or enable or disable it.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = UpdateWebhookRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            expected_revision=expected_revision,
            event_types=event_types,
            enabled=enabled,
        ).to_dict()
        return UpdateWebhookReply._from_wire(self._invoke(OPERATIONS["management.updateWebhook"], _input, request_id))

    def rotate_webhook_secret(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> RotateWebhookSecretReply:
        """Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RotateWebhookSecretRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            expected_revision=expected_revision,
        ).to_dict()
        return RotateWebhookSecretReply._from_wire(self._invoke(OPERATIONS["management.rotateWebhookSecret"], _input, request_id))

    def disable_webhook(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> DisableWebhookReply:
        """Disable a webhook endpoint.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = DisableWebhookRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            expected_revision=expected_revision,
        ).to_dict()
        return DisableWebhookReply._from_wire(self._invoke(OPERATIONS["management.disableWebhook"], _input, request_id))

    def replay_webhook_deliveries(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        effect_id: str | None = None,
        since: str | None = None,
        until: str | None = None,
        request_id: str | None = None,
    ) -> ReplayWebhookDeliveriesReply:
        """Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ReplayWebhookDeliveriesRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            effect_id=effect_id,
            since=since,
            until=until,
        ).to_dict()
        return ReplayWebhookDeliveriesReply._from_wire(self._invoke(OPERATIONS["management.replayWebhookDeliveries"], _input, request_id))


class AsyncManagementOperations(AsyncInvoker):
    """Asynchronous ``management`` operations. Organizations, deployments, projects, backend keys and webhooks."""

    __slots__ = ()

    async def capabilities(self) -> Capabilities:
        """Describe the management features and limits the authority supports.

        Authorization: ``portalCredential``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.capabilities"], None, None)
        return Capabilities._from_wire(_envelope["result"])

    async def organizations(self) -> OrganizationPage:
        """List the organizations the caller can access.

        Authorization: ``portalCredential``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``bounded``. One bounded page without a cursor input. complete reports whether every item fit.
        """
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.organizations"], None, None)
        return OrganizationPage._from_wire(_envelope["result"])

    async def get_organization(
        self,
        *,
        org_id: str,
    ) -> Organization:
        """Read an organization.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetOrganizationRequestInput(
            org_id=org_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.getOrganization"], _input, None)
        return Organization._from_wire(_envelope["result"])

    async def get_deployment(
        self,
        *,
        deployment_id: str,
    ) -> Deployment:
        """Read a deployment.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetDeploymentRequestInput(
            deployment_id=deployment_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.getDeployment"], _input, None)
        return Deployment._from_wire(_envelope["result"])

    async def get_project(
        self,
        *,
        project_id: str,
    ) -> Project:
        """Read a project.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetProjectRequestInput(
            project_id=project_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.getProject"], _input, None)
        return Project._from_wire(_envelope["result"])

    async def deployment_health(
        self,
        *,
        deployment_id: str,
    ) -> DeploymentHealth:
        """Read the health of a deployment.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = DeploymentHealthRequestInput(
            deployment_id=deployment_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.deploymentHealth"], _input, None)
        return DeploymentHealth._from_wire(_envelope["result"])

    async def deployment_usage(
        self,
        *,
        deployment_id: str,
        from_: str | None = None,
        to: str | None = None,
    ) -> DeploymentUsage:
        """Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = DeploymentUsageRequestInput(
            deployment_id=deployment_id,
            from_=from_,
            to=to,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.deploymentUsage"], _input, None)
        return DeploymentUsage._from_wire(_envelope["result"])

    async def project_usage(
        self,
        *,
        project_id: str,
        from_: str | None = None,
        to: str | None = None,
    ) -> ProjectUsage:
        """Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ProjectUsageRequestInput(
            project_id=project_id,
            from_=from_,
            to=to,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.projectUsage"], _input, None)
        return ProjectUsage._from_wire(_envelope["result"])

    async def organization_usage(
        self,
        *,
        org_id: str,
        from_: str | None = None,
        to: str | None = None,
    ) -> OrganizationUsage:
        """Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = OrganizationUsageRequestInput(
            org_id=org_id,
            from_=from_,
            to=to,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.organizationUsage"], _input, None)
        return OrganizationUsage._from_wire(_envelope["result"])

    async def organization_billing(
        self,
        *,
        org_id: str,
    ) -> OrganizationBilling:
        """Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = OrganizationBillingRequestInput(
            org_id=org_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.organizationBilling"], _input, None)
        return OrganizationBilling._from_wire(_envelope["result"])

    async def webhook_endpoints(
        self,
        *,
        project_id: str,
    ) -> WebhookEndpointPage:
        """List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``bounded``. One bounded page without a cursor input. complete reports whether every item fit.
        """
        _input = WebhookEndpointsRequestInput(
            project_id=project_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.webhookEndpoints"], _input, None)
        return WebhookEndpointPage._from_wire(_envelope["result"])

    async def webhook_deliveries(
        self,
        *,
        project_id: str,
        endpoint_id: str,
    ) -> WebhookDeliveryPage:
        """List recent deliveries of a webhook endpoint.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``bounded``. One bounded page without a cursor input. complete reports whether every item fit.
        """
        _input = WebhookDeliveriesRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.webhookDeliveries"], _input, None)
        return WebhookDeliveryPage._from_wire(_envelope["result"])

    async def resolve_request(
        self,
        *,
        request_id: str,
    ) -> RequestResolution:
        """Look up the stored outcome of an earlier management mutation by its requestId.

        Authorization: ``portalCredential``, when ``ownRequest``: The caller made the original request.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ResolveRequestRequestInput(
            request_id=request_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.resolveRequest"], _input, None)
        return RequestResolution._from_wire(_envelope["result"])

    async def get_operation(
        self,
        *,
        operation_id: str,
    ) -> Operation:
        """Read the state of a long-running management operation.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetOperationRequestInput(
            operation_id=operation_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.getOperation"], _input, None)
        return Operation._from_wire(_envelope["result"])

    async def create_organization(
        self,
        *,
        name: str,
        terms_ref: str,
        request_id: str | None = None,
    ) -> Organization:
        """Create an organization.

        Authorization: ``portalCredential``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateOrganizationRequestInput(
            name=name,
            terms_ref=terms_ref,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.createOrganization"], _input, request_id)
        return Organization._from_wire(_envelope["result"])

    async def create_deployment(
        self,
        *,
        org_id: str,
        offering: str,
        geo_id: str,
        installation_profile_id: str,
        consent_ref: str,
        request_id: str | None = None,
    ) -> CreateDeploymentReply:
        """Create a deployment in an organization. Completes asynchronously.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateDeploymentRequestInput(
            org_id=org_id,
            offering=offering,
            geo_id=geo_id,
            installation_profile_id=installation_profile_id,
            consent_ref=consent_ref,
        ).to_dict()
        return CreateDeploymentReply._from_wire(await self._invoke(OPERATIONS["management.createDeployment"], _input, request_id))

    async def create_project(
        self,
        *,
        deployment_id: str,
        name: str,
        environment: str,
        backend_principal_name: str,
        request_id: str | None = None,
    ) -> CreateProjectReply:
        """Create a project in a ready deployment. Completes asynchronously.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateProjectRequestInput(
            deployment_id=deployment_id,
            name=name,
            environment=environment,
            backend_principal_name=backend_principal_name,
        ).to_dict()
        return CreateProjectReply._from_wire(await self._invoke(OPERATIONS["management.createProject"], _input, request_id))

    async def issue_backend_key(
        self,
        *,
        project_id: str,
        name: str,
        scopes: Sequence[str],
        expires_at: str,
        request_id: str | None = None,
    ) -> IssueBackendKeyReply:
        """Issue a scoped backend key. The secret is delivered once through a credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = IssueBackendKeyRequestInput(
            project_id=project_id,
            name=name,
            scopes=scopes,
            expires_at=expires_at,
        ).to_dict()
        return IssueBackendKeyReply._from_wire(await self._invoke(OPERATIONS["management.issueBackendKey"], _input, request_id))

    async def revoke_backend_key(
        self,
        *,
        project_id: str,
        key_id: str,
        expected_revision: str,
        revoke_issued_sessions: bool,
        request_id: str | None = None,
    ) -> RevokeBackendKeyReply:
        """Revoke a backend key, optionally revoking the sessions it issued.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RevokeBackendKeyRequestInput(
            project_id=project_id,
            key_id=key_id,
            expected_revision=expected_revision,
            revoke_issued_sessions=revoke_issued_sessions,
        ).to_dict()
        return RevokeBackendKeyReply._from_wire(await self._invoke(OPERATIONS["management.revokeBackendKey"], _input, request_id))

    async def project_policy(
        self,
        *,
        project_id: str,
        expected_revision: str,
        change: PolicyChangeInput,
        request_id: str | None = None,
    ) -> ProjectPolicyReply:
        """Change the policy of a project.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ProjectPolicyRequestInput(
            project_id=project_id,
            expected_revision=expected_revision,
            change=change,
        ).to_dict()
        return ProjectPolicyReply._from_wire(await self._invoke(OPERATIONS["management.projectPolicy"], _input, request_id))

    async def credential_permit(
        self,
        *,
        project_id: str,
        delivery_id: str,
        redemption_request_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        """Issue a signed permit that authorizes redeeming one credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CredentialPermitRequestInput(
            project_id=project_id,
            delivery_id=delivery_id,
            redemption_request_id=redemption_request_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.credentialPermit"], _input, request_id)
        _value: dict[str, Any] = _envelope["result"]
        return _value

    async def pause_operation(
        self,
        *,
        operation_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Operation:
        """Pause a long-running operation.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = PauseOperationRequestInput(
            operation_id=operation_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.pauseOperation"], _input, request_id)
        return Operation._from_wire(_envelope["result"])

    async def resume_operation(
        self,
        *,
        operation_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Operation:
        """Resume a paused operation.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ResumeOperationRequestInput(
            operation_id=operation_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.resumeOperation"], _input, request_id)
        return Operation._from_wire(_envelope["result"])

    async def create_billing_checkout_session(
        self,
        *,
        org_id: str,
        plan_id: str,
        request_id: str | None = None,
    ) -> BillingCheckoutSession:
        """Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``singleUse``. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateBillingCheckoutSessionRequestInput(
            org_id=org_id,
            plan_id=plan_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.createBillingCheckoutSession"], _input, request_id)
        return BillingCheckoutSession._from_wire(_envelope["result"])

    async def create_billing_portal_session(
        self,
        *,
        org_id: str,
        request_id: str | None = None,
    ) -> BillingPortalSession:
        """Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``singleUse``. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateBillingPortalSessionRequestInput(
            org_id=org_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["management.createBillingPortalSession"], _input, request_id)
        return BillingPortalSession._from_wire(_envelope["result"])

    async def configure_webhook(
        self,
        *,
        project_id: str,
        url: str,
        event_types: Sequence[str],
        consent_ref: str,
        request_id: str | None = None,
    ) -> ConfigureWebhookReply:
        """Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ConfigureWebhookRequestInput(
            project_id=project_id,
            url=url,
            event_types=event_types,
            consent_ref=consent_ref,
        ).to_dict()
        return ConfigureWebhookReply._from_wire(await self._invoke(OPERATIONS["management.configureWebhook"], _input, request_id))

    async def update_webhook(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        expected_revision: str,
        event_types: Sequence[str],
        enabled: bool,
        request_id: str | None = None,
    ) -> UpdateWebhookReply:
        """Change the event types of a webhook endpoint, or enable or disable it.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = UpdateWebhookRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            expected_revision=expected_revision,
            event_types=event_types,
            enabled=enabled,
        ).to_dict()
        return UpdateWebhookReply._from_wire(await self._invoke(OPERATIONS["management.updateWebhook"], _input, request_id))

    async def rotate_webhook_secret(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> RotateWebhookSecretReply:
        """Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RotateWebhookSecretRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            expected_revision=expected_revision,
        ).to_dict()
        return RotateWebhookSecretReply._from_wire(await self._invoke(OPERATIONS["management.rotateWebhookSecret"], _input, request_id))

    async def disable_webhook(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> DisableWebhookReply:
        """Disable a webhook endpoint.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = DisableWebhookRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            expected_revision=expected_revision,
        ).to_dict()
        return DisableWebhookReply._from_wire(await self._invoke(OPERATIONS["management.disableWebhook"], _input, request_id))

    async def replay_webhook_deliveries(
        self,
        *,
        project_id: str,
        endpoint_id: str,
        effect_id: str | None = None,
        since: str | None = None,
        until: str | None = None,
        request_id: str | None = None,
    ) -> ReplayWebhookDeliveriesReply:
        """Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

        Authorization: ``portalCredential``, when ``owner``: The caller owns the organization, deployment or project.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`get_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = ReplayWebhookDeliveriesRequestInput(
            project_id=project_id,
            endpoint_id=endpoint_id,
            effect_id=effect_id,
            since=since,
            until=until,
        ).to_dict()
        return ReplayWebhookDeliveriesReply._from_wire(await self._invoke(OPERATIONS["management.replayWebhookDeliveries"], _input, request_id))
