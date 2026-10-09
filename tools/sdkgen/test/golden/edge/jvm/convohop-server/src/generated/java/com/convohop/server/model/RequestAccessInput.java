// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>RequestAccessInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class RequestAccessInput implements WireValue {
  private final String email;
  private final String challenge;

  private RequestAccessInput(Builder builder) {
    this.email = Wire.present(builder.email, "RequestAccessInput.email");
    this.challenge = Wire.present(builder.challenge, "RequestAccessInput.challenge");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>email</code> field. */
  public String getEmail() {
    return this.email;
  }

  /** The <code>challenge</code> field. */
  public String getChallenge() {
    return this.challenge;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("email", Wire.json(this.email));
    json.put("challenge", Wire.json(this.challenge));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RequestAccessInput)) {
      return false;
    }
    RequestAccessInput that = (RequestAccessInput) other;
    return Objects.equals(this.email, that.email)
        && Objects.equals(this.challenge, that.challenge);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.email, this.challenge);
  }

  @Override
  public String toString() {
    return "RequestAccessInput{email=" + this.email
        + ", challenge=" + this.challenge
        + "}";
  }

  /** Builds {@link RequestAccessInput} values. */
  public static final class Builder {
    private @Nullable String email;
    private @Nullable String challenge;

    private Builder() {}

    /**
     * Sets the <code>email</code> field.
     *
     * <p>Required.
     *
     * @param email the value
     * @return this builder
     */
    public Builder email(String email) {
      this.email = Wire.nonNull(email, "email");
      return this;
    }

    /**
     * Sets the <code>challenge</code> field.
     *
     * <p>Required.
     *
     * @param challenge the value
     * @return this builder
     */
    public Builder challenge(String challenge) {
      this.challenge = Wire.nonNull(challenge, "challenge");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public RequestAccessInput build() {
      return new RequestAccessInput(this);
    }
  }
}
