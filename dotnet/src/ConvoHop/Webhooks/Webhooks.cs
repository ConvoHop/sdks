using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ConvoHop.Internal;

namespace ConvoHop
{
    /// <summary>
    /// Verifies ConvoHop webhook deliveries (Standard Webhooks symmetric <c>v1</c>). Pass the raw body; respond <c>2xx</c>
    /// within 5 s, then process; de-duplicate on <c>webhook-id</c>. Failures throw <see cref="WebhookVerificationException"/>.
    /// </summary>
    /// <remarks>Verification is CPU-only and synchronous: it sends nothing and stores nothing.</remarks>
    public static class Webhooks
    {
        /// <summary>The default allowed distance between <c>webhook-timestamp</c> and now: 300 seconds.</summary>
        public const long DefaultToleranceSeconds = 300;

        private const int BodyLimit = 4096;
        private const int SignatureLimit = 8;
        private const int SignatureBytes = 32;
        private const int SecretMinBytes = 24;
        private const int SecretMaxBytes = 64;
        private const string SecretPrefix = "whsec_";

        private static readonly Regex Base64Pattern =
            new Regex("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$", RegexOptions.CultureInvariant);

        private static readonly Regex StampPattern = new Regex("^[0-9]{1,15}$", RegexOptions.CultureInvariant);
        private static readonly UTF8Encoding StrictUtf8 = new UTF8Encoding(false, true);

        private static readonly HashSet<string> ResourceEventTypes = new HashSet<string>(StringComparer.Ordinal)
        {
            WebhookEventTypes.ConversationCreated, WebhookEventTypes.ConversationUpdated, WebhookEventTypes.MemberAdded,
            WebhookEventTypes.MemberRoleChanged, WebhookEventTypes.MemberHistoryExpanded, WebhookEventTypes.MemberRemoved,
            WebhookEventTypes.MemberBroadcastPermissionChanged, WebhookEventTypes.MessageCreated, WebhookEventTypes.MessageEdited,
            WebhookEventTypes.MessageDeleted, WebhookEventTypes.ReceiptReported, WebhookEventTypes.LiveStarted,
            WebhookEventTypes.LiveParticipationChanged, WebhookEventTypes.LiveAlerted, WebhookEventTypes.LiveReady,
            WebhookEventTypes.LiveConnected, WebhookEventTypes.LiveEnded,
        };

        /// <summary>Verifies the signature and timestamp, then parses the metadata-only event.</summary>
        /// <param name="headers">The request headers.</param>
        /// <param name="body">The exact request body's UTF-8 decoding. Never re-serialized JSON.</param>
        /// <param name="secrets">
        /// The endpoint's <c>whsec_</c> secrets: the current one and, during a rotation, the next or replaced one.
        /// </param>
        /// <param name="toleranceSeconds">
        /// The allowed distance between <c>webhook-timestamp</c> and <paramref name="now"/>, in whole seconds, inclusive.
        /// </param>
        /// <param name="now">The verifier's clock. Defaults to the current time.</param>
        /// <returns>The delivery's <c>webhook-id</c>, <c>webhook-timestamp</c> and event.</returns>
        /// <exception cref="WebhookVerificationException">The delivery failed verification.</exception>
        /// <exception cref="ArgumentOutOfRangeException"><paramref name="toleranceSeconds"/> is negative or above 2^53 − 1.</exception>
        public static VerifiedWebhookDelivery Verify(
            WebhookHeaders headers, string body, IEnumerable<string> secrets, long toleranceSeconds = DefaultToleranceSeconds,
            DateTimeOffset? now = null)
        {
            if (body == null) throw new ArgumentNullException(nameof(body));
            WebhookSignature signature = Check(headers, body, default, secrets, toleranceSeconds, now, out byte[] signed);
            return new VerifiedWebhookDelivery(signature.WebhookId, signature.Timestamp, ParseEvent(signed));
        }

