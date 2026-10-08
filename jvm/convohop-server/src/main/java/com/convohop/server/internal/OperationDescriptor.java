package com.convohop.server.internal;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * One generated GraphQL operation: its document, input fields, retry contract and request-context rules. Not API.
 *
 * @param <T> the decoded payload type
 */
public final class OperationDescriptor<T extends @Nullable Object> {
  /** Whether the operation reads or writes. */
  public enum Kind {
    /** A read. */
    QUERY,
    /** A write. */
    MUTATION
  }

  /** How a request with an uncertain outcome may be repeated. */
  public enum Retry {
    /** Repeat freely: the operation has no side effect. */
    REPEAT,
    /** Resend only the same request ID, payload and incarnation. */
    SAME_REQUEST,
    /** Never resend. */
    NONE
  }

  /** Whether a request-context field is required, optional or rejected for this operation. */
  public enum Use {
    /** The field must be sent. */
    REQUIRED,
    /** The field may be sent. */
    OPTIONAL,
    /** The field must not be sent. */
    FORBIDDEN
  }

  private final String id;
  private final Wire.Decoder<T> decoder;
  private final String plane;
  private final Kind kind;
  private final String field;
  private final String operationName;
  private final String resultType;
  private final List<String> inputFields;
  private final String idempotency;
  private final Retry retry;
  private final boolean resolvable;
  private final int maxAttempts;
  private final long retryWindowMillis;
  private final Map<String, Use> context;
  private final @Nullable String permitField;
  private final String document;

  private OperationDescriptor(Builder<T> builder) {
    this.id = builder.id;
    this.decoder = builder.decoder;
    this.plane = Wire.present(builder.plane, id + ".plane");
    this.kind = Wire.present(builder.kind, id + ".kind");
    this.field = Wire.present(builder.field, id + ".field");
    this.operationName = Wire.present(builder.operationName, id + ".operationName");
    this.resultType = Wire.present(builder.resultType, id + ".resultType");
    this.inputFields = List.copyOf(Wire.present(builder.inputFields, id + ".inputFields"));
    this.idempotency = Wire.present(builder.idempotency, id + ".idempotency");
    this.retry = Wire.present(builder.retry, id + ".retry");
    this.resolvable = builder.resolvable;
    this.maxAttempts = builder.maxAttempts;
    this.retryWindowMillis = builder.retryWindowMillis;
    this.context = Collections.unmodifiableMap(new LinkedHashMap<>(builder.context));
    this.permitField = builder.permitField;
    this.document = Wire.present(builder.document, id + ".document");
  }

  /**
   * Starts a descriptor.
   *
   * @param <T> the decoded payload type
   * @param id the operation ID, such as {@code communication.sendMessage}
   * @param decoder the payload decoder
   * @return the builder
   */
  public static <T extends @Nullable Object> Builder<T> builder(String id, Wire.Decoder<T> decoder) {
    return new Builder<>(id, decoder);
  }

  /**
   * The operation ID.
   *
   * @return the plane-qualified ID
   */
  public String id() {
    return id;
  }

  /**
   * The payload decoder.
   *
   * @return the decoder
   */
  public Wire.Decoder<T> decoder() {
    return decoder;
  }

  /**
   * The API plane.
   *
   * @return {@code communication} or {@code management}
   */
  public String plane() {
    return plane;
  }

  /**
   * Whether the operation reads or writes.
   *
   * @return the kind
   */
  public Kind kind() {
    return kind;
  }

  /**
   * The root field that carries the payload.
   *
   * @return the GraphQL field name
   */
  public String field() {
    return field;
  }

  /**
   * The GraphQL operation name.
   *
   * @return the name
   */
  public String operationName() {
    return operationName;
  }

  /**
   * The GraphQL result type.
   *
   * @return the type, with {@code !} when non-null
   */
  public String resultType() {
    return resultType;
  }

  /**
   * The fields the operation input accepts.
   *
   * @return an unmodifiable list, empty when the operation takes no input
   */
  public List<String> inputFields() {
    return inputFields;
  }

  /**
   * The idempotency class from the annotations.
   *
   * @return such as {@code safe}, {@code idempotent} or {@code permitBound}
   */
  public String idempotency() {
    return idempotency;
  }

  /**
   * How a request with an uncertain outcome may be repeated.
   *
   * @return the retry rule
   */
  public Retry retry() {
    return retry;
  }

  /**
   * Whether the plane's resolve operation can report this request's outcome.
   *
   * @return true when resolvable
   */
  public boolean resolvable() {
    return resolvable;
  }

