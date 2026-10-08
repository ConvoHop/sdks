package com.convohop.server.webhooks;

import com.convohop.server.internal.Wire;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * A request's headers, as the verifier reads them. Adapt your framework's headers with a lambda or method reference,
 * for example {@code name -> Collections.list(request.getHeaders(name))} for a servlet request or {@code
 * httpHeaders::allValues} for {@code java.net.http.HttpHeaders}, or with {@link #of} or {@link #ofMultiValued}.
 */
@FunctionalInterface
public interface WebhookHeaders {
  /**
   * Every value of a header. A header that has more than one value fails verification as repeated.
   *
   * @param name the lowercase header name, matched case-insensitively
   * @return the header's values, or null or an empty list when the header is absent
   */
  @Nullable List<String> values(String name);

  /**
   * Headers with one value per name, such as a framework's single-valued header map. Names match
   * case-insensitively, so a name that appears under two different cases is repeated.
   *
   * @param headers the headers; entries with a null name or value are ignored
   * @return the headers
   */
  static WebhookHeaders of(Map<String, ? extends @Nullable String> headers) {
    Wire.nonNull(headers, "headers");
    return name -> {
      List<String> values = new ArrayList<>();
      for (Map.Entry<String, ? extends @Nullable String> entry : headers.entrySet()) {
        String key = entry.getKey();
        String value = entry.getValue();
        if (key != null && value != null && key.toLowerCase(Locale.ROOT).equals(name)) {
          values.add(value);
        }
      }
      return values;
    };
  }

  /**
   * Headers with a list of values per name, such as {@code com.sun.net.httpserver.Headers}. Names match
   * case-insensitively, and the values of every matching name are combined.
   *
   * @param headers the headers; entries with a null name or values are ignored
   * @return the headers
   */
  static WebhookHeaders ofMultiValued(Map<String, ? extends @Nullable Collection<String>> headers) {
    Wire.nonNull(headers, "headers");
    return name -> {
      List<String> values = new ArrayList<>();
      for (Map.Entry<String, ? extends @Nullable Collection<String>> entry : headers.entrySet()) {
        String key = entry.getKey();
        Collection<String> value = entry.getValue();
        if (key != null && value != null && key.toLowerCase(Locale.ROOT).equals(name)) {
          values.addAll(value);
        }
      }
      return values;
    };
  }
}
