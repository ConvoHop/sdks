package com.convohop.server.internal;

import java.math.BigInteger;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import org.jspecify.annotations.Nullable;

/**
 * The pages of a cursor-paginated query, requested lazily for the generated {@code ...Pages} methods. Not API.
 *
 * <p>The first request sends the input unchanged. Each later request replaces the cursor field with the previous page's
 * next cursor, and iteration ends after a complete page. Every request has a new request ID. Each {@link #iterator()}
 * starts again from the input and keeps its own position; an iterator is not thread-safe.
 *
 * <p>The cursor is never reset silently. A page that requires a refresh ends the iteration with an
 * {@link IllegalStateException}. An incomplete page whose next cursor is missing, malformed or does not advance ends it
 * with the executor's {@link OperationExecutor#invalidResponse invalid-response} failure. Both are final: the iterator
 * throws them again. A request that fails leaves the position unchanged, so calling {@link Iterator#hasNext()} again
 * repeats it.
 *
 * @param <R> the reply type
 * @param <P> the page type
 */
public final class Pages<R extends @Nullable Object, P> implements Iterable<P> {
  /** How each next cursor must relate to the cursor it follows. */
  public enum Order {
    /** Opaque cursors: the next cursor must differ. */
    OPAQUE,
    /** Decimal cursors that must increase. */
    ASCENDING,
    /** Decimal cursors that must decrease. */
    DESCENDING
  }

  private final OperationExecutor executor;
  private final OperationDescriptor<R> operation;
  private final Map<String, @Nullable Object> input;
  private final String cursorField;
  private final Wire.Decoder<String> cursor;
  private final Order order;
  private final Function<? super R, ? extends @Nullable P> page;
  private final Function<? super P, Boolean> complete;
  private final Function<? super P, Boolean> refreshRequired;
  private final Function<? super P, ? extends @Nullable String> nextCursor;
  private final @Nullable String initialCursor;

  private Pages(
      OperationExecutor executor,
      OperationDescriptor<R> operation,
      Map<String, @Nullable Object> input,
      String cursorField,
      Wire.Decoder<String> cursor,
      Order order,
      Function<? super R, ? extends @Nullable P> page,
      Function<? super P, Boolean> complete,
      Function<? super P, Boolean> refreshRequired,
      Function<? super P, ? extends @Nullable String> nextCursor) {
    this.executor = Objects.requireNonNull(executor, "executor");
    this.operation = Objects.requireNonNull(operation, "operation");
    this.input = input;
    this.cursorField = Objects.requireNonNull(cursorField, "cursorField");
    this.cursor = Objects.requireNonNull(cursor, "cursor");
    this.order = Objects.requireNonNull(order, "order");
    this.page = Objects.requireNonNull(page, "page");
    this.complete = Objects.requireNonNull(complete, "complete");
    this.refreshRequired = Objects.requireNonNull(refreshRequired, "refreshRequired");
    this.nextCursor = Objects.requireNonNull(nextCursor, "nextCursor");
    Object initial = input.get(cursorField);
    try {
      this.initialCursor = initial == null ? null : cursor.decode(initial, 0);
    } catch (WireException error) {
      throw new IllegalArgumentException("Invalid " + cursorField + " cursor", error);
    }
  }

  /**
   * The pages of a query. Sends nothing until iteration starts.
   *
   * @param <R> the reply type
   * @param <P> the page type
   * @param executor the executor that sends each request
   * @param operation the query
   * @param input the first page's input as JSON, or null for none
   * @param cursorField the input field that carries the cursor
   * @param cursor the decoder of the cursor input's scalar, which every next cursor must pass
   * @param order how each next cursor must relate to the cursor it follows
   * @param page the page of a reply, or null when the reply has none
   * @param complete whether a page is the last
   * @param refreshRequired whether a page requires the caller to start again from current state
   * @param nextCursor the cursor of the page after a page
   * @return the pages, in order
   * @throws IllegalArgumentException if the input's cursor does not pass {@code cursor}
   */
  public static <R extends @Nullable Object, P> Iterable<P> of(
      OperationExecutor executor,
      OperationDescriptor<R> operation,
      @Nullable Map<String, @Nullable Object> input,
      String cursorField,
      Wire.Decoder<String> cursor,
      Order order,
      Function<? super R, ? extends @Nullable P> page,
      Function<? super P, Boolean> complete,
      Function<? super P, Boolean> refreshRequired,
      Function<? super P, ? extends @Nullable String> nextCursor) {
    Map<String, @Nullable Object> copy = input == null ? new LinkedHashMap<>() : new LinkedHashMap<>(input);
    return new Pages<>(
        executor, operation, copy, cursorField, cursor, order, page, complete, refreshRequired, nextCursor);
  }

  @Override
  public Iterator<P> iterator() {
    return new PageIterator();
  }

  private boolean advances(String previous, String next) {
    if (this.order == Order.OPAQUE) {
      return !next.equals(previous);
    }
    int comparison;
    try {
      comparison = new BigInteger(next).compareTo(new BigInteger(previous));
    } catch (NumberFormatException error) {
      return false;
    }
    return this.order == Order.ASCENDING ? comparison > 0 : comparison < 0;
  }

  private final class PageIterator implements Iterator<P> {
    private @Nullable String position = Pages.this.initialCursor;
    private boolean finished;
    private @Nullable P buffered;
    private @Nullable RuntimeException failure;

    @Override
    public boolean hasNext() {
      if (this.failure != null) {
        throw this.failure;
      }
      if (this.buffered == null && !this.finished) {
        this.buffered = fetch();
      }
      return this.buffered != null;
    }

    @Override
    public P next() {
      if (!hasNext()) {
        throw new NoSuchElementException();
      }
      P current = Objects.requireNonNull(this.buffered);
      this.buffered = null;
      return current;
    }

    private P fetch() {
      String requestId = UUID.randomUUID().toString();
      Map<String, @Nullable Object> request = new LinkedHashMap<>(Pages.this.input);
      if (this.position != null) {
        request.put(Pages.this.cursorField, this.position);
      }
      R reply = Pages.this.executor.execute(Pages.this.operation, request, requestId, null);
      P current = Pages.this.page.apply(reply);
      if (current == null) {
        throw fail(Pages.this.executor.invalidResponse(requestId, "Missing current authority result"));
      }
      if (Pages.this.refreshRequired.apply(current)) {
        throw fail(new IllegalStateException("Explicit authorized resynchronization required"));
      }
      if (Pages.this.complete.apply(current)) {
        this.finished = true;
        return current;
      }
      String next = Pages.this.nextCursor.apply(current);
      if (next == null) {
        throw fail(Pages.this.executor.invalidResponse(requestId, "Incomplete page has no next cursor"));
      }
      try {
        Pages.this.cursor.decode(next, 0);
      } catch (WireException error) {
        throw fail(Pages.this.executor.invalidResponse(requestId, "Malformed next cursor"));
      }
      if (this.position != null && !advances(this.position, next)) {
        throw fail(Pages.this.executor.invalidResponse(requestId, "Incomplete page did not advance the cursor"));
      }
      this.position = next;
      return current;
    }

    private RuntimeException fail(RuntimeException error) {
      this.failure = error;
      return error;
    }
  }
}
