// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>InboxItem</code> result type. */
public final class InboxItem implements WireValue {
  private final String conversationId;
  private final String title;
  private final @Nullable String activityAt;
  private final String visibilityEpoch;
  private final @Nullable Message latestVisibleMessage;
  private final Boolean hasUnread;

  private InboxItem(
      String conversationId,
      String title,
      @Nullable String activityAt,
      String visibilityEpoch,
      @Nullable Message latestVisibleMessage,
      Boolean hasUnread) {
    this.conversationId = conversationId;
    this.title = title;
    this.activityAt = activityAt;
    this.visibilityEpoch = visibilityEpoch;
    this.latestVisibleMessage = latestVisibleMessage;
    this.hasUnread = hasUnread;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static InboxItem fromJson(@Nullable Object value) {
    return Wire.required(InboxItem::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static InboxItem decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "InboxItem");
    return new InboxItem(
        Wire.field(object, "InboxItem", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "InboxItem", "title", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "InboxItem", "activityAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "InboxItem", "visibilityEpoch", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "InboxItem", "latestVisibleMessage", depth, Wire.optional(Message::decode)),
        Wire.field(object, "InboxItem", "hasUnread", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>title</code> field. */
  public String getTitle() {
    return this.title;
  }

  /** The <code>activityAt</code> field. */
  public @Nullable String getActivityAt() {
    return this.activityAt;
  }

  /** The <code>visibilityEpoch</code> field. */
  public String getVisibilityEpoch() {
    return this.visibilityEpoch;
  }

  /** The <code>latestVisibleMessage</code> field. */
  public @Nullable Message getLatestVisibleMessage() {
    return this.latestVisibleMessage;
  }

  /** The <code>hasUnread</code> field. */
  public Boolean getHasUnread() {
    return this.hasUnread;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("title", Wire.json(this.title));
    json.put("activityAt", Wire.json(this.activityAt));
    json.put("visibilityEpoch", Wire.json(this.visibilityEpoch));
    json.put("latestVisibleMessage", Wire.json(this.latestVisibleMessage));
    json.put("hasUnread", Wire.json(this.hasUnread));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof InboxItem)) {
      return false;
    }
    InboxItem that = (InboxItem) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.title, that.title)
        && Objects.equals(this.activityAt, that.activityAt)
        && Objects.equals(this.visibilityEpoch, that.visibilityEpoch)
        && Objects.equals(this.latestVisibleMessage, that.latestVisibleMessage)
        && Objects.equals(this.hasUnread, that.hasUnread);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.title, this.activityAt, this.visibilityEpoch, this.latestVisibleMessage, this.hasUnread);
  }

  @Override
  public String toString() {
    return "InboxItem{conversationId=" + this.conversationId
        + ", title=" + this.title
        + ", activityAt=" + this.activityAt
        + ", visibilityEpoch=" + this.visibilityEpoch
        + ", latestVisibleMessage=" + this.latestVisibleMessage
        + ", hasUnread=" + this.hasUnread
        + "}";
  }
}
