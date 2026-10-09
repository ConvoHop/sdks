using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ConvoHop.Internal;

namespace ConvoHop
{
    /// <summary>
    /// Builds provider requests from per-recipient notification events (<c>notification.message</c>,
    /// <c>notification.call</c> and <c>notification.callCancelled</c>), as <c>Webhooks.Verify</c> returns them. Each builder
    /// validates its options and then the event, throwing <see cref="PushPayloadException"/>, and returns <c>null</c> when
    /// the event doesn't apply to the platform or is stale. Payloads are metadata-only unless you pass a title or body, or
    /// the event carries an opted-in message preview. The contract is <c>spec/push-payload/</c>.
    /// </summary>
    /// <remarks>
    /// The builders are pure functions: they send nothing and hold no credentials. Your push library sends the requests and
    /// owns APNs and FCM authentication and Web Push encryption. Builders that take a <see cref="JsonElement"/> validate an
    /// event's JSON, such as one your webhook handler queued, against the contract; fields it doesn't define are ignored.
    /// </remarks>
    public static class PushPayloads
    {
        // Payload limits in UTF-8 bytes. Web Push: RFC 8291's plaintext limit for the 4096-byte body push services accept,
        // less the encryption header (86), AEAD tag (16) and padding delimiter (1).
        private const int ApnsAlertLimit = 4096, ApnsVoipLimit = 5120, FcmLimit = 4096, WebPushLimit = 4096 - 86 - 16 - 1;

        // Lifetimes in seconds: messages and missed calls stay relevant for a day; no platform stores longer than 28 days.
        private const long NoticeLifetime = 86400, MaxLifetime = 2419200;
        private const int BundleIdLimit = 155;
        private const string Ellipsis = "\u2026";

        private static readonly Regex BundleIdPattern = new Regex("^[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*$", RegexOptions.CultureInvariant);

        /// <summary>
        /// An APNs alert for a message, an incoming call, or a missed call (a cancellation with reason <c>ended</c> or
        /// <c>expired</c>). At most 4096 bytes.
        /// </summary>
        /// <param name="notification">The notification event.</param>
        /// <param name="options">The app's bundle ID and the visible text.</param>
        /// <returns>The request, or <c>null</c> for other cancellations and stale events.</returns>
        /// <exception cref="PushPayloadException">The options are invalid.</exception>
        public static ApnsAlertRequest? ApnsAlert(WebhookNotificationEvent notification, ApnsPushOptions options)
        {
            if (notification == null) throw new ArgumentNullException(nameof(notification));
            if (options == null) throw new ArgumentNullException(nameof(options));
            return ApnsAlert(Prepare(notification, default, options, options));
        }

        /// <summary>
        /// An APNs alert for a message, an incoming call, or a missed call (a cancellation with reason <c>ended</c> or
        /// <c>expired</c>). At most 4096 bytes.
        /// </summary>
        /// <param name="notification">The notification event's JSON.</param>
        /// <param name="options">The app's bundle ID and the visible text.</param>
        /// <returns>The request, or <c>null</c> for other cancellations and stale events.</returns>
        /// <exception cref="PushPayloadException">The options or the event are invalid.</exception>
        public static ApnsAlertRequest? ApnsAlert(JsonElement notification, ApnsPushOptions options)
        {
            if (options == null) throw new ArgumentNullException(nameof(options));
            return ApnsAlert(Prepare(null, notification, options, options));
        }

        /// <summary>
        /// An APNs VoIP push for an incoming call. iOS requires you to report every VoIP push to CallKit as a call. At most
        /// 5120 bytes.
        /// </summary>
        /// <param name="notification">The notification event.</param>
        /// <param name="options">The app's bundle ID and the visible text.</param>
        /// <returns>The request, or <c>null</c> for other events and stale calls.</returns>
        /// <exception cref="PushPayloadException">The options are invalid.</exception>
        public static ApnsVoipRequest? ApnsVoip(WebhookNotificationEvent notification, ApnsPushOptions options)
        {
            if (notification == null) throw new ArgumentNullException(nameof(notification));
            if (options == null) throw new ArgumentNullException(nameof(options));
            return ApnsVoip(Prepare(notification, default, options, options));
        }

