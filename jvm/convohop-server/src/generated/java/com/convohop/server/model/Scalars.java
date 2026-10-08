// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/** Decoders for the custom scalars, built from their representations and constraints. */
public final class Scalars {
  private Scalars() {}

  /** <code>Decimal</code>: Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number. */
  public static final Wire.Decoder<String> DECIMAL =
      Wire.string("^(0|[1-9][0-9]*)\\z", "9223372036854775807", List.of());

  /** <code>PageSize</code>: Requested page size. */
  public static final Wire.Decoder<Integer> PAGE_SIZE =
      Wire.integer(1L, 100L);

  /** <code>Properties</code>: Application-defined JSON object. Numbers must stay within the interoperable safe-integer range. */
  public static final Wire.Decoder<Map<String, @Nullable Object>> PROPERTIES =
      Wire.objectScalar(8192, List.of());

  /** <code>SignedProof</code>: Server-signed JSON object. Treat it as opaque and pass it back unchanged. */
  public static final Wire.Decoder<Map<String, @Nullable Object>> SIGNED_PROOF =
      Wire.objectScalar(32768, List.of("signature"));

  /** <code>UUID</code>: Canonical lowercase UUID. The nil UUID is rejected. */
  public static final Wire.Decoder<String> UUID =
      Wire.string("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\z", null, List.of("00000000-0000-0000-0000-000000000000"));
}
