using Xunit;

namespace ConvoHop.Docgen.Tests;

public sealed class DocCommentTests
{
    private static string Summary(string summary, string members = "") => Lib.Symbol("Box<T>", $$"""
        using System;
        using System.Threading;

        namespace Lib
        {
            /// <summary>{{summary.Replace("\n", "\n/// ")}}</summary>
            public sealed class Box<T>
            {
                {{members}}
            }

            /// <summary>Another type.</summary>
            public sealed class Other
            {
                /// <summary>Creates one.</summary>
                public Other() { }

                /// <summary>Runs.</summary>
                public void Run() { }
            }
        }
        """).Docs;

    [Fact]
    public void EscapesMarkdownInText()
    {
        Assert.Equal(
            """Use \*stars\*, snake_case, \_under\_, \[brackets\], back\\slash, \`tick\`, \~tilde\~, \&copy; & more, <T> and {braces}.""",
            Summary("""Use *stars*, snake_case, _under_, [brackets], back\slash, `tick`, ~tilde~, &amp;copy; &amp; more, &lt;T&gt; and {braces}."""));
    }

    [Theory]
    [InlineData("# not a heading", "\\# not a heading")]
    [InlineData("> not a quote", "\\> not a quote")]
    [InlineData("- not a list", "\\- not a list")]
    [InlineData("+ not a list", "\\+ not a list")]
    [InlineData("12. not a list", "12\\. not a list")]
    [InlineData("3) not a list", "3\\) not a list")]
    [InlineData("2024 was a year", "2024 was a year")]
    public void EscapesBlockSyntaxAtParagraphStarts(string text, string expected)
    {
        Assert.Equal(expected, Summary(text));
        Assert.Equal($"First.\n\n{expected}", Summary($"First.<para>{text}</para>"));
    }

    [Fact]
    public void CollapsesWhitespaceAndSplitsParagraphs()
    {
        Assert.Equal(
            "One line across lines.\n\nA second paragraph with `a` `b`.\n\nAfter it.",
            Summary("""
                One line
                    across   lines.
                <para>A second paragraph
                with <c>a</c> <c>b</c>.</para>
                <para>  </para>
                After it.
                """));
    }

    [Fact]
    public void RendersInlineTags()
    {
        var docs = Lib.Docs("""
            namespace Lib
            {
                /// <summary>A box.</summary>
                public sealed class Box
                {
                    /// <summary>
                    /// Puts <paramref name="value"/> of type <typeparamref name="TValue"/>, or <see langword="null"/>, with
                    /// <c>  x  =&gt;  `y` </c> code. See <see href="https://example.com/docs?a=1&amp;b=2">the docs</see> or
                    /// <see href="https://example.com"/>.
                    /// </summary>
                    /// <typeparam name="TValue">The value type.</typeparam>
                    /// <param name="value">The value.</param>
                    public void Put<TValue>(TValue value) { }
                }
            }
            """, "Put");

        Assert.Equal(
            "Puts `value` of type `TValue`, or `null`, with `` x => `y` `` code. See [the docs](https://example.com/docs?a=1&b=2) or <https://example.com>."
                + "\n\nType parameters:\n\n- `TValue`: The value type.\n\nParameters:\n\n- `value`: The value.",
            docs);
    }

    [Fact]
    public void ShowsCrefsByTheirShortestClearName()
    {
        Assert.Equal(
            "`Other`, `Other`, `Other.Run`, `Count`, `Box<T>`, `CancellationToken.None`, `string`, `Lib`, `ToString` and the other one.",
            Summary(
                """<see cref="Other"/>, <see cref="Other()"/>, <see cref="Other.Run"/>, <see cref="Count"/>, <see cref="Box{T}"/>, <see cref="CancellationToken.None"/>, <see cref="string"/>, <see cref="Lib"/>, <see cref="object.ToString"/> and <see cref="Other">the other one</see>.""",
                """
                /// <summary>The count.</summary>
                public int Count => 0;
                """));
    }

    [Fact]
    public void ListsExceptionsAndRemarks()
    {
        var docs = Lib.Docs("""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <summary>Runs.</summary>
                    /// <param name="name">The name.</param>
                    /// <returns>The result.</returns>
                    /// <exception cref="System.ArgumentNullException"><paramref name="name"/> is null.</exception>
                    /// <exception cref="System.InvalidOperationException">
                    /// The client is closed.
                    /// <para>Create another.</para>
                    /// </exception>
                    /// <remarks>Runs once.</remarks>
                    public int Run(string name) => 0;

                    /// <summary>The limit.</summary>
                    /// <value>At least one.</value>
                    public int Limit => 1;
                }
            }
            """, "Run");

        Assert.Equal(
            "Runs.\n\nParameters:\n\n- `name`: The name.\n\nReturns: The result.\n\nExceptions:\n\n- `ArgumentNullException`: `name` is null.\n"
                + "- `InvalidOperationException`: The client is closed.\n\n  Create another.\n\nRuns once.",
            docs);
    }

    [Fact]
    public void ShowsValueSections()
    {
        Assert.Equal("The limit.\n\nValue: At least one.", Lib.Docs("""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <summary>The limit.</summary>
                    /// <value>At least one.</value>
                    public int Limit => 1;
                }
            }
            """, "Limit"));
    }

    [Fact]
    public void LeavesUndocumentedSymbolsEmpty()
    {
        Assert.Equal("", Lib.Docs("""
            namespace Lib
            {
                public static class Client { }
            }
            """));
    }
}
