using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Internal;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>
    /// The GraphQL transport for one credential: generated operations over <c>/graphql</c>, response and receipt validation,
    /// and mutation recovery.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Instances are thread-safe. A mutation keeps its request ID, payload, incarnation and retry budget across attempts.
    /// Transport uncertainty is neither rejection nor commit: when an attempt fails with outcome <c>unknown</c>, resolve or
    /// retry the original request ID (see <see cref="RetryAsync"/>); never send the change again under a new ID.
    /// </para>
    /// <para>
    /// Cancelling a call stops waiting for it; it does not prove the authority did not apply a mutation. Recovery records
    /// never contain credentials.
    /// </para>
    /// </remarks>
    public sealed partial class ConvoHopTransport
    {
        private const long RetryWindowMilliseconds = 60000;
        private const int MaxAttempts = 3;
        private const string ResolutionRequiredMessage = "The original request is no longer eligible for resend";

        internal static readonly JsonElement EmptyObject = JsonParsing.Parse("{}");

        private readonly object _gate = new object();
        private readonly Dictionary<string, RecoveryRecord> _states = new Dictionary<string, RecoveryRecord>(StringComparer.Ordinal);
        private readonly List<RecoveryRecord> _order = new List<RecoveryRecord>();
        private readonly Dictionary<string, ActiveMutation> _active = new Dictionary<string, ActiveMutation>(StringComparer.Ordinal);
        private readonly IRecoveryStorage? _storage;
        private readonly string _storageKey;
        private readonly string? _credential;
        private readonly HttpClient _http;
        private readonly TimeProvider _time;
        private readonly Uri _endpoint;
        private Task? _initialization;
        private Task _writes = Task.CompletedTask;
        private volatile string? _servingEpoch;

        /// <summary>Creates a transport.</summary>
        /// <param name="options">The transport options.</param>
        /// <exception cref="ArgumentException">The base URL, namespace or credential is invalid. The message never contains the credential.</exception>
        public ConvoHopTransport(ConvoHopTransportOptions options)
        {
            if (options == null) throw new ArgumentNullException(nameof(options));
            BaseUrl = Protocol.Origin(options.BaseUrl);
            if (options.Namespace == null) throw new ArgumentException("A recovery namespace is required", nameof(options));
            if (options.Credential != null && !IsCredential(options.Credential))
                throw new ArgumentException("The credential must be non-empty visible ASCII", nameof(options));
            _credential = options.Credential;
            Incarnation = options.Incarnation ?? "management";
            _storage = options.RecoveryStorage;
            _storageKey = "convohop.requests:" + options.Namespace;
            _http = options.HttpClient ?? SharedHttpClient.Value;
            _time = options.TimeProvider ?? TimeProvider.System;
            _endpoint = new Uri(BaseUrl + "/graphql", UriKind.Absolute);
        }

        /// <summary>The authority origin requests are sent to.</summary>
        public string BaseUrl { get; }

        /// <summary>Whether mutation recovery records are written to <see cref="ConvoHopTransportOptions.RecoveryStorage"/>.</summary>
        public bool DurableRecovery => _storage != null;

        /// <summary>The project incarnation requests belong to, or <c>management</c>.</summary>
        public string Incarnation { get; }

        /// <summary>
        /// The serving epoch most recently observed from route initialization. When set, it is sent with each request as
        /// <c>observedServingEpoch</c> so the authority can reject requests routed from a stale view.
        /// </summary>
        public string? ServingEpoch
        {
            get => _servingEpoch;
            set => _servingEpoch = value;
        }

        /// <summary>
        /// Loads recovery records from <see cref="ConvoHopTransportOptions.RecoveryStorage"/>. Calls that need recovery state
        /// load it first, so calling this is optional; call it at startup to surface corrupt storage early.
        /// </summary>
        /// <param name="cancellationToken">Stops waiting; the load itself still completes.</param>
        /// <returns>A task that completes when the records are loaded.</returns>
        /// <exception cref="InvalidDataException">The stored records are malformed. A later call reads the storage again.</exception>
        public Task InitializeRecoveryAsync(CancellationToken cancellationToken = default)
        {
            IRecoveryStorage? storage = _storage;
            if (storage == null) return Task.CompletedTask;
            Task initialization;
            lock (_gate)
            {
                if (_initialization == null || _initialization.IsFaulted || _initialization.IsCanceled)
                    _initialization = Task.Run(() => RestoreAsync(storage));
                initialization = _initialization;
            }

            return TaskWaiting.WaitAsync(initialization, cancellationToken);
        }

        /// <summary>Returns a snapshot of the mutation recovery records, oldest first.</summary>
        /// <param name="cancellationToken">Cancels the wait for recovery initialization.</param>
        /// <returns>The recovery records.</returns>
        public async Task<IReadOnlyList<RecoveryState>> GetRecoveryStatesAsync(CancellationToken cancellationToken = default)
        {
            await InitializeRecoveryAsync(cancellationToken).ConfigureAwait(false);
            lock (_gate)
            {
                var states = new List<RecoveryState>(_order.Count);
                foreach (RecoveryRecord record in _order) states.Add(new RecoveryState(record));
                return states;
            }
        }

        /// <summary>Executes a generated operation.</summary>
        /// <typeparam name="TInput">The operation input model.</typeparam>
        /// <typeparam name="TResult">The operation result model.</typeparam>
        /// <param name="operation">The operation, from <see cref="Operations"/>.</param>
        /// <param name="projectId">The project of a communication operation; null for management operations.</param>
        /// <param name="input">
        /// The operation input, or <see cref="NoInput.Value"/>. Null is allowed only when the input is optional, and sends an
        /// empty input object.
        /// </param>
        /// <param name="requestId">
        /// The request ID. Pass the original ID to resume a mutation after an uncertain outcome; null creates a new one.
        /// </param>
        /// <param name="credentialDeliveryPermit">A credential delivery permit, only for credential redemption or acknowledgement.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled mutation has an unknown outcome.</param>
        /// <returns>The validated result.</returns>
        /// <exception cref="ArgumentNullException"><paramref name="input"/> is null and the operation requires an input.</exception>
        /// <exception cref="ArgumentException"><paramref name="credentialDeliveryPermit"/> is a default <see cref="JsonElement"/>.</exception>
        /// <exception cref="ConvoHopException">The request was invalid, the authority rejected it, or its outcome is uncertain.</exception>
        public async Task<TResult> ExecuteAsync<TInput, TResult>(OperationDescriptor<TInput, TResult> operation, string? projectId,
            TInput input, string? requestId = null, JsonElement? credentialDeliveryPermit = null,
            CancellationToken cancellationToken = default)
        {
            if (operation == null) throw new ArgumentNullException(nameof(operation));
            if (input is null && (operation.InputRequired || operation.InputArgument == null)) throw new ArgumentNullException(nameof(input));
            if (credentialDeliveryPermit is { ValueKind: JsonValueKind.Undefined })
                throw new ArgumentException("Expected a credential, not a default JsonElement", nameof(credentialDeliveryPermit));
            string id = requestId ?? Protocol.NewId();
            JsonElement body = input is null || input is NoInput ? EmptyObject : SerializeInput(input);
            JsonElement? permit = credentialDeliveryPermit?.Clone();
            Payload payload = await ExecuteCoreAsync(operation, projectId, body, id, permit, cancellationToken).ConfigureAwait(false);
            return (TResult)payload.Typed;
        }

        /// <summary>
        /// Resolves an uncertain mutation by its original request ID and resends the original payload only when the authority
        /// has not observed it and the retry budget allows.
        /// </summary>
        /// <param name="requestId">The original request ID.</param>
        /// <param name="cancellationToken">Stops waiting. A cancelled resend has an unknown outcome.</param>
        /// <returns>The current resolution: committed, accepted, or not observed yet after a resend.</returns>
        /// <exception cref="ArgumentException">The request ID is not a canonical UUID.</exception>
        /// <exception cref="InvalidOperationException">No recovery record exists for the request ID.</exception>
        /// <exception cref="ConvoHopException">The request cannot be resent or its resolution failed.</exception>
        public async Task<RequestResolution> RetryAsync(string requestId, CancellationToken cancellationToken = default)
        {
            if (requestId == null) throw new ArgumentNullException(nameof(requestId));
            if (!Protocol.IsId(requestId)) throw new ArgumentException("Expected a canonical nonzero UUID", nameof(requestId));
            await InitializeRecoveryAsync(cancellationToken).ConfigureAwait(false);
            RecoveryRecord? state;
            lock (_gate) _states.TryGetValue(requestId, out state);
            if (state == null) throw new InvalidOperationException("No recovery record exists; do not invent a replacement identity");
            if (state.Incarnation != Incarnation) throw IncarnationMismatch(requestId);
            if (state.Operation.Id == "communication.redeemCredential" || state.Operation.Id == "communication.acknowledgeCredential")
            {
                throw new ConvoHopException(ErrorCodes.CredentialRequired, requestId, "unknown", 409,
                    "Delivery permits cannot authorize request lookup; obtain a current permit and submit the same delivery identity explicitly");
            }
            if (state.Operation.Idempotency == "replayOnly")
            {
                throw new ConvoHopException(ErrorCodes.InvalidRequest, requestId, "unknown", 400,
                    "The operation's requests cannot be looked up; send the same request ID and payload again explicitly");
            }

            RequestResolution resolution = await ResolveAsync(state, cancellationToken).ConfigureAwait(false);
            if (resolution.State == "committed" || resolution.State == "accepted") return resolution;
            if (resolution.State != "notObservedYet")
                throw new ConvoHopException(ErrorCodes.InvalidResponse, requestId, "unknown", 503, "Unknown request resolution state");
            bool observed;
            lock (_gate) observed = state.Settled || state.MediaAdmissionAttempted;
            if (observed)
            {
                throw new ConvoHopException(ErrorCodes.ResolutionRequired, requestId, "unknown", 409,
                    "Previously observed commit or native admission cannot be retried from absent evidence");
            }

            if (Fingerprint(state.Operation.Id, state.ProjectId, state.Input) != state.PayloadFingerprint)
                throw new InvalidOperationException("Recovery input fingerprint changed");
            await MutateAsync(state.Operation, state.ProjectId, state.Input, state.RequestId, null, true, cancellationToken)
                .ConfigureAwait(false);
            return await ResolveAsync(state, cancellationToken).ConfigureAwait(false);
        }

        internal async Task<Payload> ExecuteCoreAsync(OperationDescriptor operation, string? projectId, JsonElement input,
            string requestId, JsonElement? permit, CancellationToken cancellationToken)
        {
            string? observedServingEpoch = ServingEpoch;
            Plan(operation, projectId, input, requestId, permit, observedServingEpoch);
            await InitializeRecoveryAsync(cancellationToken).ConfigureAwait(false);
            Payload payload = operation.Kind == OperationKind.Mutation
                ? await MutateAsync(operation, projectId, input, requestId, permit, false, cancellationToken).ConfigureAwait(false)
                : await RequestAsync(operation, projectId, input, requestId, permit, observedServingEpoch, cancellationToken)
                    .ConfigureAwait(false);
            if (operation.Id == Operations.Communication.ResolveRequest.Id || operation.Id == Operations.Management.ResolveRequest.Id)
                await ObserveResolutionAsync(projectId, input, requestId, payload, cancellationToken).ConfigureAwait(false);
            return payload;
        }

        private async Task<RequestResolution> ResolveAsync(RecoveryRecord state, CancellationToken cancellationToken)
        {
            OperationDescriptor resolve = state.Operation.Plane == "management"
                ? (OperationDescriptor)Operations.Management.ResolveRequest
                : Operations.Communication.ResolveRequest;
            JsonElement input = SerializeInput(new ResolveRequestRequestInput(state.RequestId));
            Payload payload = await ExecuteCoreAsync(resolve, state.ProjectId, input, Protocol.NewId(), null, cancellationToken)
                .ConfigureAwait(false);
            return ((ResolveRequestReply)payload.Typed).Result ??
                throw new ConvoHopException(ErrorCodes.InvalidResponse, state.RequestId, "unknown", 503, "Missing current request resolution");
        }

        // A resolution of a recorded mutation settles that record.
        private async Task ObserveResolutionAsync(string? projectId, JsonElement input, string requestId, Payload payload,
            CancellationToken cancellationToken)
        {
            string? target = JsonParsing.OptionalString(input, "requestId");
            JsonElement? resolution = JsonParsing.Property(payload.Element, "result");
            if (resolution == null || resolution.Value.ValueKind != JsonValueKind.Object)
                throw new ConvoHopException(ErrorCodes.InvalidResponse, requestId, "unknown", 503, "Missing current request resolution");
            JsonElement? receipt = JsonParsing.Property(resolution.Value, "receipt");
            if (JsonParsing.OptionalString(resolution.Value, "requestId") != target ||
                (receipt != null && receipt.Value.ValueKind != JsonValueKind.Null && JsonParsing.OptionalString(receipt.Value, "requestId") != target))
            {
                throw new ConvoHopException(ErrorCodes.InvalidResponse, requestId, "unknown", 503, "Request resolution identity changed");
            }

            string? observed = JsonParsing.OptionalString(resolution.Value, "state");
            Task persisted;
            lock (_gate)
            {
                if (target == null || !_states.TryGetValue(target, out RecoveryRecord? state)) return;
                if (state.ProjectId != projectId || state.Incarnation != Incarnation)
                {
                    throw new ConvoHopException(ErrorCodes.ResolutionRequired, requestId, "unknown", 409,
                        "Resolve within the original project and incarnation");
                }

                if (observed != "committed" && observed != "accepted") return;
                if (state.ResolutionState != "committed") state.ResolutionState = observed;
                state.LastAttemptClassification = "authorityReceipt";
                persisted = Persist(state);
            }

            await TaskWaiting.WaitAsync(persisted, cancellationToken).ConfigureAwait(false);
        }

        // One attempt owns a request ID at a time; concurrent calls with the same identity share its outcome.
        private async Task<Payload> MutateAsync(OperationDescriptor operation, string? projectId, JsonElement input, string requestId,
            JsonElement? permit, bool retry, CancellationToken cancellationToken)
        {
            string identity = CanonicalJson.Serialize(new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["operation"] = operation.Id,
                ["projectId"] = projectId,
                ["input"] = input,
                ["incarnation"] = Incarnation,
            });
            ActiveMutation? active;
            bool owner = false;
            lock (_gate)
            {
                if (_active.TryGetValue(requestId, out active))
                {
                    if (active.Identity != identity) throw IdempotencyConflict(requestId);
                }
                else
                {
                    active = new ActiveMutation(identity);
                    _active.Add(requestId, active);
                    owner = true;
                }
            }

            if (!owner) return await TaskWaiting.WaitAsync(active.Completion.Task, cancellationToken).ConfigureAwait(false);
            try
            {
                Payload payload = await MutateOwnedAsync(operation, projectId, input, requestId, permit, retry, cancellationToken)
                    .ConfigureAwait(false);
                lock (_gate) _active.Remove(requestId);
                active.Completion.SetResult(payload);
                return payload;
            }
            catch (Exception error)
            {
                lock (_gate) _active.Remove(requestId);
                active.Completion.SetException(error);
                _ = active.Completion.Task.Exception;
                throw;
            }
        }

        private async Task<Payload> MutateOwnedAsync(OperationDescriptor operation, string? projectId, JsonElement input,
            string requestId, JsonElement? permit, bool retry, CancellationToken cancellationToken)
        {
            string fingerprint = Fingerprint(operation.Id, projectId, input);
            string canonicalInput = CanonicalJson.Serialize(input);
            RecoveryRecord? state;
            Task persisted = Task.CompletedTask;
            lock (_gate)
            {
                _states.TryGetValue(requestId, out state);
                if (state != null && (state.PayloadFingerprint != fingerprint || state.Incarnation != Incarnation ||
                    state.Operation.Id != operation.Id || state.ProjectId != projectId || CanonicalJson.Serialize(state.Input) != canonicalInput))
                {
                    throw IdempotencyConflict(requestId);
                }

                if (retry && (state == null || state.Settled || state.MediaAdmissionAttempted))
                    throw new ConvoHopException(ErrorCodes.ResolutionRequired, requestId, "unknown", 409, ResolutionRequiredMessage);
                if (state == null)
                {
                    if (_states.Count >= RecoveryRecord.MaxRecords) EvictFinalRecord(requestId);
                    long now = Now();
                    state = new RecoveryRecord(requestId, Incarnation, fingerprint, operation, projectId, input, now,
                        now + RetryWindowMilliseconds, 0, now, "notSubmitted", "pending", false);
                    _states.Add(requestId, state);
                    _order.Add(state);
                    persisted = Persist(state);
                }
            }

            await TaskWaiting.WaitAsync(persisted, cancellationToken).ConfigureAwait(false);
            return await SubmitAsync(state, permit, retry, cancellationToken).ConfigureAwait(false);
        }

        private async Task<Payload> SubmitAsync(RecoveryRecord state, JsonElement? permit, bool retry, CancellationToken cancellationToken)
        {
            Task persisted;
            string prior;
            lock (_gate)
            {
                if (state.Incarnation != Incarnation) throw IncarnationMismatch(state.RequestId);
                long now = Now();
                if (state.AttemptCount >= MaxAttempts || now > state.RetryDeadline || now < state.FirstSubmittedAt || now < state.LastAttemptAt)
                {
                    throw new ConvoHopException(ErrorCodes.ResolutionRequired, state.RequestId, "unknown", 409,
                        "Retry budget expired or clock changed; resolve this request read-only");
                }

                state.AttemptCount += 1;
                state.LastAttemptAt = now;
                prior = state.ResolutionState;
                if (Resendable(prior)) state.ResolutionState = "unknown";
                state.LastAttemptClassification = "submitted";
                persisted = Persist(state);
            }

            await TaskWaiting.WaitAsync(persisted, cancellationToken).ConfigureAwait(false);
            lock (_gate)
            {
                long submittingAt = Now();
                if (submittingAt > state.RetryDeadline || submittingAt < state.FirstSubmittedAt || submittingAt < state.LastAttemptAt ||
                    (retry && (state.Settled || state.MediaAdmissionAttempted)))
                {
                    throw new ConvoHopException(ErrorCodes.ResolutionRequired, state.RequestId, "unknown", 409, ResolutionRequiredMessage);
                }
            }

            Payload payload;
            try
            {
                payload = await RequestAsync(state.Operation, state.ProjectId, state.Input, state.RequestId, permit, ServingEpoch,
                    cancellationToken).ConfigureAwait(false);
            }
            catch (Exception error)
            {
                lock (_gate)
                {
                    state.LastAttemptClassification = error is ConvoHopException problem ? problem.Code : "opaqueTransportFailure";
                    // A rejection is the request's outcome only if every attempt was rejected; one that may have been
                    // applied keeps it unknown.
                    if (error is ConvoHopException rejection && rejection.Outcome == "rejected" && Resendable(prior) &&
                        state.ResolutionState == "unknown")
                    {
                        state.ResolutionState = "rejected";
                    }

                    persisted = Persist(state);
                }

                await TaskWaiting.WaitAsync(persisted, cancellationToken).ConfigureAwait(false);
                throw;
            }

            lock (_gate)
            {
                if (state.ResolutionState != "committed") state.ResolutionState = payload.Status;
                state.LastAttemptClassification = "authorityReceipt";
                persisted = Persist(state);
            }

            await TaskWaiting.WaitAsync(persisted, cancellationToken).ConfigureAwait(false);
            return payload;
        }

        // Called under the gate. A full record set forgets the final record attempted longest ago that no mutation is
        // using, or refuses the new request before it is sent.
        private void EvictFinalRecord(string requestId)
        {
            long now = Now();
            int oldest = -1;
            for (int index = 0; index < _order.Count; index++)
            {
                RecoveryRecord record = _order[index];
                if (_active.ContainsKey(record.RequestId) || !Final(record, now)) continue;
                if (oldest < 0 || record.LastAttemptAt < _order[oldest].LastAttemptAt) oldest = index;
            }

            if (oldest < 0)
            {
                throw new ConvoHopException(ErrorCodes.RecoveryLimit, requestId, "rejected", 409,
                    "Recovery storage already holds " + RecoveryRecord.MaxRecords + " requests that aren't final; retry or resolve them first");
            }

            _states.Remove(_order[oldest].RequestId);
            _order.RemoveAt(oldest);
        }

        // Whether the SDK will never send a record's request again: the authority committed or accepted it, or rejected
        // every attempt and the last rejection's code isn't retryable, or the request's retry budget is spent, whatever
        // its outcome. A clock set back refuses a resend only until it catches up, so it spends nothing.
        private static bool Final(RecoveryRecord record, long now)
        {
            if (record.Settled || (record.ResolutionState == "rejected" && !Retryable(record.LastAttemptClassification))) return true;
            return record.AttemptCount >= MaxAttempts || now > record.RetryDeadline;
        }

        // Unless the schema says otherwise. WRONG_REGION succeeds once routed again; a newer code may too.
        private static bool Retryable(string code) => code == ErrorCodes.WrongRegion || ErrorCodes.Retryable(code) != false;

        // States in which no attempt may have been applied: never sent, or every attempt rejected.
        private static bool Resendable(string resolutionState) => resolutionState == "pending" || resolutionState == "rejected";

        // Called under the gate: the snapshot is taken now, and writes complete in order.
        private Task Persist(RecoveryRecord state)
        {
            IRecoveryStorage? storage = _storage;
            if (storage == null) return Task.CompletedTask;
            Task write = WriteAsync(storage, _writes, RecoveryRecord.Serialize(_order), state);
            _writes = write;
            return write;
        }

        private async Task WriteAsync(IRecoveryStorage storage, Task previous, string snapshot, RecoveryRecord state)
        {
            try
            {
                await previous.ConfigureAwait(false);
            }
            catch (Exception)
            {
                // That snapshot's caller received its failure; this complete snapshot may repair it.
            }

            try
            {
                await Task.Run(() => storage.SetItemAsync(_storageKey, snapshot, CancellationToken.None)).ConfigureAwait(false);
            }
            catch (Exception error)
            {
                string outcome;
                lock (_gate) outcome = state.ResolutionState == "pending" ? "unknown" : state.ResolutionState;
                throw new ConvoHopException(ErrorCodes.RecoveryStorageFailure, state.RequestId, outcome, 0,
                    "Recovery storage did not confirm durability; retain the original request and its outcome", null, error);
            }
        }

        private async Task RestoreAsync(IRecoveryStorage storage)
        {
            string? saved = await storage.GetItemAsync(_storageKey, CancellationToken.None).ConfigureAwait(false);
            if (saved == null) return;
            if (saved.Length == 0) throw new InvalidDataException("Invalid asynchronous mutation recovery storage");
            List<RecoveryRecord> restored = RecoveryRecord.Restore(saved);
            lock (_gate)
            {
                foreach (RecoveryRecord record in restored)
                {
                    if (_states.TryGetValue(record.RequestId, out RecoveryRecord? existing)) _order[_order.IndexOf(existing)] = record;
                    else _order.Add(record);
                    _states[record.RequestId] = record;
                }
            }
        }

        private long Now() => _time.GetUtcNow().ToUnixTimeMilliseconds();

        private static string Fingerprint(string operation, string? projectId, JsonElement input) =>
            CanonicalJson.Fingerprint(new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["operation"] = operation,
                ["projectId"] = projectId,
                ["input"] = input,
            });

        private static ConvoHopException IdempotencyConflict(string requestId) =>
            new ConvoHopException(ErrorCodes.IdempotencyConflict, requestId, "unknown", 409, "Preserve the original request and payload");

        private static ConvoHopException IncarnationMismatch(string requestId) =>
            new ConvoHopException(ErrorCodes.IncarnationMismatch, requestId, "unknown", 409, "Explicit recovery is required for this incarnation");

        private static bool IsCredential(string value)
        {
            if (value.Length == 0) return false;
            foreach (char character in value)
            {
                if (character < '!' || character > '~') return false;
            }

            return true;
        }

        private sealed class ActiveMutation
        {
            internal ActiveMutation(string identity)
            {
                Identity = identity;
            }

            internal string Identity { get; }

            internal TaskCompletionSource<Payload> Completion { get; } =
                new TaskCompletionSource<Payload>(TaskCreationOptions.RunContinuationsAsynchronously);
        }
    }
}
