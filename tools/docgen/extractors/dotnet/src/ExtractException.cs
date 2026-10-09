using System;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace ConvoHop.Docgen;

/// <summary>A declaration or input the extractor can't document. The message names the file and the declaration.</summary>
internal sealed class ExtractException : Exception
{
    public ExtractException(string message)
        : base(message)
    {
    }

    /// <summary>An error about a declaration, prefixed with its repository-relative file and line.</summary>
    public static ExtractException At(ISymbol symbol, string message)
    {
        var name = symbol.ToDisplayString(SymbolDisplayFormat.CSharpErrorMessageFormat);
        var location = symbol.Locations.FirstOrDefault(item => item.IsInSource);
        if (location is null) return new ExtractException($"{name}: {message}");
        var span = location.GetLineSpan();
        return new ExtractException($"{span.Path}:{span.StartLinePosition.Line + 1}: {name}: {message}");
    }
}
