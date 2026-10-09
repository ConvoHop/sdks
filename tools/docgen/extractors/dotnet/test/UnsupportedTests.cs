using Xunit;

namespace ConvoHop.Docgen.Tests;

public sealed class UnsupportedTests
{
    [Theory]
    [InlineData("public static Client operator +(Client a, Client b) => a;", "operators aren't supported; declare a named method")]
    [InlineData("public static implicit operator string(Client client) => \"\";", "operators aren't supported; declare a named method")]
    [InlineData("public event System.EventHandler? Changed;", "events aren't supported; take a callback or return an IAsyncEnumerable")]
    [InlineData("public int this[int index] => index;", "indexers aren't supported; declare a named method")]
    public void FailsForMembersTheReferenceCannotShow(string member, string expected)
    {
        var message = Lib.Fails($$"""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    {{member}}
                }
            }
            """);

        Assert.StartsWith("src/Lib/File0.cs:6: ", message);
        Assert.EndsWith(": " + expected, message);
    }

    [Theory]
    [InlineData("public sealed record Point(int X, int Y);", "records aren't supported; declare a class or struct")]
    [InlineData("public record struct Point(int X, int Y);", "records aren't supported; declare a class or struct")]
    [InlineData("public delegate void Handler(string value);", "delegates aren't supported; use Func<> or Action<>, or an interface")]
    public void FailsForTypesTheReferenceCannotShow(string declaration, string expected)
    {
        var message = Lib.Fails($$"""
            namespace Lib
            {
                {{declaration}}
            }
            """);

        Assert.StartsWith("src/Lib/File0.cs:3: ", message);
        Assert.EndsWith(": " + expected, message);
    }

    [Fact]
    public void FailsForProtectedNestedTypes()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>A base.</summary>
                public class Base
                {
                    /// <summary>A nested type.</summary>
                    protected sealed class Nested { }
                }
            }
            """);

        Assert.Equal("src/Lib/File0.cs:7: Lib.Base.Nested: protected nested types aren't supported; make the type public or private", message);
    }

    [Fact]
    public void ShowsObsoleteMessages()
    {
        var package = Lib.Package("""
            using System;

            namespace Lib
            {
                /// <summary>An old client.</summary>
                [Obsolete("Use *Client* instead.")]
                public sealed class OldClient
                {
                    /// <summary>Runs.</summary>
                    [Obsolete]
                    public void Run() { }

                    /// <summary>Runs one.</summary>
                    /// <param name="value">The value.</param>
                    [Obsolete("Use Go.")]
                    public void Go(int value) { }

                    /// <summary>Runs one.</summary>
                    /// <param name="value">The value.</param>
                    [Obsolete("Use Go.")]
                    public void Go(string value) { }

                    /// <summary>Current.</summary>
                    public void Current() { }
                }
            }
            """);

        var client = Assert.Single(package.Symbols);
        Assert.Equal("Use \\*Client\\* instead.", client.Deprecated);
        Assert.Equal("", Lib.Member(client, "Run").Deprecated);
        Assert.Equal("Use Go.", Lib.Member(client, "Go").Deprecated);
        Assert.Null(Lib.Member(client, "Current").Deprecated);
    }

    [Fact]
    public void FailsWhenOnlySomeOverloadsAreObsolete()
    {
        var message = Lib.Fails("""
            using System;

            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <summary>Runs.</summary>
                    [Obsolete("Use Run(string).")]
                    public void Run() { }

                    /// <summary>Runs one.</summary>
                    /// <param name="value">The value.</param>
                    public void Run(string value) { }
                }
            }
            """);

        Assert.StartsWith("src/Lib/File0.cs:10: Lib.Client.Run(): only some overloads are obsolete", message);
    }
}
