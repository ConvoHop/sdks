// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>SessionBootstrap</code> result type. */
public final class SessionBootstrap implements WireValue {
  private final @Nullable Session session;
  private final String tokenExpiresAt;
  private final String sessionToken;

  private SessionBootstrap(
      @Nullable Session session,
      String tokenExpiresAt,
      String sessionToken) {
    this.session = session;
    this.tokenExpiresAt = tokenExpiresAt;
    this.sessionToken = sessionToken;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static SessionBootstrap fromJson(@Nullable Object value) {
    return Wire.required(SessionBootstrap::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static SessionBootstrap decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "SessionBootstrap");
    return new SessionBootstrap(
        Wire.field(object, "SessionBootstrap", "session", depth, Wire.optional(Session::decode)),
        Wire.field(object, "SessionBootstrap", "tokenExpiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "SessionBootstrap", "sessionToken", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>session</code> field. */
  public @Nullable Session getSession() {
    return this.session;
  }

  /** The <code>tokenExpiresAt</code> field. */
  public String getTokenExpiresAt() {
    return this.tokenExpiresAt;
  }

  /** The <code>sessionToken</code> field. */
  public String getSessionToken() {
    return this.sessionToken;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("session", Wire.json(this.session));
    json.put("tokenExpiresAt", Wire.json(this.tokenExpiresAt));
    json.put("sessionToken", Wire.json(this.sessionToken));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SessionBootstrap)) {
      return false;
    }
    SessionBootstrap that = (SessionBootstrap) other;
    return Objects.equals(this.session, that.session)
        && Objects.equals(this.tokenExpiresAt, that.tokenExpiresAt)
        && Objects.equals(this.sessionToken, that.sessionToken);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.session, this.tokenExpiresAt, this.sessionToken);
  }

  @Override
  public String toString() {
    return "SessionBootstrap{session=" + this.session
        + ", tokenExpiresAt=" + this.tokenExpiresAt
        + ", sessionToken=" + Wire.redacted(this.sessionToken)
        + "}";
  }
}
