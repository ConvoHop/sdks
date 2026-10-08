package com.convohop.server.internal;

/** A value that does not match the wire contract. Not API. */
public final class WireException extends IllegalArgumentException {
  private static final long serialVersionUID = 1L;

  /**
   * Creates the exception.
   *
   * @param message what was wrong, without the offending value
   */
  public WireException(String message) {
    super(message);
  }
}
