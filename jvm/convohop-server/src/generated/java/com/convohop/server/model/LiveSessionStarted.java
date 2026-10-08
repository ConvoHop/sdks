// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionStarted</code> result type. */
public final class LiveSessionStarted implements WireValue {
  private final String liveSessionId;
  private final String conversationId;
  private final LiveSessionKind kind;
  private final LiveMediaProfile mediaProfile;
  private final String operationId;

  private LiveSessionStarted(
      String liveSessionId,
      String conversationId,
      LiveSessionKind kind,
      LiveMediaProfile mediaProfile,
      String operationId) {
    this.liveSessionId = liveSessionId;
    this.conversationId = conversationId;
    this.kind = kind;
    this.mediaProfile = mediaProfile;
    this.operationId = operationId;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionStarted fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionStarted::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionStarted decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionStarted");
    return new LiveSessionStarted(
        Wire.field(object, "LiveSessionStarted", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionStarted", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionStarted", "kind", depth, Wire.required(LiveSessionKind::decode)),
        Wire.field(object, "LiveSessionStarted", "mediaProfile", depth, Wire.required(LiveMediaProfile::decode)),
        Wire.field(object, "LiveSessionStarted", "operationId", depth, Wire.required(Scalars.UUID)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>kind</code> field. */
  public LiveSessionKind getKind() {
    return this.kind;
  }

  /** The <code>mediaProfile</code> field. */
  public LiveMediaProfile getMediaProfile() {
    return this.mediaProfile;
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("kind", Wire.json(this.kind));
    json.put("mediaProfile", Wire.json(this.mediaProfile));
    json.put("operationId", Wire.json(this.operationId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionStarted)) {
      return false;
    }
    LiveSessionStarted that = (LiveSessionStarted) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.kind, that.kind)
        && Objects.equals(this.mediaProfile, that.mediaProfile)
        && Objects.equals(this.operationId, that.operationId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.conversationId, this.kind, this.mediaProfile, this.operationId);
  }

  @Override
  public String toString() {
    return "LiveSessionStarted{liveSessionId=" + this.liveSessionId
        + ", conversationId=" + this.conversationId
        + ", kind=" + this.kind
        + ", mediaProfile=" + this.mediaProfile
        + ", operationId=" + this.operationId
        + "}";
  }
}
