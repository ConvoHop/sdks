using System.Linq;
using Xunit;

namespace ConvoHop.Docgen.Tests;

public sealed class SurfaceTests
{
    [Fact]
    public void ListsVisibleMembersInDeclarationOrder()
    {
        var client = Lib.Symbol("Client", """
            using System.Threading;
            using System.Threading.Tasks;

            namespace Lib
            {
                /// <summary>A client.</summary>
                public sealed class Client
                {
                    /// <summary>Creates a client.</summary>
                    /// <param name="name">The name.</param>
                    public Client(string name) { Name = name; }

                    /// <summary>The name.</summary>
                    public string Name { get; }

                    /// <summary>The note.</summary>
                    public string? Note { get; init; }

                    /// <summary>Sends text.</summary>
                    /// <param name="text">The text.</param>
                    /// <param name="cancellationToken">Cancels the send.</param>
                    /// <returns>The message ID.</returns>
                    public Task<string> SendAsync(string text, CancellationToken cancellationToken = default) => Task.FromResult(text);

                    internal void Hidden() { }

                    private int count;

                    /// <summary>The most messages.</summary>
                    public const int Limit = 10;

                    /// <summary>Creates a default client.</summary>
                    public static Client Create() => new Client("x");

                    /// <summary>Protected members of sealed classes aren't visible.</summary>
                    private protected void Internal() { }
                }
            }
            """);

        Assert.Equal("class", client.Kind);
        Assert.Equal(new[] { "public sealed class Client" }, client.Signatures);
        Assert.Equal("A client.", client.Docs);
        Assert.Equal(new[] { "Client", "Name", "Note", "SendAsync", "Limit", "Create" }, client.Members!.Select(member => member.Name));
        var constructor = Lib.Member(client, "Client");
        Assert.Equal("constructor", constructor.Kind);
        Assert.Equal(new[] { "public Client(string name);" }, constructor.Signatures);
        Assert.Equal("Creates a client.\n\nParameters:\n\n- `name`: The name.", constructor.Docs);
        Assert.Equal(new[] { "public string Name { get; }" }, Lib.Member(client, "Name").Signatures);
        Assert.Equal(new[] { "public string? Note { get; init; }" }, Lib.Member(client, "Note").Signatures);
        var send = Lib.Member(client, "SendAsync");
        Assert.Equal("method", send.Kind);
        Assert.False(send.Static);
        Assert.Equal(new[] { "public Task<string> SendAsync(string text, CancellationToken cancellationToken = default);" }, send.Signatures);
        Assert.Equal(
            "Sends text.\n\nParameters:\n\n- `text`: The text.\n- `cancellationToken`: Cancels the send.\n\nReturns: The message ID.",
            send.Docs);
        var limit = Lib.Member(client, "Limit");
        Assert.Equal(("property", true), (limit.Kind, limit.Static));
        Assert.Equal(new[] { "public const int Limit = 10;" }, limit.Signatures);
        var create = Lib.Member(client, "Create");
        Assert.True(create.Static);
        Assert.Equal(new[] { "public static Client Create();" }, create.Signatures);
    }

    [Fact]
    public void ShowsGenericsVarianceAndConstraints()
    {
        var package = Lib.Package("""
            namespace Lib
            {
                /// <summary>Reads items.</summary>
                /// <typeparam name="T">The item type.</typeparam>
                public interface IReader<out T> where T : class
                {
                    /// <summary>Reads one.</summary>
                    T Read();

                    /// <summary>Converts one.</summary>
                    /// <typeparam name="TOther">The result type.</typeparam>
                    TOther Convert<TOther>() where TOther : notnull, new();
                }

                /// <summary>A page.</summary>
                /// <typeparam name="T">The item type.</typeparam>
                public sealed class Page<T> : IReader<T> where T : class, System.IDisposable
                {
                    /// <inheritdoc/>
                    public T Read() => null!;

                    /// <inheritdoc/>
                    public TOther Convert<TOther>() where TOther : notnull, new() => new TOther();
                }
            }
            """);

        var reader = Assert.Single(package.Symbols, symbol => symbol.Name == "IReader<T>");
        Assert.Equal(("interface", "public interface IReader<out T> where T : class"), (reader.Kind, Assert.Single(reader.Signatures)));
        Assert.Equal("Reads items.\n\nType parameters:\n\n- `T`: The item type.", reader.Docs);
        Assert.Equal(new[] { "T Read();" }, Lib.Member(reader, "Read").Signatures);
        Assert.Equal(new[] { "TOther Convert<TOther>() where TOther : notnull, new();" }, Lib.Member(reader, "Convert").Signatures);
        var page = Assert.Single(package.Symbols, symbol => symbol.Name == "Page<T>");
        Assert.Equal(new[] { "public sealed class Page<T> : IReader<T> where T : class, IDisposable" }, page.Signatures);
        Assert.Equal("Converts one.\n\nType parameters:\n\n- `TOther`: The result type.", Lib.Member(page, "Convert").Docs);
    }

