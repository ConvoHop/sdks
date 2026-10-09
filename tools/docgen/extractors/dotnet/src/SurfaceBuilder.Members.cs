using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace ConvoHop.Docgen;

internal sealed partial class SurfaceBuilder
{
    private static readonly SymbolDisplayFormat MemberFormat = new(
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypes,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters | SymbolDisplayGenericsOptions.IncludeTypeConstraints,
        memberOptions: SymbolDisplayMemberOptions.IncludeType
            | SymbolDisplayMemberOptions.IncludeParameters
            | SymbolDisplayMemberOptions.IncludeConstantValue
            | SymbolDisplayMemberOptions.IncludeRef,
        parameterOptions: SymbolDisplayParameterOptions.IncludeType
            | SymbolDisplayParameterOptions.IncludeName
            | SymbolDisplayParameterOptions.IncludeDefaultValue
            | SymbolDisplayParameterOptions.IncludeExtensionThis
            | SymbolDisplayParameterOptions.IncludeModifiers,
        propertyStyle: SymbolDisplayPropertyStyle.NameOnly,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes
            | SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers
            | SymbolDisplayMiscellaneousOptions.IncludeNullableReferenceTypeModifier
            | SymbolDisplayMiscellaneousOptions.AllowDefaultLiteral);

    private static readonly SymbolDisplayFormat CaseFormat = new(
        memberOptions: SymbolDisplayMemberOptions.IncludeConstantValue,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers);

    /// <summary>Visible members with the same name and static-ness, in declaration order.</summary>
    private sealed record MemberGroup(string Name, bool Static, string Kind, List<ISymbol> Symbols);

    /// <summary>Own members in declaration order, then inherited ones, nearest base first.</summary>
    private List<SurfaceMember> Members(INamedTypeSymbol type)
    {
        var own = MemberGroups(type);
        var members = own.Select(group => Member(type, group, null)).ToList();
        var listed = own.ToDictionary(group => (group.Static, group.Name));
        foreach (var baseType in Bases(type))
        {
            var inherited = baseType.OriginalDefinition.ToDisplayString(NameFormat);
            foreach (var group in MemberGroups(baseType))
            {
                if (group.Static || group.Kind == "constructor") continue;
                if (listed.TryGetValue((false, group.Name), out var nearer))
                {
                    var exposed = group.Symbols.FirstOrDefault(symbol => !nearer.Symbols.Any(item => Covers(item, symbol)));
                    if (exposed is not null)
                        throw ExtractException.At(exposed, $"{type.ToDisplayString(NameFormat)} overloads {group.Name} across base types; declare the overloads in one type, or override or hide each one");
                    continue;
                }
                listed.Add((false, group.Name), group);
                members.Add(Member(type, group, inherited));
            }
        }
        return members;
    }

    /// <summary>Bases whose members are listed: the class chain, or base interfaces breadth-first, while in this assembly.</summary>
    private IEnumerable<INamedTypeSymbol> Bases(INamedTypeSymbol type)
    {
        if (type.TypeKind == TypeKind.Class)
        {
            for (var baseType = type.BaseType; baseType is not null && InAssembly(baseType); baseType = baseType.BaseType) yield return baseType;
        }
        else if (type.TypeKind == TypeKind.Interface)
        {
            var seen = new HashSet<INamedTypeSymbol>(SymbolEqualityComparer.Default);
            var queue = new Queue<INamedTypeSymbol>(type.Interfaces);
            while (queue.Count > 0)
            {
                var next = queue.Dequeue();
                if (!seen.Add(next) || !InAssembly(next)) continue;
                yield return next;
                foreach (var item in next.Interfaces) queue.Enqueue(item);
            }
        }
    }

    private bool InAssembly(INamedTypeSymbol type) =>
        SymbolEqualityComparer.Default.Equals(type.ContainingAssembly, compilation.Assembly);

