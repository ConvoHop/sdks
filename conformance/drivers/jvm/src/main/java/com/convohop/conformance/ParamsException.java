package com.convohop.conformance;

/** A request's parameters are invalid: an INVALID_PARAMS protocol error, never an SDK result. */
final class ParamsException extends RuntimeException {
  private static final long serialVersionUID = 1L;

  ParamsException(String message) {
    super(message);
  }
}
