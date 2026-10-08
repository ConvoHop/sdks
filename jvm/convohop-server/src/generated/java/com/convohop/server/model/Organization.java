// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Organization</code> result type. */
public final class Organization implements WireValue {
  private final String orgId;
  private final String name;
  private final String status;
  private final String revision;

  private Organization(
      String orgId,
      String name,
      String status,
      String revision) {
    this.orgId = orgId;
    this.name = name;
    this.status = status;
    this.revision = revision;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Organization fromJson(@Nullable Object value) {
    return Wire.required(Organization::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Organization decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Organization");
    return new Organization(
        Wire.field(object, "Organization", "orgId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Organization", "name", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Organization", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Organization", "revision", depth, Wire.required(Scalars.DECIMAL)));
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>name</code> field. */
  public String getName() {
    return this.name;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    json.put("name", Wire.json(this.name));
    json.put("status", Wire.json(this.status));
    json.put("revision", Wire.json(this.revision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Organization)) {
      return false;
    }
    Organization that = (Organization) other;
    return Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.name, that.name)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.revision, that.revision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId, this.name, this.status, this.revision);
  }

  @Override
  public String toString() {
    return "Organization{orgId=" + this.orgId
        + ", name=" + this.name
        + ", status=" + this.status
        + ", revision=" + this.revision
        + "}";
  }
}
