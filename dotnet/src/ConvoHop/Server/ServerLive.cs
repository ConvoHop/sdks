using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Generated;
using ConvoHop.Internal;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>
    /// Backend view of one live session (<c>callRead</c> or <c>callManage</c> to read; <c>callManage</c> to alert or end).
    /// Creating the handle sends no request. Mutations take the generation and revision you observed, so a retry with the
    /// same <c>requestId</c> resends the original payload.
    /// </summary>
    public sealed class ServerLiveSession
    {
        internal ServerLiveSession(ProjectServerClient client, string liveSessionId)
        {
            Client = client;
            LiveSessionId = liveSessionId;
        }

        /// <summary>The client this handle sends requests with.</summary>
        public ProjectServerClient Client { get; }

        /// <summary>The live session ID.</summary>
        public string LiveSessionId { get; }

        /// <summary>Reads the live session.</summary>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The live session.</returns>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<LiveSession> GetAsync(CancellationToken cancellationToken = default)
        {
            LiveSessionReply reply = await Client.ExecuteAsync(Operations.Communication.LiveSession, new LiveSessionInput(LiveSessionId),
                null, cancellationToken).ConfigureAwait(false);
            LiveSession session = ServerChecks.Required(reply.Result, reply.RequestId);
            if (session.LiveSessionId != LiveSessionId) throw ServerChecks.Mismatch("Live session", reply.RequestId);
            return session;
        }

        /// <summary>Lists the live session's participants.</summary>
        /// <param name="limit">The page size, 1 to 100, or null for the authority's default.</param>
        /// <param name="cursor">The <see cref="LiveParticipantPage.NextCursor"/> of the previous page.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The participant page.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<LiveParticipantPage> ListParticipantsAsync(int? limit = null, string? cursor = null,
            CancellationToken cancellationToken = default)
        {
            var input = new LiveParticipantsInput(LiveSessionId) { Limit = ServerChecks.OptionalPageLimit(limit, nameof(limit)), Cursor = cursor };
            LiveParticipantPageReply reply = await Client.ExecuteAsync(Operations.Communication.LiveSessionParticipants, input, null,
                cancellationToken).ConfigureAwait(false);
            return ServerChecks.Required(reply.Result, reply.RequestId);
        }

        /// <summary>Alerts principals to the live session, ringing their devices (<c>callManage</c>).</summary>
        /// <param name="expectedGeneration">The live session generation you observed.</param>
        /// <param name="principalIds">The principals to alert.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>How many alerts were created and how many were suppressed.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<LiveAlertBatch> AlertAsync(string expectedGeneration, IReadOnlyList<string> principalIds, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            if (principalIds == null) throw new ArgumentNullException(nameof(principalIds));
            var ids = new List<string>(principalIds.Count);
            foreach (string principalId in principalIds) ids.Add(ServerChecks.Id(principalId, nameof(principalIds)));
            var input = new AlertLiveSessionInput(LiveSessionId, ServerChecks.Counter(expectedGeneration, nameof(expectedGeneration)), ids);
            AlertLiveSessionPayload payload = await Client.ExecuteAsync(Operations.Communication.AlertLiveSession, input, requestId,
                cancellationToken).ConfigureAwait(false);
            LiveAlertBatch batch = ServerChecks.Required(payload.Result, payload.RequestId);
            if (batch.LiveSessionId != LiveSessionId) throw ServerChecks.Mismatch("Live alert batch", payload.RequestId);
            return batch;
        }

        /// <summary>
        /// Requests the end (<c>callManage</c>). The returned operation completes once the authority has enforced the media
        /// cutoff; await <see cref="ServerLiveOperation.WaitForCompletionAsync"/>.
        /// </summary>
        /// <param name="expectedGeneration">The live session generation you observed.</param>
        /// <param name="expectedRevision">The live session revision you observed.</param>
        /// <param name="requestId">The request ID; pass the original ID to resume after an uncertain outcome.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The end operation, with the commit receipt in <see cref="ServerLiveOperation.Receipt"/>.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The request failed, or its outcome is uncertain.</exception>
        public async Task<ServerLiveOperation> EndAsync(string expectedGeneration, string expectedRevision, string? requestId = null,
            CancellationToken cancellationToken = default)
        {
            var input = new EndLiveSessionInput(LiveSessionId, ServerChecks.Counter(expectedGeneration, nameof(expectedGeneration)),
                ServerChecks.Counter(expectedRevision, nameof(expectedRevision)));
            EndLiveSessionPayload receipt = await Client.ExecuteAsync(Operations.Communication.EndLiveSession, input, requestId,
                cancellationToken).ConfigureAwait(false);
            LiveSessionEndRequested ended = ServerChecks.Required(receipt.Result, receipt.RequestId);
            if (ended.LiveSessionId != LiveSessionId) throw ServerChecks.Mismatch("Live end receipt", receipt.RequestId);
            return new ServerLiveOperation(Client, ended.OperationId, receipt);
        }
    }

    /// <summary>
    /// A live start or end operation. The first read locks its live session and kind; later reads must match. Instances are
    /// thread-safe.
    /// </summary>
    public sealed class ServerLiveOperation
    {
        private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(45);
        private static readonly TimeSpan MaximumTimeout = TimeSpan.FromMilliseconds(300000);
        private static readonly TimeSpan PollInterval = TimeSpan.FromMilliseconds(500);

        private readonly object _gate = new object();
        private string? _liveSessionId;
        private LiveOperationKind _kind;

        internal ServerLiveOperation(ProjectServerClient client, string operationId, EndLiveSessionPayload? receipt)
        {
            Client = client;
            OperationId = operationId;
            Receipt = receipt;
            if (receipt != null)
            {
                _liveSessionId = receipt.Result.LiveSessionId;
                _kind = LiveOperationKind.End;
            }
        }

        /// <summary>The client this handle sends requests with.</summary>
        public ProjectServerClient Client { get; }

        /// <summary>The live operation ID.</summary>
        public string OperationId { get; }

        /// <summary>The end receipt when this handle came from <see cref="ServerLiveSession.EndAsync"/>; otherwise null.</summary>
        public EndLiveSessionPayload? Receipt { get; }

        /// <summary>Reads the operation (<c>callRead</c> or <c>callManage</c>).</summary>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The operation.</returns>
        /// <exception cref="ConvoHopException">
        /// The read failed, or its response was malformed or names another live session or kind (<c>INVALID_RESPONSE</c>).
        /// </exception>
        public async Task<LiveSessionOperation> GetAsync(CancellationToken cancellationToken = default)
        {
            LiveSessionOperationReply reply = await Client.ExecuteAsync(Operations.Communication.LiveSessionOperation,
                new LiveSessionOperationInput(OperationId), null, cancellationToken).ConfigureAwait(false);
            LiveSessionOperation operation = ServerChecks.Required(reply.Result, reply.RequestId);
            if (operation.OperationId != OperationId) throw ServerChecks.Mismatch("Live operation", reply.RequestId);
            lock (_gate)
            {
                if (_liveSessionId == null)
                {
                    _liveSessionId = operation.LiveSessionId;
                    _kind = operation.Kind;
                }
                else if (operation.LiveSessionId != _liveSessionId || operation.Kind != _kind)
                {
                    throw ServerChecks.Invalid("Live operation scope changed", reply.RequestId);
                }
            }

            return operation;
        }

        /// <summary>
        /// Polls every 500 ms until the operation completes. An end completion must carry an enforced media cutoff.
        /// </summary>
        /// <param name="timeout">How long to poll, from 1 ms to 300000 ms. Defaults to 45 seconds.</param>
        /// <param name="cancellationToken">Stops polling; the operation itself continues.</param>
        /// <returns>The completion.</returns>
        /// <exception cref="ArgumentOutOfRangeException">The timeout is out of range.</exception>
        /// <exception cref="ConvoHopException">
        /// The operation failed, with its live error code and outcome <c>accepted</c>; or the deadline passed, with
        /// <c>RESOLUTION_REQUIRED</c>, which is not a cutoff (keep the operation ID and query it again); or a response was
        /// malformed (<c>INVALID_RESPONSE</c>).
        /// </exception>
        public async Task<LiveSessionOperationCompletion> WaitForCompletionAsync(TimeSpan? timeout = null,
            CancellationToken cancellationToken = default)
        {
            TimeSpan limit = timeout ?? DefaultTimeout;
            if (limit < TimeSpan.FromMilliseconds(1) || limit > MaximumTimeout)
                throw new ArgumentOutOfRangeException(nameof(timeout), limit, "Wait timeout must be 1..300000 ms");
            TimeProvider time = Client.Time;
            long started = time.GetTimestamp();
            string? requestId = Receipt?.RequestId;
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();
                LiveSessionOperation operation = await GetAsync(cancellationToken).ConfigureAwait(false);
                requestId ??= operation.RequestId;
                switch (operation.State)
                {
                    case LiveOperationState.Completed:
                        LiveSessionOperationCompletion? completion = operation.Completion;
                        if (completion == null || completion.LiveSessionId != operation.LiveSessionId ||
                            (operation.Kind == LiveOperationKind.End && completion.MediaCutoff?.State != LiveCutoffState.Enforced))
                        {
                            throw ServerChecks.Invalid("Completed live operation is missing its completion evidence", requestId);
                        }

                        return completion;
                    case LiveOperationState.Failed:
                        LiveOperationFailure failure = operation.Failure ??
                            throw ServerChecks.Invalid("Failed live operation is missing its reason", requestId);
                        throw new ConvoHopException(EnumConverters.LiveErrorCodeConverter.ToWire(failure.Code), requestId, "accepted", 409,
                            failure.Message);
                    case LiveOperationState.Running:
                        break;
                    default:
                        throw ServerChecks.Invalid("Unknown live operation state", requestId);
                }

                if (time.GetElapsedTime(started) >= limit)
                {
                    throw new ConvoHopException(ErrorCodes.ResolutionRequired, requestId, "accepted", 409,
                        "Action remains unresolved; retain this operation ID and query it again. Elapsed time is not cutoff.");
                }

                await TaskWaiting.DelayAsync(time, PollInterval, cancellationToken).ConfigureAwait(false);
            }
        }
    }
}
