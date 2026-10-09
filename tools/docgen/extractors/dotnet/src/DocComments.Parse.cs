using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Xml;
using System.Xml.Linq;
using Microsoft.CodeAnalysis;

namespace ConvoHop.Docgen;

internal sealed partial class DocComments
{
    /// <summary>A symbol's documentation, with <c>inheritdoc</c> applied. Cached, and fails on cycles.</summary>
    private Doc Get(ISymbol symbol)
    {
        if (cache.TryGetValue(symbol, out var cached)) return cached;
        if (!resolving.Add(symbol)) throw ExtractException.At(symbol, "<inheritdoc> forms a cycle");
        try
        {
            var doc = Parse(symbol);
            if (doc.Inherits) doc = Merge(symbol, doc, Get(Target(symbol, doc.InheritFrom)));
            cache[symbol] = doc;
            return doc;
        }
        finally
        {
            resolving.Remove(symbol);
        }
    }

    private static Doc Parse(ISymbol symbol)
    {
        var xml = symbol.GetDocumentationCommentXml(CultureInfo.InvariantCulture, expandIncludes: false) ?? "";
        if (xml.Trim().Length == 0) return new Doc(symbol, [], [], [], [], [], [], [], null, false);
        if (xml.TrimStart().StartsWith("<!--", StringComparison.Ordinal))
            throw ExtractException.At(symbol, $"the XML doc comment isn't well formed: {Collapse(xml).Trim()}");
        XElement member;
        try
        {
            member = XElement.Parse(xml, LoadOptions.PreserveWhitespace);
        }
        catch (XmlException error)
        {
            throw ExtractException.At(symbol, $"the XML doc comment isn't well formed: {error.Message}");
        }
        List<XElement> summary = [], remarks = [], returns = [], value = [];
        List<Entry> parameters = [], typeParameters = [], exceptions = [];
        string? inheritFrom = null;
        var inherits = false;
        foreach (var node in member.Nodes())
        {
            switch (node)
            {
                case XComment:
                    break;
                case XText text when string.IsNullOrWhiteSpace(text.Value):
                    break;
                case XText text:
                    throw ExtractException.At(symbol, $"text outside a doc comment tag: {Collapse(text.Value).Trim()}");
                case XElement element:
                    switch (element.Name.LocalName)
                    {
                        case "summary": summary.Add(element); break;
                        case "remarks": remarks.Add(element); break;
                        case "returns": returns.Add(element); break;
                        case "value": value.Add(element); break;
                        case "param": parameters.Add(new Entry(Attribute(symbol, element, "name"), element)); break;
                        case "typeparam": typeParameters.Add(new Entry(Attribute(symbol, element, "name"), element)); break;
                        case "exception": exceptions.Add(new Entry(Attribute(symbol, element, "cref"), element)); break;
                        case "inheritdoc":
                            if (element.Attribute("path") is not null) throw ExtractException.At(symbol, "<inheritdoc path> isn't supported");
                            if (inherits) throw ExtractException.At(symbol, "the doc comment has more than one <inheritdoc>");
                            inherits = true;
                            inheritFrom = element.Attribute("cref")?.Value;
                            break;
                        default:
                            throw Unsupported(symbol, element);
                    }
                    break;
                default:
                    throw ExtractException.At(symbol, $"unsupported XML in the doc comment: {node.NodeType}");
            }
        }
        CheckNames(symbol, "param", parameters, ParameterNames(symbol));
        CheckNames(symbol, "typeparam", typeParameters, TypeParameterNames(symbol));
        return new Doc(symbol, summary, remarks, returns, value, parameters, typeParameters, exceptions, inheritFrom, inherits);
    }

    private static void CheckNames(ISymbol symbol, string tag, IReadOnlyList<Entry> entries, IReadOnlyList<string> names)
    {
        foreach (var entry in entries)
        {
            if (!names.Contains(entry.Name))
                throw ExtractException.At(symbol, $"<{tag} name=\"{entry.Name}\"> doesn't match a {(tag == "param" ? "parameter" : "type parameter")}");
        }
        var repeated = entries.GroupBy(entry => entry.Name, StringComparer.Ordinal).FirstOrDefault(group => group.Count() > 1);
        if (repeated is not null) throw ExtractException.At(symbol, $"<{tag} name=\"{repeated.Key}\"> appears more than once");
    }

    private static IReadOnlyList<string> ParameterNames(ISymbol symbol) => symbol switch
    {
        IMethodSymbol method => method.Parameters.Select(parameter => parameter.Name).ToList(),
        IPropertySymbol property => property.Parameters.Select(parameter => parameter.Name).ToList(),
        _ => [],
    };

    private static IReadOnlyList<string> TypeParameterNames(ISymbol symbol) => symbol switch
    {
        IMethodSymbol method => method.TypeParameters.Select(parameter => parameter.Name).ToList(),
        INamedTypeSymbol type => type.TypeParameters.Select(parameter => parameter.Name).ToList(),
        _ => [],
    };

