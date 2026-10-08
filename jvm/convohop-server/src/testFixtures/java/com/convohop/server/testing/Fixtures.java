package com.convohop.server.testing;

import com.convohop.server.internal.Json;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Authority replies built from {@code schema/ir.json}, like the TypeScript tests' {@code test/graphql-fixtures.mjs}:
 * every field an operation selects is present, and fields a test doesn't set are null.
 */
public final class Fixtures {
  private static final DateTimeFormatter TIME =
      DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);
  private static final Map<String, Map<String, Object>> TYPES = new HashMap<>();
  private static final Map<String, Map<String, Object>> OPERATIONS = new HashMap<>();

  static {
    Map<String, Object> ir = Repo.object(Repo.json("schema/ir.json"));
    for (Object type : Repo.list(ir.get("types"))) {
      Map<String, Object> value = Repo.object(type);
      TYPES.put((String) value.get("name"), value);
    }
    for (Object operation : Repo.list(ir.get("operations"))) {
      Map<String, Object> value = Repo.object(operation);
      OPERATIONS.put((String) value.get("operationName"), value);
    }
  }

  private Fixtures() {}

  /** The current time as the authority writes it. */
  public static String now() {
    return TIME.format(Instant.now());
  }

  /** An object of a GraphQL output type with every field: the given ones, and null for the rest. */
  public static Map<String, Object> full(String type, Map<String, ?> fields) {
    Map<String, Object> shape = TYPES.get(type);
    if (shape == null || !"object".equals(shape.get("kind"))) {
      throw new IllegalArgumentException("Unknown fixture object " + type);
    }
    Map<String, Object> value = new LinkedHashMap<>();
    for (Object field : Repo.list(shape.get("fields"))) {
      String name = (String) Repo.object(field).get("name");
      value.put(name, fields.get(name));
    }
    return value;
  }

  /** A successful reply to a request: {@code ok} for a query, a committed receipt for a mutation. */
  public static String reply(Map<String, Object> request, Map<String, ?> fields) {
    Map<String, Object> operation = OPERATIONS.get((String) request.get("operationName"));
    if (operation == null) {
      throw new IllegalArgumentException("Unknown fixture operation");
    }
    Map<String, Object> result = Repo.object(Repo.object(operation.get("result")).get("type"));
    String time = now();
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("status", "mutation".equals(operation.get("kind")) ? "committed" : "ok");
    values.put("requestId", requestId(request));
    values.put("serverTime", time);
    values.put("receiptId", UUID.randomUUID().toString());
    values.put("committedAt", time);
    values.put("replayed", false);
    values.putAll(fields);
    Map<String, Object> data = Collections.singletonMap(
        (String) operation.get("field"), full((String) result.get("name"), values));
    return Json.stringify(Collections.singletonMap("data", data));
  }

  /** A GraphQL error reply carrying an authority problem. */
  public static String problem(String code, String outcome, int status, String message, Object requestId) {
    Map<String, Object> extensions = new LinkedHashMap<>();
    extensions.put("code", code);
    extensions.put("requestId", requestId);
    extensions.put("outcome", outcome);
    extensions.put("retryable", false);
    extensions.put("status", status);
    Map<String, Object> error = new LinkedHashMap<>();
    error.put("message", message);
    error.put("extensions", extensions);
    return Json.stringify(Collections.singletonMap("errors", Collections.singletonList(error)));
  }

  /** A request resolution: committed with a receipt, or not observed yet. */
  public static Map<String, Object> resolution(String requestId, String state) {
    String time = now();
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("state", state);
    fields.put("requestId", requestId);
    fields.put("checkedAt", time);
    fields.put("resultWithheld", false);
    if (!"notObservedYet".equals(state)) {
      Map<String, Object> receipt = new LinkedHashMap<>();
      receipt.put("status", state);
      receipt.put("requestId", requestId);
      receipt.put("receiptId", UUID.randomUUID().toString());
      receipt.put("committedAt", time);
      receipt.put("replayed", false);
      fields.put("receipt", full("ResolvedReceipt", receipt));
    }
    return full("RequestResolution", fields);
  }

  /** The request ID in a request's context. */
  public static String requestId(Map<String, Object> request) {
    return (String) context(request).get("requestId");
  }

  /** A request's context variables. */
  public static Map<String, Object> context(Map<String, Object> request) {
    return Repo.object(Repo.object(request.get("variables")).get("context"));
  }

  /** A request's input variables. */
  public static Map<String, Object> input(Map<String, Object> request) {
    return Repo.object(Repo.object(request.get("variables")).get("input"));
  }

  /** A map of alternating keys and values, kept in order. */
  public static Map<String, Object> map(Object... entries) {
    if (entries.length % 2 != 0) {
      throw new IllegalArgumentException("Expected keys and values");
    }
    Map<String, Object> value = new LinkedHashMap<>();
    for (int index = 0; index < entries.length; index += 2) {
      value.put((String) entries[index], entries[index + 1]);
    }
    return value;
  }
}
