// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>WidgetsPayload</code> result type. */
public final class WidgetsPayload implements WireValue {
  private final String requestId;
  private final @Nullable WidgetPage result;

  private WidgetsPayload(
      String requestId,
      @Nullable WidgetPage result) {
    this.requestId = requestId;
    this.result = result;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static WidgetsPayload fromJson(@Nullable Object value) {
    return Wire.required(WidgetsPayload::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static WidgetsPayload decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "WidgetsPayload");
    return new WidgetsPayload(
        Wire.field(object, "WidgetsPayload", "requestId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "WidgetsPayload", "result", depth, Wire.optional(WidgetPage::decode)));
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>result</code> field. */
  public @Nullable WidgetPage getResult() {
    return this.result;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("requestId", Wire.json(this.requestId));
    json.put("result", Wire.json(this.result));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WidgetsPayload)) {
      return false;
    }
    WidgetsPayload that = (WidgetsPayload) other;
    return Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.result, that.result);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.requestId, this.result);
  }

  @Override
  public String toString() {
    return "WidgetsPayload{requestId=" + this.requestId
        + ", result=" + this.result
        + "}";
  }
}
