package com.convohop.server.internal;

import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.OptionalLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** RFC 3339 timestamps as the webhook and push payload contracts define them. Not API. */
public final class Rfc3339 {
  private static final Pattern TIMESTAMP =
      Pattern.compile(
          "([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\\.[0-9]{1,9})?"
              + "(?:Z|([+-])([0-9]{2}):([0-9]{2}))");

  private Rfc3339() {}

  /**
   * The Unix seconds of an RFC 3339 timestamp with an uppercase {@code T}, and {@code Z} or an offset, ignoring any
   * fraction. The date must exist, and second 60 isn't accepted.
   *
   * @param value the timestamp
   * @return its Unix seconds, or empty when the value isn't such a timestamp
   */
  public static OptionalLong epochSeconds(String value) {
    Matcher match = TIMESTAMP.matcher(value);
    if (!match.matches()) {
      return OptionalLong.empty();
    }
    int offsetHour = match.group(8) == null ? 0 : Integer.parseInt(match.group(8));
    int offsetMinute = match.group(9) == null ? 0 : Integer.parseInt(match.group(9));
    if (offsetHour > 23 || offsetMinute > 59) {
      return OptionalLong.empty();
    }
    long local;
    try {
      local =
          LocalDateTime.of(
                  Integer.parseInt(match.group(1)),
                  Integer.parseInt(match.group(2)),
                  Integer.parseInt(match.group(3)),
                  Integer.parseInt(match.group(4)),
                  Integer.parseInt(match.group(5)),
                  Integer.parseInt(match.group(6)))
              .toEpochSecond(ZoneOffset.UTC);
    } catch (DateTimeException invalid) {
      return OptionalLong.empty();
    }
    int sign = "-".equals(match.group(7)) ? -1 : 1;
    return OptionalLong.of(local - sign * (offsetHour * 3600L + offsetMinute * 60L));
  }
}
