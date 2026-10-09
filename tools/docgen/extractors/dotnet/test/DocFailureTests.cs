using Xunit;

namespace ConvoHop.Docgen.Tests;

public sealed class DocFailureTests
{
    private static string Fails(string comment) => Lib.Fails($$"""
        namespace Lib
        {
            /// <summary>A client.</summary>
            public sealed class Client
            {
                {{comment.Replace("\n", "\n        ")}}
                public void Run(string text) { }
            }
        }
        """);

    [Theory]
    [InlineData("/// <summary>Runs.</summary>\n/// <example>Run(\"x\");</example>", "unsupported XML doc tag <example>; document it in prose, or put example code in a tested quickstart snippet")]
    [InlineData("/// <summary>Runs <code>Run(\"x\");</code>.</summary>", "unsupported XML doc tag <code>; document it in prose, or put example code in a tested quickstart snippet")]
    [InlineData("/// <summary>Runs.</summary>\n/// <seealso cref=\"Client\"/>", "unsupported XML doc tag <seealso>; document it in prose, or put example code in a tested quickstart snippet")]
    [InlineData("/// <summary>See <see href=\"http://example.com\"/>.</summary>", "<see href=\"http://example.com\"> must be an https URL without spaces, parentheses or angle brackets")]
    [InlineData("/// <summary>See <see href=\"https://example.com/a(b)\"/>.</summary>", "<see href=\"https://example.com/a(b)\"> must be an https URL without spaces, parentheses or angle brackets")]
    [InlineData("/// <summary>See <see cref=\"Missing\"/>.</summary>", "cref Missing doesn't resolve")]
    [InlineData("/// <summary>See <see/>.</summary>", "<see> needs exactly one of cref, langword and href")]
    [InlineData("/// <summary>See <see langword=\"null\">nothing</see>.</summary>", "<see langword> can't have content")]
    [InlineData("/// <summary>Runs <c><see cref=\"Client\"/></c>.</summary>", "<c> can only contain text")]
    [InlineData("/// <summary>Runs <c> </c>.</summary>", "<c> is empty")]
    [InlineData("/// <summary>Runs.</summary>\n/// <param name=\"value\">The value.</param>", "<param name=\"value\"> doesn't match a parameter")]
    [InlineData("/// <summary>Runs.</summary>\n/// <param name=\"text\">The text.</param>\n/// <param name=\"text\">Again.</param>", "<param name=\"text\"> appears more than once")]
    [InlineData("/// <summary>Runs <paramref name=\"value\"/>.</summary>", "<paramref name=\"value\"> doesn't match a parameter")]
    [InlineData("/// <summary>Runs <typeparamref name=\"T\"/>.</summary>", "<typeparamref name=\"T\"> doesn't match a type parameter")]
    [InlineData("/// <summary>Runs.</summary>\n/// <exception>Always.</exception>", "<exception> needs a cref attribute")]
    [InlineData("/// Runs.", "text outside a doc comment tag: Runs.")]
    [InlineData("/// <inheritdoc path=\"/summary\"/>", "<inheritdoc path> isn't supported")]
    public void FailsForDocsTheReferenceCannotShow(string comment, string expected)
    {
        var message = Fails(comment);

        Assert.StartsWith("src/Lib/File0.cs:", message);
        Assert.EndsWith("Lib.Client.Run(string): " + expected, message);
    }

    [Fact]
    public void FailsForMalformedXml()
    {
        var message = Fails("/// <summary>Runs.");

        Assert.Contains("Lib.Client.Run(string): the XML doc comment isn't well formed", message);
    }
}
