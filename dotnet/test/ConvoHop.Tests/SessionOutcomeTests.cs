using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using ConvoHop.Generated;
using ConvoHop.Internal;
using ConvoHop.Models;
using ConvoHop.Tests.TestSupport;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>
    /// Session request outcomes, ported from <c>packages/server/test/session-request-outcome.test.mjs</c>. Not ported: the
    /// in-flight incarnation change (the incarnation is immutable here) and the Browser client half of the last test.
    /// </summary>
    public sealed class SessionOutcomeTests
    {
        private const string CommittedAt = "2026-10-02T07:00:00.000Z";
        private const string CheckedAt = "2026-10-02T07:02:00.000Z";
        private const string OriginalExpiry = "2026-10-02T07:01:00.000Z";
        private const string ActiveExpiry = "2026-10-02T07:03:00.000Z";
        private const string ExpiredExpiry = "2026-10-02T07:01:30.000Z";
        private const string Secret = "fixture-credential-must-not-appear";
        private const string BaseUrl = "http://localhost:18080";

        private static readonly TimeSpan Patience = TimeSpan.FromSeconds(5);

        public static TheoryData<string, string> CommittedOutcomes()
        {
            var data = new TheoryData<string, string>();
            foreach (string operation in new[] { "issueSession", "renewSession" })
            {
                foreach (string currentState in new[] { "active", "expired", "revoked", "missing" }) data.Add(operation, currentState);
            }

            return data;
        }

        [Theory]
        [MemberData(nameof(CommittedOutcomes))]
        public async Task ReturnsACommittedOutcomeAsCredentialFreeHistoricalEvidence(string operation, string currentState)
        {
            Setup setup = Fixture(operation, currentState);
            await setup.Client.InitializeAsync();
            SessionRequestOutcome result = await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId);
            JsonNode serialized = Serialize(result);
            Js.Equal(setup.Result, serialized);
            Assert.Equal("active", result.OriginalSession!.Status);
            Assert.Equal(OriginalExpiry, result.OriginalSession.ExpiresAt);
            if (currentState == "missing") Assert.Null(result.CurrentSession);
            else Assert.Equal(operation == "issueSession" ? "2" : "9007199254740994", result.CurrentSession!.SessionRevision);
            AuthorityRequest request = setup.Requests[1];
            Js.Equal(new JsonObject { ["requestId"] = setup.RequestId }, request.Input);
            Assert.Equal(setup.ProjectId, Js.Text(request.Context, "projectId"));
            Assert.Equal(setup.Incarnation, Js.Text(request.Context, "incarnation"));
            Assert.Equal("3", Js.Text(request.Context, "observedServingEpoch"));
            Assert.NotEqual(setup.RequestId, request.RequestId);
            Assert.StartsWith("query CommunicationSessionRequestOutcome", request.Document, StringComparison.Ordinal);
            Js.Equal(new JsonArray(), await States(setup.Client));
            Assert.DoesNotContain(Secret, Js.Stringify(serialized), StringComparison.Ordinal);
            AssertTraffic(setup.Requests, Secret);
        }

        [Fact]
        public async Task NotObservedYetAcceptsExplicitNullsButProvesNeitherNoncommitNorPermissionToRetry()
        {
            Setup setup = Fixture();
            setup.Result = Fixtures.Full("SessionRequestOutcome", new JsonObject
            {
                ["state"] = "notObservedYet",
                ["requestId"] = setup.RequestId,
                ["checkedAt"] = CheckedAt,
            });
            SessionRequestOutcome result = await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId);
            Js.Equal(setup.Result, Serialize(result));
            Assert.Single(setup.Requests);
            Js.Equal(new JsonArray(), await States(setup.Client));
        }

        [Fact]
        public async Task SameRevisionCurrentRowsAndSigned64BitRevisionsArePreservedWithoutNumericRounding()
        {
            Setup setup = Fixture();
            JsonObject original = Child(setup.Result, "originalSession");
            original["sessionRevision"] = "9223372036854775807";
            setup.Result["currentSession"] = Js.With(original, new JsonObject { ["status"] = "expired" });
            setup.Result["currentState"] = "expired";
            SessionRequestOutcome result = await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId);
            Assert.Equal("9223372036854775807", result.OriginalSession!.SessionRevision);
            Assert.Equal("9223372036854775807", result.CurrentSession!.SessionRevision);
        }

        [Fact]
        public async Task SqlDispositionAndIndependentlySampledTimestampsAreNotReinterpretedAsBearerProof()
        {
            Setup setup = Fixture();
            JsonObject current = Child(setup.Result, "currentSession");
            current["expiresAt"] = "2026-10-02T07:00:00.001Z";
            Assert.Equal("active", (await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId)).CurrentState);
            setup.Result["currentState"] = "expired";
            current["status"] = "expired";
            current["expiresAt"] = ActiveExpiry;
            setup.Result["committedAt"] = ActiveExpiry;
            setup.Envelope["serverTime"] = CommittedAt;
            Assert.Equal("expired", (await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId)).CurrentState);
            setup.Result["currentState"] = "revoked";
            current["status"] = "revoked";
            current["expiresAt"] = ActiveExpiry;
            Assert.Equal("revoked", (await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId)).CurrentState);
            Assert.Equal(3, setup.Requests.Select(request => request.RequestId).Distinct(StringComparer.Ordinal).Count());
        }

        [Fact]
        public async Task EqualRevisionsRetainTheOriginalExpiryButAHigherRevisionShorterTtlRenewalMayShortenIt()
        {
            Setup setup = Fixture();
            JsonObject current = Child(setup.Result, "currentSession");
            current["expiresAt"] = "2026-10-02T07:00:30.000Z";
            Assert.Equal("2026-10-02T07:00:30.000Z",
                (await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId)).CurrentSession!.ExpiresAt);
            current["sessionRevision"] = Js.Text(setup.Result["originalSession"], "sessionRevision");
            await RejectsInvalid(setup);
        }

        private static readonly Dictionary<string, Action<JsonObject>> InvalidResults = BuildInvalidResults();

        public static TheoryData<string> InvalidResultNames() => Theories.Names(InvalidResults.Keys);

        private static Dictionary<string, Action<JsonObject>> BuildInvalidResults()
        {
            var cases = new Dictionary<string, Action<JsonObject>>(StringComparer.Ordinal)
            {
                ["different original request ID"] = value => value["requestId"] = Fixtures.NewId(),
                ["accepted rather than committed state"] = value => value["state"] = "accepted",
                ["unknown state"] = value => value["state"] = "missing",
                ["unsupported mutation operation"] = value => value["operation"] = "revokeSession",
                ["operation alias"] = value => value["operation"] = "communication.renewSession",
                ["unknown current disposition"] = value => value["currentState"] = "pending",
                ["missing disposition with a current row"] = value => value["currentState"] = "missing",
                ["present disposition without a current row"] = value => value["currentSession"] = null,
                ["historical revoked original"] = value => Child(value, "originalSession")["status"] = "revoked",
                ["unknown original status"] = value => Child(value, "originalSession")["status"] = "expired",
                ["active disposition with revoked row"] = value => Child(value, "currentSession")["status"] = "revoked",
                ["revoked disposition with active row"] = value => value["currentState"] = "revoked",
                ["expired disposition with revoked row"] = value =>
                {
                    value["currentState"] = "expired";
                    Child(value, "currentSession")["status"] = "revoked";
                },
                ["expired disposition with active row"] = value => value["currentState"] = "expired",
                ["unknown current row status"] = value => Child(value, "currentSession")["status"] = "disabled",
                ["current revision regression"] = value => Child(value, "currentSession")["sessionRevision"] = "9007199254740992",
                ["foreign original incarnation"] = value => Child(value, "originalSession")["incarnation"] = Fixtures.NewId(),
                ["zero receipt ID"] = value => value["receiptId"] = "00000000-0000-0000-0000-000000000000",
                ["invalid original UUID"] = value => Child(value, "originalSession")["sessionId"] = "not-an-id",
                ["invalid current UUID"] = value => Child(value, "currentSession")["deviceId"] = "not-an-id",
                ["null state"] = value => value["state"] = null,
                ["null checked timestamp"] = value => value["checkedAt"] = null,
                ["noncanonical checked timestamp"] = value => value["checkedAt"] = "2026-10-02T07:02:00Z",
                ["invalid calendar timestamp"] = value => value["checkedAt"] = "2026-02-30T07:02:00.000Z",
                ["noncanonical commit timestamp"] = value => value["committedAt"] = "2026-10-02T07:00:00+00:00",
                ["credential on the outcome"] = value => value["sessionToken"] = Secret,
                ["credential on the original session"] = value => Child(value, "originalSession")["sessionToken"] = Secret,
                ["credential on the current session"] = value => Child(value, "currentSession")["sessionToken"] = Secret,
                ["claims on the outcome"] = value => value["claims"] = new JsonObject { ["credential"] = Secret },
                ["raw receipt on the outcome"] = value => value["receipt"] = new JsonObject { ["credential"] = Secret },
                ["permit on the outcome"] = value => value["permit"] = new JsonObject { ["credential"] = Secret },
            };
            foreach (string field in new[] { "operation", "receiptId", "committedAt", "originalSession", "currentState" })
                cases["null committed " + field] = value => value[field] = null;
            foreach (string field in new[] { "sessionId", "principalId", "deviceId", "incarnation" })
                cases["current " + field + " changes the original tuple"] = value => Child(value, "currentSession")[field] = Fixtures.NewId();
            foreach (string field in new[] { "originalSession", "currentSession" })
            {
                foreach (string revision in new[] { "0", "-1", "01", "1.0", "9223372036854775808" })
                    cases[field + " invalid string revision " + revision] = value => Child(value, field)["sessionRevision"] = revision;
                cases[field + " invalid number revision 1"] = value => Child(value, field)["sessionRevision"] = 1;
                cases[field + " malformed expiry"] = value => Child(value, field)["expiresAt"] = "not-a-time";
            }

            return cases;
        }

        [Theory]
        [MemberData(nameof(InvalidResultNames))]
        public async Task RejectsAnInvalidResultWithoutLeakingCredentialsOrWritingRecovery(string name)
        {
            Setup setup = Fixture();
            InvalidResults[name](setup.Result);
            await RejectsInvalid(setup);
        }

        public static TheoryData<string> OptionalOutcomeFields() =>
            Theories.Names(new[] { "operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState" });

        [Theory]
        [MemberData(nameof(OptionalOutcomeFields))]
        public async Task NotObservedYetRefusesAContradictoryField(string field)
        {
            Setup setup = Fixture();
            JsonObject committed = setup.Result;
            setup.Result = Fixtures.Full("SessionRequestOutcome", new JsonObject
            {
                ["state"] = "notObservedYet",
                ["requestId"] = setup.RequestId,
                ["checkedAt"] = CheckedAt,
                [field] = committed[field]?.DeepClone(),
            });
            await RejectsInvalid(setup);
        }

        [Theory]
        [InlineData("operation")]
        [InlineData("currentSession")]
        [InlineData("currentState")]
        public async Task AMissingSelectedNullableFieldIsNotSilentlyTreatedAsNull(string field)
        {
            Setup setup = Fixture();
            Assert.True(setup.Result.Remove(field));
            await RejectsInvalid(setup);
        }

        private static readonly Dictionary<string, Func<JsonObject>> InvalidEnvelopes =
            new Dictionary<string, Func<JsonObject>>(StringComparer.Ordinal)
            {
                ["accepted status"] = () => new JsonObject { ["status"] = "accepted" },
                ["active status"] = () => new JsonObject { ["status"] = "active" },
                ["wrong read identity"] = () => new JsonObject { ["requestId"] = Fixtures.NewId() },
                ["unparseable time"] = () => new JsonObject { ["serverTime"] = "not-a-time" },
                ["invalid calendar"] = () => new JsonObject { ["serverTime"] = "2026-02-30T00:00:00.000Z" },
                ["credential"] = () => new JsonObject { ["sessionToken"] = Secret },
                ["claims"] = () => new JsonObject { ["claims"] = new JsonObject { ["credential"] = Secret } },
            };

        public static TheoryData<string> InvalidEnvelopeNames() => Theories.Names(InvalidEnvelopes.Keys);

        [Theory]
        [MemberData(nameof(InvalidEnvelopeNames))]
        public async Task RejectsAnInvalidOrCredentialBearingReplyEnvelope(string name)
        {
            Setup setup = Fixture();
            setup.Envelope = InvalidEnvelopes[name]();
            await RejectsInvalid(setup);
        }

        [Theory]
        [InlineData("")]
        [InlineData("not-an-id")]
        [InlineData("00000000-0000-0000-0000-000000000000")]
        [InlineData("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")]
        [InlineData(null)]
        public async Task InvalidOriginalIdsFailBeforeAuthorityCallsOrRecoveryInitialization(string? invalid)
        {
            var saved = new RecordingStorage();
            var authority = new FakeAuthority(Unexpected);
            ProjectServerClient client = Server(Fixtures.NewId(), Fixtures.NewId(), Secret, authority, saved);
            ArgumentException error = invalid == null
                ? await Assert.ThrowsAsync<ArgumentNullException>(() => client.Sessions.GetOutcomeAsync(invalid!))
                : await Assert.ThrowsAsync<ArgumentException>(() => client.Sessions.GetOutcomeAsync(invalid));
            Assert.Equal("requestId", error.ParamName);
            Assert.Empty(authority.Requests);
            Assert.Empty(saved.Reads);
            Assert.Empty(saved.Writes);
        }

        [Fact]
        public async Task AnOutcomeReadCannotReuseTheOriginalMutationIdAsItsContextIdentity()
        {
            Setup setup = Fixture();
            ConvoHopException error;
            Protocol.IdSource.Value = () => setup.RequestId;
            try
            {
                error = await Assert.ThrowsAsync<ConvoHopException>(() => setup.Client.Sessions.GetOutcomeAsync(setup.RequestId));
            }
            finally
            {
                Protocol.IdSource.Value = null;
            }

            Assert.Equal<(string, string)>(("INVALID_REQUEST", "rejected"), (error.Code, error.Outcome));
            Assert.Empty(setup.Requests);
            Js.Equal(new JsonArray(), await States(setup.Client));
        }

        [Fact]
        public async Task OutcomeReadsAwaitOneTimeAsynchronousRestorationWithoutCreatingADurableWrite()
        {
            var entered = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var load = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var saved = new RecordingStorage
            {
                OnRead = async _ =>
                {
                    entered.TrySetResult(true);
                    await load.Task;
                },
            };
            Setup setup = Fixture(storage: saved);
            Assert.Empty(saved.Reads);
            Task<SessionRequestOutcome> pending = setup.Client.Sessions.GetOutcomeAsync(setup.RequestId);
            await entered.Task.WaitAsync(Patience);
            Assert.Empty(setup.Requests);
            // The TypeScript getter throws until restoration finishes; this asynchronous snapshot waits for it instead.
            Task<IReadOnlyList<RecoveryState>> states = setup.Client.Transport.GetRecoveryStatesAsync();
            Assert.False(states.IsCompleted);
            load.SetResult(true);
            await pending.WaitAsync(Patience);
            Js.Equal(new JsonArray(), Recovery.Snapshot(await states.WaitAsync(Patience)));
            await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId).WaitAsync(Patience);
            Assert.Single(saved.Reads);
            Assert.Empty(saved.Writes);
        }

        [Fact]
        public async Task FailedAsynchronousOutcomeRestorationCannotBecomeAnEmptySuccessOrTriggerAuthorityEffects()
        {
            var failure = new IOException("Database read unavailable");
            var saved = new RecordingStorage { OnRead = _ => Task.FromException(failure) };
            Setup setup = Fixture(storage: saved);
            Assert.Same(failure, await Assert.ThrowsAsync<IOException>(() => setup.Client.Sessions.GetOutcomeAsync(setup.RequestId)));
            Assert.Same(failure, await Assert.ThrowsAsync<IOException>(() => setup.Client.Sessions.GetOutcomeAsync(setup.RequestId)));
            // Unlike the TypeScript client, which keeps its rejected load, each call after a failed load reads the storage again.
            Assert.Equal(2, saved.Reads.Count);
            Assert.Same(failure, await Assert.ThrowsAsync<IOException>(() => setup.Client.Transport.GetRecoveryStatesAsync()));
            Assert.Empty(saved.Writes);
            Assert.Empty(setup.Requests);
        }

        private static readonly Dictionary<string, Action<JsonObject>> CustodyContradictions =
            new Dictionary<string, Action<JsonObject>>(StringComparer.Ordinal)
            {
                ["operation"] = value => value["operation"] = "issueSession",
                ["principal"] = value => Child(value, "originalSession")["principalId"] = Fixtures.NewId(),
                ["device"] = value => Child(value, "originalSession")["deviceId"] = Fixtures.NewId(),
                ["session"] = value => Child(value, "originalSession")["sessionId"] = Fixtures.NewId(),
                ["expected revision"] = value => Child(value, "originalSession")["sessionRevision"] = "9007199254740994",
            };

        public static TheoryData<string> CustodyContradictionNames() => Theories.Names(CustodyContradictions.Keys);

        [Theory]
        [MemberData(nameof(CustodyContradictionNames))]
        public async Task AnOutcomeCannotContradictRetainedOriginalMutationCustody(string name)
        {
            Setup setup = Fixture();
            JsonObject session = Child(setup.Result, "originalSession");
            var input = new RenewSessionRequestInput(Js.Text(session, "sessionId")!, Js.Text(session, "principalId")!,
                Js.Text(session, "deviceId")!, "9007199254740992", "60000");
            ConvoHopException unknown = await Assert.ThrowsAsync<ConvoHopException>(() =>
                setup.Client.Transport.ExecuteAsync(Operations.Communication.RenewSession, setup.ProjectId, input, setup.RequestId));
            Assert.Equal("TRANSPORT_UNKNOWN", unknown.Code);
            JsonArray before = await States(setup.Client);
            Assert.Single(before);
            CustodyContradictions[name](setup.Result);
            await RejectsInvalid(setup, before);
            Assert.Equal(2, setup.Requests.Count);
        }

        [Fact]
        public async Task ACommittedIssuanceOutcomePreservesItsOriginalUnknownRequestAndCallerPayload()
        {
            Setup setup = Fixture("issueSession");
            JsonObject session = Child(setup.Result, "originalSession");
            var input = new IssueSessionRequestInput(Js.Text(session, "principalId")!, Js.Text(session, "deviceId")!, "60000");
            ConvoHopException unknown = await Assert.ThrowsAsync<ConvoHopException>(() =>
                setup.Client.Transport.ExecuteAsync(Operations.Communication.IssueSession, setup.ProjectId, input, setup.RequestId));
            Assert.Equal("TRANSPORT_UNKNOWN", unknown.Code);
            JsonArray before = await States(setup.Client);
            Assert.Equal("issueSession", (await setup.Client.Sessions.GetOutcomeAsync(setup.RequestId)).Operation);
            JsonArray after = await States(setup.Client);
            Js.Equal(before, after);
            Js.Equal(new JsonObject
            {
                ["principalId"] = Js.Text(session, "principalId"),
                ["deviceId"] = Js.Text(session, "deviceId"),
                ["requestedTtlMs"] = "60000",
            }, after[0]!["input"]);
            Assert.Equal(2, setup.Requests.Count);
        }

        [Fact]
        public async Task OriginalAndCurrentMetadataCannotSettleOrResetUnknownSessionCustodyAcrossKeyRotation()
        {
            string projectId = Fixtures.NewId(), incarnation = Fixtures.NewId(), requestId = Fixtures.NewId();
            var saved = new RecordingStorage();
            JsonObject originalSession = Child(Outcome(requestId, incarnation), "originalSession");
            var input = new RenewSessionRequestInput(Js.Text(originalSession, "sessionId")!, Js.Text(originalSession, "principalId")!,
                Js.Text(originalSession, "deviceId")!, "9007199254740992", "60000");
            var lost = new FakeAuthority(LostResponse);
            ProjectServerClient first = Server(projectId, incarnation, "fixture-original-key", lost, saved);
            ConvoHopException unknown = await Assert.ThrowsAsync<ConvoHopException>(() =>
                first.Transport.ExecuteAsync(Operations.Communication.RenewSession, projectId, input, requestId));
            Assert.Equal("TRANSPORT_UNKNOWN", unknown.Code);
            JsonArray before = await States(first);
            var snapshot = new Dictionary<string, string>(saved.Values, StringComparer.Ordinal);
            int writes = saved.Writes.Count;
            JsonObject result = Outcome(requestId, incarnation);
            result["originalSession"] = originalSession.DeepClone();
            result["currentSession"] = Js.With(originalSession, new JsonObject
            {
                ["sessionRevision"] = "9007199254740994",
                ["expiresAt"] = ActiveExpiry,
            });
            var authority = new FakeAuthority(request => request.OperationName == "CommunicationSessionRequestOutcome"
                ? Fixtures.Reply(request, new JsonObject { ["serverTime"] = CheckedAt, ["result"] = result.DeepClone() })
                : Unexpected(request));
            ProjectServerClient rotated = Server(projectId, incarnation, "fixture-rotated-key", authority, saved);
            Assert.Equal("committed", (await rotated.Sessions.GetOutcomeAsync(requestId)).State);
            IReadOnlyList<RecoveryState> states = await rotated.Transport.GetRecoveryStatesAsync();
            Js.Equal(before, Recovery.Snapshot(states));
            Assert.Equal(snapshot, saved.Values);
            Assert.Equal(writes, saved.Writes.Count);
            Assert.Single(authority.Requests);
            Assert.Equal(1, states[0].AttemptCount);
            Assert.Equal("unknown", states[0].ResolutionState);
            result["state"] = "notObservedYet";
            foreach (string field in new[] { "operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState" })
                result[field] = null;
            Assert.Equal("notObservedYet", (await rotated.Sessions.GetOutcomeAsync(requestId)).State);
            Js.Equal(before, await States(rotated));
            Assert.Equal(snapshot, saved.Values);
            Assert.Equal(writes, saved.Writes.Count);
            Assert.Equal(2, authority.Requests.Count);
            AssertTraffic(authority.Requests, "fixture-rotated-key");
            AssertTraffic(lost.Requests, "fixture-original-key");
        }

        [Fact]
        public async Task AuthorityRejectionAndNetworkUncertaintyRemainReadFailuresWithoutAutomaticRetries()
        {
            bool unavailable = false;
            var authority = new FakeAuthority(request => unavailable
                ? throw new HttpRequestException(Secret)
                : Fixtures.Json(Js.Object("""
                    {"errors":[{"message":"The backend key requires the current sessionManage scope",
                      "extensions":{"code":"SCOPE_REQUIRED","outcome":"rejected","status":403}}]}
                    """)));
            ProjectServerClient client = Server(Fixtures.NewId(), Fixtures.NewId(), Secret, authority);
            string requestId = Fixtures.NewId();
            ScopeRequiredException rejected = await Assert.ThrowsAsync<ScopeRequiredException>(() => client.Sessions.GetOutcomeAsync(requestId));
            Assert.Equal<(string, string)>(("SCOPE_REQUIRED", "rejected"), (rejected.Code, rejected.Outcome));
            Assert.Equal("sessionManage", rejected.Scope);
            unavailable = true;
            ConvoHopException unknown = await Assert.ThrowsAsync<ConvoHopException>(() => client.Sessions.GetOutcomeAsync(requestId));
            Assert.Equal<(string, string)>(("TRANSPORT_UNKNOWN", "unknown"), (unknown.Code, unknown.Outcome));
            Assert.DoesNotContain(Secret, unknown.ToString(), StringComparison.Ordinal);
            Assert.Equal(2, authority.Requests.Count);
            Assert.All(authority.Requests, request => Assert.Equal("CommunicationSessionRequestOutcome", request.OperationName));
            Js.Equal(new JsonArray(), await States(client));
        }

        [Fact]
        public async Task ServerInitializationAndWithheldResolveRequestSemanticsRemainUnchanged()
        {
            string projectId = Fixtures.NewId(), incarnation = Fixtures.NewId(), originalId = Fixtures.NewId();
            var authority = new FakeAuthority(request => request.OperationName switch
            {
                "CommunicationRoute" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = new JsonObject
                    {
                        ["projectId"] = projectId,
                        ["incarnation"] = incarnation,
                        ["servingEpoch"] = "2",
                        ["communicationBase"] = BaseUrl,
                        ["wssUrl"] = "ws://localhost:18080/graphql",
                        ["expiresAt"] = Fixtures.Iso(DateTimeOffset.UtcNow.AddMinutes(1)),
                        ["signature"] = "fixture-route",
                    },
                }),
                "CommunicationResolveRequest" => Fixtures.Reply(request, new JsonObject
                {
                    ["result"] = Js.With(Fixtures.Resolution(originalId, "committed"), new JsonObject { ["resultWithheld"] = true }),
                }),
                _ => Unexpected(request),
            });
            ProjectServerClient server = Server(projectId, incarnation, Secret, authority);
            await server.InitializeAsync();
            Assert.Equal("2", server.Transport.ServingEpoch);
            ResolveRequestReply resolved = await server.Transport.ExecuteAsync(Operations.Communication.ResolveRequest, projectId,
                new ResolveRequestRequestInput(originalId));
            Assert.True(resolved.Result!.ResultWithheld);
            Assert.Null(resolved.Result.Receipt!.Result);
            Assert.Equal(new[] { "CommunicationRoute", "CommunicationResolveRequest" }, authority.Requests.Select(request => request.OperationName));
            OperationDescriptor outcome = Operations.Communication.SessionRequestOutcome;
            Assert.Equal(OperationKind.Query, outcome.Kind);
            Assert.Equal(new[] { "requestId" }, outcome.InputFields);
            Assert.DoesNotContain("sessionToken", outcome.Document, StringComparison.Ordinal);
            Assert.DoesNotContain("sessionRequestOutcome", Operations.Communication.ResolveRequest.Document, StringComparison.Ordinal);
            Assert.DoesNotContain(Operations.All, operation => operation.Id == "communication.currentSession");
        }

        private static JsonObject Outcome(string requestId, string incarnation, string operation = "renewSession",
            string currentState = "active")
        {
            bool issue = operation == "issueSession";
            var original = new JsonObject
            {
                ["sessionId"] = Fixtures.NewId(),
                ["principalId"] = Fixtures.NewId(),
                ["deviceId"] = Fixtures.NewId(),
                ["incarnation"] = incarnation,
                ["sessionRevision"] = issue ? "1" : "9007199254740993",
                ["expiresAt"] = OriginalExpiry,
                ["status"] = "active",
            };
            JsonObject? current = currentState == "missing"
                ? null
                : Js.With(original, new JsonObject
                {
                    ["sessionRevision"] = issue ? "2" : "9007199254740994",
                    ["expiresAt"] = currentState == "active" ? ActiveExpiry : ExpiredExpiry,
                    ["status"] = currentState,
                });
            return Fixtures.Full("SessionRequestOutcome", new JsonObject
            {
                ["state"] = "committed",
                ["requestId"] = requestId,
                ["checkedAt"] = CheckedAt,
                ["operation"] = operation,
                ["receiptId"] = Fixtures.NewId(),
                ["committedAt"] = CommittedAt,
                ["originalSession"] = original,
                ["currentState"] = currentState,
                ["currentSession"] = current,
            });
        }

        private static JsonObject Child(JsonObject value, string name) => value[name]!.AsObject();

        private static JsonNode Serialize(SessionRequestOutcome result) =>
            JsonSerializer.SerializeToNode(result, ConvoHopJsonContext.Default.SessionRequestOutcome)!;

        private static async Task<JsonArray> States(ProjectServerClient client) =>
            Recovery.Snapshot(await client.Transport.GetRecoveryStatesAsync());

        private static ProjectServerClient Server(string projectId, string incarnation, string key, FakeAuthority authority,
            IRecoveryStorage? storage = null) =>
            new ProjectServerClient(new ProjectServerClientOptions
            {
                BaseUrl = BaseUrl,
                ProjectId = projectId,
                Incarnation = incarnation,
                BackendKey = key,
                RecoveryStorage = storage,
                HttpClient = authority.Client(),
            });

        private static HttpResponseMessage Unexpected(AuthorityRequest request) =>
            throw new InvalidOperationException("Unexpected " + request.OperationName);

        private static HttpResponseMessage LostResponse(AuthorityRequest request) =>
            throw new HttpRequestException("Response unavailable for " + request.OperationName);

        private static Setup Fixture(string operation = "renewSession", string currentState = "active", IRecoveryStorage? storage = null) =>
            new Setup(operation, currentState, storage);

        private static async Task RejectsInvalid(Setup setup, JsonArray? custody = null)
        {
            ConvoHopException error = await Assert.ThrowsAsync<ConvoHopException>(() => setup.Client.Sessions.GetOutcomeAsync(setup.RequestId));
            Assert.Equal<(string, string)>(("INVALID_RESPONSE", "unknown"), (error.Code, error.Outcome));
            Assert.Equal(setup.Requests[^1].RequestId, error.RequestId);
            Assert.NotEqual(setup.RequestId, error.RequestId);
            Assert.DoesNotContain(Secret, error.ToString(), StringComparison.Ordinal);
            Js.Equal(custody ?? new JsonArray(), await States(setup.Client));
            AssertTraffic(setup.Requests, Secret);
        }

        private static void AssertTraffic(IEnumerable<AuthorityRequest> requests, string key) =>
            Assert.All(requests, request =>
            {
                Assert.Equal(new Uri(BaseUrl + "/graphql"), request.Uri);
                Assert.Equal("Bearer " + key, request.Authorization);
            });

        /// <summary>A server client whose authority routes, loses mutation responses and answers outcome reads.</summary>
        private sealed class Setup
        {
            internal Setup(string operation, string currentState, IRecoveryStorage? storage)
            {
                Result = Outcome(RequestId, Incarnation, operation, currentState);
                Authority = new FakeAuthority(Respond);
                Client = Server(ProjectId, Incarnation, Secret, Authority, storage);
            }

            internal string ProjectId { get; } = Fixtures.NewId();
            internal string Incarnation { get; } = Fixtures.NewId();
            internal string RequestId { get; } = Fixtures.NewId();
            internal JsonObject Result { get; set; }
            internal JsonObject Envelope { get; set; } = new JsonObject();
            internal FakeAuthority Authority { get; }
            internal ProjectServerClient Client { get; }
            internal IReadOnlyList<AuthorityRequest> Requests => Authority.Requests;

            private HttpResponseMessage Respond(AuthorityRequest request)
            {
                if (request.OperationName == "CommunicationRoute")
                {
                    return Fixtures.Reply(request, new JsonObject
                    {
                        ["result"] = new JsonObject { ["projectId"] = ProjectId, ["incarnation"] = Incarnation, ["servingEpoch"] = "3" },
                    });
                }

                if (request.OperationName == "CommunicationIssueSession" || request.OperationName == "CommunicationRenewSession")
                    throw new HttpRequestException("Original mutation response unavailable");
                if (request.OperationName != "CommunicationSessionRequestOutcome")
                    throw new InvalidOperationException("Unexpected " + request.OperationName);
                var reply = new JsonObject
                {
                    ["status"] = "ok",
                    ["requestId"] = request.RequestId,
                    ["serverTime"] = CheckedAt,
                    ["result"] = Result.DeepClone(),
                };
                foreach (KeyValuePair<string, JsonNode?> field in Envelope) reply[field.Key] = field.Value?.DeepClone();
                return Fixtures.Json(new JsonObject { ["data"] = new JsonObject { ["sessionRequestOutcome"] = reply } });
            }
        }
    }
}
