using System;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>Creates, reads and disables principals, the project's application users.</summary>
    public sealed class ServerPrincipals
    {
        private readonly ProjectServerClient _client;

        internal ServerPrincipals(ProjectServerClient client) => _client = client;

        /// <summary>Creates the principal for an external user, or returns the existing one (<c>principalManage</c>).</summary>
        /// <param name="externalUserId">Your application's user ID.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The principal.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Principal> CreateAsync(string externalUserId, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            ServerChecks.Text(externalUserId, nameof(externalUserId));
            CreatePrincipalReply reply = await _client.ExecuteAsync(Operations.Communication.CreatePrincipal,
                new CreatePrincipalRequestInput(externalUserId), requestId, cancellationToken).ConfigureAwait(false);
            Principal principal = ServerChecks.Required(reply.Result, reply.RequestId);
            if (principal.ExternalUserId != externalUserId) throw ServerChecks.Mismatch("Principal", reply.RequestId);
            return principal;
        }

        /// <summary>Reads a principal (<c>principalManage</c>).</summary>
        /// <param name="principalId">The principal ID.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The principal.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<Principal> GetAsync(string principalId, CancellationToken cancellationToken = default)
        {
            ServerChecks.Id(principalId, nameof(principalId));
            GetPrincipalReply reply = await _client.ExecuteAsync(Operations.Communication.GetPrincipal,
                new GetPrincipalRequestInput(principalId), null, cancellationToken).ConfigureAwait(false);
            Principal principal = ServerChecks.Required(reply.Result, reply.RequestId);
            if (principal.PrincipalId != principalId) throw ServerChecks.Mismatch("Principal", reply.RequestId);
            return principal;
        }

        /// <summary>Disables a principal (<c>principalManage</c>).</summary>
        /// <param name="principalId">The principal ID.</param>
        /// <param name="expectedRevision">The principal revision you observed.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The disabled principal.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Principal> DisableAsync(string principalId, string expectedRevision, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new DisablePrincipalRequestInput(ServerChecks.Id(principalId, nameof(principalId)),
                ServerChecks.Counter(expectedRevision, nameof(expectedRevision)));
            DisablePrincipalReply reply = await _client.ExecuteAsync(Operations.Communication.DisablePrincipal, input, requestId,
                cancellationToken).ConfigureAwait(false);
            Principal principal = ServerChecks.Required(reply.Result, reply.RequestId);
            if (principal.PrincipalId != principalId) throw ServerChecks.Mismatch("Principal", reply.RequestId);
            return principal;
        }
    }

    /// <summary>Resolves and retries mutations whose outcome is uncertain.</summary>
    public sealed class ServerRequests
    {
        private readonly ProjectServerClient _client;

        internal ServerRequests(ProjectServerClient client) => _client = client;

        /// <summary>Reads what the authority knows about a request ID, without resending anything.</summary>
        /// <param name="requestId">The original request ID.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The resolution: committed, accepted or not observed yet.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<RequestResolution> ResolveAsync(string requestId, CancellationToken cancellationToken = default)
        {
            ServerChecks.Id(requestId, nameof(requestId));
            ResolveRequestReply reply = await _client.ExecuteAsync(Operations.Communication.ResolveRequest,
                new ResolveRequestRequestInput(requestId), null, cancellationToken).ConfigureAwait(false);
            return ServerChecks.Required(reply.Result, reply.RequestId);
        }

        /// <summary>
        /// Resolves a recorded mutation and resends its original payload only when the authority has not observed it and the
        /// retry budget allows. See <see cref="ConvoHopTransport.RetryAsync"/>.
        /// </summary>
        /// <param name="requestId">The original request ID.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled resend has an unknown outcome.</param>
        /// <returns>The resolution after any resend.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        /// <exception cref="InvalidOperationException">No recovery record exists for the request ID.</exception>
        /// <exception cref="ConvoHopException">The request cannot be resent or its resolution failed.</exception>
        public Task<RequestResolution> RetryAsync(string requestId, CancellationToken cancellationToken = default) =>
            _client.Transport.RetryAsync(requestId, cancellationToken);
    }

    /// <summary>Creates conversations (<c>conversationManage</c>).</summary>
    public sealed class ServerConversations
    {
        private readonly ProjectServerClient _client;

        internal ServerConversations(ProjectServerClient client) => _client = client;

        /// <summary>Creates a conversation with its initial members.</summary>
        /// <param name="input">The title, properties and initial members.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The conversation.</returns>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<Conversation> CreateAsync(CreateConversationRequestInput input, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            if (input == null) throw new ArgumentNullException(nameof(input));
            CreateConversationReply reply = await _client.ExecuteAsync(Operations.Communication.CreateConversation, input, requestId,
                cancellationToken).ConfigureAwait(false);
            return ServerChecks.Required(reply.Result, reply.RequestId);
        }
    }
}
