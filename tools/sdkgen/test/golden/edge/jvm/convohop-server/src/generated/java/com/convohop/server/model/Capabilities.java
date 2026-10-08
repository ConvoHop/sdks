// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Capabilities</code> result type. */
public final class Capabilities implements WireValue {
  private final String version;
  private final @Nullable String wssUrl;
  private final List<String> features;

  private Capabilities(
      String version,
      @Nullable String wssUrl,
      List<String> features) {
    this.version = version;
    this.wssUrl = wssUrl;
    this.features = features;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Capabilities fromJson(@Nullable Object value) {
    return Wire.required(Capabilities::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Capabilities decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Capabilities");
    return new Capabilities(
        Wire.field(object, "Capabilities", "version", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Capabilities", "wssUrl", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "Capabilities", "features", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))));
  }

  /** The <code>version</code> field. */
  public String getVersion() {
    return this.version;
  }

  /** The <code>wssUrl</code> field. */
  public @Nullable String getWssUrl() {
    return this.wssUrl;
  }

  /** The <code>features</code> field. */
  public List<String> getFeatures() {
    return this.features;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("version", Wire.json(this.version));
    json.put("wssUrl", Wire.json(this.wssUrl));
    json.put("features", Wire.json(this.features));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Capabilities)) {
      return false;
    }
    Capabilities that = (Capabilities) other;
    return Objects.equals(this.version, that.version)
        && Objects.equals(this.wssUrl, that.wssUrl)
        && Objects.equals(this.features, that.features);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.version, this.wssUrl, this.features);
  }

  @Override
  public String toString() {
    return "Capabilities{version=" + this.version
        + ", wssUrl=" + this.wssUrl
        + ", features=" + this.features
        + "}";
  }
}
