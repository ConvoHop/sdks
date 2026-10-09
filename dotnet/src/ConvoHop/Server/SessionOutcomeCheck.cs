using System.Globalization;
using System.Text.Json;
using ConvoHop.Internal;

namespace ConvoHop
{
    // Checks a session request outcome proof against the original request and, when this client recorded it, the custody
    // record. Every failure is a ProtocolFormatException, which the caller reports as INVALID_RESPONSE.
    internal static class SessionOutcomeCheck
    {
        private static readonly string[] EnvelopeFields = { "status", "requestId", "serverTime", "result" };
        private static readonly string[] Details = { "operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState" };
        private static readonly string[] ResultFields =
        {
            "state", "requestId", "checkedAt", "operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState",
        };
        private static readonly string[] SessionFields = { "sessionId", "principalId", "deviceId", "incarnation", "sessionRevision", "expiresAt", "status" };
        private static readonly string[] IdentityFields = { "sessionId", "principalId", "deviceId", "incarnation" };

        internal static void Check(JsonElement proof, string requestId, string projectId, string incarnation, RecoveryState? custody)
        {
            Fields(proof, EnvelopeFields);
            if (Text(proof, "status") != "ok") throw Fail("Expected a read-only session request outcome");
            Timestamp(proof, "serverTime");
            JsonElement value = proof.GetProperty("result");
            Fields(value, ResultFields);
            if (Protocol.ParseId(Text(value, "requestId")) != requestId || (custody != null &&
                (custody.ProjectId != projectId || custody.Incarnation != incarnation ||
                 (custody.Operation != "communication.issueSession" && custody.Operation != "communication.renewSession"))))
            {
                throw Fail("Session request outcome does not match original custody");
            }

            Timestamp(value, "checkedAt");
            if (Text(value, "state") == "notObservedYet")
            {
                foreach (string field in Details)
                {
                    if (value.GetProperty(field).ValueKind != JsonValueKind.Null) throw Fail("Absent observation cannot carry commit metadata");
                }

                return;
            }

            string? operation = Text(value, "operation");
            if (Text(value, "state") != "committed" || (operation != "issueSession" && operation != "renewSession") ||
                (custody != null && custody.Operation != "communication." + operation))
            {
                throw Fail("Invalid original session mutation outcome");
            }

            JsonElement original = Session(value.GetProperty("originalSession"), incarnation);
            if (Text(original, "status") != "active") throw Fail("Original session evidence must be historically active");
            if (custody != null && (Text(custody.Input, "principalId") != Text(original, "principalId") ||
                Text(custody.Input, "deviceId") != Text(original, "deviceId") ||
                (operation == "renewSession" && (Text(custody.Input, "sessionId") != Text(original, "sessionId") ||
                 Counter(Text(custody.Input, "expectedRevision")) + 1 != Counter(Text(original, "sessionRevision"))))))
            {
                throw Fail("Session request outcome does not match the original payload");
            }

            Protocol.ParseId(Text(value, "receiptId"));
            Timestamp(value, "committedAt");
            string? currentState = Text(value, "currentState");
            JsonElement currentValue = value.GetProperty("currentSession");
            if (currentState == "missing")
            {
                if (currentValue.ValueKind != JsonValueKind.Null) throw Fail("Missing session cannot carry a current row");
                return;
            }

            if (currentState != "active" && currentState != "expired" && currentState != "revoked") throw Fail("Invalid current session disposition");
            JsonElement current = Session(currentValue, incarnation);
            bool contradicts = Text(current, "status") != currentState;
            foreach (string field in IdentityFields) contradicts |= Text(current, field) != Text(original, field);
            int revision = Counter(Text(current, "sessionRevision")).CompareTo(Counter(Text(original, "sessionRevision")));
            if (contradicts || revision < 0 || (revision == 0 && Text(current, "expiresAt") != Text(original, "expiresAt")))
                throw Fail("Current session contradicts original receipt evidence");
        }

        private static JsonElement Session(JsonElement value, string incarnation)
        {
            Fields(value, SessionFields);
            foreach (string field in IdentityFields) Protocol.ParseId(Text(value, field));
            if (Text(value, "incarnation") != incarnation || Protocol.ParseCounter(Text(value, "sessionRevision")) == "0")
                throw Fail("Invalid session request outcome scope or revision");
            Timestamp(value, "expiresAt");
            return value;
        }

        private static void Fields(JsonElement value, string[] fields)
        {
            if (value.ValueKind != JsonValueKind.Object) throw Fail("Expected a protocol object");
            int count = 0;
            foreach (JsonProperty property in value.EnumerateObject())
            {
                count++;
                if (System.Array.IndexOf(fields, property.Name) < 0) throw Fail("Unexpected session request outcome fields");
            }

            foreach (string field in fields)
            {
                if (!value.TryGetProperty(field, out _)) throw Fail("Unexpected session request outcome fields");
            }

            if (count != fields.Length) throw Fail("Unexpected session request outcome fields");
        }

        private static void Timestamp(JsonElement value, string name)
        {
            if (!Protocol.IsExactTimestamp(Text(value, name))) throw Fail("Invalid session request outcome timestamp");
        }

        private static string? Text(JsonElement value, string name) => JsonParsing.OptionalString(value, name);

        // Counters are at most Int64.MaxValue, so adding one cannot overflow.
        private static ulong Counter(string? value) => ulong.Parse(Protocol.ParseCounter(value), NumberStyles.None, CultureInfo.InvariantCulture);

        private static ProtocolFormatException Fail(string message) => new ProtocolFormatException(message);
    }
}
