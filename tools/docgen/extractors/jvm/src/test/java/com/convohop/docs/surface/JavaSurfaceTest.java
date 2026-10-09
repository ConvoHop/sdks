package com.convohop.docs.surface;

import static com.convohop.docs.surface.Fixtures.member;
import static com.convohop.docs.surface.Fixtures.names;
import static com.convohop.docs.surface.Fixtures.staticMember;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class JavaSurfaceTest {
  @TempDir Path root;

  /** Extracts files given as names, relative to src/com/example, each followed by its text. */
  private List<Node> extract(String... files) throws IOException {
    List<Path> sources = new ArrayList<>();
    for (int i = 0; i < files.length; i += 2) sources.add(Fixtures.write(root, "src/com/example/" + files[i], files[i + 1]));
    return new JavaSurface("com.example.internal", "com.example.model", JavaSurface.sdkClasspath()).extract(sources);
  }

  private String failure(String... files) {
    return assertThrows(ExtractionException.class, () -> extract(files)).getMessage();
  }

  /** How errors start for {@code line} of {@code file}. */
  private String location(String file, int line) {
    return Sources.display(root.resolve("src/com/example/" + file)) + ":" + line + ": ";
  }

  @Test
  void convertsJavadocToMarkdown() throws IOException {
    List<Node> symbols = extract("Client.java", """
        package com.example;

        import java.io.IOException;

        /** A client. */
        public final class Client {
          /**
           * Sends {@code text} to a {@link Client}, as {@link #send(String, Object) send} does,
           * and {@linkplain Client the client} keeps *one* copy.
           *
           * <p>Shows {@literal <b>} &amp; 1 &lt; 2 as written, and {@link java.util.List#size()}.
           * <p>3. Done.
           * <p>- Dash, then <code>a  b</code>.
           *
           * @param <T> the payload type
           * @param text the text
           * @param payload the payload, sent
           *     as is
           * @return the message ID
           * @throws IOException if the request fails
           * @throws IllegalStateException when closed
           * @see #close()
           * @see Client the class
           * @deprecated Use {@link #post(String)}.
           */
          @Deprecated
          public <T> String send(String text, T payload) throws IOException {
            return text;
          }

          /** Posts {@code text}. */
          public void post(String text) {}

          /** Closes the client. */
          public void close() {}
        }
        """);
    Node client = symbol(symbols, "Client");
    assertEquals("class", client.kind);
    assertEquals(List.of("public final class Client"), client.signatures);
    assertEquals("A client.\n\nPackage: `com.example`.", client.docs);
    Node send = member(client, "send");
    assertEquals("method", send.kind);
    assertEquals(List.of("@Deprecated public <T> String send(String text, T payload) throws IOException"), send.signatures);
    assertEquals(String.join("\n\n",
        "Sends `text` to a `Client`, as `send` does, and the client keeps \\*one\\* copy.",
        "Shows \\<b\\> & 1 \\< 2 as written, and `List.size()`.",
        "3\\. Done.",
        "\\- Dash, then `a b`.",
        "Parameters:\n\n- `<T>`: the payload type\n- `text`: the text\n- `payload`: the payload, sent as is",
        "Returns: the message ID",
        "Throws: `IOException` if the request fails",
        "Throws: `IllegalStateException` when closed",
        "See `close()`",
        "See `the class`"), send.docs);
    assertEquals("Use `post(String)`.", send.deprecated);
  }

  @Test
  void signaturesShowWhatCallersWrite() throws IOException {
    List<Node> symbols = extract(
        "Settings.java", """
            package com.example;

            import java.util.List;
            import org.jspecify.annotations.Nullable;

            /** Settings. */
            public class Settings {
              /** The limit. */
              public static final int LIMIT = 10;
              /** The name. */
              public static final String NAME = "a\\"b";
              /** The current value. */
              public volatile @Nullable String current;
              private int hidden;

              /** Creates settings. */
              public Settings() {}

              /** Tags. */
              public void tag(String... names) {}

              /** The largest. */
              public static <T extends Comparable<T>> T max(List<? extends T> values) {
                return values.get(0);
              }

              /** Finds one. */
              public @Nullable String find(@Nullable String id) {
                return id;
              }

              /** Clears. */
              public synchronized void clear() {}

              /** Compares. */
              @Override
              public boolean equals(Object other) {
                return other == this;
              }

              @Override
              public int hashCode() {
                return 1;
              }

              int packagePrivate() {
                return hidden;
              }

              protected void subclassOnly() {}
            }
            """,
        "Listener.java", """
            package com.example;

            /** Listens. */
            @FunctionalInterface
            public interface Listener {
              /** Called on each event. */
              void onEvent(String event) throws Exception;
            }
            """);
    Node settings = symbol(symbols, "Settings");
    assertEquals(List.of("public class Settings"), settings.signatures);
    assertEquals(List.of("static LIMIT", "static NAME", "current", "constructor", "tag", "static max", "find", "clear", "equals"),
        names(settings.members), "undocumented Object overrides, and members callers can't reach, are left out");
    assertEquals("property", staticMember(settings, "LIMIT").kind);
    assertEquals(List.of("public static final int LIMIT = 10"), staticMember(settings, "LIMIT").signatures);
    assertEquals(List.of("public static final String NAME = \"a\\\"b\""), staticMember(settings, "NAME").signatures);
    assertEquals(List.of("public volatile @Nullable String current"), member(settings, "current").signatures);
    assertEquals(List.of("public Settings()"), member(settings, "constructor").signatures);
    assertEquals(List.of("public void tag(String... names)"), member(settings, "tag").signatures);
    assertEquals(List.of("public static <T extends Comparable<T>> T max(List<? extends T> values)"),
        staticMember(settings, "max").signatures);
    assertEquals(List.of("public @Nullable String find(@Nullable String id)"), member(settings, "find").signatures);
    assertEquals(List.of("public void clear()"), member(settings, "clear").signatures);
    assertEquals(List.of("public boolean equals(Object other)"), member(settings, "equals").signatures);
    assertEquals("Compares.", member(settings, "equals").docs);

    Node listener = symbol(symbols, "Listener");
    assertEquals("interface", listener.kind);
    assertEquals(List.of("@FunctionalInterface public interface Listener"), listener.signatures);
    assertEquals(List.of("void onEvent(String event) throws Exception"), member(listener, "onEvent").signatures);
  }

  @Test
  void overloadsShareTheDocsOfTheMostGeneralDocumentedOne() throws IOException {
    Node sender = symbol(extract("Sender.java", """
        package com.example;

        /** Sends. */
        public class Sender {
          /** Creates a sender. */
          public Sender() {}

          /**
           * Creates a sender with a name.
           *
           * @param name the name
           */
          public Sender(String name) {}

          /** Sends one. */
          @Deprecated
          public void send(String text) {}

          /**
           * Sends copies.
           *
           * @deprecated Send one at a time.
           */
          @Deprecated
          public void send(String text, int copies) {}

          public void send(String text, int copies, boolean urgent) {}

          /** Old. */
          @Deprecated
          public void old() {}

          /**
           * Older.
           *
           * @deprecated Gone soon.
           */
          @Deprecated
          public void old(int times) {}
        }
        """), "Sender");
    Node constructor = member(sender, "constructor");
    assertEquals("constructor", constructor.kind);
    assertEquals(List.of("public Sender()", "public Sender(String name)"), constructor.signatures);
    assertEquals("Creates a sender with a name.\n\nParameters:\n\n- `name`: the name", constructor.docs);
    Node send = member(sender, "send");
    assertEquals(List.of("@Deprecated public void send(String text)", "@Deprecated public void send(String text, int copies)",
        "public void send(String text, int copies, boolean urgent)"), send.signatures);
    assertEquals("Sends copies.", send.docs);
    assertNull(send.deprecated, "a name stays current while one overload isn't deprecated");
    Node old = member(sender, "old");
    assertEquals("Older.", old.docs);
    assertEquals("Gone soon.", old.deprecated);
  }

  @Test
  void staticAndInstanceMembersAreListedApart() throws IOException {
    Node type = symbol(extract("Names.java", """
        package com.example;

        /** Names. */
        public final class Names {
          private Names() {}

          /** Describes these names. */
          public String describe() {
            return "";
          }

          /** Describes {@code names}. */
          public static String describe(Names names) {
            return "";
          }
        }
        """), "Names");
    assertEquals(List.of("describe", "static describe"), names(type.members));
    assertEquals(List.of("public String describe()"), member(type, "describe").signatures);
    assertEquals(List.of("public static String describe(Names names)"), staticMember(type, "describe").signatures);
  }

  @Test
  void typesListWhatTheyInheritFromSdkTypes() throws IOException {
    List<Node> symbols = extract(
        "Base.java", """
            package com.example;

            /** A base. */
            public abstract class Base {
              /** The size. */
              public final int size = 1;

              /** Starts. */
              public void start() {}

              /** Stops. */
              public abstract void stop();

              /** Describes the service. */
              @Override
              public String toString() {
                return "Base";
              }
            }
            """,
        "Named.java", """
            package com.example;

            /** Has a name. */
            public interface Named {
              /** The name. */
              String name();
            }
            """,
        "Service.java", """
            package com.example;

            /** A service. */
            public final class Service extends Base implements Named {
              private Service() {}

              @Override
              public void stop() {}

              @Override
              public String name() {
                return "service";
              }

              /** Runs. */
              public void run() {}
            }
            """,
        "Failure.java", """
            package com.example;

            /** A failure. */
            public class Failure extends RuntimeException {
              private static final long serialVersionUID = 1L;

              private Failure() {}

              /** The code. */
              public String code() {
                return "x";
              }
            }
            """);
    Node service = symbol(symbols, "Service");
    assertEquals(List.of("public final class Service extends Base implements Named"), service.signatures);
    assertEquals(List.of("stop", "name", "run", "size", "start", "toString"), names(service.members));
    assertEquals("Stops.", member(service, "stop").docs, "an undocumented override shows the docs of what it overrides");
    assertNull(member(service, "stop").inherited);
    assertEquals("The name.", member(service, "name").docs);
    Node size = member(service, "size");
    assertEquals("Base", size.inherited);
    assertEquals(List.of("public final int size = 1"), size.signatures);
    assertEquals("Base", member(service, "start").inherited);
    assertEquals("Describes the service.", member(service, "toString").docs);

    Node failure = symbol(symbols, "Failure");
    assertEquals(List.of("public class Failure extends RuntimeException"), failure.signatures);
    assertEquals(List.of("code"), names(failure.members), "the members of JDK types aren't listed");
  }

  @Test
  void inheritingSomeOverloadsFails() {
    String message = failure(
        "Shape.java", """
            package com.example;

            /** A shape. */
            public class Shape {
              /** Draws. */
              public void draw() {}

              /** Draws at a scale. */
              public void draw(int scale) {}
            }
            """,
        "Square.java", """
            package com.example;

            /** A square. */
            public class Square extends Shape {
              @Override
              public void draw() {}
            }
            """);
    assertEquals(location("Shape.java", 9)
        + "Square inherits draw from Shape but declares or inherits another draw; override every overload of draw or none", message);
  }

  @Test
  void internalAndNonPublicTypesStayOut() throws IOException {
    List<Node> symbols = extract(
        "internal/Codec.java", """
            package com.example.internal;

            /** Encodes. */
            public final class Codec {}
            """,
        "internal/Hook.java", """
            package com.example.internal;

            public interface Hook {}
            """,
        "Hidden.java", """
            package com.example;

            /** Not public. */
            class Hidden {}
            """,
        "Engine.java", """
            package com.example;

            import com.example.internal.Codec;
            import com.example.internal.Hook;
            import java.util.List;

            /** An engine. */
            public final class Engine implements Hook, Runnable {
              /** Public, but its type is internal. */
              public final Codec codec = new Codec();

              /** Built from internal parts. */
              public Engine(Codec codec) {}

              /** Creates an engine. */
              public Engine() {}

              /** Lists internal parts. */
              public List<Codec> codecs() {
                return List.of();
              }

              /** Runs. */
              @Override
              public void run() {}

              Hidden hidden() {
                return new Hidden();
              }
            }
            """);
    assertEquals(List.of("Engine"), names(symbols));
    Node engine = symbol(symbols, "Engine");
    assertEquals(List.of("public final class Engine implements Runnable"), engine.signatures);
    assertEquals(List.of("constructor", "run"), names(engine.members));
    assertEquals(List.of("public Engine()"), member(engine, "constructor").signatures);
  }

  @Test
  void innerClassesFoldIntoTheirAccessors() throws IOException {
    List<Node> symbols = extract(
        "Account.java", """
            package com.example;

            import java.util.List;

            /** An account. */
            public final class Account {
              private final Users users = new Users();

              private Account() {}

              /** The account's users. */
              public Users users() {
                return users;
              }

              /** The users of an account. */
              public final class Users {
                private Users() {}

                /** Adds a user. */
                public void add(String name) {}

                /** Lists the users. */
                public List<String> list() {
                  return List.of();
                }
              }
            }
            """,
        "Project.java", """
            package com.example;

            /** A project. */
            public final class Project {
              private Project() {}

              public Members members() {
                return new Members();
              }

              /** The members of a project. */
              public final class Members {
                Members() {}

                /** Counts the members. */
                public int count() {
                  return 0;
                }
              }
            }
            """);
    assertEquals(List.of("Account", "Project"), names(symbols), "inner classes aren't symbols");
    Node users = member(symbol(symbols, "Account"), "users");
    assertEquals(List.of("public Users users()"), users.signatures);
    assertEquals("The account's users.", users.docs);
    assertEquals(List.of("add", "list"), names(users.members));
    assertEquals(List.of("public List<String> list()"), member(users, "list").signatures);
    Node members = member(symbol(symbols, "Project"), "members");
    assertEquals("The members of a project.", members.docs, "an undocumented accessor shows the docs of the class it returns");
    assertEquals(List.of("count"), names(members.members));
  }

  @Test
  void modelTypesAreListedWithoutMembers() throws IOException {
    List<Node> symbols = extract(
        "model/Message.java", """
            package com.example.model;

            /** A message. */
            public final class Message {
              /** The ID. */
              public final String id;

              public Message(String id) {
                this.id = id;
              }

              /** The text. */
              public String text() {
                return "";
              }
            }
            """,
        "model/Status.java", """
            package com.example.model;

            /** A status. */
            public enum Status {
              /** Sent. */
              SENT,
              /** Read. */
              READ;

              /** Whether nothing can follow. */
              public boolean done() {
                return this == READ;
              }
            }
            """,
        "model/Thing.java", """
            package com.example.model;

            /** A thing. */
            public interface Thing {}
            """);
    Node message = symbol(symbols, "Message");
    assertEquals("type", message.kind);
    assertEquals(List.of("public final class Message"), message.signatures);
    assertEquals("A message.\n\nPackage: `com.example.model`.", message.docs);
    assertEquals(List.of(), message.members);
    assertEquals("type", symbol(symbols, "Thing").kind);
    Node status = symbol(symbols, "Status");
    assertEquals("enum", status.kind);
    assertEquals(List.of("SENT", "READ"), names(status.members), "enums list their cases only");
    Node sent = member(status, "SENT");
    assertEquals("case", sent.kind);
    assertEquals(List.of("SENT"), sent.signatures);
    assertEquals("Sent.", sent.docs);
  }

  @Test
  void publicNestedTypesAreSymbolsOfTheirOwn() throws IOException {
    List<Node> symbols = extract("Outer.java", """
        package com.example;

        /** Holds builders. */
        public final class Outer {
          private Outer() {}

          /** Builds an outer. */
          public static final class Builder {
            /** Builds. */
            public Outer build() {
              return new Outer();
            }
          }

          /** Modes. */
          public enum Mode {
            /** Fast. */
            FAST,
            SLOW
          }

          static final class Secret {}
        }
        """);
    assertEquals(List.of("Outer", "Outer.Builder", "Outer.Mode"), names(symbols));
    assertEquals(List.of(), symbol(symbols, "Outer").members);
    Node builder = symbol(symbols, "Outer.Builder");
    assertEquals(List.of("public static final class Builder"), builder.signatures);
    assertEquals(List.of("constructor", "build"), names(builder.members));
    Node mode = symbol(symbols, "Outer.Mode");
    assertEquals("enum", mode.kind);
    assertEquals(List.of("public enum Mode"), mode.signatures);
    assertEquals(List.of("FAST", "SLOW"), names(mode.members));
    assertEquals("", member(mode, "SLOW").docs);
  }

  @Test
  void compileErrorsFail() {
    String message = failure("Broken.java", """
        package com.example;

        public final class Broken {
          public Missing missing() {
            return null;
          }
        }
        """);
    assertTrue(message.startsWith(location("Broken.java", 4) + "cannot find symbol"), message);
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource
  void failsOnWhatItCantDocument(String file, String text, int line, String message) {
    assertEquals(location(file, line) + message, failure(file, text));
  }

  static Stream<Arguments> failsOnWhatItCantDocument() {
    return Stream.of(
        Arguments.of("Since.java", """
            package com.example;

            /**
             * Since.
             *
             * @since 1.0
             */
            public final class Since {}
            """, 6, "unsupported Javadoc tag @since; document it in prose, or put example code in a tested quickstart snippet"),
        Arguments.of("Pre.java", """
            package com.example;

            /**
             * Example:
             * <pre>{@code
             * new Pre();
             * }</pre>
             */
            public final class Pre {}
            """, 5, "unsupported HTML element <pre>; use {@code ...} for code and <p> between paragraphs, or document it in"
            + " prose, or put example code in a tested quickstart snippet"),
        Arguments.of("Entity.java", """
            package com.example;

            /** Copyright &copy; ConvoHop. */
            public final class Entity {}
            """, 3, "unsupported HTML entity &copy; write the character itself"),
        Arguments.of("Inherit.java", """
            package com.example;

            /** Inherits. */
            public class Inherit {
              /** {@inheritDoc} */
              @Override
              public String toString() {
                return "";
              }
            }
            """, 5, "unsupported Javadoc tag {@inheritDoc}; document it in prose, or put example code in a tested quickstart"
            + " snippet"),
        Arguments.of("Runner.java", """
            package com.example;

            /** Runs. */
            public class Runner {
              /**
               * Runs.
               *
               * @param times how many
               *     <p>More.
               */
              public void run(int times) {}
            }
            """, 9, "a block tag's description must be one paragraph; move the rest to the main description"),
        Arguments.of("Unclosed.java", """
            package com.example;

            /** Uses <code>x. */
            public final class Unclosed {}
            """, 3, "unclosed <code>"),
        Arguments.of("Lead.java", """
            package com.example;

            /** <p class="lead">Lead. */
            public final class Lead {}
            """, 3, "unsupported attributes on <p>"),
        Arguments.of("Guide.java", """
            package com.example;

            /**
             * Guides.
             *
             * @see "the guide"
             */
            public final class Guide {}
            """, 6, "@see takes a class or member reference; link other targets in prose"),
        Arguments.of("Marker.java", """
            package com.example;

            /** Marks things. */
            public @interface Marker {}
            """, 4, "unsupported annotation type Marker"),
        Arguments.of("Clash.java", """
            package com.example;

            /** Clashes. */
            public final class Clash {
              /** A field. */
              public final int size = 0;

              /** A method. */
              public int size() {
                return size;
              }
            }
            """, 9, "a method and a property share the name size; rename one"),
        Arguments.of("Orphan.java", """
            package com.example;

            /** Holds an orphan. */
            public final class Orphan {
              /** Lost. */
              public final class Lost {
                private Lost() {}
              }
            }
            """, 6, "public inner class Orphan.Lost needs a public no-argument accessor, which documents its members"),
        Arguments.of("House.java", """
            package com.example;

            /** Has a door. */
            public final class House {
              /** The door. */
              public Door door() {
                return new Door();
              }

              /** A door. */
              public final class Door {
                /** Makes a door. */
                public Door() {}
              }
            }
            """, 11, "public inner class House.Door has a public constructor; make it private, since door() is how callers"
            + " reach it"));
  }
}
