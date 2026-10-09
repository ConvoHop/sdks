using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace ConvoHop.Docgen;

internal sealed partial class SurfaceBuilder
{
    /// <summary>A member's declaration in C# syntax: modifiers, type, name and parameters, without its body.</summary>
    private static string Signature(ISymbol symbol)
    {
        var type = symbol.ContainingType;
        switch (symbol)
        {
            case IFieldSymbol field when type.TypeKind == TypeKind.Enum:
                return field.ToDisplayString(CaseFormat);
            case IFieldSymbol field:
                CheckResolved(field, field.Type);
                return Modifiers(type, field) + field.ToDisplayString(MemberFormat) + ";";
            case IPropertySymbol property:
                CheckResolved(property, property.Type);
                return Modifiers(type, property) + property.ToDisplayString(MemberFormat) + Accessors(type, property);
            case IMethodSymbol method:
                CheckResolved(method, method.ReturnType);
                foreach (var parameter in method.Parameters) CheckResolved(method, parameter.Type);
                foreach (var constraint in method.TypeParameters.SelectMany(parameter => parameter.ConstraintTypes)) CheckResolved(method, constraint);
                return Modifiers(type, method) + method.ToDisplayString(MemberFormat) + ";";
            default:
                throw ExtractException.At(symbol, $"{symbol.Kind} members aren't supported");
        }
    }

    private static string Modifiers(INamedTypeSymbol type, ISymbol member)
    {
        var parts = new List<string>();
        if (type.TypeKind != TypeKind.Interface || member.DeclaredAccessibility != Accessibility.Public) parts.Add(Keyword(member, member.DeclaredAccessibility));
        if (member is IFieldSymbol field)
        {
            if (field.IsConst) parts.Add("const");
            if (field.IsStatic && !field.IsConst) parts.Add("static");
            if (field.IsReadOnly) parts.Add("readonly");
            if (field.IsVolatile) parts.Add("volatile");
            if (field.IsRequired) parts.Add("required");
        }
        else if (type.TypeKind == TypeKind.Interface)
        {
            if (member.IsStatic) parts.Add(member.IsAbstract ? "static abstract" : member.IsVirtual ? "static virtual" : "static");
        }
        else
        {
            if (member.IsStatic) parts.Add("static");
            if (member.IsAbstract) parts.Add("abstract");
            else if (member.IsOverride) parts.Add(member.IsSealed ? "sealed override" : "override");
            else if (member.IsVirtual) parts.Add("virtual");
            if (member is IPropertySymbol { IsRequired: true }) parts.Add("required");
        }
        return parts.Count == 0 ? "" : string.Join(" ", parts) + " ";
    }

    /// <summary>The accessors a caller can use, such as <c>{ get; init; }</c> or <c>{ get; protected set; }</c>.</summary>
    private static string Accessors(INamedTypeSymbol type, IPropertySymbol property)
    {
        var parts = new List<string>();
        void Add(IMethodSymbol? accessor, string keyword)
        {
            if (accessor is null || !IsVisible(type, accessor)) return;
            var prefix = accessor.DeclaredAccessibility == property.DeclaredAccessibility ? "" : Keyword(accessor, accessor.DeclaredAccessibility) + " ";
            parts.Add($"{prefix}{keyword};");
        }
        Add(property.GetMethod, "get");
        Add(property.SetMethod, property.SetMethod is { IsInitOnly: true } ? "init" : "set");
        return $" {{ {string.Join(" ", parts)} }}";
    }

    private static string Keyword(ISymbol member, Accessibility accessibility) => accessibility switch
    {
        Accessibility.Public => "public",
        Accessibility.Protected => "protected",
        Accessibility.ProtectedOrInternal => "protected internal",
        _ => throw ExtractException.At(member, $"{accessibility} members aren't documented"),
    };

    /// <summary>The <c>deprecated</c> value of a symbol or overload group: the <see cref="ObsoleteAttribute"/> message, empty without one, or null.</summary>
    private static string? Deprecated(ISymbol owner, IReadOnlyList<ISymbol> symbols)
    {
        var values = symbols.Select(ObsoleteMessage).Distinct().ToList();
        if (values.Count > 1)
            throw ExtractException.At(owner, "only some overloads are obsolete, or their messages differ; obsolete every overload with one message, or rename the obsolete ones");
        return values[0];
    }

    private static AttributeData? ObsoleteAttribute(ISymbol symbol) =>
        symbol.GetAttributes().FirstOrDefault(item => item.AttributeClass?.ToDisplayString() == "System.ObsoleteAttribute");

    /// <summary>A symbol's <see cref="ObsoleteAttribute"/> in C# syntax, such as <c>[Obsolete("Use Fid.")]</c>, or null.</summary>
    private static string? ObsoleteSyntax(ISymbol symbol)
    {
        if (ObsoleteAttribute(symbol) is not { } attribute) return null;
        var arguments = attribute.ConstructorArguments.Select(argument => argument.ToCSharpString())
            .Concat(attribute.NamedArguments.Select(pair => $"{pair.Key} = {pair.Value.ToCSharpString()}"))
            .ToList();
        return arguments.Count == 0 ? "[Obsolete]" : $"[Obsolete({string.Join(", ", arguments)})]";
    }

    private static string? ObsoleteMessage(ISymbol symbol)
    {
        var attribute = ObsoleteAttribute(symbol);
        if (attribute is null) return null;
        return attribute.ConstructorArguments.Length > 0 && attribute.ConstructorArguments[0].Value is string { Length: > 0 } message
            ? DocComments.EscapeText(message.Trim())
            : "";
    }
}
