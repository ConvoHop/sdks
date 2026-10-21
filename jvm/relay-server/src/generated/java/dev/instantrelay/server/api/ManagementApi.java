// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package dev.instantrelay.server.api;

import dev.instantrelay.server.internal.OperationExecutor;
import dev.instantrelay.server.internal.Wire;
import dev.instantrelay.server.model.CapabilitiesReply;
import dev.instantrelay.server.model.ConfigureWebhookReply;
import dev.instantrelay.server.model.ConfigureWebhookRequestInput;
import dev.instantrelay.server.model.CreateBillingCheckoutSessionReply;
import dev.instantrelay.server.model.CreateBillingCheckoutSessionRequestInput;
import dev.instantrelay.server.model.CreateBillingPortalSessionReply;
import dev.instantrelay.server.model.CreateBillingPortalSessionRequestInput;
import dev.instantrelay.server.model.CreateDeploymentReply;
import dev.instantrelay.server.model.CreateDeploymentRequestInput;
import dev.instantrelay.server.model.CreateOrganizationReply;
import dev.instantrelay.server.model.CreateOrganizationRequestInput;
import dev.instantrelay.server.model.CreateProjectReply;
import dev.instantrelay.server.model.CreateProjectRequestInput;
import dev.instantrelay.server.model.CredentialPermitReply;
import dev.instantrelay.server.model.CredentialPermitRequestInput;
import dev.instantrelay.server.model.DeploymentHealthReply;
import dev.instantrelay.server.model.DeploymentHealthRequestInput;
import dev.instantrelay.server.model.DeploymentUsageReply;
import dev.instantrelay.server.model.DeploymentUsageRequestInput;
import dev.instantrelay.server.model.DisableWebhookReply;
import dev.instantrelay.server.model.DisableWebhookRequestInput;
import dev.instantrelay.server.model.GetDeploymentReply;
import dev.instantrelay.server.model.GetDeploymentRequestInput;
import dev.instantrelay.server.model.GetOperationReply;
import dev.instantrelay.server.model.GetOperationRequestInput;
import dev.instantrelay.server.model.GetOrganizationReply;
import dev.instantrelay.server.model.GetOrganizationRequestInput;
import dev.instantrelay.server.model.GetProjectReply;
import dev.instantrelay.server.model.GetProjectRequestInput;
import dev.instantrelay.server.model.IssueBackendKeyReply;
import dev.instantrelay.server.model.IssueBackendKeyRequestInput;
import dev.instantrelay.server.model.OrganizationBillingReply;
import dev.instantrelay.server.model.OrganizationBillingRequestInput;
import dev.instantrelay.server.model.OrganizationUsageReply;
import dev.instantrelay.server.model.OrganizationUsageRequestInput;
import dev.instantrelay.server.model.OrganizationsReply;
import dev.instantrelay.server.model.PauseOperationReply;
import dev.instantrelay.server.model.PauseOperationRequestInput;
import dev.instantrelay.server.model.ProjectPolicyReply;
import dev.instantrelay.server.model.ProjectPolicyRequestInput;
import dev.instantrelay.server.model.ProjectUsageReply;
import dev.instantrelay.server.model.ProjectUsageRequestInput;
import dev.instantrelay.server.model.ReplayWebhookDeliveriesReply;
import dev.instantrelay.server.model.ReplayWebhookDeliveriesRequestInput;
import dev.instantrelay.server.model.ResolveRequestReply;
import dev.instantrelay.server.model.ResolveRequestRequestInput;
import dev.instantrelay.server.model.ResumeOperationReply;
import dev.instantrelay.server.model.ResumeOperationRequestInput;
import dev.instantrelay.server.model.RevokeBackendKeyReply;
import dev.instantrelay.server.model.RevokeBackendKeyRequestInput;
import dev.instantrelay.server.model.RotateWebhookSecretReply;
import dev.instantrelay.server.model.RotateWebhookSecretRequestInput;
import dev.instantrelay.server.model.UpdateWebhookReply;
import dev.instantrelay.server.model.UpdateWebhookRequestInput;
import dev.instantrelay.server.model.WebhookDeliveriesReply;
import dev.instantrelay.server.model.WebhookDeliveriesRequestInput;
import dev.instantrelay.server.model.WebhookEndpointsReply;
import dev.instantrelay.server.model.WebhookEndpointsRequestInput;
import org.jspecify.annotations.Nullable;

