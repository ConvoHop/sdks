using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;

namespace Examples.Tests;

public sealed record Delivery(string WebhookId, IReadOnlyDictionary<string, string> Headers, byte[] Body)
{
    // The request as ASP.NET Core passes it to the endpoint.
    public HttpRequest ToRequest()
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        foreach (KeyValuePair<string, string> header in Headers) context.Request.Headers[header.Key] = header.Value;
        context.Request.Body = new MemoryStream(Body);
        return context.Request;
    }
}

// Signs deliveries the way ConvoHop does: Standard Webhooks, HMAC-SHA256 over "id.timestamp.body".
internal static class Deliveries
{
    public static string NewSecret() => "whsec_" + Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    // Signs the event's wire JSON. body replaces what's sent, to tamper with a delivery.
    public static Delivery Sign(JsonNode @event, string secret, string? body = null)
    {
        string signed = WireJson(@event);
        string webhookId = $"msg_{Guid.NewGuid()}";
        string timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        byte[] key = Convert.FromBase64String(secret.Substring("whsec_".Length));
        byte[] signature = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes($"{webhookId}.{timestamp}.{signed}"));
        var headers = new Dictionary<string, string>
        {
            ["content-type"] = "application/json",
            ["webhook-id"] = webhookId,
            ["webhook-timestamp"] = timestamp,
            ["webhook-signature"] = "v1," + Convert.ToBase64String(signature),
        };
        return new Delivery(webhookId, headers, Encoding.UTF8.GetBytes(body ?? signed));
    }

    public static JsonObject Envelope(string eventType, string kind, string subjectId, string projectId = "project-1") => new()
    {
        ["eventId"] = Guid.NewGuid().ToString(),
        ["eventType"] = eventType,
        ["occurredAt"] = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture),
        ["projectId"] = projectId,
        ["subjectRef"] = new JsonObject { ["kind"] = kind, ["id"] = subjectId },
    };

    // A body as ConvoHop sends it: compact JSON that escapes only quotes, backslashes and control characters, and
    // leaves other text as UTF-8. System.Text.Json's encoders escape more, which can push a large event past the limit.
    public static string WireJson(JsonNode? node)
    {
        var builder = new StringBuilder();
        Write(builder, node);
        return builder.ToString();
    }

    private static void Write(StringBuilder builder, JsonNode? node)
    {
        switch (node)
        {
            case null:
                builder.Append("null");
                break;
            case JsonObject members:
                builder.Append('{');
                string separator = "";
                foreach (KeyValuePair<string, JsonNode?> member in members)
                {
                    builder.Append(separator);
                    WriteString(builder, member.Key);
                    builder.Append(':');
                    Write(builder, member.Value);
                    separator = ",";
                }
                builder.Append('}');
                break;
            case JsonArray items:
                builder.Append('[');
                for (int index = 0; index < items.Count; index++)
                {
                    if (index > 0) builder.Append(',');
                    Write(builder, items[index]);
                }
                builder.Append(']');
                break;
            case JsonValue value when value.GetValueKind() == JsonValueKind.String:
                WriteString(builder, value.GetValue<string>());
                break;
            default:
                builder.Append(node.ToJsonString()); // Numbers as written, true and false.
                break;
        }
    }

    private static void WriteString(StringBuilder builder, string text)
    {
        builder.Append('"');
        foreach (char character in text)
        {
            switch (character)
            {
                case '"': builder.Append("\\\""); break;
                case '\\': builder.Append("\\\\"); break;
                case '\b': builder.Append("\\b"); break;
                case '\f': builder.Append("\\f"); break;
                case '\n': builder.Append("\\n"); break;
                case '\r': builder.Append("\\r"); break;
                case '\t': builder.Append("\\t"); break;
                case < ' ': builder.Append("\\u").Append(((int)character).ToString("x4", CultureInfo.InvariantCulture)); break;
                default: builder.Append(character); break;
            }
        }
        builder.Append('"');
    }
}
