// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireEnum;
import com.convohop.server.internal.WireException;
import org.jspecify.annotations.Nullable;

/** The <code>LiveErrorCode</code> enum. */
public enum LiveErrorCode implements WireEnum {
  LIVE_SESSION_EXISTS("LIVE_SESSION_EXISTS"),
  LIVE_SESSION_CLOSED("LIVE_SESSION_CLOSED"),
  LIVE_SESSION_INTERRUPTED("LIVE_SESSION_INTERRUPTED"),
  LIVE_SESSION_CAPACITY("LIVE_SESSION_CAPACITY"),
  LIVE_ALERT_LIMIT("LIVE_ALERT_LIMIT"),
  JOINED_ELSEWHERE("JOINED_ELSEWHERE"),
  PARTICIPATION_DRAINING("PARTICIPATION_DRAINING"),
  PARTICIPATION_MISMATCH("PARTICIPATION_MISMATCH"),
  GENERATION_CONFLICT("GENERATION_CONFLICT"),
  MEDIA_NOT_READY("MEDIA_NOT_READY"),
  CREDENTIAL_REFRESH_REQUIRED("CREDENTIAL_REFRESH_REQUIRED"),
  LIVE_START_CANCELLED("LIVE_START_CANCELLED"),
  LIVE_PREPARATION_FAILED("LIVE_PREPARATION_FAILED");

  private final String wireValue;

  LiveErrorCode(String wireValue) {
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
  public static LiveErrorCode fromWire(String value) {
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
  public static LiveErrorCode decode(@Nullable Object value, int depth) {
    String text = Wire.STRING.decode(value, depth);
    for (LiveErrorCode candidate : values()) {
      if (candidate.wireValue.equals(text)) {
        return candidate;
      }
    }
    throw new WireException("unknown LiveErrorCode value");
  }
}
