using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Internal;
using ConvoHop.Models;

namespace ConvoHop
{
    /// <summary>
    /// Backend-key client for one project. Use it only in trusted server code; never ship a backend key to a browser or a
    /// mobile app.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Every backend-key operation has a typed method here; the package README lists each method with the scope it needs.
    /// A key without that scope fails with <see cref="ScopeRequiredException"/>. The helpers check that each result names
    /// the resource the request did; <see cref="Communication"/> reaches every backend communication operation in the
    /// schema without those checks. Message reads and sends accept
    /// <c>actAs</c> to act as a member principal; the inbox requires it. Handles from <see cref="Conversation"/>,
    /// <see cref="LiveSession"/> and <see cref="LiveOperation"/> send nothing until a method is called.
    /// </para>
    /// <para>
    /// Instances are thread-safe. Mutations accept a <c>requestId</c>: after an outcome of <c>unknown</c>, resolve or retry
    /// that request ID through <see cref="Requests"/>, or call the method again with the same ID and payload. Never send the
    /// change again under a new ID.
    /// </para>
    /// </remarks>
    public sealed class ProjectServerClient
    {
        /// <summary>Creates a client. Construction sends no request.</summary>
        /// <param name="options">The client options.</param>
        /// <exception cref="ArgumentException">An option is invalid. The message never contains the backend key.</exception>
        public ProjectServerClient(ProjectServerClientOptions options)
        {
            if (options == null) throw new ArgumentNullException(nameof(options));
            ProjectId = ServerChecks.Id(options.ProjectId, nameof(options.ProjectId));
            string incarnation = ServerChecks.Id(options.Incarnation, nameof(options.Incarnation));
            if (string.IsNullOrEmpty(options.BackendKey))
                throw new ArgumentException("A backend key is required", nameof(options));
            Time = options.TimeProvider ?? System.TimeProvider.System;
            Transport = new ConvoHopTransport(new ConvoHopTransportOptions
            {
                BaseUrl = options.BaseUrl,
                Credential = options.BackendKey,
                Namespace = "backend:" + ProjectId,
                Incarnation = incarnation,
                RecoveryStorage = options.RecoveryStorage,
                HttpClient = options.HttpClient,
                TimeProvider = Time,
            });
            Conversations = new ServerConversations(this);
            Principals = new ServerPrincipals(this);
            Sessions = new ServerSessions(this);
            Requests = new ServerRequests(this);
            Communication = new Api.CommunicationApi(new TransportExecutor(Transport, ProjectId));
        }

        /// <summary>The project ID.</summary>
        public string ProjectId { get; }

        /// <summary>The transport, for operations without a typed method and for recovery records.</summary>
        public ConvoHopTransport Transport { get; }

        /// <summary>
        /// Every backend communication query and mutation in the schema for this project, with the generated inputs and
        /// replies, and the cursor-paginated queries as page sequences. Unlike the helpers, it does not check that a result
        /// names the resource the request did.
        /// </summary>
        public Api.CommunicationApi Communication { get; }

        /// <summary>Creates conversations (<c>conversationManage</c>).</summary>
        public ServerConversations Conversations { get; }

        /// <summary>Creates, reads and disables principals, the project's application users.</summary>
        public ServerPrincipals Principals { get; }

        /// <summary>Issues, renews and revokes user sessions.</summary>
        public ServerSessions Sessions { get; }

        /// <summary>Resolves and retries mutations whose outcome is uncertain.</summary>
        public ServerRequests Requests { get; }

        internal TimeProvider Time { get; }

        /// <summary>Returns a handle for one conversation. Creating the handle sends no request.</summary>
        /// <param name="conversationId">The conversation ID.</param>
        /// <returns>The conversation handle.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        public ServerConversation Conversation(string conversationId) =>
            new ServerConversation(this, ServerChecks.Id(conversationId, nameof(conversationId)));

        /// <summary>Returns a handle for one live session. Creating the handle sends no request.</summary>
        /// <param name="liveSessionId">The live session ID.</param>
        /// <returns>The live session handle.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        public ServerLiveSession LiveSession(string liveSessionId) =>
            new ServerLiveSession(this, ServerChecks.Id(liveSessionId, nameof(liveSessionId)));

