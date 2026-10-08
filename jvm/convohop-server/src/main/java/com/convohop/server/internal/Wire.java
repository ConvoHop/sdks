package com.convohop.server.internal;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * Decoders and helpers used by the generated wire types. Decoding follows the TypeScript SDK's output validation: a
 * missing field is rejected even when its type is nullable, lists hold at most 100 items and nesting is bounded.
 * Not API.
 */
public final class Wire {
  /** The deepest nesting a decoded response may have, as in the TypeScript SDK. */
  public static final int MAX_DEPTH = 16;

  /** The most items a decoded list may hold. */
  public static final int MAX_LIST_ITEMS = 100;

  /** A GraphQL {@code String}. */
  public static final Decoder<String> STRING = (value, depth) -> {
    if (!(value instanceof String)) {
      throw new WireException("Expected a GraphQL string");
    }
    return (String) value;
  };

  /** A GraphQL {@code Boolean}. */
  public static final Decoder<Boolean> BOOLEAN = (value, depth) -> {
    if (!(value instanceof Boolean)) {
      throw new WireException("Expected a GraphQL boolean");
    }
    return (Boolean) value;
  };

  /** A GraphQL {@code Int}: a safe integer within the 32-bit range. */
  public static final Decoder<Integer> INT = integer(null, null);

  /** A GraphQL {@code Float}: a finite number. */
  public static final Decoder<Double> FLOAT = number(null, null);

  private static final BigInteger MAX_SAFE = BigInteger.valueOf(Json.MAX_SAFE_INTEGER);

  private Wire() {}

  /**
   * Decodes one JSON value at a nesting depth.
   *
   * @param <T> the decoded type
   */
  @FunctionalInterface
  public interface Decoder<T extends @Nullable Object> {
    /**
     * Decodes a value.
     *
     * @param value the JSON value
     * @param depth the nesting depth of the value
     * @return the decoded value
     * @throws WireException if the value does not match the wire contract
     */
    T decode(@Nullable Object value, int depth);
  }

  /**
   * A decoder that rejects null.
   *
   * @param <T> the decoded type
   * @param decoder the decoder for present values
   * @return the decoder
   */
  public static <T> Decoder<T> required(Decoder<T> decoder) {
    return (value, depth) -> {
      checkDepth(depth);
      if (value == null) {
        throw new WireException("Missing GraphQL response value");
      }
      return decoder.decode(value, depth);
    };
  }

  /**
   * A decoder that maps null to null.
   *
   * @param <T> the decoded type
   * @param decoder the decoder for present values
   * @return the decoder
   */
  public static <T> Decoder<@Nullable T> optional(Decoder<T> decoder) {
    return (value, depth) -> {
      checkDepth(depth);
      if (value == null) {
        return null;
      }
      return decoder.decode(value, depth);
    };
  }

  /**
   * A decoder for a bounded list.
   *
   * @param <T> the item type
   * @param item the item decoder
   * @return the decoder, which returns an unmodifiable list
   */
  public static <T extends @Nullable Object> Decoder<List<T>> list(Decoder<T> item) {
    return (value, depth) -> {
      if (!(value instanceof List) || ((List<?>) value).size() > MAX_LIST_ITEMS) {
        throw new WireException("Invalid bounded GraphQL list");
      }
      List<T> items = new ArrayList<>();
      for (Object entry : (List<?>) value) {
        items.add(item.decode(entry, depth + 1));
      }
      return Collections.unmodifiableList(items);
    };
  }

  /**
   * Checks that a value is a JSON object.
   *
   * @param value the value
   * @param type the GraphQL type, for the error message
   * @return the object
   * @throws WireException if the value is not an object with string keys
   */
  @SuppressWarnings("unchecked")
  public static Map<String, @Nullable Object> object(@Nullable Object value, String type) {
    if (!(value instanceof Map)) {
      throw new WireException("Expected a GraphQL " + type + " object");
    }
    for (Object key : ((Map<?, ?>) value).keySet()) {
      if (!(key instanceof String)) {
        throw new WireException("Expected a GraphQL " + type + " object");
      }
    }
    return (Map<String, @Nullable Object>) value;
  }

  /**
   * Decodes a field that must be present, although its value may be null when the decoder allows it.
   *
   * @param <T> the field type
   * @param object the enclosing object
   * @param type the GraphQL type, for the error message
   * @param name the field name
   * @param depth the depth of the enclosing object
   * @param decoder the field decoder
   * @return the decoded field
   * @throws WireException if the field is missing or invalid
   */
  public static <T extends @Nullable Object> T field(
      Map<String, @Nullable Object> object, String type, String name, int depth, Decoder<T> decoder) {
    if (!object.containsKey(name)) {
      throw new WireException("Missing GraphQL response field " + type + "." + name);
    }
    return decoder.decode(object.get(name), depth + 1);
  }

  /**
   * Checks that exactly one of an object's values is non-null, as for a union carried by nullable fields.
   *
   * @param object the object
   * @param type the GraphQL type, for the error message
   * @throws WireException if not exactly one value is non-null
   */
  public static void exactlyOneNonNull(Map<String, @Nullable Object> object, String type) {
    int present = 0;
    for (Object value : object.values()) {
      if (value != null) {
        present++;
      }
    }
    if (present != 1) {
      throw new WireException(type + " requires exactly one typed result");
    }
  }

