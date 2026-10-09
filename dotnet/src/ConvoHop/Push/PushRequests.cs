using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using ConvoHop.Internal;

namespace ConvoHop
{
    /// <summary>
    /// The <c>convohop</c> metadata every payload carries for your app: the event's fields without <c>subjectRef</c>,
    /// <c>connected</c> and <c>preview</c>. APNs VoIP, FCM and Web Push payloads also carry the visible title and body here,
    /// because they have no visible alert of their own.
    /// </summary>
    public sealed class PushData
    {
        private readonly string _json;

        internal PushData(WebhookNotificationEvent notification, string? title, string? body)
        {
            EventId = notification.EventId;
            EventType = notification.EventType;
            OccurredAt = notification.OccurredAt;
            ProjectId = notification.ProjectId;
            RecipientId = notification.RecipientId;
            ConversationId = notification.ConversationId;
            SenderId = notification.SenderId;
            if (notification is WebhookMessageNotificationEvent message) MessageId = message.MessageId;
            if (notification is IWebhookRing ring)
            {
                LiveSessionId = ring.LiveSessionId;
                AlertId = ring.AlertId;
                ExpiresAt = ring.ExpiresAt;
                MediaProfile = ring.MediaProfile;
            }

            if (notification is WebhookCallCancelledNotificationEvent cancelled) Reason = cancelled.Reason;
            Title = title;
            Body = body;
            _json = new JsonObjectWriter()
                .String("eventId", EventId).String("eventType", EventType).String("occurredAt", OccurredAt)
                .String("projectId", ProjectId).String("recipientId", RecipientId).String("conversationId", ConversationId)
                .String("senderId", SenderId).String("messageId", MessageId).String("liveSessionId", LiveSessionId)
                .String("alertId", AlertId).String("expiresAt", ExpiresAt).String("mediaProfile", MediaProfile)
                .String("reason", Reason).String("title", Title).String("body", Body)
                .Close();
        }

        /// <summary>The event's ID.</summary>
        public string EventId { get; }

        /// <summary>The event's type, such as <see cref="WebhookEventTypes.NotificationMessage"/>.</summary>
        public string EventType { get; }

        /// <summary>When the event happened (RFC 3339).</summary>
        public string OccurredAt { get; }

        /// <summary>The project's ID.</summary>
        public string ProjectId { get; }

        /// <summary>The principal to notify.</summary>
        public string RecipientId { get; }

        /// <summary>The conversation's ID.</summary>
        public string ConversationId { get; }

        /// <summary>The principal who sent the message or started the ringing.</summary>
        public string SenderId { get; }

        /// <summary>Messages: the message's ID.</summary>
        public string? MessageId { get; }

        /// <summary>Calls and cancellations: the live session's ID.</summary>
        public string? LiveSessionId { get; }

        /// <summary>Calls and cancellations: the ring's ID.</summary>
        public string? AlertId { get; }

        /// <summary>Calls and cancellations: when the ringing stops (RFC 3339).</summary>
        public string? ExpiresAt { get; }

        /// <summary>Calls and cancellations: the call's media profile.</summary>
        public string? MediaProfile { get; }

        /// <summary>Cancellations: why the ring stopped.</summary>
        public string? Reason { get; }

        /// <summary>APNs VoIP, FCM and Web Push: the visible title, possibly shortened to fit.</summary>
        public string? Title { get; }

        /// <summary>APNs VoIP, FCM and Web Push: the visible body, possibly shortened to fit.</summary>
        public string? Body { get; }

        /// <summary>The compact JSON your app receives, with the fields in the contract's order.</summary>
        /// <returns>The JSON text.</returns>
        public string ToJson() => _json;
    }

    /// <summary>An APNs alert's visible text.</summary>
    public sealed class ApnsAlertContent
    {
        internal ApnsAlertContent(string? title, string? body, string? locKey)
        {
            Title = title;
            Body = body;
            LocKey = locKey;
        }

        /// <summary>The visible title, possibly shortened to fit.</summary>
        public string? Title { get; }

        /// <summary>The visible body, possibly shortened to fit.</summary>
        public string? Body { get; }

        /// <summary>
        /// Present when there is no body: <c>CONVOHOP_MESSAGE</c>, <c>CONVOHOP_CALL</c> or <c>CONVOHOP_MISSED_CALL</c>, for
        /// your app's localized text. The JSON key is <c>loc-key</c>.
        /// </summary>
        public string? LocKey { get; }
    }

