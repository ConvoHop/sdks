package com.convohop.server.webhooks;

import com.convohop.server.internal.Wire;

/** A delivery that failed verification. The message never contains secrets, signatures or the body. */
public final class WebhookVerificationException extends RuntimeException {
  private static final long serialVersionUID = 1L;

  private final WebhookVerificationCode code;

  /**
   * Creates the exception.
   *
   * @param code why verification failed
   * @param message a description without secrets, signatures or the body
   */
  public WebhookVerificationException(WebhookVerificationCode code, String message) {
    super(message);
    this.code = Wire.nonNull(code, "code");
  }

  /**
   * Why verification failed.
   *
   * @return the code
   */
  public WebhookVerificationCode getCode() {
    return code;
  }
}
