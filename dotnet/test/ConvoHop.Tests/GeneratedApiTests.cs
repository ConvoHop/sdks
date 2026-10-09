using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Api;
using ConvoHop.Internal;
using ConvoHop.Models;
using ConvoHop.Tests.TestSupport;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>
    /// The generated plane APIs and their lazily requested pages, ported from the JVM server SDK's <c>PaginationTest</c>.
    /// </summary>
    /// <remarks>
    /// The TypeScript server SDK has no generated plane API, so these tests follow the JVM SDK. Pages are an
    /// <see cref="IAsyncEnumerable{T}"/>: an enumerator that has ended returns false again instead of throwing, and both the
    /// method's token and the <c>WithCancellation</c> token stop enumeration.
    /// </remarks>
    public sealed class GeneratedApiTests
    {
        private const string ProjectAuthority = "http://localhost:18080";
        private const string ManagementAuthority = "http://localhost:18081";

        [Fact]
        public async Task PagesFollowEachNextCursorWithANewRequestUntilTheCompletePage()
        {
            string conversationId = Fixtures.NewId();
            string[] principals = { Fixtures.NewId(), Fixtures.NewId(), Fixtures.NewId() };
            var authority = new FakeAuthority(request => Js.Text(request.Input, "cursor") switch
            {
                null => Members(request, conversationId, principals.Take(2), false, "after-2"),
                "after-2" => Members(request, conversationId, principals.Skip(2), false, "after-3"),
                _ => Members(request, conversationId, Array.Empty<string>(), true, null),
            });
            MembersRequestInput input = MembersInput(conversationId, null);
            IAsyncEnumerable<MemberPage> pages = Server(authority).Communication.MembersPagesAsync(input);
            input.Limit = 50;
            input.Cursor = "after-3";
            Assert.Empty(authority.Requests);

            var listed = new List<string>();
            await foreach (MemberPage page in pages) listed.AddRange(page.Items.Select(member => member.PrincipalId));

            Assert.Equal(principals, listed);
            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            var first = new JsonObject { ["conversationId"] = conversationId, ["limit"] = 2 };
            Assert.Equal(3, requests.Count);
            Js.Equal(first, requests[0].Input, "the first request sends the input as it was when the method was called");
            Js.Equal(Js.With(first, new JsonObject { ["cursor"] = "after-2" }), requests[1].Input);
            Js.Equal(Js.With(first, new JsonObject { ["cursor"] = "after-3" }), requests[2].Input);
            Assert.Equal(3, requests.Select(request => request.RequestId).Distinct(StringComparer.Ordinal).Count());
            Assert.All(requests, request => Assert.True(Protocol.IsId(request.RequestId)));

            await using (IAsyncEnumerator<MemberPage> again = pages.GetAsyncEnumerator())
            {
                Assert.True(await again.MoveNextAsync());
                Assert.Equal(2, again.Current.Items.Count);
                Js.Equal(first, authority.Requests[3].Input, "each enumeration starts again from the input");
                Assert.True(await again.MoveNextAsync());
                Assert.True(await again.MoveNextAsync());
                Assert.True(again.Current.Complete);
                Assert.False(await again.MoveNextAsync());
                Assert.False(await again.MoveNextAsync());
            }

            Assert.Equal(6, authority.Requests.Count);
        }

        [Fact]
        public async Task DescendingDecimalCursorsCompareAsNumbersNotText()
        {
            string conversationId = Fixtures.NewId();
            var authority = new FakeAuthority(request => Js.Text(request.Input, "beforeSequence") switch
            {
                null => Messages(request, false, "50"),
                "50" => Messages(request, false, "9"),
                _ => Messages(request, true, null),
            });

            var pages = new List<MessagePage>();
            await foreach (MessagePage page in Server(authority).Communication.MessagesPagesAsync(MessagesInput(conversationId, null)))
                pages.Add(page);

            Assert.Equal(3, pages.Count);
            Assert.Equal(new[] { null, "50", "9" }, authority.Requests.Select(request => Js.Text(request.Input, "beforeSequence")));
        }

        [Fact]
        public async Task DecimalCursorsThatDoNotDecreaseOrAreMalformedAreInvalid()
        {
            string conversationId = Fixtures.NewId();
            string? next = null;
            var authority = new FakeAuthority(request => Messages(request, false, next));
            CommunicationApi api = Server(authority).Communication;

            foreach (string cursor in new[] { "100", "101" })
            {
                next = cursor;
                await InvalidFirst(authority, api.MessagesPagesAsync(MessagesInput(conversationId, "100")),
                    "Incomplete page did not advance the cursor");
            }

            foreach (string cursor in new[] { "fifty", "-1", "01", "9223372036854775808" })
            {
                next = cursor;
                await InvalidFirst(authority, api.MessagesPagesAsync(MessagesInput(conversationId, null)), "Malformed next cursor");
            }

            int sent = authority.Requests.Count;
            foreach (string cursor in new[] { "fifty", "01", "9223372036854775808" })
            {
                ArgumentException error = Assert.Throws<ArgumentException>(() =>
                {
                    _ = api.MessagesPagesAsync(MessagesInput(conversationId, cursor));
                });
                Assert.Equal("input", error.ParamName);
                Assert.StartsWith("Invalid beforeSequence cursor", error.Message, StringComparison.Ordinal);
            }

            Assert.Equal(sent, authority.Requests.Count);
        }

        [Fact]
        public async Task IncompletePagesNeedANextCursorThatChanges()
        {
            string conversationId = Fixtures.NewId();
            Func<AuthorityRequest, HttpResponseMessage> respond = _ => throw new InvalidOperationException("No response is set");
            var authority = new FakeAuthority(request => respond(request));
            CommunicationApi api = Server(authority).Communication;

            respond = request => Members(request, conversationId, Array.Empty<string>(), false, null);
            await InvalidFirst(authority, api.MembersPagesAsync(MembersInput(conversationId, null)), "Incomplete page has no next cursor");

            respond = request => Members(request, conversationId, Array.Empty<string>(), false, "same");
            await InvalidFirst(authority, api.MembersPagesAsync(MembersInput(conversationId, "same")),
                "Incomplete page did not advance the cursor");
            await using (IAsyncEnumerator<MemberPage> pages = api.MembersPagesAsync(MembersInput(conversationId, null)).GetAsyncEnumerator())
            {
                Assert.True(await pages.MoveNextAsync());
                Assert.Equal("same", pages.Current.NextCursor);
                await Invalid(authority, pages, "Incomplete page did not advance the cursor");
            }

            respond = request => Fixtures.Reply(request, new JsonObject { ["result"] = null });
            await InvalidFirst(authority, api.MembersPagesAsync(MembersInput(conversationId, null)), "Missing current authority result");
        }

        [Fact]
        public async Task APageThatRequiresARefreshEndsEnumerationInsteadOfResumingFromTheCursor()
        {
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = Fixtures.Full("MemberPage", new JsonObject
                {
                    ["items"] = new JsonArray(),
                    ["complete"] = true,
                    ["refreshRequired"] = true,
                    ["nextCursor"] = "after-1",
                }),
            }));
            await using IAsyncEnumerator<MemberPage> pages = Server(authority).Communication
                .MembersPagesAsync(MembersInput(Fixtures.NewId(), "after-0")).GetAsyncEnumerator();

            InvalidOperationException error = await Assert.ThrowsAsync<InvalidOperationException>(async () => await pages.MoveNextAsync());
            Assert.Equal("Explicit authorized resynchronization required", error.Message);
            Assert.Same(error, await Assert.ThrowsAsync<InvalidOperationException>(async () => await pages.MoveNextAsync()));
            Assert.Single(authority.Requests);
        }

        [Fact]
        public async Task ARejectedRequestKeepsThePositionSoTheNextMoveNextRepeatsIt()
        {
            string conversationId = Fixtures.NewId();
            int calls = 0;
            var authority = new FakeAuthority(request => Interlocked.Increment(ref calls) switch
            {
                1 => Members(request, conversationId, Array.Empty<string>(), false, "after-1"),
                2 => Fixtures.GraphqlError(request, new JsonObject { ["code"] = "FORBIDDEN", ["status"] = 403 }, "Backend scope missing"),
                _ => Members(request, conversationId, Array.Empty<string>(), true, null),
            });
            await using IAsyncEnumerator<MemberPage> pages = Server(authority).Communication
                .MembersPagesAsync(MembersInput(conversationId, null)).GetAsyncEnumerator();

            Assert.True(await pages.MoveNextAsync());
            Assert.False(pages.Current.Complete);
            ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(async () => await pages.MoveNextAsync());
            Assert.Equal<(string, string, int)>((ErrorCodes.Forbidden, "rejected", 403), (error.Code, error.Outcome, error.Status));
            Assert.True(await pages.MoveNextAsync());
            Assert.True(pages.Current.Complete);
            Assert.False(await pages.MoveNextAsync());

            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(new[] { null, "after-1", "after-1" }, requests.Select(request => Js.Text(request.Input, "cursor")));
            Assert.Equal(requests[1].RequestId, error.RequestId);
            Assert.NotEqual(requests[1].RequestId, requests[2].RequestId);
        }

        [Fact]
        public async Task TheMethodTokenAndTheWithCancellationTokenEachStopEnumerationBeforeARequest()
        {
            var authority = new FakeAuthority(Unexpected);
            CommunicationApi api = Server(authority).Communication;
            using var cancelled = new CancellationTokenSource();
            cancelled.Cancel();
            using var live = new CancellationTokenSource();
            MembersRequestInput input = MembersInput(Fixtures.NewId(), null);

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Drain(api.MembersPagesAsync(input, cancelled.Token), default));
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Drain(api.MembersPagesAsync(input), cancelled.Token));
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Drain(api.MembersPagesAsync(input, cancelled.Token), live.Token));
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Drain(api.MembersPagesAsync(input, live.Token), cancelled.Token));
            Assert.Empty(authority.Requests);
        }

        [Fact]
        public async Task AnEnumeratorRejectsOverlappingRequestsAndUseAfterDisposal()
        {
            string conversationId = Fixtures.NewId();
            var release = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var authority = new FakeAuthority(async request =>
            {
                await release.Task.ConfigureAwait(false);
                return Members(request, conversationId, Array.Empty<string>(), true, null);
            });
            IAsyncEnumerator<MemberPage> pages = Server(authority).Communication
                .MembersPagesAsync(MembersInput(conversationId, null)).GetAsyncEnumerator();

            ValueTask<bool> pending = pages.MoveNextAsync();
            InvalidOperationException overlap = await Assert.ThrowsAsync<InvalidOperationException>(async () => await pages.MoveNextAsync());
            Assert.Equal("A page request is already in progress", overlap.Message);
            InvalidOperationException early = await Assert.ThrowsAsync<InvalidOperationException>(async () => await pages.DisposeAsync());
            Assert.Equal("A page request is still in progress", early.Message);

            release.SetResult(true);
            Assert.True(await pending);
            Assert.True(pages.Current.Complete);
            await pages.DisposeAsync();
            await pages.DisposeAsync();
            await Assert.ThrowsAsync<ObjectDisposedException>(async () => await pages.MoveNextAsync());
            Assert.Single(authority.Requests);
        }

        [Fact]
        public void GeneratedMethodsCheckTheirArgumentsBeforeSendingAnything()
        {
            var authority = new FakeAuthority(Unexpected);
            CommunicationApi api = Server(authority).Communication;

            Assert.Equal("input", Assert.Throws<ArgumentNullException>(() => { _ = api.MembersPagesAsync(null!); }).ParamName);
            Assert.Equal("input", Assert.Throws<ArgumentNullException>(() => { _ = api.MembersAsync(null!); }).ParamName);
            Assert.Equal("input", Assert.Throws<ArgumentNullException>(() => { _ = api.CreatePrincipalAsync(null!); }).ParamName);
            Assert.Equal("input", Assert.Throws<ArgumentNullException>(() =>
            {
                _ = api.RedeemCredentialAsync(null!, Element("{}"));
            }).ParamName);
            ArgumentException permit = Assert.Throws<ArgumentException>(() =>
            {
                _ = api.RedeemCredentialAsync(new RedeemCredentialRequestInput(Fixtures.NewId()), default);
            });
            Assert.Equal("credentialDeliveryPermit", permit.ParamName);
            Assert.Empty(authority.Requests);
        }

        [Fact]
        public async Task PlainMethodsSendTheirOperationForTheClientProjectWithTheGivenRequestId()
        {
            string projectId = Fixtures.NewId(), principalId = Fixtures.NewId(), requestId = Fixtures.NewId();
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = Fixtures.Full("Principal", new JsonObject
                {
                    ["principalId"] = principalId,
                    ["externalUserId"] = "fixture-user",
                    ["status"] = "active",
                    ["revision"] = "1",
                }),
            }));
            ProjectServerClient client = Server(authority, projectId);
            Assert.Same(client.Communication, client.Communication);

            CreatePrincipalReply reply = await client.Communication.CreatePrincipalAsync(new CreatePrincipalRequestInput("fixture-user"), requestId);
            await client.Communication.CreatePrincipalAsync(new CreatePrincipalRequestInput("fixture-user"));

            Assert.Equal(principalId, reply.Result!.PrincipalId);
            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(2, requests.Count);
            Assert.Equal(requestId, requests[0].RequestId);
            Assert.NotEqual(requestId, requests[1].RequestId);
            Assert.True(Protocol.IsId(requests[1].RequestId));
            Assert.All(requests, request =>
            {
                Assert.Equal(Operations.Communication.CreatePrincipal.Id, request.Key);
                Assert.Equal(projectId, (string?)request.Context["projectId"]);
                Js.Equal(new JsonObject { ["externalUserId"] = "fixture-user" }, request.Input);
            });
        }

        [Fact]
        public async Task CredentialRedemptionSendsThePermitInTheContextAndNeverPersistsIt()
        {
            string deliveryId = Fixtures.NewId(), requestId = Fixtures.NewId();
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = Fixtures.Full("CredentialCapsule", new JsonObject
                {
                    ["kind"] = "backendKey",
                    ["keyId"] = "fixture-key",
                    ["backendKey"] = "fixture-secret-key",
                }),
            }));
            ProjectServerClient client = Server(authority);
            JsonElement permit = Element("{\"signature\":\"fixture-secret-permit\"}");

            RedeemCredentialReply reply = await client.Communication.RedeemCredentialAsync(new RedeemCredentialRequestInput(deliveryId), permit,
                requestId);

            Assert.Equal("fixture-secret-key", reply.Result!.BackendKey);
            AuthorityRequest request = Assert.Single(authority.Requests);
            Assert.Equal<(string, string)>((Operations.Communication.RedeemCredential.Id, requestId), (request.Key, request.RequestId));
            Js.Equal(new JsonObject { ["signature"] = "fixture-secret-permit" }, request.Context["credentialDeliveryPermit"]);
            Js.Equal(new JsonObject { ["deliveryId"] = deliveryId }, request.Input);
            string states = Js.Stringify(Recovery.Snapshot(await client.Transport.GetRecoveryStatesAsync()));
            Assert.DoesNotContain("fixture-secret", states, StringComparison.Ordinal);
        }

        [Fact]
        public async Task ManagementMethodsSendNoProjectAndDecodeTheirResults()
        {
            string orgId = Fixtures.NewId();
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = Fixtures.Full("OrganizationPage", new JsonObject
                {
                    ["items"] = new JsonArray(Fixtures.Full("Organization", new JsonObject
                    {
                        ["orgId"] = orgId,
                        ["name"] = "Fixture organization",
                        ["status"] = "active",
                        ["revision"] = "3",
                    })),
                    ["complete"] = true,
                    ["refreshRequired"] = false,
                }),
            }));
            ConvoHopManagementClient client = Management(authority);
            Assert.Same(client.Management, client.Management);

            OrganizationsReply reply = await client.Management.OrganizationsAsync();

            Organization organization = Assert.Single(reply.Result!.Items);
            Assert.Equal<(string, string)>((orgId, "3"), (organization.OrgId, organization.Revision));
            AuthorityRequest request = Assert.Single(authority.Requests);
            Assert.Equal(Operations.Management.Organizations.Id, request.Key);
            Assert.False(request.HasInput);
            Assert.False(request.Context.ContainsKey("projectId"));
        }

        [Theory]
        [InlineData("communication", typeof(Operations.Communication), typeof(CommunicationApi))]
        [InlineData("management", typeof(Operations.Management), typeof(ManagementApi))]
        public void EachCatalogOperationHasOneTypedMethodAndPagesFollowThePaginationStyle(string plane, Type catalog, Type api)
        {
            MethodInfo[] methods = api.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);
            FieldInfo[] descriptors = catalog.GetFields(BindingFlags.Public | BindingFlags.Static)
                .Where(field => typeof(OperationDescriptor).IsAssignableFrom(field.FieldType))
                .ToArray();
            Assert.NotEmpty(descriptors);
            foreach (FieldInfo field in descriptors)
            {
                var descriptor = (OperationDescriptor)field.GetValue(null)!;
                Assert.Equal(plane, descriptor.Plane);
                Type[] types = field.FieldType.GetGenericArguments();
                MethodInfo method = Assert.Single(methods, candidate => candidate.Name == field.Name + "Async");
                Assert.Equal(typeof(Task<>).MakeGenericType(types[1]), method.ReturnType);
                ParameterInfo[] parameters = method.GetParameters();
                Assert.Equal(typeof(CancellationToken), parameters[parameters.Length - 1].ParameterType);
                if (types[0] == typeof(NoInput)) Assert.Single(parameters);
                else Assert.Equal(types[0], parameters[0].ParameterType);
            }

            string[] paged = Spec.Load("ir.json")["operations"]!.AsArray()
                .Where(operation => (string?)operation!["plane"] == plane && (string?)operation["layer"] != "client")
                .Where(operation => (string?)operation!["pagination"]?["style"] is "cursor" or "sequence")
                .Select(operation => Pascal((string)operation!["field"]!) + "PagesAsync")
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray();
            string[] pages = methods.Select(method => method.Name)
                .Where(name => name.EndsWith("PagesAsync", StringComparison.Ordinal))
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray();
            Assert.Equal(paged, pages);
            Assert.Equal(descriptors.Length + pages.Length, methods.Length);
            if (plane == "communication") Assert.Contains("MembersPagesAsync", pages);
        }

        private static async Task InvalidFirst<T>(FakeAuthority authority, IAsyncEnumerable<T> pages, string message)
        {
            await using IAsyncEnumerator<T> enumerator = pages.GetAsyncEnumerator();
            await Invalid(authority, enumerator, message);
        }

        /// <summary>The next page fails with a final <c>INVALID_RESPONSE</c> for the last request, and nothing more is sent.</summary>
        private static async Task Invalid<T>(FakeAuthority authority, IAsyncEnumerator<T> pages, string message)
        {
            ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(async () => await pages.MoveNextAsync());
            Assert.Equal<(string, string, string)>((ErrorCodes.InvalidResponse, "unknown", message), (error.Code, error.Outcome, error.Message));
            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(requests[requests.Count - 1].RequestId, error.RequestId);
            Assert.Same(error, await Assert.ThrowsAsync<ConvoHopException>(async () => await pages.MoveNextAsync()));
            Assert.Equal(requests.Count, authority.Requests.Count);
        }

        private static async Task Drain<T>(IAsyncEnumerable<T> pages, CancellationToken cancellationToken)
        {
            await foreach (T _ in pages.WithCancellation(cancellationToken))
            {
            }
        }

        private static ProjectServerClient Server(FakeAuthority authority, string? projectId = null) =>
            new ProjectServerClient(new ProjectServerClientOptions
            {
                BaseUrl = ProjectAuthority,
                ProjectId = projectId ?? Fixtures.NewId(),
                Incarnation = Fixtures.NewId(),
                BackendKey = "fixture-backend-key",
                HttpClient = authority.Client(),
            });

        private static ConvoHopManagementClient Management(FakeAuthority authority) =>
            new ConvoHopManagementClient(new ConvoHopManagementClientOptions
            {
                BaseUrl = ManagementAuthority,
                ActorId = Fixtures.NewId(),
                AccessToken = "fixture-operator",
                HttpClient = authority.Client(),
            });

        private static MembersRequestInput MembersInput(string conversationId, string? cursor) =>
            new MembersRequestInput(conversationId, 2) { Cursor = cursor };

        private static MessagesRequestInput MessagesInput(string conversationId, string? beforeSequence) =>
            new MessagesRequestInput(conversationId, 2) { BeforeSequence = beforeSequence };

        private static HttpResponseMessage Members(AuthorityRequest request, string conversationId, IEnumerable<string> principals,
            bool complete, string? next)
        {
            var items = new JsonArray(principals.Select(principalId => (JsonNode)Fixtures.Full("Member", new JsonObject
            {
                ["conversationId"] = conversationId,
                ["principalId"] = principalId,
                ["role"] = "member",
                ["status"] = "active",
                ["membershipEpoch"] = "1",
                ["visibilityEpoch"] = "1",
                ["revision"] = "1",
                ["visibleFromSequence"] = "1",
                ["canStartBroadcast"] = false,
            })).ToArray());
            return Page(request, "MemberPage", items, complete, next);
        }

        private static HttpResponseMessage Messages(AuthorityRequest request, bool complete, string? next) =>
            Page(request, "MessagePage", new JsonArray(), complete, next);

        private static HttpResponseMessage Page(AuthorityRequest request, string type, JsonArray items, bool complete, string? next) =>
            Fixtures.Reply(request, new JsonObject
            {
                ["result"] = Fixtures.Full(type, new JsonObject
                {
                    ["items"] = items,
                    ["complete"] = complete,
                    ["refreshRequired"] = false,
                    ["nextCursor"] = next,
                }),
            });

        private static HttpResponseMessage Unexpected(AuthorityRequest request) =>
            throw new InvalidOperationException("Unexpected " + request.OperationName);

        private static string Pascal(string name) => char.ToUpperInvariant(name[0]) + name.Substring(1);

        private static JsonElement Element(string json)
        {
            using JsonDocument document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }
    }
}
