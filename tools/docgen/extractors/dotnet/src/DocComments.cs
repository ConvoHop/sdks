using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using Microsoft.CodeAnalysis;

namespace ConvoHop.Docgen;

/// <summary>Renders XML documentation comments as the Markdown that surface <c>docs</c> hold.</summary>
/// <remarks>
/// Supported tags: summary, remarks, returns, value, param, typeparam, exception and inheritdoc at the top
/// level, and c, para, paramref, typeparamref and see (cref, langword or an https href) inline. Any other tag
/// fails, so documentation never silently disappears from the reference.
/// </remarks>
internal sealed partial class DocComments
{
    private readonly Compilation compilation;
    private readonly Dictionary<ISymbol, Doc> cache = new(SymbolEqualityComparer.Default);
    private readonly HashSet<ISymbol> resolving = new(SymbolEqualityComparer.Default);

    public DocComments(Compilation compilation) => this.compilation = compilation;

    /// <summary>A symbol's documentation sections, after <c>inheritdoc</c>, as XML still to render.</summary>
    private sealed record Doc(
        ISymbol Owner,
        IReadOnlyList<XElement> Summary,
        IReadOnlyList<XElement> Remarks,
        IReadOnlyList<XElement> Returns,
        IReadOnlyList<XElement> Value,
        IReadOnlyList<Entry> Parameters,
        IReadOnlyList<Entry> TypeParameters,
        IReadOnlyList<Entry> Exceptions,
        string? InheritFrom,
        bool Inherits);

    /// <summary>A named section entry: a parameter or type parameter name, or an exception cref.</summary>
    private sealed record Entry(string Name, XElement Element);

    /// <summary>
    /// The docs of a symbol, or of overloads as one member: distinct summaries, then type parameters,
    /// parameters, value, returns and exceptions, then distinct remarks.
    /// </summary>
    public string Render(IReadOnlyList<ISymbol> symbols, INamedTypeSymbol context)
    {
        var docs = symbols.Select(symbol => Get(symbol.OriginalDefinition)).ToList();
        string Text(IReadOnlyList<XElement> elements, ISymbol owner) =>
            string.Join("\n\n", elements.SelectMany(element => Paragraphs(element, owner, context)));
        var sections = new List<string>();
        sections.AddRange(Distinct(docs.Select(doc => Text(doc.Summary, doc.Owner))));
        AddEntries(sections, "Type parameters:", docs.SelectMany(doc => doc.TypeParameters.Select(entry => (CodeSpan(entry.Name), Paragraphs(entry.Element, doc.Owner, context)))));
        AddEntries(sections, "Parameters:", ParameterEntries(symbols.Zip(docs).SelectMany(pair => pair.Second.Parameters.Select(entry =>
            (entry.Name, ParameterType(pair.First, entry.Name), Paragraphs(entry.Element, pair.Second.Owner, context))))));
        sections.AddRange(Distinct(docs.Select(doc => Text(doc.Value, doc.Owner))).Select(text => $"Value: {text}"));
        sections.AddRange(Distinct(docs.Select(doc => Text(doc.Returns, doc.Owner))).Select(text => $"Returns: {text}"));
        AddEntries(sections, "Exceptions:", docs.SelectMany(doc => doc.Exceptions.Select(entry => (CodeSpan(CrefDisplay(entry.Name, doc.Owner, context)), Paragraphs(entry.Element, doc.Owner, context)))));
        sections.AddRange(Distinct(docs.Select(doc => Text(doc.Remarks, doc.Owner))));
        return string.Join("\n\n", sections);
    }

    /// <summary>
    /// Parameter entries named by code spans. When overloads document one parameter name differently, those
    /// entries show the parameter's type too, such as <c>`body` (`string`)</c>, so each reads against its overload.
    /// Entries with one name stay together, in the order the names first appear.
    /// </summary>
    private static IEnumerable<(string Name, IReadOnlyList<string> Paragraphs)> ParameterEntries(
        IEnumerable<(string Name, string Type, IReadOnlyList<string> Paragraphs)> entries)
    {
        var byName = entries.Where(entry => entry.Paragraphs.Count > 0).GroupBy(entry => entry.Name, StringComparer.Ordinal).ToList();
        var varied = byName
            .Where(group => group.Select(entry => string.Join("\n\n", entry.Paragraphs)).Distinct(StringComparer.Ordinal).Skip(1).Any())
            .Select(group => group.Key)
            .ToHashSet(StringComparer.Ordinal);
        return byName.SelectMany(group => group).Select(entry =>
            (varied.Contains(entry.Name) ? $"{CodeSpan(entry.Name)} ({CodeSpan(entry.Type)})" : CodeSpan(entry.Name), entry.Paragraphs));
    }

    private static string ParameterType(ISymbol symbol, string name)
    {
        var parameters = symbol switch
        {
            IMethodSymbol method => method.Parameters,
            IPropertySymbol property => property.Parameters,
            _ => [],
        };
        return parameters.FirstOrDefault(parameter => parameter.Name == name)?.Type.ToDisplayString(SurfaceBuilder.ReferenceFormat) ?? "";
    }

    private static IEnumerable<string> Distinct(IEnumerable<string> texts) =>
        texts.Where(text => text.Length > 0).Distinct(StringComparer.Ordinal);

    /// <summary>Adds a titled list such as <c>Parameters:</c>, with later paragraphs of an entry indented under it.</summary>
    private static void AddEntries(List<string> sections, string title, IEnumerable<(string Name, IReadOnlyList<string> Paragraphs)> entries)
    {
        var items = entries
            .Where(entry => entry.Paragraphs.Count > 0)
            .Select(entry => $"- {entry.Name}: {string.Join("\n\n", entry.Paragraphs.Select((text, index) => index == 0 ? text : "  " + text))}")
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (items.Count > 0) sections.Add($"{title}\n\n{string.Join("\n", items)}");
    }
}
