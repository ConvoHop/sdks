using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.CodeAnalysis;

namespace ConvoHop.Docgen;

internal sealed partial class DocComments
{
    private static readonly SymbolDisplayFormat CrefFormat = new(
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypes,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes | SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers);

    private static readonly Regex Entity = new(@"\G&#?[A-Za-z0-9]+;", RegexOptions.CultureInvariant);
    private static readonly Regex OrderedListMarker = new(@"^\d{1,9}(?=[.)])", RegexOptions.CultureInvariant);

    private enum PieceKind
    {
        /// <summary>Doc text still to escape.</summary>
        Text,

        /// <summary>Rendered Markdown, such as a code span or a link.</summary>
        Markdown,

        /// <summary>A paragraph boundary.</summary>
        Break,
    }

    private readonly record struct Piece(PieceKind Kind, string Value);

    private static readonly Piece Break = new(PieceKind.Break, "");

    /// <summary>The Markdown paragraphs of a doc section, with whitespace collapsed and empty paragraphs left out.</summary>
    private IReadOnlyList<string> Paragraphs(XElement element, ISymbol owner, INamedTypeSymbol context)
    {
        var pieces = new List<Piece>();
        AddPieces(element, owner, context, pieces);
        pieces.Add(Break);
        var paragraphs = new List<string>();
        var current = new List<Piece>();
        foreach (var piece in pieces)
        {
            if (piece.Kind != PieceKind.Break)
            {
                if (piece.Kind == PieceKind.Text && current.Count > 0 && current[^1].Kind == PieceKind.Text)
                    current[^1] = new Piece(PieceKind.Text, current[^1].Value + piece.Value);
                else current.Add(piece);
                continue;
            }
            var text = new StringBuilder();
            for (var index = 0; index < current.Count; index++)
            {
                if (current[index].Kind == PieceKind.Markdown)
                {
                    text.Append(current[index].Value);
                    continue;
                }
                var value = Collapse(current[index].Value);
                if (index == 0) value = value.TrimStart();
                if (index == current.Count - 1) value = value.TrimEnd();
                text.Append(EscapeText(value, atParagraphStart: index == 0));
            }
            if (text.Length > 0) paragraphs.Add(text.ToString());
            current.Clear();
        }
        return paragraphs;
    }

    private void AddPieces(XElement element, ISymbol owner, INamedTypeSymbol context, List<Piece> pieces)
    {
        foreach (var node in element.Nodes())
        {
            switch (node)
            {
                case XComment:
                    break;
                case XText text:
                    pieces.Add(new Piece(PieceKind.Text, text.Value));
                    break;
                case XElement child:
                    AddInline(child, owner, context, pieces);
                    break;
                default:
                    throw ExtractException.At(owner, $"unsupported XML in the doc comment: {node.NodeType}");
            }
        }
    }

    private void AddInline(XElement element, ISymbol owner, INamedTypeSymbol context, List<Piece> pieces)
    {
        switch (element.Name.LocalName)
        {
            case "para":
                pieces.Add(Break);
                AddPieces(element, owner, context, pieces);
                pieces.Add(Break);
                break;
            case "c":
                var code = Collapse(TextOnly(element, owner)).Trim();
                if (code.Length == 0) throw ExtractException.At(owner, "<c> is empty");
                pieces.Add(new Piece(PieceKind.Markdown, CodeSpan(code)));
                break;
            case "paramref":
                pieces.Add(new Piece(PieceKind.Markdown, CodeSpan(Reference(element, owner, ParameterNames(owner), "parameter"))));
                break;
            case "typeparamref":
                pieces.Add(new Piece(PieceKind.Markdown, CodeSpan(Reference(element, owner, VisibleTypeParameterNames(owner), "type parameter"))));
                break;
            case "see":
                pieces.Add(See(element, owner, context));
                break;
            default:
                throw Unsupported(owner, element);
        }
    }

    /// <summary>
    /// A <c>see</c> tag: a cref as a code span (or its text, when it has some), a langword as a code span, or an https
    /// href as a link.
    /// </summary>
    private Piece See(XElement element, ISymbol owner, INamedTypeSymbol context)
    {
        var cref = element.Attribute("cref")?.Value;
        var langword = element.Attribute("langword")?.Value;
        var href = element.Attribute("href")?.Value;
        if (new[] { cref, langword, href }.Count(value => value is not null) != 1)
            throw ExtractException.At(owner, "<see> needs exactly one of cref, langword and href");
        var label = Collapse(TextOnly(element, owner)).Trim();
        if (cref is not null)
        {
            var display = CrefDisplay(cref, owner, context);
            return label.Length > 0 ? new Piece(PieceKind.Text, label) : new Piece(PieceKind.Markdown, CodeSpan(display));
        }
        if (langword is not null)
        {
            if (label.Length > 0) throw ExtractException.At(owner, "<see langword> can't have content");
            if (langword.Trim().Length == 0) throw ExtractException.At(owner, "<see langword> is empty");
            return new Piece(PieceKind.Markdown, CodeSpan(langword.Trim()));
        }
        if (!href!.StartsWith("https://", StringComparison.Ordinal) || href.Length == "https://".Length
            || href.Any(ch => char.IsWhiteSpace(ch) || char.IsControl(ch) || ch is '(' or ')' or '<' or '>'))
            throw ExtractException.At(owner, $"<see href=\"{href}\"> must be an https URL without spaces, parentheses or angle brackets");
        return new Piece(PieceKind.Markdown, label.Length > 0 ? $"[{EscapeText(label)}]({href})" : $"<{href}>");
    }

