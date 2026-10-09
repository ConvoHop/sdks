using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace ConvoHop.Internal
{
    internal enum TypeShapeKind
    {
        Object,
        Enum,
        Scalar,
    }

    internal sealed class FieldShape
    {
        internal FieldShape(string name, string type)
        {
            Name = name;
            Type = type;
        }

        internal string Name { get; }

        internal string Type { get; }
    }

    // One generated output shape. Scalar constraints come from the schema annotations.
    internal sealed class TypeShape
    {
        private static readonly string[] None = Array.Empty<string>();
        private readonly Lazy<Regex?> _pattern;

        private TypeShape(TypeShapeKind kind, FieldShape[] fields, string[] values, string representation, string? pattern,
            string[] disallowed, string? maximumDecimal, double? minimum, double? maximum, int? maxCanonicalJsonBytes,
            string[] requiredStringProperties)
        {
            Kind = kind;
            Fields = fields;
            Values = new HashSet<string>(values, StringComparer.Ordinal);
            Representation = representation;
            Pattern = pattern;
            Disallowed = new HashSet<string>(disallowed, StringComparer.Ordinal);
            MaximumDecimal = maximumDecimal;
            Minimum = minimum;
            Maximum = maximum;
            MaxCanonicalJsonBytes = maxCanonicalJsonBytes;
            RequiredStringProperties = requiredStringProperties;
            _pattern = new Lazy<Regex?>(() => pattern is null ? null : new Regex(pattern, RegexOptions.CultureInvariant));
        }

        internal TypeShapeKind Kind { get; }

        internal IReadOnlyList<FieldShape> Fields { get; }

        internal ISet<string> Values { get; }

        internal string Representation { get; }

        internal string? Pattern { get; }

        internal ISet<string> Disallowed { get; }

        internal string? MaximumDecimal { get; }

        internal double? Minimum { get; }

        internal double? Maximum { get; }

        internal int? MaxCanonicalJsonBytes { get; }

        internal IReadOnlyList<string> RequiredStringProperties { get; }

        internal static TypeShape Object(FieldShape[] fields) =>
            new TypeShape(TypeShapeKind.Object, fields, None, "object", null, None, null, null, null, null, None);

        internal static TypeShape Enum(string[] values) =>
            new TypeShape(TypeShapeKind.Enum, Array.Empty<FieldShape>(), values, "string", null, None, null, null, null, null, None);

        internal static TypeShape Scalar(string representation, string? pattern = null, string[]? disallowed = null,
            string? maximumDecimal = null, double? minimum = null, double? maximum = null, int? maxCanonicalJsonBytes = null,
            string[]? requiredStringProperties = null) =>
            new TypeShape(TypeShapeKind.Scalar, Array.Empty<FieldShape>(), None, representation, pattern, disallowed ?? None,
                maximumDecimal, minimum, maximum, maxCanonicalJsonBytes, requiredStringProperties ?? None);

        // True when the whole string matches the scalar pattern (no partial or trailing-newline matches).
        internal bool MatchesPattern(string value)
        {
            Regex? regex = _pattern.Value;
            return regex is null || Protocol.FullMatch(regex, value);
        }

        // True when a string value satisfies this string scalar's pattern, exclusions and decimal bound.
        internal bool AcceptsString(string value) =>
            MatchesPattern(value) && !Disallowed.Contains(value) && (MaximumDecimal == null || Protocol.WithinDecimal(value, MaximumDecimal));
    }
}
