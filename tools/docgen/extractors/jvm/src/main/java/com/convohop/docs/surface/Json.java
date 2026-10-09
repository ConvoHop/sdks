package com.convohop.docs.surface;

import java.util.List;
import java.util.Map;

/** Writes the JSON values the extractor builds: maps in insertion order, lists, strings and booleans. */
final class Json {
  private Json() {}

  static String write(Object value) {
    StringBuilder out = new StringBuilder();
    write(value, out);
    return out.toString();
  }

  private static void write(Object value, StringBuilder out) {
    if (value instanceof String text) {
      string(text, out);
    } else if (value instanceof Boolean flag) {
      out.append(flag.booleanValue());
    } else if (value instanceof Map<?, ?> map) {
      out.append('{');
      boolean first = true;
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        if (!first) out.append(',');
        first = false;
        string((String) entry.getKey(), out);
        out.append(':');
        write(entry.getValue(), out);
      }
      out.append('}');
    } else if (value instanceof List<?> list) {
      out.append('[');
      for (int i = 0; i < list.size(); i++) {
        if (i > 0) out.append(',');
        write(list.get(i), out);
      }
      out.append(']');
    } else {
      throw new IllegalArgumentException("can't write " + (value == null ? "null" : value.getClass().getName()) + " as JSON");
    }
  }

  private static void string(String text, StringBuilder out) {
    out.append('"');
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      switch (c) {
        case '"' -> out.append("\\\"");
        case '\\' -> out.append("\\\\");
        case '\n' -> out.append("\\n");
        case '\r' -> out.append("\\r");
        case '\t' -> out.append("\\t");
        default -> {
          if (c < 0x20) out.append(String.format("\\u%04x", (int) c));
          else out.append(c);
        }
      }
    }
    out.append('"');
  }
}