    private static string Reference(XElement element, ISymbol owner, IReadOnlyList<string> names, string what)
    {
        var name = Attribute(owner, element, "name");
        if (!names.Contains(name)) throw ExtractException.At(owner, $"<{element.Name.LocalName} name=\"{name}\"> doesn't match a {what}");
        return name;
    }

    private static IReadOnlyList<string> VisibleTypeParameterNames(ISymbol owner)
    {
        var names = new List<string>(TypeParameterNames(owner));
        for (var type = owner.ContainingType; type is not null; type = type.ContainingType)
            names.AddRange(type.TypeParameters.Select(parameter => parameter.Name));
        return names;
    }

    private static string TextOnly(XElement element, ISymbol owner)
    {
        var text = new StringBuilder();
        foreach (var node in element.Nodes())
        {
            switch (node)
            {
                case XComment:
                    break;
                case XText part:
                    text.Append(part.Value);
                    break;
                default:
                    throw ExtractException.At(owner, $"<{element.Name.LocalName}> can only contain text");
            }
        }
        return text.ToString();
    }

    /// <summary>
    /// How a cref reads: a type by its name and containing types, a constructor as its type, and a member by its name
    /// when the documented type has it, else as <c>Type.Member</c>.
    /// </summary>
    private string CrefDisplay(string cref, ISymbol owner, INamedTypeSymbol context)
    {
        switch (Resolve(cref, owner))
        {
            case INamespaceSymbol name:
                return name.ToDisplayString();
            case ITypeSymbol type:
                return type.ToDisplayString(CrefFormat);
            case IMethodSymbol { MethodKind: MethodKind.Constructor or MethodKind.StaticConstructor } constructor:
                return constructor.ContainingType.ToDisplayString(CrefFormat);
            case { ContainingType: { } container } member:
                return InScope(container.OriginalDefinition, context) ? member.Name : $"{container.ToDisplayString(CrefFormat)}.{member.Name}";
            case var other:
                throw ExtractException.At(owner, $"cref {cref} names a {other.Kind}, which the reference can't show");
        }
    }

    private static bool InScope(INamedTypeSymbol container, INamedTypeSymbol context)
    {
        for (INamedTypeSymbol? type = context; type is not null; type = type.BaseType)
        {
            if (SymbolEqualityComparer.Default.Equals(type.OriginalDefinition, container)) return true;
        }
        return context.AllInterfaces.Any(item => SymbolEqualityComparer.Default.Equals(item.OriginalDefinition, container));
    }

    /// <summary>The symbol a compiled cref (a documentation ID such as <c>T:ConvoHop.Webhooks</c>) names.</summary>
    private ISymbol Resolve(string cref, ISymbol owner)
    {
        var symbol = cref.Length > 2 && cref[1] == ':' && cref[0] != '!'
            ? DocumentationCommentId.GetFirstSymbolForDeclarationId(cref, compilation)
            : null;
        return symbol ?? throw ExtractException.At(owner, $"cref {(cref.StartsWith("!:", StringComparison.Ordinal) ? cref[2..] : cref)} doesn't resolve");
    }

    /// <summary>A Markdown code span that holds any text, backticks included.</summary>
    internal static string CodeSpan(string text)
    {
        int longest = 0, run = 0;
        foreach (var ch in text)
        {
            run = ch == '`' ? run + 1 : 0;
            longest = Math.Max(longest, run);
        }
        var fence = new string('`', longest + 1);
        var pad = text.StartsWith('`') || text.EndsWith('`') ? " " : "";
        return fence + pad + text + pad + fence;
    }

    /// <summary>
    /// Escapes doc text so Markdown shows it as written. Angle brackets and braces are left to docgen, which escapes
    /// them outside code. At a paragraph start it also escapes what would start a heading, quote, list or rule.
    /// </summary>
    internal static string EscapeText(string text, bool atParagraphStart = false)
    {
        var escaped = new StringBuilder(text.Length + 8);
        for (var index = 0; index < text.Length; index++)
        {
            var ch = text[index];
            var escape = ch switch
            {
                '\\' or '`' or '*' or '[' or ']' or '~' => true,
                '_' => !(index > 0 && char.IsLetterOrDigit(text[index - 1]) && index + 1 < text.Length && char.IsLetterOrDigit(text[index + 1])),
                '&' => Entity.IsMatch(text, index),
                _ => false,
            };
            if (escape) escaped.Append('\\');
            escaped.Append(ch);
        }
        var result = escaped.ToString();
        if (!atParagraphStart || result.Length == 0) return result;
        if (result[0] is '#' or '>' or '+' or '-' or '=') return "\\" + result;
        var marker = OrderedListMarker.Match(result);
        return marker.Success ? result.Insert(marker.Length, "\\") : result;
    }

    private static string Collapse(string text)
    {
        var collapsed = new StringBuilder(text.Length);
        var space = false;
        foreach (var ch in text)
        {
            if (char.IsWhiteSpace(ch))
            {
                space = true;
                continue;
            }
            if (space) collapsed.Append(' ');
            space = false;
            collapsed.Append(ch);
        }
        if (space) collapsed.Append(' ');
        return collapsed.ToString();
    }
}