/**
 * The <code>management</code> plane: Organizations, deployments, projects, backend keys and webhooks.
 *
 * <p>Obtain an instance from a client; every call blocks until the authority answers or the request fails.
 */
public final class ManagementApi {
  private final OperationExecutor executor;

  /**
   * Binds the plane to an executor. Clients create instances; applications do not call this.
   *
   * @param executor the executor that sends requests
   */
  public ManagementApi(OperationExecutor executor) {
    this.executor = Wire.nonNull(executor, "executor");
  }

  /**
   * Describe the management features and limits the authority supports.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential.
   *
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CapabilitiesReply capabilities() {
    return this.executor.execute(Operations.MANAGEMENT_CAPABILITIES, null, null, null);
  }

  /**
   * List the organizations the caller can access.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential.
   *
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public OrganizationsReply organizations() {
    return this.executor.execute(Operations.MANAGEMENT_ORGANIZATIONS, null, null, null);
  }

  /**
   * Read an organization.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public GetOrganizationReply getOrganization(GetOrganizationRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_GET_ORGANIZATION, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read a deployment.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public GetDeploymentReply getDeployment(GetDeploymentRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_GET_DEPLOYMENT, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read a project.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public GetProjectReply getProject(GetProjectRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_GET_PROJECT, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the health of a deployment.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public DeploymentHealthReply deploymentHealth(DeploymentHealthRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_DEPLOYMENT_HEALTH, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public DeploymentUsageReply deploymentUsage(DeploymentUsageRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_DEPLOYMENT_USAGE, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ProjectUsageReply projectUsage(ProjectUsageRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_PROJECT_USAGE, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public OrganizationUsageReply organizationUsage(OrganizationUsageRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_ORGANIZATION_USAGE, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the billing state of an organization in any status: the plan whose limits apply, whether Relay bills the organization and, when it does, its standing and subscription.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public OrganizationBillingReply organizationBilling(OrganizationBillingRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_ORGANIZATION_BILLING, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public WebhookEndpointsReply webhookEndpoints(WebhookEndpointsRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_WEBHOOK_ENDPOINTS, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * List recent deliveries of a webhook endpoint.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public WebhookDeliveriesReply webhookDeliveries(WebhookDeliveriesRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_WEBHOOK_DELIVERIES, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Look up the stored outcome of an earlier management mutation by its requestId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition ownRequest).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ResolveRequestReply resolveRequest(ResolveRequestRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_RESOLVE_REQUEST, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the state of a long-running management operation.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public GetOperationReply getOperation(GetOperationRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_GET_OPERATION, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Create an organization.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential.
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateOrganizationReply createOrganization(CreateOrganizationRequestInput input) {
    return this.createOrganization(input, null);
  }

  /**
   * Create an organization.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential.
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateOrganizationReply createOrganization(CreateOrganizationRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_CREATE_ORGANIZATION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Create a deployment in an organization. Completes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateDeploymentReply createDeployment(CreateDeploymentRequestInput input) {
    return this.createDeployment(input, null);
  }

  /**
   * Create a deployment in an organization. Completes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateDeploymentReply createDeployment(CreateDeploymentRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_CREATE_DEPLOYMENT, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Create a project in a ready deployment. Completes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateProjectReply createProject(CreateProjectRequestInput input) {
    return this.createProject(input, null);
  }

  /**
   * Create a project in a ready deployment. Completes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateProjectReply createProject(CreateProjectRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_CREATE_PROJECT, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Issue a scoped backend key. The secret is delivered once through a credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public IssueBackendKeyReply issueBackendKey(IssueBackendKeyRequestInput input) {
    return this.issueBackendKey(input, null);
  }

  /**
   * Issue a scoped backend key. The secret is delivered once through a credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public IssueBackendKeyReply issueBackendKey(IssueBackendKeyRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_ISSUE_BACKEND_KEY, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Revoke a backend key, optionally revoking the sessions it issued.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RevokeBackendKeyReply revokeBackendKey(RevokeBackendKeyRequestInput input) {
    return this.revokeBackendKey(input, null);
  }

  /**
   * Revoke a backend key, optionally revoking the sessions it issued.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RevokeBackendKeyReply revokeBackendKey(RevokeBackendKeyRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_REVOKE_BACKEND_KEY, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Change the policy of a project.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ProjectPolicyReply projectPolicy(ProjectPolicyRequestInput input) {
    return this.projectPolicy(input, null);
  }

  /**
   * Change the policy of a project.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ProjectPolicyReply projectPolicy(ProjectPolicyRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_PROJECT_POLICY, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Issue a signed permit that authorizes redeeming one credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CredentialPermitReply credentialPermit(CredentialPermitRequestInput input) {
    return this.credentialPermit(input, null);
  }

  /**
   * Issue a signed permit that authorizes redeeming one credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CredentialPermitReply credentialPermit(CredentialPermitRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_CREDENTIAL_PERMIT, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Pause a long-running operation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public PauseOperationReply pauseOperation(PauseOperationRequestInput input) {
    return this.pauseOperation(input, null);
  }

  /**
   * Pause a long-running operation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public PauseOperationReply pauseOperation(PauseOperationRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_PAUSE_OPERATION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Resume a paused or blocked operation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ResumeOperationReply resumeOperation(ResumeOperationRequestInput input) {
    return this.resumeOperation(input, null);
  }

  /**
   * Resume a paused or blocked operation.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ResumeOperationReply resumeOperation(ResumeOperationRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_RESUME_OPERATION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.
   *
   * <p>Idempotency: <code>singleUse</code>. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateBillingCheckoutSessionReply createBillingCheckoutSession(CreateBillingCheckoutSessionRequestInput input) {
    return this.createBillingCheckoutSession(input, null);
  }

  /**
   * Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.
   *
   * <p>Idempotency: <code>singleUse</code>. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateBillingCheckoutSessionReply createBillingCheckoutSession(CreateBillingCheckoutSessionRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_CREATE_BILLING_CHECKOUT_SESSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.
   *
   * <p>Idempotency: <code>singleUse</code>. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateBillingPortalSessionReply createBillingPortalSession(CreateBillingPortalSessionRequestInput input) {
    return this.createBillingPortalSession(input, null);
  }

  /**
   * Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.
   *
   * <p>Idempotency: <code>singleUse</code>. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public CreateBillingPortalSessionReply createBillingPortalSession(CreateBillingPortalSessionRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_CREATE_BILLING_PORTAL_SESSION, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ConfigureWebhookReply configureWebhook(ConfigureWebhookRequestInput input) {
    return this.configureWebhook(input, null);
  }

  /**
   * Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ConfigureWebhookReply configureWebhook(ConfigureWebhookRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_CONFIGURE_WEBHOOK, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Change the event types of a webhook endpoint, or enable or disable it.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public UpdateWebhookReply updateWebhook(UpdateWebhookRequestInput input) {
    return this.updateWebhook(input, null);
  }

  /**
   * Change the event types of a webhook endpoint, or enable or disable it.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public UpdateWebhookReply updateWebhook(UpdateWebhookRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_UPDATE_WEBHOOK, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RotateWebhookSecretReply rotateWebhookSecret(RotateWebhookSecretRequestInput input) {
    return this.rotateWebhookSecret(input, null);
  }

  /**
   * Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RotateWebhookSecretReply rotateWebhookSecret(RotateWebhookSecretRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_ROTATE_WEBHOOK_SECRET, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Disable a webhook endpoint.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public DisableWebhookReply disableWebhook(DisableWebhookRequestInput input) {
    return this.disableWebhook(input, null);
  }

  /**
   * Disable a webhook endpoint.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public DisableWebhookReply disableWebhook(DisableWebhookRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_DISABLE_WEBHOOK, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ReplayWebhookDeliveriesReply replayWebhookDeliveries(ReplayWebhookDeliveriesRequestInput input) {
    return this.replayWebhookDeliveries(input, null);
  }

  /**
   * Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ReplayWebhookDeliveriesReply replayWebhookDeliveries(ReplayWebhookDeliveriesRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_REPLAY_WEBHOOK_DELIVERIES, Wire.nonNull(input, "input").toJson(), requestId, null);
  }
}