  /**
   * Converts a field value to JSON: wire objects to maps, enums to their wire values, lists and maps element-wise.
   *
   * @param value the value
   * @return the JSON value
   */
  public static @Nullable Object json(@Nullable Object value) {
    if (value instanceof WireValue) {
      return ((WireValue) value).toJson();
    }
    if (value instanceof WireEnum) {
      return ((WireEnum) value).wireValue();
    }
    if (value instanceof List) {
      List<@Nullable Object> items = new ArrayList<>();
      for (Object item : (List<?>) value) {
        items.add(json(item));
      }
      return items;
    }
    if (value instanceof Map) {
      Map<String, @Nullable Object> entries = new LinkedHashMap<>();
      for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
        entries.put(String.valueOf(entry.getKey()), json(entry.getValue()));
      }
      return entries;
    }
    return value;
  }

  /**
   * Checks that a builder set a required field.
   *
   * @param <T> the field type
   * @param value the field value
   * @param name the qualified field name
   * @return the value
   * @throws IllegalStateException if the value is null
   */
  public static <T> T present(@Nullable T value, String name) {
    if (value == null) {
      throw new IllegalStateException(name + " is required");
    }
    return value;
  }

  /**
   * Checks an argument.
   *
   * @param <T> the argument type
   * @param value the argument
   * @param name the parameter name
   * @return the argument
   * @throws NullPointerException if the argument is null
   */
  public static <T> T nonNull(@Nullable T value, String name) {
    if (value == null) {
      throw new NullPointerException(name + " must not be null");
    }
    return value;
  }

  /**
   * A deep, unmodifiable copy of a JSON value given to a builder.
   *
   * @param <T> the value type
   * @param value null, or a JSON value made of strings, booleans, numbers, maps with string keys, lists, wire objects
   *     and wire enums
   * @return the copy
   * @throws IllegalArgumentException if the value is not JSON
   */
  @SuppressWarnings("unchecked")
  public static <T extends @Nullable Object> T immutable(T value) {
    return (T) copy(value, 0);
  }

  /**
   * Renders a sensitive value in {@code toString} without revealing it.
   *
   * @param value the value
   * @return {@code "null"} or a redaction marker
   */
  public static String redacted(@Nullable Object value) {
    return value == null ? "null" : "[redacted]";
  }

  /**
   * A string scalar decoder.
   *
   * @param pattern a regular expression the value must contain a match for, or null
   * @param maximumDecimal the largest decimal value allowed, or null
   * @param disallowed values that are rejected
   * @return the decoder
   */
  public static Decoder<String> string(@Nullable String pattern, @Nullable String maximumDecimal, List<String> disallowed) {
    Pattern compiled = pattern == null ? null : Pattern.compile(pattern);
    BigInteger maximum = maximumDecimal == null ? null : new BigInteger(maximumDecimal);
    List<String> rejected = List.copyOf(disallowed);
    return (value, depth) -> {
      String text = STRING.decode(value, depth);
      if (compiled != null && !compiled.matcher(text).find()) {
        throw new WireException("Invalid GraphQL scalar value");
      }
      if (maximum != null) {
        BigInteger decimal;
        try {
          decimal = new BigInteger(text);
        } catch (NumberFormatException error) {
          throw new WireException("Invalid GraphQL decimal");
        }
        if (decimal.compareTo(maximum) > 0) {
          throw new WireException("Invalid GraphQL decimal");
        }
      }
      if (rejected.contains(text)) {
        throw new WireException("Invalid GraphQL scalar value");
      }
      return text;
    };
  }

  /**
   * A 32-bit integer scalar decoder.
   *
   * @param minimum the smallest value allowed, or null
   * @param maximum the largest value allowed, or null
   * @return the decoder
   */
  public static Decoder<Integer> integer(@Nullable Long minimum, @Nullable Long maximum) {
    long low = minimum == null ? Integer.MIN_VALUE : Math.max(minimum, Integer.MIN_VALUE);
    long high = maximum == null ? Integer.MAX_VALUE : Math.min(maximum, Integer.MAX_VALUE);
    return (value, depth) -> (int) bounded(safeInteger(value), low, high);
  }

  /**
   * A 64-bit integer scalar decoder, limited to safe integers.
   *
   * @param minimum the smallest value allowed, or null
   * @param maximum the largest value allowed, or null
   * @return the decoder
   */
  public static Decoder<Long> longInteger(@Nullable Long minimum, @Nullable Long maximum) {
    long low = minimum == null ? -Json.MAX_SAFE_INTEGER : minimum;
    long high = maximum == null ? Json.MAX_SAFE_INTEGER : maximum;
    return (value, depth) -> bounded(safeInteger(value), low, high);
  }

  /**
   * A finite number scalar decoder.
   *
   * @param minimum the smallest value allowed, or null
   * @param maximum the largest value allowed, or null
   * @return the decoder
   */
  public static Decoder<Double> number(@Nullable Double minimum, @Nullable Double maximum) {
    return (value, depth) -> {
      if (!(value instanceof Number)) {
        throw new WireException("Expected a GraphQL number");
      }
      double number = ((Number) value).doubleValue();
      if (!Double.isFinite(number)
          || (minimum != null && number < minimum)
          || (maximum != null && number > maximum)) {
        throw new WireException("GraphQL number is out of range");
      }
      return number;
    };
  }

  /**
   * An object scalar decoder. The decoded map is a deep, unmodifiable copy.
   *
   * @param maxCanonicalJsonBytes the largest canonical JSON encoding allowed, in UTF-8 bytes, or 0 for no bound
   * @param requiredStringProperties properties that must be present as strings
   * @return the decoder
   */
  public static Decoder<Map<String, @Nullable Object>> objectScalar(
      long maxCanonicalJsonBytes, List<String> requiredStringProperties) {
    List<String> requiredProperties = List.copyOf(requiredStringProperties);
    return (value, depth) -> {
      Map<String, @Nullable Object> object = object(value, "object scalar");
      Map<String, @Nullable Object> copy;
      String canonical;
      try {
        copy = immutable(object);
        canonical = Json.canonical(copy);
      } catch (IllegalArgumentException error) {
        throw new WireException("Invalid GraphQL object scalar");
      }
      if (maxCanonicalJsonBytes > 0 && Json.utf8Length(canonical) > maxCanonicalJsonBytes) {
        throw new WireException("GraphQL object scalar exceeds its size bound");
      }
      for (String property : requiredProperties) {
        if (!(copy.get(property) instanceof String)) {
          throw new WireException("GraphQL object scalar requires a string " + property);
        }
      }
      return copy;
    };
  }

  /**
   * Converts a JSON number to a long if it is a safe integer.
   *
   * @param value the value
   * @return the integer
   * @throws WireException if the value is not a safe integer
   */
  public static long safeInteger(@Nullable Object value) {
    if (value instanceof Long || value instanceof Integer || value instanceof Short || value instanceof Byte) {
      long number = ((Number) value).longValue();
      if (number <= Json.MAX_SAFE_INTEGER && number >= -Json.MAX_SAFE_INTEGER) {
        return number;
      }
    } else if (value instanceof Double || value instanceof Float) {
      double number = ((Number) value).doubleValue();
      if (Double.isFinite(number) && Math.rint(number) == number && Math.abs(number) <= Json.MAX_SAFE_INTEGER) {
        return (long) number;
      }
    } else if (value instanceof BigInteger) {
      BigInteger number = (BigInteger) value;
      if (number.abs().compareTo(MAX_SAFE) <= 0) {
        return number.longValue();
      }
    } else if (value instanceof BigDecimal) {
      try {
        BigInteger number = ((BigDecimal) value).toBigIntegerExact();
        if (number.abs().compareTo(MAX_SAFE) <= 0) {
          return number.longValue();
        }
      } catch (ArithmeticException error) {
        throw new WireException("Expected a safe GraphQL integer");
      }
    }
    throw new WireException("Expected a safe GraphQL integer");
  }

  private static long bounded(long value, long minimum, long maximum) {
    if (value < minimum || value > maximum) {
      throw new WireException("GraphQL integer is out of range");
    }
    return value;
  }

  private static void checkDepth(int depth) {
    if (depth > MAX_DEPTH) {
      throw new WireException("GraphQL response exceeds its depth bound");
    }
  }

  private static @Nullable Object copy(@Nullable Object value, int depth) {
    if (depth > 1000) {
      throw new IllegalArgumentException("JSON nesting exceeds the bound");
    }
    if (value == null
        || value instanceof String
        || value instanceof Boolean
        || value instanceof WireValue
        || value instanceof WireEnum) {
      return value;
    }
    if (value instanceof Number) {
      if (value instanceof Double || value instanceof Float) {
        if (!Double.isFinite(((Number) value).doubleValue())) {
          throw new IllegalArgumentException("JSON numbers must be finite");
        }
      } else if (!(value instanceof Long
          || value instanceof Integer
          || value instanceof Short
          || value instanceof Byte
          || value instanceof BigInteger
          || value instanceof BigDecimal)) {
        throw new IllegalArgumentException("Unsupported JSON number type " + value.getClass().getName());
      }
      return value;
    }
    if (value instanceof Map) {
      Map<String, @Nullable Object> entries = new LinkedHashMap<>();
      for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
        if (!(entry.getKey() instanceof String)) {
          throw new IllegalArgumentException("JSON object keys must be strings");
        }
        entries.put((String) entry.getKey(), copy(entry.getValue(), depth + 1));
      }
      return Collections.unmodifiableMap(entries);
    }
    if (value instanceof List) {
      List<@Nullable Object> items = new ArrayList<>();
      for (Object item : (List<?>) value) {
        items.add(copy(item, depth + 1));
      }
      return Collections.unmodifiableList(items);
    }
    throw new IllegalArgumentException("Unsupported JSON value of type " + value.getClass().getName());
  }
}