    [Fact]
    public void ListsImplicitAndProtectedConstructors()
    {
        var package = Lib.Package("""
            namespace Lib
            {
                /// <summary>Options.</summary>
                public sealed class Options
                {
                    /// <summary>The limit.</summary>
                    public int Limit { get; set; }
                }

                /// <summary>A handler.</summary>
                public abstract class Handler
                {
                    /// <summary>Creates a handler.</summary>
                    protected Handler() { }

                    /// <summary>Handles one item.</summary>
                    protected abstract void Handle();

                    /// <summary>The state.</summary>
                    public string State { get; protected set; } = "";
                }

                /// <summary>A value.</summary>
                public struct Value
                {
                    /// <summary>The amount.</summary>
                    public int Amount;
                }
            }
            """);

        var options = Assert.Single(package.Symbols, symbol => symbol.Name == "Options");
        Assert.Equal(new[] { "Options", "Limit" }, options.Members!.Select(member => member.Name));
        Assert.Equal(new[] { "public Options();" }, Lib.Member(options, "Options").Signatures);
        Assert.Equal("", Lib.Member(options, "Options").Docs);
        Assert.Equal(new[] { "public int Limit { get; set; }" }, Lib.Member(options, "Limit").Signatures);
        var handler = Assert.Single(package.Symbols, symbol => symbol.Name == "Handler");
        Assert.Equal(new[] { "public abstract class Handler" }, handler.Signatures);
        Assert.Equal(new[] { "protected Handler();" }, Lib.Member(handler, "Handler").Signatures);
        Assert.Equal(new[] { "protected abstract void Handle();" }, Lib.Member(handler, "Handle").Signatures);
        Assert.Equal(new[] { "public string State { get; protected set; }" }, Lib.Member(handler, "State").Signatures);
        var value = Assert.Single(package.Symbols, symbol => symbol.Name == "Value");
        Assert.Equal(("struct", "public struct Value"), (value.Kind, Assert.Single(value.Signatures)));
        Assert.Equal(new[] { "public int Amount;" }, Assert.Single(value.Members!).Signatures);
    }

    [Fact]
    public void MergesOverloads()
    {
        var send = Lib.Member(Lib.Symbol("Sender", """
            namespace Lib
            {
                /// <summary>Sends.</summary>
                public static class Sender
                {
                    /// <summary>Sends text.</summary>
                    /// <param name="text">The text.</param>
                    public static void Send(string text) { }

                    /// <summary>Sends text.</summary>
                    /// <param name="text">The text.</param>
                    /// <param name="count">How many times.</param>
                    public static void Send(string text, int count) { }
                }
            }
            """), "Send");

        Assert.True(send.Static);
        Assert.Equal(new[] { "public static void Send(string text);", "public static void Send(string text, int count);" }, send.Signatures);
        Assert.Equal("Sends text.\n\nParameters:\n\n- `text`: The text.\n- `count`: How many times.", send.Docs);
    }