  /**
   * The most submissions of one request.
   *
   * @return the attempt bound, or 0 when not bounded by the SDK
   */
  public int maxAttempts() {
    return maxAttempts;
  }

  /**
   * How long after the first submission a request may be resent.
   *
   * @return the window in milliseconds, or 0 when not bounded by the SDK
   */
  public long retryWindowMillis() {
    return retryWindowMillis;
  }

  /**
   * The request-context rules, by context field.
   *
   * @return an unmodifiable map
   */
  public Map<String, Use> context() {
    return context;
  }

  /**
   * The context field that carries a credential delivery permit.
   *
   * @return the field name, or null when the operation takes no permit
   */
  public @Nullable String permitField() {
    return permitField;
  }

  /**
   * The GraphQL document.
   *
   * @return the document text
   */
  public String document() {
    return document;
  }

  /**
   * Whether the operation writes.
   *
   * @return true for mutations
   */
  public boolean isMutation() {
    return kind == Kind.MUTATION;
  }

  @Override
  public String toString() {
    return "OperationDescriptor{" + id + "}";
  }

  /**
   * Builds a descriptor.
   *
   * @param <T> the decoded payload type
   */
  public static final class Builder<T extends @Nullable Object> {
    private final String id;
    private final Wire.Decoder<T> decoder;
    private @Nullable String plane;
    private @Nullable Kind kind;
    private @Nullable String field;
    private @Nullable String operationName;
    private @Nullable String resultType;
    private @Nullable List<String> inputFields;
    private @Nullable String idempotency;
    private @Nullable Retry retry;
    private boolean resolvable;
    private int maxAttempts;
    private long retryWindowMillis;
    private final Map<String, Use> context = new LinkedHashMap<>();
    private @Nullable String permitField;
    private @Nullable String document;

    private Builder(String id, Wire.Decoder<T> decoder) {
      this.id = Objects.requireNonNull(id, "id");
      this.decoder = Objects.requireNonNull(decoder, "decoder");
    }

    /**
     * Sets the plane.
     *
     * @param plane the plane name
     * @return this builder
     */
    public Builder<T> plane(String plane) {
      this.plane = plane;
      return this;
    }

    /**
     * Sets the kind.
     *
     * @param kind query or mutation
     * @return this builder
     */
    public Builder<T> kind(Kind kind) {
      this.kind = kind;
      return this;
    }

    /**
     * Sets the payload field.
     *
     * @param field the root field name
     * @return this builder
     */
    public Builder<T> field(String field) {
      this.field = field;
      return this;
    }

    /**
     * Sets the operation name.
     *
     * @param operationName the GraphQL operation name
     * @return this builder
     */
    public Builder<T> operationName(String operationName) {
      this.operationName = operationName;
      return this;
    }

    /**
     * Sets the result type.
     *
     * @param resultType the GraphQL type
     * @return this builder
     */
    public Builder<T> resultType(String resultType) {
      this.resultType = resultType;
      return this;
    }

    /**
     * Sets the input fields.
     *
     * @param inputFields the accepted input field names
     * @return this builder
     */
    public Builder<T> inputFields(List<String> inputFields) {
      this.inputFields = inputFields;
      return this;
    }

    /**
     * Sets the retry contract.
     *
     * @param name the idempotency class
     * @param retry the retry rule
     * @param resolvable whether the plane's resolve operation reports the outcome
     * @param maxAttempts the attempt bound, or 0
     * @param retryWindowMillis the resend window, or 0
     * @return this builder
     */
    public Builder<T> idempotency(String name, Retry retry, boolean resolvable, int maxAttempts, long retryWindowMillis) {
      this.idempotency = name;
      this.retry = retry;
      this.resolvable = resolvable;
      this.maxAttempts = maxAttempts;
      this.retryWindowMillis = retryWindowMillis;
      return this;
    }

    /**
     * Adds a request-context rule.
     *
     * @param name the context field
     * @param use the rule
     * @return this builder
     */
    public Builder<T> context(String name, Use use) {
      this.context.put(name, use);
      return this;
    }

    /**
     * Sets the context field that carries a credential delivery permit.
     *
     * @param permitField the field name
     * @return this builder
     */
    public Builder<T> permitField(String permitField) {
      this.permitField = permitField;
      return this;
    }

    /**
     * Sets the GraphQL document.
     *
     * @param document the document text
     * @return this builder
     */
    public Builder<T> document(String document) {
      this.document = document;
      return this;
    }

    /**
     * Builds the descriptor.
     *
     * @return the descriptor
     * @throws IllegalStateException if a part is missing
     */
    public OperationDescriptor<T> build() {
      return new OperationDescriptor<>(this);
    }
  }
}
