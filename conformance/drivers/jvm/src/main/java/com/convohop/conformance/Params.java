package com.convohop.conformance;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * Strict decoding of driver-protocol parameters, matching the reference driver's {@code params.mts}. A key that is
 * present with a JSON null is not absent. Failures are {@link ParamsException}s.
 */
final class Params {
  /** The largest integer that JavaScript represents exactly ({@code Number.MAX_SAFE_INTEGER}). */
  static final long MAX_SAFE_INTEGER = 9007199254740991L;

  private static final Pattern HANDLE = Pattern.compile("[A-Za-z0-9._:-]{1,64}");

  private Params() {}

  @SuppressWarnings("unchecked")
  static Map<String, @Nullable Object> record(@Nullable Object value, String name) {
    if (!(value instanceof Map)) {
      throw new ParamsException(name + " must be an object");
    }
    return (Map<String, @Nullable Object>) value;
  }

  static String text(Map<String, @Nullable Object> args, String name) {
    Object value = args.get(name);
    if (!(value instanceof String)) {
      throw new ParamsException(name + " must be a string");
    }
    return (String) value;
  }

  static @Nullable String optionalText(Map<String, @Nullable Object> args, String name) {
    return args.containsKey(name) ? text(args, name) : null;
  }

  /** An integer in {@code min..max}, or null when absent. */
  static @Nullable Long integer(Map<String, @Nullable Object> args, String name, long min, long max) {
    if (!args.containsKey(name)) {
      return null;
    }
    Long value = safeInteger(args.get(name));
    if (value == null || value < min || value > max) {
      throw new ParamsException(name + " must be an integer in " + min + ".." + max);
    }
    return value;
  }

  /** The value as an integer when JavaScript's {@code Number.isSafeInteger} would accept it, otherwise null. */
  static @Nullable Long safeInteger(@Nullable Object value) {
    if (value instanceof Long) {
      long number = (Long) value;
      return number >= -MAX_SAFE_INTEGER && number <= MAX_SAFE_INTEGER ? number : null;
    }
    if (value instanceof Double) {
      double number = (Double) value;
      // 1.0 and 1e2 are integers in JSON's JavaScript reading; NaN and the infinities are not.
      if (number == Math.rint(number) && Math.abs(number) <= MAX_SAFE_INTEGER) {
        return (long) number;
      }
    }
    return null;
  }

  static List<String> strings(Map<String, @Nullable Object> args, String name) {
    Object value = args.get(name);
    if (!(value instanceof List)) {
      throw new ParamsException(name + " must be an array of strings");
    }
    List<String> strings = new ArrayList<>();
    for (Object item : (List<?>) value) {
      if (!(item instanceof String)) {
        throw new ParamsException(name + " must be an array of strings");
      }
      strings.add((String) item);
    }
    return strings;
  }

  static List<Map<String, @Nullable Object>> entries(Map<String, @Nullable Object> args, String name) {
    Object value = args.get(name);
    if (!(value instanceof List)) {
      throw new ParamsException(name + " must be an array");
    }
    List<Map<String, @Nullable Object>> entries = new ArrayList<>();
    for (Object item : (List<?>) value) {
      entries.add(record(item, name + "[" + entries.size() + "]"));
    }
    return entries;
  }

  static String handle(Map<String, @Nullable Object> args, String name) {
    String value = text(args, name);
    if (!HANDLE.matcher(value).matches()) {
      throw new ParamsException(name + " must match [A-Za-z0-9._:-]{1,64}");
    }
    return value;
  }
}
