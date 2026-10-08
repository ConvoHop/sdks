package com.convohop.server.webhooks;

/**
 * Why a delivery failed verification. Verification checks run in this order and stop at the first failure.
 */
public enum WebhookVerificationCode {
  /**
   * No secret is given, or one is not {@code whsec_} followed by padded standard Base64 of 24 to 64 bytes. This is
   * your configuration, not the sender: {@link WebhookVerifier.Builder#build()} throws it.
   */
  INVALID_SECRET,
  /** {@code webhook-id}, {@code webhook-timestamp} or {@code webhook-signature} is absent or empty. */
  MISSING_HEADER,
  /** One of those headers is repeated. */
  INVALID_HEADER,
  /** {@code webhook-timestamp} is not 1 to 15 ASCII digits (integer Unix seconds). */
  INVALID_TIMESTAMP,
  /** The timestamp is more than the tolerance before now. */
  TIMESTAMP_EXPIRED,
  /** The timestamp is more than the tolerance after now. */
  TIMESTAMP_FUTURE,
  /** The body exceeds 4096 bytes. */
  BODY_TOO_LARGE,
  /** {@code webhook-signature} has more than 8 entries. */
  TOO_MANY_SIGNATURES,
  /** No {@code v1} entry matches any secret. */
  NO_MATCHING_SIGNATURE,
  /** {@link WebhookVerifier#verify} only: the signed body is not a UTF-8 JSON event envelope. */
  INVALID_BODY
}
