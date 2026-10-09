using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace ConvoHop.Docgen;

/// <summary>Builds the documented surface of a compilation's public types, one package per namespace.</summary>
/// <remarks>
/// A public nested type is its own symbol named <c>Outer.Inner</c>. Members are the public members, and the
/// protected ones of classes that can be derived from, with overloads merged. Inherited members come from
/// bases in the same assembly; members of framework and third-party bases aren't listed.
///
/// A namespace whose public types are all in files that begin with an <c>&lt;auto-generated&gt;</c> comment is
/// generated code. Its data types, which have no methods but constructors, are shown as stubs: the declaration with
/// its own members' signatures and their <see cref="ObsoleteAttribute"/>s, without member entries or member docs.
/// </remarks>
internal sealed partial class SurfaceBuilder
{
    private static readonly SymbolDisplayFormat NameFormat = new(
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypes,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers);

    private static readonly SymbolDisplayFormat DeclarationFormat = new(
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypes,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters | SymbolDisplayGenericsOptions.IncludeVariance,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers);

    /// <summary>How signatures show types: with containing types, without namespaces.</summary>
    internal static readonly SymbolDisplayFormat ReferenceFormat = new(
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypes,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes
            | SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers
            | SymbolDisplayMiscellaneousOptions.IncludeNullableReferenceTypeModifier);

    private readonly Compilation compilation;
    private readonly DocComments docs;
    private readonly Dictionary<SyntaxTree, int> files;
    private readonly HashSet<SyntaxTree> generatedFiles;

    private SurfaceBuilder(Compilation compilation)
    {
        this.compilation = compilation;
        docs = new DocComments(compilation);
        files = compilation.SyntaxTrees.Select((tree, index) => (tree, index)).ToDictionary(item => item.tree, item => item.index);
        generatedFiles = new HashSet<SyntaxTree>(compilation.SyntaxTrees.Where(IsGeneratedFile));
    }

    /// <summary>The surface of each namespace, in the order given. Fails for a public type in any other namespace.</summary>
    public static IReadOnlyList<SurfacePackage> Build(Compilation compilation, IReadOnlyList<string> namespaces)
    {
        var builder = new SurfaceBuilder(compilation);
        var types = new List<INamedTypeSymbol>();
        CollectTypes(compilation.Assembly.GlobalNamespace, types);
        var listed = new HashSet<string>(namespaces, StringComparer.Ordinal);
        foreach (var type in types)
        {
            if (type.ContainingNamespace.IsGlobalNamespace)
                throw ExtractException.At(type, "public types must be in a namespace that language.json lists as a package");
            var name = type.ContainingNamespace.ToDisplayString();
            if (!listed.Contains(name))
                throw ExtractException.At(type, $"namespace {name} isn't a package in language.json; list it, or make the type internal");
        }
        return namespaces.Select(name =>
        {
            var namespaceTypes = types
                .Where(type => !type.ContainingNamespace.IsGlobalNamespace && type.ContainingNamespace.ToDisplayString() == name)
                .ToList();
            if (namespaceTypes.Count == 0) throw new ExtractException($"{compilation.AssemblyName}: namespace {name} has no public types");
            var generated = namespaceTypes.All(builder.IsGenerated);
            var symbols = namespaceTypes
                .Select(type => builder.Symbol(type, generated))
                .OrderBy(symbol => symbol.Name, StringComparer.Ordinal)
                .ToList();
            for (var index = 1; index < symbols.Count; index++)
            {
                if (symbols[index].Name == symbols[index - 1].Name)
                    throw new ExtractException($"{compilation.AssemblyName}: namespace {name} has more than one type named {symbols[index].Name}");
            }
            return new SurfacePackage(name, symbols);
        }).ToList();
    }

    private static void CollectTypes(INamespaceSymbol container, List<INamedTypeSymbol> types)
    {
        foreach (var member in container.GetMembers())
        {
            if (member is INamespaceSymbol child) CollectTypes(child, types);
            else if (member is INamedTypeSymbol type && type.DeclaredAccessibility == Accessibility.Public && !type.IsImplicitlyDeclared) CollectType(type, types);
        }
    }

    private static void CollectType(INamedTypeSymbol type, List<INamedTypeSymbol> types)
    {
        types.Add(type);
        foreach (var nested in type.GetTypeMembers())
        {
            if (nested.IsImplicitlyDeclared) continue;
            if (nested.DeclaredAccessibility == Accessibility.Public) CollectType(nested, types);
            else if (IsVisible(type, nested))
                throw ExtractException.At(nested, "protected nested types aren't supported; make the type public or private");
        }
    }

    /// <summary>Whether a file begins with an <c>&lt;auto-generated&gt;</c> comment, which Roslyn's analyzers also take to mean generated code.</summary>
    private static bool IsGeneratedFile(SyntaxTree tree) =>
        tree.GetRoot().GetLeadingTrivia().Any(trivia =>
            (trivia.IsKind(SyntaxKind.SingleLineCommentTrivia) || trivia.IsKind(SyntaxKind.MultiLineCommentTrivia))
            && (trivia.ToString().Contains("<auto-generated") || trivia.ToString().Contains("<autogenerated")));

    private bool IsGenerated(INamedTypeSymbol type) =>
        type.DeclaringSyntaxReferences.All(reference => generatedFiles.Contains(reference.SyntaxTree));

    /// <summary>Whether a type and its bases in this assembly have no methods but constructors.</summary>
    private bool IsData(INamedTypeSymbol type) =>
        new[] { type }.Concat(Bases(type)).All(item => MemberGroups(item).All(group => group.Kind != "method"));