        /// <summary>Verifies the signature and timestamp, then parses the metadata-only event.</summary>
        /// <param name="headers">The request headers.</param>
        /// <param name="body">The exact request body bytes. Never re-serialized JSON.</param>
        /// <param name="secrets">
        /// The endpoint's <c>whsec_</c> secrets: the current one and, during a rotation, the next or replaced one.
        /// </param>
        /// <param name="toleranceSeconds">
        /// The allowed distance between <c>webhook-timestamp</c> and <paramref name="now"/>, in whole seconds, inclusive.
        /// </param>
        /// <param name="now">The verifier's clock. Defaults to the current time.</param>
        /// <returns>The delivery's <c>webhook-id</c>, <c>webhook-timestamp</c> and event.</returns>
        /// <exception cref="WebhookVerificationException">The delivery failed verification.</exception>
        /// <exception cref="ArgumentOutOfRangeException"><paramref name="toleranceSeconds"/> is negative or above 2^53 − 1.</exception>
        public static VerifiedWebhookDelivery Verify(
            WebhookHeaders headers, ReadOnlySpan<byte> body, IEnumerable<string> secrets,
            long toleranceSeconds = DefaultToleranceSeconds, DateTimeOffset? now = null)
        {
            WebhookSignature signature = Check(headers, null, body, secrets, toleranceSeconds, now, out byte[] signed);
            return new VerifiedWebhookDelivery(signature.WebhookId, signature.Timestamp, ParseEvent(signed));
        }

        /// <summary>Verifies only the signature and timestamp, for bodies you parse yourself.</summary>
        /// <param name="headers">The request headers.</param>
        /// <param name="body">The exact request body's UTF-8 decoding. Never re-serialized JSON.</param>
        /// <param name="secrets">
        /// The endpoint's <c>whsec_</c> secrets: the current one and, during a rotation, the next or replaced one.
        /// </param>
        /// <param name="toleranceSeconds">
        /// The allowed distance between <c>webhook-timestamp</c> and <paramref name="now"/>, in whole seconds, inclusive.
        /// </param>
        /// <param name="now">The verifier's clock. Defaults to the current time.</param>
        /// <returns>The delivery's <c>webhook-id</c> and <c>webhook-timestamp</c>.</returns>
        /// <exception cref="WebhookVerificationException">The delivery failed verification.</exception>
        /// <exception cref="ArgumentOutOfRangeException"><paramref name="toleranceSeconds"/> is negative or above 2^53 − 1.</exception>
        public static WebhookSignature VerifySignature(
            WebhookHeaders headers, string body, IEnumerable<string> secrets, long toleranceSeconds = DefaultToleranceSeconds,
            DateTimeOffset? now = null)
        {
            if (body == null) throw new ArgumentNullException(nameof(body));
            return Check(headers, body, default, secrets, toleranceSeconds, now, out _);
        }

        /// <summary>Verifies only the signature and timestamp, for bodies you parse yourself.</summary>
        /// <param name="headers">The request headers.</param>
        /// <param name="body">The exact request body bytes. Never re-serialized JSON.</param>
        /// <param name="secrets">
        /// The endpoint's <c>whsec_</c> secrets: the current one and, during a rotation, the next or replaced one.
        /// </param>
        /// <param name="toleranceSeconds">
        /// The allowed distance between <c>webhook-timestamp</c> and <paramref name="now"/>, in whole seconds, inclusive.
        /// </param>
        /// <param name="now">The verifier's clock. Defaults to the current time.</param>
        /// <returns>The delivery's <c>webhook-id</c> and <c>webhook-timestamp</c>.</returns>
        /// <exception cref="WebhookVerificationException">The delivery failed verification.</exception>
        /// <exception cref="ArgumentOutOfRangeException"><paramref name="toleranceSeconds"/> is negative or above 2^53 − 1.</exception>
        public static WebhookSignature VerifySignature(
            WebhookHeaders headers, ReadOnlySpan<byte> body, IEnumerable<string> secrets,
            long toleranceSeconds = DefaultToleranceSeconds, DateTimeOffset? now = null) =>
            Check(headers, null, body, secrets, toleranceSeconds, now, out _);

