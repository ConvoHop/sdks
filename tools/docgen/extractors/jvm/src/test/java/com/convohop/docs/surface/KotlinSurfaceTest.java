package com.convohop.docs.surface;

import static com.convohop.docs.surface.Fixtures.member;
import static com.convohop.docs.surface.Fixtures.names;
import static com.convohop.docs.surface.Fixtures.symbol;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class KotlinSurfaceTest {
  /** One parser for the class: starting the Kotlin compiler's environment takes seconds. */
  private static KotlinSurface kotlin;

  @TempDir Path root;

  @BeforeAll
  static void start() {
    kotlin = new KotlinSurface();
  }

  @AfterAll
  static void stop() {
    if (kotlin != null) kotlin.close();
  }

  /** Extracts files given as names, relative to src, each followed by its text. */
  private List<Node> extract(String... files) throws IOException {
    List<Path> sources = new ArrayList<>();
    for (int i = 0; i < files.length; i += 2) sources.add(Fixtures.write(root, "src/" + files[i], files[i + 1]));
    return kotlin.extract(sources);
  }

  private String failure(String... files) {
    return assertThrows(ExtractionException.class, () -> extract(files)).getMessage();
  }

  private String location(String file, int line) {
    return Sources.display(root.resolve("src/" + file)) + ":" + line + ": ";
  }

  @Test
  void classesListTheirConstructorsFunctionsAndProperties() throws IOException {
    Node wrapper = symbol(extract("Wrapper.kt", """
        package com.example

        /**
         * Wraps an [Api].
         *
         * @param T the item type
         */
        class Wrapper<T>(
            /** The wrapped API. */
            val api: Api,
            name: String = "x",
            private val secret: String,
            vararg tags: String,
        ) where T : CharSequence, T : Comparable<T> {
            /** Creates a wrapper without a secret. */
            constructor(api: Api) : this(api, "x", "")

            init {
                check(secret.isEmpty() || tags.isEmpty())
            }

            /** The label. */
            public var label: String = name

            internal val hidden: Int = 0

            /** Sends [item]. */
            suspend fun send(item: T): String = item.toString()

            /**
             * Sends [item] [times] times.
             *
             * @param times how many times
             */
            suspend fun send(item: T, times: Int): List<String> = List(times) { item.toString() }

            /** Sends several. */
            @Deprecated("Use [send] instead.")
            fun send(vararg items: T) {}

            /** The largest of [items]. */
            fun <R> largest(items: List<R>): R where R : Comparable<R> = items.max()

            /** Shouts. */
            fun String.shout(): String = uppercase()

            protected fun guarded() {}

            private fun helper() {}

            private class Cache
        }
        """), "Wrapper");
    assertEquals("class", wrapper.kind);
    assertEquals(List.of("public class Wrapper<T> where T : CharSequence, T : Comparable<T>"), wrapper.signatures);
    assertEquals("Wraps an `Api`.\n\nParameters:\n\n- `T`: the item type\n\nPackage: `com.example`.", wrapper.docs);
    assertNull(wrapper.deprecated);
    assertEquals(List.of("constructor", "api", "label", "send", "largest", "shout"), names(wrapper.members),
        "init blocks, and members that aren't public, are left out");
    Node constructor = member(wrapper, "constructor");
    assertEquals("constructor", constructor.kind);
    assertEquals(List.of("public constructor(api: Api, name: String = \"x\", secret: String, vararg tags: String)",
        "public constructor(api: Api)"), constructor.signatures);
    assertEquals("Creates a wrapper without a secret.", constructor.docs);
    Node api = member(wrapper, "api");
    assertEquals("property", api.kind);
    assertEquals(List.of("public val api: Api"), api.signatures);
    assertEquals("The wrapped API.", api.docs);
    assertEquals(List.of("public var label: String"), member(wrapper, "label").signatures, "an explicit public isn't repeated");
    Node send = member(wrapper, "send");
    assertEquals("method", send.kind);
    assertEquals(List.of("public suspend fun send(item: T): String", "public suspend fun send(item: T, times: Int): List<String>",
        "public fun send(vararg items: T)"), send.signatures);
    assertEquals("Sends `item` `times` times.\n\nParameters:\n\n- `times`: how many times", send.docs);
    assertNull(send.deprecated, "a name stays current while one overload isn't deprecated");
    assertEquals(List.of("public fun <R> largest(items: List<R>): R where R : Comparable<R>"),
        member(wrapper, "largest").signatures);
    assertEquals(List.of("public fun String.shout(): String"), member(wrapper, "shout").signatures);
  }

  @Test
  void topLevelFunctionsMergeByName() throws IOException {
    List<Node> symbols = extract(
        "Io.kt", """
            package com.example

            /** Reads [path]. */
            suspend fun io(path: String): ByteArray = ByteArray(0)

            /**
             * Reads [count] bytes of [path].
             *
             * @param count how many bytes
             */
            suspend fun io(path: String, count: Int): ByteArray = ByteArray(count)

            /** Decodes with [block]. */
            inline fun <reified T : Any> Wrapper<*>.decode(noinline block: () -> T = { error("none") }): T = block()

            internal fun hidden() {}

            private val cache = mutableMapOf<String, String>()
            """,
        "IoAll.kt", """
            package com.example

            /** Reads each of [paths]. */
            fun io(paths: List<String>): List<ByteArray> = paths.map { ByteArray(0) }
            """);
    assertEquals(List.of("io", "decode"), names(symbols));
    Node io = symbol(symbols, "io");
    assertEquals("function", io.kind);
    assertEquals(List.of("public suspend fun io(path: String): ByteArray", "public suspend fun io(path: String, count: Int): ByteArray",
        "public fun io(paths: List<String>): List<ByteArray>"), io.signatures);
    assertEquals("Reads `count` bytes of `path`.\n\nParameters:\n\n- `count`: how many bytes\n\nPackage: `com.example`.", io.docs);
    Node decode = symbol(symbols, "decode");
    assertEquals(List.of("public inline fun <reified T : Any> Wrapper<*>.decode(noinline block: () -> T = { error(\"none\") }): T"),
        decode.signatures);
    assertEquals("Decodes with `block`.\n\nPackage: `com.example`.", decode.docs);
  }

  @Test
  void deprecationsComeFromTheAnnotation() throws IOException {
    List<Node> symbols = extract("Legacy.kt", """
        package com.example

        /** Old. */
        @Deprecated("Use [Wrapper] instead.")
        class Legacy {
            /** Runs. */
            @Deprecated(level = DeprecationLevel.ERROR, message = "Gone.")
            fun run() {}

            /** Stops. */
            @Deprecated("")
            fun stop() {}
        }

        /** A token. */
        class Token private constructor(val value: String)
        """);
    Node legacy = symbol(symbols, "Legacy");
    assertEquals(List.of("public class Legacy"), legacy.signatures);
    assertEquals("Old.\n\nPackage: `com.example`.", legacy.docs);
    assertEquals("Use \\[Wrapper\\] instead.", legacy.deprecated, "the message is plain text, not KDoc");
    assertEquals(List.of("constructor", "run", "stop"), names(legacy.members));
    Node constructor = member(legacy, "constructor");
    assertEquals(List.of("public constructor()"), constructor.signatures, "a class without constructors has Kotlin's default");
    assertEquals("", constructor.docs);
    assertNull(constructor.deprecated);
    assertEquals("Runs.", member(legacy, "run").docs);
    assertEquals("Gone.", member(legacy, "run").deprecated);
    assertEquals("", member(legacy, "stop").deprecated);
    Node token = symbol(symbols, "Token");
    assertEquals(List.of("public class Token"), token.signatures);
    assertEquals(List.of("value"), names(token.members), "a private primary constructor isn't listed");
    assertEquals(List.of("public val value: String"), member(token, "value").signatures);
  }

  @Test
  void functionsInTwoPackagesCantShareAName() {
    String message = failure(
        "a/Run.kt", """
            package com.example.a

            /** Runs a. */
            fun run() {}
            """,
        "b/Run.kt", """
            package com.example.b

            /** Runs b. */
            fun run() {}
            """);
    assertEquals(location("b/Run.kt", 4)
        + "functions named run in com.example.a and com.example.b would share a docs page; rename one", message);
  }

  @Test
  void syntaxErrorsFail() {
    String message = failure("Broken.kt", """
        package com.example

        fun broken(: Int) {}
        """);
    assertTrue(message.startsWith(location("Broken.kt", 3) + "can't parse the Kotlin: "), message);
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource
  void failsOnWhatItCantDocument(String file, String text, int line, String message) {
    assertEquals(location(file, line) + message, failure(file, text));
  }

  static Stream<Arguments> failsOnWhatItCantDocument() {
    String kinds = "; the docs extractor documents plain classes";
    String classMembers = "; the docs extractor documents constructors, functions and properties of classes";
    String topLevel = "; the docs extractor documents functions and classes";
    return Stream.of(
        Arguments.of("Port.kt", """
            package com.example

            /** A port. */
            interface Port
            """, 4, "unsupported kind of class Port" + kinds),
        Arguments.of("Color.kt", """
            package com.example

            enum class Color { RED }
            """, 3, "unsupported kind of class Color" + kinds),
        Arguments.of("Point.kt", """
            package com.example

            data class Point(val x: Int)
            """, 3, "unsupported kind of class Point" + kinds),
        Arguments.of("Child.kt", """
            package com.example

            /** A child. */
            class Child : Runnable {
                override fun run() {}
            }
            """, 4, "Child has supertypes, and the docs extractor reads Kotlin without resolving types, so it can't list what"
            + " Child inherits"),
        Arguments.of("Outer.kt", """
            package com.example

            class Outer {
                /** Inner. */
                class Inner
            }
            """, 5, "unsupported public class Inner in Outer" + classMembers),
        Arguments.of("Holder.kt", """
            package com.example

            class Holder {
                companion object {
                    fun create(): Holder = Holder()
                }
            }
            """, 4, "unsupported public companion object in Holder" + classMembers),
        Arguments.of("Registry.kt", """
            package com.example

            object Registry
            """, 3, "unsupported public top-level object Registry" + topLevel),
        Arguments.of("Version.kt", """
            package com.example

            /** The version. */
            val version: String = "1"
            """, 4, "unsupported public top-level property version" + topLevel),
        Arguments.of("Id.kt", """
            package com.example

            typealias Id = String
            """, 3, "unsupported public top-level type alias Id" + topLevel),
        Arguments.of("Answer.kt", """
            package com.example

            fun answer() = 42
            """, 3, "declare the return type of public function answer"),
        Arguments.of("Box.kt", """
            package com.example

            class Box {
                val size = 1
            }
            """, 4, "declare the type of public property size"),
        Arguments.of("Old.kt", """
            package com.example

            /** Old. */
            @Deprecated("Use " + "new")
            fun old() {}
            """, 4, "write the @Deprecated message as a plain string literal"),
        Arguments.of("Bag.kt", """
            package com.example

            class Bag {
                val size: Int = 0

                fun size(): Int = 0
            }
            """, 6, "a method and a property share the name size; rename one"),
        Arguments.of("Sample.kt", """
            package com.example

            /**
             * Samples.
             *
             * @sample com.example.sampled
             */
            fun sampled() {}
            """, 6, "unsupported KDoc tag @sample; document it in prose, or put example code in a tested quickstart snippet"));
  }
}
