using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace ConvoHop.Docgen;

/// <summary>The extractor's output: spec/docs/surface.schema.json without <c>$schema</c>, which docgen adds.</summary>
internal sealed record SurfaceDocument(string Language, IReadOnlyList<SurfacePackage> Packages);

internal sealed record SurfacePackage(string Name, IReadOnlyList<SurfaceSymbol> Symbols);

internal sealed record SurfaceSymbol(
    string Name,
    string Kind,
    IReadOnlyList<string> Signatures,
    string Docs,
    string? Deprecated = null,
    IReadOnlyList<SurfaceMember>? Members = null);

internal sealed record SurfaceMember(
    string Name,
    string Kind,
    IReadOnlyList<string> Signatures,
    string Docs,
    string? Deprecated = null,
    bool Static = false,
    string? Inherited = null);

/// <summary>Writes surfaces as JSON, with keys in the schema's order and optional keys only when they apply.</summary>
internal static class SurfaceJson
{
    private static readonly JsonWriterOptions Options = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public static void Write(Stream stream, SurfaceDocument document)
    {
        using (var writer = new Utf8JsonWriter(stream, Options))
        {
            writer.WriteStartObject();
            writer.WriteString("language", document.Language);
            writer.WriteStartArray("packages");
            foreach (var package in document.Packages)
            {
                writer.WriteStartObject();
                writer.WriteString("name", package.Name);
                writer.WriteStartArray("symbols");
                foreach (var symbol in package.Symbols) WriteSymbol(writer, symbol);
                writer.WriteEndArray();
                writer.WriteEndObject();
            }
            writer.WriteEndArray();
            writer.WriteEndObject();
        }
        stream.WriteByte((byte)'\n');
    }

    public static string Serialize(SurfaceSymbol symbol)
    {
        using var buffer = new MemoryStream();
        using (var writer = new Utf8JsonWriter(buffer, Options)) WriteSymbol(writer, symbol);
        return Encoding.UTF8.GetString(buffer.ToArray());
    }

    /// <summary>The first symbol name, in code-unit order, whose JSON differs between two surfaces of a package.</summary>
    public static string? FirstDifference(SurfacePackage left, SurfacePackage right)
    {
        var a = left.Symbols.ToDictionary(symbol => symbol.Name, Serialize, StringComparer.Ordinal);
        var b = right.Symbols.ToDictionary(symbol => symbol.Name, Serialize, StringComparer.Ordinal);
        foreach (var name in a.Keys.Union(b.Keys, StringComparer.Ordinal).Order(StringComparer.Ordinal))
        {
            if (!a.TryGetValue(name, out var x) || !b.TryGetValue(name, out var y) || x != y) return name;
        }
        return null;
    }

    private static void WriteSymbol(Utf8JsonWriter writer, SurfaceSymbol symbol)
    {
        writer.WriteStartObject();
        writer.WriteString("name", symbol.Name);
        writer.WriteString("kind", symbol.Kind);
        WriteStrings(writer, "signatures", symbol.Signatures);
        writer.WriteString("docs", symbol.Docs);
        if (symbol.Deprecated is not null) writer.WriteString("deprecated", symbol.Deprecated);
        if (symbol.Members is { Count: > 0 } members)
        {
            writer.WriteStartArray("members");
            foreach (var member in members) WriteMember(writer, member);
            writer.WriteEndArray();
        }
        writer.WriteEndObject();
    }

    private static void WriteMember(Utf8JsonWriter writer, SurfaceMember member)
    {
        writer.WriteStartObject();
        writer.WriteString("name", member.Name);
        writer.WriteString("kind", member.Kind);
        WriteStrings(writer, "signatures", member.Signatures);
        writer.WriteString("docs", member.Docs);
        if (member.Deprecated is not null) writer.WriteString("deprecated", member.Deprecated);
        if (member.Static) writer.WriteBoolean("static", true);
        if (member.Inherited is not null) writer.WriteString("inherited", member.Inherited);
        writer.WriteEndObject();
    }

    private static void WriteStrings(Utf8JsonWriter writer, string name, IReadOnlyList<string> values)
    {
        writer.WriteStartArray(name);
        foreach (var value in values) writer.WriteStringValue(value);
        writer.WriteEndArray();
    }
}
