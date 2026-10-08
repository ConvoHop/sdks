// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveMediaPermissions</code> result type. */
public final class LiveMediaPermissions implements WireValue {
  private final Boolean microphone;
  private final Boolean camera;
  private final Boolean subscribe;

  private LiveMediaPermissions(
      Boolean microphone,
      Boolean camera,
      Boolean subscribe) {
    this.microphone = microphone;
    this.camera = camera;
    this.subscribe = subscribe;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveMediaPermissions fromJson(@Nullable Object value) {
    return Wire.required(LiveMediaPermissions::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveMediaPermissions decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveMediaPermissions");
    return new LiveMediaPermissions(
        Wire.field(object, "LiveMediaPermissions", "microphone", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "LiveMediaPermissions", "camera", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "LiveMediaPermissions", "subscribe", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>microphone</code> field. */
  public Boolean getMicrophone() {
    return this.microphone;
  }

  /** The <code>camera</code> field. */
  public Boolean getCamera() {
    return this.camera;
  }

  /** The <code>subscribe</code> field. */
  public Boolean getSubscribe() {
    return this.subscribe;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("microphone", Wire.json(this.microphone));
    json.put("camera", Wire.json(this.camera));
    json.put("subscribe", Wire.json(this.subscribe));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveMediaPermissions)) {
      return false;
    }
    LiveMediaPermissions that = (LiveMediaPermissions) other;
    return Objects.equals(this.microphone, that.microphone)
        && Objects.equals(this.camera, that.camera)
        && Objects.equals(this.subscribe, that.subscribe);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.microphone, this.camera, this.subscribe);
  }

  @Override
  public String toString() {
    return "LiveMediaPermissions{microphone=" + this.microphone
        + ", camera=" + this.camera
        + ", subscribe=" + this.subscribe
        + "}";
  }
}
