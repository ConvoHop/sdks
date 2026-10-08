package com.convohop.server.internal;

import static com.convohop.server.testing.Fixtures.map;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.convohop.server.model.LiveOperationState;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;

class JsonTest {
  @Test
  void stringsAreEscapedLikeJsonStringify() {
    assertEquals("\"\\\"\\\\/\\b\\f\\n\\r\\t\\u0000\\u0001\\u001f \u007f\u2028\u2029é\"",
        Json.stringify("\"\\/\b\f\n\r\t\u0000\u0001\u001f \u007f\u2028\u2029é"));
    // Well-formed JSON.stringify escapes lone surrogates and keeps pairs.
    assertEquals("\"\\ud800a\\udfff\uD83D\uDC4B\\udc4b\\ud83d\"", Json.stringify("\uD800a\uDFFF\uD83D\uDC4B\uDC4B\uD83D"));
    assertEquals("\"\\udbff\"", Json.stringify("\uDBFF"));
  }

  @Test
  void numbersAreFormattedLikeJavaScript() {
    Object[][] cases = {
      {0.0, "0"}, {-0.0, "0"}, {1.0, "1"}, {-1.5, "-1.5"}, {0.1, "0.1"}, {0.1 + 0.2, "0.30000000000000004"},
      {100.0, "100"}, {123.456, "123.456"}, {1e20, "100000000000000000000"}, {1e21, "1e+21"},
      {123456789012345680000.0, "123456789012345680000"}, {2.5e25, "2.5e+25"}, {1e-6, "0.000001"},
      {1e-7, "1e-7"}, {1.5e-7, "1.5e-7"}, {Double.MIN_VALUE, "5e-324"}, {Double.MAX_VALUE, "1.7976931348623157e+308"},
      {Math.pow(2, 63), "9223372036854776000"}, {1e23, "1e+23"}, {0.5f, "0.5"}, {42, "42"}, {(short) -7, "-7"},
      {Long.MAX_VALUE, "9223372036854775807"}, {BigInteger.ONE.shiftLeft(80), "1.2089258196146292e+24"},
      {Double.NaN, "null"}, {Double.POSITIVE_INFINITY, "null"}, {Double.NEGATIVE_INFINITY, "null"},
    };
    for (Object[] entry : cases) {
      assertEquals(entry[1], Json.stringify(entry[0]), String.valueOf(entry[0]));
    }
    assertThrows(IllegalArgumentException.class, () -> Json.formatNumber(Double.NaN));
  }

  @Test
  void stringifyKeepsOrderAndCanonicalSortsKeysByUtf16CodeUnits() {
    Map<String, Object> value = map("b", 1L, "a", map("z", true, "y", null), "B", List.of(2L, "x"), "é", 0.5,
        "\uD83D\uDC4B", "wave", "\uFF5E", "tilde");
    assertEquals("{\"b\":1,\"a\":{\"z\":true,\"y\":null},\"B\":[2,\"x\"],\"é\":0.5,\"\uD83D\uDC4B\":\"wave\","
        + "\"\uFF5E\":\"tilde\"}", Json.stringify(value));
    // U+1F44B sorts before U+FF5E because its first UTF-16 code unit is D83D.
    assertEquals("{\"B\":[2,\"x\"],\"a\":{\"y\":null,\"z\":true},\"b\":1,\"é\":0.5,\"\uD83D\uDC4B\":\"wave\","
        + "\"\uFF5E\":\"tilde\"}", Json.canonical(value));
    WireValue wire = () -> map("value", LiveOperationState.COMPLETED, "count", 2);
    assertEquals("[{\"value\":\"COMPLETED\",\"count\":2},\"FAILED\"]",
        Json.stringify(List.of(wire, LiveOperationState.FAILED)));
    assertEquals("{\"count\":2,\"value\":\"COMPLETED\"}", Json.canonical(wire));
  }

  @Test
  void canonicalRejectsNumbersOtherSdksCannotReadExactly() {
    assertEquals("9007199254740991", Json.canonical(Json.MAX_SAFE_INTEGER));
    assertEquals("-9007199254740991", Json.canonical(-Json.MAX_SAFE_INTEGER));
    assertEquals("9007199254740992", Json.stringify(Json.MAX_SAFE_INTEGER + 1));
    for (Object unsafe : List.of(Json.MAX_SAFE_INTEGER + 1, -Json.MAX_SAFE_INTEGER - 1, BigInteger.ONE.shiftLeft(53),
        BigInteger.ONE.shiftLeft(80), 1e16, Double.NaN, Double.POSITIVE_INFINITY)) {
      assertThrows(IllegalArgumentException.class, () -> Json.canonical(map("n", unsafe)), String.valueOf(unsafe));
    }
  }

  @Test
  void unsupportedValuesAndCyclesAreRejected() {
    assertThrows(IllegalArgumentException.class, () -> Json.stringify(new Object()));
    assertThrows(IllegalArgumentException.class, () -> Json.stringify(Map.of(1, "one")));
    Map<@Nullable String, Object> nullKey = new LinkedHashMap<>();
    nullKey.put(null, 1L);
    assertThrows(IllegalArgumentException.class, () -> Json.canonical(nullKey));
    List<Object> loop = new ArrayList<>();
    loop.add(loop);
    assertThrows(IllegalArgumentException.class, () -> Json.stringify(loop));
    assertThrows(IllegalArgumentException.class, () -> Json.canonical(loop));
  }

