using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.Json.Nodes;
using Xunit;

namespace ConvoHop.Tests.TestSupport
{
    /// <summary>JSON helpers that behave like the TypeScript tests' <c>JSON.stringify</c> and <c>assert.deepEqual</c>.</summary>
    internal static class Js
    {
        private const string Hex = "0123456789abcdef";

        /// <summary>ECMAScript <c>JSON.stringify</c>, compact, in property insertion order.</summary>
        internal static string Stringify(JsonNode? node)
        {
            var builder = new StringBuilder();
            Write(builder, node, false);
            return builder.ToString();
        }

        /// <summary><see cref="Stringify"/> with object keys sorted, for comparisons where key order doesn't matter.</summary>
        internal static string Canonical(JsonNode? node)
        {
            var builder = new StringBuilder();
            Write(builder, node, true);
            return builder.ToString();
        }

        /// <summary>Asserts that two JSON values are equal, ignoring object key order.</summary>
        internal static void Equal(JsonNode? expected, JsonNode? actual, string? because = null)
        {
            string left = Canonical(expected), right = Canonical(actual);
            if (left != right) Assert.Fail((because == null ? "" : because + ": ") + "expected " + left + " but found " + right);
        }

        internal static JsonObject Object(string json) => JsonNode.Parse(json)!.AsObject();

        /// <summary>A deep copy of <paramref name="source"/> with <paramref name="fields"/> set, in place or appended.</summary>
        internal static JsonObject With(JsonObject source, JsonObject fields)
        {
            var copy = source.DeepClone().AsObject();
            foreach (KeyValuePair<string, JsonNode?> field in fields) copy[field.Key] = field.Value?.DeepClone();
            return copy;
        }

        /// <summary>A deep copy of <paramref name="source"/> without <paramref name="names"/>.</summary>
        internal static JsonObject Without(JsonObject source, params string[] names)
        {
            var copy = source.DeepClone().AsObject();
            foreach (string name in names) copy.Remove(name);
            return copy;
        }

        /// <summary>The string property <paramref name="name"/>, or null when it is absent or not a string.</summary>
        internal static string? Text(JsonNode? node, string name) =>
            node is JsonObject value && value.TryGetPropertyValue(name, out JsonNode? child) && child is JsonValue text &&
            text.TryGetValue(out string? result)
                ? result
                : null;

        /// <summary>The code points of <paramref name="value"/>, like <c>Array.from</c>; lone surrogates stay single.</summary>
        internal static List<string> CodePoints(string value)
        {
            var points = new List<string>();
            for (int index = 0; index < value.Length; index++)
            {
                if (char.IsHighSurrogate(value[index]) && index + 1 < value.Length && char.IsLowSurrogate(value[index + 1]))
                {
                    points.Add(value.Substring(index, 2));
                    index++;
                }
                else
                {
                    points.Add(value[index].ToString());
                }
            }

            return points;
        }

        internal static string Repeat(string value, int count) => string.Concat(Enumerable.Repeat(value, count));

        internal static int Bytes(string value) => Encoding.UTF8.GetByteCount(value);

        /// <summary>UTF-8 bytes of <see cref="Stringify"/>: the push contract's canonical size.</summary>
        internal static int Size(JsonNode? node) => Bytes(Stringify(node));

        private static void Write(StringBuilder builder, JsonNode? node, bool sorted)
        {
            switch (node)
            {
                case null:
                    builder.Append("null");
                    break;
                case JsonObject value:
                {
                    builder.Append('{');
                    IEnumerable<KeyValuePair<string, JsonNode?>> properties = sorted
                        ? value.OrderBy(property => property.Key, StringComparer.Ordinal)
                        : value;
                    bool first = true;
                    foreach (KeyValuePair<string, JsonNode?> property in properties)
                    {
                        if (!first) builder.Append(',');
                        first = false;
                        WriteString(builder, property.Key);
                        builder.Append(':');
                        Write(builder, property.Value, sorted);
                    }

                    builder.Append('}');
                    break;
                }
                case JsonArray value:
                {
                    builder.Append('[');
                    for (int index = 0; index < value.Count; index++)
                    {
                        if (index > 0) builder.Append(',');
                        Write(builder, value[index], sorted);
                    }

                    builder.Append(']');
                    break;
                }
                default:
                {
                    var value = (JsonValue)node;
                    if (value.TryGetValue(out string? text)) WriteString(builder, text);
                    else if (value.TryGetValue(out double number)) builder.Append(Number(number));
                    else builder.Append(value.ToJsonString());
                    break;
                }
            }
        }

        // JSON.stringify's number form (ECMAScript Number::toString) from the shortest round-trip digits.
        private static string Number(double value)
        {
            if (value == 0) return "0";
            string shortest = value.ToString("R", CultureInfo.InvariantCulture);
            string sign = shortest[0] == '-' ? "-" : "";
            if (sign.Length != 0) shortest = shortest.Substring(1);
            int exponentAt = shortest.IndexOf('E');
            string mantissa = exponentAt < 0 ? shortest : shortest.Substring(0, exponentAt);
            int exponent = exponentAt < 0 ? 0 : int.Parse(shortest.Substring(exponentAt + 1), NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture);
            int point = mantissa.IndexOf('.');
            string digits = mantissa.Replace(".", "");
            int n = (point < 0 ? mantissa.Length : point) + exponent;
            while (digits.Length > 1 && digits[0] == '0')
            {
                digits = digits.Substring(1);
                n--;
            }

            digits = digits.TrimEnd('0');
            int k = digits.Length;
            if (k <= n && n <= 21) return sign + digits + new string('0', n - k);
            if (0 < n && n <= 21) return sign + digits.Substring(0, n) + "." + digits.Substring(n);
            if (-6 < n && n <= 0) return sign + "0." + new string('0', -n) + digits;
            string power = (n - 1 < 0 ? "-" : "+") + Math.Abs(n - 1).ToString(CultureInfo.InvariantCulture);
            return sign + (k == 1 ? digits : digits.Substring(0, 1) + "." + digits.Substring(1)) + "e" + power;
        }

        private static void WriteString(StringBuilder builder, string value)
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
                        if (char.IsHighSurrogate(current) && index + 1 < value.Length && char.IsLowSurrogate(value[index + 1]))
                        {
                            builder.Append(current).Append(value[++index]);
                        }
                        else if (current < ' ' || char.IsSurrogate(current))
                        {
                            builder.Append("\\u").Append(Hex[current >> 12]).Append(Hex[(current >> 8) & 15])
                                .Append(Hex[(current >> 4) & 15]).Append(Hex[current & 15]);
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
    }
}
