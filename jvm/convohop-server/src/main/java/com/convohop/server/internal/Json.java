package com.convohop.server.internal;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.jspecify.annotations.Nullable;

/**
 * JSON for the wire protocol, matching JavaScript's {@code JSON.parse} and {@code JSON.stringify}.
 *
 * <p>Objects decode to {@link LinkedHashMap} (a repeated key keeps its first position and its last value, as in
 * JavaScript), arrays to {@link ArrayList}, integer literals that fit in a {@code long} to {@link Long} and other
 * numbers to {@link Double}. Not API.
 */
public final class Json {
  /** The largest integer that JavaScript represents exactly ({@code Number.MAX_SAFE_INTEGER}). */
  public static final long MAX_SAFE_INTEGER = 9007199254740991L;

  private static final int MAX_DEPTH = 1000;

  private Json() {}

  /**
   * Parses one JSON text.
   *
   * @param text the JSON text
   * @return the decoded value
   * @throws WireException if the text is not JSON
   */
  public static @Nullable Object parse(String text) {
    Parser parser = new Parser(text);
    Object value = parser.value(0);
    parser.whitespace();
    if (parser.position != text.length()) {
      throw new WireException("Unexpected text after the JSON value");
    }
    return value;
  }

  /**
   * Serializes a value like {@code JSON.stringify}, keeping map order.
   *
   * @param value null, a string, boolean, number, map with string keys, list, {@link WireValue} or {@link WireEnum}
   * @return the JSON text
   * @throws IllegalArgumentException if the value is not JSON
   */
  public static String stringify(@Nullable Object value) {
    StringBuilder out = new StringBuilder();
    write(out, value, false, 0);
    return out.toString();
  }

  /**
   * Serializes a value in canonical form: object keys sorted by UTF-16 code units and numbers limited to finite
   * values within {@link #MAX_SAFE_INTEGER}, like the TypeScript SDK's {@code canonical}.
   *
   * @param value the value
   * @return the canonical JSON text
   * @throws IllegalArgumentException if the value is not interoperable JSON
   */
  public static String canonical(@Nullable Object value) {
    StringBuilder out = new StringBuilder();
    write(out, value, true, 0);
    return out.toString();
  }

  /**
   * The UTF-8 length of a string. A lone surrogate counts as the three bytes of U+FFFD, as {@code TextEncoder} does.
   *
   * @param text the string
   * @return the number of UTF-8 bytes
   */
  public static int utf8Length(String text) {
    int length = 0;
    for (int index = 0; index < text.length(); index++) {
      char c = text.charAt(index);
      if (c < 0x80) {
        length += 1;
      } else if (c < 0x800) {
        length += 2;
      } else if (Character.isHighSurrogate(c)
          && index + 1 < text.length()
          && Character.isLowSurrogate(text.charAt(index + 1))) {
        length += 4;
        index++;
      } else {
        length += 3;
      }
    }
    return length;
  }

  /**
   * Encodes a string as UTF-8, replacing lone surrogates with U+FFFD as {@code TextEncoder} does.
   *
   * @param text the string
   * @return the UTF-8 bytes
   */
  public static byte[] utf8(String text) {
    // String.getBytes encodes a lone surrogate as '?', not U+FFFD.
    StringBuilder sanitized = null;
    for (int index = 0; index < text.length(); index++) {
      char c = text.charAt(index);
      if (Character.isHighSurrogate(c)
          && index + 1 < text.length()
          && Character.isLowSurrogate(text.charAt(index + 1))) {
        if (sanitized != null) {
          sanitized.append(c).append(text.charAt(index + 1));
        }
        index++;
      } else if (Character.isSurrogate(c)) {
        if (sanitized == null) {
          sanitized = new StringBuilder(text.length()).append(text, 0, index);
        }
        sanitized.append('\uFFFD');
      } else if (sanitized != null) {
        sanitized.append(c);
      }
    }
    return (sanitized == null ? text : sanitized.toString()).getBytes(StandardCharsets.UTF_8);
  }

