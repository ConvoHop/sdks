using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop.Generated;
using ConvoHop.Internal;

namespace ConvoHop
{
    public sealed partial class ConvoHopTransport
    {
        private const int TimeoutMilliseconds = 12000;
        private const int MaxResponseCharacters = 1048576;
        // UTF-8 needs at most three bytes per UTF-16 unit, plus an optional byte order mark.
        private const int MaxResponseBytes = 3 * MaxResponseCharacters + 3;
        private const string UnavailableMessage = "Authority response unavailable; resolve the original request";

        private static readonly Encoding ResponseEncoding = new UTF8Encoding(false, false);
        private static readonly Regex RetryAfterPattern = new Regex("^[0-9]{1,10}$", RegexOptions.CultureInvariant);
        private static readonly Lazy<HttpClient> SharedHttpClient = new Lazy<HttpClient>(CreateHttpClient);

        internal static JsonElement SerializeInput(object input) => JsonSerializer.SerializeToElement(input, TypeInfo(input.GetType()));

        private static JsonTypeInfo TypeInfo(Type type) =>
            ConvoHopJsonContext.Default.GetTypeInfo(type) ?? throw new InvalidOperationException("Unknown generated model " + type.Name);

        private string Plan(OperationDescriptor operation, string? projectId, JsonElement input, string requestId, JsonElement? permit,
            string? observedServingEpoch)
        {
            try
            {
                return GraphqlRequest.Build(operation, projectId, input, requestId, permit, Incarnation, observedServingEpoch);
            }
            catch (ProtocolFormatException error)
            {
                throw new ConvoHopException(ErrorCodes.InvalidRequest, requestId, "rejected", 400, error.Message);
            }
        }

        private async Task<Payload> RequestAsync(OperationDescriptor operation, string? projectId, JsonElement input, string requestId,
            JsonElement? permit, string? observedServingEpoch, CancellationToken cancellationToken)
        {
            string body = Plan(operation, projectId, input, requestId, permit, observedServingEpoch);
            using (var request = new HttpRequestMessage(HttpMethod.Post, _endpoint))
            using (CancellationTokenSource timeout = CreateTimeout())
            using (CancellationTokenSource linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token))
            {
                var content = new ByteArrayContent(Encoding.UTF8.GetBytes(body));
                content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                request.Content = content;
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                if (_credential != null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _credential);
                HttpResponseMessage response;
                try
                {
                    response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, linked.Token).ConfigureAwait(false);
                }
                catch (Exception) when (!cancellationToken.IsCancellationRequested)
                {
                    // Like the TypeScript transport, keep no underlying failure: handler messages may echo request details.
                    throw new ConvoHopException(ErrorCodes.TransportUnknown, requestId, "unknown", 0, UnavailableMessage);
                }

