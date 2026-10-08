// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireEnum;
import com.convohop.server.internal.WireException;
import org.jspecify.annotations.Nullable;

/** The <code>LiveCutoffEvidence</code> enum. */
public enum LiveCutoffEvidence implements WireEnum {
  NATIVE_FENCE("NATIVE_FENCE"),
  MONOTONIC_BOOT_RETIREMENT("MONOTONIC_BOOT_RETIREMENT"),
  NO_GRANTS_ISSUED("NO_GRANTS_ISSUED");

  private final String wireValue;

  LiveCutoffEvidence(String wireValue) {
    this.wireValue = wireValue;
  }

  /** The value on the wire. */
  @Override
  public String wireValue() {
    return this.wireValue;
  }

  /**
   * The constant for a wire value.
   *
   * @param value the value on the wire
   * @return the constant
   * @throws IllegalArgumentException for a value this SDK version does not know
   */
  public static LiveCutoffEvidence fromWire(String value) {
    return decode(value, 0);
  }

  /**
   * Decodes an authority value. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the constant
   * @throws WireException for anything but a known value
   */
  public static LiveCutoffEvidence decode(@Nullable Object value, int depth) {
    String text = Wire.STRING.decode(value, depth);
    for (LiveCutoffEvidence candidate : values()) {
      if (candidate.wireValue.equals(text)) {
        return candidate;
      }
    }
    throw new WireException("unknown LiveCutoffEvidence value");
  }
}
