using System.Text.Json;
using ConvoHop.Generated;

namespace ConvoHop.Internal
{
    // Validates an authority payload against the generated output shapes before any typed model is built from it.
    internal static class OutputValidator
    {
        private const int MaxDepth = 16;
        private const int MaxListLength = 100;

        // A null value means the field is absent; a JSON null is present.
        internal static void Validate(JsonElement? value, string type, int depth = 0)
        {
            if (depth > MaxDepth) throw new ProtocolFormatException("GraphQL response exceeds its depth bound");
            bool required = type.EndsWith("!", System.StringComparison.Ordinal);
            if (required) type = type.Substring(0, type.Length - 1);
            if (value == null || value.Value.ValueKind == JsonValueKind.Null)
            {
                if (required || value == null) throw new ProtocolFormatException("Missing GraphQL response field: " + type);
                return;
            }

            JsonElement element = value.Value;
            if (type.StartsWith("[", System.StringComparison.Ordinal))
            {
                if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() > MaxListLength)
                    throw new ProtocolFormatException("Invalid bounded GraphQL list");
                string itemType = type.Substring(1, type.Length - 2);
                foreach (JsonElement item in element.EnumerateArray()) Validate(item, itemType, depth + 1);
                return;
            }

            if (!GeneratedSchema.Types.TryGetValue(type, out TypeShape? shape))
                throw new ProtocolFormatException("Unknown generated output type: " + type);
            switch (shape.Kind)
            {
                case TypeShapeKind.Object:
                    RequireObject(element);
                    if (type == "RetainedResult")
                    {
                        int present = 0;
                        foreach (JsonProperty property in element.EnumerateObject())
                        {
                            if (property.Value.ValueKind != JsonValueKind.Null) present++;
                        }

                        if (present != 1) throw new ProtocolFormatException("Retained receipt requires exactly one typed result");
                    }

                    foreach (FieldShape field in shape.Fields)
                    {
                        Validate(element.TryGetProperty(field.Name, out JsonElement child) ? child : (JsonElement?)null, field.Type,
                            depth + 1);
                    }

                    break;
                case TypeShapeKind.Enum:
                    if (element.ValueKind != JsonValueKind.String || !shape.Values.Contains(CanonicalJson.ReadString(element)))
                        throw new ProtocolFormatException("Unknown " + type);
                    break;
                default:
                    ValidateScalar(element, type, shape);
                    break;
            }
        }

        internal static void RequireObject(JsonElement element)
        {
            if (element.ValueKind != JsonValueKind.Object) throw new ProtocolFormatException("Expected a GraphQL protocol object");
        }

        private static void ValidateScalar(JsonElement element, string type, TypeShape shape)
        {
            switch (shape.Representation)
            {
                case "object":
                    RequireObject(element);
                    break;
                case "boolean":
                    if (element.ValueKind != JsonValueKind.True && element.ValueKind != JsonValueKind.False)
                        throw new ProtocolFormatException("Expected GraphQL boolean");
                    break;
                case "integer":
                    if (element.ValueKind != JsonValueKind.Number || !element.TryGetInt32(out int number) ||
                        (shape.Minimum != null && number < shape.Minimum.Value) || (shape.Maximum != null && number > shape.Maximum.Value))
                    {
                        throw new ProtocolFormatException("Expected a bounded GraphQL integer");
                    }

                    break;
                default:
                    if (element.ValueKind != JsonValueKind.String) throw new ProtocolFormatException("Expected GraphQL " + type + " string");
                    if (!shape.AcceptsString(CanonicalJson.ReadString(element))) throw new ProtocolFormatException("Invalid GraphQL " + type);
                    break;
            }
        }
    }
}