                using (response)
                {
                    return await ReadResponseAsync(operation, requestId, response, linked.Token, cancellationToken).ConfigureAwait(false);
                }
            }
        }

        private async Task<Payload> ReadResponseAsync(OperationDescriptor operation, string requestId, HttpResponseMessage response,
            CancellationToken readToken, CancellationToken cancellationToken)
        {
            int status = (int)response.StatusCode;
            Uri? answered = response.RequestMessage?.RequestUri;
            if ((IsRedirect(status) && response.Headers.Location != null) || (answered != null && answered != _endpoint))
                throw new ConvoHopException(ErrorCodes.TransportUnknown, requestId, "unknown", 0, UnavailableMessage);
            byte[]? bytes;
            try
            {
                bytes = await ReadBoundedAsync(response.Content, readToken).ConfigureAwait(false);
            }
            catch (Exception) when (!cancellationToken.IsCancellationRequested)
            {
                throw new ConvoHopException(ErrorCodes.TransportUnknown, requestId, "unknown", 0,
                    "Incomplete authority response; resolve the original request");
            }

            if (bytes == null) throw InvalidResponse(requestId, status, "Authority response exceeds the bound");
            int offset = bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF ? 3 : 0;
            string text = ResponseEncoding.GetString(bytes, offset, bytes.Length - offset);
            if (text.Length > MaxResponseCharacters) throw InvalidResponse(requestId, status, "Authority response exceeds the bound");
            JsonElement root;
            try
            {
                root = JsonParsing.Parse(text);
            }
            catch (JsonException)
            {
                throw InvalidResponse(requestId, status, "Unrecognized authority response");
            }

            try
            {
                return Interpret(operation, requestId, response, status, root);
            }
            catch (Exception error) when (error is ProtocolFormatException || error is JsonException || error is InvalidOperationException)
            {
                throw InvalidResponse(requestId, status, "Malformed authority response; resolve the original request");
            }
        }

        private static Payload Interpret(OperationDescriptor operation, string requestId, HttpResponseMessage response, int status,
            JsonElement root)
        {
            OutputValidator.RequireObject(root);
            if (root.TryGetProperty("errors", out JsonElement errors) && errors.ValueKind == JsonValueKind.Array && errors.GetArrayLength() != 0)
            {
                JsonElement error = errors[0];
                OutputValidator.RequireObject(error);
                JsonElement extensions = EmptyObject;
                if (error.TryGetProperty("extensions", out JsonElement found) && found.ValueKind != JsonValueKind.Null)
                {
                    OutputValidator.RequireObject(found);
                    extensions = found;
                }

                throw ConvoHopException.FromAuthority(JsonParsing.OptionalString(extensions, "code") ?? ErrorCodes.GraphqlError, requestId,
                    JsonParsing.OptionalString(extensions, "outcome") ?? "unknown", ErrorStatus(JsonParsing.Property(extensions, "status")),
                    JsonParsing.OptionalString(error, "message") ?? "GraphQL rejected the request",
                    RetryDelay(JsonParsing.Property(extensions, "retryAfter")) ?? HeaderRetryDelay(response));
            }

            if (status < 200 || status > 299)
            {
                throw ConvoHopException.FromAuthority(JsonParsing.OptionalString(root, "code") ?? ErrorCodes.HttpFailure, requestId,
                    JsonParsing.OptionalString(root, "outcome") ?? "unknown", status,
                    JsonParsing.OptionalString(root, "message") ?? "Authority rejected the request",
                    RetryDelay(JsonParsing.Property(root, "retryAfter")) ?? HeaderRetryDelay(response));
            }

            JsonElement data = JsonParsing.Property(root, "data") ?? throw new ProtocolFormatException("Missing GraphQL data");
            OutputValidator.RequireObject(data);
            JsonElement? raw = JsonParsing.Property(data, operation.Field);
            OutputValidator.Validate(raw, operation.ResultType);
            JsonElement value = raw ?? throw new ProtocolFormatException("Missing GraphQL response field");
            OutputValidator.RequireObject(value);
            string envelope = JsonParsing.OptionalString(value, "status") ?? throw new ProtocolFormatException("Expected a protocol string");
            if (envelope != "ok" && envelope != "committed" && envelope != "accepted")
                throw new ProtocolFormatException("Unrecognized authority envelope");
            if (Protocol.ParseId(JsonParsing.OptionalString(value, "requestId")) != requestId)
                throw InvalidResponse(requestId, status, "Mismatched authority request identity");
            if (operation.Kind == OperationKind.Mutation) RequireReceiptEvidence(value, envelope);
            object typed = JsonSerializer.Deserialize(value, TypeInfo(operation.ResultClrType)) ??
                throw new ProtocolFormatException("Missing GraphQL response field");
            return new Payload(value, typed, envelope);
        }

        private static void RequireReceiptEvidence(JsonElement value, string envelope)
        {
            if (envelope == "committed")
            {
                Protocol.ParseId(JsonParsing.OptionalString(value, "receiptId"));
                Protocol.ParseTimestamp(JsonParsing.OptionalString(value, "committedAt"));
                JsonValueKind replayed = JsonParsing.Property(value, "replayed")?.ValueKind ?? JsonValueKind.Undefined;
                if (replayed != JsonValueKind.True && replayed != JsonValueKind.False) throw new ProtocolFormatException("Expected a protocol boolean");
            }
            else if (envelope == "accepted")
            {
                JsonElement accepted = JsonParsing.Property(value, "operation") ?? throw new ProtocolFormatException("Missing accepted operation");
                OutputValidator.RequireObject(accepted);
                Protocol.ParseId(JsonParsing.OptionalString(accepted, "operationId"));
            }
            else
            {
                throw new ProtocolFormatException("A mutation requires authority receipt evidence");
            }
        }

        private static async Task<byte[]?> ReadBoundedAsync(HttpContent? content, CancellationToken cancellationToken)
        {
            if (content == null) return Array.Empty<byte>();
#if NET
            using (Stream stream = await content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false))