        /// <summary>
        /// Reattaches to a live start or end operation by ID, for example after a restart or a <c>RESOLUTION_REQUIRED</c>
        /// timeout. Creating the handle sends no request.
        /// </summary>
        /// <param name="operationId">The live operation ID.</param>
        /// <returns>The live operation handle.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        public ServerLiveOperation LiveOperation(string operationId) =>
            new ServerLiveOperation(this, ServerChecks.Id(operationId, nameof(operationId)), null);

        /// <summary>
        /// Reads the project route and stores its serving epoch on <see cref="Transport"/>, so later requests carry it.
        /// Call it at startup and again after <c>WRONG_REGION</c>.
        /// </summary>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>A task that completes when the route is stored.</returns>
        /// <exception cref="InvalidOperationException">
        /// The route names another project or incarnation. Recover explicitly; do not rebind recovery records.
        /// </exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task InitializeAsync(CancellationToken cancellationToken = default)
        {
            RouteReply reply = await ExecuteAsync(Operations.Communication.Route, NoInput.Value, null, cancellationToken)
                .ConfigureAwait(false);
            if (reply.Result is not JsonElement route || route.ValueKind != JsonValueKind.Object)
                throw ServerChecks.Invalid("Expected a route object", reply.RequestId);
            if (JsonParsing.OptionalString(route, "projectId") != ProjectId ||
                JsonParsing.OptionalString(route, "incarnation") != Transport.Incarnation)
            {
                throw new InvalidOperationException("Project incarnation changed; explicit recovery required");
            }

            Transport.ServingEpoch = JsonParsing.OptionalString(route, "servingEpoch") ??
                throw ServerChecks.Invalid("Expected a serving epoch", reply.RequestId);
        }

        /// <summary>Describes the features, limits and API model the authority supports.</summary>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The capabilities.</returns>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<Capabilities> GetCapabilitiesAsync(CancellationToken cancellationToken = default)
        {
            CapabilitiesReply reply = await ExecuteAsync(Operations.Communication.Capabilities, NoInput.Value, null,
                cancellationToken).ConfigureAwait(false);
            return ServerChecks.Required(reply.Result, reply.RequestId);
        }

        /// <summary>Reads an accepted operation's progress.</summary>
        /// <param name="operationId">The operation ID.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The operation.</returns>
        /// <exception cref="ArgumentException">The ID is not a canonical UUID.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<Operation> GetOperationAsync(string operationId, CancellationToken cancellationToken = default)
        {
            ServerChecks.Id(operationId, nameof(operationId));
            GetOperationReply reply = await ExecuteAsync(Operations.Communication.GetOperation,
                new GetOperationRequestInput(operationId), null, cancellationToken).ConfigureAwait(false);
            Operation operation = ServerChecks.Required(reply.Result, reply.RequestId);
            if (operation.OperationId != operationId) throw ServerChecks.Mismatch("Operation", reply.RequestId);
            return operation;
        }

        /// <summary>Lists the conversations visible to a member, as that member's inbox (<c>messageRead</c>; audited).</summary>
        /// <param name="actAs">The member principal whose inbox to read.</param>
        /// <param name="limit">The page size, 1 to 100. Defaults to 100.</param>
        /// <param name="cursor">The <c>NextCursor</c> of the previous page.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The inbox page.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<InboxPage> GetInboxAsync(string actAs, int? limit = null, string? cursor = null,
            CancellationToken cancellationToken = default)
        {
            var input = new InboxRequestInput(ServerChecks.PageLimit(limit, nameof(limit)))
            {
                Cursor = cursor,
                ActAsPrincipalId = ServerChecks.Id(actAs, nameof(actAs)),
            };
            InboxReply reply = await ExecuteAsync(Operations.Communication.Inbox, input, null, cancellationToken).ConfigureAwait(false);
            InboxPage page = ServerChecks.Required(reply.Result, reply.RequestId);
            foreach (InboxItem item in page.Items)
            {
                if (item.LatestVisibleMessage != null && item.LatestVisibleMessage.ConversationId != item.ConversationId)
                    throw ServerChecks.Mismatch("Inbox item", reply.RequestId);
            }

            return page;
        }