  @Test
  void parseReturnsLongsForIntegersAndDoublesOtherwise() {
    assertEquals(1L, Json.parse("1"));
    assertEquals(-12L, Json.parse("-12"));
    assertEquals(Long.MAX_VALUE, Json.parse("9223372036854775807"));
    assertEquals(Long.MIN_VALUE, Json.parse("-9223372036854775808"));
    assertEquals(9.223372036854775808e18, Json.parse("9223372036854775808"));
    assertEquals(1e30, Json.parse("1000000000000000000000000000000"));
    assertEquals(1.0, Json.parse("1.0"));
    assertEquals(100.0, Json.parse("1e2"));
    assertEquals(0.5, Json.parse("5E-1"));
    assertEquals(-0.25, Json.parse("-2.5e-1"));
    assertEquals(Double.POSITIVE_INFINITY, Json.parse("1e400"));
  }

  @Test
  void parseReadsObjectsArraysAndStringsLikeJsonParse() {
    Object object = Json.parse(" \t\n\r{ \"b\" : [ 1 , true , false , null ] , \"a\" : { } , \"b\" : \"last\" } ");
    assertInstanceOf(LinkedHashMap.class, object);
    // A repeated key keeps its first position and its last value, as JSON.parse does.
    assertEquals(map("b", "last", "a", map()), object);
    assertEquals(List.of("b", "a"), new ArrayList<>(((Map<?, ?>) object).keySet()));
    assertEquals(Arrays.asList(1L, true, false, null), Json.parse("[1,true,false,null]"));
    assertEquals("é\uD83D\uDC4B\uD800/\"\\\b\f\n\r\t", Json.parse("\"\\u00e9\\uD83D\\udc4b\\ud800\\/\\\"\\\\\\b\\f\\n\\r\\t\""));
    assertEquals("\u2028\u007f", Json.parse("\"\u2028\u007f\""));
    String text = "{\"s\":\"\\ud800x\",\"n\":[1,1.5,{\"k\":null}]}";
    assertEquals(text, Json.stringify(Json.parse(text)));
  }

  @Test
  void parseRejectsWhatJsonParseRejects() {
    for (String text : List.of("", " ", "01", "-01", "-", "+1", ".5", "1.", "1.e1", "1e", "1e+", "--1", "0x10", "1_000",
        "NaN", "Infinity", "-Infinity", "tru", "nul", "True", "'a'", "[1,]", "[,1]", "{\"a\":1,}", "{a:1}", "{\"a\" 1}",
        "{1:2}", "[1 2]", "\"\\x\"", "\"\\u12\"", "\"\\u12g4\"", "\"\\u\uFF10\uFF10\uFF14\uFF11\"", "\"\\u\u0660041\"",
        "\"a\nb\"", "\"\u0000\"", "\"\u001f\"", "\"open", "\"\\", "[", "{", "{\"a\"", "{\"a\":", "1 2", "[]]",
        "/*c*/1", "1//c", "\u00a01", "\uFEFF1", "1\u2028", "\u0661")) {
      assertThrows(WireException.class, () -> Json.parse(text), text);
    }
  }

  @Test
  void nestingIsBoundedWithoutOverflowingTheStack() {
    assertNotNull(Json.parse("[".repeat(1000) + "]".repeat(1000)));
    assertNotNull(Json.parse("{\"a\":".repeat(1000) + "1" + "}".repeat(1000)));
    assertThrows(WireException.class, () -> Json.parse("[".repeat(100_000) + "]".repeat(100_000)));
    assertThrows(WireException.class, () -> Json.parse("{\"a\":".repeat(100_000)));
    Object nested = List.of();
    for (int depth = 0; depth < 2000; depth++) {
      nested = List.of(nested);
    }
    Object deep = nested;
    assertThrows(IllegalArgumentException.class, () -> Json.stringify(deep));
  }

  @Test
  void utf8MatchesTextEncoderIncludingLoneSurrogates() {
    Object[][] cases = {
      {"", ""}, {"a", "61"}, {"é", "c3a9"}, {"€", "e282ac"}, {"\uD83D\uDC4B", "f09f918b"},
      {"a\uD800b", "61efbfbd62"}, {"\uDC00\uD800", "efbfbdefbfbd"}, {"\uDC4B\uD83D", "efbfbdefbfbd"},
      {"\uD800\uD800\uDC00", "efbfbdf0908080"}, {"x\uDBFF", "78efbfbd"}, {"\uFFFD", "efbfbd"},
    };
    for (Object[] entry : cases) {
      String text = (String) entry[0];
      byte[] expected = hex((String) entry[1]);
      assertArrayEquals(expected, Json.utf8(text), (String) entry[1]);
      assertEquals(expected.length, Json.utf8Length(text), (String) entry[1]);
    }
  }

  @Test
  void loneSurrogatesAreDetected() {
    for (String text : List.of("", "a", "é", "\uD83D\uDC4B", "a\uD83D\uDC4Bb", "\uFFFD")) {
      assertFalse(Json.hasLoneSurrogate(text), text);
    }
    for (String text : List.of("\uD800", "\uDC00", "\uDC4B\uD83D", "a\uD83D\uDC4B\uDBFF", "\uD800\uD800\uDC00", "\uD83Dx")) {
      assertTrue(Json.hasLoneSurrogate(text), text);
    }
  }

  private static byte[] hex(String digits) {
    byte[] bytes = new byte[digits.length() / 2];
    for (int index = 0; index < bytes.length; index++) {
      bytes[index] = (byte) Integer.parseInt(digits.substring(index * 2, index * 2 + 2), 16);
    }
    return bytes;
  }
}
