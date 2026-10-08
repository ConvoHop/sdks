// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ProjectUsage</code> result type. */
public final class ProjectUsage implements WireValue {
  private final String projectId;
  private final String source;
  private final String observedAt;
  private final Boolean complete;
  private final String reason;
  private final String from;
  private final String to;
  private final List<UsageMeter> meters;
  private final @Nullable String aggregatedThrough;

  private ProjectUsage(
      String projectId,
      String source,
      String observedAt,
      Boolean complete,
      String reason,
      String from,
      String to,
      List<UsageMeter> meters,
      @Nullable String aggregatedThrough) {
    this.projectId = projectId;
    this.source = source;
    this.observedAt = observedAt;
    this.complete = complete;
    this.reason = reason;
    this.from = from;
    this.to = to;
    this.meters = meters;
    this.aggregatedThrough = aggregatedThrough;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ProjectUsage fromJson(@Nullable Object value) {
    return Wire.required(ProjectUsage::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ProjectUsage decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ProjectUsage");
    return new ProjectUsage(
        Wire.field(object, "ProjectUsage", "projectId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "ProjectUsage", "source", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ProjectUsage", "observedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ProjectUsage", "complete", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "ProjectUsage", "reason", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ProjectUsage", "from", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ProjectUsage", "to", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ProjectUsage", "meters", depth, Wire.required(Wire.list(Wire.required(UsageMeter::decode)))),
        Wire.field(object, "ProjectUsage", "aggregatedThrough", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>projectId</code> field. */
  public String getProjectId() {
    return this.projectId;
  }

  /** The <code>source</code> field. */
  public String getSource() {
    return this.source;
  }

  /** The <code>observedAt</code> field. */
  public String getObservedAt() {
    return this.observedAt;
  }

  /** The <code>complete</code> field. */
  public Boolean getComplete() {
    return this.complete;
  }

  /** The <code>reason</code> field. */
  public String getReason() {
    return this.reason;
  }

  /** The <code>from</code> field. */
  public String getFrom() {
    return this.from;
  }

  /** The <code>to</code> field. */
  public String getTo() {
    return this.to;
  }

  /** The <code>meters</code> field. */
  public List<UsageMeter> getMeters() {
    return this.meters;
  }

  /** The <code>aggregatedThrough</code> field. */
  public @Nullable String getAggregatedThrough() {
    return this.aggregatedThrough;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("source", Wire.json(this.source));
    json.put("observedAt", Wire.json(this.observedAt));
    json.put("complete", Wire.json(this.complete));
    json.put("reason", Wire.json(this.reason));
    json.put("from", Wire.json(this.from));
    json.put("to", Wire.json(this.to));
    json.put("meters", Wire.json(this.meters));
    json.put("aggregatedThrough", Wire.json(this.aggregatedThrough));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ProjectUsage)) {
      return false;
    }
    ProjectUsage that = (ProjectUsage) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.source, that.source)
        && Objects.equals(this.observedAt, that.observedAt)
        && Objects.equals(this.complete, that.complete)
        && Objects.equals(this.reason, that.reason)
        && Objects.equals(this.from, that.from)
        && Objects.equals(this.to, that.to)
        && Objects.equals(this.meters, that.meters)
        && Objects.equals(this.aggregatedThrough, that.aggregatedThrough);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.source, this.observedAt, this.complete, this.reason, this.from, this.to, this.meters, this.aggregatedThrough);
  }

  @Override
  public String toString() {
    return "ProjectUsage{projectId=" + this.projectId
        + ", source=" + this.source
        + ", observedAt=" + this.observedAt
        + ", complete=" + this.complete
        + ", reason=" + this.reason
        + ", from=" + this.from
        + ", to=" + this.to
        + ", meters=" + this.meters
        + ", aggregatedThrough=" + this.aggregatedThrough
        + "}";
  }
}
