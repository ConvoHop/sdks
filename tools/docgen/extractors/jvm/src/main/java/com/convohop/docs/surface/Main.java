package com.convohop.docs.surface;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Writes the public API of the JVM SDK in the docs pipeline's surface format (spec/docs/surface.schema.json).
 *
 * <p>Usage: {@code --language <id> --output <file> --package <name>=<directory>...}, with paths relative to the
 * working directory. Each package directory is a Gradle module whose Java sources are in src/main/java and
 * src/generated/java, and whose Kotlin sources are in src/main/kotlin and src/generated/kotlin.
 */
public final class Main {
  /** The SDK's implementation package: its types aren't API, and members that mention them are left out. */
  static final String INTERNAL_PACKAGE = "com.convohop.server.internal";
  /** The SDK's GraphQL model package: its types are listed without members, which the operation pages document. */
  static final String MODEL_PACKAGE = "com.convohop.server.model";
  private static final String USAGE = "usage: --language <id> --output <file> --package <name>=<directory>...";

  private Main() {}

  public static void main(String[] args) {
    try {
      run(args);
    } catch (IllegalArgumentException e) {
      System.err.println("extract-jvm: " + e.getMessage() + "\n" + USAGE);
      System.exit(2);
    } catch (ExtractionException | IOException e) {
      System.err.println("extract-jvm: " + e.getMessage());
      System.exit(1);
    }
  }

  static void run(String[] args) throws IOException {
    String language = null;
    Path output = null;
    Map<String, Path> packages = new LinkedHashMap<>();
    for (int i = 0; i < args.length; i += 2) {
      if (i + 1 >= args.length) throw new IllegalArgumentException(args[i] + " needs a value");
      String value = args[i + 1];
      switch (args[i]) {
        case "--language" -> language = value;
        case "--output" -> output = Path.of(value);
        case "--package" -> {
          int equals = value.indexOf('=');
          if (equals <= 0 || equals == value.length() - 1) throw new IllegalArgumentException("--package takes <name>=<directory>");
          if (packages.put(value.substring(0, equals), Path.of(value.substring(equals + 1))) != null) {
            throw new IllegalArgumentException("package " + value.substring(0, equals) + " is listed twice");
          }
        }
        default -> throw new IllegalArgumentException("unknown option " + args[i]);
      }
    }
    if (language == null || output == null || packages.isEmpty()) throw new IllegalArgumentException("missing options");
    String json = Json.write(surface(language, packages, INTERNAL_PACKAGE, MODEL_PACKAGE)) + "\n";
    Path parent = output.toAbsolutePath().getParent();
    if (parent != null) Files.createDirectories(parent);
    Files.writeString(output, json, StandardCharsets.UTF_8);
  }

  /** The surface of {@code packages}, each a package name and its module directory. */
  static Map<String, Object> surface(String language, Map<String, Path> packages, String internalPackage, String modelPackage)
      throws IOException {
    List<Object> packageList = new ArrayList<>();
    KotlinSurface kotlin = null;
    try {
      for (Map.Entry<String, Path> entry : packages.entrySet()) {
        Path directory = entry.getValue();
        List<Path> javaSources = new ArrayList<>();
        for (Path file : Sources.list(List.of(directory.resolve("src/main/java"), directory.resolve("src/generated/java")), ".java")) {
          String name = file.getFileName().toString();
          if (!name.equals("package-info.java") && !name.equals("module-info.java")) javaSources.add(file);
        }
        List<Path> kotlinSources =
            Sources.list(List.of(directory.resolve("src/main/kotlin"), directory.resolve("src/generated/kotlin")), ".kt");
        if (javaSources.isEmpty() && kotlinSources.isEmpty()) {
          throw new ExtractionException(Sources.display(directory) + ": no Java or Kotlin sources for package " + entry.getKey());
        }
        List<Node> symbols = new ArrayList<>();
        if (!javaSources.isEmpty()) {
          symbols.addAll(new JavaSurface(internalPackage, modelPackage, JavaSurface.sdkClasspath()).extract(javaSources));
        }
        if (!kotlinSources.isEmpty()) {
          if (kotlin == null) kotlin = new KotlinSurface();
          symbols.addAll(kotlin.extract(kotlinSources));
        }
        packageList.add(packageJson(entry.getKey(), symbols));
      }
    } finally {
      if (kotlin != null) kotlin.close();
    }
    Map<String, Object> surface = new LinkedHashMap<>();
    surface.put("language", language);
    surface.put("packages", packageList);
    return surface;
  }

  private static Map<String, Object> packageJson(String name, List<Node> symbols) {
    Set<String> names = new HashSet<>();
    for (Node symbol : symbols) {
      if (!names.add(symbol.name)) throw new ExtractionException("package " + name + " declares two symbols named " + symbol.name);
    }
    symbols.sort(Comparator.comparing(symbol -> symbol.name));
    List<Object> symbolList = new ArrayList<>();
    for (Node symbol : symbols) symbolList.add(symbol.toJson());
    Map<String, Object> json = new LinkedHashMap<>();
    json.put("name", name);
    json.put("symbols", symbolList);
    return json;
  }
}
