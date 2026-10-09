using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace ConvoHop.Docgen.Tests;

/// <summary>Extracts in-memory sources as the <c>Lib</c> project, for both target frameworks the SDK has.</summary>
internal static class Lib
{
    public static readonly string[] Frameworks = ["netstandard2.0", "net10.0"];

    public static IReadOnlyList<SourceFile> Sources(params string[] texts) =>
        texts.Select((text, index) => new SourceFile($"src/Lib/File{index}.cs", text)).ToList();

    public static IReadOnlyList<SurfacePackage> Extract(string[] namespaces, params string[] texts) =>
        LanguageExtractor.ExtractPackages("Lib", namespaces, Sources(texts), Frameworks);

    /// <summary>The surface of namespace <c>Lib</c>.</summary>
    public static SurfacePackage Package(params string[] texts) => Extract(["Lib"], texts)[0];

    public static SurfaceSymbol Symbol(string name, params string[] texts) =>
        Assert.Single(Package(texts).Symbols, symbol => symbol.Name == name);

    public static SurfaceMember Member(SurfaceSymbol symbol, string name) =>
        Assert.Single(symbol.Members ?? [], member => member.Name == name);

    /// <summary>The docs of the only type in namespace <c>Lib</c>, or of its member when one is named.</summary>
    public static string Docs(string source, string? member = null)
    {
        var symbol = Assert.Single(Package(source).Symbols);
        return member is null ? symbol.Docs : Member(symbol, member).Docs;
    }

    public static string Fails(params string[] texts) =>
        Assert.Throws<ExtractException>(() => Package(texts)).Message;
}
