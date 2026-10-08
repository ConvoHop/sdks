package com.convohop.server.internal;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.OptionalLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

// Ports the timestamp cases in conformance/test/push.test.mjs, with the same independent calendar oracle.
class Rfc3339Test {
  private static final long DAY = 86_400;
  private static final Pattern TIMESTAMP = Pattern.compile("([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):"
      + "([0-9]{2})(?:\\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))");
  // Each leap-year rule: every 4th year, but not every 100th, but every 400th.
  private static final int[] YEARS =
      {0, 4, 96, 100, 104, 400, 1600, 1700, 1896, 1900, 1904, 1970, 2000, 2024, 2026, 2100, 2104, 2400, 9996, 9999};
  private static final List<String> TIMES = List.of(
      "2026-10-10T00:00:00Z", "2026-10-10T23:59:59Z", "2026-10-10T24:00:00Z", "2026-10-10T23:60:00Z",
      "2026-10-10T23:59:60Z", "2026-10-10T23:59:59.5Z", "2026-10-10T23:59:59.123456789Z",
      "2026-10-10T23:59:59.1234567890Z", "2026-10-10T23:59:59.Z", "2026-10-10t23:59:59Z", "2026-10-10T23:59:59z",
      "2026-10-10 23:59:59Z", "2026-10-10T23:59:59", "2026-10-10T23:59:59+23:59", "2026-10-10T23:59:59-00:00",
      "2026-10-10T23:59:59+24:00", "2026-10-10T23:59:59+05:60", "2026-10-10T23:59:59+0530",
      "2026-10-10T23:59:59.999999999-12:45", "0000-01-01T00:00:00.9+00:01", "+2026-10-10T12:00:00Z",
      "20260-10-10T12:00:00Z", "2026-10-1\u0661T12:00:00Z", "2026-10-10T12:00:00Z\n", " 2026-10-10T12:00:00Z");

  @Test
  void theCalendarOracleAgreesWithJavaTimeOnEveryDateOfEachYear() {
    for (int year : YEARS) {
      String prefix = String.format(Locale.ROOT, "%04d-", year);
      int valid = 0;
      for (String value : dates()) {
        OptionalLong seconds = unixSeconds(value);
        if (value.startsWith(prefix) && seconds.isPresent()) {
          valid++;
          assertEquals(LocalDate.parse(value.substring(0, 10)).toEpochDay() * DAY + 12 * 3600, seconds.getAsLong(), value);
        }
      }
      assertEquals(Year.of(year).length(), valid, prefix);
    }
  }

  @Test
  void epochSecondsAcceptsExactlyTheTimestampsThatExist() {
    List<String> values = new ArrayList<>(dates());
    values.addAll(TIMES);
    for (String value : values) {
      assertEquals(unixSeconds(value), Rfc3339.epochSeconds(value), value);
    }
    assertEquals(OptionalLong.of(1_791_633_600L), Rfc3339.epochSeconds("2026-10-10T12:00:00Z"));
    assertEquals(OptionalLong.of(1_791_633_540L), Rfc3339.epochSeconds("2026-10-10T13:59:00.999+02:00"));
    assertEquals(OptionalLong.of(1_791_633_540L), Rfc3339.epochSeconds("2026-10-10T06:29:00-05:30"));
    assertEquals(OptionalLong.of(-62_167_219_260L), Rfc3339.epochSeconds("0000-01-01T00:00:00.9+00:01"));
    assertEquals(OptionalLong.of(253_402_300_799L), Rfc3339.epochSeconds("9999-12-31T23:59:59Z"));
  }

  private static List<String> dates() {
    List<String> dates = new ArrayList<>();
    for (int year : YEARS) {
      for (int month = 0; month < 14; month++) {
        for (int day = 0; day < 33; day++) {
          dates.add(String.format(Locale.ROOT, "%04d-%02d-%02dT12:00:00Z", year, month, day));
        }
      }
    }
    return dates;
  }

  /** Unix seconds of a contract timestamp without its fraction, or empty when the value isn't one. */
  private static OptionalLong unixSeconds(String value) {
    Matcher match = TIMESTAMP.matcher(value);
    if (!match.matches()) {
      return OptionalLong.empty();
    }
    long[] field = new long[10];
    for (int group : new int[] {1, 2, 3, 4, 5, 6, 8, 9}) {
      field[group] = match.group(group) == null ? 0 : Long.parseLong(match.group(group));
    }
    long year = field[1];
    long month = field[2];
    long day = field[3];
    boolean leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    long[] monthDays = {31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (month < 1 || month > 12 || day < 1 || day > monthDays[(int) month - 1] || field[4] > 23 || field[5] > 59
        || field[6] > 59 || field[8] > 23 || field[9] > 59) {
      return OptionalLong.empty();
    }
    long offset = ("-".equals(match.group(7)) ? -1 : 1) * (field[8] * 3600 + field[9] * 60);
    return OptionalLong.of(civilDays(year, month, day) * DAY + field[4] * 3600 + field[5] * 60 + field[6] - offset);
  }

  /** Days from 1970-01-01 to a proleptic Gregorian date. */
  private static long civilDays(long year, long month, long day) {
    long y = month <= 2 ? year - 1 : year;
    long era = Math.floorDiv(y, 400);
    long yearOfEra = y - era * 400;
    long dayOfYear = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1;
    return era * 146_097 + yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear - 719_468;
  }
}