    /// <summary>
    /// An APNs alert. Your APNs client adds <c>authorization</c> to <see cref="Headers"/> and sends
    /// <see cref="PayloadJson"/> to <c>/3/device/&lt;token&gt;</c>.
    /// </summary>
    public sealed class ApnsAlertRequest
    {
        internal ApnsAlertRequest(IReadOnlyDictionary<string, string> headers, ApnsAlertContent alert, string threadId, PushData metadata)
        {
            Headers = headers;
            Alert = alert;
            ThreadId = threadId;
            Metadata = metadata;
            string content = new JsonObjectWriter()
                .String("title", alert.Title).String("body", alert.Body).String("loc-key", alert.LocKey).Close();
            string aps = new JsonObjectWriter()
                .Raw("alert", content).String("sound", Sound).Raw("mutable-content", "1").String("thread-id", threadId).Close();
            PayloadJson = new JsonObjectWriter().Raw("aps", aps).Raw("convohop", metadata.ToJson()).Close();
        }

        /// <summary>
        /// HTTP/2 headers in order: <c>apns-push-type</c> <c>alert</c>, <c>apns-topic</c> (the bundle ID),
        /// <c>apns-priority</c> <c>10</c>, <c>apns-expiration</c> (Unix seconds after which APNs stops trying) and, for
        /// calls and missed calls, <c>apns-collapse-id</c>, so a missed-call alert replaces the ring's incoming-call alert.
        /// </summary>
        public IReadOnlyDictionary<string, string> Headers { get; }

        /// <summary>The visible alert: <c>aps.alert</c>.</summary>
        public ApnsAlertContent Alert { get; }

        /// <summary>The alert sound, <c>default</c>: <c>aps.sound</c>.</summary>
        public string Sound => "default";

        /// <summary>
        /// Always <c>true</c> (<c>aps.mutable-content</c> 1), so a notification service extension can rewrite the alert.
        /// </summary>
        public bool MutableContent => true;

        /// <summary>The conversation's ID, grouping its notifications: <c>aps.thread-id</c>.</summary>
        public string ThreadId { get; }

        /// <summary>The <c>convohop</c> metadata, without a title or body.</summary>
        public PushData Metadata { get; }

        /// <summary>The compact JSON payload, at most 4096 UTF-8 bytes.</summary>
        public string PayloadJson { get; }
    }

    /// <summary>
    /// An APNs VoIP push. Your APNs client adds <c>authorization</c> to <see cref="Headers"/> and sends
    /// <see cref="PayloadJson"/> to <c>/3/device/&lt;token&gt;</c> with your app's VoIP token.
    /// </summary>
    public sealed class ApnsVoipRequest
    {
        internal ApnsVoipRequest(IReadOnlyDictionary<string, string> headers, PushData metadata)
        {
            Headers = headers;
            Metadata = metadata;
            PayloadJson = new JsonObjectWriter().Raw("convohop", metadata.ToJson()).Close();
        }

        /// <summary>
        /// HTTP/2 headers in order: <c>apns-push-type</c> <c>voip</c>, <c>apns-topic</c> (<c>&lt;bundleId&gt;.voip</c>),
        /// <c>apns-priority</c> <c>10</c> and <c>apns-expiration</c> (Unix seconds after which APNs stops trying).
        /// </summary>
        public IReadOnlyDictionary<string, string> Headers { get; }

        /// <summary>The <c>convohop</c> metadata, with the title and body.</summary>
        public PushData Metadata { get; }

        /// <summary>The compact JSON payload, at most 5120 UTF-8 bytes.</summary>
        public string PayloadJson { get; }
    }

    /// <summary>
    /// An FCM data message without a target. For the FCM HTTP v1 REST <c>messages:send</c>, add <c>token</c> or <c>fid</c> to
    /// <see cref="MessageJson"/>: the device's registration token by default, or its Firebase Installation ID (FID) when the
    /// app's manifest sets <c>firebase_messaging_installation_id_enabled</c>. Firebase Admin SDKs take <see cref="Data"/> and
    /// the <see cref="Android"/> values in their own form, such as a <c>TimeSpan</c> TTL. The .NET one, FirebaseAdmin, sends
    /// to a FID from 3.6.0.
    /// </summary>
    public sealed class FcmRequest
    {
        internal FcmRequest(PushData metadata, FcmAndroidConfig android)
        {
            Metadata = metadata;
            Android = android;
            Data = new ReadOnlyDictionary<string, string>(
                new Dictionary<string, string>(StringComparer.Ordinal) { ["convohop"] = metadata.ToJson() });
            DataJson = new JsonObjectWriter().String("convohop", metadata.ToJson()).Close();
            string config = new JsonObjectWriter()
                .String("priority", android.Priority).String("ttl", android.Ttl).String("collapse_key", android.CollapseKey).Close();
            MessageJson = new JsonObjectWriter().Raw("data", DataJson).Raw("android", config).Close();
        }

