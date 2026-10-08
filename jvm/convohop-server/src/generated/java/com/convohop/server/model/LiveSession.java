// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSession</code> result type. */
public final class LiveSession implements WireValue {
  private final String liveSessionId;
  private final String conversationId;
  private final String creatorId;
  private final LiveSessionKind kind;
  private final LiveMediaProfile mediaProfile;
  private final LiveSessionState state;
  private final String generation;
  private final String revision;
  private final String createdAt;
  private final String expiresAt;
  private final @Nullable LiveParticipation myParticipation;
  private final @Nullable LiveMediaCutoff mediaCutoff;

  private LiveSession(
      String liveSessionId,
      String conversationId,
      String creatorId,
      LiveSessionKind kind,
      LiveMediaProfile mediaProfile,
      LiveSessionState state,
      String generation,
      String revision,
      String createdAt,
      String expiresAt,
      @Nullable LiveParticipation myParticipation,
      @Nullable LiveMediaCutoff mediaCutoff) {
    this.liveSessionId = liveSessionId;
    this.conversationId = conversationId;
    this.creatorId = creatorId;
    this.kind = kind;
    this.mediaProfile = mediaProfile;
    this.state = state;
    this.generation = generation;
    this.revision = revision;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.myParticipation = myParticipation;
    this.mediaCutoff = mediaCutoff;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSession fromJson(@Nullable Object value) {
    return Wire.required(LiveSession::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSession decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSession");
    return new LiveSession(
        Wire.field(object, "LiveSession", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSession", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSession", "creatorId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSession", "kind", depth, Wire.required(LiveSessionKind::decode)),
        Wire.field(object, "LiveSession", "mediaProfile", depth, Wire.required(LiveMediaProfile::decode)),
        Wire.field(object, "LiveSession", "state", depth, Wire.required(LiveSessionState::decode)),
        Wire.field(object, "LiveSession", "generation", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveSession", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveSession", "createdAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LiveSession", "expiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LiveSession", "myParticipation", depth, Wire.optional(LiveParticipation::decode)),
        Wire.field(object, "LiveSession", "mediaCutoff", depth, Wire.optional(LiveMediaCutoff::decode)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>creatorId</code> field. */
  public String getCreatorId() {
    return this.creatorId;
  }

  /** The <code>kind</code> field. */
  public LiveSessionKind getKind() {
    return this.kind;
  }

  /** The <code>mediaProfile</code> field. */
  public LiveMediaProfile getMediaProfile() {
    return this.mediaProfile;
  }

  /** The <code>state</code> field. */
  public LiveSessionState getState() {
    return this.state;
  }

  /** The <code>generation</code> field. */
  public String getGeneration() {
    return this.generation;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>createdAt</code> field. */
  public String getCreatedAt() {
    return this.createdAt;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>myParticipation</code> field. */
  public @Nullable LiveParticipation getMyParticipation() {
    return this.myParticipation;
  }

  /** The <code>mediaCutoff</code> field. */
  public @Nullable LiveMediaCutoff getMediaCutoff() {
    return this.mediaCutoff;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("creatorId", Wire.json(this.creatorId));
    json.put("kind", Wire.json(this.kind));
    json.put("mediaProfile", Wire.json(this.mediaProfile));
    json.put("state", Wire.json(this.state));
    json.put("generation", Wire.json(this.generation));
    json.put("revision", Wire.json(this.revision));
    json.put("createdAt", Wire.json(this.createdAt));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("myParticipation", Wire.json(this.myParticipation));
    json.put("mediaCutoff", Wire.json(this.mediaCutoff));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSession)) {
      return false;
    }
    LiveSession that = (LiveSession) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.creatorId, that.creatorId)
        && Objects.equals(this.kind, that.kind)
        && Objects.equals(this.mediaProfile, that.mediaProfile)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.generation, that.generation)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.createdAt, that.createdAt)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.myParticipation, that.myParticipation)
        && Objects.equals(this.mediaCutoff, that.mediaCutoff);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.conversationId, this.creatorId, this.kind, this.mediaProfile, this.state, this.generation, this.revision, this.createdAt, this.expiresAt, this.myParticipation, this.mediaCutoff);
  }

  @Override
  public String toString() {
    return "LiveSession{liveSessionId=" + this.liveSessionId
        + ", conversationId=" + this.conversationId
        + ", creatorId=" + this.creatorId
        + ", kind=" + this.kind
        + ", mediaProfile=" + this.mediaProfile
        + ", state=" + this.state
        + ", generation=" + this.generation
        + ", revision=" + this.revision
        + ", createdAt=" + this.createdAt
        + ", expiresAt=" + this.expiresAt
        + ", myParticipation=" + this.myParticipation
        + ", mediaCutoff=" + this.mediaCutoff
        + "}";
  }
}