    private List<MemberGroup> MemberGroups(INamedTypeSymbol type)
    {
        var symbols = new List<ISymbol>();
        foreach (var member in type.GetMembers())
        {
            if (member is INamedTypeSymbol || !IsVisible(type, member)) continue;
            switch (member)
            {
                case IMethodSymbol { MethodKind: MethodKind.Ordinary } method when !method.IsImplicitlyDeclared:
                    symbols.Add(method);
                    break;
                case IMethodSymbol { MethodKind: MethodKind.Constructor } constructor when !(constructor.IsImplicitlyDeclared && type.TypeKind != TypeKind.Class):
                    symbols.Add(constructor);
                    break;
                case IMethodSymbol { MethodKind: MethodKind.UserDefinedOperator or MethodKind.Conversion }:
                    throw ExtractException.At(member, "operators aren't supported; declare a named method");
                case IPropertySymbol { IsIndexer: true }:
                    throw ExtractException.At(member, "indexers aren't supported; declare a named method");
                case IPropertySymbol property when property.ExplicitInterfaceImplementations.IsEmpty:
                    symbols.Add(property);
                    break;
                case IFieldSymbol field when !field.IsImplicitlyDeclared:
                    symbols.Add(field);
                    break;
                case IEventSymbol:
                    throw ExtractException.At(member, "events aren't supported; take a callback or return an IAsyncEnumerable");
            }
        }
        var groups = new List<MemberGroup>();
        var byKey = new Dictionary<(bool, string), MemberGroup>();
        foreach (var symbol in symbols.OrderBy(Position))
        {
            var isConstructor = symbol is IMethodSymbol { MethodKind: MethodKind.Constructor };
            var name = Escape(isConstructor ? type.Name : symbol.Name);
            var isStatic = type.TypeKind != TypeKind.Enum && (symbol.IsStatic || symbol is IFieldSymbol { IsConst: true });
            if (!byKey.TryGetValue((isStatic, name), out var group))
            {
                var kind = symbol switch
                {
                    IMethodSymbol when isConstructor => "constructor",
                    IMethodSymbol => "method",
                    IFieldSymbol when type.TypeKind == TypeKind.Enum => "case",
                    _ => "property",
                };
                group = new MemberGroup(name, isStatic, kind, []);
                byKey.Add((isStatic, name), group);
                groups.Add(group);
            }
            group.Symbols.Add(symbol);
        }
        return groups;
    }

    private SurfaceMember Member(INamedTypeSymbol context, MemberGroup group, string? inherited) => new(
        group.Name,
        group.Kind,
        group.Symbols.Select(Signature).ToList(),
        docs.Render(group.Symbols, context),
        Deprecated(group.Symbols[0], group.Symbols),
        group.Static,
        inherited);

    /// <summary>Implicit members first, then by file and position, so partial types read in file order.</summary>
    private (int File, int Start) Position(ISymbol symbol)
    {
        var location = symbol.Locations.FirstOrDefault(item => item.IsInSource);
        return location?.SourceTree is { } tree ? (files[tree], location.SourceSpan.Start) : (-1, 0);
    }

    /// <summary>
    /// Whether a member hides or overrides an inherited one with the same name, so the inherited one isn't visible:
    /// anything but a method hides every inherited member, and a method hides inherited non-methods and methods with
    /// its signature.
    /// </summary>
    private static bool Covers(ISymbol member, ISymbol inherited)
    {
        for (var overridden = Overridden(member); overridden is not null; overridden = Overridden(overridden))
        {
            if (SymbolEqualityComparer.Default.Equals(overridden.OriginalDefinition, inherited.OriginalDefinition)) return true;
        }
        if (member is not IMethodSymbol method || inherited is not IMethodSymbol inheritedMethod) return true;
        return method.Arity == inheritedMethod.Arity
            && method.Parameters.Length == inheritedMethod.Parameters.Length
            && method.Parameters.Zip(inheritedMethod.Parameters).All(pair =>
                pair.First.RefKind == pair.Second.RefKind && SameType(pair.First.Type, pair.Second.Type));
    }

    /// <summary>Equal types, where method type parameters match by position.</summary>
    private static bool SameType(ITypeSymbol first, ITypeSymbol second) =>
        first is ITypeParameterSymbol { TypeParameterKind: TypeParameterKind.Method } a
            && second is ITypeParameterSymbol { TypeParameterKind: TypeParameterKind.Method } b
            ? a.Ordinal == b.Ordinal
            : SymbolEqualityComparer.Default.Equals(first, second);

    private static ISymbol? Overridden(ISymbol symbol) => symbol switch
    {
        IMethodSymbol method => method.OverriddenMethod,
        IPropertySymbol property => property.OverriddenProperty,
        _ => null,
    };

    private static bool IsVisible(INamedTypeSymbol type, ISymbol member) => member.DeclaredAccessibility switch
    {
        Accessibility.Public => true,
        Accessibility.Protected or Accessibility.ProtectedOrInternal => type.TypeKind == TypeKind.Class && !type.IsSealed && !type.IsStatic,
        _ => false,
    };

    private static string Escape(string name) => SyntaxFacts.GetKeywordKind(name) != SyntaxKind.None ? "@" + name : name;
}
