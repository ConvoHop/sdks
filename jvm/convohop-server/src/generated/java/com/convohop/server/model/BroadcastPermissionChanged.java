// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>BroadcastPermissionChanged</code> result type. */
public final class BroadcastPermissionChanged implements WireValue {
  private final Member member;
  private final @Nullable LiveMediaCutoff mediaCutoff;

  private BroadcastPermissionChanged(
      Member member,
      @Nullable LiveMediaCutoff mediaCutoff) {
    this.member = member;
    this.mediaCutoff = mediaCutoff;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static BroadcastPermissionChanged fromJson(@Nullable Object value) {
    return Wire.required(BroadcastPermissionChanged::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static BroadcastPermissionChanged decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "BroadcastPermissionChanged");
    return new BroadcastPermissionChanged(
        Wire.field(object, "BroadcastPermissionChanged", "member", depth, Wire.required(Member::decode)),
        Wire.field(object, "BroadcastPermissionChanged", "mediaCutoff", depth, Wire.optional(LiveMediaCutoff::decode)));
  }

  /** The <code>member</code> field. */
  public Member getMember() {
    return this.member;
  }

  /** The <code>mediaCutoff</code> field. */
  public @Nullable LiveMediaCutoff getMediaCutoff() {
    return this.mediaCutoff;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("member", Wire.json(this.member));
    json.put("mediaCutoff", Wire.json(this.mediaCutoff));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof BroadcastPermissionChanged)) {
      return false;
    }
    BroadcastPermissionChanged that = (BroadcastPermissionChanged) other;
    return Objects.equals(this.member, that.member)
        && Objects.equals(this.mediaCutoff, that.mediaCutoff);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.member, this.mediaCutoff);
  }

  @Override
  public String toString() {
    return "BroadcastPermissionChanged{member=" + this.member
        + ", mediaCutoff=" + this.mediaCutoff
        + "}";
  }
}
