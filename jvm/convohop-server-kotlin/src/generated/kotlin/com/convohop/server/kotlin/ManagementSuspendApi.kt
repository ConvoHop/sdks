// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.kotlin

import com.convohop.server.api.ManagementApi
import com.convohop.server.model.CapabilitiesReply
import com.convohop.server.model.ConfigureWebhookReply
import com.convohop.server.model.ConfigureWebhookRequestInput
import com.convohop.server.model.CreateDeploymentReply
import com.convohop.server.model.CreateDeploymentRequestInput
import com.convohop.server.model.CreateOrganizationReply
import com.convohop.server.model.CreateOrganizationRequestInput
import com.convohop.server.model.CreateProjectReply
import com.convohop.server.model.CreateProjectRequestInput
import com.convohop.server.model.CredentialPermitReply
import com.convohop.server.model.CredentialPermitRequestInput
import com.convohop.server.model.DeploymentHealthReply
import com.convohop.server.model.DeploymentHealthRequestInput
import com.convohop.server.model.DeploymentUsageReply
import com.convohop.server.model.DeploymentUsageRequestInput
import com.convohop.server.model.DisableWebhookReply
import com.convohop.server.model.DisableWebhookRequestInput
import com.convohop.server.model.GetDeploymentReply
import com.convohop.server.model.GetDeploymentRequestInput
import com.convohop.server.model.GetOperationReply
import com.convohop.server.model.GetOperationRequestInput
import com.convohop.server.model.GetOrganizationReply
import com.convohop.server.model.GetOrganizationRequestInput
import com.convohop.server.model.GetProjectReply
import com.convohop.server.model.GetProjectRequestInput
import com.convohop.server.model.IssueBackendKeyReply
import com.convohop.server.model.IssueBackendKeyRequestInput
import com.convohop.server.model.OrganizationUsageReply
import com.convohop.server.model.OrganizationUsageRequestInput
import com.convohop.server.model.OrganizationsReply
import com.convohop.server.model.PauseOperationReply
import com.convohop.server.model.PauseOperationRequestInput
import com.convohop.server.model.ProjectPolicyReply
import com.convohop.server.model.ProjectPolicyRequestInput
import com.convohop.server.model.ProjectUsageReply
import com.convohop.server.model.ProjectUsageRequestInput
import com.convohop.server.model.ReplayWebhookDeliveriesReply
import com.convohop.server.model.ReplayWebhookDeliveriesRequestInput
import com.convohop.server.model.ResolveRequestReply
import com.convohop.server.model.ResolveRequestRequestInput
import com.convohop.server.model.ResumeOperationReply
import com.convohop.server.model.ResumeOperationRequestInput
import com.convohop.server.model.RevokeBackendKeyReply
import com.convohop.server.model.RevokeBackendKeyRequestInput
import com.convohop.server.model.RotateWebhookSecretReply
import com.convohop.server.model.RotateWebhookSecretRequestInput
import com.convohop.server.model.UpdateWebhookReply
import com.convohop.server.model.UpdateWebhookRequestInput
import com.convohop.server.model.WebhookDeliveriesReply
import com.convohop.server.model.WebhookDeliveriesRequestInput
import com.convohop.server.model.WebhookEndpointsReply
import com.convohop.server.model.WebhookEndpointsRequestInput
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

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
}

/** A suspending view of this plane API whose calls run on [dispatcher]. */
public fun ManagementApi.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): ManagementSuspendApi =
    ManagementSuspendApi(this, dispatcher)
