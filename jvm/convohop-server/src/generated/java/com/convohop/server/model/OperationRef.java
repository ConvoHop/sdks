// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>OperationRef</code> result type. */
public final class OperationRef implements WireValue {
  private final String operationId;
  private final String owner;
  private final String href;
  private final String state;

  private OperationRef(
      String operationId,
      String owner,
      String href,
      String state) {
    this.operationId = operationId;
    this.owner = owner;
    this.href = href;
    this.state = state;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static OperationRef fromJson(@Nullable Object value) {
    return Wire.required(OperationRef::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static OperationRef decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "OperationRef");
    return new OperationRef(
        Wire.field(object, "OperationRef", "operationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "OperationRef", "owner", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "OperationRef", "href", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "OperationRef", "state", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The <code>owner</code> field. */
  public String getOwner() {
    return this.owner;
  }

  /** The <code>href</code> field. */
  public String getHref() {
    return this.href;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    json.put("owner", Wire.json(this.owner));
    json.put("href", Wire.json(this.href));
    json.put("state", Wire.json(this.state));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof OperationRef)) {
      return false;
    }
    OperationRef that = (OperationRef) other;
    return Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.owner, that.owner)
        && Objects.equals(this.href, that.href)
        && Objects.equals(this.state, that.state);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId, this.owner, this.href, this.state);
  }

  @Override
  public String toString() {
    return "OperationRef{operationId=" + this.operationId
        + ", owner=" + this.owner
        + ", href=" + this.href
        + ", state=" + this.state
        + "}";
  }
}
