// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionOperationReply</code> result type. */
public final class LiveSessionOperationReply implements WireValue {
  private final String status;
  private final String requestId;
  private final String serverTime;
  private final LiveSessionOperation result;

  private LiveSessionOperationReply(
      String status,
      String requestId,
      String serverTime,
      LiveSessionOperation result) {
    this.status = status;
    this.requestId = requestId;
    this.serverTime = serverTime;
    this.result = result;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionOperationReply fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionOperationReply::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionOperationReply decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionOperationReply");
    return new LiveSessionOperationReply(
        Wire.field(object, "LiveSessionOperationReply", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LiveSessionOperationReply", "requestId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionOperationReply", "serverTime", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LiveSessionOperationReply", "result", depth, Wire.required(LiveSessionOperation::decode)));
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>serverTime</code> field. */
  public String getServerTime() {
    return this.serverTime;
  }

  /** The <code>result</code> field. */
  public LiveSessionOperation getResult() {
    return this.result;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("status", Wire.json(this.status));
    json.put("requestId", Wire.json(this.requestId));
    json.put("serverTime", Wire.json(this.serverTime));
    json.put("result", Wire.json(this.result));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionOperationReply)) {
      return false;
    }
    LiveSessionOperationReply that = (LiveSessionOperationReply) other;
    return Objects.equals(this.status, that.status)
        && Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.serverTime, that.serverTime)
        && Objects.equals(this.result, that.result);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.status, this.requestId, this.serverTime, this.result);
  }

  @Override
  public String toString() {
    return "LiveSessionOperationReply{status=" + this.status
        + ", requestId=" + this.requestId
        + ", serverTime=" + this.serverTime
        + ", result=" + this.result
        + "}";
  }
}
