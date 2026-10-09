using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

namespace ConvoHop.Tests.TestSupport
{
    /// <summary>The shared fixtures copied to the test output's <c>spec</c> directory.</summary>
    internal static class Spec
    {
        internal static string Text(string name) => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "spec", name));

        internal static JsonNode Load(string name) => JsonNode.Parse(Text(name))!;
    }

    /// <summary>One GraphQL request the fake authority received.</summary>
    internal sealed class AuthorityRequest
    {
        internal AuthorityRequest(HttpRequestMessage message, string body)
        {
            Method = message.Method.Method;
            Uri = message.RequestUri!;
            Authorization = message.Headers.Authorization?.ToString();
            Accept = message.Headers.Accept.ToString();
            Body = body;
            Json = JsonNode.Parse(body)!.AsObject();
            OperationName = (string)Json["operationName"]!;
            Document = (string)Json["query"]!;
            JsonObject variables = Json["variables"]!.AsObject();
            Context = variables["context"]!.AsObject();
            Input = variables["input"];
            HasInput = variables.ContainsKey("input");
            RequestId = (string)Context["requestId"]!;
            Operation = Operations.All.FirstOrDefault(operation => operation.OperationName == OperationName) ??
                throw new InvalidOperationException("Unknown fixture operation " + OperationName);
        }

        internal string Method { get; }
        internal Uri Uri { get; }
        internal string? Authorization { get; }
        internal string Accept { get; }
        internal string Body { get; }
        internal JsonObject Json { get; }
        internal string OperationName { get; }
        internal string Document { get; }
        internal JsonObject Context { get; }
        internal JsonNode? Input { get; }
        internal bool HasInput { get; }
        internal string RequestId { get; }
        internal OperationDescriptor Operation { get; }

        /// <summary>The operation's catalog key, such as <c>communication.capabilities</c>.</summary>
        internal string Key => Operation.Id;
    }

    /// <summary>An authority that answers each request with a responder and records what it received.</summary>
    internal sealed class FakeAuthority : HttpMessageHandler
    {
        private readonly Func<AuthorityRequest, Task<HttpResponseMessage>> _respond;
        private readonly object _gate = new object();
        private readonly List<AuthorityRequest> _requests = new List<AuthorityRequest>();

        internal FakeAuthority(Func<AuthorityRequest, HttpResponseMessage> respond)
            : this(request => Task.FromResult(respond(request)))
        {
        }

        internal FakeAuthority(Func<AuthorityRequest, Task<HttpResponseMessage>> respond)
        {
            _respond = respond;
        }

        internal IReadOnlyList<AuthorityRequest> Requests
        {
            get
            {
                lock (_gate) return _requests.ToArray();
            }
        }

        internal HttpClient Client() => new HttpClient(this, false);

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            string body = request.Content == null ? "" : await request.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            var recorded = new AuthorityRequest(request, body);
            lock (_gate) _requests.Add(recorded);
            HttpResponseMessage response = await _respond(recorded).ConfigureAwait(false);
            response.RequestMessage ??= request;
            return response;
        }
    }

    /// <summary>Authority responses built from the IR, like the TypeScript tests' <c>graphql-fixtures.mjs</c>.</summary>
    internal static class Fixtures
    {
        private static readonly Lazy<Dictionary<string, string[]>> ObjectTypes = new Lazy<Dictionary<string, string[]>>(() =>
        {
            var types = new Dictionary<string, string[]>(StringComparer.Ordinal);
            foreach (JsonNode? type in Spec.Load("ir.json")["types"]!.AsArray())
            {
                if ((string?)type!["kind"] != "object") continue;
                types[(string)type["name"]!] = type["fields"]!.AsArray().Select(field => (string)field!["name"]!).ToArray();
            }

            return types;
        });

        internal static string NewId() => Guid.NewGuid().ToString("D");

        /// <summary>The current time as <c>Date.prototype.toISOString</c> writes it.</summary>
        internal static string Now() => Iso(DateTimeOffset.UtcNow);

        internal static string Iso(DateTimeOffset value) =>
            value.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);

        /// <summary>Every field of the IR object <paramref name="type"/>: the given value, or null.</summary>
        internal static JsonObject Full(string type, JsonObject fields)
        {
            if (!ObjectTypes.Value.TryGetValue(type, out string[]? names)) throw new InvalidOperationException("Unknown fixture object " + type);
            var result = new JsonObject();
            foreach (string name in names)
                result[name] = fields.TryGetPropertyValue(name, out JsonNode? value) ? value?.DeepClone() : null;
            return result;
        }

        /// <summary>A successful reply to <paramref name="request"/> with <paramref name="fields"/> over the defaults.</summary>
        internal static HttpResponseMessage Reply(AuthorityRequest request, JsonObject? fields = null) =>
            Json(ReplyBody(request, fields));

        internal static JsonObject ReplyBody(AuthorityRequest request, JsonObject? fields = null)
        {
            OperationDescriptor operation = request.Operation;
            string now = Now();
            var merged = new JsonObject
            {
                ["status"] = operation.Kind == OperationKind.Mutation ? "committed" : "ok",
                ["requestId"] = request.RequestId,
                ["serverTime"] = now,
                ["receiptId"] = NewId(),
                ["committedAt"] = now,
                ["replayed"] = false,
            };
            if (fields != null)
            {
                foreach (KeyValuePair<string, JsonNode?> field in fields) merged[field.Key] = field.Value?.DeepClone();
            }

            return new JsonObject
            {
                ["data"] = new JsonObject { [operation.Field] = Full(operation.ResultType.TrimEnd('!'), merged) },
            };
        }

        /// <summary>A replayed <c>messageCreated</c> event at <paramref name="sequence"/>.</summary>
        internal static JsonObject Event(string conversationId, string sequence) => Full("Event", new JsonObject
        {
            ["eventId"] = NewId(),
            ["conversationId"] = conversationId,
            ["sequence"] = sequence,
            ["type"] = "messageCreated",
            ["occurredAt"] = Now(),
        });

        internal static JsonObject Resolution(string requestId, string state, JsonObject? retained = null)
        {
            string now = Now();
            JsonObject? receipt = state == "notObservedYet"
                ? null
                : Full("ResolvedReceipt", new JsonObject
                {
                    ["status"] = state,
                    ["requestId"] = requestId,
                    ["receiptId"] = NewId(),
                    ["committedAt"] = now,
                    ["replayed"] = false,
                    ["result"] = retained == null ? null : Full("RetainedResult", retained),
                });
            return Full("RequestResolution", new JsonObject
            {
                ["state"] = state,
                ["requestId"] = requestId,
                ["checkedAt"] = now,
                ["resultWithheld"] = false,
                ["receipt"] = receipt,
            });
        }

        /// <summary>A GraphQL error for <paramref name="request"/>, outcome <c>rejected</c> unless the extensions say otherwise.</summary>
        internal static HttpResponseMessage GraphqlError(AuthorityRequest request, JsonObject extensions, string? message = "Rate limited",
            int status = 200, params (string Name, string Value)[] headers)
        {
            var merged = new JsonObject { ["requestId"] = request.RequestId, ["outcome"] = "rejected" };
            foreach (KeyValuePair<string, JsonNode?> field in extensions) merged[field.Key] = field.Value?.DeepClone();
            var error = new JsonObject();
            if (message != null) error["message"] = message;
            error["extensions"] = merged;
            return Json(new JsonObject { ["errors"] = new JsonArray(error) }, status, headers);
        }

        internal static HttpResponseMessage Json(JsonNode? body, int status = 200, params (string Name, string Value)[] headers)
        {
            var response = new HttpResponseMessage((HttpStatusCode)status)
            {
                Content = new StringContent(Js.Stringify(body), Encoding.UTF8, "application/json"),
            };
            foreach ((string name, string value) in headers) response.Headers.TryAddWithoutValidation(name, value);
            return response;
        }
    }

    /// <summary>Recovery storage that records reads and writes, with optional hooks, like <c>asyncStorage</c>.</summary>
    internal sealed class RecordingStorage : IRecoveryStorage
    {
        private readonly object _gate = new object();

        internal Dictionary<string, string> Values { get; } = new Dictionary<string, string>(StringComparer.Ordinal);
        internal List<string> Reads { get; } = new List<string>();
        internal List<KeyValuePair<string, string>> Writes { get; } = new List<KeyValuePair<string, string>>();
        internal Func<string, Task>? OnRead { get; set; }
        internal Func<string, string, int, Task>? OnWrite { get; set; }

        public async Task<string?> GetItemAsync(string key, CancellationToken cancellationToken)
        {
            lock (_gate) Reads.Add(key);
            if (OnRead != null) await OnRead(key).ConfigureAwait(false);
            lock (_gate) return Values.TryGetValue(key, out string? value) ? value : null;
        }

        public async Task SetItemAsync(string key, string value, CancellationToken cancellationToken)
        {
            int count;
            lock (_gate)
            {
                Writes.Add(new KeyValuePair<string, string>(key, value));
                count = Writes.Count;
            }

            if (OnWrite != null) await OnWrite(key, value, count).ConfigureAwait(false);
            lock (_gate) Values[key] = value;
        }
    }

    /// <summary>Signs webhook deliveries independently of the SDK: HMAC-SHA256 over <c>{id}.{timestamp}.{body}</c> bytes.</summary>
    internal static class WebhookSigner
    {
        internal const string Prefix = "whsec_";

        internal static string NewSecret(int bytes = 32)
        {
            var key = new byte[bytes];
            using (var random = RandomNumberGenerator.Create()) random.GetBytes(key);
            return Prefix + Convert.ToBase64String(key);
        }

        internal static string Sign(string secret, string id, string timestamp, byte[] body)
        {
            byte[] prefix = Encoding.UTF8.GetBytes(id + "." + timestamp + ".");
            using var hmac = new HMACSHA256(Convert.FromBase64String(secret.Substring(Prefix.Length)));
            return "v1," + Convert.ToBase64String(hmac.ComputeHash(prefix.Concat(body).ToArray()));
        }

        internal static string Sign(string secret, string id, string timestamp, string body) =>
            Sign(secret, id, timestamp, Encoding.UTF8.GetBytes(body));
    }
}