        // The checks run in the order WebhookVerificationCode lists. A string body is measured after the timestamp checks.
        private static WebhookSignature Check(
            WebhookHeaders headers, string? text, ReadOnlySpan<byte> bytes, IEnumerable<string> secrets, long toleranceSeconds,
            DateTimeOffset? now, out byte[] body)
        {
            if (headers == null) throw new ArgumentNullException(nameof(headers));
            if (secrets == null) throw new ArgumentNullException(nameof(secrets));
            if (toleranceSeconds < 0 || toleranceSeconds > Protocol.MaxSafeInteger)
                throw new ArgumentOutOfRangeException(nameof(toleranceSeconds), "Webhook tolerance must be a non-negative integer");
            List<byte[]> keys = SecretKeys(secrets);
            string webhookId = headers.Read("webhook-id"), stamp = headers.Read("webhook-timestamp");
            string[] entries = headers.Read("webhook-signature").Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (!Protocol.FullMatch(StampPattern, stamp))
                throw Failure(WebhookVerificationCode.InvalidTimestamp, "webhook-timestamp must be integer Unix seconds");
            long timestamp = long.Parse(stamp, NumberStyles.None, CultureInfo.InvariantCulture);
            long age = (now ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds() - timestamp;
            if (age > toleranceSeconds)
                throw Failure(WebhookVerificationCode.TimestampExpired, "webhook-timestamp is older than the tolerance");
            if (-age > toleranceSeconds)
                throw Failure(WebhookVerificationCode.TimestampFuture, "webhook-timestamp is further ahead than the tolerance");

            // A string's UTF-8 encoding is at least as long as the string, so oversized strings are rejected before encoding.
            // Encoding.UTF8 replaces lone surrogates with U+FFFD, like TextEncoder.
            if ((text != null ? text.Length : bytes.Length) > BodyLimit) throw BodyTooLarge();
            body = text != null ? Encoding.UTF8.GetBytes(text) : bytes.ToArray();
            if (body.Length > BodyLimit) throw BodyTooLarge();
            if (entries.Length > SignatureLimit)
            {
                throw Failure(WebhookVerificationCode.TooManySignatures,
                    "webhook-signature has more than " + SignatureLimit.ToString(CultureInfo.InvariantCulture) + " entries");
            }

            var offered = new List<byte[]>(entries.Length);
            foreach (string entry in entries)
            {
                int comma = entry.IndexOf(',');
                if (comma != 2 || !entry.StartsWith("v1", StringComparison.Ordinal)) continue;
                byte[]? candidate = Base64Bytes(entry.Substring(comma + 1));
                if (candidate != null && candidate.Length == SignatureBytes) offered.Add(candidate);
            }

            byte[] prefix = Encoding.UTF8.GetBytes(webhookId + "." + stamp + ".");
            byte[] signed = new byte[prefix.Length + body.Length];
            Buffer.BlockCopy(prefix, 0, signed, 0, prefix.Length);
            Buffer.BlockCopy(body, 0, signed, prefix.Length, body.Length);
            foreach (byte[] key in keys)
            {
                byte[] expected;
                using (var hmac = new HMACSHA256(key)) expected = hmac.ComputeHash(signed);
                foreach (byte[] candidate in offered)
                {
                    if (FixedTimeEquals(expected, candidate)) return new WebhookSignature(webhookId, timestamp);
                }
            }

            throw Failure(WebhookVerificationCode.NoMatchingSignature, "No v1 webhook signature matches the configured secrets");
        }

        private static List<byte[]> SecretKeys(IEnumerable<string> secrets)
        {
            var keys = new List<byte[]>();
            foreach (string? secret in secrets)
            {
                byte[]? key = secret != null && secret.StartsWith(SecretPrefix, StringComparison.Ordinal)
                    ? Base64Bytes(secret.Substring(SecretPrefix.Length))
                    : null;
                if (key == null || key.Length < SecretMinBytes || key.Length > SecretMaxBytes)
                {
                    throw Failure(WebhookVerificationCode.InvalidSecret,
                        "A webhook secret must be whsec_ followed by padded standard Base64 of 24 to 64 bytes");
                }

                keys.Add(key);
            }

            if (keys.Count == 0) throw Failure(WebhookVerificationCode.InvalidSecret, "At least one webhook secret is required");
            return keys;
        }

        // Strict padded standard Base64. Non-canonical encodings are rejected so byte equality matches text equality.
        private static byte[]? Base64Bytes(string value)
        {
            if (!Protocol.FullMatch(Base64Pattern, value)) return null;
            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(value);
            }
            catch (FormatException)
            {
                return null;
            }

            return Convert.ToBase64String(bytes) == value ? bytes : null;
        }

