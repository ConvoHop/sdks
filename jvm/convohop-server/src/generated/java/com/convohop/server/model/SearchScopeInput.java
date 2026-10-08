// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>SearchScopeInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class SearchScopeInput implements WireValue {
  private final List<String> conversationIds;

  private SearchScopeInput(Builder builder) {
    this.conversationIds = Wire.present(builder.conversationIds, "SearchScopeInput.conversationIds");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>conversationIds</code> field. */
  public List<String> getConversationIds() {
    return this.conversationIds;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationIds", Wire.json(this.conversationIds));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SearchScopeInput)) {
      return false;
    }
    SearchScopeInput that = (SearchScopeInput) other;
    return Objects.equals(this.conversationIds, that.conversationIds);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationIds);
  }

  @Override
  public String toString() {
    return "SearchScopeInput{conversationIds=" + this.conversationIds
        + "}";
  }

  /** Builds {@link SearchScopeInput} values. */
  public static final class Builder {
    private @Nullable List<String> conversationIds;

    private Builder() {}

    /**
     * Sets the <code>conversationIds</code> field.
     *
     * <p>Required.
     *
     * @param conversationIds the value
     * @return this builder
     */
    public Builder conversationIds(List<String> conversationIds) {
      this.conversationIds = Wire.immutable(Wire.nonNull(conversationIds, "conversationIds"));
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public SearchScopeInput build() {
      return new SearchScopeInput(this);
    }
  }
}