  /**
   * Whether a string has an unpaired UTF-16 surrogate, which UTF-8 can't encode.
   *
   * @param text the string
   * @return whether the string has a lone surrogate
   */
  public static boolean hasLoneSurrogate(String text) {
    for (int index = 0; index < text.length(); index++) {
      char c = text.charAt(index);
      if (Character.isHighSurrogate(c)
          && index + 1 < text.length()
          && Character.isLowSurrogate(text.charAt(index + 1))) {
        index++;
      } else if (Character.isSurrogate(c)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Formats a finite double like JavaScript's {@code Number.prototype.toString}.
   *
   * @param value a finite double
   * @return the shortest decimal form that reads back as the same double
   * @throws IllegalArgumentException if the value is not finite
   */
  public static String formatNumber(double value) {
    if (!Double.isFinite(value)) {
      throw new IllegalArgumentException("Non-finite numbers are not JSON");
    }
    if (value == 0) {
      return "0";
    }
    double magnitude = Math.abs(value);
    BigDecimal exact = new BigDecimal(magnitude);
    BigDecimal shortest = exact;
    for (int precision = 1; precision <= 17; precision++) {
      BigDecimal candidate = exact.round(new MathContext(precision, RoundingMode.HALF_EVEN));
      if (candidate.doubleValue() == magnitude) {
        shortest = candidate;
        break;
      }
    }
    shortest = shortest.stripTrailingZeros();
    String digits = shortest.unscaledValue().toString();
    int k = digits.length();
    int n = k - shortest.scale();
    StringBuilder out = new StringBuilder(value < 0 ? "-" : "");
    if (k <= n && n <= 21) {
      out.append(digits);
      for (int index = k; index < n; index++) {
        out.append('0');
      }
    } else if (0 < n && n <= 21) {
      out.append(digits, 0, n).append('.').append(digits, n, k);
    } else if (-6 < n && n <= 0) {
      out.append("0.");
      for (int index = n; index < 0; index++) {
        out.append('0');
      }
      out.append(digits);
    } else {
      int exponent = n - 1;
      out.append(digits.charAt(0));
      if (k > 1) {
        out.append('.').append(digits, 1, k);
      }
      out.append('e').append(exponent < 0 ? '-' : '+').append(Math.abs(exponent));
    }
    return out.toString();
  }

  /**
   * Appends a string literal escaped like {@code JSON.stringify}, including lone surrogates.
   *
   * @param out the destination
   * @param text the string
   */
  public static void quote(StringBuilder out, String text) {
    out.append('"');
    for (int index = 0; index < text.length(); index++) {
      char c = text.charAt(index);
      switch (c) {
        case '"':
          out.append("\\\"");
          break;
        case '\\':
          out.append("\\\\");
          break;
        case '\b':
          out.append("\\b");
          break;
        case '\f':
          out.append("\\f");
          break;
        case '\n':
          out.append("\\n");
          break;
        case '\r':
          out.append("\\r");
          break;
        case '\t':
          out.append("\\t");
          break;
        default:
          if (c < 0x20) {
            hex(out, c);
          } else if (Character.isHighSurrogate(c)) {
            if (index + 1 < text.length() && Character.isLowSurrogate(text.charAt(index + 1))) {
              out.append(c).append(text.charAt(++index));
            } else {
              hex(out, c);
            }
          } else if (Character.isLowSurrogate(c)) {
            hex(out, c);
          } else {
            out.append(c);
          }
      }
    }
    out.append('"');
  }

  private static void hex(StringBuilder out, char c) {
    String digits = Integer.toHexString(c);
    out.append("\\u");
    for (int pad = digits.length(); pad < 4; pad++) {
      out.append('0');
    }
    out.append(digits);
  }

  private static void write(StringBuilder out, @Nullable Object value, boolean canonical, int depth) {
    if (depth > MAX_DEPTH) {
      throw new IllegalArgumentException("JSON nesting exceeds the bound");
    }
    if (value == null) {
      out.append("null");
    } else if (value instanceof String) {
      quote(out, (String) value);
    } else if (value instanceof Boolean) {
      out.append(((Boolean) value).booleanValue() ? "true" : "false");
    } else if (value instanceof Number) {
      writeNumber(out, (Number) value, canonical);
    } else if (value instanceof WireValue) {
      write(out, ((WireValue) value).toJson(), canonical, depth);
    } else if (value instanceof WireEnum) {
      quote(out, ((WireEnum) value).wireValue());
    } else if (value instanceof Map) {
      Map<?, ?> map = (Map<?, ?>) value;
      Map<?, ?> ordered = map;
      if (canonical) {
        TreeMap<String, @Nullable Object> sorted = new TreeMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
          sorted.put(key(entry.getKey()), entry.getValue());
        }
        ordered = sorted;
      }
      out.append('{');
      boolean first = true;
      for (Map.Entry<?, ?> entry : ordered.entrySet()) {
        if (!first) {
          out.append(',');
        }
        first = false;
        quote(out, key(entry.getKey()));
        out.append(':');
        write(out, entry.getValue(), canonical, depth + 1);
      }
      out.append('}');
    } else if (value instanceof List) {
      out.append('[');
      boolean first = true;
      for (Object item : (List<?>) value) {
        if (!first) {
          out.append(',');
        }
        first = false;
        write(out, item, canonical, depth + 1);
      }
      out.append(']');
    } else {
      throw new IllegalArgumentException("Unsupported JSON value of type " + value.getClass().getName());
    }
  }

  private static String key(@Nullable Object key) {
    if (!(key instanceof String)) {
      throw new IllegalArgumentException("JSON object keys must be strings");
    }
    return (String) key;
  }

  private static void writeNumber(StringBuilder out, Number number, boolean canonical) {
    if (number instanceof Long || number instanceof Integer || number instanceof Short || number instanceof Byte) {
      long value = number.longValue();
      if (canonical && (value > MAX_SAFE_INTEGER || value < -MAX_SAFE_INTEGER)) {
        throw new IllegalArgumentException("Unsafe protocol number");
      }
      out.append(value);
      return;
    }
    if (number instanceof BigInteger) {
      BigInteger value = (BigInteger) number;
      if (canonical && value.abs().compareTo(BigInteger.valueOf(MAX_SAFE_INTEGER)) > 0) {
        throw new IllegalArgumentException("Unsafe protocol number");
      }
      if (value.bitLength() < 64) {
        out.append(value.longValue());
        return;
      }
    }
    double value = number.doubleValue();
    if (!Double.isFinite(value)) {
      if (canonical) {
        throw new IllegalArgumentException("Unsafe protocol number");
      }
      out.append("null");
      return;
    }
    if (canonical && Math.abs(value) > MAX_SAFE_INTEGER) {
      throw new IllegalArgumentException("Unsafe protocol number");
    }
    out.append(formatNumber(value));
  }

  private static final class Parser {
    private final String text;
    private int position;

    Parser(String text) {
      this.text = text;
    }

    void whitespace() {
      while (position < text.length()) {
        char c = text.charAt(position);
        if (c != ' ' && c != '\t' && c != '\n' && c != '\r') {
          return;
        }
        position++;
      }
    }

    @Nullable Object value(int depth) {
      if (depth > MAX_DEPTH) {
        throw new WireException("JSON nesting exceeds the bound");
      }
      whitespace();
      if (position >= text.length()) {
        throw new WireException("Unexpected end of JSON");
      }
      char c = text.charAt(position);
      switch (c) {
        case '{':
          return object(depth);
        case '[':
          return array(depth);
        case '"':
          return string();
        case 't':
          literal("true");
          return Boolean.TRUE;
        case 'f':
          literal("false");
          return Boolean.FALSE;
        case 'n':
          literal("null");
          return null;
        default:
          if (c == '-' || (c >= '0' && c <= '9')) {
            return number();
          }
          throw new WireException("Unexpected character in JSON");
      }
    }

    private void literal(String word) {
      if (!text.startsWith(word, position)) {
        throw new WireException("Unexpected token in JSON");
      }
      position += word.length();
    }

    private Map<String, @Nullable Object> object(int depth) {
      Map<String, @Nullable Object> result = new LinkedHashMap<>();
      position++;
      whitespace();
      if (position < text.length() && text.charAt(position) == '}') {
        position++;
        return result;
      }
      while (true) {
        whitespace();
        if (position >= text.length() || text.charAt(position) != '"') {
          throw new WireException("Expected a JSON object key");
        }
        String key = string();
        whitespace();
        expect(':');
        result.put(key, value(depth + 1));
        whitespace();
        if (position < text.length() && text.charAt(position) == ',') {
          position++;
          continue;
        }
        expect('}');
        return result;
      }
    }

    private List<@Nullable Object> array(int depth) {
      List<@Nullable Object> result = new ArrayList<>();
      position++;
      whitespace();
      if (position < text.length() && text.charAt(position) == ']') {
        position++;
        return result;
      }
      while (true) {
        result.add(value(depth + 1));
        whitespace();
        if (position < text.length() && text.charAt(position) == ',') {
          position++;
          continue;
        }
        expect(']');
        return result;
      }
    }

    private void expect(char c) {
      if (position >= text.length() || text.charAt(position) != c) {
        throw new WireException("Expected '" + c + "' in JSON");
      }
      position++;
    }

    private String string() {
      position++;
      StringBuilder out = new StringBuilder();
      while (true) {
        if (position >= text.length()) {
          throw new WireException("Unterminated JSON string");
        }
        char c = text.charAt(position++);
        if (c == '"') {
          return out.toString();
        }
        if (c < 0x20) {
          throw new WireException("Control character in JSON string");
        }
        if (c != '\\') {
          out.append(c);
          continue;
        }
        if (position >= text.length()) {
          throw new WireException("Unterminated JSON escape");
        }
        char escape = text.charAt(position++);
        switch (escape) {
          case '"':
          case '\\':
          case '/':
            out.append(escape);
            break;
          case 'b':
            out.append('\b');
            break;
          case 'f':
            out.append('\f');
            break;
          case 'n':
            out.append('\n');
            break;
          case 'r':
            out.append('\r');
            break;
          case 't':
            out.append('\t');
            break;
          case 'u':
            if (position + 4 > text.length()) {
              throw new WireException("Invalid JSON unicode escape");
            }
            int code = 0;
            for (int index = 0; index < 4; index++) {
              int digit = hexDigit(text.charAt(position++));
              if (digit < 0) {
                throw new WireException("Invalid JSON unicode escape");
              }
              code = code * 16 + digit;
            }
            out.append((char) code);
            break;
          default:
            throw new WireException("Invalid JSON escape");
        }
      }
    }

    private Object number() {
      int start = position;
      if (text.charAt(position) == '-') {
        position++;
      }
      if (position >= text.length()) {
        throw new WireException("Invalid JSON number");
      }
      if (text.charAt(position) == '0') {
        position++;
      } else if (isDigit()) {
        while (isDigit()) {
          position++;
        }
      } else {
        throw new WireException("Invalid JSON number");
      }
      boolean integer = true;
      if (position < text.length() && text.charAt(position) == '.') {
        integer = false;
        position++;
        digits();
      }
      if (position < text.length() && (text.charAt(position) == 'e' || text.charAt(position) == 'E')) {
        integer = false;
        position++;
        if (position < text.length() && (text.charAt(position) == '+' || text.charAt(position) == '-')) {
          position++;
        }
        digits();
      }
      String literal = text.substring(start, position);
      if (integer && position - start <= 20) {
        BigInteger value = new BigInteger(literal);
        if (value.bitLength() < 64) {
          return value.longValue();
        }
      }
      return Double.parseDouble(literal);
    }

    private boolean isDigit() {
      return position < text.length() && text.charAt(position) >= '0' && text.charAt(position) <= '9';
    }

    // Character.digit also accepts non-ASCII digits, which JSON doesn't.
    private static int hexDigit(char c) {
      if (c >= '0' && c <= '9') {
        return c - '0';
      }
      if (c >= 'a' && c <= 'f') {
        return c - 'a' + 10;
      }
      if (c >= 'A' && c <= 'F') {
        return c - 'A' + 10;
      }
      return -1;
    }

    private void digits() {
      if (!isDigit()) {
        throw new WireException("Invalid JSON number");
      }
      while (isDigit()) {
        position++;
      }
    }
  }
}
