package com.convohop.examples;

import com.convohop.server.ProjectServerClient;
import com.convohop.server.internal.Json;
import com.convohop.server.testing.Repo;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * The conformance mock that the SDKs' own tests use: a real HTTP server, which runs in a node child process. Run
 * {@code npm ci} at the repository root first.
 */
final class Mock implements AutoCloseable {
  static final HttpClient HTTP = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();

  final String baseUrl;
  final String projectId;
  final String incarnation;
  final String backendKey;
  private final String control;
  private final Process process;

  private Mock(Process process, Map<String, Object> descriptor) {
    this.process = process;
    this.baseUrl = (String) descriptor.get("communicationUrl");
    this.projectId = (String) descriptor.get("projectId");
    this.incarnation = (String) descriptor.get("incarnation");
    this.backendKey = (String) Repo.object(descriptor.get("credentials")).get("backend");
    this.control = (String) descriptor.get("control");
  }

  static Mock start() throws IOException {
    Process process = new ProcessBuilder("node", "conformance/mock/cli.mjs")
        .directory(Repo.root().toFile())
        .redirectError(ProcessBuilder.Redirect.INHERIT)
        .start();
    try {
      BufferedReader output =
          new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
      String descriptor = output.readLine(); // The mock prints its descriptor when it's listening.
      if (descriptor == null) {
        throw new IOException("The conformance mock exited before it started. Run npm ci at the repository root.");
      }
      Thread drain = new Thread(() -> {
        try {
          while (output.readLine() != null) {
            // Keep the pipe from filling up.
          }
        } catch (IOException closed) {
          // The mock stopped.
        }
      });
      drain.setDaemon(true);
      drain.start();
      return new Mock(process, Repo.object(Json.parse(descriptor)));
    } catch (IOException | RuntimeException error) {
      process.destroyForcibly();
      throw error;
    }
  }

  ProjectServerClient connect() {
    return Server.connect(baseUrl, projectId, incarnation, backendKey);
  }

  /** Signs in a new user with {@link Server#bootstrapUser} and returns the user's principal ID. */
  String login(ProjectServerClient server, String name) {
    Map<String, Object> body =
        Server.bootstrapUser(server, baseUrl, projectId, name + "-" + UUID.randomUUID(), UUID.randomUUID().toString());
    return (String) Repo.object(body.get("session")).get("principalId");
  }

  /** Makes the mock fail the next request to a GraphQL field: it closes the socket before or after committing. */
  void injectFault(String field, String action) {
    HttpRequest request = HttpRequest.newBuilder(URI.create(control + "/fault"))
        .header("content-type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(Json.stringify(Map.of("field", field, "action", action))))
        .build();
    int status = send(request).statusCode();
    if (status / 100 != 2) {
      throw new IllegalStateException("The mock rejected the fault: " + status);
    }
  }

  /** Whether each request that the mock received for a field and request ID was dropped, oldest first. */
  List<Boolean> attempts(String field, String requestId) {
    String log = send(HttpRequest.newBuilder(URI.create(control + "/log")).build()).body();
    List<Boolean> dropped = new ArrayList<>();
    for (Object item : Repo.list(Repo.object(Json.parse(log)).get("entries"))) {
      Map<String, Object> entry = Repo.object(item);
      if ("request".equals(entry.get("kind")) && field.equals(entry.get("field"))
          && requestId.equals(entry.get("requestId"))) {
        dropped.add((Boolean) entry.get("dropped"));
      }
    }
    return dropped;
  }

  private static HttpResponse<String> send(HttpRequest request) {
    try {
      return HTTP.send(request, HttpResponse.BodyHandlers.ofString());
    } catch (IOException error) {
      throw new UncheckedIOException(error);
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(interrupted);
    }
  }

  @Override
  public void close() {
    process.destroy();
    try {
      if (!process.waitFor(10, TimeUnit.SECONDS)) {
        process.destroyForcibly();
      }
    } catch (InterruptedException interrupted) {
      process.destroyForcibly();
      Thread.currentThread().interrupt();
    }
  }
}
