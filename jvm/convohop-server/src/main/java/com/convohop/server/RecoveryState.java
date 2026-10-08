package com.convohop.server;

import com.convohop.server.internal.Wire;
import java.time.Instant;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * A snapshot of one mutation's recovery record: the original request ID, payload and incarnation, the retry budget
 * and what is known about the outcome. Records are created and updated only by the SDK.
 */
public final class RecoveryState {
  /** What is known about a mutation's outcome. */
  public enum Resolution {
    /** Not yet sent. */
    PENDING("pending"),
    /** Sent, but the outcome is uncertain: resolve or retry the same request. */
    UNKNOWN("unknown"),
    /** The authority committed the mutation. */
    COMMITTED("committed"),
    /** The authority accepted the mutation as a long-running operation. */
    ACCEPTED("accepted");

    private final String wireValue;

    Resolution(String wireValue) {
      this.wireValue = wireValue;
    }

    /**
     * The stored value.
     *
     * @return the value
     */
    public String wireValue() {
      return this.wireValue;
    }

    static @Nullable Resolution fromWire(@Nullable Object value) {
      for (Resolution resolution : values()) {
        if (resolution.wireValue.equals(value)) {
          return resolution;
        }
      }
      return null;
    }
  }

  private final String requestId;
  private final String incarnation;
  private final String payloadFingerprint;
  private final String operation;
  private final @Nullable String projectId;
  private final Map<String, @Nullable Object> input;
  private final long firstSubmittedAt;
  private final long retryDeadline;
  private final int attemptCount;
  private final long lastAttemptAt;
  private final String lastAttemptClassification;
  private final Resolution resolution;
  private final boolean mediaAdmissionAttempted;

  RecoveryState(
      String requestId,
      String incarnation,
      String payloadFingerprint,
      String operation,
      @Nullable String projectId,
      Map<String, @Nullable Object> input,
      long firstSubmittedAt,
      long retryDeadline,
      int attemptCount,
      long lastAttemptAt,
      String lastAttemptClassification,
      Resolution resolution,
      boolean mediaAdmissionAttempted) {
    this.requestId = requestId;
    this.incarnation = incarnation;
    this.payloadFingerprint = payloadFingerprint;
    this.operation = operation;
    this.projectId = projectId;
    this.input = Wire.immutable(input);
    this.firstSubmittedAt = firstSubmittedAt;
    this.retryDeadline = retryDeadline;
    this.attemptCount = attemptCount;
    this.lastAttemptAt = lastAttemptAt;
    this.lastAttemptClassification = lastAttemptClassification;
    this.resolution = resolution;
    this.mediaAdmissionAttempted = mediaAdmissionAttempted;
  }

  /**
   * The original request ID.
   *
   * @return the request ID
   */
  public String getRequestId() {
    return this.requestId;
  }

  /**
   * The project incarnation the request was sent in, or {@code management} for management requests.
   *
   * @return the incarnation
   */
  public String getIncarnation() {
    return this.incarnation;
  }

  /**
   * The SHA-256 fingerprint of the operation, project and input.
   *
   * @return the fingerprint, prefixed with {@code sha256:}
   */
  public String getPayloadFingerprint() {
    return this.payloadFingerprint;
  }

  /**
   * The operation ID, such as {@code communication.sendMessage}.
   *
   * @return the operation ID
   */
  public String getOperation() {
    return this.operation;
  }

  /**
   * The project of a communication request, or null for management requests.
   *
   * @return the project ID, or null
   */
  public @Nullable String getProjectId() {
    return this.projectId;
  }

  /**
   * The original operation input.
   *
   * @return the unmodifiable input
   */
  public Map<String, @Nullable Object> getInput() {
    return this.input;
  }

  /**
   * When the record was created.
   *
   * @return the time
   */
  public Instant getFirstSubmittedAt() {
    return Instant.ofEpochMilli(this.firstSubmittedAt);
  }

  /**
   * After this time the request is no longer resent; resolve it read-only.
   *
   * @return the time
   */
  public Instant getRetryDeadline() {
    return Instant.ofEpochMilli(this.retryDeadline);
  }

  /**
   * How many times the request was sent.
   *
   * @return the count
   */
  public int getAttemptCount() {
    return this.attemptCount;
  }

  /**
   * When the request was last sent, or created if it was not sent.
   *
   * @return the time
   */
  public Instant getLastAttemptAt() {
    return Instant.ofEpochMilli(this.lastAttemptAt);
  }

  /**
   * How the last attempt ended, such as {@code submitted}, {@code authorityReceipt} or an error code.
   *
   * @return the classification
   */
  public String getLastAttemptClassification() {
    return this.lastAttemptClassification;
  }

  /**
   * What is known about the outcome.
   *
   * @return the resolution
   */
  public Resolution getResolution() {
    return this.resolution;
  }

  /**
   * Whether a native media connection was attempted with the request's credentials, which forbids a resend.
   *
   * @return whether native admission was attempted
   */
  public boolean isMediaAdmissionAttempted() {
    return this.mediaAdmissionAttempted;
  }

  @Override
  public String toString() {
    return "RecoveryState{requestId=" + this.requestId
        + ", operation=" + this.operation
        + ", attemptCount=" + this.attemptCount
        + ", lastAttemptClassification=" + this.lastAttemptClassification
        + ", resolution=" + this.resolution.wireValue + "}";
  }
}
