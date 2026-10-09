using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Internal;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>Options for <see cref="ConvoHopManagementClient"/>.</summary>
    public sealed class ConvoHopManagementClientOptions
    {
        /// <summary>
        /// The authority origin: HTTPS, or explicit loopback HTTP for local development. Requests go to
        /// <c>{BaseUrl}/graphql</c>.
        /// </summary>
        public string BaseUrl { get; set; } = string.Empty;

        /// <summary>The operator access token. Keep it in trusted operator tooling; never log it or send it to clients.</summary>
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>The operator's actor ID, a canonical UUID. It scopes the recovery records.</summary>
        public string ActorId { get; set; } = string.Empty;

        /// <summary>
        /// Durable storage for mutation recovery records, so an uncertain mutation can be resolved after a restart. The
        /// records never contain the access token.
        /// </summary>
        public IRecoveryStorage? RecoveryStorage { get; set; }

        /// <summary>
        /// The HTTP client to send requests with. It must not follow redirects or add credentials of its own. Null uses a
        /// shared client that never follows redirects or stores cookies.
        /// </summary>
        public HttpClient? HttpClient { get; set; }

        /// <summary>The clock for timeouts and retry budgets. Defaults to <see cref="System.TimeProvider.System"/>.</summary>
        public TimeProvider? TimeProvider { get; set; }
    }

    /// <summary>Where and how a hosted deployment runs. Every value is required for a non-loopback authority.</summary>
    public sealed class DeploymentOptions
    {
        /// <summary>The offering, for example <c>managedShared</c>.</summary>
        public string Offering { get; set; } = string.Empty;

        /// <summary>The geography ID.</summary>
        public string GeoId { get; set; } = string.Empty;

        /// <summary>The installation profile ID.</summary>
        public string InstallationProfileId { get; set; } = string.Empty;

        /// <summary>The reference to the recorded consent for this deployment.</summary>
        public string ConsentRef { get; set; } = string.Empty;
    }

    /// <summary>The environment and backend principal of a hosted project.</summary>
    public sealed class ProjectOptions
    {
        /// <summary>The environment name, for example <c>production</c>.</summary>
        public string Environment { get; set; } = string.Empty;

        /// <summary>The name of the project's backend principal.</summary>
        public string BackendPrincipalName { get; set; } = string.Empty;
    }

    /// <summary>
    /// Operator-token client for organizations, deployments, projects and backend keys. Use it only in trusted operator
    /// tooling. Instances are thread-safe.
    /// </summary>
    /// <remarks>
    /// Mutations accept a <c>requestId</c>: after an outcome of <c>unknown</c>, call the method again with the same ID and
    /// payload, or retry it with <see cref="ConvoHopTransport.RetryAsync"/>. Never send the change again under a new ID.
    /// </remarks>
    public sealed class ConvoHopManagementClient
    {
        /// <summary>Creates a client. Construction sends no request.</summary>
        /// <param name="options">The client options.</param>
        /// <exception cref="ArgumentException">An option is invalid. The message never contains the access token.</exception>
        public ConvoHopManagementClient(ConvoHopManagementClientOptions options)
        {
            if (options == null) throw new ArgumentNullException(nameof(options));
            string actorId = ServerChecks.Id(options.ActorId, nameof(options.ActorId));
            if (string.IsNullOrEmpty(options.AccessToken)) throw new ArgumentException("An access token is required", nameof(options));
            Transport = new ConvoHopTransport(new ConvoHopTransportOptions
            {
                BaseUrl = options.BaseUrl,
                Credential = options.AccessToken,
                Namespace = "management:" + actorId,
                RecoveryStorage = options.RecoveryStorage,
                HttpClient = options.HttpClient,
                TimeProvider = options.TimeProvider,
            });
            Management = new Api.ManagementApi(new TransportExecutor(Transport, null));
        }

        /// <summary>The transport, for management operations without a typed method and for recovery records.</summary>
        public ConvoHopTransport Transport { get; }

        /// <summary>
        /// Every management query and mutation in the schema, with the generated inputs and replies. Unlike the helpers, it
        /// does not check that a result names the resource the request did.
        /// </summary>
        public Api.ManagementApi Management { get; }

        /// <summary>Creates an organization owned by the operator.</summary>
        /// <param name="name">The organization name.</param>
        /// <param name="termsRef">The reference to the accepted terms.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The organization.</returns>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Organization> CreateOrganizationAsync(string name, string termsRef, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new CreateOrganizationRequestInput(ServerChecks.Text(name, nameof(name)), ServerChecks.Text(termsRef, nameof(termsRef)));
            CreateOrganizationReply reply = await Transport.ExecuteAsync(Operations.Management.CreateOrganization, null, input, requestId,
                null, cancellationToken).ConfigureAwait(false);
            return ServerChecks.Required(reply.Result, reply.RequestId);
        }

        /// <summary>
        /// Requests a deployment. Without <paramref name="configuration"/>, a loopback authority gets the local single-node
        /// defaults; any other authority requires it.
        /// </summary>
        /// <param name="orgId">The organization ID.</param>
        /// <param name="configuration">The offering, geography, installation profile and consent reference.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The receipt; its operation tracks the provisioning.</returns>
        /// <exception cref="ArgumentException">An argument is invalid, or a hosted deployment has no configuration.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public Task<CreateDeploymentReply> CreateDeploymentAsync(string orgId, DeploymentOptions? configuration = null,
            string? requestId = null, CancellationToken cancellationToken = default)
        {
            string organization = ServerChecks.Id(orgId, nameof(orgId));
            if (configuration == null && !IsLoopback())
                throw new ArgumentException("Hosted deployment requires explicit offering, geoId, installationProfileId and consentRef",
                    nameof(configuration));
            DeploymentOptions values = configuration ?? new DeploymentOptions
            {
                Offering = "managedShared",
                GeoId = "local",
                InstallationProfileId = "local-single-node",
                ConsentRef = "local-development",
            };
            var input = new CreateDeploymentRequestInput(organization, values.Offering, values.GeoId, values.InstallationProfileId,
                values.ConsentRef);
            return Transport.ExecuteAsync(Operations.Management.CreateDeployment, null, input, requestId, null, cancellationToken);
        }

        /// <summary>
        /// Requests a project in a deployment. Without <paramref name="configuration"/>, a loopback authority gets the
        /// <c>local</c> environment and the <c>application-server</c> backend principal; any other authority requires it.
        /// </summary>
        /// <param name="deploymentId">The deployment ID.</param>
        /// <param name="name">The project name.</param>
        /// <param name="configuration">The environment and backend principal name.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The receipt; its result carries the project ID and incarnation once committed.</returns>
        /// <exception cref="ArgumentException">An argument is invalid, or a hosted project has no configuration.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public Task<CreateProjectReply> CreateProjectAsync(string deploymentId, string name, ProjectOptions? configuration = null,
            string? requestId = null, CancellationToken cancellationToken = default)
        {
            string deployment = ServerChecks.Id(deploymentId, nameof(deploymentId));
            ServerChecks.Text(name, nameof(name));
            if (configuration == null && !IsLoopback())
                throw new ArgumentException("Hosted project requires explicit environment and backendPrincipalName", nameof(configuration));
            ProjectOptions values = configuration ?? new ProjectOptions { Environment = "local", BackendPrincipalName = "application-server" };
            var input = new CreateProjectRequestInput(deployment, name, values.Environment, values.BackendPrincipalName);
            return Transport.ExecuteAsync(Operations.Management.CreateProject, null, input, requestId, null, cancellationToken);
        }

        /// <summary>Reads a management operation, such as deployment provisioning.</summary>
        /// <param name="operationId">The operation ID.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The operation.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<Operation> GetOperationAsync(string operationId, CancellationToken cancellationToken = default)
        {
            var input = new GetOperationRequestInput(ServerChecks.Id(operationId, nameof(operationId)));
            GetOperationReply reply = await Transport.ExecuteAsync(Operations.Management.GetOperation, null, input, null, null,
                cancellationToken).ConfigureAwait(false);
            return ServerChecks.Required(reply.Result, reply.RequestId);
        }

        /// <summary>
        /// Issues a backend key. The secret is delivered through a credential delivery, never in this response; see the
        /// result's <see cref="OperationResult.Delivery"/>.
        /// </summary>
        /// <param name="projectId">The project ID.</param>
        /// <param name="name">The key name.</param>
        /// <param name="scopes">The scopes the key grants, such as <c>messageWrite</c>.</param>
        /// <param name="expiresAt">When the key expires, as an RFC 3339 UTC timestamp.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The receipt.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public Task<IssueBackendKeyReply> IssueBackendKeyAsync(string projectId, string name, IReadOnlyList<string> scopes,
            string expiresAt, string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new IssueBackendKeyRequestInput(ServerChecks.Id(projectId, nameof(projectId)), ServerChecks.Text(name, nameof(name)),
                scopes ?? throw new ArgumentNullException(nameof(scopes)), ServerChecks.Text(expiresAt, nameof(expiresAt)));
            return Transport.ExecuteAsync(Operations.Management.IssueBackendKey, null, input, requestId, null, cancellationToken);
        }

        /// <summary>
        /// Obtains a single-use permit to redeem a credential delivery. Hand it, with the redemption request ID, to the
        /// process that redeems the delivery; treat it as a secret.
        /// </summary>
        /// <param name="projectId">The project ID.</param>
        /// <param name="deliveryId">The credential delivery ID.</param>
        /// <param name="redemptionRequestId">The request ID the redemption will use.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The permit object.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, its outcome is uncertain, or the permit is not an object.</exception>
        public async Task<JsonElement> GetDeliveryPermitAsync(string projectId, string deliveryId, string redemptionRequestId,
            string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new CredentialPermitRequestInput(ServerChecks.Id(projectId, nameof(projectId)),
                ServerChecks.Id(deliveryId, nameof(deliveryId)), ServerChecks.Id(redemptionRequestId, nameof(redemptionRequestId)));
            CredentialPermitReply reply = await Transport.ExecuteAsync(Operations.Management.CredentialPermit, null, input, requestId, null,
                cancellationToken).ConfigureAwait(false);
            if (reply.Result is not JsonElement permit || permit.ValueKind != JsonValueKind.Object)
                throw ServerChecks.Invalid("Expected a delivery permit object", reply.RequestId);
            return permit;
        }

        private bool IsLoopback() => Protocol.IsLoopbackHost(new Uri(Transport.BaseUrl));
    }
}
