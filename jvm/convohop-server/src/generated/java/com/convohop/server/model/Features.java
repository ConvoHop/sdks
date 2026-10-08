// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Features</code> result type. */
public final class Features implements WireValue {
  private final Boolean chat;
  private final Boolean inbox;
  private final Boolean lexicalSearch;
  private final Boolean typing;
  private final Boolean webhooks;
  private final Boolean liveSessions;
  private final Boolean liveBroadcast;

  private Features(
      Boolean chat,
      Boolean inbox,
      Boolean lexicalSearch,
      Boolean typing,
      Boolean webhooks,
      Boolean liveSessions,
      Boolean liveBroadcast) {
    this.chat = chat;
    this.inbox = inbox;
    this.lexicalSearch = lexicalSearch;
    this.typing = typing;
    this.webhooks = webhooks;
    this.liveSessions = liveSessions;
    this.liveBroadcast = liveBroadcast;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Features fromJson(@Nullable Object value) {
    return Wire.required(Features::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Features decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Features");
    return new Features(
        Wire.field(object, "Features", "chat", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Features", "inbox", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Features", "lexicalSearch", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Features", "typing", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Features", "webhooks", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Features", "liveSessions", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Features", "liveBroadcast", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>chat</code> field. */
  public Boolean getChat() {
    return this.chat;
  }

  /** The <code>inbox</code> field. */
  public Boolean getInbox() {
    return this.inbox;
  }

  /** The <code>lexicalSearch</code> field. */
  public Boolean getLexicalSearch() {
    return this.lexicalSearch;
  }

  /** The <code>typing</code> field. */
  public Boolean getTyping() {
    return this.typing;
  }

  /** The <code>webhooks</code> field. */
  public Boolean getWebhooks() {
    return this.webhooks;
  }

  /** The <code>liveSessions</code> field. */
  public Boolean getLiveSessions() {
    return this.liveSessions;
  }

  /** The <code>liveBroadcast</code> field. */
  public Boolean getLiveBroadcast() {
    return this.liveBroadcast;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("chat", Wire.json(this.chat));
    json.put("inbox", Wire.json(this.inbox));
    json.put("lexicalSearch", Wire.json(this.lexicalSearch));
    json.put("typing", Wire.json(this.typing));
    json.put("webhooks", Wire.json(this.webhooks));
    json.put("liveSessions", Wire.json(this.liveSessions));
    json.put("liveBroadcast", Wire.json(this.liveBroadcast));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Features)) {
      return false;
    }
    Features that = (Features) other;
    return Objects.equals(this.chat, that.chat)
        && Objects.equals(this.inbox, that.inbox)
        && Objects.equals(this.lexicalSearch, that.lexicalSearch)
        && Objects.equals(this.typing, that.typing)
        && Objects.equals(this.webhooks, that.webhooks)
        && Objects.equals(this.liveSessions, that.liveSessions)
        && Objects.equals(this.liveBroadcast, that.liveBroadcast);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.chat, this.inbox, this.lexicalSearch, this.typing, this.webhooks, this.liveSessions, this.liveBroadcast);
  }

  @Override
  public String toString() {
    return "Features{chat=" + this.chat
        + ", inbox=" + this.inbox
        + ", lexicalSearch=" + this.lexicalSearch
        + ", typing=" + this.typing
        + ", webhooks=" + this.webhooks
        + ", liveSessions=" + this.liveSessions
        + ", liveBroadcast=" + this.liveBroadcast
        + "}";
  }
}
