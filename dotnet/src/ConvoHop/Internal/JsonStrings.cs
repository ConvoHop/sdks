using System;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace ConvoHop.Internal
{
    // Reads JSON strings the way JSON.parse does. GetString refuses escaped lone surrogates, which JSON.parse keeps, so
    // those strings are unescaped from the raw token instead.
    internal static class JsonStrings
    {
        internal static bool TryRead(JsonElement element, [NotNullWhen(true)] out string? value)
        {
            value = null;
            if (element.ValueKind != JsonValueKind.String) return false;
            try
            {
                value = element.GetString()!;
                return true;
            }
            catch (InvalidOperationException)
            {
            }

            string raw;
            try
            {
                raw = element.GetRawText();
            }
            catch (InvalidOperationException)
            {
                return false;
            }

            var builder = new StringBuilder(raw.Length);
            for (int index = 1; index < raw.Length - 1; index++)
            {
                char current = raw[index];
                if (current != '\\')
                {
                    builder.Append(current);
                    continue;
                }

                char escape = raw[++index];
                switch (escape)
                {
                    case 'b': builder.Append('\b'); break;
                    case 'f': builder.Append('\f'); break;
                    case 'n': builder.Append('\n'); break;
                    case 'r': builder.Append('\r'); break;
                    case 't': builder.Append('\t'); break;
                    case 'u':
                        builder.Append((char)int.Parse(raw.Substring(index + 1, 4), NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture));
                        index += 4;
                        break;
                    default: builder.Append(escape); break;
                }
            }

            value = builder.ToString();
            return true;
        }

        internal static string? Property(JsonElement source, string name) =>
            source.ValueKind == JsonValueKind.Object && source.TryGetProperty(name, out JsonElement child) &&
            TryRead(child, out string? value)
                ? value
                : null;

        internal static bool HasLoneSurrogate(string value)
        {
            for (int index = 0; index < value.Length; index++)
            {
                char current = value[index];
                if (char.IsHighSurrogate(current) && index + 1 < value.Length && char.IsLowSurrogate(value[index + 1])) index++;
                else if (char.IsSurrogate(current)) return true;
            }

            return false;
        }

        // Unicode code points, counting a lone surrogate as one, like iterating an ECMAScript string.
        internal static int CodePointCount(string value)
        {
            int count = 0;
            for (int index = 0; index < value.Length; index++, count++)
            {
                if (char.IsHighSurrogate(value[index]) && index + 1 < value.Length && char.IsLowSurrogate(value[index + 1])) index++;
            }

            return count;
        }
    }
}