    /// <summary>
    /// What <c>inheritdoc</c> copies from: its cref, else the overridden member, else the implemented interface member,
    /// or for a type its base class, else its first interface. It must be declared in this package.
    /// </summary>
    private ISymbol Target(ISymbol symbol, string? cref)
    {
        var target = cref is not null
            ? Resolve(cref, symbol)
            : symbol switch
            {
                IMethodSymbol method => (ISymbol?)method.OverriddenMethod ?? Implemented(method),
                IPropertySymbol property => (ISymbol?)property.OverriddenProperty ?? Implemented(property),
                INamedTypeSymbol { TypeKind: TypeKind.Class, BaseType: { SpecialType: not SpecialType.System_Object } baseType } => baseType,
                INamedTypeSymbol type => type.Interfaces.FirstOrDefault(),
                _ => null,
            };
        if (target is null) throw ExtractException.At(symbol, "<inheritdoc/> has nothing to inherit from; write the documentation out, or give it a cref");
        target = target.OriginalDefinition;
        if (!SymbolEqualityComparer.Default.Equals(target.ContainingAssembly, compilation.Assembly) || !target.Locations.Any(location => location.IsInSource))
            throw ExtractException.At(symbol, $"<inheritdoc/> copies from {target.ToDisplayString()}, which isn't in this package; write the documentation out");
        return target;
    }

    private static ISymbol? Implemented(ISymbol member)
    {
        var type = member.ContainingType;
        return type.AllInterfaces
            .SelectMany(item => item.GetMembers())
            .FirstOrDefault(candidate => SymbolEqualityComparer.Default.Equals(type.FindImplementationForInterfaceMember(candidate), member));
    }

    /// <summary>
    /// Fills the sections a doc comment leaves out from the inherited docs. Parameters are renamed by position when the
    /// lists have the same length, and exceptions are combined.
    /// </summary>
    private static Doc Merge(ISymbol symbol, Doc own, Doc inherited)
    {
        var parameterNames = Rename(ParameterNames(inherited.Owner), ParameterNames(symbol));
        var typeParameterNames = Rename(TypeParameterNames(inherited.Owner), TypeParameterNames(symbol));
        XElement Copy(XElement element)
        {
            var copy = new XElement(element);
            foreach (var reference in copy.Descendants())
            {
                var names = reference.Name.LocalName switch { "paramref" => parameterNames, "typeparamref" => typeParameterNames, _ => null };
                if (names is not null && reference.Attribute("name") is { } name && names.TryGetValue(name.Value, out var renamed)) name.Value = renamed;
            }
            return copy;
        }
        IReadOnlyList<XElement> Pick(IReadOnlyList<XElement> mine, IReadOnlyList<XElement> theirs) =>
            mine.Count > 0 ? mine : theirs.Select(Copy).ToList();
        IReadOnlyList<Entry> Named(IReadOnlyList<Entry> mine, IReadOnlyList<Entry> theirs, Dictionary<string, string> names, IReadOnlyList<string> order)
        {
            var entries = mine.ToList();
            foreach (var entry in theirs)
            {
                if (names.TryGetValue(entry.Name, out var name) && !entries.Any(item => item.Name == name)) entries.Add(new Entry(name, Copy(entry.Element)));
            }
            return entries.OrderBy(entry => order.ToList().IndexOf(entry.Name)).ToList();
        }
        var exceptions = own.Exceptions.Concat(inherited.Exceptions.Where(entry => own.Exceptions.All(item => item.Name != entry.Name)).Select(entry => entry with { Element = Copy(entry.Element) }));
        return own with
        {
            Summary = Pick(own.Summary, inherited.Summary),
            Remarks = Pick(own.Remarks, inherited.Remarks),
            Returns = Pick(own.Returns, inherited.Returns),
            Value = Pick(own.Value, inherited.Value),
            Parameters = Named(own.Parameters, inherited.Parameters, parameterNames, ParameterNames(symbol)),
            TypeParameters = Named(own.TypeParameters, inherited.TypeParameters, typeParameterNames, TypeParameterNames(symbol)),
            Exceptions = exceptions.ToList(),
            InheritFrom = null,
            Inherits = false,
        };
    }

    /// <summary>Maps inherited names to own names: by position when the counts match, else only names both have.</summary>
    private static Dictionary<string, string> Rename(IReadOnlyList<string> from, IReadOnlyList<string> to) =>
        from.Count == to.Count
            ? from.Zip(to).ToDictionary(pair => pair.First, pair => pair.Second, StringComparer.Ordinal)
            : from.Where(to.Contains).ToDictionary(name => name, name => name, StringComparer.Ordinal);

    private static string Attribute(ISymbol owner, XElement element, string name) =>
        element.Attribute(name)?.Value is { Length: > 0 } value
            ? value
            : throw ExtractException.At(owner, $"<{element.Name.LocalName}> needs a {name} attribute");

    private static ExtractException Unsupported(ISymbol owner, XElement element) =>
        ExtractException.At(owner, $"unsupported XML doc tag <{element.Name.LocalName}>; document it in prose, or put example code in a tested quickstart snippet");
}
