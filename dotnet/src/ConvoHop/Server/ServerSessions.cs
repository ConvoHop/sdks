using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Internal;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>Issues, renews and revokes user sessions, and reads the outcome of an uncertain issue or renewal.</summary>
    public sealed class ServerSessions
    {
        private const string DefaultTtlMilliseconds = "900000";

        private readonly ProjectServerClient _client;

        internal ServerSessions(ProjectServerClient client) => _client = client;

        /// <summary>Issues a user session (<c>sessionIssue</c>). Hand the session token to that user's app only.</summary>
        /// <param name="principalId">The principal the session is for.</param>
        /// <param name="deviceId">The device the session is for, a UUID your app keeps per installation.</param>
        /// <param name="requestedTtlMs">The lifetime in milliseconds, as a decimal string. Defaults to 15 minutes.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The session and its token. <see cref="SessionBootstrap.Session"/> is never null.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<SessionBootstrap> IssueAsync(string principalId, string deviceId, string? requestedTtlMs = null,
            string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new IssueSessionRequestInput(ServerChecks.Id(principalId, nameof(principalId)),
                ServerChecks.Id(deviceId, nameof(deviceId)), ServerChecks.Counter(requestedTtlMs ?? DefaultTtlMilliseconds,
                    nameof(requestedTtlMs)));
            IssueSessionReply reply = await _client.ExecuteAsync(Operations.Communication.IssueSession, input, requestId,
                cancellationToken).ConfigureAwait(false);
            return Bootstrap(reply.Result, reply.RequestId, principalId, deviceId, null);
        }

        /// <summary>Renews a user session with a new token and lifetime (<c>sessionIssue</c>).</summary>
        /// <param name="sessionId">The session ID.</param>
        /// <param name="principalId">The session's principal.</param>
        /// <param name="deviceId">The session's device.</param>
        /// <param name="expectedRevision">The session revision you observed.</param>
        /// <param name="requestedTtlMs">The lifetime in milliseconds, as a decimal string. Defaults to 15 minutes.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The renewed session and its token. <see cref="SessionBootstrap.Session"/> is never null.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<SessionBootstrap> RenewAsync(string sessionId, string principalId, string deviceId, string expectedRevision,
            string? requestedTtlMs = null, string? requestId = null, CancellationToken cancellationToken = default)
        {
            var input = new RenewSessionRequestInput(ServerChecks.Id(sessionId, nameof(sessionId)),
                ServerChecks.Id(principalId, nameof(principalId)), ServerChecks.Id(deviceId, nameof(deviceId)),
                ServerChecks.Counter(expectedRevision, nameof(expectedRevision)),
                ServerChecks.Counter(requestedTtlMs ?? DefaultTtlMilliseconds, nameof(requestedTtlMs)));
            RenewSessionReply reply = await _client.ExecuteAsync(Operations.Communication.RenewSession, input, requestId,
                cancellationToken).ConfigureAwait(false);
            return Bootstrap(reply.Result, reply.RequestId, principalId, deviceId, sessionId);
        }

        /// <summary>Revokes a user session (<c>sessionManage</c>).</summary>
        /// <param name="sessionId">The session ID.</param>
        /// <param name="expectedRevision">The session revision you observed.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The revocation, with the media cutoff of the session's live participation.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<SessionRevocation> RevokeAsync(string sessionId, string expectedRevision, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new RevokeSessionRequestInput(ServerChecks.Id(sessionId, nameof(sessionId)),
                ServerChecks.Counter(expectedRevision, nameof(expectedRevision)));
            RevokeSessionReply reply = await _client.ExecuteAsync(Operations.Communication.RevokeSession, input, requestId,
                cancellationToken).ConfigureAwait(false);
            SessionRevocation revocation = ServerChecks.Required(reply.Result, reply.RequestId);
            if (revocation.SessionId != sessionId) throw ServerChecks.Mismatch("Session revocation", reply.RequestId);
            return revocation;
        }

        /// <summary>
        /// Reads the outcome of an issue or renew request by its original request ID (<c>sessionIssue</c> and
        /// <c>sessionManage</c>), without resending it. The read uses its own request ID.
        /// </summary>
        /// <remarks>
        /// The outcome is checked against the authority's proof and, when this client recorded the original request, against
        /// that record. <see cref="SessionRequestOutcome.State"/> is <c>notObservedYet</c> (every other field except
        /// <see cref="SessionRequestOutcome.RequestId"/> and <see cref="SessionRequestOutcome.CheckedAt"/> is null) or
        /// <c>committed</c>, with <see cref="SessionRequestOutcome.Operation"/>, <see cref="SessionRequestOutcome.ReceiptId"/>,
        /// <see cref="SessionRequestOutcome.CommittedAt"/>, <see cref="SessionRequestOutcome.OriginalSession"/> and
        /// <see cref="SessionRequestOutcome.CurrentState"/> set; <see cref="SessionRequestOutcome.CurrentSession"/> is null
        /// only when the current state is <c>missing</c>. The outcome never contains a session token.
        /// </remarks>
        /// <param name="requestId">The original issue or renew request ID.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The checked outcome.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        /// <exception cref="ConvoHopException">
        /// The read failed, or the outcome is malformed (<c>INVALID_RESPONSE</c>); keep the original request and payload.
        /// </exception>
        public async Task<SessionRequestOutcome> GetOutcomeAsync(string requestId, CancellationToken cancellationToken = default)
        {
            ServerChecks.Id(requestId, nameof(requestId));
            string readId = Protocol.NewId();
            if (readId == requestId)
            {
                throw new ConvoHopException(ErrorCodes.InvalidRequest, readId, "rejected", 400,
                    "Session outcome requires a separate read request identity");
            }

            string incarnation = _client.Transport.Incarnation;
            Payload proof = await _client.Transport.ExecuteCoreAsync(Operations.Communication.SessionRequestOutcome, _client.ProjectId,
                ConvoHopTransport.SerializeInput(new SessionRequestOutcomeRequestInput(requestId)), readId, null, cancellationToken)
                .ConfigureAwait(false);
            IReadOnlyList<RecoveryState> states = await _client.Transport.GetRecoveryStatesAsync(cancellationToken).ConfigureAwait(false);
            RecoveryState? custody = null;
            foreach (RecoveryState state in states)
            {
                if (state.RequestId == requestId) custody = state;
            }

            try
            {
                SessionOutcomeCheck.Check(proof.Element, requestId, _client.ProjectId, incarnation, custody);
            }
            catch (ProtocolFormatException)
            {
                throw ServerChecks.Invalid("Malformed session request outcome; retain the original request and payload", readId);
            }

            return ((SessionRequestOutcomeReply)proof.Typed).Result;
        }

        private SessionBootstrap Bootstrap(SessionBootstrap? issued, string requestId, string principalId, string deviceId,
            string? sessionId)
        {
            SessionBootstrap bootstrap = ServerChecks.Required(issued, requestId);
            Session session = ServerChecks.Required(bootstrap.Session, requestId);
            if (session.PrincipalId != principalId || session.DeviceId != deviceId || session.Incarnation != _client.Transport.Incarnation ||
                (sessionId != null && session.SessionId != sessionId))
            {
                throw ServerChecks.Mismatch("Session", requestId);
            }

            return bootstrap;
        }
    }
}
