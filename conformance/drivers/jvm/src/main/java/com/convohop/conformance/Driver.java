package com.convohop.conformance;

import com.convohop.server.RecoveryStorage;
import com.convohop.server.internal.Json;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * The ConvoHop conformance driver for the JVM server SDK: NDJSON over stdio, as specified by
 * {@code spec/conformance/driver-protocol.md}. It declares the backend and management roles; the runner's fixture
 * driver serves user clients.
 *
 * <p>The driver reuses the SDK's internal JSON codec for framing only. It is built from the same sources as the SDK
 * and is never published.
 */
public final class Driver {
  private static final String NAME = "convohop-jvm";
  private static final String VERSION = "0.1.0";

  private final Map<String, Sdk.Client> clients = new HashMap<>();
  private final Map<String, RecoveryStorage> storages = new HashMap<>();
  private boolean negotiated;
  private boolean shutDown;

  /**
   * Serves requests from stdin until {@code shutdown} or the end of input, then exits 0.
   *
   * @param args ignored
   */
  public static void main(String[] args) {
    // Responses own stdout; anything else the process prints goes to stderr.
    Writer out = new BufferedWriter(
        new OutputStreamWriter(new FileOutputStream(FileDescriptor.out), StandardCharsets.UTF_8));
    System.setOut(System.err);
    BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    try {
      new Driver().run(in, out);
    } catch (IOException closed) {
      // The runner closed a pipe, so nobody is left to answer.
    }
    System.exit(0);
  }

  /** Answers each request line until {@code shutdown} or the end of input. */
  void run(BufferedReader in, Writer out) throws IOException {
    String line;
    while (!shutDown && (line = in.readLine()) != null) {
      String response = handle(line);
      if (response != null) {
        out.write(response);
        out.write('\n');
        out.flush();
      }
    }
    reset();
  }

  /** The response to one request line, or null for a blank line. */
  @Nullable String handle(String line) {
    if (line.isBlank()) {
      return null;
    }
    Object request;
    try {
      request = Json.parse(line);
    } catch (RuntimeException error) {
      return response(null, "error", failure("INVALID_REQUEST", "Request is not valid JSON"));
    }
    Long id = request instanceof Map ? requestId(((Map<?, ?>) request).get("id")) : null;
    try {
      if (id == null) {
        throw new ProtocolException("INVALID_REQUEST", "id must be a positive integer");
      }
      Map<String, @Nullable Object> fields = Params.record(request, "request");
      Object method = fields.get("method");
      Object params = fields.get("params");
      if (!(method instanceof String)) {
        throw new ProtocolException("INVALID_REQUEST", "method must be a string");
      }
      if (params != null && !(params instanceof Map)) {
        throw new ProtocolException("INVALID_REQUEST", "params must be an object");
      }
      Object result = dispatch((String) method, params == null ? empty() : Params.record(params, "params"));
      String answer = response(id, "result", result);
      if ("shutdown".equals(method)) {
        reset();
        shutDown = true;
      }
      return answer;
    } catch (ProtocolException error) {
      return response(id, "error", failure(error.code(), error.getMessage()));
    } catch (ParamsException error) {
      return response(id, "error", failure("INVALID_PARAMS", error.getMessage()));
    } catch (RuntimeException error) {
      String message = error.getMessage();
      return response(id, "error", failure("DRIVER_FAILURE", message == null ? "Driver failure" : message));
    }
  }

  private @Nullable Object dispatch(String method, Map<String, @Nullable Object> params) {
    if (!negotiated && !"hello".equals(method)) {
      throw new ProtocolException("INVALID_REQUEST", "hello must be the first request");
    }
    switch (method) {
      case "hello":
        return hello();
      case "client.create":
        return create(params);
      case "client.close":
        return close(params);
      case "invoke":
        return invoke(params);
      case "realtime.subscribe":
      case "realtime.collect":
      case "realtime.close":
        throw new ProtocolException("UNSUPPORTED", "This driver does not declare the realtime feature");
      case "webhooks.verify":
        return Sdk.verifyWebhook(params);
      case "reset":
        reset();
        return empty();
      case "shutdown":
        return empty();
      default:
        throw new ProtocolException("UNKNOWN_METHOD", "Unknown method " + method);
    }
  }

