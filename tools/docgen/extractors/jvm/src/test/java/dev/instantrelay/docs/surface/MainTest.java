package dev.instantrelay.docs.surface;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class MainTest {
  @TempDir Path root;

  @Test
  void writesTheSurfaceOfEachPackage() throws IOException {
    Fixtures.write(root, "a/src/main/java/dev/instantrelay/server/Greeter.java", """
        package dev.instantrelay.server;

        import dev.instantrelay.server.internal.Wire;
        import dev.instantrelay.server.model.Greeting;

        /** Greets. */
        public final class Greeter {
          private final Wire wire = new Wire();

          private Greeter() {}

          /** Greets {@code name}. */
          public Greeting greet(String name) {
            return new Greeting(wire.send(name));
          }
        }
        """);
    Fixtures.write(root, "a/src/main/java/dev/instantrelay/server/package-info.java", """
        /** The server SDK. */
        package dev.instantrelay.server;
        """);
    Fixtures.write(root, "a/src/main/java/dev/instantrelay/server/internal/Wire.java", """
        package dev.instantrelay.server.internal;

        public final class Wire {
          public String send(String text) {
            return text;
          }
        }
        """);
    Fixtures.write(root, "a/src/generated/java/dev/instantrelay/server/model/Greeting.java", """
        package dev.instantrelay.server.model;

        /** A greeting. */
        public final class Greeting {
          /** The text. */
          public final String text;

          public Greeting(String text) {
            this.text = text;
          }
        }
        """);
    Fixtures.write(root, "b/src/main/kotlin/dev/instantrelay/server/kotlin/Greet.kt", """
        package dev.instantrelay.server.kotlin

        /** Greets [name]. */
        fun greet(name: String): String = "Hello, $name"
        """);
    Path output = root.resolve("out/surface.json");
    Main.run(new String[] {"--language", "jvm", "--output", output.toString(),
        "--package", "com.example:a=" + root.resolve("a"), "--package", "com.example:b=" + root.resolve("b")});
    assertEquals("{\"language\":\"jvm\",\"packages\":["
        + "{\"name\":\"com.example:a\",\"symbols\":["
        + "{\"name\":\"Greeter\",\"kind\":\"class\",\"signatures\":[\"public final class Greeter\"],"
        + "\"docs\":\"Greets.\\n\\nPackage: `dev.instantrelay.server`.\",\"members\":["
        + "{\"name\":\"greet\",\"kind\":\"method\",\"signatures\":[\"public Greeting greet(String name)\"],\"docs\":\"Greets `name`.\"}]},"
        + "{\"name\":\"Greeting\",\"kind\":\"type\",\"signatures\":[\"public final class Greeting\"],"
        + "\"docs\":\"A greeting.\\n\\nPackage: `dev.instantrelay.server.model`.\"}]},"
        + "{\"name\":\"com.example:b\",\"symbols\":["
        + "{\"name\":\"greet\",\"kind\":\"function\",\"signatures\":[\"public fun greet(name: String): String\"],"
        + "\"docs\":\"Greets `name`.\\n\\nPackage: `dev.instantrelay.server.kotlin`.\"}]}]}\n",
        Files.readString(output, StandardCharsets.UTF_8));
  }

  @Test
  void packagesWithoutSourcesFail() {
    Path empty = root.resolve("empty");
    String message = assertThrows(ExtractionException.class, () -> Main.run(new String[] {
        "--language", "jvm", "--output", root.resolve("surface.json").toString(), "--package", "com.example:empty=" + empty}))
        .getMessage();
    assertEquals(Sources.display(empty) + ": no Java or Kotlin sources for package com.example:empty", message);
  }

  @Test
  void symbolNamesMustBeUniqueInAPackage() throws IOException {
    Fixtures.write(root, "a/src/main/java/dev/instantrelay/server/Greeter.java", """
        package dev.instantrelay.server;

        /** Greets in Java. */
        public final class Greeter {}
        """);
    Fixtures.write(root, "a/src/main/kotlin/dev/instantrelay/server/kotlin/Greeter.kt", """
        package dev.instantrelay.server.kotlin

        /** Greets in Kotlin. */
        class Greeter
        """);
    String message = assertThrows(ExtractionException.class, () -> Main.run(new String[] {
        "--language", "jvm", "--output", root.resolve("surface.json").toString(), "--package", "com.example:a=" + root.resolve("a")}))
        .getMessage();
    assertEquals("package com.example:a declares two symbols named Greeter", message);
  }

  @ParameterizedTest(name = "{1}")
  @MethodSource
  void rejectsBadArguments(String[] args, String message) {
    assertEquals(message, assertThrows(IllegalArgumentException.class, () -> Main.run(args)).getMessage());
  }

  static Stream<Arguments> rejectsBadArguments() {
    return Stream.of(
        Arguments.of(new String[] {"--language"}, "--language needs a value"),
        Arguments.of(new String[] {"--format", "json"}, "unknown option --format"),
        Arguments.of(new String[] {"--package", "=jvm/relay-server"}, "--package takes <name>=<directory>"),
        Arguments.of(new String[] {"--package", "com.example:a="}, "--package takes <name>=<directory>"),
        Arguments.of(new String[] {"--package", "com.example:a"}, "--package takes <name>=<directory>"),
        Arguments.of(new String[] {"--package", "com.example:a=x", "--package", "com.example:a=y"},
            "package com.example:a is listed twice"),
        Arguments.of(new String[] {"--language", "jvm", "--output", "surface.json"}, "missing options"));
  }
}
