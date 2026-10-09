using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using ConvoHop.Models;
using ConvoHop.Tests.TestSupport;
using Microsoft.Extensions.Time.Testing;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>
    /// The bounded recovery journal from <c>spec/recovery/README.md</c>: a full journal forgets the final record attempted
    /// longest ago, and refuses a new request before sending it when no record is final. Ported from the Python SDK's
    /// <c>tests/test_recovery.py</c>.
    /// </summary>
    public sealed class RecoveryJournalTests
    {
        private const string ManagementAuthority = "http://localhost:18081";
        private const long Window = 60000;
        private const string Unavailable = "Authority response unavailable; resolve the original request";
        private const string Limit = "Recovery storage already holds 128 requests that aren't final; retry or resolve them first";

        // The TypeScript SDK's fingerprint of createOrganization with the input Original/fixture.
        private const string OrganizationFingerprint = "sha256:699f78bf950c2b4b01fab09b858df6c301ab0ce397f841e4fac1bc368f42e93b";

        private readonly string _actorId = Fixtures.NewId();

        private string Key => "convohop.requests:management:" + _actorId;

        [Fact]
        public async Task AFullJournalRefusesANewRequestUntilARecordIsFinal()
        {
            var authority = new FakeAuthority(request => request.Key == "management.resolveRequest"
                ? Fixtures.Reply(request, new JsonObject { ["result"] = Fixtures.Resolution((string)request.Input!["requestId"]!, "committed") })
                : Offline(request));
            var storage = new RecordingStorage();
            ConvoHopManagementClient client = Client(authority, storage, Clock());
            string[] ids = NewIds(128);
            foreach (string requestId in ids) await Rejects(() => Create(client, requestId), "TRANSPORT_UNKNOWN", Unavailable);
            string extra = Fixtures.NewId();
            ConvoHopException problem = await Rejects(() => Create(client, extra), "RECOVERY_LIMIT", Limit);
            Assert.Equal<(string, string, int)>((extra, "rejected", 409), (problem.RequestId, problem.Outcome, problem.Status));
            Assert.Equal(128, Mutations(authority));

            ResolveRequestReply resolved = await client.Management.ResolveRequestAsync(new ResolveRequestRequestInput(ids[0]));
            Assert.Equal("committed", resolved.Result!.State);
            await Rejects(() => Create(client, extra), "TRANSPORT_UNKNOWN", Unavailable);
            Assert.Equal(ids.Skip(1).Append(extra), Ids(Stored(storage)));
            Assert.Equal(128, storage.Writes.Max(write => JsonNode.Parse(write.Value)!.AsArray().Count));
        }

        [Fact]
        public async Task AFullJournalEvictsTheFinalRecordAttemptedLongestAgo()
        {
            bool online = false;
            var authority = new FakeAuthority(request => online ? Rejected(request, "FORBIDDEN", 403, false) : Offline(request));
            var storage = new RecordingStorage();
            FakeTimeProvider time = Clock();
            ConvoHopManagementClient client = Client(authority, storage, time);
            string lost = Fixtures.NewId();
            string[] ids = NewIds(127);
            await Rejects(() => Create(client, lost), "TRANSPORT_UNKNOWN", Unavailable);
            online = true;
            // The first rejected request is resent last, so it is no longer the final record attempted longest ago.
            foreach (string requestId in ids.Append(ids[0]))
            {
                time.Advance(TimeSpan.FromMilliseconds(1));
                await Rejects(() => Create(client, requestId), "FORBIDDEN");
            }

            string extra = Fixtures.NewId();
            await Rejects(() => Create(client, extra), "FORBIDDEN");
            Assert.Equal(130, Mutations(authority));
            JsonArray records = Stored(storage);
            Assert.Equal(new[] { lost, ids[0] }.Concat(ids.Skip(2)).Append(extra), Ids(records));
            Assert.Equal(new[] { "unknown" }.Concat(Enumerable.Repeat("rejected", 127)), records.Select(record => (string)record!["resolutionState"]!));
            Assert.Equal<(long, string)>((2, "FORBIDDEN"), ((long)records[1]!["attemptCount"]!, (string)records[1]!["lastAttemptClassification"]!));
            ConvoHopManagementClient restarted = Client(authority, storage, time);
            Js.Equal(Recovery.Snapshot(await client.Transport.GetRecoveryStatesAsync()),
                Recovery.Snapshot(await restarted.Transport.GetRecoveryStatesAsync()));
        }

        [Theory]
        [InlineData("RATE_LIMITED", 429, true)]
        [InlineData("WRONG_REGION", 409, false)]
        [InlineData("NEWER_CODE", 409, true)]
        public async Task AJournalFullOfResendableRejectionsRefusesNewRequests(string code, int status, bool retryable)
        {
            bool accept = false;
            var authority = new FakeAuthority(request => accept
                ? Fixtures.Reply(request, new JsonObject { ["result"] = OrganizationResult() })
                : Rejected(request, code, status, retryable));
            var storage = new RecordingStorage();
            FakeTimeProvider time = Clock();
            ConvoHopManagementClient client = Client(authority, storage, time);
            string[] ids = NewIds(128);
            foreach (string requestId in ids) await Rejects(() => Create(client, requestId), code);
            Assert.All(await client.Transport.GetRecoveryStatesAsync(), state => Assert.Equal("rejected", state.ResolutionState));
            string extra = Fixtures.NewId();
            ConvoHopException problem = await Rejects(() => Create(client, extra), "RECOVERY_LIMIT", Limit);
            Assert.Equal<(string, string, int)>((extra, "rejected", 409), (problem.RequestId, problem.Outcome, problem.Status));
            Assert.Equal(128, Mutations(authority));

            // A kept request is resent under its own ID without a new record; once committed, its record makes room.
            accept = true;
            time.Advance(TimeSpan.FromMilliseconds(1));
            await Create(client, ids[5]);
            await Create(client, extra);
            Assert.Equal(ids.Take(5).Concat(ids.Skip(6)).Append(extra), Ids(Stored(storage)));
            Assert.Equal(130, Mutations(authority));
        }

        [Fact]
        public async Task ASpentRetryBudgetMakesAResendableRejectionFinal()
        {
            var authority = new FakeAuthority(request => Rejected(request, "RATE_LIMITED", 429, true));
            var storage = new RecordingStorage();
            FakeTimeProvider time = Clock();
            DateTimeOffset start = time.GetUtcNow();
            ConvoHopManagementClient client = Client(authority, storage, time);
            string[] ids = NewIds(128);
            foreach (string requestId in ids) await Rejects(() => Create(client, requestId), "RATE_LIMITED");
            for (int resend = 0; resend < 2; resend++)
            {
                time.Advance(TimeSpan.FromMilliseconds(1));
                await Rejects(() => Create(client, ids[3]), "RATE_LIMITED");
            }

            string extra = Fixtures.NewId();
            await Rejects(() => Create(client, extra), "RATE_LIMITED");
            Assert.Equal(ids.Take(3).Concat(ids.Skip(4)).Append(extra), Ids(Stored(storage)));

            time.SetUtcNow(start + TimeSpan.FromMilliseconds(Window + 1));
            string later = Fixtures.NewId();
            await Rejects(() => Create(client, later), "RATE_LIMITED");
            Assert.Equal(ids.Skip(1).Take(2).Concat(ids.Skip(4)).Append(extra).Append(later), Ids(Stored(storage)));
            Assert.Equal(132, Mutations(authority));
        }

        [Fact]
        public async Task ARequestIsRejectedOnlyIfEveryAttemptWas()
        {
            var plan = new Queue<string>(new[] { "lost", "rejected", "rejected", "lost" });
            var authority = new FakeAuthority(request => plan.Dequeue() == "lost" ? Offline(request) : Rejected(request, "FORBIDDEN", 403, false));
            var storage = new RecordingStorage();
            FakeTimeProvider time = Clock();
            ConvoHopManagementClient client = Client(authority, storage, time);
            string first = Fixtures.NewId(), second = Fixtures.NewId();
            await Rejects(() => Create(client, first), "TRANSPORT_UNKNOWN", Unavailable);
            await Rejects(() => Create(client, second), "FORBIDDEN");
            time.Advance(TimeSpan.FromMilliseconds(1));
            await Rejects(() => Create(client, first), "FORBIDDEN");
            await Rejects(() => Create(client, second), "TRANSPORT_UNKNOWN", Unavailable);

            Assert.Equal(new[] { ("unknown", 2L, "FORBIDDEN"), ("unknown", 2L, "TRANSPORT_UNKNOWN") },
                (await client.Transport.GetRecoveryStatesAsync()).Select(state => (state.ResolutionState, state.AttemptCount, state.LastAttemptClassification)));
            Assert.Equal(new[] { "unknown", "unknown" }, Stored(storage).Select(record => (string)record!["resolutionState"]!));
        }

        [Fact]
        public async Task RestoredRecordsMakeRoomOnlyOnceFinal()
        {
            FakeTimeProvider time = Clock();
            long now = time.GetUtcNow().ToUnixTimeMilliseconds();
            JsonObject Record(string state, string classification, JsonObject? fields = null) => Js.With(new JsonObject
            {
                ["requestId"] = Fixtures.NewId(),
                ["incarnation"] = "management",
                ["payloadFingerprint"] = OrganizationFingerprint,
                ["operation"] = "management.createOrganization",
                ["input"] = new JsonObject { ["name"] = "Original", ["termsRef"] = "fixture" },
                ["firstSubmittedAt"] = now - 10,
                ["retryDeadline"] = now - 10 + Window,
                ["attemptCount"] = 1,
                ["lastAttemptAt"] = now - 10,
                ["lastAttemptClassification"] = classification,
                ["resolutionState"] = state,
            }, fields ?? new JsonObject());

            JsonObject[] final =
            {
                // In the order they make room: the one attempted longest ago first.
                Record("committed", "authorityReceipt", new JsonObject { ["lastAttemptAt"] = now - 9 }),
                Record("rejected", "RATE_LIMITED", new JsonObject { ["retryDeadline"] = now - 1, ["lastAttemptAt"] = now - 8 }),
                Record("rejected", "FORBIDDEN", new JsonObject { ["lastAttemptAt"] = now - 7 }),
                Record("rejected", "RATE_LIMITED", new JsonObject { ["attemptCount"] = 3, ["lastAttemptAt"] = now - 6 }),
            };
            JsonObject[] kept =
            {
                Record("rejected", "RATE_LIMITED", new JsonObject { ["attemptCount"] = 2 }),
                Record("rejected", "WRONG_REGION"),
                Record("rejected", "NEWER_CODE"),
                Record("unknown", "submitted"),
                Record("pending", "notSubmitted", new JsonObject { ["attemptCount"] = 0 }),
            };
            IEnumerable<JsonObject> filler = Enumerable.Range(0, 128 - final.Length - kept.Length).Select(_ => Record("unknown", "TRANSPORT_UNKNOWN"));
            JsonObject[] saved = new[] { final[2] }.Concat(kept.Take(2)).Append(final[0]).Concat(filler).Append(final[3]).Concat(kept.Skip(2))
                .Append(final[1]).ToArray();
            var storage = new RecordingStorage();
            storage.Values[Key] = Js.Stringify(new JsonArray(saved.Select(record => (JsonNode)record.DeepClone()).ToArray()));
            var authority = new FakeAuthority(Offline);
            ConvoHopManagementClient client = Client(authority, storage, time);
            string[] extras = NewIds(final.Length);
            for (int count = 1; count <= extras.Length; count++)
            {
                await Rejects(() => Create(client, extras[count - 1]), "TRANSPORT_UNKNOWN", Unavailable);
                var evicted = new HashSet<string>(Ids(final.Take(count)));
                Assert.Equal(Ids(saved).Where(id => !evicted.Contains(id)).Concat(extras.Take(count)), Ids(Stored(storage)));
            }

            await Rejects(() => Create(client, Fixtures.NewId()), "RECOVERY_LIMIT", Limit);
            Assert.Equal(final.Length, Mutations(authority));
        }

        private ConvoHopManagementClient Client(FakeAuthority authority, RecordingStorage storage, TimeProvider time) =>
            new ConvoHopManagementClient(new ConvoHopManagementClientOptions
            {
                BaseUrl = ManagementAuthority,
                ActorId = _actorId,
                AccessToken = "fixture-operator",
                RecoveryStorage = storage,
                HttpClient = authority.Client(),
                TimeProvider = time,
            });

        private JsonArray Stored(RecordingStorage storage) => JsonNode.Parse(storage.Values[Key])!.AsArray();

        // A clock on a whole millisecond, so records' times are exact.
        private static FakeTimeProvider Clock() =>
            new FakeTimeProvider(DateTimeOffset.FromUnixTimeMilliseconds(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

        private static Task<Organization> Create(ConvoHopManagementClient client, string requestId) =>
            client.CreateOrganizationAsync("Original", "fixture", requestId);

        private static async Task<ConvoHopException> Rejects(Func<Task> call, string code, string? message = null)
        {
            ConvoHopException error = await Assert.ThrowsAnyAsync<ConvoHopException>(call);
            Assert.Equal(code, error.Code);
            if (message != null) Assert.Equal(message, error.Message);
            return error;
        }

        private static HttpResponseMessage Rejected(AuthorityRequest request, string code, int status, bool retryable) =>
            Fixtures.GraphqlError(request, new JsonObject { ["code"] = code, ["status"] = status, ["retryable"] = retryable }, "Not now");

        private static HttpResponseMessage Offline(AuthorityRequest request) => throw new HttpRequestException("offline");

        private static JsonObject OrganizationResult() =>
            new JsonObject { ["orgId"] = Fixtures.NewId(), ["name"] = "Original", ["status"] = "active", ["revision"] = "1" };

        private static int Mutations(FakeAuthority authority) =>
            authority.Requests.Count(request => request.Key == "management.createOrganization");

        private static string[] NewIds(int count) => Enumerable.Range(0, count).Select(_ => Fixtures.NewId()).ToArray();

        private static IEnumerable<string> Ids(IEnumerable<JsonNode?> records) => records.Select(record => (string)record!["requestId"]!);
    }
}
