using System;
using System.Text.Json;

namespace ConvoHop.Internal
{
    internal static class JsonParsing
    {
        // Duplicate keys are rejected: JSON.parse would silently keep the last one.
        internal static readonly JsonDocumentOptions Options = new JsonDocumentOptions
        {
            MaxDepth = 256,
            AllowDuplicateProperties = false,
        };

        internal static JsonElement Parse(string text)
        {
            try
            {
                using (JsonDocument document = JsonDocument.Parse(text, Options))
                {
                    return document.RootElement.Clone();
                }
            }
            catch (InvalidOperationException error)
            {
                // The duplicate check unescapes property names and throws this for an escaped lone surrogate.
                throw new JsonException("A JSON property name has an escaped lone surrogate", error);
            }
        }

        internal static JsonElement? Property(JsonElement value, string name) =>
            value.ValueKind == JsonValueKind.Object && value.TryGetProperty(name, out JsonElement child) ? child : (JsonElement?)null;

        internal static string? OptionalString(JsonElement value, string name)
        {
            JsonElement? child = Property(value, name);
            return child != null && child.Value.ValueKind == JsonValueKind.String ? CanonicalJson.ReadString(child.Value) : null;
        }
    }
}