    [Fact]
    public void ShowsTheTypeOfParametersThatOverloadsDocumentDifferently()
    {
        var verify = Lib.Member(Lib.Symbol("Verifier", """
            namespace Lib
            {
                /// <summary>Verifies.</summary>
                public static class Verifier
                {
                    /// <summary>Verifies a body.</summary>
                    /// <param name="body">The decoded body.</param>
                    /// <param name="secret">The secret.</param>
                    public static void Verify(string body, string secret) { }

                    /// <summary>Verifies a body.</summary>
                    /// <param name="body">The body bytes.</param>
                    /// <param name="secret">The secret.</param>
                    public static void Verify(System.ReadOnlySpan<byte> body, string secret) { }
                }
            }
            """), "Verify");

        Assert.Equal(
            "Verifies a body.\n\nParameters:\n\n- `body` (`string`): The decoded body.\n- `body` (`ReadOnlySpan<byte>`): The body bytes.\n- `secret`: The secret.",
            verify.Docs);
    }

    [Fact]
    public void ListsInheritedMembersAfterOwnOnes()
    {
        var package = Lib.Package("""
            namespace Lib
            {
                /// <summary>An event.</summary>
                public abstract class Event
                {
                    private protected Event() { }

                    /// <summary>The event ID.</summary>
                    public string Id => "";

                    /// <summary>Whether this SDK knows the event.</summary>
                    public abstract bool Known { get; }

                    /// <summary>Not inherited.</summary>
                    public static Event? Parse(string text) => null;
                }

                /// <summary>A created event.</summary>
                public sealed class Created : Event
                {
                    internal Created() { }

                    /// <inheritdoc/>
                    public override bool Known => true;
                }

                /// <summary>Reads.</summary>
                public interface IRead
                {
                    /// <summary>Reads one.</summary>
                    string Read();
                }

                /// <summary>Reads and writes.</summary>
                public interface IStore : IRead
                {
                    /// <summary>Writes one.</summary>
                    /// <param name="value">The value.</param>
                    void Write(string value);
                }
            }
            """);

        var created = Assert.Single(package.Symbols, symbol => symbol.Name == "Created");
        Assert.Equal(new[] { "public sealed class Created : Event" }, created.Signatures);
        Assert.Equal(new[] { "Known", "Id" }, created.Members!.Select(member => member.Name));
        var known = Lib.Member(created, "Known");
        Assert.Equal(new[] { "public override bool Known { get; }" }, known.Signatures);
        Assert.Equal(("Whether this SDK knows the event.", (string?)null), (known.Docs, known.Inherited));
        var id = Lib.Member(created, "Id");
        Assert.Equal(("Event", "The event ID."), (id.Inherited, id.Docs));
        var store = Assert.Single(package.Symbols, symbol => symbol.Name == "IStore");
        Assert.Equal(new[] { "public interface IStore : IRead" }, store.Signatures);
        Assert.Equal(new[] { ("Write", (string?)null), ("Read", "IRead") }, store.Members!.Select(member => (member.Name, member.Inherited)));
    }

    [Fact]
    public void FailsWhenOverloadsSpanBaseTypes()
    {
        var message = Lib.Fails("""
            namespace Lib
            {
                /// <summary>A base.</summary>
                public class Base
                {
                    /// <summary>Runs a number.</summary>
                    public void Run(int value) { }
                }

                /// <summary>A derived type.</summary>
                public class Derived : Base
                {
                    /// <summary>Runs text.</summary>
                    public void Run(string value) { }
                }
            }
            """);

        Assert.StartsWith("src/Lib/File0.cs:7: ", message);
        Assert.Contains("Derived overloads Run across base types", message);
    }

    [Fact]
    public void ListsEnumCases()
    {
        var kind = Lib.Symbol("Kind", """
            namespace Lib
            {
                /// <summary>Kinds.</summary>
                public enum Kind : byte
                {
                    /// <summary>The first.</summary>
                    First = 1,
                    Second,
                }

                /// <summary>Default-sized.</summary>
                public enum Plain { One }
            }
            """);

        Assert.Equal(("enum", "public enum Kind : byte"), (kind.Kind, Assert.Single(kind.Signatures)));
        Assert.Equal(
            new[] { ("First", "case", "First = 1", "The first.", false), ("Second", "case", "Second = 2", "", false) },
            kind.Members!.Select(member => (member.Name, member.Kind, Assert.Single(member.Signatures), member.Docs, member.Static)));
    }
}
