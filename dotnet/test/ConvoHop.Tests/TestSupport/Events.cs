using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.Json.Nodes;

namespace ConvoHop.Tests.TestSupport
{
    /// <summary>Verified webhook events for tests, and their JSON form under the contract's field names.</summary>
    internal static class Events
    {
        private static readonly string Secret = WebhookSigner.NewSecret();

        /// <summary>Signs <paramref name="body"/> now and verifies it with the SDK.</summary>
        internal static VerifiedWebhookDelivery Deliver(string body)
        {
            DateTimeOffset now = DateTimeOffset.UtcNow;
            string id = Fixtures.NewId(), stamp = now.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
            var headers = new Dictionary<string, string>
            {
                ["webhook-id"] = id,
                ["webhook-timestamp"] = stamp,
                ["webhook-signature"] = WebhookSigner.Sign(Secret, id, stamp, Encoding.UTF8.GetBytes(body)),
            };
            return Webhooks.Verify(WebhookHeaders.From(headers), body, new[] { Secret }, now: now);
        }

        /// <summary>The SDK's typed event for the JSON event <paramref name="value"/>.</summary>
        internal static WebhookEvent Parse(JsonNode value) => Deliver(Js.Stringify(value)).Event;

        /// <summary>The event as the TypeScript SDK returns it: contract field names, no absent optional fields.</summary>
        internal static JsonObject ToJson(WebhookEvent value)
        {
            var json = new JsonObject
            {
                ["known"] = value.Known,
                ["eventId"] = value.EventId,
                ["eventType"] = value.EventType,
                ["occurredAt"] = value.OccurredAt,
                ["projectId"] = value.ProjectId,
                ["subjectRef"] = new JsonObject { ["id"] = value.SubjectRef.Id, ["kind"] = value.SubjectRef.Kind },
            };
            if (value is WebhookNotificationEvent notification)
            {
                json["recipientId"] = notification.RecipientId;
                json["conversationId"] = notification.ConversationId;
                json["senderId"] = notification.SenderId;
                json["connected"] = notification.Connected;
            }

            switch (value)
            {
                case WebhookMessageNotificationEvent message:
                    json["messageId"] = message.MessageId;
                    if (message.Preview != null)
                        json["preview"] = new JsonObject { ["text"] = message.Preview.Text, ["truncated"] = message.Preview.Truncated };
                    break;
                case WebhookCallNotificationEvent call:
                    Ring(json, call.LiveSessionId, call.AlertId, call.ExpiresAt, call.MediaProfile);
                    break;
                case WebhookCallCancelledNotificationEvent cancelled:
                    Ring(json, cancelled.LiveSessionId, cancelled.AlertId, cancelled.ExpiresAt, cancelled.MediaProfile);
                    json["reason"] = cancelled.Reason;
                    break;
            }

            return json;
        }

        private static void Ring(JsonObject json, string liveSessionId, string alertId, string expiresAt, string mediaProfile)
        {
            json["liveSessionId"] = liveSessionId;
            json["alertId"] = alertId;
            json["expiresAt"] = expiresAt;
            json["mediaProfile"] = mediaProfile;
        }
    }
}
