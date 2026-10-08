// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveOperationFailure</code> result type. */
public final class LiveOperationFailure implements WireValue {
  private final LiveErrorCode code;
  private final String message;

  private LiveOperationFailure(
      LiveErrorCode code,
      String message) {
    this.code = code;
    this.message = message;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveOperationFailure fromJson(@Nullable Object value) {
    return Wire.required(LiveOperationFailure::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveOperationFailure decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveOperationFailure");
    return new LiveOperationFailure(
        Wire.field(object, "LiveOperationFailure", "code", depth, Wire.required(LiveErrorCode::decode)),
        Wire.field(object, "LiveOperationFailure", "message", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>code</code> field. */
  public LiveErrorCode getCode() {
    return this.code;
  }

  /** The <code>message</code> field. */
  public String getMessage() {
    return this.message;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("code", Wire.json(this.code));
    json.put("message", Wire.json(this.message));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveOperationFailure)) {
      return false;
    }
    LiveOperationFailure that = (LiveOperationFailure) other;
    return Objects.equals(this.code, that.code)
        && Objects.equals(this.message, that.message);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.code, this.message);
  }

  @Override
  public String toString() {
    return "LiveOperationFailure{code=" + this.code
        + ", message=" + this.message
        + "}";
  }
}