    /// <summary>A generated data type as one declaration, like a reference assembly shows it.</summary>
    private static string Stub(INamedTypeSymbol type, IEnumerable<ISymbol> members)
    {
        var text = new StringBuilder(TypeSignature(type)).Append("\n{");
        foreach (var member in members)
        {
            if (ObsoleteSyntax(member) is { } obsolete) text.Append("\n    ").Append(obsolete);
            text.Append("\n    ").Append(Signature(member));
            if (type.TypeKind == TypeKind.Enum) text.Append(',');
        }
        return text.Append("\n}").ToString();
    }

    private SurfaceSymbol Symbol(INamedTypeSymbol type, bool generated)
    {
        if (type.IsRecord) throw ExtractException.At(type, "records aren't supported; declare a class or struct");
        var kind = type.TypeKind switch
        {
            TypeKind.Class => "class",
            TypeKind.Struct => "struct",
            TypeKind.Interface => "interface",
            TypeKind.Enum => "enum",
            TypeKind.Delegate => throw ExtractException.At(type, "delegates aren't supported; use Func<> or Action<>, or an interface"),
            _ => throw ExtractException.At(type, $"{type.TypeKind} types aren't supported"),
        };
        if (generated && IsData(type))
        {
            var own = MemberGroups(type).SelectMany(group => group.Symbols);
            return new SurfaceSymbol(type.ToDisplayString(NameFormat), kind, [Stub(type, own)], docs.Render([type], type), Deprecated(type, [type]));
        }
        var members = Members(type);
        return new SurfaceSymbol(
            type.ToDisplayString(NameFormat),
            kind,
            [TypeSignature(type)],
            docs.Render([type], type),
            Deprecated(type, [type]),
            members.Count > 0 ? members : null);
    }

    private static string TypeSignature(INamedTypeSymbol type)
    {
        var text = new StringBuilder("public ");
        switch (type.TypeKind)
        {
            case TypeKind.Class:
                text.Append(type.IsStatic ? "static " : type.IsAbstract ? "abstract " : type.IsSealed ? "sealed " : "");
                text.Append("class ");
                break;
            case TypeKind.Struct:
                if (type.IsReadOnly) text.Append("readonly ");
                if (type.IsRefLikeType) text.Append("ref ");
                text.Append("struct ");
                break;
            case TypeKind.Interface:
                text.Append("interface ");
                break;
            default:
                text.Append("enum ");
                break;
        }
        text.Append(type.ToDisplayString(DeclarationFormat));
        var bases = new List<ITypeSymbol>();
        if (type.TypeKind == TypeKind.Enum)
        {
            if (type.EnumUnderlyingType is { SpecialType: not SpecialType.System_Int32 } underlying) bases.Add(underlying);
        }
        else
        {
            if (type.TypeKind == TypeKind.Class && type.BaseType is { SpecialType: not SpecialType.System_Object } baseType) bases.Add(baseType);
            bases.AddRange(type.Interfaces.Where(IsPublic));
        }
        foreach (var item in bases) CheckResolved(type, item);
        if (bases.Count > 0) text.Append(" : ").Append(string.Join(", ", bases.Select(item => item.ToDisplayString(ReferenceFormat))));
        text.Append(Constraints(type, type.TypeParameters));
        return text.ToString();
    }

    private static string Constraints(ISymbol owner, ImmutableArray<ITypeParameterSymbol> parameters)
    {
        var text = new StringBuilder();
        foreach (var parameter in parameters)
        {
            var items = new List<string>();
            if (parameter.HasReferenceTypeConstraint)
                items.Add(parameter.ReferenceTypeConstraintNullableAnnotation == NullableAnnotation.Annotated ? "class?" : "class");
            else if (parameter.HasUnmanagedTypeConstraint) items.Add("unmanaged");
            else if (parameter.HasValueTypeConstraint) items.Add("struct");
            else if (parameter.HasNotNullConstraint) items.Add("notnull");
            foreach (var constraint in parameter.ConstraintTypes)
            {
                CheckResolved(owner, constraint);
                items.Add(constraint.ToDisplayString(ReferenceFormat));
            }
            if (parameter.HasConstructorConstraint) items.Add("new()");
            if (parameter.AllowsRefLikeType) items.Add("allows ref struct");
            if (items.Count > 0) text.Append(" where ").Append(parameter.Name).Append(" : ").Append(string.Join(", ", items));
        }
        return text.ToString();
    }

    /// <summary>Whether a type and every type it's built from can be named outside the assembly.</summary>
    private static bool IsPublic(ITypeSymbol type) => type switch
    {
        ITypeParameterSymbol => true,
        IArrayTypeSymbol array => IsPublic(array.ElementType),
        IPointerTypeSymbol pointer => IsPublic(pointer.PointedAtType),
        INamedTypeSymbol named => named.DeclaredAccessibility == Accessibility.Public
            && (named.ContainingType is null || IsPublic(named.ContainingType))
            && named.TypeArguments.All(IsPublic),
        _ => false,
    };

    private static void CheckResolved(ISymbol owner, ITypeSymbol? type)
    {
        switch (type)
        {
            case null:
                return;
            case IErrorTypeSymbol:
                throw ExtractException.At(owner, $"type {type.ToDisplayString()} doesn't resolve");
            case IArrayTypeSymbol array:
                CheckResolved(owner, array.ElementType);
                return;
            case IPointerTypeSymbol pointer:
                CheckResolved(owner, pointer.PointedAtType);
                return;
            case INamedTypeSymbol named:
                foreach (var argument in named.TypeArguments) CheckResolved(owner, argument);
                return;
        }
    }
}