        private static WebhookEvent ParseEvent(byte[] body)
        {
            JsonElement value;
            try
            {
                // TextDecoder drops one leading byte order mark; JSON.parse rejects any other U+FEFF, as System.Text.Json does.
                int start = body.Length >= 3 && body[0] == 0xEF && body[1] == 0xBB && body[2] == 0xBF ? 3 : 0;
                value = JsonParsing.Parse(StrictUtf8.GetString(body, start, body.Length - start));
            }
            catch (Exception error) when (error is DecoderFallbackException || error is JsonException)
            {
                throw Failure(WebhookVerificationCode.InvalidBody, "Webhook body is not UTF-8 JSON");
            }

            if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty("subjectRef", out JsonElement subject) ||
                subject.ValueKind != JsonValueKind.Object)
            {
                throw NotAnEnvelope();
            }

            string eventType = Text(value, "eventType"), id = Text(subject, "id"), kind = Text(subject, "kind");
            string eventId = Text(value, "eventId"), occurredAt = Text(value, "occurredAt"), projectId = Text(value, "projectId");
            var subjectRef = new WebhookSubjectRef(id, kind);
            if (ResourceEventTypes.Contains(eventType)) return new WebhookResourceEvent(eventId, eventType, occurredAt, projectId, subjectRef);
            if (eventType == WebhookEventTypes.WebhookEndpointDisabled && kind == "webhookEndpoint")
                return new WebhookEndpointDisabledEvent(eventId, occurredAt, projectId, subjectRef);
            if (NotificationEvents.IsNotificationType(eventType) &&
                NotificationEvents.TryParse(value, out WebhookNotificationEvent? notification, out _))
            {
                return notification;
            }

            return new WebhookUnknownEvent(eventId, eventType, occurredAt, projectId, subjectRef);
        }

        private static string Text(JsonElement source, string field)
        {
            string? value = JsonStrings.Property(source, field);
            if (string.IsNullOrEmpty(value)) throw NotAnEnvelope();
            return value!;
        }

        private static WebhookVerificationException NotAnEnvelope() =>
            Failure(WebhookVerificationCode.InvalidBody, "Webhook body is not a ConvoHop event envelope");

        private static WebhookVerificationException BodyTooLarge() =>
            Failure(WebhookVerificationCode.BodyTooLarge, "Webhook body exceeds " + BodyLimit.ToString(CultureInfo.InvariantCulture) + " bytes");

        private static WebhookVerificationException Failure(WebhookVerificationCode code, string message) =>
            new WebhookVerificationException(code, message);

#if NET
        private static bool FixedTimeEquals(byte[] left, byte[] right) => CryptographicOperations.FixedTimeEquals(left, right);
#else
        [MethodImpl(MethodImplOptions.NoInlining | MethodImplOptions.NoOptimization)]
        private static bool FixedTimeEquals(byte[] left, byte[] right)
        {
            if (left.Length != right.Length) return false;
            int difference = 0;
            for (int index = 0; index < left.Length; index++) difference |= left[index] ^ right[index];
            return difference == 0;
        }
#endif
    }
}
