using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Numerics;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ConvoHop.Internal
{
    // How each next cursor must relate to the cursor it follows.
    internal enum PageOrder
    {
        // Opaque cursors: the next cursor must differ.
        Opaque,

        // Decimal cursors that must increase.
        Ascending,

        // Decimal cursors that must decrease.
        Descending,
    }

    // The pages of a cursor-paginated query, requested lazily for the generated ...PagesAsync methods.
    //
    // The first request sends the input unchanged. Each later request replaces the cursor field with the previous page's
    // next cursor, and enumeration ends after a complete page. Every request has a new request ID. Each enumerator starts
    // again from the input and keeps its own position; an enumerator is not thread-safe.
    //
    // The cursor is never reset silently. A page that requires a refresh fails with InvalidOperationException. An
    // incomplete page whose next cursor is missing, malformed or does not advance fails with the executor's invalid-response
    // failure. Both are final: the enumerator throws them again. A request that fails leaves the position unchanged, so
    // calling MoveNextAsync again repeats it.
    internal static class PageSequence
    {
        // Validates and copies the input now; sends nothing until enumeration starts.
        internal static IAsyncEnumerable<TPage> Create<TInput, TResult, TPage>(IOperationExecutor executor,
            OperationDescriptor<TInput, TResult> operation, TInput input, string cursorField, TypeShape cursor, PageOrder order,
            Func<TResult, TPage?> page, Func<TPage, bool> complete, Func<TPage, bool> refreshRequired,
            Func<TPage, string?> nextCursor, CancellationToken cancellationToken)
            where TPage : class
        {
            if (input is null && operation.InputRequired) throw new ArgumentNullException(nameof(input));
            JsonElement json = executor.Serialize(input);
            string? initial = null;
            if (json.TryGetProperty(cursorField, out JsonElement value) && value.ValueKind != JsonValueKind.Null)
            {
                initial = ReadString(value);
                if (initial == null || !cursor.AcceptsString(initial))
                    throw new ArgumentException("Invalid " + cursorField + " cursor", nameof(input));
            }

            return new Sequence<TInput, TResult, TPage>(executor, operation, json, cursorField, cursor, order, page, complete,
                refreshRequired, nextCursor, initial, cancellationToken);
        }

        private static string? ReadString(JsonElement value)
        {
            if (value.ValueKind != JsonValueKind.String) return null;
            try
            {
                return value.GetString();
            }
            catch (InvalidOperationException)
            {
                return null;
            }
        }

        // The input with the cursor field set, in the input's property order.
        private static bool TryWithCursor(JsonElement input, string field, string cursor, out JsonElement request)
        {
            request = default;
            try
            {
                using (var buffer = new MemoryStream())
                {
                    using (var writer = new Utf8JsonWriter(buffer))
                    {
                        writer.WriteStartObject();
                        bool written = false;
                        foreach (JsonProperty property in input.EnumerateObject())
                        {
                            if (!property.NameEquals(field))
                            {
                                property.WriteTo(writer);
                            }
                            else if (!written)
                            {
                                writer.WriteString(field, cursor);
                                written = true;
                            }
                        }

                        if (!written) writer.WriteString(field, cursor);
                        writer.WriteEndObject();
                    }

                    using (JsonDocument document = JsonDocument.Parse(buffer.ToArray()))
                    {
                        request = document.RootElement.Clone();
                        return true;
                    }
                }
            }
            catch (ArgumentException)
            {
                // Invalid UTF-16 in the cursor.
                return false;
            }
        }

        private sealed class Sequence<TInput, TResult, TPage> : IAsyncEnumerable<TPage>
            where TPage : class
        {
            private readonly IOperationExecutor _executor;
            private readonly OperationDescriptor<TInput, TResult> _operation;
            private readonly JsonElement _input;
            private readonly string _cursorField;
            private readonly TypeShape _cursor;
            private readonly PageOrder _order;
            private readonly Func<TResult, TPage?> _page;
            private readonly Func<TPage, bool> _complete;
            private readonly Func<TPage, bool> _refreshRequired;
            private readonly Func<TPage, string?> _nextCursor;
            private readonly string? _initial;
            private readonly CancellationToken _cancellationToken;

            internal Sequence(IOperationExecutor executor, OperationDescriptor<TInput, TResult> operation, JsonElement input,
                string cursorField, TypeShape cursor, PageOrder order, Func<TResult, TPage?> page, Func<TPage, bool> complete,
                Func<TPage, bool> refreshRequired, Func<TPage, string?> nextCursor, string? initial,
                CancellationToken cancellationToken)
            {
                _executor = executor;
                _operation = operation;
                _input = input;
                _cursorField = cursorField;
                _cursor = cursor;
                _order = order;
                _page = page;
                _complete = complete;
                _refreshRequired = refreshRequired;
                _nextCursor = nextCursor;
                _initial = initial;
                _cancellationToken = cancellationToken;
            }

            public IAsyncEnumerator<TPage> GetAsyncEnumerator(CancellationToken cancellationToken = default) =>
                new Enumerator(this, cancellationToken);

            private bool Advances(string previous, string next)
            {
                if (_order == PageOrder.Opaque) return !string.Equals(previous, next, StringComparison.Ordinal);
                if (!BigInteger.TryParse(previous, NumberStyles.None, CultureInfo.InvariantCulture, out BigInteger before) ||
                    !BigInteger.TryParse(next, NumberStyles.None, CultureInfo.InvariantCulture, out BigInteger after))
                {
                    return false;
                }

                int comparison = after.CompareTo(before);
                return _order == PageOrder.Ascending ? comparison > 0 : comparison < 0;
            }

            private sealed class Enumerator : IAsyncEnumerator<TPage>
            {
                private readonly Sequence<TInput, TResult, TPage> _owner;
                private readonly CancellationTokenSource? _linked;
                private readonly CancellationToken _token;
                private JsonElement _request;
                private string? _position;
                private TPage? _current;
                private ExceptionDispatchInfo? _failure;
                private bool _finished;
                private bool _disposed;
                private int _busy;

                internal Enumerator(Sequence<TInput, TResult, TPage> owner, CancellationToken cancellationToken)
                {
                    _owner = owner;
                    _request = owner._input;
                    _position = owner._initial;
                    CancellationToken method = owner._cancellationToken;
                    if (method.CanBeCanceled && cancellationToken.CanBeCanceled && method != cancellationToken)
                    {
                        _linked = CancellationTokenSource.CreateLinkedTokenSource(method, cancellationToken);
                        _token = _linked.Token;
                    }
                    else
                    {
                        _token = cancellationToken.CanBeCanceled ? cancellationToken : method;
                    }
                }

                public TPage Current => _current!;

                public async ValueTask<bool> MoveNextAsync()
                {
                    if (_disposed) throw new ObjectDisposedException(nameof(PageSequence));
                    _failure?.Throw();
                    if (_finished)
                    {
                        _current = null;
                        return false;
                    }

                    if (Interlocked.Exchange(ref _busy, 1) != 0) throw new InvalidOperationException("A page request is already in progress");
                    try
                    {
                        _token.ThrowIfCancellationRequested();
                        Sequence<TInput, TResult, TPage> owner = _owner;
                        string requestId = Protocol.NewId();
                        TResult reply = await owner._executor.ExecuteJsonAsync(owner._operation, _request, requestId, _token)
                            .ConfigureAwait(false);
                        TPage? page = owner._page(reply);
                        if (page == null) throw Fail(owner._executor.InvalidResponse(requestId, "Missing current authority result"));
                        if (owner._refreshRequired(page)) throw Fail(new InvalidOperationException("Explicit authorized resynchronization required"));
                        if (owner._complete(page))
                        {
                            _finished = true;
                            _current = page;
                            return true;
                        }

                        string? next = owner._nextCursor(page);
                        if (next == null) throw Fail(owner._executor.InvalidResponse(requestId, "Incomplete page has no next cursor"));
                        if (!owner._cursor.AcceptsString(next) || !TryWithCursor(owner._input, owner._cursorField, next, out JsonElement following))
                            throw Fail(owner._executor.InvalidResponse(requestId, "Malformed next cursor"));
                        if (_position != null && !owner.Advances(_position, next))
                            throw Fail(owner._executor.InvalidResponse(requestId, "Incomplete page did not advance the cursor"));
                        _position = next;
                        _request = following;
                        _current = page;
                        return true;
                    }
                    finally
                    {
                        Volatile.Write(ref _busy, 0);
                    }
                }

                public ValueTask DisposeAsync()
                {
                    if (Volatile.Read(ref _busy) != 0) throw new InvalidOperationException("A page request is still in progress");
                    if (!_disposed)
                    {
                        _disposed = true;
                        _linked?.Dispose();
                    }

                    return default;
                }

                private Exception Fail(Exception error)
                {
                    _failure = ExceptionDispatchInfo.Capture(error);
                    return error;
                }
            }
        }
    }
}
