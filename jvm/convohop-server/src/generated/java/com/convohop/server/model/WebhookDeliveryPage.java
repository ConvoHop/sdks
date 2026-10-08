// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>WebhookDeliveryPage</code> result type. */
public final class WebhookDeliveryPage implements WireValue {
  private final List<WebhookDelivery> items;
  private final Boolean complete;
  private final Boolean refreshRequired;
  private final @Nullable String nextCursor;
  private final @Nullable String observedAt;
  private final @Nullable String partialReason;
  private final @Nullable String sourceRevision;

  private WebhookDeliveryPage(
      List<WebhookDelivery> items,
      Boolean complete,
      Boolean refreshRequired,
      @Nullable String nextCursor,
      @Nullable String observedAt,
      @Nullable String partialReason,
      @Nullable String sourceRevision) {
    this.items = items;
    this.complete = complete;
    this.refreshRequired = refreshRequired;
    this.nextCursor = nextCursor;
    this.observedAt = observedAt;
    this.partialReason = partialReason;
    this.sourceRevision = sourceRevision;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static WebhookDeliveryPage fromJson(@Nullable Object value) {
    return Wire.required(WebhookDeliveryPage::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static WebhookDeliveryPage decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "WebhookDeliveryPage");
    return new WebhookDeliveryPage(
        Wire.field(object, "WebhookDeliveryPage", "items", depth, Wire.required(Wire.list(Wire.required(WebhookDelivery::decode)))),
        Wire.field(object, "WebhookDeliveryPage", "complete", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "WebhookDeliveryPage", "refreshRequired", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "WebhookDeliveryPage", "nextCursor", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDeliveryPage", "observedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDeliveryPage", "partialReason", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDeliveryPage", "sourceRevision", depth, Wire.optional(Scalars.DECIMAL)));
  }

  /** The <code>items</code> field. */
  public List<WebhookDelivery> getItems() {
    return this.items;
  }

  /** The <code>complete</code> field. */
  public Boolean getComplete() {
    return this.complete;
  }

  /** The <code>refreshRequired</code> field. */
  public Boolean getRefreshRequired() {
    return this.refreshRequired;
  }

  /** The <code>nextCursor</code> field. */
  public @Nullable String getNextCursor() {
    return this.nextCursor;
  }

  /** The <code>observedAt</code> field. */
  public @Nullable String getObservedAt() {
    return this.observedAt;
  }

  /** The <code>partialReason</code> field. */
  public @Nullable String getPartialReason() {
    return this.partialReason;
  }

  /** The <code>sourceRevision</code> field. */
  public @Nullable String getSourceRevision() {
    return this.sourceRevision;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("items", Wire.json(this.items));
    json.put("complete", Wire.json(this.complete));
    json.put("refreshRequired", Wire.json(this.refreshRequired));
    json.put("nextCursor", Wire.json(this.nextCursor));
    json.put("observedAt", Wire.json(this.observedAt));
    json.put("partialReason", Wire.json(this.partialReason));
    json.put("sourceRevision", Wire.json(this.sourceRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WebhookDeliveryPage)) {
      return false;
    }
    WebhookDeliveryPage that = (WebhookDeliveryPage) other;
    return Objects.equals(this.items, that.items)
        && Objects.equals(this.complete, that.complete)
        && Objects.equals(this.refreshRequired, that.refreshRequired)
        && Objects.equals(this.nextCursor, that.nextCursor)
        && Objects.equals(this.observedAt, that.observedAt)
        && Objects.equals(this.partialReason, that.partialReason)
        && Objects.equals(this.sourceRevision, that.sourceRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.items, this.complete, this.refreshRequired, this.nextCursor, this.observedAt, this.partialReason, this.sourceRevision);
  }

  @Override
  public String toString() {
    return "WebhookDeliveryPage{items=" + this.items
        + ", complete=" + this.complete
        + ", refreshRequired=" + this.refreshRequired
        + ", nextCursor=" + this.nextCursor
        + ", observedAt=" + this.observedAt
        + ", partialReason=" + this.partialReason
        + ", sourceRevision=" + this.sourceRevision
        + "}";
  }
}
