package com.convohop.server.testing;

import com.convohop.server.internal.Json;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

/** Reads the shared contracts in the repository: schemas, IR and vectors. */
public final class Repo {
  private Repo() {}

  /** The repository root, which the Gradle build passes as {@code convohop.repositoryRoot}. */
  public static Path root() {
    String root = System.getProperty("convohop.repositoryRoot");
    if (root == null) {
      throw new IllegalStateException("convohop.repositoryRoot is not set; run the tests with Gradle");
    }
    return Paths.get(root);
  }

  /** Parses a JSON file relative to the repository root. */
  public static Object json(String path) {
    try {
      return Json.parse(new String(Files.readAllBytes(root().resolve(path)), StandardCharsets.UTF_8));
    } catch (IOException error) {
      throw new UncheckedIOException(error);
    }
  }

  /** A parsed JSON object. */
  @SuppressWarnings("unchecked")
  public static Map<String, Object> object(Object value) {
    if (!(value instanceof Map)) {
      throw new IllegalArgumentException("Expected a JSON object");
    }
    return (Map<String, Object>) value;
  }

  /** A parsed JSON array. */
  @SuppressWarnings("unchecked")
  public static List<Object> list(Object value) {
    if (!(value instanceof List)) {
      throw new IllegalArgumentException("Expected a JSON array");
    }
    return (List<Object>) value;
  }
}
