package com.convohop.server.internal;

import java.util.Map;
import org.jspecify.annotations.Nullable;

/** A generated wire object or input that serializes to a JSON object. Not API. */
public interface WireValue {
  /**
   * The JSON object for this value.
   *
   * @return an unmodifiable map of JSON values
   */
  Map<String, @Nullable Object> toJson();
}
