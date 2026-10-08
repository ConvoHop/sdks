// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>MediaPolicy</code> result type. */
public final class MediaPolicy implements WireValue {
  private final String leasePolicyId;
  private final String maxLeaseMs;
  private final String renewAttemptMs;
  private final String preludeMaxBytes;
  private final String preludeTimeoutMs;
  private final String clockProfileId;

  private MediaPolicy(
      String leasePolicyId,
      String maxLeaseMs,
      String renewAttemptMs,
      String preludeMaxBytes,
      String preludeTimeoutMs,
      String clockProfileId) {
    this.leasePolicyId = leasePolicyId;
    this.maxLeaseMs = maxLeaseMs;
    this.renewAttemptMs = renewAttemptMs;
    this.preludeMaxBytes = preludeMaxBytes;
    this.preludeTimeoutMs = preludeTimeoutMs;
    this.clockProfileId = clockProfileId;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static MediaPolicy fromJson(@Nullable Object value) {
    return Wire.required(MediaPolicy::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static MediaPolicy decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "MediaPolicy");
    return new MediaPolicy(
        Wire.field(object, "MediaPolicy", "leasePolicyId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "MediaPolicy", "maxLeaseMs", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "MediaPolicy", "renewAttemptMs", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "MediaPolicy", "preludeMaxBytes", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "MediaPolicy", "preludeTimeoutMs", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "MediaPolicy", "clockProfileId", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>leasePolicyId</code> field. */
  public String getLeasePolicyId() {
    return this.leasePolicyId;
  }

  /** The <code>maxLeaseMs</code> field. */
  public String getMaxLeaseMs() {
    return this.maxLeaseMs;
  }

  /** The <code>renewAttemptMs</code> field. */
  public String getRenewAttemptMs() {
    return this.renewAttemptMs;
  }

  /** The <code>preludeMaxBytes</code> field. */
  public String getPreludeMaxBytes() {
    return this.preludeMaxBytes;
  }

  /** The <code>preludeTimeoutMs</code> field. */
  public String getPreludeTimeoutMs() {
    return this.preludeTimeoutMs;
  }

  /** The <code>clockProfileId</code> field. */
  public String getClockProfileId() {
    return this.clockProfileId;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("leasePolicyId", Wire.json(this.leasePolicyId));
    json.put("maxLeaseMs", Wire.json(this.maxLeaseMs));
    json.put("renewAttemptMs", Wire.json(this.renewAttemptMs));
    json.put("preludeMaxBytes", Wire.json(this.preludeMaxBytes));
    json.put("preludeTimeoutMs", Wire.json(this.preludeTimeoutMs));
    json.put("clockProfileId", Wire.json(this.clockProfileId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof MediaPolicy)) {
      return false;
    }
    MediaPolicy that = (MediaPolicy) other;
    return Objects.equals(this.leasePolicyId, that.leasePolicyId)
        && Objects.equals(this.maxLeaseMs, that.maxLeaseMs)
        && Objects.equals(this.renewAttemptMs, that.renewAttemptMs)
        && Objects.equals(this.preludeMaxBytes, that.preludeMaxBytes)
        && Objects.equals(this.preludeTimeoutMs, that.preludeTimeoutMs)
        && Objects.equals(this.clockProfileId, that.clockProfileId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.leasePolicyId, this.maxLeaseMs, this.renewAttemptMs, this.preludeMaxBytes, this.preludeTimeoutMs, this.clockProfileId);
  }

  @Override
  public String toString() {
    return "MediaPolicy{leasePolicyId=" + this.leasePolicyId
        + ", maxLeaseMs=" + this.maxLeaseMs
        + ", renewAttemptMs=" + this.renewAttemptMs
        + ", preludeMaxBytes=" + this.preludeMaxBytes
        + ", preludeTimeoutMs=" + this.preludeTimeoutMs
        + ", clockProfileId=" + this.clockProfileId
        + "}";
  }
}
