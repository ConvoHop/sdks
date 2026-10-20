// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package dev.instantrelay.server.api;

import dev.instantrelay.server.internal.OperationExecutor;
import dev.instantrelay.server.internal.Pages;
import dev.instantrelay.server.internal.Wire;
import dev.instantrelay.server.model.AgentAuditEventPage;
import dev.instantrelay.server.model.AgentAuditEventsReply;
import dev.instantrelay.server.model.AgentAuditEventsRequestInput;
import dev.instantrelay.server.model.AgentCredentialPermitReply;
import dev.instantrelay.server.model.AgentCredentialPermitRequestInput;
import dev.instantrelay.server.model.AgentGrantPage;
import dev.instantrelay.server.model.AgentGrantsReply;
import dev.instantrelay.server.model.AgentGrantsRequestInput;
import dev.instantrelay.server.model.AgentSignupForApprovalReply;
import dev.instantrelay.server.model.AgentSignupForApprovalRequestInput;
import dev.instantrelay.server.model.AgentSignupReply;
import dev.instantrelay.server.model.ApproveAgentSignupReply;
import dev.instantrelay.server.model.ApproveAgentSignupRequestInput;
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
import dev.instantrelay.server.model.IssueAgentKeyReply;
import dev.instantrelay.server.model.IssueAgentKeyRequestInput;
import dev.instantrelay.server.model.IssueBackendKeyReply;
import dev.instantrelay.server.model.IssueBackendKeyRequestInput;
import dev.instantrelay.server.model.OrganizationBillingReply;
import dev.instantrelay.server.model.OrganizationBillingRequestInput;
import dev.instantrelay.server.model.OrganizationSpendReply;
import dev.instantrelay.server.model.OrganizationSpendRequestInput;
import dev.instantrelay.server.model.OrganizationUsageReply;
import dev.instantrelay.server.model.OrganizationUsageRequestInput;
import dev.instantrelay.server.model.OrganizationsReply;
import dev.instantrelay.server.model.PauseOperationReply;
import dev.instantrelay.server.model.PauseOperationRequestInput;
import dev.instantrelay.server.model.ProjectPolicyReply;
import dev.instantrelay.server.model.ProjectPolicyRequestInput;
import dev.instantrelay.server.model.ProjectUsageReply;
import dev.instantrelay.server.model.ProjectUsageRequestInput;
import dev.instantrelay.server.model.PurchaseAgentCreditsReply;
import dev.instantrelay.server.model.PurchaseAgentCreditsRequestInput;
import dev.instantrelay.server.model.RejectAgentSignupReply;
import dev.instantrelay.server.model.RejectAgentSignupRequestInput;
import dev.instantrelay.server.model.ReplayWebhookDeliveriesReply;
import dev.instantrelay.server.model.ReplayWebhookDeliveriesRequestInput;
import dev.instantrelay.server.model.RequestAgentSignupReply;
import dev.instantrelay.server.model.RequestAgentSignupRequestInput;
import dev.instantrelay.server.model.ResolveRequestReply;
import dev.instantrelay.server.model.ResolveRequestRequestInput;
import dev.instantrelay.server.model.ResumeOperationReply;
import dev.instantrelay.server.model.ResumeOperationRequestInput;
import dev.instantrelay.server.model.RevokeAgentGrantReply;
import dev.instantrelay.server.model.RevokeAgentGrantRequestInput;
import dev.instantrelay.server.model.RevokeBackendKeyReply;
import dev.instantrelay.server.model.RevokeBackendKeyRequestInput;
import dev.instantrelay.server.model.RotateWebhookSecretReply;
import dev.instantrelay.server.model.RotateWebhookSecretRequestInput;
import dev.instantrelay.server.model.SetSpendControlsReply;
import dev.instantrelay.server.model.SetSpendControlsRequestInput;
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
   * Read a pending agent signup request for its approval page, with the agent's suggested plan, scopes and monthly spend cap.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: anonymous (condition approvalToken).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public AgentSignupForApprovalReply agentSignupForApproval(AgentSignupForApprovalRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_AGENT_SIGNUP_FOR_APPROVAL, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Read the agent's own signup: its state and, once approved, the organization, project, grant scopes and expiry, and keys. Poll no more often than the ticket's pollAfterSeconds.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: agentVerifier (condition ownSignup).
   *
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public AgentSignupReply agentSignup() {
    return this.executor.execute(Operations.MANAGEMENT_AGENT_SIGNUP, null, null, null);
  }

  /**
   * List an organization's agent grants with their keys, newest first.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public AgentGrantsReply agentGrants(AgentGrantsRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_AGENT_GRANTS, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #agentGrants(AgentGrantsRequestInput)}, each requested when iteration reaches it. Later requests set <code>cursor</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>cursor</code>. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.
   *
   * <p>Iteration throws {@link dev.instantrelay.server.RelayProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>cursor</code> is not a valid cursor
   */
  public Iterable<AgentGrantPage> agentGrantsPages(AgentGrantsRequestInput input) {
    return Pages.<AgentGrantsReply, AgentGrantPage>of(
        this.executor, Operations.MANAGEMENT_AGENT_GRANTS, Wire.nonNull(input, "input").toJson(), "cursor", Wire.STRING,
        Pages.Order.OPAQUE, AgentGrantsReply::getResult, AgentGrantPage::getComplete, AgentGrantPage::getRefreshRequired,
        AgentGrantPage::getNextCursor);
  }

  /**
   * List an organization's agent audit trail, newest first: the approval, provisioning, keys, revocations, spend-control changes and purchases.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public AgentAuditEventsReply agentAuditEvents(AgentAuditEventsRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_AGENT_AUDIT_EVENTS, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Every page of {@link #agentAuditEvents(AgentAuditEventsRequestInput)}, each requested when iteration reaches it. Later requests set <code>cursor</code> to the previous page's <code>nextCursor</code>, and iteration ends after the page whose <code>complete</code> is true. Each iteration starts again from <code>input</code>, and every request has a new request ID.
   *
   * <p>Pagination: <code>cursor</code>. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.
   *
   * <p>Iteration throws {@link dev.instantrelay.server.RelayProblem} if the authority rejects a request or a page is malformed or does not advance, and {@link IllegalStateException} if a page reports <code>refreshRequired</code>: start again from current state, not from the cursor.
   *
   * @param input the first page's input
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's <code>cursor</code> is not a valid cursor
   */
  public Iterable<AgentAuditEventPage> agentAuditEventsPages(AgentAuditEventsRequestInput input) {
    return Pages.<AgentAuditEventsReply, AgentAuditEventPage>of(
        this.executor, Operations.MANAGEMENT_AGENT_AUDIT_EVENTS, Wire.nonNull(input, "input").toJson(), "cursor", Wire.STRING,
        Pages.Order.OPAQUE, AgentAuditEventsReply::getResult, AgentAuditEventPage::getComplete, AgentAuditEventPage::getRefreshRequired,
        AgentAuditEventPage::getNextCursor);
  }

  /**
   * Read the organization's spend this month: its cap, credits, minimum credit, charge limit, charges, margin, spend stop and the freshness of its usage.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely; each attempt may use a new requestId.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public OrganizationSpendReply organizationSpend(OrganizationSpendRequestInput input) {
    return this.executor.execute(Operations.MANAGEMENT_ORGANIZATION_SPEND, Wire.nonNull(input, "input").toJson(), null, null);
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

  /**
   * Request an organization for a named human owner, who approves it from an emailed link. Nothing is usable before approval.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: anonymous.
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RequestAgentSignupReply requestAgentSignup(RequestAgentSignupRequestInput input) {
    return this.requestAgentSignup(input, null);
  }

  /**
   * Request an organization for a named human owner, who approves it from an emailed link. Nothing is usable before approval.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: anonymous.
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RequestAgentSignupReply requestAgentSignup(RequestAgentSignupRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_REQUEST_AGENT_SIGNUP, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Reject a signup request from its approval link, optionally suppressing future requests to the email.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: anonymous (condition approvalToken).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RejectAgentSignupReply rejectAgentSignup(RejectAgentSignupRequestInput input) {
    return this.rejectAgentSignup(input, null);
  }

  /**
   * Reject a signup request from its approval link, optionally suppressing future requests to the email.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: anonymous (condition approvalToken).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RejectAgentSignupReply rejectAgentSignup(RejectAgentSignupRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_REJECT_AGENT_SIGNUP, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Approve a signup request with its approval token and the agent's confirmation code, choosing the plan, scopes, monthly spend cap, agent purchase limit and grant expiry. The signed-in approver becomes the owner.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition approvalToken).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ApproveAgentSignupReply approveAgentSignup(ApproveAgentSignupRequestInput input) {
    return this.approveAgentSignup(input, null);
  }

  /**
   * Approve a signup request with its approval token and the agent's confirmation code, choosing the plan, scopes, monthly spend cap, agent purchase limit and grant expiry. The signed-in approver becomes the owner.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition approvalToken).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public ApproveAgentSignupReply approveAgentSignup(ApproveAgentSignupRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_APPROVE_AGENT_SIGNUP, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Issue a backend key for the agent within its grant's scopes and expiry. The result is the pending key; poll agentSignup until it shows the key's delivery, then redeem it with agentCredentialPermit.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: agentVerifier (condition activeGrant).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public IssueAgentKeyReply issueAgentKey(IssueAgentKeyRequestInput input) {
    return this.issueAgentKey(input, null);
  }

  /**
   * Issue a backend key for the agent within its grant's scopes and expiry. The result is the pending key; poll agentSignup until it shows the key's delivery, then redeem it with agentCredentialPermit.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: agentVerifier (condition activeGrant).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public IssueAgentKeyReply issueAgentKey(IssueAgentKeyRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_ISSUE_AGENT_KEY, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Issue a permit that authorizes the agent to redeem one of its key deliveries.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: agentVerifier (condition activeGrant).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public AgentCredentialPermitReply agentCredentialPermit(AgentCredentialPermitRequestInput input) {
    return this.agentCredentialPermit(input, null);
  }

  /**
   * Issue a permit that authorizes the agent to redeem one of its key deliveries.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: agentVerifier (condition activeGrant).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public AgentCredentialPermitReply agentCredentialPermit(AgentCredentialPermitRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_AGENT_CREDENTIAL_PERMIT, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Revoke an agent grant and every key issued under it.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public RevokeAgentGrantReply revokeAgentGrant(RevokeAgentGrantRequestInput input) {
    return this.revokeAgentGrant(input, null);
  }

  /**
   * Revoke an agent grant and every key issued under it.
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
  public RevokeAgentGrantReply revokeAgentGrant(RevokeAgentGrantRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_REVOKE_AGENT_GRANT, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Set the organization's monthly spend cap and agent purchase limit.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: portalCredential (condition owner).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public SetSpendControlsReply setSpendControls(SetSpendControlsRequestInput input) {
    return this.setSpendControls(input, null);
  }

  /**
   * Set the organization's monthly spend cap and agent purchase limit.
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
  public SetSpendControlsReply setSpendControls(SetSpendControlsRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_SET_SPEND_CONTROLS, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Buy prepaid credits with a Shared Payment Token, within the owner's agent purchase limit.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: agentVerifier (condition activeGrant).
   *
   * @param input the operation input
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public PurchaseAgentCreditsReply purchaseAgentCredits(PurchaseAgentCreditsRequestInput input) {
    return this.purchaseAgentCredits(input, null);
  }

  /**
   * Buy prepaid credits with a Shared Payment Token, within the owner's agent purchase limit.
   *
   * <p>Idempotency: <code>replayOnly</code>. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
   *
   * <p>Authorization: agentVerifier (condition activeGrant).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws dev.instantrelay.server.RelayProblem if the authority rejects the request or its outcome is unknown
   */
  public PurchaseAgentCreditsReply purchaseAgentCredits(PurchaseAgentCreditsRequestInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.MANAGEMENT_PURCHASE_AGENT_CREDITS, Wire.nonNull(input, "input").toJson(), requestId, null);
  }
}
