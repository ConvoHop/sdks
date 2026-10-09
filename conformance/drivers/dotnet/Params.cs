using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ConvoHop.Conformance
{
    /// <summary>Parameters the driver can't decode. The driver answers <c>INVALID_PARAMS</c>, never an SDK result.</summary>
    internal sealed class ParamsException : Exception
    {
        public ParamsException(string message) : base(message) { }
    }

    /// <summary>Strict decoding of driver-protocol parameters (spec/conformance/driver-protocol.md).</summary>
    internal static class Params
    {
        // The protocol's integers are JSON numbers that JavaScript reads exactly (Number.isSafeInteger).
        public const long MaxSafeInteger = 9007199254740991;

        // \z, not $: .NET's $ also matches before a trailing newline.
        private static readonly Regex HandlePattern = new Regex(@"^[A-Za-z0-9._:-]{1,64}\z", RegexOptions.CultureInvariant);

        public static JsonElement EmptyObject { get; } = JsonDocument.Parse("{}").RootElement.Clone();

        public static bool Has(JsonElement args, string name) => args.TryGetProperty(name, out _);

        /// <summary>The named member, or an undefined element when it is absent.</summary>
        public static JsonElement Get(JsonElement args, string name) => args.TryGetProperty(name, out JsonElement value) ? value : default;

        public static JsonElement Record(JsonElement value, string label)
        {
            if (value.ValueKind != JsonValueKind.Object) throw new ParamsException($"{label} must be an object");
            return value;
        }

        public static string Text(JsonElement args, string name) => StringValue(Get(args, name), name);

        public static string? OptionalText(JsonElement args, string name) => Has(args, name) ? Text(args, name) : null;

        public static string StringValue(JsonElement value, string label)
        {
            if (value.ValueKind != JsonValueKind.String) throw new ParamsException($"{label} must be a string");
            try
            {
                return value.GetString()!;
            }
            catch (InvalidOperationException)
            {
                // JSON allows lone surrogate escapes, which .NET strings can't decode; no SDK input needs them.
                throw new ParamsException($"{label} must be valid UTF-16 text");
            }
        }

        /// <summary>An optional integer in <paramref name="min"/>..<paramref name="max"/>, with JavaScript number semantics.</summary>
        public static long? Integer(JsonElement args, string name, long min, long max)
        {
            if (!args.TryGetProperty(name, out JsonElement value)) return null;
            if (!SafeInteger(value, out long number) || number < min || number > max)
                throw new ParamsException($"{name} must be an integer in {min}..{max}");
            return number;
        }

        /// <summary>True for a JSON number that JavaScript reads as a safe integer, such as 1, 1.0 or 1e0.</summary>
        public static bool SafeInteger(JsonElement value, out long number)
        {
            number = 0;
            if (value.ValueKind != JsonValueKind.Number || !value.TryGetDouble(out double parsed) || Math.Floor(parsed) != parsed ||
                Math.Abs(parsed) > MaxSafeInteger)
                return false;
            number = (long)parsed;
            return true;
        }

        public static IReadOnlyList<string> Strings(JsonElement args, string name)
        {
            JsonElement value = Get(args, name);
            if (value.ValueKind != JsonValueKind.Array) throw new ParamsException($"{name} must be an array of strings");
            var items = new List<string>();
            foreach (JsonElement item in value.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.String) throw new ParamsException($"{name} must be an array of strings");
                items.Add(StringValue(item, name));
            }
            return items;
        }

        public static IReadOnlyList<JsonElement> Entries(JsonElement args, string name)
        {
            JsonElement value = Get(args, name);
            if (value.ValueKind != JsonValueKind.Array) throw new ParamsException($"{name} must be an array");
            var entries = new List<JsonElement>();
            foreach (JsonElement entry in value.EnumerateArray()) entries.Add(Record(entry, $"{name}[{entries.Count}]"));
            return entries;
        }

        public static string Handle(JsonElement args, string name)
        {
            string value = Text(args, name);
            if (!HandlePattern.IsMatch(value)) throw new ParamsException($"{name} must match [A-Za-z0-9._:-]{{1,64}}");
            return value;
        }
    }
}
