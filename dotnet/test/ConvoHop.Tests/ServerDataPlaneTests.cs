using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using ConvoHop.Generated;
using ConvoHop.Models;
using ConvoHop.Tests.TestSupport;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>
    /// The Server SDK data plane, ported from <c>packages/server/test/data-plane.test.mjs</c>. JavaScript-only argument
    /// typing (a missing options object, a fractional page size, a non-boolean <c>muted</c>) cannot be expressed here; a
    /// missing <c>actAs</c> is a null argument and the fractional page size is replaced by out-of-range integers.
    /// </summary>
    public sealed class ServerDataPlaneTests
    {
        private const string BaseUrl = "http://127.0.0.1:18080";
        private const string BeyondSafeInteger = "9007199254740993";
        private const string BackendKey = "fixture-backend-key-never-in-errors";
        private const string MuteUntil = "2030-01-01T00:00:00Z";

        private static readonly string ProjectId = Fixtures.NewId();
        private static readonly string Incarnation = Fixtures.NewId();
        private static readonly string ConversationId = Fixtures.NewId();
        private static readonly string PrincipalId = Fixtures.NewId();
        private static readonly string MemberId = Fixtures.NewId();
        private static readonly string DeviceId = Fixtures.NewId();
        private static readonly string SessionId = Fixtures.NewId();
        private static readonly string MessageId = Fixtures.NewId();
        private static readonly string LiveSessionId = Fixtures.NewId();
        private static readonly string OperationId = Fixtures.NewId();
        private static readonly string RequestId = Fixtures.NewId();

        /// <summary>Backend-key operations, each with its alternative scope sets; every scope in one set is required.</summary>
        private static readonly Lazy<Dictionary<string, string[][]>> BackendKeyScopes = new Lazy<Dictionary<string, string[][]>>(() =>
        {
            var scopes = new Dictionary<string, string[][]>(StringComparer.Ordinal);
            foreach (KeyValuePair<string, JsonNode?> operation in Spec.Load("annotations.json")["operations"]!.AsObject())
            {
                string[][] alternatives = operation.Value!["auth"]!.AsArray()
                    .Where(entry => (string?)entry!["credential"] == "backendKey")
                    .Select(entry => entry!["scopes"]?.AsArray().Select(scope => (string)scope!).ToArray() ?? Array.Empty<string>())
                    .ToArray();
                if (alternatives.Length > 0) scopes[operation.Key] = alternatives;
            }

            return scopes;
        });

        /// <summary>Backend-key operations the Server SDK deliberately leaves unwrapped, each with the reason.</summary>
        private static readonly Dictionary<string, string> Unwrapped = new Dictionary<string, string>(StringComparer.Ordinal);

        /// <summary>One public call per backend-key operation, with the exact generated input it must send.</summary>
        private static readonly (string Key, Func<ProjectServerClient, Task> Call, JsonObject? Input)[] Calls =
        {
            ("communication.capabilities", server => server.GetCapabilitiesAsync(), null),
            ("communication.route", server => server.InitializeAsync(), null),
            ("communication.resolveRequest", server => server.Requests.ResolveAsync(RequestId),
                new JsonObject { ["requestId"] = RequestId }),
            ("communication.getOperation", server => server.GetOperationAsync(OperationId),
                new JsonObject { ["operationId"] = OperationId }),
            ("communication.getPrincipal", server => server.Principals.GetAsync(PrincipalId),
                new JsonObject { ["principalId"] = PrincipalId }),
            ("communication.createPrincipal", server => server.Principals.CreateAsync("fixture-user"),
                new JsonObject { ["externalUserId"] = "fixture-user" }),
            ("communication.disablePrincipal", server => server.Principals.DisableAsync(PrincipalId, BeyondSafeInteger),
                new JsonObject { ["principalId"] = PrincipalId, ["expectedRevision"] = BeyondSafeInteger }),
            ("communication.issueSession", server => server.Sessions.IssueAsync(PrincipalId, DeviceId),
                new JsonObject { ["principalId"] = PrincipalId, ["deviceId"] = DeviceId, ["requestedTtlMs"] = "900000" }),
            ("communication.renewSession", server => server.Sessions.RenewAsync(SessionId, PrincipalId, DeviceId, "4", "60000"),
                new JsonObject
                {
                    ["sessionId"] = SessionId,
                    ["principalId"] = PrincipalId,
                    ["deviceId"] = DeviceId,
                    ["expectedRevision"] = "4",
                    ["requestedTtlMs"] = "60000",
                }),
            ("communication.revokeSession", server => server.Sessions.RevokeAsync(SessionId, "5"),
                new JsonObject { ["sessionId"] = SessionId, ["expectedRevision"] = "5" }),
            ("communication.sessionRequestOutcome", server => server.Sessions.GetOutcomeAsync(RequestId),
                new JsonObject { ["requestId"] = RequestId }),
            ("communication.createConversation", server => server.Conversations.CreateAsync(new CreateConversationRequestInput("Fixture",
                    Element("""{"topic":"a"}"""), new[] { new MemberInputInput(PrincipalId, "moderator") })),
                new JsonObject
                {
                    ["title"] = "Fixture",
                    ["props"] = new JsonObject { ["topic"] = "a" },
                    ["members"] = new JsonArray(new JsonObject { ["principalId"] = PrincipalId, ["role"] = "moderator" }),
                }),
            ("communication.getConversation", server => server.Conversation(ConversationId).GetAsync(),
                new JsonObject { ["conversationId"] = ConversationId }),
            ("communication.updateConversation", server => server.Conversation(ConversationId).UpdateAsync("2", "Renamed"),
                new JsonObject { ["conversationId"] = ConversationId, ["expectedRevision"] = "2", ["title"] = "Renamed" }),
            ("communication.members", server => server.Conversation(ConversationId).Members.ListAsync(5, "members-1"),
                new JsonObject { ["conversationId"] = ConversationId, ["limit"] = 5, ["cursor"] = "members-1" }),
            ("communication.addMember", server => server.Conversation(ConversationId).Members.AddAsync(MemberId, "member", "0"),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["principalId"] = MemberId,
                    ["role"] = "member",
                    ["expectedRevision"] = "0",
                }),
            ("communication.addMembers", server => server.Conversation(ConversationId).Members.AddBatchAsync(
                    new[] { new MemberBatchEntryInput(MemberId, "moderator", "1") }),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["members"] = new JsonArray(new JsonObject
                    {
                        ["principalId"] = MemberId,
                        ["role"] = "moderator",
                        ["expectedRevision"] = "1",
                    }),
                }),
            ("communication.removeMember", server => server.Conversation(ConversationId).Members.RemoveAsync(MemberId, "3"),
                new JsonObject { ["conversationId"] = ConversationId, ["principalId"] = MemberId, ["expectedRevision"] = "3" }),
            ("communication.setBroadcastPermission",
                server => server.Conversation(ConversationId).Members.SetBroadcastPermissionAsync(MemberId, false, "3"),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["principalId"] = MemberId,
                    ["allowed"] = false,
                    ["expectedMembershipRevision"] = "3",
                }),
            ("communication.conversationMute", server => server.Conversation(ConversationId).Members.GetMuteAsync(MemberId),
                new JsonObject { ["conversationId"] = ConversationId, ["actAsPrincipalId"] = MemberId }),
            ("communication.setConversationMute",
                server => server.Conversation(ConversationId).Members.SetMuteAsync(MemberId, true, MuteUntil),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["muted"] = true,
                    ["until"] = MuteUntil,
                    ["actAsPrincipalId"] = MemberId,
                }),
            ("communication.historyGrant",
                server => server.Conversation(ConversationId).Members.GrantHistoryAsync(MemberId, "2", "3", BeyondSafeInteger),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["principalId"] = MemberId,
                    ["expectedRevision"] = "3",
                    ["membershipEpoch"] = "2",
                    ["fromSequence"] = BeyondSafeInteger,
                }),
            ("communication.messages", server => server.Conversation(ConversationId).Messages.ListAsync(3, BeyondSafeInteger, MemberId),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["limit"] = 3,
                    ["actAsPrincipalId"] = MemberId,
                    ["beforeSequence"] = BeyondSafeInteger,
                }),
            ("communication.getMessage", server => server.Conversation(ConversationId).Messages.GetAsync(MessageId, MemberId),
                new JsonObject { ["conversationId"] = ConversationId, ["messageId"] = MessageId, ["actAsPrincipalId"] = MemberId }),
            ("communication.sendMessage", server => server.Conversation(ConversationId).Messages.SendAsync("Hello", actAs: MemberId),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["text"] = "Hello",
                    ["props"] = new JsonObject(),
                    ["actAsPrincipalId"] = MemberId,
                }),
            ("communication.editMessage", server => server.Conversation(ConversationId).Messages.EditAsync(MessageId, "1", "Edited"),
                new JsonObject
                {
                    ["conversationId"] = ConversationId,
                    ["messageId"] = MessageId,
                    ["expectedRevision"] = "1",
                    ["text"] = "Edited",
                }),
            ("communication.deleteMessage", server => server.Conversation(ConversationId).Messages.DeleteAsync(MessageId, "2"),
                new JsonObject { ["conversationId"] = ConversationId, ["messageId"] = MessageId, ["expectedRevision"] = "2" }),
            ("communication.inbox", server => server.GetInboxAsync(MemberId, 9, "inbox-1"),
                new JsonObject { ["limit"] = 9, ["cursor"] = "inbox-1", ["actAsPrincipalId"] = MemberId }),
            ("communication.search", server => server.SearchAsync("hello", conversationIds: new[] { ConversationId }, limit: 7),
                new JsonObject
                {
                    ["query"] = "hello",
                    ["pageSize"] = 7,
                    ["scope"] = new JsonObject { ["conversationIds"] = new JsonArray(ConversationId) },
                }),
            ("communication.currentLiveSession", server => server.Conversation(ConversationId).Live.GetCurrentAsync(),
                new JsonObject { ["conversationId"] = ConversationId }),
            ("communication.liveSessions", server => server.Conversation(ConversationId).Live.ListHistoryAsync(4),
                new JsonObject { ["conversationId"] = ConversationId, ["limit"] = 4 }),
            ("communication.liveSession", server => server.LiveSession(LiveSessionId).GetAsync(),
                new JsonObject { ["liveSessionId"] = LiveSessionId }),
            ("communication.liveSessionParticipants", server => server.LiveSession(LiveSessionId).ListParticipantsAsync(cursor: "participants-1"),
                new JsonObject { ["liveSessionId"] = LiveSessionId, ["cursor"] = "participants-1" }),
            ("communication.alertLiveSession", server => server.LiveSession(LiveSessionId).AlertAsync("1", new[] { MemberId }),
                new JsonObject
                {
                    ["liveSessionId"] = LiveSessionId,
                    ["expectedGeneration"] = "1",
                    ["principalIds"] = new JsonArray(MemberId),
                }),
            ("communication.endLiveSession", server => server.LiveSession(LiveSessionId).EndAsync("1", "6"),
                new JsonObject { ["liveSessionId"] = LiveSessionId, ["expectedGeneration"] = "1", ["expectedRevision"] = "6" }),
            ("communication.liveSessionOperation", server => server.LiveOperation(OperationId).GetAsync(),
                new JsonObject { ["operationId"] = OperationId }),
        };

        public static TheoryData<string> CallKeys() => Theories.Names(Calls.Select(call => call.Key));

        [Fact]
        public void EveryAnnotatedBackendKeyOperationHasATypedServerSdkMethodOrADocumentedExemption()
        {
            string[] wrapped = Calls.Select(call => call.Key).ToArray();
            Assert.Equal(wrapped.Length, wrapped.Distinct(StringComparer.Ordinal).Count());
            foreach (KeyValuePair<string, string> exemption in Unwrapped)
            {
                Assert.True(BackendKeyScopes.Value.ContainsKey(exemption.Key), exemption.Key + " is not a backend-key operation");
                Assert.False(string.IsNullOrWhiteSpace(exemption.Value), exemption.Key + " needs a reason");
                Assert.DoesNotContain(exemption.Key, wrapped);
            }

            Assert.Equal(
                BackendKeyScopes.Value.Keys.Where(key => !Unwrapped.ContainsKey(key)).OrderBy(key => key, StringComparer.Ordinal),
                wrapped.OrderBy(key => key, StringComparer.Ordinal));
            var scopeNames = new HashSet<string>(Spec.Load("ir.json")["scopes"]!.AsArray().Select(scope => (string)scope!["name"]!),
                StringComparer.Ordinal);
            foreach (KeyValuePair<string, string[][]> operation in BackendKeyScopes.Value)
            {
                foreach (string scope in operation.Value.SelectMany(alternative => alternative))
                    Assert.True(scopeNames.Contains(scope), operation.Key + ": unknown scope " + scope);
            }
        }

        [Theory]
        [MemberData(nameof(CallKeys))]
        public async Task EveryCallSendsItsExactInputOnceAndSurfacesTheAuthorityRejection(string key)
        {
            (string _, Func<ProjectServerClient, Task> call, JsonObject? input) = Calls.Single(entry => entry.Key == key);
            string? scope = BackendKeyScopes.Value[key][0].FirstOrDefault();
            var authority = new FakeAuthority(request => scope == null
                ? Fixtures.GraphqlError(request,
                    new JsonObject { ["code"] = "RATE_LIMITED", ["retryable"] = true, ["status"] = 429, ["retryAfter"] = 2 })
                : Fixtures.GraphqlError(request, new JsonObject { ["code"] = "SCOPE_REQUIRED", ["retryable"] = false, ["status"] = 403 },
                    "The backend key requires the current " + scope + " scope"));

            ConvoHopException error = await Assert.ThrowsAnyAsync<ConvoHopException>(() => call(Server(authority)));
            AuthorityRequest request = Assert.Single(authority.Requests);
            Assert.Equal(key, request.Key);
            Assert.Equal("Bearer " + BackendKey, request.Authorization);
            Assert.Equal(input != null, request.HasInput);
            Js.Equal(input, request.Input, key);
            Assert.Equal(request.RequestId, error.RequestId);
            Assert.DoesNotContain(BackendKey, error.ToString(), StringComparison.Ordinal);
            if (scope == null)
            {
                Assert.IsType<ConvoHopException>(error);
                Assert.Equal("RATE_LIMITED", error.Code);
                Assert.Equal(TimeSpan.FromSeconds(2), error.RetryAfter);
            }
            else
            {
                ScopeRequiredException scoped = Assert.IsType<ScopeRequiredException>(error);
                Assert.Equal<(string, int, string, string?)>(("SCOPE_REQUIRED", 403, "rejected", scope),
                    (scoped.Code, scoped.Status, scoped.Outcome, scoped.Scope));
            }
        }

        [Fact]
        public void CallReadsAcceptCallReadOrCallManageAsTheReadmeDocuments()
        {
            foreach (string key in new[]
            {
                "communication.currentLiveSession", "communication.liveSession", "communication.liveSessions",
                "communication.liveSessionParticipants", "communication.liveSessionOperation",
            })
            {
                Assert.Equal("callRead|callManage", Alternatives(key));
            }

            foreach (string key in new[] { "communication.alertLiveSession", "communication.endLiveSession" })
                Assert.Equal("callManage", Alternatives(key));
        }

        [Fact]
        public async Task ActAsSearchScopeAndPageBoundsAreCheckedBeforeAnyRequestIsSent()
        {
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = Fixtures.Full("SearchPage", new JsonObject
                {
                    ["items"] = new JsonArray(),
                    ["complete"] = true,
                    ["refreshRequired"] = false,
                }),
            }));
            ProjectServerClient server = Server(authority);
            ServerConversation conversation = server.Conversation(ConversationId);

            ArgumentNullException inbox = await Assert.ThrowsAsync<ArgumentNullException>(() => server.GetInboxAsync(null!));
            Assert.Equal("actAs", inbox.ParamName);
            ArgumentException unscoped = await Assert.ThrowsAsync<ArgumentException>(() => server.SearchAsync("hello"));
            Assert.StartsWith("Backend search requires actAs or conversationIds", unscoped.Message, StringComparison.Ordinal);
            foreach (string? actAs in new[] { null, MemberId })
            {
                ArgumentException empty = await Assert.ThrowsAsync<ArgumentException>(() =>
                    server.SearchAsync("hello", actAs, Array.Empty<string>()));
                Assert.StartsWith("Search conversationIds must name at least one conversation", empty.Message, StringComparison.Ordinal);
            }

            await Assert.ThrowsAsync<ArgumentException>(() => server.SearchAsync("hello", "not-a-uuid"));
            await Assert.ThrowsAsync<ArgumentException>(() => conversation.Messages.SendAsync("x", actAs: "not-a-uuid"));
            await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => conversation.Messages.ListAsync(0));
            await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => server.GetInboxAsync(MemberId, 101));
            await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => server.LiveSession(LiveSessionId).ListParticipantsAsync(0));
            await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => conversation.Live.ListHistoryAsync(101));
            ArgumentException role = await Assert.ThrowsAsync<ArgumentException>(() => conversation.Members.AddAsync(MemberId, "owner", "0"));
            Assert.StartsWith("Invalid membership role", role.Message, StringComparison.Ordinal);
            Assert.Throws<ArgumentException>(() => server.Conversation("not-a-uuid"));
            Assert.Empty(authority.Requests);

            SearchPage page = await server.SearchAsync("hello", MemberId);
            Assert.Empty(page.Items);
            Js.Equal(new JsonArray(new JsonObject { ["query"] = "hello", ["pageSize"] = 100, ["actAsPrincipalId"] = MemberId }),
                Inputs(authority));
        }

        [Fact]
        public async Task ResultsThatDoNotMatchTheRequestAreRejectedRatherThanReturned()
        {
            string otherConversation = Fixtures.NewId(), sentCursor = Incarnation;
            var authority = new FakeAuthority(request => request.Key switch
            {
                "communication.sendMessage" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = Fixtures.Full("MessageAck", new JsonObject
                    {
                        ["messageId"] = MessageId,
                        ["conversationId"] = ConversationId,
                        ["sequence"] = "7",
                        ["revision"] = "1",
                        ["status"] = "sent",
                        ["cursor"] = new JsonObject { ["incarnation"] = sentCursor, ["conversationId"] = ConversationId, ["sequence"] = "7" },
                    }),
                }),
                "communication.messages" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = Fixtures.Full("MessagePage", new JsonObject
                    {
                        ["items"] = new JsonArray(Message(otherConversation)),
                        ["complete"] = true,
                        ["refreshRequired"] = false,
                    }),
                }),
                "communication.search" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = Fixtures.Full("SearchPage", new JsonObject
                    {
                        ["items"] = new JsonArray(new JsonObject
                        {
                            ["conversationId"] = otherConversation,
                            ["message"] = Message(otherConversation),
                        }),
                        ["complete"] = true,
                        ["refreshRequired"] = false,
                    }),
                }),
                "communication.createPrincipal" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = Fixtures.Full("Principal", new JsonObject
                    {
                        ["principalId"] = PrincipalId,
                        ["externalUserId"] = "someone-else",
                        ["status"] = "active",
                        ["revision"] = "1",
                    }),
                }),
                _ => throw new InvalidOperationException("Unexpected " + request.Key),
            });
            ProjectServerClient server = Server(authority);
            ServerConversation conversation = server.Conversation(ConversationId);

            MessageAck receipt = await conversation.Messages.SendAsync("Hello", actAs: MemberId);
            Js.Equal(new JsonObject { ["incarnation"] = Incarnation, ["conversationId"] = ConversationId, ["sequence"] = "7" },
                JsonSerializer.SerializeToNode(receipt.Cursor, ConvoHopJsonContext.Default.Cursor));
            sentCursor = Fixtures.NewId();
            await AssertInvalid("Invalid send receipt scope", () => conversation.Messages.SendAsync("Hello"));
            await AssertInvalid("Message page does not match the request", () => conversation.Messages.ListAsync());
            await AssertInvalid("Search hit does not match the request",
                () => server.SearchAsync("hello", conversationIds: new[] { ConversationId }));
            await AssertInvalid("Principal does not match the request", () => server.Principals.CreateAsync("fixture-user"));
        }

        [Fact]
        public async Task MemberMutesActAsTheMemberAndRejectAResultForAnyoneElse()
        {
            var muted = new JsonObject
            {
                ["conversationId"] = ConversationId,
                ["principalId"] = MemberId,
                ["muted"] = true,
                ["until"] = MuteUntil,
            };
            JsonObject unmuted = Js.With(muted, new JsonObject { ["muted"] = false, ["until"] = null });
            var answers = new Queue<JsonObject>(new[] { muted, unmuted, Js.With(muted, new JsonObject { ["principalId"] = PrincipalId }) });
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = Fixtures.Full("ConversationMute", answers.Dequeue()),
            }));
            ServerMembers members = Server(authority).Conversation(ConversationId).Members;

            await Assert.ThrowsAsync<ArgumentException>(() => members.SetMuteAsync("not-a-uuid", false));
            await Assert.ThrowsAsync<ArgumentException>(() => members.GetMuteAsync("not-a-uuid"));
            Assert.Empty(authority.Requests);

            Js.Equal(muted, Serialize(await members.SetMuteAsync(MemberId, true, MuteUntil, RequestId)));
            Js.Equal(unmuted, Serialize(await members.SetMuteAsync(MemberId, false)));
            await AssertInvalid("Mute does not match the request", () => members.GetMuteAsync(MemberId));
            Js.Equal(new JsonArray(
                    new JsonArray("communication.setConversationMute", new JsonObject
                    {
                        ["conversationId"] = ConversationId,
                        ["muted"] = true,
                        ["until"] = MuteUntil,
                        ["actAsPrincipalId"] = MemberId,
                    }),
                    new JsonArray("communication.setConversationMute", new JsonObject
                    {
                        ["conversationId"] = ConversationId,
                        ["muted"] = false,
                        ["actAsPrincipalId"] = MemberId,
                    }),
                    new JsonArray("communication.conversationMute", new JsonObject
                    {
                        ["conversationId"] = ConversationId,
                        ["actAsPrincipalId"] = MemberId,
                    })),
                new JsonArray(authority.Requests.Select(request => (JsonNode)new JsonArray(request.Key, request.Input?.DeepClone())).ToArray()));
            Assert.Equal(RequestId, authority.Requests[0].RequestId);
        }

        [Fact]
        public async Task EndingALiveSessionCompletesOnlyWithAnEnforcedMediaCutoff()
        {
            JsonObject completion = Completion("ENFORCED");
            FakeAuthority authority = LiveAuthority(LiveOperationResult("RUNNING"),
                LiveOperationResult("COMPLETED", new JsonObject { ["completedAt"] = Fixtures.Now(), ["completion"] = completion.DeepClone() }));

            ServerLiveOperation operation = await Server(authority).LiveSession(LiveSessionId).EndAsync("1", "6", RequestId);
            Assert.Equal(OperationId, operation.OperationId);
            Assert.Equal(RequestId, operation.Receipt!.RequestId);
            LiveSessionOperationCompletion completed = await operation.WaitForCompletionAsync(TimeSpan.FromSeconds(5));
            Js.Equal(completion, JsonSerializer.SerializeToNode(completed, ConvoHopJsonContext.Default.LiveSessionOperationCompletion));
            Assert.Equal(new[] { "communication.endLiveSession", "communication.liveSessionOperation", "communication.liveSessionOperation" },
                authority.Requests.Select(request => request.Key));

            FakeAuthority unenforced = LiveAuthority(LiveOperationResult("COMPLETED",
                new JsonObject { ["completedAt"] = Fixtures.Now(), ["completion"] = Completion("PENDING") }));
            ServerLiveOperation unenforcedEnd = await Server(unenforced).LiveSession(LiveSessionId).EndAsync("1", "6");
            await AssertInvalid("Completed live operation is missing its completion evidence", () => unenforcedEnd.WaitForCompletionAsync());
        }

        [Fact]
        public async Task AFailedEndCarriesItsLiveErrorCodeAsAnAcceptedOutcome()
        {
            FakeAuthority failed = LiveAuthority(LiveOperationResult("FAILED", new JsonObject
            {
                ["completedAt"] = Fixtures.Now(),
                ["failure"] = new JsonObject { ["code"] = "LIVE_SESSION_CLOSED", ["message"] = "The live session already ended" },
            }));
            ServerLiveOperation operation = await Server(failed).LiveSession(LiveSessionId).EndAsync("1", "6", RequestId);

            ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(() => operation.WaitForCompletionAsync());
            Assert.Equal<(string, string, string, int)>(("LIVE_SESSION_CLOSED", RequestId, "accepted", 409),
                (error.Code, error.RequestId, error.Outcome, error.Status));
        }

        [Fact]
        public async Task AnUnfinishedLiveOperationRequiresResolutionAndTheTimeoutIsBounded()
        {
            ProjectServerClient server = Server(LiveAuthority(LiveOperationResult("RUNNING"), LiveOperationResult("RUNNING")));

            ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(() =>
                server.LiveOperation(OperationId).WaitForCompletionAsync(TimeSpan.FromMilliseconds(1)));
            Assert.Equal(("RESOLUTION_REQUIRED", "accepted"), (error.Code, error.Outcome));
            foreach (TimeSpan timeout in new[] { TimeSpan.Zero, TimeSpan.FromMilliseconds(300001) })
            {
                await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
                    server.LiveOperation(OperationId).WaitForCompletionAsync(timeout));
            }
        }

        [Fact]
        public async Task AReattachedLiveOperationRejectsAChangedScope()
        {
            ProjectServerClient server = Server(LiveAuthority(LiveOperationResult("RUNNING"),
                LiveOperationResult("RUNNING", new JsonObject { ["liveSessionId"] = Fixtures.NewId() })));
            ServerLiveOperation reattached = server.LiveOperation(OperationId);

            Assert.Equal(LiveSessionId, (await reattached.GetAsync()).LiveSessionId);
            await AssertInvalid("Live operation scope changed", () => reattached.GetAsync());
        }

        private static ProjectServerClient Server(FakeAuthority authority) =>
            new ProjectServerClient(new ProjectServerClientOptions
            {
                BaseUrl = BaseUrl,
                ProjectId = ProjectId,
                Incarnation = Incarnation,
                BackendKey = BackendKey,
                HttpClient = authority.Client(),
            });

        private static string Alternatives(string key) =>
            string.Join("|", BackendKeyScopes.Value[key].Select(alternative => string.Join(",", alternative)));

        private static JsonArray Inputs(FakeAuthority authority) =>
            new JsonArray(authority.Requests.Select(request => request.Input?.DeepClone()).ToArray());

        private static async Task AssertInvalid(string message, Func<Task> call)
        {
            ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(call);
            Assert.Equal<(string, string, int, string)>(("INVALID_RESPONSE", "unknown", 503, message),
                (error.Code, error.Outcome, error.Status, error.Message));
        }

        private static JsonElement Element(string json)
        {
            using JsonDocument document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }

        private static JsonNode Serialize(ConversationMute mute) =>
            JsonSerializer.SerializeToNode(mute, ConvoHopJsonContext.Default.ConversationMute)!;

        private static JsonObject Message(string conversationId) => Fixtures.Full("Message", new JsonObject
        {
            ["messageId"] = Fixtures.NewId(),
            ["conversationId"] = conversationId,
            ["authorId"] = PrincipalId,
            ["sequence"] = "1",
            ["revision"] = "1",
            ["revisionSequence"] = "1",
            ["createdAt"] = Fixtures.Now(),
            ["deleted"] = false,
            ["text"] = "Fixture",
            ["props"] = new JsonObject(),
        });

        private static JsonObject Cutoff(string state) => Fixtures.Full("LiveMediaCutoff", new JsonObject
        {
            ["state"] = state,
            ["operationId"] = OperationId,
            ["enforcedAt"] = state == "ENFORCED" ? Fixtures.Now() : null,
            ["scope"] = Fixtures.Full("LiveCutoffScope", new JsonObject
            {
                ["kind"] = "GENERATION",
                ["liveSessionId"] = LiveSessionId,
                ["generation"] = "1",
            }),
        });

        private static JsonObject Completion(string cutoff) => Fixtures.Full("LiveSessionOperationCompletion", new JsonObject
        {
            ["liveSessionId"] = LiveSessionId,
            ["generation"] = "1",
            ["state"] = "ENDED",
            ["revision"] = "8",
            ["completedAt"] = Fixtures.Now(),
            ["mediaCutoff"] = Cutoff(cutoff),
        });

        private static JsonObject LiveOperationResult(string state, JsonObject? fields = null) => Fixtures.Full("LiveSessionOperation",
            Js.With(new JsonObject
            {
                ["operationId"] = OperationId,
                ["requestId"] = RequestId,
                ["liveSessionId"] = LiveSessionId,
                ["kind"] = "END",
                ["state"] = state,
                ["revision"] = "7",
                ["requestedAt"] = Fixtures.Now(),
            }, fields ?? new JsonObject()));

        /// <summary>Answers an end with a pending cutoff, then each operation read with the next of <paramref name="states"/>.</summary>
        private static FakeAuthority LiveAuthority(params JsonObject[] states)
        {
            var queue = new Queue<JsonObject>(states);
            return new FakeAuthority(request =>
            {
                if (request.Key == "communication.endLiveSession")
                {
                    return Fixtures.Reply(request, new JsonObject
                    {
                        ["operation"] = Fixtures.Full("OperationRef", new JsonObject
                        {
                            ["operationId"] = OperationId,
                            ["owner"] = "communication",
                            ["href"] = "/operations/" + OperationId,
                            ["state"] = "running",
                        }),
                        ["result"] = new JsonObject
                        {
                            ["liveSessionId"] = LiveSessionId,
                            ["operationId"] = OperationId,
                            ["mediaCutoff"] = Cutoff("PENDING"),
                        },
                    });
                }

                if (request.Key != "communication.liveSessionOperation") throw new InvalidOperationException("Unexpected " + request.Key);
                return Fixtures.Reply(request, new JsonObject { ["result"] = queue.Dequeue() });
            });
        }
    }
}
