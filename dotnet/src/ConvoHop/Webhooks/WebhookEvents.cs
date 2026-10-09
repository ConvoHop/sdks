namespace ConvoHop
{
    /// <summary>The webhook event types the authority sends. Compare them with <see cref="WebhookEvent.EventType"/>.</summary>
    public static class WebhookEventTypes
    {
        /// <summary>The <c>conversation.created</c> event type.</summary>
        public const string ConversationCreated = "conversation.created";

        /// <summary>The <c>conversation.updated</c> event type.</summary>
        public const string ConversationUpdated = "conversation.updated";

        /// <summary>The <c>member.added</c> event type.</summary>
        public const string MemberAdded = "member.added";

        /// <summary>The <c>member.roleChanged</c> event type.</summary>
        public const string MemberRoleChanged = "member.roleChanged";

        /// <summary>The <c>member.historyExpanded</c> event type.</summary>
        public const string MemberHistoryExpanded = "member.historyExpanded";

        /// <summary>The <c>member.removed</c> event type.</summary>
        public const string MemberRemoved = "member.removed";

        /// <summary>The <c>member.broadcastPermissionChanged</c> event type.</summary>
        public const string MemberBroadcastPermissionChanged = "member.broadcastPermissionChanged";

        /// <summary>The <c>message.created</c> event type.</summary>
        public const string MessageCreated = "message.created";

        /// <summary>The <c>message.edited</c> event type.</summary>
        public const string MessageEdited = "message.edited";

        /// <summary>The <c>message.deleted</c> event type.</summary>
        public const string MessageDeleted = "message.deleted";

        /// <summary>The <c>receipt.reported</c> event type.</summary>
        public const string ReceiptReported = "receipt.reported";

        /// <summary>The <c>live.started</c> event type.</summary>
        public const string LiveStarted = "live.started";

        /// <summary>The <c>live.participationChanged</c> event type.</summary>
        public const string LiveParticipationChanged = "live.participationChanged";

        /// <summary>The <c>live.alerted</c> event type.</summary>
        public const string LiveAlerted = "live.alerted";

        /// <summary>The <c>live.ready</c> event type.</summary>
        public const string LiveReady = "live.ready";

        /// <summary>The <c>live.connected</c> event type.</summary>
        public const string LiveConnected = "live.connected";

        /// <summary>The <c>live.ended</c> event type.</summary>
        public const string LiveEnded = "live.ended";

        /// <summary>
        /// <c>webhook.endpointDisabled</c>: one of the project's other webhook endpoints was disabled after repeated failures.
        /// </summary>
        public const string WebhookEndpointDisabled = "webhook.endpointDisabled";

        /// <summary><c>notification.message</c>: a message for the recipient.</summary>
        public const string NotificationMessage = "notification.message";

        /// <summary><c>notification.call</c>: an incoming call, one ring for the recipient.</summary>
        public const string NotificationCall = "notification.call";

        /// <summary><c>notification.callCancelled</c>: a ring that stopped for the recipient.</summary>
        public const string NotificationCallCancelled = "notification.callCancelled";
    }

    /// <summary>Known call media profiles. Unknown profiles pass through.</summary>
    public static class WebhookCallMediaProfiles
    {
        /// <summary>An audio call.</summary>
        public const string AudioOnly = "AUDIO_ONLY";

        /// <summary>A video call.</summary>
        public const string AudioVideo = "AUDIO_VIDEO";
    }

    /// <summary>
    /// Known reasons a ring stopped. Treat an unknown reason as stop ringing, without a missed-call alert.
    /// </summary>
    public static class WebhookCallCancelReasons
    {
        /// <summary>The recipient answered, on any device. Only stops the ringing.</summary>
        public const string Answered = "answered";

        /// <summary>The recipient declined, on any device. Only stops the ringing.</summary>
        public const string Declined = "declined";

        /// <summary>The call ended or stopped ringing before the recipient answered: a missed call.</summary>
        public const string Ended = "ended";

        /// <summary>Nobody answered by the ring's <c>expiresAt</c>: a missed call.</summary>
        public const string Expired = "expired";
    }

    /// <summary>The resource a webhook event is about.</summary>
    public sealed class WebhookSubjectRef
    {
        internal WebhookSubjectRef(string id, string kind)
        {
            Id = id;
            Kind = kind;
        }

        /// <summary>The resource's ID.</summary>
        public string Id { get; }

        /// <summary>The resource's kind, such as <c>message</c>, <c>liveSession</c> or <c>webhookEndpoint</c>.</summary>
        public string Kind { get; }
    }

    /// <summary>
    /// A verified delivery's metadata-only event. Fetch the resource through the API when you need its content. Match on
    /// the subclass, then on <see cref="EventType"/>.
    /// </summary>
    public abstract class WebhookEvent
    {
        private protected WebhookEvent(string eventId, string eventType, string occurredAt, string projectId, WebhookSubjectRef subjectRef)
        {
            EventId = eventId;
            EventType = eventType;
            OccurredAt = occurredAt;
            ProjectId = projectId;
            SubjectRef = subjectRef;
        }

        /// <summary>Whether this SDK knows the event. False only for <see cref="WebhookUnknownEvent"/>.</summary>
        public abstract bool Known { get; }

        /// <summary>The event's ID.</summary>
        public string EventId { get; }

        /// <summary>The event type, one of <see cref="WebhookEventTypes"/> unless the event is unknown.</summary>
        public string EventType { get; }

        /// <summary>When the event happened, as the authority sent it (RFC 3339).</summary>
        public string OccurredAt { get; }

        /// <summary>The project's ID.</summary>
        public string ProjectId { get; }

        /// <summary>The resource the event is about.</summary>
        public WebhookSubjectRef SubjectRef { get; }
    }

    /// <summary>A change to a conversation, member, message, receipt or call. <see cref="WebhookEvent.SubjectRef"/> names the resource.</summary>
    public sealed class WebhookResourceEvent : WebhookEvent
    {
        internal WebhookResourceEvent(string eventId, string eventType, string occurredAt, string projectId, WebhookSubjectRef subjectRef)
            : base(eventId, eventType, occurredAt, projectId, subjectRef)
        {
        }

        /// <inheritdoc/>
        public override bool Known => true;
    }

    /// <summary>
    /// One of the project's other webhook endpoints was disabled after repeated failures. <see cref="WebhookEvent.SubjectRef"/>
    /// names it, with kind <c>webhookEndpoint</c>.
    /// </summary>
    public sealed class WebhookEndpointDisabledEvent : WebhookEvent
    {
        internal WebhookEndpointDisabledEvent(string eventId, string occurredAt, string projectId, WebhookSubjectRef subjectRef)
            : base(eventId, WebhookEventTypes.WebhookEndpointDisabled, occurredAt, projectId, subjectRef)
        {
        }

        /// <inheritdoc/>
        public override bool Known => true;
    }

    /// <summary>
    /// An event this SDK does not know, including a <c>notification.*</c> event that doesn't match the push payload contract.
    /// Acknowledge it; it never makes <c>Webhooks.Verify</c> throw.
    /// </summary>
    public sealed class WebhookUnknownEvent : WebhookEvent
    {
        internal WebhookUnknownEvent(string eventId, string eventType, string occurredAt, string projectId, WebhookSubjectRef subjectRef)
            : base(eventId, eventType, occurredAt, projectId, subjectRef)
        {
        }

        /// <inheritdoc/>
        public override bool Known => false;
    }

    /// <summary>
    /// A per-recipient notification event, for your push notifications, and the input of <see cref="PushPayloads"/>. The
    /// contract is <c>spec/push-payload/</c>. Instances always match it.
    /// </summary>
    public abstract class WebhookNotificationEvent : WebhookEvent
    {
        private protected WebhookNotificationEvent(
            string eventId, string eventType, string occurredAt, string projectId, WebhookSubjectRef subjectRef,
            string recipientId, string conversationId, string senderId, bool connected)
            : base(eventId, eventType, occurredAt, projectId, subjectRef)
        {
            RecipientId = recipientId;
            ConversationId = conversationId;
            SenderId = senderId;
            Connected = connected;
        }

        /// <inheritdoc/>
        public override bool Known => true;

        /// <summary>The principal to notify. Each recipient gets its own event.</summary>
        public string RecipientId { get; }

        /// <summary>The conversation's ID.</summary>
        public string ConversationId { get; }

        /// <summary>The principal who sent the message or started the ringing.</summary>
        public string SenderId { get; }

        /// <summary>
        /// Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending
        /// policy: it isn't per device, and it can change before you send. The push builders ignore it.
        /// </summary>
        public bool Connected { get; }
    }

    /// <summary>The start of a message's text.</summary>
    public sealed class WebhookNotificationPreview
    {
        internal WebhookNotificationPreview(string text, bool truncated)
        {
            Text = text;
            Truncated = truncated;
        }

        /// <summary>1 to 512 Unicode code points.</summary>
        public string Text { get; }

        /// <summary>Whether the message text continues after <see cref="Text"/>.</summary>
        public bool Truncated { get; }
    }

    /// <summary>A message for the recipient: <c>notification.message</c>.</summary>
    public sealed class WebhookMessageNotificationEvent : WebhookNotificationEvent
    {
        internal WebhookMessageNotificationEvent(
            string eventId, string occurredAt, string projectId, string recipientId, string conversationId, string senderId,
            bool connected, string messageId, WebhookNotificationPreview? preview)
            : base(eventId, WebhookEventTypes.NotificationMessage, occurredAt, projectId, new WebhookSubjectRef(messageId, "message"),
                recipientId, conversationId, senderId, connected)
        {
            MessageId = messageId;
            Preview = preview;
        }

        /// <summary>The message's ID.</summary>
        public string MessageId { get; }

        /// <summary>
        /// The start of the message text. Present only when the project opts in to previews and the message has text.
        /// </summary>
        public WebhookNotificationPreview? Preview { get; }
    }

    // The fields calls and cancellations share, for the push builders.
    internal interface IWebhookRing
    {
        string LiveSessionId { get; }

        string AlertId { get; }

        string ExpiresAt { get; }

        string MediaProfile { get; }
    }

    /// <summary>An incoming call, one ring for the recipient: <c>notification.call</c>.</summary>
    public sealed class WebhookCallNotificationEvent : WebhookNotificationEvent, IWebhookRing
    {
        internal WebhookCallNotificationEvent(
            string eventId, string occurredAt, string projectId, string recipientId, string conversationId, string senderId,
            bool connected, string liveSessionId, string alertId, string expiresAt, string mediaProfile)
            : base(eventId, WebhookEventTypes.NotificationCall, occurredAt, projectId, new WebhookSubjectRef(liveSessionId, "liveSession"),
                recipientId, conversationId, senderId, connected)
        {
            LiveSessionId = liveSessionId;
            AlertId = alertId;
            ExpiresAt = expiresAt;
            MediaProfile = mediaProfile;
        }

        /// <summary>The live session's ID.</summary>
        public string LiveSessionId { get; }

        /// <summary>This ring for this recipient. A later ring of the same call has a new <c>AlertId</c>.</summary>
        public string AlertId { get; }

        /// <summary>When the ringing stops (RFC 3339).</summary>
        public string ExpiresAt { get; }

        /// <summary>The call's media profile, such as <see cref="WebhookCallMediaProfiles.AudioOnly"/>. Unknown profiles pass through.</summary>
        public string MediaProfile { get; }
    }

    /// <summary>
    /// A ring that stopped for the recipient: <c>notification.callCancelled</c>. Only recipients of the ring's
    /// <c>notification.call</c> get it.
    /// </summary>
    public sealed class WebhookCallCancelledNotificationEvent : WebhookNotificationEvent, IWebhookRing
    {
        internal WebhookCallCancelledNotificationEvent(
            string eventId, string occurredAt, string projectId, string recipientId, string conversationId, string senderId,
            bool connected, string liveSessionId, string alertId, string expiresAt, string mediaProfile, string reason)
            : base(eventId, WebhookEventTypes.NotificationCallCancelled, occurredAt, projectId,
                new WebhookSubjectRef(liveSessionId, "liveSession"), recipientId, conversationId, senderId, connected)
        {
            LiveSessionId = liveSessionId;
            AlertId = alertId;
            ExpiresAt = expiresAt;
            MediaProfile = mediaProfile;
            Reason = reason;
        }

        /// <summary>The live session's ID.</summary>
        public string LiveSessionId { get; }

        /// <summary>The <c>AlertId</c> of the ring that stopped.</summary>
        public string AlertId { get; }

        /// <summary>The stopped ring's original deadline (RFC 3339).</summary>
        public string ExpiresAt { get; }

        /// <summary>The call's media profile, such as <see cref="WebhookCallMediaProfiles.AudioOnly"/>. Unknown profiles pass through.</summary>
        public string MediaProfile { get; }

        /// <summary>
        /// Why the ring stopped, such as <see cref="WebhookCallCancelReasons.Answered"/>. <c>ended</c> and <c>expired</c> are
        /// missed calls. Treat an unknown reason as stop ringing, without a missed-call alert.
        /// </summary>
        public string Reason { get; }
    }

    /// <summary>A verified delivery's <c>webhook-id</c> and <c>webhook-timestamp</c>.</summary>
    public class WebhookSignature
    {
        internal WebhookSignature(string webhookId, long timestamp)
        {
            WebhookId = webhookId;
            Timestamp = timestamp;
        }

        /// <summary>The delivery's <c>webhook-id</c>. De-duplicate deliveries on it.</summary>
        public string WebhookId { get; }

        /// <summary>The delivery's <c>webhook-timestamp</c>, in Unix seconds.</summary>
        public long Timestamp { get; }
    }

    /// <summary>
    /// A verified delivery: its <c>webhook-id</c>, <c>webhook-timestamp</c> and event. (<c>ConvoHop.Models.WebhookDelivery</c> is
    /// the management API's delivery record.)
    /// </summary>
    public sealed class VerifiedWebhookDelivery : WebhookSignature
    {
        internal VerifiedWebhookDelivery(string webhookId, long timestamp, WebhookEvent @event)
            : base(webhookId, timestamp)
        {
            Event = @event;
        }

        /// <summary>The delivery's event. Match on its subclass.</summary>
        public WebhookEvent Event { get; }
    }
}