        /// <summary>
        /// An APNs VoIP push for an incoming call. iOS requires you to report every VoIP push to CallKit as a call. At most
        /// 5120 bytes.
        /// </summary>
        /// <param name="notification">The notification event's JSON.</param>
        /// <param name="options">The app's bundle ID and the visible text.</param>
        /// <returns>The request, or <c>null</c> for other events and stale calls.</returns>
        /// <exception cref="PushPayloadException">The options or the event are invalid.</exception>
        public static ApnsVoipRequest? ApnsVoip(JsonElement notification, ApnsPushOptions options)
        {
            if (options == null) throw new ArgumentNullException(nameof(options));
            return ApnsVoip(Prepare(null, notification, options, options));
        }

        /// <summary>An FCM data message for any notification event. At most 4096 bytes of <c>data</c> as JSON.</summary>
        /// <param name="notification">The notification event.</param>
        /// <param name="options">The visible text, preview choice and clock.</param>
        /// <returns>The request, or <c>null</c> for stale events.</returns>
        /// <exception cref="PushPayloadException">The options are invalid.</exception>
        public static FcmRequest? Fcm(WebhookNotificationEvent notification, PushOptions? options = null)
        {
            if (notification == null) throw new ArgumentNullException(nameof(notification));
            return Fcm(Prepare(notification, default, options, null));
        }

        /// <summary>An FCM data message for any notification event. At most 4096 bytes of <c>data</c> as JSON.</summary>
        /// <param name="notification">The notification event's JSON.</param>
        /// <param name="options">The visible text, preview choice and clock.</param>
        /// <returns>The request, or <c>null</c> for stale events.</returns>
        /// <exception cref="PushPayloadException">The options or the event are invalid.</exception>
        public static FcmRequest? Fcm(JsonElement notification, PushOptions? options = null) =>
            Fcm(Prepare(null, notification, options, null));

        /// <summary>
        /// A Web Push message for any notification event. At most 3993 bytes, the RFC 8291 plaintext limit.
        /// </summary>
        /// <param name="notification">The notification event.</param>
        /// <param name="options">The visible text, preview choice and clock.</param>
        /// <returns>The request, or <c>null</c> for stale events.</returns>
        /// <exception cref="PushPayloadException">The options are invalid.</exception>
        public static WebPushRequest? WebPush(WebhookNotificationEvent notification, PushOptions? options = null)
        {
            if (notification == null) throw new ArgumentNullException(nameof(notification));
            return WebPush(Prepare(notification, default, options, null));
        }

        /// <summary>
        /// A Web Push message for any notification event. At most 3993 bytes, the RFC 8291 plaintext limit.
        /// </summary>
        /// <param name="notification">The notification event's JSON.</param>
        /// <param name="options">The visible text, preview choice and clock.</param>
        /// <returns>The request, or <c>null</c> for stale events.</returns>
        /// <exception cref="PushPayloadException">The options or the event are invalid.</exception>
        public static WebPushRequest? WebPush(JsonElement notification, PushOptions? options = null) =>
            WebPush(Prepare(null, notification, options, null));

        private static ApnsAlertRequest? ApnsAlert(Prepared input)
        {
            WebhookNotificationEvent notice = input.Notification;
            if (notice is WebhookCallCancelledNotificationEvent cancelled && !MissedCall(cancelled)) return null;
            if (!Lifetime(input, out _, out long expiration)) return null;
            IReadOnlyDictionary<string, string> headers = ApnsHeaders("alert", input.BundleId, expiration, CollapseKey(notice));
            string key = notice is WebhookMessageNotificationEvent ? "CONVOHOP_MESSAGE"
                : notice is WebhookCallNotificationEvent ? "CONVOHOP_CALL" : "CONVOHOP_MISSED_CALL";
            var metadata = new PushData(notice, null, null);
            return Fit(ApnsAlertLimit, input.Text, text =>
            {
                var alert = new ApnsAlertContent(text.Title, text.Body, text.Body == null ? key : null);
                var request = new ApnsAlertRequest(headers, alert, notice.ConversationId, metadata);
                return (request, Size(request.PayloadJson));
            });
        }

