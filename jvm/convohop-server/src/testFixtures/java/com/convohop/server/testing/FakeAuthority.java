package com.convohop.server.testing;

import com.convohop.server.internal.Json;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Function;

/** A loopback HTTP authority whose replies a test scripts. It records every request. */
public final class FakeAuthority implements AutoCloseable {
  private final HttpServer server;
  private final ExecutorService executor = Executors.newCachedThreadPool();
  private final List<Exchange> exchanges = new CopyOnWriteArrayList<>();

  /** Starts an authority on an ephemeral loopback port. */
  public FakeAuthority(Function<Exchange, Response> handler) {
    try {
      this.server = HttpServer.create(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0), 0);
    } catch (IOException error) {
      throw new UncheckedIOException(error);
    }
    this.server.setExecutor(this.executor);
    this.server.createContext("/", http -> handle(http, handler));
    this.server.start();
  }

  /** The base URL clients use. */
  public String baseUrl() {
    return "http://127.0.0.1:" + this.server.getAddress().getPort();
  }

  /** The requests received so far. */
  public List<Exchange> exchanges() {
    return Collections.unmodifiableList(new ArrayList<>(this.exchanges));
  }

  /** The parsed GraphQL request bodies received so far. */
  public List<Map<String, Object>> requests() {
    List<Map<String, Object>> requests = new ArrayList<>();
    for (Exchange exchange : this.exchanges) {
      requests.add(exchange.request());
    }
    return requests;
  }

  @Override
  public void close() {
    this.server.stop(0);
    this.executor.shutdownNow();
  }

  private void handle(HttpExchange http, Function<Exchange, Response> handler) throws IOException {
    try (InputStream input = http.getRequestBody()) {
      Map<String, List<String>> headers = new LinkedHashMap<>();
      for (Map.Entry<String, List<String>> entry : http.getRequestHeaders().entrySet()) {
        headers.put(entry.getKey().toLowerCase(Locale.ROOT), entry.getValue());
      }
      String body = new String(input.readAllBytes(), StandardCharsets.UTF_8);
      Exchange exchange = new Exchange(http.getRequestMethod(), http.getRequestURI().getPath(), headers, body);
      this.exchanges.add(exchange);
      Response response = handler.apply(exchange);
      if (response.drop) {
        // Closing before sending headers drops the connection: the response is lost.
        http.close();
        return;
      }
      byte[] bytes = response.body.getBytes(StandardCharsets.UTF_8);
      http.getResponseHeaders().set("content-type", "application/json");
      for (Map.Entry<String, String> header : response.headers.entrySet()) {
        http.getResponseHeaders().add(header.getKey(), header.getValue());
      }
      http.sendResponseHeaders(response.status, bytes.length == 0 ? -1 : bytes.length);
      try (OutputStream output = http.getResponseBody()) {
        output.write(bytes);
      }
    } catch (RuntimeException | Error error) {
      http.close();
      throw error;
    }
  }

  /** One received request. */
  public static final class Exchange {
    private final String method;
    private final String path;
    private final Map<String, List<String>> headers;
    private final String body;

    Exchange(String method, String path, Map<String, List<String>> headers, String body) {
      this.method = method;
      this.path = path;
      this.headers = headers;
      this.body = body;
    }

    public String method() {
      return this.method;
    }

    public String path() {
      return this.path;
    }

    /** A header's values; names are lowercase. */
    public List<String> header(String name) {
      return this.headers.getOrDefault(name, Collections.emptyList());
    }

    public String body() {
      return this.body;
    }

    /** The parsed GraphQL request. */
    public Map<String, Object> request() {
      return Repo.object(Json.parse(this.body));
    }

    public String operationName() {
      return (String) request().get("operationName");
    }
  }

  /** A scripted reply. */
  public static final class Response {
    final int status;
    final String body;
    final Map<String, String> headers;
    final boolean drop;

    private Response(int status, String body, Map<String, String> headers, boolean drop) {
      this.status = status;
      this.body = body;
      this.headers = headers;
      this.drop = drop;
    }

    /** A 200 response with a JSON body. */
    public static Response json(String body) {
      return new Response(200, body, Collections.emptyMap(), false);
    }

    /** A response with a status and JSON body. */
    public static Response status(int status, String body) {
      return new Response(status, body, Collections.emptyMap(), false);
    }

    /** No response: the connection closes before any byte. */
    public static Response drop() {
      return new Response(0, "", Collections.emptyMap(), true);
    }

    /** This response with an added header. */
    public Response header(String name, String value) {
      Map<String, String> headers = new LinkedHashMap<>(this.headers);
      headers.put(name, value);
      return new Response(this.status, this.body, headers, this.drop);
    }
  }
}