#else
            using (Stream stream = await content.ReadAsStreamAsync().ConfigureAwait(false))
#endif
            using (var buffer = new MemoryStream())
            {
                byte[] chunk = new byte[16384];
                while (true)
                {
#if NET
                    int read = await stream.ReadAsync(chunk.AsMemory(), cancellationToken).ConfigureAwait(false);
#else
                    int read = await stream.ReadAsync(chunk, 0, chunk.Length, cancellationToken).ConfigureAwait(false);
#endif
                    if (read == 0) return buffer.ToArray();
                    if (buffer.Length + read > MaxResponseBytes) return null;
                    buffer.Write(chunk, 0, read);
                }
            }
        }

        private static bool IsRedirect(int status) => status == 301 || status == 302 || status == 303 || status == 307 || status == 308;

        // A whole-second delay from extensions.retryAfter or an HTTP Retry-After delta; anything else is ignored.
        private static TimeSpan? RetryDelay(JsonElement? value)
        {
            if (value == null) return null;
            JsonElement element = value.Value;
            if (element.ValueKind == JsonValueKind.String) return JsonStrings.TryRead(element, out string? text) ? RetryDelay(text) : null;
            return element.ValueKind == JsonValueKind.Number && element.TryGetDouble(out double number) && number >= 0 &&
                number <= Protocol.MaxSafeInteger && Math.Floor(number) == number
                    ? Seconds((long)number)
                    : (TimeSpan?)null;
        }

        private static TimeSpan? RetryDelay(string? value) =>
            value != null && Protocol.FullMatch(RetryAfterPattern, value)
                ? Seconds(long.Parse(value, NumberStyles.None, CultureInfo.InvariantCulture))
                : (TimeSpan?)null;

        // Whole seconds as a TimeSpan, saturating at TimeSpan.MaxValue.
        internal static TimeSpan Seconds(long seconds) =>
            seconds > TimeSpan.MaxValue.Ticks / TimeSpan.TicksPerSecond ? TimeSpan.MaxValue : TimeSpan.FromTicks(seconds * TimeSpan.TicksPerSecond);

        private static TimeSpan? HeaderRetryDelay(HttpResponseMessage response)
        {
            if (!response.Headers.TryGetValues("Retry-After", out IEnumerable<string>? values)) return null;
            string? only = null;
            int count = 0;
            foreach (string value in values)
            {
                only = value;
                count++;
            }

            return count == 1 ? RetryDelay(only) : null;
        }

        private static int ErrorStatus(JsonElement? value) =>
            value != null && value.Value.ValueKind == JsonValueKind.Number && value.Value.TryGetDouble(out double number) &&
            Math.Floor(number) == number && number >= int.MinValue && number <= int.MaxValue
                ? (int)number
                : 503;

        private static ConvoHopException InvalidResponse(string requestId, int status, string message) =>
            new ConvoHopException(ErrorCodes.InvalidResponse, requestId, "unknown", status, message);

        private CancellationTokenSource CreateTimeout()
        {
            TimeSpan delay = TimeSpan.FromMilliseconds(TimeoutMilliseconds);
#if NET
            return new CancellationTokenSource(delay, _time);
#else
            return _time.CreateCancellationTokenSource(delay);
#endif
        }

        private static HttpClient CreateHttpClient()
        {
#if NET
            var handler = new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                UseCookies = false,
                PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            };
#else
            var handler = new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false };
#endif
            return new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        }
    }
}

namespace ConvoHop.Internal
{
    // A validated authority payload: the raw protocol object and its typed model.
    internal sealed class Payload
    {
        internal Payload(JsonElement element, object typed, string status)
        {
            Element = element;
            Typed = typed;
            Status = status;
        }

        internal JsonElement Element { get; }

        internal object Typed { get; }

        internal string Status { get; }
    }
}
