// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ResourceRef</code> result type. */
public final class ResourceRef implements WireValue {
  private final String kind;
  private final String id;

  private ResourceRef(
      String kind,
      String id) {
    this.kind = kind;
    this.id = id;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ResourceRef fromJson(@Nullable Object value) {
    return Wire.required(ResourceRef::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ResourceRef decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ResourceRef");
    return new ResourceRef(
        Wire.field(object, "ResourceRef", "kind", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ResourceRef", "id", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>kind</code> field. */
  public String getKind() {
    return this.kind;
  }

  /** The <code>id</code> field. */
  public String getId() {
    return this.id;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("kind", Wire.json(this.kind));
    json.put("id", Wire.json(this.id));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ResourceRef)) {
      return false;
    }
    ResourceRef that = (ResourceRef) other;
    return Objects.equals(this.kind, that.kind)
        && Objects.equals(this.id, that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.kind, this.id);
  }

  @Override
  public String toString() {
    return "ResourceRef{kind=" + this.kind
        + ", id=" + this.id
        + "}";
  }
}
