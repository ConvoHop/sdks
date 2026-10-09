using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ConvoHop.Internal
{
    // Canonical JSON: object keys in ordinal order, no insignificant whitespace, and strings and numbers written exactly as
    // ECMAScript JSON.stringify writes them. Request bodies, idempotency identities and payload fingerprints use it.
    internal static class CanonicalJson
    {
        private const int MaxDepth = 64;
        private const string Hex = "0123456789abcdef";

        internal static string Serialize(object? value)
        {
            var builder = new StringBuilder();
            Write(builder, value, 0);
            return builder.ToString();
        }

        internal static string Fingerprint(object? value)
        {
            byte[] digest;
            using (SHA256 sha = SHA256.Create())
            {
                digest = sha.ComputeHash(new UTF8Encoding(false, true).GetBytes(Serialize(value)));
            }

            var builder = new StringBuilder("sha256:", 7 + digest.Length * 2);
            foreach (byte item in digest) builder.Append(Hex[item >> 4]).Append(Hex[item & 15]);
            return builder.ToString();
        }

        internal static void WriteString(StringBuilder builder, string value)
        {
            builder.Append('"');
            for (int index = 0; index < value.Length; index++)
            {
                char current = value[index];
                switch (current)
                {
                    case '"': builder.Append("\\\""); break;
                    case '\\': builder.Append("\\\\"); break;
                    case '\b': builder.Append("\\b"); break;
                    case '\f': builder.Append("\\f"); break;
                    case '\n': builder.Append("\\n"); break;
                    case '\r': builder.Append("\\r"); break;
                    case '\t': builder.Append("\\t"); break;
                    default:
                        if (current < 0x20)
                        {
                            AppendEscape(builder, current);
                        }
                        else if (char.IsHighSurrogate(current) && index + 1 < value.Length && char.IsLowSurrogate(value[index + 1]))
                        {
                            builder.Append(current).Append(value[++index]);
                        }
                        else if (char.IsSurrogate(current))
                        {
                            AppendEscape(builder, current);
                        }
                        else
                        {
                            builder.Append(current);
                        }

                        break;
                }
            }

            builder.Append('"');
        }

        // ECMAScript Number::toString for a finite double.
        internal static string FormatNumber(double value)
        {
            if (double.IsNaN(value) || double.IsInfinity(value)) throw new ProtocolFormatException("Unsafe protocol number");
            if (value == 0) return "0";
            if (Math.Abs(value) <= Protocol.MaxSafeInteger && Math.Floor(value) == value)
                return ((long)value).ToString(CultureInfo.InvariantCulture);
            bool negative = value < 0;
            ShortestDigits(Math.Abs(value), out string digits, out int exponent);
            int k = digits.Length, n = exponent;
            string text;
            if (k <= n && n <= 21) text = digits + new string('0', n - k);
            else if (0 < n && n <= 21) text = digits.Substring(0, n) + "." + digits.Substring(n);
            else if (-6 < n && n <= 0) text = "0." + new string('0', -n) + digits;
            else
            {
                int e = n - 1;
                string suffix = "e" + (e < 0 ? "-" : "+") + Math.Abs(e).ToString(CultureInfo.InvariantCulture);
                text = k == 1 ? digits + suffix : digits.Substring(0, 1) + "." + digits.Substring(1) + suffix;
            }

            return negative ? "-" + text : text;
        }

        private static void Write(StringBuilder builder, object? value, int depth)
        {
            if (depth > MaxDepth) throw new ProtocolFormatException("JSON payload exceeds its depth bound");
            switch (value)
            {
                case null:
                    builder.Append("null");
                    break;
                case JsonElement element:
                    WriteElement(builder, element, depth);
                    break;
                case string text:
                    WriteString(builder, text);
                    break;
                case bool flag:
                    builder.Append(flag ? "true" : "false");
                    break;
                case int number:
                    builder.Append(number.ToString(CultureInfo.InvariantCulture));
                    break;
                case long number:
                    if (number > Protocol.MaxSafeInteger || number < -Protocol.MaxSafeInteger)
                        throw new ProtocolFormatException("Unsafe protocol number");
                    builder.Append(number.ToString(CultureInfo.InvariantCulture));
                    break;
                case IReadOnlyDictionary<string, object?> map:
                    WriteObject(builder, map, depth);
                    break;
                case IReadOnlyList<object?> list:
                    builder.Append('[');
                    for (int index = 0; index < list.Count; index++)
                    {
                        if (index > 0) builder.Append(',');
                        Write(builder, list[index], depth + 1);
                    }

                    builder.Append(']');
                    break;
                default:
                    throw new ProtocolFormatException("Unsupported JSON payload value");
            }
        }

        private static void WriteObject(StringBuilder builder, IReadOnlyDictionary<string, object?> map, int depth)
        {
            var keys = new List<string>(map.Keys);
            keys.Sort(string.CompareOrdinal);
            builder.Append('{');
            for (int index = 0; index < keys.Count; index++)
            {
                if (index > 0) builder.Append(',');
                WriteString(builder, keys[index]);
                builder.Append(':');
                Write(builder, map[keys[index]], depth + 1);
            }

            builder.Append('}');
        }

        private static void WriteElement(StringBuilder builder, JsonElement element, int depth)
        {
            if (depth > MaxDepth) throw new ProtocolFormatException("JSON payload exceeds its depth bound");
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    var properties = new List<KeyValuePair<string, JsonElement>>();
                    var names = new HashSet<string>(StringComparer.Ordinal);
                    foreach (JsonProperty property in element.EnumerateObject())
                    {
                        string name = PropertyName(property);
                        if (!names.Add(name)) throw new ProtocolFormatException("Duplicate JSON object key");
                        properties.Add(new KeyValuePair<string, JsonElement>(name, property.Value));
                    }

                    properties.Sort((left, right) => string.CompareOrdinal(left.Key, right.Key));
                    builder.Append('{');
                    for (int index = 0; index < properties.Count; index++)
                    {
                        if (index > 0) builder.Append(',');
                        WriteString(builder, properties[index].Key);
                        builder.Append(':');
                        WriteElement(builder, properties[index].Value, depth + 1);
                    }

                    builder.Append('}');
                    break;
                case JsonValueKind.Array:
                    builder.Append('[');
                    bool first = true;
                    foreach (JsonElement item in element.EnumerateArray())
                    {
                        if (!first) builder.Append(',');
                        first = false;
                        WriteElement(builder, item, depth + 1);
                    }

                    builder.Append(']');
                    break;
                case JsonValueKind.String:
                    WriteString(builder, ReadString(element));
                    break;
                case JsonValueKind.Number:
                    builder.Append(FormatElementNumber(element));
                    break;
                case JsonValueKind.True:
                    builder.Append("true");
                    break;
                case JsonValueKind.False:
                    builder.Append("false");
                    break;
                case JsonValueKind.Null:
                    builder.Append("null");
                    break;
                default:
                    throw new ProtocolFormatException("JSON payload cannot contain undefined values");
            }
        }

        private static string FormatElementNumber(JsonElement element)
        {
            if (element.TryGetInt64(out long integer))
            {
                if (integer > Protocol.MaxSafeInteger || integer < -Protocol.MaxSafeInteger)
                    throw new ProtocolFormatException("Unsafe protocol number");
                return integer.ToString(CultureInfo.InvariantCulture);
            }

            if (!element.TryGetDouble(out double value) || double.IsNaN(value) || double.IsInfinity(value) ||
                Math.Abs(value) > Protocol.MaxSafeInteger)
            {
                throw new ProtocolFormatException("Unsafe protocol number");
            }

            return FormatNumber(value);
        }

        internal static string ReadString(JsonElement element)
        {
            try
            {
                return element.GetString()!;
            }
            catch (InvalidOperationException)
            {
                throw new ProtocolFormatException("Invalid JSON string");
            }
        }

        internal static string PropertyName(JsonProperty property)
        {
            try
            {
                return property.Name;
            }
            catch (InvalidOperationException)
            {
                throw new ProtocolFormatException("Invalid JSON string");
            }
        }

        private static void AppendEscape(StringBuilder builder, char value) =>
            builder.Append("\\u").Append(Hex[value >> 12]).Append(Hex[(value >> 8) & 15]).Append(Hex[(value >> 4) & 15])
                .Append(Hex[value & 15]);

        // The shortest decimal digits that read back as the same double, choosing the closest such digits.
        private static void ShortestDigits(double value, out string digits, out int exponent)
        {
            for (int precision = 1; precision <= 17; precision++)
            {
                string scientific = value.ToString("E" + (precision - 1).ToString(CultureInfo.InvariantCulture), CultureInfo.InvariantCulture);
                int marker = scientific.IndexOf('E');
                string candidate = scientific.Substring(0, marker).Replace(".", string.Empty);
                int power = int.Parse(scientific.Substring(marker + 1), NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture) + 1;
                if (ReadsBack(candidate, power, value))
                {
                    Trim(candidate, power, out digits, out exponent);
                    return;
                }

                foreach (int step in new[] { 1, -1 })
                {
                    if (Neighbour(candidate, power, step, out string neighbour, out int neighbourPower) &&
                        ReadsBack(neighbour, neighbourPower, value))
                    {
                        Trim(neighbour, neighbourPower, out digits, out exponent);
                        return;
                    }
                }
            }

            string exact = value.ToString("E16", CultureInfo.InvariantCulture);
            int position = exact.IndexOf('E');
            Trim(exact.Substring(0, position).Replace(".", string.Empty),
                int.Parse(exact.Substring(position + 1), NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture) + 1,
                out digits, out exponent);
        }

        private static bool ReadsBack(string digits, int power, double value)
        {
            string text = digits.Substring(0, 1) + (digits.Length > 1 ? "." + digits.Substring(1) : string.Empty) + "E" +
                (power - 1).ToString(CultureInfo.InvariantCulture);
            return double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out double parsed) && parsed == value;
        }

        private static bool Neighbour(string digits, int power, int step, out string neighbour, out int neighbourPower)
        {
            char[] buffer = digits.ToCharArray();
            int index = buffer.Length - 1;
            if (step > 0)
            {
                while (index >= 0 && buffer[index] == '9') buffer[index--] = '0';
                if (index < 0)
                {
                    neighbour = "1" + new string(buffer);
                    neighbourPower = power + 1;
                    return true;
                }

                buffer[index]++;
            }
            else
            {
                while (index >= 0 && buffer[index] == '0') buffer[index--] = '9';
                if (index < 0 || (index == 0 && buffer[0] == '1' && buffer.Length > 1))
                {
                    neighbour = string.Empty;
                    neighbourPower = 0;
                    return false;
                }

                buffer[index]--;
            }

            neighbour = new string(buffer);
            neighbourPower = power;
            return neighbour[0] != '0';
        }

        private static void Trim(string candidate, int power, out string digits, out int exponent)
        {
            digits = candidate.TrimEnd('0');
            if (digits.Length == 0) digits = "0";
            exponent = power;
        }
    }
}