        private static ApnsVoipRequest? ApnsVoip(Prepared input)
        {
            if (!(input.Notification is WebhookCallNotificationEvent)) return null;
            if (!Lifetime(input, out _, out long expiration)) return null;
            IReadOnlyDictionary<string, string> headers = ApnsHeaders("voip", input.BundleId + ".voip", expiration, null);
            return Fit(ApnsVoipLimit, input.Text, text =>
            {
                var request = new ApnsVoipRequest(headers, new PushData(input.Notification, text.Title, text.Body));
                return (request, Size(request.PayloadJson));
            });
        }

        private static FcmRequest? Fcm(Prepared input)
        {
            if (!Lifetime(input, out long ttl, out _)) return null;
            var android = new FcmAndroidConfig(ttl, CollapseKey(input.Notification));
            return Fit(FcmLimit, input.Text, text =>
            {
                var request = new FcmRequest(new PushData(input.Notification, text.Title, text.Body), android);
                return (request, Size(request.DataJson));
            });
        }

        private static WebPushRequest? WebPush(Prepared input)
        {
            if (!Lifetime(input, out long ttl, out _)) return null;
            string? collapse = CollapseKey(input.Notification);
            string urgency = input.Notification is WebhookMessageNotificationEvent ? "normal" : "high";
            IReadOnlyDictionary<string, string> headers = PushHeaders.Create(
                ("TTL", ttl.ToString(CultureInfo.InvariantCulture)), ("Urgency", urgency), ("Topic", collapse));
            return Fit(WebPushLimit, input.Text, text =>
            {
                var request = new WebPushRequest(headers, ttl, urgency, collapse, new PushData(input.Notification, text.Title, text.Body));
                return (request, Size(request.PayloadJson));
            });
        }

