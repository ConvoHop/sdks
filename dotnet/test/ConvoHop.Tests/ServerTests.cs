using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Generated;
using ConvoHop.Models;
using ConvoHop.Tests.TestSupport;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>
    /// Server SDK onboarding, management, scopes and recovery, ported from <c>packages/server/test/server.test.mjs</c>.
    /// </summary>
    /// <remarks>
    /// JavaScript-only checks have no equivalent here. A conversation handle cannot be thenable. The typed inputs cannot
    /// carry an unknown field, so the transport guard is driven through its internal raw path. One <c>RecoveryStorage</c>
    /// option replaces the conflicting synchronous and asynchronous storage options. Reading recovery records before
    /// restoration waits for it instead of throwing, and <see cref="IRecoveryStorage"/> has no removal.
    /// <c>JSON.stringify(error)</c> becomes the exception's public property values.
    /// </remarks>
    public sealed class ServerTests
    {
        private const string LoopbackAuthority = "http://127.0.0.1:18080";
        private const string LocalAuthority = "http://localhost:18080";
        private const string ManagementAuthority = "http://localhost:18081";

        [Fact]
        public async Task ConversationHandlesGrantBroadcastPermissionThroughGeneratedBackendScopeNotAModeratorToggle()
        {
            string projectId = Fixtures.NewId(), incarnation = Fixtures.NewId(), conversationId = Fixtures.NewId();
            string principalId = Fixtures.NewId(), requestId = Fixtures.NewId();
            var member = new JsonObject
            {
                ["conversationId"] = conversationId,
                ["principalId"] = principalId,
                ["role"] = "member",
                ["status"] = "active",
                ["membershipEpoch"] = "1",
                ["visibilityEpoch"] = "1",
                ["revision"] = "2",
                ["visibleFromSequence"] = "1",
                ["canStartBroadcast"] = true,
            };
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = new JsonObject { ["member"] = member.DeepClone(), ["mediaCutoff"] = null },
            }));
            ProjectServerClient server = Server(LoopbackAuthority, projectId, incarnation, "fixture-only", authority);

            ServerConversation handle = server.Conversation(conversationId);
            Assert.Empty(authority.Requests);
            SetBroadcastPermissionPayload result = await handle.Members.SetBroadcastPermissionAsync(principalId, true, "1", requestId);

            Assert.Equal("member", result.Result.Member.Role);
            Assert.True(result.Result.Member.CanStartBroadcast);
            AuthorityRequest sent = Assert.Single(authority.Requests);
            Assert.Equal(LoopbackAuthority + "/graphql", sent.Uri.AbsoluteUri);
            Assert.Equal("CommunicationSetBroadcastPermission", sent.OperationName);
            Assert.Equal(requestId, sent.RequestId);
            Js.Equal(new JsonObject
            {
                ["conversationId"] = conversationId,
                ["principalId"] = principalId,
                ["allowed"] = true,
                ["expectedMembershipRevision"] = "1",
            }, sent.Input);
        }

        [Fact]
        public async Task BackendDataPlaneCallsCarryGeneratedActAsPrincipalIdAndSurfaceScopeRequiredAsATypedException()
        {
            string projectId = Fixtures.NewId(), incarnation = Fixtures.NewId(), conversationId = Fixtures.NewId();
            string actAsPrincipalId = Fixtures.NewId();
            const string backendKey = "fixture-backend-key-never-in-errors";
            var authority = new FakeAuthority(request => request.OperationName switch
            {
                "CommunicationInbox" => Fixtures.GraphqlError(request,
                    new JsonObject { ["code"] = "SCOPE_REQUIRED", ["retryable"] = false, ["status"] = 403 },
                    "The backend key requires the current messageRead scope"),
                "CommunicationSendMessage" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = new JsonObject
                    {
                        ["messageId"] = Fixtures.NewId(),
                        ["conversationId"] = conversationId,
                        ["sequence"] = "1",
                        ["revision"] = "1",
                        ["status"] = "sent",
                        ["cursor"] = new JsonObject { ["incarnation"] = incarnation, ["conversationId"] = conversationId, ["sequence"] = "1" },
                    },
                }),
                _ => throw new InvalidOperationException("Unexpected operation"),
            });
            ProjectServerClient server = Server(LoopbackAuthority, projectId, incarnation, backendKey, authority);
            foreach (string key in new[] { "communication.sendMessage", "communication.messages", "communication.getMessage",
                "communication.inbox", "communication.search" })
            {
                Assert.True(Descriptor(key).InputFields.Contains("actAsPrincipalId"), key);
            }

            foreach (string key in new[] { "communication.editMessage", "communication.deleteMessage" })
                Assert.False(Descriptor(key).InputFields.Contains("actAsPrincipalId"), key);
            // Client-only operations such as events are not generated into the server SDK at all.
            Assert.DoesNotContain(Operations.All, operation => operation.Id == "communication.events");

            string requestId = Fixtures.NewId();
            var send = new SendMessageRequestInput(conversationId, "fixture", Element("{}")) { ActAsPrincipalId = actAsPrincipalId };
            SendMessageReply sent = await server.Transport.ExecuteAsync(Operations.Communication.SendMessage, projectId, send, requestId);
            Assert.Equal(conversationId, sent.Result?.ConversationId);
            Js.Equal(new JsonObject
            {
                ["conversationId"] = conversationId,
                ["text"] = "fixture",
                ["props"] = new JsonObject(),
                ["actAsPrincipalId"] = actAsPrincipalId,
            }, authority.Requests[0].Input);
            var conflicting = new SendMessageRequestInput(conversationId, "fixture", Element("{}")) { ActAsPrincipalId = Fixtures.NewId() };
            ConvoHopException conflict = await Assert.ThrowsAsync<ConvoHopException>(() =>
                server.Transport.ExecuteAsync(Operations.Communication.SendMessage, projectId, conflicting, requestId));
            Assert.Equal("IDEMPOTENCY_CONFLICT", conflict.Code);

            // The typed edit input has no actAs field; the raw path behind it rejects one before sending.
            Assert.Null(typeof(EditMessageRequestInput).GetProperty("ActAsPrincipalId"));
            string edit = Js.Stringify(new JsonObject
            {
                ["conversationId"] = conversationId,
                ["messageId"] = sent.Result!.MessageId,
                ["expectedRevision"] = "1",
                ["text"] = "fixture",
                ["props"] = new JsonObject(),
                ["actAsPrincipalId"] = actAsPrincipalId,
            });
            ConvoHopException unknown = await Assert.ThrowsAsync<ConvoHopException>(() => server.Transport.ExecuteCoreAsync(
                Operations.Communication.EditMessage, projectId, Element(edit), Fixtures.NewId(), null, CancellationToken.None));
            Assert.Equal<(string, string)>(("INVALID_REQUEST", "Unknown GraphQL input field"), (unknown.Code, unknown.Message));
            Assert.Single(authority.Requests);

            var inbox = new InboxRequestInput(10) { ActAsPrincipalId = actAsPrincipalId };
            ConvoHopException error = await Assert.ThrowsAnyAsync<ConvoHopException>(() =>
                server.Transport.ExecuteAsync(Operations.Communication.Inbox, projectId, inbox));
            ScopeRequiredException scope = Assert.IsType<ScopeRequiredException>(error);
            Assert.Equal<(string, string, int, string?)>(("SCOPE_REQUIRED", "rejected", 403, "messageRead"),
                (scope.Code, scope.Outcome, scope.Status, scope.Scope));
            Assert.DoesNotContain(backendKey, error.ToString(), StringComparison.Ordinal);
            foreach (PropertyInfo property in error.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                string value = Convert.ToString(property.GetValue(error), CultureInfo.InvariantCulture) ?? "";
                Assert.DoesNotContain(backendKey, value, StringComparison.Ordinal);
            }

            Js.Equal(new JsonObject { ["limit"] = 10, ["actAsPrincipalId"] = actAsPrincipalId }, authority.Requests[1].Input);
            Assert.Equal(2, authority.Requests.Count);
        }

        [Fact]
        public void IrGrantsBackendKeysOnlyTheExplicitDataPlaneScopesAndDocumentsScopeRequired()
        {
            JsonNode ir = Spec.Load("ir.json");
            JsonArray operations = ir["operations"]!.AsArray();
            JsonObject Find(string id)
            {
                JsonObject? found = operations.Select(item => item!.AsObject()).FirstOrDefault(item => (string?)item["id"] == id);
                Assert.True(found != null, id);
                return found!;
            }

            JsonArray BackendScopes(string id) => new JsonArray(Find(id)["auth"]!.AsArray()
                .Where(entry => (string?)entry!["credential"] == "backendKey")
                .Select(entry => entry!["scopes"]?.DeepClone())
                .ToArray());

            foreach (string name in new[] { "messageRead", "messageWrite", "callRead" })
                Assert.Contains(ir["scopes"]!.AsArray(), scope => (string?)scope!["name"] == name);
            foreach ((string id, string scope) in new[]
            {
                ("communication.sendMessage", "messageWrite"), ("communication.messages", "messageRead"),
                ("communication.getMessage", "messageRead"), ("communication.inbox", "messageRead"),
                ("communication.search", "messageRead"),
            })
            {
                Assert.True((string?)Find(id)["layer"] == "both", id);
                Js.Equal(new JsonArray(new JsonArray(scope)), BackendScopes(id), id);
            }

            foreach (string id in new[] { "communication.currentLiveSession", "communication.liveSession", "communication.liveSessions",
                "communication.liveSessionParticipants", "communication.liveSessionOperation" })
            {
                Js.Equal(new JsonArray(new JsonArray("callRead"), new JsonArray("callManage")), BackendScopes(id), id);
            }

            // Read scopes never authorize moderation or live-session control.
            foreach (string id in new[] { "communication.editMessage", "communication.deleteMessage" })
                Js.Equal(new JsonArray(new JsonArray("moderation")), BackendScopes(id), id);
            foreach (string id in new[] { "communication.alertLiveSession", "communication.endLiveSession" })
                Js.Equal(new JsonArray(new JsonArray("callManage")), BackendScopes(id), id);
            foreach (string id in new[] { "communication.events", "communication.receipts", "communication.reportReceipt", "communication.typing" })
            {
                Assert.True((string?)Find(id)["layer"] == "client", id);
                Js.Equal(new JsonArray(), BackendScopes(id), id);
            }

            JsonNode? scopeRequired = ir["errors"]!["codes"]!.AsArray().FirstOrDefault(code => (string?)code!["name"] == "SCOPE_REQUIRED");
            Assert.Equal<(string?, int?, bool?)>(("server", 403, false),
                ((string?)scopeRequired?["origin"], (int?)scopeRequired?["status"], (bool?)scopeRequired?["retryable"]));
            foreach (JsonNode? item in operations)
            {
                if (item!["auth"]!.AsArray().Any(entry => (string?)entry!["credential"] == "backendKey" && entry["scopes"] != null))
                    Assert.True(item["errors"]!["codes"]!.AsArray().Any(code => (string?)code == "SCOPE_REQUIRED"), (string?)item["id"]);
            }
        }

        [Fact]
        public async Task BackendOnboardingUsesCurrentGeneratedOperationsAndReturnsTheTypedScopedBootstrap()
        {
            string projectId = Fixtures.NewId(), incarnation = Fixtures.NewId(), principalId = Fixtures.NewId();
            string deviceId = Fixtures.NewId(), conversationId = Fixtures.NewId();
            string expiresAt = Fixtures.Iso(DateTimeOffset.UtcNow.AddMilliseconds(900000));
            var issued = new JsonObject
            {
                ["session"] = new JsonObject
                {
                    ["sessionId"] = Fixtures.NewId(),
                    ["principalId"] = principalId,
                    ["deviceId"] = deviceId,
                    ["incarnation"] = incarnation,
                    ["sessionRevision"] = "1",
                    ["expiresAt"] = expiresAt,
                    ["status"] = "active",
                },
                ["sessionToken"] = "fixture-user-session",
                ["tokenExpiresAt"] = expiresAt,
            };
            var authority = new FakeAuthority(request => request.OperationName switch
            {
                "CommunicationRoute" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = new JsonObject { ["projectId"] = projectId, ["incarnation"] = incarnation, ["servingEpoch"] = "2" },
                }),
                "CommunicationCreatePrincipal" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = new JsonObject
                    {
                        ["principalId"] = principalId,
                        ["externalUserId"] = "authenticated-account",
                        ["status"] = "active",
                        ["revision"] = "1",
                    },
                }),
                "CommunicationIssueSession" => Fixtures.Reply(request, new JsonObject { ["result"] = issued.DeepClone() }),
                "CommunicationCreateConversation" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = Conversation(conversationId, "Support"),
                }),
                _ => throw new InvalidOperationException("Unexpected operation"),
            });
            ProjectServerClient client = Server(LocalAuthority, projectId, incarnation, "fixture-backend", authority);

            await client.InitializeAsync();
            Assert.Equal(principalId, (await client.Principals.CreateAsync("authenticated-account")).PrincipalId);
            SessionBootstrap bootstrap = await client.Sessions.IssueAsync(principalId, deviceId);
            Js.Equal(issued, JsonSerializer.SerializeToNode(bootstrap, ConvoHopJsonContext.Default.SessionBootstrap));
            Conversation conversation = await client.Conversations.CreateAsync(new CreateConversationRequestInput("Support", Element("{}"),
                new[] { new MemberInputInput(principalId, "member") }));
            Assert.Equal(conversationId, conversation.ConversationId);

            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(new[] { "CommunicationRoute", "CommunicationCreatePrincipal", "CommunicationIssueSession", "CommunicationCreateConversation" },
                requests.Select(request => request.OperationName));
            Assert.All(requests, request =>
            {
                Assert.Equal(LocalAuthority + "/graphql", request.Uri.AbsoluteUri);
                Assert.Equal("Bearer fixture-backend", request.Authorization);
                Assert.Equal(projectId, (string?)request.Context["projectId"]);
                Assert.Equal(incarnation, (string?)request.Context["incarnation"]);
            });
            Js.Equal(new JsonObject { ["principalId"] = principalId, ["deviceId"] = deviceId, ["requestedTtlMs"] = "900000" }, requests[2].Input);
            Assert.False(requests[0].Context.ContainsKey("observedServingEpoch"));
            Assert.All(requests.Skip(1), request => Assert.Equal("2", (string?)request.Context["observedServingEpoch"]));
            string states = Js.Stringify(Recovery.Snapshot(await client.Transport.GetRecoveryStatesAsync()));
            Assert.DoesNotContain("fixture-user-session", states, StringComparison.Ordinal);
        }

        [Fact]
        public async Task ManagementKeyIssuanceAndPermitsRetainGeneratedInputsNotResultSecrets()
        {
            string projectId = Fixtures.NewId(), deliveryId = Fixtures.NewId(), redemptionRequestId = Fixtures.NewId();
            string expiresAt = Fixtures.Iso(DateTimeOffset.UtcNow.AddMinutes(1));
            var authority = new FakeAuthority(request => request.OperationName switch
            {
                "ManagementIssueBackendKey" => Fixtures.Reply(request, Accepted("project", projectId)),
                "ManagementCredentialPermit" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = new JsonObject { ["signature"] = "fixture-secret-permit" },
                }),
                _ => throw new InvalidOperationException("Unexpected operation"),
            });
            ConvoHopManagementClient client = Management(ManagementAuthority, Fixtures.NewId(), "fixture-operator", authority);

            await client.IssueBackendKeyAsync(projectId, "backend", new[] { "membershipManage" }, expiresAt);
            JsonElement permit = await client.GetDeliveryPermitAsync(projectId, deliveryId, redemptionRequestId);

            Js.Equal(new JsonObject { ["signature"] = "fixture-secret-permit" }, JsonNode.Parse(permit.GetRawText()));
            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(2, requests.Count);
            Assert.All(requests, request =>
            {
                Assert.Equal("Bearer fixture-operator", request.Authorization);
                Assert.False(request.Context.ContainsKey("projectId"));
            });
            Js.Equal(new JsonObject
            {
                ["projectId"] = projectId,
                ["name"] = "backend",
                ["scopes"] = new JsonArray("membershipManage"),
                ["expiresAt"] = expiresAt,
            }, requests[0].Input);
            Js.Equal(new JsonObject
            {
                ["projectId"] = projectId,
                ["deliveryId"] = deliveryId,
                ["redemptionRequestId"] = redemptionRequestId,
            }, requests[1].Input);
            string states = Js.Stringify(Recovery.Snapshot(await client.Transport.GetRecoveryStatesAsync()));
            Assert.DoesNotContain("fixture-secret-permit", states, StringComparison.Ordinal);
        }

        [Fact]
        public async Task UsageQueriesUseGeneratedManagementOperationsAndKeepMeterQuantitiesAsDecimalStrings()
        {
            string deploymentId = Fixtures.NewId(), projectId = Fixtures.NewId(), orgId = Fixtures.NewId();
            const string from = "2026-10-01T00:00:00.000Z", to = "2026-10-01T05:00:00.000Z";
            const string reason = "Usage aggregation has not reported yet";
            var scopes = new Dictionary<string, (string Type, string Field, string Id)>(StringComparer.Ordinal)
            {
                ["ManagementDeploymentUsage"] = ("DeploymentUsage", "deploymentId", deploymentId),
                ["ManagementProjectUsage"] = ("ProjectUsage", "projectId", projectId),
                ["ManagementOrganizationUsage"] = ("OrganizationUsage", "orgId", orgId),
            };
            JsonNode? quantity = "9223372036854775807";
            var authority = new FakeAuthority(request =>
            {
                (string type, string field, string id) = scopes[request.OperationName];
                return Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = Fixtures.Full(type, new JsonObject
                    {
                        [field] = id,
                        ["source"] = "usage-rollup",
                        ["observedAt"] = to,
                        ["complete"] = false,
                        ["reason"] = reason,
                        ["from"] = from,
                        ["to"] = to,
                        ["meters"] = new JsonArray(
                            Fixtures.Full("UsageMeter", new JsonObject
                            {
                                ["meter"] = "api_calls", ["unit"] = "call", ["quantity"] = quantity?.DeepClone(), ["emitted"] = true,
                            }),
                            Fixtures.Full("UsageMeter", new JsonObject
                            {
                                ["meter"] = "egress_gb", ["unit"] = "byte", ["quantity"] = "0", ["emitted"] = false,
                            })),
                    }),
                });
            });
            ConvoHopManagementClient client = Management(ManagementAuthority, Fixtures.NewId(), "fixture-operator", authority);

            DeploymentUsageReply deployment = await client.Transport.ExecuteAsync(Operations.Management.DeploymentUsage, null,
                new DeploymentUsageRequestInput(deploymentId) { From = from, To = to });
            ProjectUsageReply project = await client.Transport.ExecuteAsync(Operations.Management.ProjectUsage, null,
                new ProjectUsageRequestInput(projectId));
            OrganizationUsageReply organization = await client.Transport.ExecuteAsync(Operations.Management.OrganizationUsage, null,
                new OrganizationUsageRequestInput(orgId) { To = to });

            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(new[] { "ManagementDeploymentUsage", "ManagementProjectUsage", "ManagementOrganizationUsage" },
                requests.Select(request => request.OperationName));
            Js.Equal(new JsonArray(
                new JsonObject { ["deploymentId"] = deploymentId, ["from"] = from, ["to"] = to },
                new JsonObject { ["projectId"] = projectId },
                new JsonObject { ["orgId"] = orgId, ["to"] = to }), new JsonArray(requests.Select(request => request.Input?.DeepClone()).ToArray()));
            Assert.All(requests, request => Assert.False(request.Context.ContainsKey("projectId")));
            JsonNode?[] results =
            {
                JsonSerializer.SerializeToNode(deployment.Result!, ConvoHopJsonContext.Default.DeploymentUsage),
                JsonSerializer.SerializeToNode(project.Result!, ConvoHopJsonContext.Default.ProjectUsage),
                JsonSerializer.SerializeToNode(organization.Result!, ConvoHopJsonContext.Default.OrganizationUsage),
            };
            foreach ((int index, string field, string id) in new[] { (0, "deploymentId", deploymentId), (1, "projectId", projectId), (2, "orgId", orgId) })
            {
                Js.Equal(new JsonObject
                {
                    [field] = id,
                    ["source"] = "usage-rollup",
                    ["observedAt"] = to,
                    ["complete"] = false,
                    ["reason"] = reason,
                    ["from"] = from,
                    ["to"] = to,
                    ["aggregatedThrough"] = null,
                    ["meters"] = new JsonArray(
                        new JsonObject { ["meter"] = "api_calls", ["unit"] = "call", ["quantity"] = "9223372036854775807", ["emitted"] = true },
                        new JsonObject { ["meter"] = "egress_gb", ["unit"] = "byte", ["quantity"] = "0", ["emitted"] = false }),
                }, results[index], field);
            }

            foreach (JsonNode? malformed in new JsonNode?[] { 5, "-1", "1.5", "01", "9223372036854775808" })
            {
                quantity = malformed;
                ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(() =>
                    client.Transport.ExecuteAsync(Operations.Management.ProjectUsage, null, new ProjectUsageRequestInput(projectId)));
                Assert.True(error.Code == "INVALID_RESPONSE", Js.Stringify(malformed));
            }

            Assert.Equal(8, authority.Requests.Count);
        }

        [Fact]
        public async Task MembershipBatchesUseGeneratedGraphqlAndPreserveOriginalIdentityAndDecimalRevisions()
        {
            string projectId = Fixtures.NewId(), incarnation = Fixtures.NewId(), conversationId = Fixtures.NewId();
            string requestId = Fixtures.NewId(), principalId = Fixtures.NewId();
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = new JsonObject
                {
                    ["items"] = new JsonArray(new JsonObject
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
                    }),
                },
            }));
            ProjectServerClient server = Server(LoopbackAuthority, projectId, incarnation, "pk_fixture-only", authority);
            ServerMembers members = server.Conversation(conversationId).Members;
            var entry = new MemberBatchEntryInput(principalId, "member", "9223372036854775807");

            Assert.False((await members.AddBatchAsync(new[] { entry }, requestId))[0].CanStartBroadcast);
            AuthorityRequest sent = Assert.Single(authority.Requests);
            Assert.Equal(LoopbackAuthority + "/graphql", sent.Uri.AbsoluteUri);
            Assert.Equal("CommunicationAddMembers", sent.OperationName);
            Assert.Equal(requestId, sent.RequestId);
            Js.Equal(new JsonObject
            {
                ["conversationId"] = conversationId,
                ["members"] = new JsonArray(new JsonObject
                {
                    ["principalId"] = principalId,
                    ["role"] = "member",
                    ["expectedRevision"] = "9223372036854775807",
                }),
            }, sent.Input);
            foreach (MemberBatchEntryInput[] invalid in new[]
            {
                Array.Empty<MemberBatchEntryInput>(), Enumerable.Repeat(entry, 101).ToArray(), new[] { entry, entry },
            })
            {
                ArgumentException error = await Assert.ThrowsAsync<ArgumentException>(() => members.AddBatchAsync(invalid));
                Assert.Contains("1..100 distinct", error.Message, StringComparison.Ordinal);
            }

            Assert.Single(authority.Requests);
        }

        [Fact]
        public async Task HostedManagementRequiresExplicitDeploymentAndProjectInputsWithoutLocalFallback()
        {
            const string hosted = "https://management.example.test";
            var authority = new FakeAuthority(request => Fixtures.Reply(request,
                Accepted(request.OperationName == "ManagementCreateProject" ? "project" : "deployment", Fixtures.NewId())));
            ConvoHopManagementClient client = Management(hosted, Fixtures.NewId(), "fixture-only", authority);
            string identity = Fixtures.NewId();

            ArgumentException deployment = await Assert.ThrowsAsync<ArgumentException>(() => client.CreateDeploymentAsync(identity));
            ArgumentException project = await Assert.ThrowsAsync<ArgumentException>(() => client.CreateProjectAsync(identity, "Pilot"));
            Assert.Contains("explicit", deployment.Message, StringComparison.Ordinal);
            Assert.Contains("explicit", project.Message, StringComparison.Ordinal);
            Assert.Empty(authority.Requests);
            await client.CreateDeploymentAsync(identity, new DeploymentOptions
            {
                Offering = "managedShared",
                GeoId = "fixture-region",
                InstallationProfileId = "fixture-profile",
                ConsentRef = "fixture-consent",
            });
            await client.CreateProjectAsync(identity, "Pilot", new ProjectOptions { Environment = "prod", BackendPrincipalName = "pilot-server" });

            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Js.Equal(new JsonObject
            {
                ["offering"] = "managedShared",
                ["geoId"] = "fixture-region",
                ["installationProfileId"] = "fixture-profile",
                ["consentRef"] = "fixture-consent",
                ["orgId"] = identity,
            }, requests[0].Input);
            Js.Equal(new JsonObject
            {
                ["deploymentId"] = identity,
                ["name"] = "Pilot",
                ["environment"] = "prod",
                ["backendPrincipalName"] = "pilot-server",
            }, requests[1].Input);
            Assert.All(requests, request => Assert.Equal(hosted + "/graphql", request.Uri.AbsoluteUri));
        }

        [Fact]
        public async Task AsyncProjectRecoveryRestoresBeforeRouteAccessAndSurvivesScopedBackendKeyRotation()
        {
            string projectId = Fixtures.NewId(), incarnation = Fixtures.NewId(), principalId = Fixtures.NewId();
            string requestId = Fixtures.NewId(), conversationId = Fixtures.NewId();
            string key = "convohop.requests:backend:" + projectId;
            var read = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var entered = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var saved = new RecordingStorage();
            saved.OnRead = async _ =>
            {
                if (saved.Reads.Count != 2) return;
                entered.TrySetResult(true);
                await read.Task.ConfigureAwait(false);
            };
            var input = new CreateConversationRequestInput("original", Element("{}"), new[] { new MemberInputInput(principalId, "member") });
            var lost = new FakeAuthority(LoseResponse);
            ProjectServerClient first = Server(LocalAuthority, projectId, incarnation, "fixture-original-backend", lost, saved);

            ConvoHopException uncertain = await Assert.ThrowsAsync<ConvoHopException>(() => first.Conversations.CreateAsync(input, requestId));
            Assert.Equal("TRANSPORT_UNKNOWN", uncertain.Code);
            Assert.Equal("Bearer fixture-original-backend", Assert.Single(lost.Requests).Authorization);
            IReadOnlyList<RecoveryState> firstStates = await first.Transport.GetRecoveryStatesAsync();
            RecoveryState original = firstStates[0];
            bool committed = false;
            int mutations = 0;
            const string refreshedKey = "fixture-refreshed-backend";
            var authority = new FakeAuthority(request =>
            {
                switch (request.OperationName)
                {
                    case "CommunicationRoute":
                        return Fixtures.Reply(request, new JsonObject
                        {
                            ["result"] = new JsonObject { ["projectId"] = projectId, ["incarnation"] = incarnation, ["servingEpoch"] = "2" },
                        });
                    case "CommunicationResolveRequest":
                        return Fixtures.Reply(request, new JsonObject
                        {
                            ["result"] = Fixtures.Resolution(requestId, committed ? "committed" : "notObservedYet"),
                        });
                    case "CommunicationCreateConversation":
                        mutations++;
                        committed = true;
                        return Fixtures.Reply(request, new JsonObject { ["result"] = Conversation(conversationId, "original") });
                    default:
                        throw new InvalidOperationException("Unexpected operation");
                }
            });
            ProjectServerClient restarted = Server(LocalAuthority, projectId, incarnation, refreshedKey, authority, saved);

            Task initialized = restarted.InitializeAsync();
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            Task<IReadOnlyList<RecoveryState>> restoring = restarted.Transport.GetRecoveryStatesAsync();
            Assert.Empty(authority.Requests);
            Assert.Equal(new[] { key, key }, saved.Reads);
            Assert.False(initialized.IsCompleted);
            Assert.False(restoring.IsCompleted);
            read.SetResult(true);
            await initialized;

            Js.Equal(Recovery.Snapshot(firstStates), Recovery.Snapshot(await restoring));
            Assert.Equal("2", restarted.Transport.ServingEpoch);
            Assert.Equal("committed", (await restarted.Transport.RetryAsync(requestId)).State);
            RecoveryState current = (await restarted.Transport.GetRecoveryStatesAsync())[0];
            Assert.Equal<(string, string, long, long, string, string?)>(
                (original.RequestId, original.PayloadFingerprint, original.FirstSubmittedAt, original.RetryDeadline, original.Incarnation,
                    original.ProjectId),
                (current.RequestId, current.PayloadFingerprint, current.FirstSubmittedAt, current.RetryDeadline, current.Incarnation,
                    current.ProjectId));
            Js.Equal(JsonNode.Parse(original.Input.GetRawText()), JsonNode.Parse(current.Input.GetRawText()));
            Assert.Equal(2L, current.AttemptCount);
            Assert.Equal(1, mutations);
            Assert.True(restarted.Transport.DurableRecovery);
            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(new[]
            {
                "CommunicationRoute", "CommunicationResolveRequest", "CommunicationCreateConversation", "CommunicationResolveRequest",
            }, requests.Select(request => request.OperationName));
            Assert.All(requests, request =>
            {
                Assert.Equal("Bearer " + refreshedKey, request.Authorization);
                Assert.Equal(projectId, (string?)request.Context["projectId"]);
                Assert.Equal(incarnation, (string?)request.Context["incarnation"]);
            });
            Assert.Equal(requestId, requests[2].RequestId);
            Js.Equal(new JsonObject
            {
                ["title"] = "original",
                ["props"] = new JsonObject(),
                ["members"] = new JsonArray(new JsonObject { ["principalId"] = principalId, ["role"] = "member" }),
            }, requests[2].Input);
            Assert.All(saved.Writes, write =>
            {
                Assert.Equal(key, write.Key);
                Assert.DoesNotContain("fixture-", write.Value, StringComparison.Ordinal);
            });
        }

        [Fact]
        public async Task ProjectAsyncWriteFailurePreventsAuthorityEffectsAndRetainsTheSuppliedCommandIdentity()
        {
            string requestId = Fixtures.NewId(), projectId = Fixtures.NewId(), incarnation = Fixtures.NewId();
            var saved = new RecordingStorage { OnWrite = (_, _, _) => Task.FromException(new IOException("database unavailable")) };
            var authority = new FakeAuthority(LoseResponse);
            ProjectServerClient client = Server(LocalAuthority, projectId, incarnation, "fixture-backend", authority, saved);

            ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(() => client.Conversations.CreateAsync(
                new CreateConversationRequestInput("original", Element("{}"), Array.Empty<MemberInputInput>()), requestId));

            Assert.Equal<(string, string, string)>(("RECOVERY_STORAGE_FAILURE", requestId, "unknown"), (error.Code, error.RequestId, error.Outcome));
            Assert.Empty(authority.Requests);
            RecoveryState state = Assert.Single(await client.Transport.GetRecoveryStatesAsync());
            Assert.Equal<(string, string?, string, long)>((requestId, projectId, incarnation, 0),
                (state.RequestId, state.ProjectId, state.Incarnation, state.AttemptCount));
        }

        [Fact]
        public async Task ManagementForwardsStorageAndScopesTheJournalToTheActorRatherThanCredentials()
        {
            string actorId = Fixtures.NewId();
            var saved = new RecordingStorage();
            var authority = new FakeAuthority(request => Fixtures.Reply(request, new JsonObject
            {
                ["result"] = new JsonObject { ["orgId"] = Fixtures.NewId(), ["name"] = "original", ["status"] = "active", ["revision"] = "1" },
            }));
            ConvoHopManagementClient client = Management(ManagementAuthority, actorId, "fixture-operator", authority, saved);

            await client.CreateOrganizationAsync("original", "fixture");

            string key = "convohop.requests:management:" + actorId;
            Assert.Equal(new[] { key }, saved.Reads);
            Assert.NotEmpty(saved.Writes);
            Assert.All(saved.Writes, write =>
            {
                Assert.Equal(key, write.Key);
                Assert.DoesNotContain("fixture-operator", write.Value, StringComparison.Ordinal);
            });
        }

        [Fact]
        public async Task AnUnknownReplayOnlyRequestIsNeverLookedUpAndSettlesOnlyByAnExplicitResend()
        {
            string requestId = Fixtures.NewId();
            const string expiresAt = "2026-12-01T00:00:00.000Z";
            bool lose = true;
            var authority = new FakeAuthority(request =>
            {
                if (lose)
                {
                    lose = false;
                    return LoseResponse(request);
                }

                return Fixtures.Reply(request, new JsonObject
                {
                    ["replayed"] = true,
                    ["result"] = Fixtures.Full("AgentKey", new JsonObject
                    {
                        ["operationId"] = Fixtures.NewId(),
                        ["state"] = "pending",
                        ["scopes"] = new JsonArray("messageRead"),
                        ["expiresAt"] = expiresAt,
                    }),
                });
            });
            ConvoHopManagementClient client = Management(ManagementAuthority, Fixtures.NewId(), "fixture-agent-verifier", authority);
            var input = new IssueAgentKeyRequestInput(new[] { "messageRead" }) { ExpiresAt = expiresAt };
            Assert.Equal("replayOnly", Operations.Management.IssueAgentKey.Idempotency);

            ConvoHopException lost = await Assert.ThrowsAsync<ConvoHopException>(() => client.Management.IssueAgentKeyAsync(input, requestId));
            Assert.Equal("TRANSPORT_UNKNOWN", lost.Code);
            ConvoHopException refused = await Assert.ThrowsAsync<ConvoHopException>(() => client.Transport.RetryAsync(requestId));
            Assert.Equal<(string, string, string, int)>(("INVALID_REQUEST", requestId, "unknown", 400),
                (refused.Code, refused.RequestId, refused.Outcome, refused.Status));
            Assert.Equal("The operation's requests cannot be looked up; send the same request ID and payload again explicitly", refused.Message);
            Assert.Equal(new[] { "ManagementIssueAgentKey" }, authority.Requests.Select(request => request.OperationName));

            var changed = new IssueAgentKeyRequestInput(new[] { "callRead" }) { ExpiresAt = expiresAt };
            ConvoHopException conflict = await Assert.ThrowsAsync<ConvoHopException>(() => client.Management.IssueAgentKeyAsync(changed, requestId));
            Assert.Equal("IDEMPOTENCY_CONFLICT", conflict.Code);
            IssueAgentKeyReply settled = await client.Management.IssueAgentKeyAsync(input, requestId);
            Assert.Equal("committed", settled.Status);
            Assert.Equal("pending", settled.Result!.State);
            IReadOnlyList<AuthorityRequest> requests = authority.Requests;
            Assert.Equal(new[] { "ManagementIssueAgentKey", "ManagementIssueAgentKey" }, requests.Select(request => request.OperationName));
            Assert.All(requests, request =>
            {
                Assert.Equal(requestId, request.RequestId);
                Js.Equal(requests[0].Input, request.Input);
            });
        }

        private static ProjectServerClient Server(string baseUrl, string projectId, string incarnation, string backendKey,
            FakeAuthority authority, IRecoveryStorage? storage = null) =>
            new ProjectServerClient(new ProjectServerClientOptions
            {
                BaseUrl = baseUrl,
                ProjectId = projectId,
                Incarnation = incarnation,
                BackendKey = backendKey,
                RecoveryStorage = storage,
                HttpClient = authority.Client(),
            });

        private static ConvoHopManagementClient Management(string baseUrl, string actorId, string accessToken, FakeAuthority authority,
            IRecoveryStorage? storage = null) =>
            new ConvoHopManagementClient(new ConvoHopManagementClientOptions
            {
                BaseUrl = baseUrl,
                ActorId = actorId,
                AccessToken = accessToken,
                RecoveryStorage = storage,
                HttpClient = authority.Client(),
            });

        private static OperationDescriptor Descriptor(string id) => Operations.All.Single(operation => operation.Id == id);

        private static HttpResponseMessage LoseResponse(AuthorityRequest request) => throw new HttpRequestException("response lost");

        private static JsonObject Conversation(string conversationId, string title) => Fixtures.Full("Conversation", new JsonObject
        {
            ["conversationId"] = conversationId,
            ["revision"] = "1",
            ["title"] = title,
            ["props"] = new JsonObject(),
            ["latestSequence"] = "1",
        });

        private static JsonObject Accepted(string kind, string id) => new JsonObject
        {
            ["status"] = "accepted",
            ["operation"] = new JsonObject
            {
                ["operationId"] = Fixtures.NewId(),
                ["owner"] = "management",
                ["href"] = "/graphql",
                ["state"] = "requested",
            },
            ["resourceRef"] = new JsonObject { ["kind"] = kind, ["id"] = id },
        };

        private static JsonElement Element(string json)
        {
            using JsonDocument document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }
    }
}