        /// <summary>The message's <c>data</c>: <c>convohop</c>, the metadata as JSON, with the title and body.</summary>
        public IReadOnlyDictionary<string, string> Data { get; }

        /// <summary>The message's <c>android</c> options.</summary>
        public FcmAndroidConfig Android { get; }

        /// <summary>The <c>convohop</c> metadata, with the title and body.</summary>
        public PushData Metadata { get; }

        /// <summary>The REST message as compact JSON, without a target: add <c>token</c> or <c>fid</c>. <c>data</c> is at most 4096 UTF-8 bytes as JSON.</summary>
        public string MessageJson { get; }

        internal string DataJson { get; }
    }

    /// <summary>An FCM message's <c>android</c> options.</summary>
    public sealed class FcmAndroidConfig
    {
        internal FcmAndroidConfig(long ttlSeconds, string? collapseKey)
        {
            TtlSeconds = ttlSeconds;
            Ttl = ttlSeconds.ToString(CultureInfo.InvariantCulture) + "s";
            CollapseKey = collapseKey;
        }

        /// <summary>The delivery priority, <c>HIGH</c>.</summary>
        public string Priority => "HIGH";

        /// <summary>How long FCM keeps trying, in the REST form: whole seconds followed by <c>s</c>.</summary>
        public string Ttl { get; }

        /// <summary>How long FCM keeps trying, in seconds.</summary>
        public long TtlSeconds { get; }

        /// <summary>Calls and cancellations: the ring's collapse key (<c>collapse_key</c>).</summary>
        public string? CollapseKey { get; }
    }

    /// <summary>
    /// A Web Push message. Your Web Push library encrypts <see cref="PayloadJson"/> (RFC 8291) and signs (VAPID).
    /// </summary>
    public sealed class WebPushRequest
    {
        internal WebPushRequest(IReadOnlyDictionary<string, string> headers, long ttlSeconds, string urgency, string? topic, PushData metadata)
        {
            Headers = headers;
            TtlSeconds = ttlSeconds;
            Urgency = urgency;
            Topic = topic;
            Metadata = metadata;
            PayloadJson = new JsonObjectWriter().Raw("convohop", metadata.ToJson()).Close();
        }

        /// <summary>
        /// RFC 8030 headers: <c>TTL</c>, <c>Urgency</c> and, for calls and cancellations, <c>Topic</c>. Where your library sets
        /// them from its own options, pass <see cref="TtlSeconds"/>, <see cref="Urgency"/> and <see cref="Topic"/> there, or
        /// its defaults replace them.
        /// </summary>
        public IReadOnlyDictionary<string, string> Headers { get; }

        /// <summary>How long the push service keeps trying, in seconds: the <c>TTL</c> header.</summary>
        public long TtlSeconds { get; }

        /// <summary><c>normal</c> for messages and <c>high</c> for calls and cancellations: the <c>Urgency</c> header.</summary>
        public string Urgency { get; }

        /// <summary>Calls and cancellations: the ring's collapse key, the <c>Topic</c> header.</summary>
        public string? Topic { get; }

        /// <summary>The <c>convohop</c> metadata, with the title and body.</summary>
        public PushData Metadata { get; }

        /// <summary>The compact JSON payload, at most 3993 UTF-8 bytes, the RFC 8291 plaintext limit.</summary>
        public string PayloadJson { get; }
    }

    internal static class PushHeaders
    {
        // Header names are case-insensitive; enumeration keeps the contract's order.
        internal static IReadOnlyDictionary<string, string> Create(params (string Name, string? Value)[] entries)
        {
            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach ((string name, string? value) in entries)
            {
                if (value != null) headers.Add(name, value);
            }

            return new ReadOnlyDictionary<string, string>(headers);
        }
    }
}
