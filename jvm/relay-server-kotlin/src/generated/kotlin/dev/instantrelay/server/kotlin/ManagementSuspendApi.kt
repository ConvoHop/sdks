// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package dev.instantrelay.server.kotlin

import dev.instantrelay.server.api.ManagementApi
import dev.instantrelay.server.model.AgentAuditEventPage
import dev.instantrelay.server.model.AgentAuditEventsReply
import dev.instantrelay.server.model.AgentAuditEventsRequestInput
import dev.instantrelay.server.model.AgentCredentialPermitReply
import dev.instantrelay.server.model.AgentCredentialPermitRequestInput
import dev.instantrelay.server.model.AgentGrantPage
import dev.instantrelay.server.model.AgentGrantsReply
import dev.instantrelay.server.model.AgentGrantsRequestInput
import dev.instantrelay.server.model.AgentSignupForApprovalReply
import dev.instantrelay.server.model.AgentSignupForApprovalRequestInput
import dev.instantrelay.server.model.AgentSignupReply
import dev.instantrelay.server.model.ApproveAgentSignupReply
import dev.instantrelay.server.model.ApproveAgentSignupRequestInput
import dev.instantrelay.server.model.CapabilitiesReply
import dev.instantrelay.server.model.ConfigureWebhookReply
import dev.instantrelay.server.model.ConfigureWebhookRequestInput
import dev.instantrelay.server.model.CreateBillingCheckoutSessionReply
import dev.instantrelay.server.model.CreateBillingCheckoutSessionRequestInput
import dev.instantrelay.server.model.CreateBillingPortalSessionReply
import dev.instantrelay.server.model.CreateBillingPortalSessionRequestInput
import dev.instantrelay.server.model.CreateDeploymentReply
import dev.instantrelay.server.model.CreateDeploymentRequestInput
import dev.instantrelay.server.model.CreateOrganizationReply
import dev.instantrelay.server.model.CreateOrganizationRequestInput
import dev.instantrelay.server.model.CreateProjectReply
import dev.instantrelay.server.model.CreateProjectRequestInput
import dev.instantrelay.server.model.CredentialPermitReply
import dev.instantrelay.server.model.CredentialPermitRequestInput
import dev.instantrelay.server.model.DeploymentHealthReply
import dev.instantrelay.server.model.DeploymentHealthRequestInput
import dev.instantrelay.server.model.DeploymentUsageReply
import dev.instantrelay.server.model.DeploymentUsageRequestInput
import dev.instantrelay.server.model.DisableWebhookReply
import dev.instantrelay.server.model.DisableWebhookRequestInput
import dev.instantrelay.server.model.GetDeploymentReply
import dev.instantrelay.server.model.GetDeploymentRequestInput
import dev.instantrelay.server.model.GetOperationReply
import dev.instantrelay.server.model.GetOperationRequestInput
import dev.instantrelay.server.model.GetOrganizationReply
import dev.instantrelay.server.model.GetOrganizationRequestInput
import dev.instantrelay.server.model.GetProjectReply
import dev.instantrelay.server.model.GetProjectRequestInput
import dev.instantrelay.server.model.IssueAgentKeyReply
import dev.instantrelay.server.model.IssueAgentKeyRequestInput
import dev.instantrelay.server.model.IssueBackendKeyReply
import dev.instantrelay.server.model.IssueBackendKeyRequestInput
import dev.instantrelay.server.model.OrganizationBillingReply
import dev.instantrelay.server.model.OrganizationBillingRequestInput
import dev.instantrelay.server.model.OrganizationSpendReply
import dev.instantrelay.server.model.OrganizationSpendRequestInput
import dev.instantrelay.server.model.OrganizationUsageReply
import dev.instantrelay.server.model.OrganizationUsageRequestInput
import dev.instantrelay.server.model.OrganizationsReply
import dev.instantrelay.server.model.PauseOperationReply
import dev.instantrelay.server.model.PauseOperationRequestInput
import dev.instantrelay.server.model.ProjectPolicyReply
import dev.instantrelay.server.model.ProjectPolicyRequestInput
import dev.instantrelay.server.model.ProjectUsageReply
import dev.instantrelay.server.model.ProjectUsageRequestInput
import dev.instantrelay.server.model.PurchaseAgentCreditsReply
import dev.instantrelay.server.model.PurchaseAgentCreditsRequestInput
import dev.instantrelay.server.model.RejectAgentSignupReply
import dev.instantrelay.server.model.RejectAgentSignupRequestInput
import dev.instantrelay.server.model.ReplayWebhookDeliveriesReply
import dev.instantrelay.server.model.ReplayWebhookDeliveriesRequestInput
import dev.instantrelay.server.model.RequestAgentSignupReply
import dev.instantrelay.server.model.RequestAgentSignupRequestInput
import dev.instantrelay.server.model.ResolveRequestReply
import dev.instantrelay.server.model.ResolveRequestRequestInput
import dev.instantrelay.server.model.ResumeOperationReply
import dev.instantrelay.server.model.ResumeOperationRequestInput
import dev.instantrelay.server.model.RevokeAgentGrantReply
import dev.instantrelay.server.model.RevokeAgentGrantRequestInput
import dev.instantrelay.server.model.RevokeBackendKeyReply
import dev.instantrelay.server.model.RevokeBackendKeyRequestInput
import dev.instantrelay.server.model.RotateWebhookSecretReply
import dev.instantrelay.server.model.RotateWebhookSecretRequestInput
import dev.instantrelay.server.model.SetSpendControlsReply
import dev.instantrelay.server.model.SetSpendControlsRequestInput
import dev.instantrelay.server.model.UpdateWebhookReply
import dev.instantrelay.server.model.UpdateWebhookRequestInput
import dev.instantrelay.server.model.WebhookDeliveriesReply
import dev.instantrelay.server.model.WebhookDeliveriesRequestInput
import dev.instantrelay.server.model.WebhookEndpointsReply
import dev.instantrelay.server.model.WebhookEndpointsRequestInput
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow

/**
 * Suspending view of [ManagementApi]. Each call runs on [dispatcher]. Cancelling the calling
 * coroutine interrupts the blocking request and the call fails with a CancellationException
 * whose cause is the lost-request problem; a mutation stays in the client's recovery journal.
 */
public class ManagementSuspendApi(
    private val api: ManagementApi,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    /** Suspending [ManagementApi.capabilities]. */
    public suspend fun capabilities(): CapabilitiesReply =
        interruptible(dispatcher) { api.capabilities() }

    /** Suspending [ManagementApi.organizations]. */
    public suspend fun organizations(): OrganizationsReply =
        interruptible(dispatcher) { api.organizations() }

    /** Suspending [ManagementApi.getOrganization]. */
    public suspend fun getOrganization(input: GetOrganizationRequestInput): GetOrganizationReply =
        interruptible(dispatcher) { api.getOrganization(input) }

    /** Suspending [ManagementApi.getDeployment]. */
    public suspend fun getDeployment(input: GetDeploymentRequestInput): GetDeploymentReply =
        interruptible(dispatcher) { api.getDeployment(input) }

    /** Suspending [ManagementApi.getProject]. */
    public suspend fun getProject(input: GetProjectRequestInput): GetProjectReply =
        interruptible(dispatcher) { api.getProject(input) }

    /** Suspending [ManagementApi.deploymentHealth]. */
    public suspend fun deploymentHealth(input: DeploymentHealthRequestInput): DeploymentHealthReply =
        interruptible(dispatcher) { api.deploymentHealth(input) }

    /** Suspending [ManagementApi.deploymentUsage]. */
    public suspend fun deploymentUsage(input: DeploymentUsageRequestInput): DeploymentUsageReply =
        interruptible(dispatcher) { api.deploymentUsage(input) }

    /** Suspending [ManagementApi.projectUsage]. */
    public suspend fun projectUsage(input: ProjectUsageRequestInput): ProjectUsageReply =
        interruptible(dispatcher) { api.projectUsage(input) }

    /** Suspending [ManagementApi.organizationUsage]. */
    public suspend fun organizationUsage(input: OrganizationUsageRequestInput): OrganizationUsageReply =
        interruptible(dispatcher) { api.organizationUsage(input) }

    /** Suspending [ManagementApi.organizationBilling]. */
    public suspend fun organizationBilling(input: OrganizationBillingRequestInput): OrganizationBillingReply =
        interruptible(dispatcher) { api.organizationBilling(input) }

    /** Suspending [ManagementApi.webhookEndpoints]. */
    public suspend fun webhookEndpoints(input: WebhookEndpointsRequestInput): WebhookEndpointsReply =
        interruptible(dispatcher) { api.webhookEndpoints(input) }

    /** Suspending [ManagementApi.webhookDeliveries]. */
    public suspend fun webhookDeliveries(input: WebhookDeliveriesRequestInput): WebhookDeliveriesReply =
        interruptible(dispatcher) { api.webhookDeliveries(input) }

    /** Suspending [ManagementApi.resolveRequest]. */
    public suspend fun resolveRequest(input: ResolveRequestRequestInput): ResolveRequestReply =
        interruptible(dispatcher) { api.resolveRequest(input) }

    /** Suspending [ManagementApi.getOperation]. */
    public suspend fun getOperation(input: GetOperationRequestInput): GetOperationReply =
        interruptible(dispatcher) { api.getOperation(input) }

    /** Suspending [ManagementApi.agentSignupForApproval]. */
    public suspend fun agentSignupForApproval(input: AgentSignupForApprovalRequestInput): AgentSignupForApprovalReply =
        interruptible(dispatcher) { api.agentSignupForApproval(input) }

    /** Suspending [ManagementApi.agentSignup]. */
    public suspend fun agentSignup(): AgentSignupReply =
        interruptible(dispatcher) { api.agentSignup() }

    /** Suspending [ManagementApi.agentGrants]. */
    public suspend fun agentGrants(input: AgentGrantsRequestInput): AgentGrantsReply =
        interruptible(dispatcher) { api.agentGrants(input) }

    /**
     * [ManagementApi.agentGrantsPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun agentGrantsPages(input: AgentGrantsRequestInput): Flow<AgentGrantPage> =
        pageFlow(dispatcher, api.agentGrantsPages(input))

    /** Suspending [ManagementApi.agentAuditEvents]. */
    public suspend fun agentAuditEvents(input: AgentAuditEventsRequestInput): AgentAuditEventsReply =
        interruptible(dispatcher) { api.agentAuditEvents(input) }

    /**
     * [ManagementApi.agentAuditEventsPages] as a cold flow. Each collection starts again from [input], and each page is requested
     * on [dispatcher] when the collector is ready for it.
     */
    public fun agentAuditEventsPages(input: AgentAuditEventsRequestInput): Flow<AgentAuditEventPage> =
        pageFlow(dispatcher, api.agentAuditEventsPages(input))

    /** Suspending [ManagementApi.organizationSpend]. */
    public suspend fun organizationSpend(input: OrganizationSpendRequestInput): OrganizationSpendReply =
        interruptible(dispatcher) { api.organizationSpend(input) }

    /** Suspending [ManagementApi.createOrganization]. */
    public suspend fun createOrganization(input: CreateOrganizationRequestInput, requestId: String? = null): CreateOrganizationReply =
        interruptible(dispatcher) { api.createOrganization(input, requestId) }

    /** Suspending [ManagementApi.createDeployment]. */
    public suspend fun createDeployment(input: CreateDeploymentRequestInput, requestId: String? = null): CreateDeploymentReply =
        interruptible(dispatcher) { api.createDeployment(input, requestId) }

    /** Suspending [ManagementApi.createProject]. */
    public suspend fun createProject(input: CreateProjectRequestInput, requestId: String? = null): CreateProjectReply =
        interruptible(dispatcher) { api.createProject(input, requestId) }

    /** Suspending [ManagementApi.issueBackendKey]. */
    public suspend fun issueBackendKey(input: IssueBackendKeyRequestInput, requestId: String? = null): IssueBackendKeyReply =
        interruptible(dispatcher) { api.issueBackendKey(input, requestId) }

    /** Suspending [ManagementApi.revokeBackendKey]. */
    public suspend fun revokeBackendKey(input: RevokeBackendKeyRequestInput, requestId: String? = null): RevokeBackendKeyReply =
        interruptible(dispatcher) { api.revokeBackendKey(input, requestId) }

    /** Suspending [ManagementApi.projectPolicy]. */
    public suspend fun projectPolicy(input: ProjectPolicyRequestInput, requestId: String? = null): ProjectPolicyReply =
        interruptible(dispatcher) { api.projectPolicy(input, requestId) }

    /** Suspending [ManagementApi.credentialPermit]. */
    public suspend fun credentialPermit(input: CredentialPermitRequestInput, requestId: String? = null): CredentialPermitReply =
        interruptible(dispatcher) { api.credentialPermit(input, requestId) }

    /** Suspending [ManagementApi.pauseOperation]. */
    public suspend fun pauseOperation(input: PauseOperationRequestInput, requestId: String? = null): PauseOperationReply =
        interruptible(dispatcher) { api.pauseOperation(input, requestId) }

    /** Suspending [ManagementApi.resumeOperation]. */
    public suspend fun resumeOperation(input: ResumeOperationRequestInput, requestId: String? = null): ResumeOperationReply =
        interruptible(dispatcher) { api.resumeOperation(input, requestId) }

    /** Suspending [ManagementApi.createBillingCheckoutSession]. */
    public suspend fun createBillingCheckoutSession(input: CreateBillingCheckoutSessionRequestInput, requestId: String? = null): CreateBillingCheckoutSessionReply =
        interruptible(dispatcher) { api.createBillingCheckoutSession(input, requestId) }

    /** Suspending [ManagementApi.createBillingPortalSession]. */
    public suspend fun createBillingPortalSession(input: CreateBillingPortalSessionRequestInput, requestId: String? = null): CreateBillingPortalSessionReply =
        interruptible(dispatcher) { api.createBillingPortalSession(input, requestId) }

    /** Suspending [ManagementApi.configureWebhook]. */
    public suspend fun configureWebhook(input: ConfigureWebhookRequestInput, requestId: String? = null): ConfigureWebhookReply =
        interruptible(dispatcher) { api.configureWebhook(input, requestId) }

    /** Suspending [ManagementApi.updateWebhook]. */
    public suspend fun updateWebhook(input: UpdateWebhookRequestInput, requestId: String? = null): UpdateWebhookReply =
        interruptible(dispatcher) { api.updateWebhook(input, requestId) }

    /** Suspending [ManagementApi.rotateWebhookSecret]. */
    public suspend fun rotateWebhookSecret(input: RotateWebhookSecretRequestInput, requestId: String? = null): RotateWebhookSecretReply =
        interruptible(dispatcher) { api.rotateWebhookSecret(input, requestId) }

    /** Suspending [ManagementApi.disableWebhook]. */
    public suspend fun disableWebhook(input: DisableWebhookRequestInput, requestId: String? = null): DisableWebhookReply =
        interruptible(dispatcher) { api.disableWebhook(input, requestId) }

    /** Suspending [ManagementApi.replayWebhookDeliveries]. */
    public suspend fun replayWebhookDeliveries(input: ReplayWebhookDeliveriesRequestInput, requestId: String? = null): ReplayWebhookDeliveriesReply =
        interruptible(dispatcher) { api.replayWebhookDeliveries(input, requestId) }

    /** Suspending [ManagementApi.requestAgentSignup]. */
    public suspend fun requestAgentSignup(input: RequestAgentSignupRequestInput, requestId: String? = null): RequestAgentSignupReply =
        interruptible(dispatcher) { api.requestAgentSignup(input, requestId) }

    /** Suspending [ManagementApi.rejectAgentSignup]. */
    public suspend fun rejectAgentSignup(input: RejectAgentSignupRequestInput, requestId: String? = null): RejectAgentSignupReply =
        interruptible(dispatcher) { api.rejectAgentSignup(input, requestId) }

    /** Suspending [ManagementApi.approveAgentSignup]. */
    public suspend fun approveAgentSignup(input: ApproveAgentSignupRequestInput, requestId: String? = null): ApproveAgentSignupReply =
        interruptible(dispatcher) { api.approveAgentSignup(input, requestId) }

    /** Suspending [ManagementApi.issueAgentKey]. */
    public suspend fun issueAgentKey(input: IssueAgentKeyRequestInput, requestId: String? = null): IssueAgentKeyReply =
        interruptible(dispatcher) { api.issueAgentKey(input, requestId) }

    /** Suspending [ManagementApi.agentCredentialPermit]. */
    public suspend fun agentCredentialPermit(input: AgentCredentialPermitRequestInput, requestId: String? = null): AgentCredentialPermitReply =
        interruptible(dispatcher) { api.agentCredentialPermit(input, requestId) }

    /** Suspending [ManagementApi.revokeAgentGrant]. */
    public suspend fun revokeAgentGrant(input: RevokeAgentGrantRequestInput, requestId: String? = null): RevokeAgentGrantReply =
        interruptible(dispatcher) { api.revokeAgentGrant(input, requestId) }

    /** Suspending [ManagementApi.setSpendControls]. */
    public suspend fun setSpendControls(input: SetSpendControlsRequestInput, requestId: String? = null): SetSpendControlsReply =
        interruptible(dispatcher) { api.setSpendControls(input, requestId) }

    /** Suspending [ManagementApi.purchaseAgentCredits]. */
    public suspend fun purchaseAgentCredits(input: PurchaseAgentCreditsRequestInput, requestId: String? = null): PurchaseAgentCreditsReply =
        interruptible(dispatcher) { api.purchaseAgentCredits(input, requestId) }
}

/** A suspending view of this plane API whose calls run on [dispatcher]. */
public fun ManagementApi.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): ManagementSuspendApi =
    ManagementSuspendApi(this, dispatcher)