  private Map<String, @Nullable Object> hello() {
    if (negotiated) {
      throw new ProtocolException("INVALID_REQUEST", "hello was already negotiated");
    }
    negotiated = true;
    Map<String, @Nullable Object> driver = new LinkedHashMap<>();
    driver.put("name", NAME);
    driver.put("version", VERSION);
    driver.put("language", "java");
    // The Gradle start script names the SDK artifact under test and its version.
    driver.put("packages", Collections.singletonMap(
        System.getProperty("convohop.conformance.package", "convohop-server"),
        System.getProperty("convohop.conformance.version", "unknown")));
    Map<String, @Nullable Object> roles = new LinkedHashMap<>();
    for (String role : Sdk.DECLARED) {
      roles.put(role, Collections.singletonMap("operations", Sdk.operations(role)));
    }
    Map<String, @Nullable Object> result = new LinkedHashMap<>();
    result.put("driver", driver);
    result.put("roles", roles);
    result.put("features", Sdk.FEATURES);
    return result;
  }

  private Map<String, @Nullable Object> create(Map<String, @Nullable Object> args) {
    String name = Params.handle(args, "client");
    if (clients.containsKey(name)) {
      throw new ParamsException("Client handle " + name + " already exists");
    }
    String role = Params.text(args, "role");
    if (!Sdk.ROLES.contains(role)) {
      throw new ParamsException("role must be one of " + String.join(", ", Sdk.ROLES));
    }
    if (!Sdk.DECLARED.contains(role)) {
      throw new ProtocolException("UNSUPPORTED", "This driver does not declare the " + role + " role");
    }
    String storageName = args.containsKey("storage") ? Params.handle(args, "storage") : null;
    RecoveryStorage storage = storageName == null ? null : storages.get(storageName);
    if (storageName != null && storage == null) {
      storage = RecoveryStorage.inMemory();
    }
    String baseUrl = Params.text(args, "baseUrl");
    String credential = Params.text(args, "credential");
    String projectId = Params.optionalText(args, "projectId");
    String incarnation = Params.optionalText(args, "incarnation");
    // Checked like the reference driver; only user clients act as a principal.
    Params.optionalText(args, "principalId");
    String actorId = Params.optionalText(args, "actorId");
    clients.put(name, Sdk.create(role, baseUrl, credential, projectId, incarnation, actorId, storage));
    if (storageName != null && storage != null) {
      storages.put(storageName, storage);
    }
    return empty();
  }

  private Map<String, @Nullable Object> close(Map<String, @Nullable Object> args) {
    String name = Params.text(args, "client");
    if (clients.remove(name) == null) {
      throw new ProtocolException("UNKNOWN_HANDLE", "Unknown client handle " + name);
    }
    return empty();
  }

  private Map<String, @Nullable Object> invoke(Map<String, @Nullable Object> args) {
    String name = Params.text(args, "client");
    Sdk.Client target = clients.get(name);
    if (target == null) {
      throw new ProtocolException("UNKNOWN_HANDLE", "Unknown client handle " + name);
    }
    String operation = Params.text(args, "operation");
    Map<String, @Nullable Object> input = args.containsKey("args") ? Params.record(args.get("args"), "args") : empty();
    if (!target.implementsOperation(operation)) {
      throw new ProtocolException("UNSUPPORTED", "The " + target.role() + " role does not implement " + operation);
    }
    Map<String, @Nullable Object> outcome = new LinkedHashMap<>();
    try {
      Object value = target.run(operation, input);
      outcome.put("ok", true);
      outcome.put("value", value);
    } catch (ParamsException | ProtocolException error) {
      throw error;
    } catch (RuntimeException error) {
      outcome.put("ok", false);
      outcome.put("error", Sdk.driverError(error));
    }
    return outcome;
  }

  private void reset() {
    clients.clear();
    storages.clear();
  }

  /** The request id when JavaScript would read it as a positive safe integer, otherwise null. */
  private static @Nullable Long requestId(@Nullable Object value) {
    Long id = Params.safeInteger(value);
    return id != null && id >= 1 ? id : null;
  }

  private static Map<String, @Nullable Object> failure(String code, @Nullable String message) {
    Map<String, @Nullable Object> failure = new LinkedHashMap<>();
    failure.put("code", code);
    failure.put("message", message == null ? code : message);
    return failure;
  }

  private static String response(@Nullable Long id, String key, @Nullable Object value) {
    Map<String, @Nullable Object> response = new LinkedHashMap<>();
    response.put("id", id);
    response.put(key, value);
    return Json.stringify(response);
  }

  private static Map<String, @Nullable Object> empty() {
    return new LinkedHashMap<>();
  }
}
