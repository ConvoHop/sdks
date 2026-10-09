using System;
using System.Text.Json;
using ConvoHop.Internal;

namespace ConvoHop
{
    // Caller-input checks throw argument exceptions before any request is sent. Response checks throw INVALID_RESPONSE
    // with the identity of the request whose response failed them, so the caller can resolve that request.
    internal static class ServerChecks
    {
        internal const string MemberRole = "member";
        internal const string ModeratorRole = "moderator";

        internal static readonly JsonElement EmptyObject = JsonParsing.Parse("{}");

        internal static string Id(string? value, string name) =>
            value == null ? throw new ArgumentNullException(name)
            : Protocol.IsId(value) ? value : throw new ArgumentException("Expected a canonical nonzero UUID", name);

        internal static string Counter(string? value, string name) =>
            value == null ? throw new ArgumentNullException(name)
            : Protocol.IsCounter(value) ? value : throw new ArgumentException("Expected a canonical decimal counter", name);

        internal static string Text(string? value, string name) => value ?? throw new ArgumentNullException(name);

        internal static string? OptionalId(string? value, string name) => value == null ? null : Id(value, name);

        internal static string Role(string? value, string name) =>
            value == MemberRole || value == ModeratorRole ? value! : throw new ArgumentException("Invalid membership role", name);

        internal static int PageLimit(int? limit, string name, int fallback = 100)
        {
            int value = limit ?? fallback;
            if (value < 1 || value > 100) throw new ArgumentOutOfRangeException(name, value, "Page size must be 1..100");
            return value;
        }

        internal static int? OptionalPageLimit(int? limit, string name) => limit == null ? null : PageLimit(limit, name);

        internal static T Required<T>(T? value, string requestId) where T : class =>
            value ?? throw Invalid("Missing current authority result", requestId);

        internal static ConvoHopException Mismatch(string what, string requestId) => Invalid(what + " does not match the request", requestId);

        internal static ConvoHopException Invalid(string message, string requestId) =>
            new ConvoHopException(ErrorCodes.InvalidResponse, requestId, "unknown", 503, message);
    }
}