        // Options are checked before the event: title, body, then the bundle ID.
        private static Prepared Prepare(
            WebhookNotificationEvent? typed, JsonElement element, PushOptions? options, ApnsPushOptions? apns)
        {
            string? title = OptionText(options?.Title, "title"), body = OptionText(options?.Body, "body");
            string bundleId = "";
            if (apns != null)
            {
                string? candidate = apns.BundleId;
                if (candidate == null || candidate.Length > BundleIdLimit || !Protocol.FullMatch(BundleIdPattern, candidate))
                    throw new PushPayloadException(PushPayloadCode.InvalidOptions, "bundleId must be an app bundle ID");
                bundleId = candidate;
            }

            WebhookNotificationEvent notification;
            if (typed != null)
            {
                notification = typed;
            }
            else if (NotificationEvents.TryParse(element, out WebhookNotificationEvent? parsed, out string? problem))
            {
                notification = parsed;
            }
            else
            {
                throw new PushPayloadException(PushPayloadCode.InvalidEvent, "Invalid notification event: " + problem);
            }

            WebhookNotificationPreview? shown = options?.Preview != false && notification is WebhookMessageNotificationEvent message
                ? message.Preview
                : null;
            body ??= shown == null ? null : shown.Text + (shown.Truncated ? Ellipsis : "");
            long nowSeconds = (options?.Now ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds();
            return new Prepared(notification, new PushText(title, body), nowSeconds, bundleId);
        }

        private static string? OptionText(string? value, string field)
        {
            if (string.IsNullOrEmpty(value)) return null;
            if (JsonStrings.HasLoneSurrogate(value!))
                throw new PushPayloadException(PushPayloadCode.InvalidOptions, field + " must be a string without lone surrogates");
            return value;
        }

        private static long Seconds(string timestamp) =>
            NotificationEvents.EpochSeconds(timestamp) ??
            throw new InvalidOperationException("ConvoHop push: a validated timestamp didn't parse");

        private static bool MissedCall(WebhookCallCancelledNotificationEvent cancelled) =>
            cancelled.Reason == WebhookCallCancelReasons.Ended || cancelled.Reason == WebhookCallCancelReasons.Expired;

        // Unix seconds until which delivering the event is still useful.
        private static long Deadline(WebhookNotificationEvent notification)
        {
            if (notification is WebhookMessageNotificationEvent) return Seconds(notification.OccurredAt) + NoticeLifetime;
            if (notification is WebhookCallCancelledNotificationEvent cancelled && MissedCall(cancelled))
                return Seconds(notification.OccurredAt) + NoticeLifetime;
            return Seconds(((IWebhookRing)notification).ExpiresAt);
        }

        // The remaining lifetime, capped at 28 days; false when the event is stale.
        private static bool Lifetime(Prepared input, out long ttl, out long expiration)
        {
            ttl = Math.Min(Deadline(input.Notification) - input.NowSeconds, MaxLifetime);
            expiration = input.NowSeconds + ttl;
            return ttl > 0;
        }

        // Calls and cancellations collapse per ring: 32 lowercase hex digits, valid as an APNs collapse ID, FCM collapse key
        // and Web Push topic.
        private static string? CollapseKey(WebhookNotificationEvent notification) =>
            notification is IWebhookRing ring ? ring.AlertId.Replace("-", "") : null;

        private static IReadOnlyDictionary<string, string> ApnsHeaders(string type, string topic, long expiration, string? collapse) =>
            PushHeaders.Create(
                ("apns-push-type", type), ("apns-topic", topic), ("apns-priority", "10"),
                ("apns-expiration", expiration.ToString(CultureInfo.InvariantCulture)), ("apns-collapse-id", collapse));

        // UTF-8 bytes of the compact JSON serialization, the contract's canonical size.
        private static int Size(string json) => Encoding.UTF8.GetByteCount(json);

        // Builds the request, shortening the body and then the title while the measured payload exceeds the limit: each
        // becomes its longest code-point prefix that fits followed by an ellipsis, or just the ellipsis when no prefix fits.
        private static T Fit<T>(int limit, PushText input, Func<PushText, (T Request, int Size)> build)
        {
            PushText text = input;
            (T Request, int Size) built = build(text);
            for (int pass = 0; pass < 2; pass++)
            {
                bool body = pass == 0;
                string? original = body ? text.Body : text.Title;
                if (built.Size <= limit) return built.Request;
                if (original == null) continue;

                // A prefix of more than limit code points is more than limit bytes, so it never fits.
                string source = original;
                List<int> ends = CodePointEnds(source, limit + 1);
                PushText current = text;
                PushText Shortened(int count)
                {
                    string value = source.Substring(0, count == 0 ? 0 : ends[count - 1]) + Ellipsis;
                    return body ? new PushText(current.Title, value) : new PushText(value, current.Body);
                }

                int low = 0, high = ends.Count - 1, best = 0;
                while (low <= high)
                {
                    int middle = (low + high) / 2;
                    if (build(Shortened(middle)).Size <= limit)
                    {
                        best = middle;
                        low = middle + 1;
                    }
                    else
                    {
                        high = middle - 1;
                    }
                }

                text = Shortened(best);
                built = build(text);
            }

            if (built.Size > limit)
            {
                throw new InvalidOperationException(
                    "ConvoHop push: notification metadata exceeds " + limit.ToString(CultureInfo.InvariantCulture) + " bytes");
            }

            return built.Request;
        }

        // The end offset of each of the first limit code points. A lone surrogate counts as one, as in JavaScript.
        private static List<int> CodePointEnds(string value, int limit)
        {
            var ends = new List<int>();
            for (int index = 0; index < value.Length && ends.Count < limit;)
            {
                bool pair = char.IsHighSurrogate(value[index]) && index + 1 < value.Length && char.IsLowSurrogate(value[index + 1]);
                index += pair ? 2 : 1;
                ends.Add(index);
            }

            return ends;
        }

        private readonly struct PushText
        {
            internal PushText(string? title, string? body)
            {
                Title = title;
                Body = body;
            }

            internal string? Title { get; }

            internal string? Body { get; }
        }

        private sealed class Prepared
        {
            internal Prepared(WebhookNotificationEvent notification, PushText text, long nowSeconds, string bundleId)
            {
                Notification = notification;
                Text = text;
                NowSeconds = nowSeconds;
                BundleId = bundleId;
            }

            internal WebhookNotificationEvent Notification { get; }

            internal PushText Text { get; }

            internal long NowSeconds { get; }

            internal string BundleId { get; }
        }
    }
}
