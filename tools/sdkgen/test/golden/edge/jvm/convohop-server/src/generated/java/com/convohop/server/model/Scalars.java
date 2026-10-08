// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/** Decoders for the custom scalars, built from their representations and constraints. */
public final class Scalars {
  private Scalars() {}

  /** <code>Counter</code>: Non-negative counter as a canonical decimal string. */
  public static final Wire.Decoder<String> COUNTER =
      Wire.string("^(0|[1-9][0-9]*)\\z", "9223372036854775807", List.of());

  /** <code>Blob</code>: Server-signed JSON object. Pass it back unchanged. */
  public static final Wire.Decoder<Map<String, @Nullable Object>> BLOB =
      Wire.objectScalar(1024, List.of("signature"));

  /** <code>Ratio</code>: Fraction between 0 and 1. */
  public static final Wire.Decoder<Double> RATIO =
      Wire.number(0.0, 1.0);
}
