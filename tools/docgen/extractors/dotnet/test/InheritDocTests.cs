using Xunit;

namespace ConvoHop.Docgen.Tests;

public sealed class InheritDocTests
{
    [Fact]
    public void CopiesInterfaceDocsAndRenamesParameters()
    {
        var store = Lib.Symbol("FileStore", """
            namespace Lib
            {
                /// <summary>A store.</summary>
                public interface IStore
                {
                    /// <summary>Writes <paramref name="value"/> under <paramref name="key"/>.</summary>
                    /// <param name="key">The key.</param>
                    /// <param name="value">The value.</param>
                    /// <remarks>Durable.</remarks>
                    void Write(string key, string value);
                }

                /// <inheritdoc/>
                public sealed class FileStore : IStore
                {
                    /// <inheritdoc/>
                    /// <remarks>Writes a file.</remarks>
                    public void Write(string name, string text) { }
                }
            }
            """);

        Assert.Equal("A store.", store.Docs);
        Assert.Equal(
            "Writes `text` under `name`.\n\nParameters:\n\n- `name`: The key.\n- `text`: The value.\n\nWrites a file.",
            Lib.Member(store, "Write").Docs);
    }

    [Fact]
    public void CopiesFromACref()
    {
        var client = Lib.Symbol("Client", """
            namespace Lib
            {
                /// <summary>Helpers.</summary>
                public static class Helpers
                {
                    /// <summary>Sends text.</summary>
                    /// <param name="text">The text.</param>
                    /// <exception cref="System.ArgumentException">The text is empty.</exception>
                    public static void Send(string text) { }
                }

                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <inheritdoc cref="Helpers.Send(string)"/>
                    /// <exception cref="System.InvalidOperationException">The client is closed.</exception>
                    public void Send(string text) { }
                }
            }
            """);

        Assert.Equal(
            "Sends text.\n\nParameters:\n\n- `text`: The text.\n\nExceptions:\n\n- `InvalidOperationException`: The client is closed.\n- `ArgumentException`: The text is empty.",
            Lib.Member(client, "Send").Docs);
    }

    [Fact]
    public void FailsForDocsOutsideThePackage()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <inheritdoc/>
                    public override string ToString() => "";
                }
            }
            """);

        Assert.Equal("src/Lib/File0.cs:7: Lib.Client.ToString(): <inheritdoc/> copies from object.ToString(), which isn't in this package; write the documentation out", message);
    }

    [Fact]
    public void FailsWithNothingToInherit()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <inheritdoc/>
                    public void Run() { }
                }
            }
            """);

        Assert.EndsWith("Lib.Client.Run(): <inheritdoc/> has nothing to inherit from; write the documentation out, or give it a cref", message);
    }

    [Fact]
    public void FailsOnCycles()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <inheritdoc cref="Stop"/>
                    public void Run() { }

                    /// <inheritdoc cref="Run"/>
                    public void Stop() { }
                }
            }
            """);

        Assert.EndsWith(": <inheritdoc> forms a cycle", message);
    }
}
