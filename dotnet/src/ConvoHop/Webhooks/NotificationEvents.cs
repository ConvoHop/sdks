using System;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using ConvoHop.Internal;

namespace ConvoHop
{
    // Validates notification events against spec/push-payload/push-payload.schema.json. The problem names the first
    // invalid field and never echoes its value. Fields the contract doesn't define are ignored.
    internal static class NotificationEvents
    {
        private const int PreviewLimit = 512;

        private static readonly Regex TimestampPattern = new Regex(
            "^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$",
            RegexOptions.CultureInvariant);

        private static readonly Regex IdentifierPattern = new Regex("^[A-Za-z][A-Za-z0-9_]{0,63}$", RegexOptions.CultureInvariant);

        internal static bool IsNotificationType(string eventType) =>
            eventType == WebhookEventTypes.NotificationMessage || eventType == WebhookEventTypes.NotificationCall ||
            eventType == WebhookEventTypes.NotificationCallCancelled;

        // Unix seconds of an RFC 3339 timestamp with an uppercase T, and Z or an offset, ignoring any fraction. The date
        // must exist, and second 60 isn't accepted.
        internal static long? EpochSeconds(string? value)
        {
            if (value == null) return null;
            Match match = TimestampPattern.Match(value);
            if (!match.Success || match.Index != 0 || match.Length != value.Length) return null;
            int year = Number(match, 1), month = Number(match, 2), day = Number(match, 3);
            int hour = Number(match, 4), minute = Number(match, 5), second = Number(match, 6);
            int offsetHour = Number(match, 8), offsetMinute = Number(match, 9);
            if (month < 1 || month > 12 || day < 1 || day > Protocol.DaysInMonth(year, month) || hour > 23 || minute > 59 ||
                second > 59 || offsetHour > 23 || offsetMinute > 59)
            {
                return null;
            }

            long sign = match.Groups[7].Value == "-" ? -1 : 1;
            return Protocol.DaysFromCivil(year, month, day) * 86400 + hour * 3600L + minute * 60L + second -
                sign * (offsetHour * 3600L + offsetMinute * 60L);
        }

        internal static bool TryParse(
            JsonElement value,
            [NotNullWhen(true)] out WebhookNotificationEvent? notification,
            [NotNullWhen(false)] out string? problem)
        {
            try
            {
                notification = Parse(value);
                problem = null;
                return true;
            }
            catch (MalformedNotification error)
            {
                notification = null;
                problem = error.Message;
                return false;
            }
        }

        private static WebhookNotificationEvent Parse(JsonElement value)
        {
            Need(value.ValueKind == JsonValueKind.Object, "event must be an object");
            string? eventType = JsonStrings.Property(value, "eventType");
            Need(eventType != null && IsNotificationType(eventType), "eventType must be a notification event type");
            string eventId = Uuid(value, "eventId"), occurredAt = Timestamp(value, "occurredAt"), projectId = Uuid(value, "projectId");
            string recipientId = Uuid(value, "recipientId"), conversationId = Uuid(value, "conversationId");
            string senderId = Uuid(value, "senderId");
            bool connected = Flag(value, "connected");
            if (eventType == WebhookEventTypes.NotificationMessage)
            {
                string messageId = Uuid(value, "messageId");
                Subject(value, "message", messageId);
                WebhookNotificationPreview? preview =
                    value.TryGetProperty("preview", out JsonElement shown) ? Preview(shown) : null;
                return new WebhookMessageNotificationEvent(
                    eventId, occurredAt, projectId, recipientId, conversationId, senderId, connected, messageId, preview);
            }

            string liveSessionId = Uuid(value, "liveSessionId");
            Subject(value, "liveSession", liveSessionId);
            string alertId = Uuid(value, "alertId"), expiresAt = Timestamp(value, "expiresAt");
            string mediaProfile = Identifier(value, "mediaProfile");
            if (eventType == WebhookEventTypes.NotificationCall)
            {
                return new WebhookCallNotificationEvent(
                    eventId, occurredAt, projectId, recipientId, conversationId, senderId, connected, liveSessionId, alertId,
                    expiresAt, mediaProfile);
            }

            return new WebhookCallCancelledNotificationEvent(
                eventId, occurredAt, projectId, recipientId, conversationId, senderId, connected, liveSessionId, alertId,
                expiresAt, mediaProfile, Identifier(value, "reason"));
        }

        private static void Need([DoesNotReturnIf(false)] bool condition, string problem)
        {
            if (!condition) throw new MalformedNotification(problem);
        }

        private static string Uuid(JsonElement source, string field)
        {
            string? value = JsonStrings.Property(source, field);
            Need(Protocol.IsId(value), field + " must be a lowercase, non-nil UUID");
            return value!;
        }

        private static string Timestamp(JsonElement source, string field)
        {
            string? value = JsonStrings.Property(source, field);
            Need(EpochSeconds(value) != null, field + " must be an RFC 3339 timestamp");
            return value!;
        }

        private static string Identifier(JsonElement source, string field)
        {
            string? value = JsonStrings.Property(source, field);
            Need(value != null && Protocol.FullMatch(IdentifierPattern, value),
                field + " must be an ASCII letter followed by up to 63 ASCII letters, digits or _");
            return value!;
        }

        private static bool Flag(JsonElement source, string field)
        {
            bool found = source.TryGetProperty(field, out JsonElement value);
            Need(found && (value.ValueKind == JsonValueKind.True || value.ValueKind == JsonValueKind.False), field + " must be a boolean");
            return value.ValueKind == JsonValueKind.True;
        }

        private static WebhookNotificationPreview Preview(JsonElement source)
        {
            Need(source.ValueKind == JsonValueKind.Object, "preview must be an object");
            string? text = JsonStrings.Property(source, "text");
            Need(text != null && text.Length != 0 && text.Length <= 2 * PreviewLimit && !JsonStrings.HasLoneSurrogate(text) &&
                JsonStrings.CodePointCount(text) <= PreviewLimit,
                "preview.text must be 1 to " + PreviewLimit.ToString(CultureInfo.InvariantCulture) + " Unicode code points");
            return new WebhookNotificationPreview(text!, Flag(source, "truncated"));
        }

        private static void Subject(JsonElement source, string kind, string id)
        {
            bool found = source.TryGetProperty("subjectRef", out JsonElement value);
            Need(found && value.ValueKind == JsonValueKind.Object, "subjectRef must be an object");
            Need(JsonStrings.Property(value, "kind") == kind && JsonStrings.Property(value, "id") == id,
                "subjectRef must be the " + kind + " the event names");
        }

        private static int Number(Match match, int group) =>
            match.Groups[group].Success ? int.Parse(match.Groups[group].Value, NumberStyles.None, CultureInfo.InvariantCulture) : 0;

        private sealed class MalformedNotification : Exception
        {
            internal MalformedNotification(string problem)
                : base(problem)
            {
            }
        }
    }
}