        /// <summary>
        /// Searches messages (<c>messageRead</c>) as the <paramref name="actAs"/> member, or within
        /// <paramref name="conversationIds"/> with the backend's own visibility. Pass at least one of them.
        /// </summary>
        /// <param name="query">The search text.</param>
        /// <param name="actAs">The member principal to search as.</param>
        /// <param name="conversationIds">The conversations to search, at least one.</param>
        /// <param name="limit">The page size, 1 to 100. Defaults to 100.</param>
        /// <param name="cursor">The <c>NextCursor</c> of the previous page.</param>
        /// <param name="cancellationToken">Stops waiting for the read.</param>
        /// <returns>The search page. Every hit carries its message.</returns>
        /// <exception cref="ArgumentException">An argument is invalid.</exception>
        /// <exception cref="ConvoHopException">The read failed or its response was malformed.</exception>
        public async Task<SearchPage> SearchAsync(string query, string? actAs = null, IReadOnlyList<string>? conversationIds = null,
            int? limit = null, string? cursor = null, CancellationToken cancellationToken = default)
        {
            ServerChecks.Text(query, nameof(query));
            List<string>? scope = null;
            if (conversationIds != null)
            {
                scope = new List<string>(conversationIds.Count);
                foreach (string conversationId in conversationIds) scope.Add(ServerChecks.Id(conversationId, nameof(conversationIds)));
                if (scope.Count == 0)
                    throw new ArgumentException("Search conversationIds must name at least one conversation", nameof(conversationIds));
            }

            if (actAs == null && scope == null) throw new ArgumentException("Backend search requires actAs or conversationIds", nameof(actAs));
            var input = new SearchRequestInput(query, ServerChecks.PageLimit(limit, nameof(limit)))
            {
                Cursor = cursor,
                Scope = scope == null ? null : new SearchScopeInput(scope),
                ActAsPrincipalId = ServerChecks.OptionalId(actAs, nameof(actAs)),
            };
            SearchReply reply = await ExecuteAsync(Operations.Communication.Search, input, null, cancellationToken).ConfigureAwait(false);
            SearchPage page = ServerChecks.Required(reply.Result, reply.RequestId);
            foreach (SearchHit hit in page.Items)
            {
                if (hit.Message == null || hit.Message.ConversationId != hit.ConversationId)
                    throw ServerChecks.Invalid("Search hit conversation scope does not match its message", reply.RequestId);
                if (scope != null && !scope.Contains(hit.ConversationId)) throw ServerChecks.Mismatch("Search hit", reply.RequestId);
            }

            return page;
        }

        internal Task<TResult> ExecuteAsync<TInput, TResult>(OperationDescriptor<TInput, TResult> operation, TInput input,
            string? requestId, CancellationToken cancellationToken)
            where TInput : class
            where TResult : class =>
            Transport.ExecuteAsync(operation, ProjectId, input, requestId, null, cancellationToken);

        internal async Task<IReadOnlyList<Member>> AddMembersAsync(string conversationId, IReadOnlyList<MemberBatchEntryInput> members,
            string? requestId, CancellationToken cancellationToken)
        {
            if (members == null) throw new ArgumentNullException(nameof(members));
            var principals = new HashSet<string>(StringComparer.Ordinal);
            var entries = new List<MemberBatchEntryInput>(members.Count);
            foreach (MemberBatchEntryInput member in members)
            {
                if (member == null) throw new ArgumentException("A membership batch entry is null", nameof(members));
                entries.Add(new MemberBatchEntryInput(ServerChecks.Id(member.PrincipalId, nameof(members)),
                    ServerChecks.Role(member.Role, nameof(members)), ServerChecks.Counter(member.ExpectedRevision, nameof(members))));
                principals.Add(member.PrincipalId);
            }

            if (entries.Count == 0 || entries.Count > 100 || principals.Count != entries.Count)
                throw new ArgumentException("A membership batch requires 1..100 distinct principals", nameof(members));
            AddMembersPayload payload = await ExecuteAsync(Operations.Communication.AddMembers,
                new AddMembersInput(conversationId, entries), requestId, cancellationToken).ConfigureAwait(false);
            IReadOnlyList<Member> items = payload.Result.Items;
            if (items.Count != entries.Count) throw ServerChecks.Invalid("Invalid membership batch result", payload.RequestId);
            foreach (Member item in items)
            {
                if (item.ConversationId != conversationId || !principals.Contains(item.PrincipalId))
                    throw ServerChecks.Mismatch("Membership batch", payload.RequestId);
            }

            return items;
        }
    }
}
