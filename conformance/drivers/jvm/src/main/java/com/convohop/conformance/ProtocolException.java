package com.convohop.conformance;

/** The request itself failed with a driver-protocol error code. SDK failures are results, never protocol errors. */
final class ProtocolException extends RuntimeException {
  private static final long serialVersionUID = 1L;

  private final String code;

  ProtocolException(String code, String message) {
    super(message);
    this.code = code;
  }

  String code() {
    return code;
  }
}
