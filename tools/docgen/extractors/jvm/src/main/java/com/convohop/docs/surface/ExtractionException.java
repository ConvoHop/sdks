package com.convohop.docs.surface;

/** A declaration or comment the extractor can't document faithfully. The message starts with its source location. */
final class ExtractionException extends RuntimeException {
  private static final long serialVersionUID = 1L;

  ExtractionException(String message) {
    super(message);
  }
}
