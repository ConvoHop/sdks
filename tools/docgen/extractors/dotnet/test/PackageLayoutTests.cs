using System.Linq;
using Xunit;

namespace ConvoHop.Docgen.Tests;

public sealed class PackageLayoutTests
{
    [Fact]
    public void NamesNestedTypesWithTheirContainingTypes()
    {
        var package = Lib.Package("""
            namespace Lib
            {
                /// <summary>The operations.</summary>
                public static class Operations
                {
                    /// <summary>Communication operations.</summary>
                    public static class Communication
                    {
                        /// <summary>The send operation.</summary>
                        public static string Send => "send";
                    }

                    private static class Hidden { }
                }
            }
            """);

        Assert.Equal(new[] { "Operations", "Operations.Communication" }, package.Symbols.Select(symbol => symbol.Name));
        Assert.Null(package.Symbols[0].Members);
        Assert.Equal(new[] { "public static class Operations.Communication" }, package.Symbols[1].Signatures);
        var send = Assert.Single(package.Symbols[1].Members!);
        Assert.Equal(("Send", true, "public static string Send { get; }"), (send.Name, send.Static, Assert.Single(send.Signatures)));
    }

    [Fact]
    public void MakesOnePackagePerNamespaceInTheGivenOrder()
    {
        var packages = Lib.Extract(["Lib", "Lib.Models"], """
            namespace Lib.Models
            {
                /// <summary>A model.</summary>
                public sealed class Model { }
            }
            """, """
            namespace Lib
            {
                /// <summary>Uses <see cref="Models.Model"/>.</summary>
                public static class Zeta { }

                /// <summary>First by name.</summary>
                public static class Alpha { }
            }
            """);

        Assert.Equal(new[] { "Lib", "Lib.Models" }, packages.Select(package => package.Name));
        Assert.Equal(new[] { "Alpha", "Zeta" }, packages[0].Symbols.Select(symbol => symbol.Name));
        Assert.Equal("Uses `Model`.", packages[0].Symbols[1].Docs);
        Assert.Equal("Model", Assert.Single(packages[1].Symbols).Name);
    }

    [Fact]
    public void FailsForPublicTypesOutsideTheListedNamespaces()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>Listed.</summary>
                public static class Listed { }
            }

            namespace Other
            {
                /// <summary>Not listed.</summary>
                public static class Unlisted { }
            }
            """);

        Assert.Equal("src/Lib/File0.cs:10: Other.Unlisted: namespace Other isn't a package in language.json; list it, or make the type internal", message);
    }

    [Fact]
    public void FailsForAnEmptyNamespace()
    {
        var error = Assert.Throws<ExtractException>(() => Lib.Extract(["Lib", "Lib.Empty"], """
            namespace Lib
            {
                /// <summary>Listed.</summary>
                public static class Listed { }
            }
            """));

        Assert.Equal("Lib: namespace Lib.Empty has no public types", error.Message);
    }

    [Fact]
    public void FailsWhenTargetFrameworksDiffer()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
            #if NET10_0_OR_GREATER
                    /// <summary>Only on .NET 10.</summary>
                    public void Modern() { }
            #endif
                }
            }
            """);

        Assert.Equal("Lib#Client differs between netstandard2.0 and net10.0; every target framework must have the same public API and docs", message);
    }

    [Fact]
    public void CompilesEachFrameworkWithItsPreprocessorSymbols()
    {
        var symbol = Lib.Symbol("Client", """
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
            #if NETSTANDARD2_0
                    /// <summary>Gets the name.</summary>
                    public string Name => "";
            #elif NET10_0_OR_GREATER && RELEASE
                    /// <summary>Gets the name.</summary>
                    public string Name => "modern";
            #endif
                }
            }
            """);

        Assert.Equal(new[] { "Client", "Name" }, symbol.Members!.Select(member => member.Name));
    }

    [Fact]
    public void FailsOnSyntaxErrors()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                public sealed class Client
                {
                    public void Run( { }
                }
            }
            """);

        Assert.StartsWith("src/Lib/File0.cs:5: ", message);
        Assert.EndsWith("(with the netstandard2.0 preprocessor symbols)", message);
    }

    [Fact]
    public void FailsWhenASignatureTypeDoesNotResolve()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <summary>Runs.</summary>
                    public Missing Run() => null!;
                }
            }
            """);

        Assert.Equal("src/Lib/File0.cs:7: Lib.Client.Run(): type Missing doesn't resolve", message);
    }
}
