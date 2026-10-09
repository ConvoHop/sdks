using System;
using System.Linq;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using ConvoHop.Models;
using ConvoHop.Tests.TestSupport;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>How authority failures become exceptions, ported from <c>packages/core/test/problem.test.mjs</c>.</summary>
    public sealed class ProblemTests
    {
        private const string Credential = "fixture-key-never-in-errors";
        private static readonly string ProjectId = Fixtures.NewId();

        private static string ScopeMessage(string scope) => "The backend key requires the current " + scope + " scope";

        [Theory]
        [InlineData("graphql", "7", null, 7)]
        [InlineData("graphql", "\"12\"", null, 12)]
        [InlineData("graphql", "0", null, 0)]
        [InlineData("graphql", null, "5", 5)]
        [InlineData("graphql", "3", "9", 3)]
        // An unusable extension falls back to the header rather than hiding it.
        [InlineData("graphql", "\"soon\"", "6", 6)]
        [InlineData("http", "4", null, 4)]
        [InlineData("http", null, "8", 8)]
        [InlineData("http", "2", "8", 2)]
        public async Task RetryAfterComesFromTheErrorElseTheRetryAfterHeaderOnEitherErrorPath(string path, string? retryAfter,
            string? header, long expected)
        {
            ConvoHopException error = await Problem(Limited(path, retryAfter, header == null ? Array.Empty<string>() : new[] { header }));
            Assert.Equal<(string, string, int, TimeSpan?)>(("RATE_LIMITED", "rejected", 429, TimeSpan.FromSeconds(expected)),
                (error.Code, error.Outcome, error.Status, error.RetryAfter));
            Assert.IsType<ConvoHopException>(error);
        }

        [Fact]
        public async Task ADelayThatIsNotValidTextFallsBackToTheHeader()
        {
            JsonObject extensions = Extensions("RATE_LIMITED", 429);
            extensions["retryAfter"] = "\ud800";
            ConvoHopException error = await Problem(request =>
                Fixtures.GraphqlError(request, extensions, "Rate limited", 200, ("Retry-After", "6")));
            Assert.Equal<(string, TimeSpan?)>(("RATE_LIMITED", TimeSpan.FromSeconds(6)), (error.Code, error.RetryAfter));
        }

        [Theory]
        [InlineData("-1")]
        [InlineData("1.5")]
        [InlineData("\"1.5\"")]
        [InlineData("\"\"")]
        [InlineData("\" 5\"")]
        [InlineData("\"+5\"")]
        [InlineData("\"0x10\"")]
        [InlineData("\"12345678901\"")]
        [InlineData("9007199254740992")] // Number.MAX_SAFE_INTEGER + 1
        [InlineData("true")]
        [InlineData("null")]
        [InlineData("{}")]
        [InlineData("[5]")]
        public async Task DelaysThatAreNotWholeSecondsAreIgnoredRatherThanGuessed(string retryAfter)
        {
            JsonObject extensions = Extensions("RATE_LIMITED", 429);
            extensions["retryAfter"] = JsonNode.Parse(retryAfter);
            ConvoHopException error = await Problem(request => Fixtures.GraphqlError(request, extensions));
            Assert.Equal<(string, TimeSpan?)>(("RATE_LIMITED", null), (error.Code, error.RetryAfter));
        }

        [Theory]
        [InlineData("922337203685", 922337203685L * TimeSpan.TicksPerSecond)]
        [InlineData("922337203686", long.MaxValue)]
        [InlineData("9007199254740991", long.MaxValue)] // Number.MAX_SAFE_INTEGER
        [InlineData("\"9999999999\"", 9999999999L * TimeSpan.TicksPerSecond)]
        public async Task DelaysBeyondTimeSpanMaxValueSaturateRatherThanOverflow(string retryAfter, long ticks)
        {
            JsonObject extensions = Extensions("RATE_LIMITED", 429);
            extensions["retryAfter"] = JsonNode.Parse(retryAfter);
            ConvoHopException error = await Problem(request => Fixtures.GraphqlError(request, extensions));
            Assert.Equal(TimeSpan.FromTicks(ticks), error.RetryAfter);
        }

        [Theory]
        [InlineData("graphql", new[] { "Wed, 21 Oct 2026 07:28:00 GMT" })]
        [InlineData("graphql", new[] { "1.5" })]
        [InlineData("graphql", new[] { "-1" })]
        [InlineData("graphql", new[] { "5, 6" })]
        [InlineData("graphql", new[] { "5", "6" })]
        [InlineData("http", new[] { "Wed, 21 Oct 2026 07:28:00 GMT" })]
        [InlineData("http", new[] { "1.5" })]
        [InlineData("http", new[] { "-1" })]
        [InlineData("http", new[] { "5, 6" })]
        [InlineData("http", new[] { "5", "6" })]
        public async Task RetryAfterHeadersThatAreNotWholeSecondsAreIgnored(string path, string[] headers)
        {
            ConvoHopException error = await Problem(Limited(path, null, headers));
            Assert.Equal<(string, TimeSpan?)>(("RATE_LIMITED", null), (error.Code, error.RetryAfter));
        }

        [Fact]
        public async Task ARejectionWithoutADelayHasNone()
        {
            ConvoHopException error = await Problem(request => Fixtures.GraphqlError(request, Extensions("NOT_FOUND", 404), "Not found"));
            Assert.Equal<(string, int, TimeSpan?)>(("NOT_FOUND", 404, null), (error.Code, error.Status, error.RetryAfter));
        }

        [Fact]
        public async Task ARejectedMutationKeepsItsRetryDelayAndIsNeverResentByTheTransport()
        {
            JsonObject extensions = Extensions("RATE_LIMITED", 429);
            extensions["retryAfter"] = 30;
            var authority = new FakeAuthority(request => Fixtures.GraphqlError(request, extensions));
            ConvoHopException error = await Problem(authority, Operations.Communication.CreatePrincipal,
                new CreatePrincipalRequestInput("fixture-user"));
            Assert.Equal<(string, TimeSpan?)>(("RATE_LIMITED", TimeSpan.FromSeconds(30)), (error.Code, error.RetryAfter));
            AuthorityRequest request = Assert.Single(authority.Requests);
            Assert.Equal("fixture-user", Js.Text(request.Input, "externalUserId"));
        }

        [Theory]
        [InlineData("graphql")]
        [InlineData("http")]
        public async Task ScopeRequiredIsAScopeRequiredExceptionThatNamesTheMissingScope(string path)
        {
            Func<AuthorityRequest, HttpResponseMessage> respond = path == "graphql"
                ? request =>
                {
                    JsonObject extensions = Extensions("SCOPE_REQUIRED", 403);
                    extensions["retryable"] = false;
                    return Fixtures.GraphqlError(request, extensions, ScopeMessage("messageRead"));
                }
                : _ => Fixtures.Json(new JsonObject
                {
                    ["code"] = "SCOPE_REQUIRED",
                    ["outcome"] = "rejected",
                    ["message"] = ScopeMessage("messageRead"),
                }, 403);
            ScopeRequiredException error = Assert.IsType<ScopeRequiredException>(await Problem(respond));
            Assert.Equal<(string, int, string, string?, TimeSpan?)>(("SCOPE_REQUIRED", 403, "rejected", "messageRead", null),
                (error.Code, error.Status, error.Outcome, error.Scope, error.RetryAfter));
        }

        public static TheoryData<string> OtherWordings => new TheoryData<string>
        {
            "Missing scope",
            ScopeMessage("messageRead") + ".",
            ScopeMessage("MessageRead"),
            ScopeMessage("message read"),
            ScopeMessage("messageRead") + "\n",
            "Note: " + ScopeMessage("messageRead"),
            ScopeMessage("m" + new string('x', 64)),
        };

        [Theory]
        [MemberData(nameof(OtherWordings))]
        public async Task AScopeRequiredMessageInAnotherWordingKeepsTheClassButNotAGuessedScope(string message)
        {
            ScopeRequiredException error = Assert.IsType<ScopeRequiredException>(
                await Problem(request => Fixtures.GraphqlError(request, Extensions("SCOPE_REQUIRED", 403), message)));
            Assert.Equal<(string, string?, string)>(("SCOPE_REQUIRED", null, message), (error.Code, error.Scope, error.Message));
        }

        [Fact]
        public async Task AnUnexplainedScopeRequiredErrorKeepsTheClassWithTheGenericMessage()
        {
            ScopeRequiredException error = Assert.IsType<ScopeRequiredException>(
                await Problem(request => Fixtures.GraphqlError(request, Extensions("SCOPE_REQUIRED", 403), message: null)));
            Assert.Equal<(string?, string)>((null, "GraphQL rejected the request"), (error.Scope, error.Message));
        }

        [Fact]
        public async Task AnErrorWithoutDetailsGetsTheDocumentedDefaults()
        {
            ConvoHopException graphql = await Problem(_ => Fixtures.Json(new JsonObject { ["errors"] = new JsonArray(new JsonObject()) }));
            Assert.Equal<(string, string, int, string)>(("GRAPHQL_ERROR", "unknown", 503, "GraphQL rejected the request"),
                (graphql.Code, graphql.Outcome, graphql.Status, graphql.Message));
            ConvoHopException http = await Problem(_ => Fixtures.Json(new JsonObject(), 502));
            Assert.Equal<(string, string, int, string)>(("HTTP_FAILURE", "unknown", 502, "Authority rejected the request"),
                (http.Code, http.Outcome, http.Status, http.Message));
        }

        [Theory]
        [InlineData("\"429\"")]
        [InlineData("null")]
        [InlineData("1.5")] // Status is an integer here; JavaScript would keep 1.5.
        public async Task AGraphqlErrorStatusThatIsNotAnIntegerBecomes503(string status)
        {
            JsonObject extensions = Extensions("RATE_LIMITED", 429);
            extensions["status"] = JsonNode.Parse(status);
            ConvoHopException error = await Problem(request => Fixtures.GraphqlError(request, extensions));
            Assert.Equal<(string, int)>(("RATE_LIMITED", 503), (error.Code, error.Status));
        }

        [Fact]
        public void ExceptionsConstructedDirectlyKeepTheSameShape()
        {
            string requestId = Fixtures.NewId();
            var cause = new InvalidOperationException("cause");
            var limited = new ConvoHopException("RATE_LIMITED", requestId, "rejected", 429, "Rate limited", TimeSpan.FromSeconds(3), cause);
            Assert.IsType<ConvoHopException>(limited);
            Assert.Equal(TimeSpan.FromSeconds(3), limited.RetryAfter);
            Assert.Same(cause, limited.InnerException);
            Assert.Null(new ConvoHopException("NOT_FOUND", requestId, "rejected", 404, "Not found").RetryAfter);
            Assert.Throws<ArgumentOutOfRangeException>("retryAfter",
                () => new ConvoHopException("RATE_LIMITED", requestId, "rejected", 429, "Rate limited", TimeSpan.FromTicks(-1)));
            Assert.Throws<ArgumentOutOfRangeException>("retryAfter",
                () => new ScopeRequiredException(requestId, "rejected", 403, ScopeMessage("callRead"), TimeSpan.FromTicks(-1)));
            ConvoHopException scoped = new ScopeRequiredException(requestId, "rejected", 403, ScopeMessage("callRead"));
            Assert.Equal<(string, string?, string)>(("SCOPE_REQUIRED", "callRead", requestId),
                (scoped.Code, Assert.IsType<ScopeRequiredException>(scoped).Scope, scoped.RequestId));
            Assert.Throws<ArgumentNullException>("code", () => new ConvoHopException(null!, requestId, "rejected", 404, "Not found"));
            Assert.Throws<ArgumentNullException>("requestId", () => new ScopeRequiredException(null!, "rejected", 403, "Missing scope"));
            Assert.Throws<ArgumentNullException>("outcome", () => new ConvoHopException("NOT_FOUND", requestId, null!, 404, "Not found"));
        }

        private static JsonObject Extensions(string code, int status) => new JsonObject { ["code"] = code, ["status"] = status };

        /// <summary>A <c>RATE_LIMITED</c> rejection on the GraphQL or HTTP error path, with an optional delay and headers.</summary>
        private static Func<AuthorityRequest, HttpResponseMessage> Limited(string path, string? retryAfter, string[] headers)
        {
            (string, string)[] lines = headers.Select(value => ("Retry-After", value)).ToArray();
            if (path == "graphql")
            {
                return request =>
                {
                    JsonObject extensions = Extensions("RATE_LIMITED", 429);
                    extensions["retryable"] = true;
                    if (retryAfter != null) extensions["retryAfter"] = JsonNode.Parse(retryAfter);
                    return Fixtures.GraphqlError(request, extensions, "Rate limited", 200, lines);
                };
            }

            return _ =>
            {
                var body = new JsonObject { ["code"] = "RATE_LIMITED", ["outcome"] = "rejected", ["message"] = "Slow down" };
                if (retryAfter != null) body["retryAfter"] = JsonNode.Parse(retryAfter);
                return Fixtures.Json(body, 429, lines);
            };
        }

        private static Task<ConvoHopException> Problem(Func<AuthorityRequest, HttpResponseMessage> respond) =>
            Problem(new FakeAuthority(respond), Operations.Communication.Capabilities, NoInput.Value);

        /// <summary>Runs <paramref name="operation"/> against <paramref name="authority"/> and returns the failure.</summary>
        private static async Task<ConvoHopException> Problem<TInput, TResult>(FakeAuthority authority,
            OperationDescriptor<TInput, TResult> operation, TInput input)
            where TInput : class
            where TResult : class
        {
            string requestId = Fixtures.NewId();
            var transport = new ConvoHopTransport(new ConvoHopTransportOptions
            {
                BaseUrl = "http://127.0.0.1:18080",
                Credential = Credential,
                Namespace = Fixtures.NewId(),
                Incarnation = Fixtures.NewId(),
                HttpClient = authority.Client(),
            });
            ConvoHopException error = await Assert.ThrowsAnyAsync<ConvoHopException>(
                () => transport.ExecuteAsync(operation, ProjectId, input, requestId));
            Assert.Equal(requestId, error.RequestId);
            foreach (string view in new[] { error.ToString(), error.Message })
                Assert.DoesNotContain(Credential, view, StringComparison.Ordinal);
            return error;
        }
    }
}
