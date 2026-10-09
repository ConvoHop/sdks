package com.convohop.docs.android

import org.junit.AfterClass
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.BeforeClass
import org.junit.Test

class SurfaceTest {
    @Test
    fun mapsEachKindOfDeclaration() {
        val symbols = extract(
            "com/example/sdk/Greeter.kt" to """
                package com.example.sdk

                /** Greets people. */
                class Greeter(
                    /** Who to greet first. */
                    val first: String,
                    private val secret: String,
                ) {
                    /** Greets [name]. */
                    fun greet(name: String): String = "Hello, " + name

                    /** Greets everyone in [names]. */
                    fun greet(names: List<String>): List<String> = names.map { greet(it) }

                    internal fun hidden(): String = secret

                    var count: Int = 0
                        private set

                    /** A tone of voice. */
                    enum class Tone {
                        /** Friendly. */
                        WARM,
                        COLD,
                    }

                    companion object {
                        const val LIMIT: Int = 10

                        /** A greeter for [name]. */
                        @JvmStatic
                        fun of(name: String): Greeter = Greeter(name, "")
                    }
                }

                /** Speaks. */
                interface Speaker {
                    fun speak(text: String)
                }

                /** Greeters for everyone. */
                object Greeters {
                    fun once(name: String): String = name
                }

                /** Says [text] aloud. */
                fun say(text: String): String = text

                /** Says [text] to [whom]. */
                fun say(text: String, whom: String): String = whom + text

                /** The greeting to use. */
                val GREETING: String = "Hello"

                typealias GreeterName = String

                private class Secret
            """,
        )
        assertEquals(
            """
            constant GREETING
            class Greeter
              constructor constructor
              property first
              method greet
              property count
              property LIMIT [static]
              method of [static]
            enum Greeter.Tone
              case WARM
              case COLD
            type GreeterName
            class Greeters
              method once [static]
            interface Speaker
              method speak
            function say
            """.trimIndent(),
            outline(symbols),
        )
        val greeter = symbols.named("Greeter")
        assertEquals(listOf("public class Greeter"), greeter.signatures)
        assertEquals("Greets people.\n\nPackage: `com.example.sdk`.", greeter.docs)
        assertEquals(listOf("public constructor(first: String, secret: String)"), greeter.members.named("constructor").signatures)
        assertEquals("Who to greet first.", greeter.members.named("first").docs)
        val greet = greeter.members.named("greet")
        assertEquals(listOf("public fun greet(name: String): String", "public fun greet(names: List<String>): List<String>"), greet.signatures)
        assertEquals("Greets `name`.\n\nGreets everyone in `names`.", greet.docs)
        assertEquals(listOf("public var count: Int\n    private set"), greeter.members.named("count").signatures)
        assertEquals(listOf("public const val LIMIT: Int = 10"), greeter.members.named("LIMIT").signatures)
        assertEquals(listOf("public fun of(name: String): Greeter"), greeter.members.named("of").signatures)
        val tone = symbols.named("Greeter.Tone")
        assertEquals(listOf("public enum class Tone"), tone.signatures)
        assertEquals(listOf("Friendly.", ""), tone.members.map { it.docs })
        assertEquals(listOf("public typealias GreeterName = String"), symbols.named("GreeterName").signatures)
        assertEquals(listOf("public object Greeters"), symbols.named("Greeters").signatures)
        assertEquals(listOf("public fun speak(text: String)"), symbols.named("Speaker").members.single().signatures)
        val say = symbols.named("say")
        assertEquals(listOf("public fun say(text: String): String", "public fun say(text: String, whom: String): String"), say.signatures)
        assertEquals("Says `text` aloud.\n\nSays `text` to `whom`.\n\nPackage: `com.example.sdk`.", say.docs)
        assertEquals(listOf("public val GREETING: String"), symbols.named("GREETING").signatures)
    }

    @Test
    fun documentsModelsByTheirDeclaration() {
        val symbols = extract(
            "com/example/generated/Models.kt" to """
                package com.example.generated

                /** A message. */
                data class Message(
                    val messageId: String,
                    val text: String? = null,
                ) {
                    fun isEmpty(): Boolean = text == null
                }

                enum class Role {
                    MEMBER,
                    OWNER;

                    fun wire(): String = name.lowercase()

                    companion object {
                        fun fromWire(value: String): Role = valueOf(value.uppercase())
                    }
                }

                /** Pages of messages. */
                class Pager(val size: Int) {
                    fun next(): Int = size
                }
            """,
        )
        assertEquals(
            """
            type Message
            class Pager
              constructor constructor
              property size
              method next
            enum Role
              case MEMBER
              case OWNER
            """.trimIndent(),
            outline(symbols),
        )
        val message = symbols.named("Message")
        assertEquals(listOf("public data class Message(val messageId: String, val text: String? = null)"), message.signatures)
        assertEquals("A message.\n\nPackage: `com.example.generated`.", message.docs)
    }

    @Test
    fun inheritsMembersAndDocsFromTheSdksOwnTypes() {
        val symbols = extract(
            "com/example/sdk/base/Base.kt" to """
                package com.example.sdk.base

                /** Something with an ID. */
                interface Identified {
                    /** The ID. */
                    val id: String

                    /** Releases it. */
                    fun close()
                }

                /** Shared behaviour. */
                abstract class Middle : Identified {
                    override fun close() {}

                    /** Middle's own. */
                    fun middle(): Int = 0
                }
            """,
            "com/example/sdk/Leaf.kt" to """
                package com.example.sdk

                import com.example.sdk.base.Middle

                /** The concrete one. */
                class Leaf : Middle() {
                    override val id: String = "leaf"
                }
            """,
        )
        assertEquals(
            """
            interface Identified
              property id
              method close
            class Leaf
              constructor constructor
              property id
              method close [from Middle]
              method middle [from Middle]
            class Middle
              constructor constructor
              method close
              method middle
              property id [from Identified]
            """.trimIndent(),
            outline(symbols),
        )
        val leaf = symbols.named("Leaf")
        assertEquals(listOf("public class Leaf : Middle"), leaf.signatures)
        // An override without KDoc takes the docs of the member it overrides, however far up.
        assertEquals(listOf("The ID.", "Releases it.", "Middle's own."), leaf.members.drop(1).map { it.docs })
        assertEquals(listOf("public override val id: String"), leaf.members.named("id").signatures)
        assertEquals(listOf("public abstract class Middle : Identified"), symbols.named("Middle").signatures)
    }

    @Test
    fun documentsAnInnerClassUnderItsProperty() {
        val symbols = extract(
            "com/example/sdk/Client.kt" to """
                package com.example.sdk

                /** A client. */
                class Client {
                    /** Calls through this client. */
                    val calls: Calls = Calls()

                    val live: Live = Live()

                    /** Starts calls. */
                    inner class Calls {
                        /** Starts a call. */
                        fun start(): String = "call"
                    }

                    /** Live sessions. */
                    inner class Live {
                        fun join(): String = "live"
                    }
                }
            """,
        )
        assertEquals(
            """
            class Client
              constructor constructor
              property calls
                method start
              property live
                method join
            """.trimIndent(),
            outline(symbols),
        )
        val client = symbols.named("Client")
        assertEquals("Calls through this client.", client.members.named("calls").docs)
        assertEquals("Live sessions.", client.members.named("live").docs)
    }

    @Test
    fun leavesOutWhatTheApiHidesAndMarksWhatItDeprecates() {
        val symbols = extract(
            "com/example/sdk/Sender.kt" to """
                package com.example.sdk

                /** Sends. */
                open class Sender {
                    fun send(text: String): Boolean = text.isNotEmpty()

                    @Deprecated("Use [send].")
                    fun post(text: String): Boolean = send(text)

                    @Deprecated("Gone.", level = DeprecationLevel.HIDDEN)
                    fun old(): Boolean = false

                    /** Sends [text] later. */
                    @Deprecated(message = "Use [send].")
                    fun later(text: String): Boolean = send(text)

                    /** Sends [count] copies later. */
                    fun later(text: String, count: Int): Boolean = count > 0 && send(text)

                    protected fun forSubclasses(): Int = 0

                    private fun secret(): Int = 0

                    internal fun shared(): Int = 0
                }

                @Deprecated("Use [Sender].")
                class OldSender

                internal class Wire
            """,
        )
        assertEquals(
            """
            class OldSender [deprecated: Use `Sender`.]
              constructor constructor
            class Sender
              constructor constructor
              method send
              method post [deprecated: Use `send`.]
              method later
              method forSubclasses
            """.trimIndent(),
            outline(symbols),
        )
        val sender = symbols.named("Sender")
        // An overload that isn't deprecated keeps the member current.
        assertEquals("Sends `text` later.\n\nSends `count` copies later.", sender.members.named("later").docs)
        assertEquals(listOf("protected fun forSubclasses(): Int"), sender.members.named("forSubclasses").signatures)
    }

    @Test
    fun failsOnWhatItCannotDocument() {
        assertEquals(
            "Example.kt:3: give public function answer an explicit return type",
            failure(
                """
                package com.example.sdk

                fun answer() = 42
                """,
            ),
        )
        assertEquals(
            "Example.kt:3: give public property answer an explicit type",
            failure(
                """
                package com.example.sdk

                val answer = 42
                """,
            ),
        )
        assertEquals(
            "Example.kt:6: another property is named name; rename one of them",
            failure(
                """
                package com.example.sdk

                class Clash {
                    val name: String = ""

                    fun name(): String = ""
                }
                """,
            ),
        )
        assertEquals(
            "Example.kt:4: give inner class Calls one public property of its type to document it under",
            failure(
                """
                package com.example.sdk

                class Client {
                    inner class Calls
                }
                """,
            ),
        )
        assertEquals(
            "Example.kt:5: write the @Deprecated message as a string literal without templates",
            failure(
                """
                package com.example.sdk

                const val NEXT: String = "send"

                @Deprecated("Use ${'$'}NEXT.")
                fun post(): Boolean = false
                """,
            ),
        )
        assertEquals(
            "Example.kt:5: Derived extends Base, which isn't public",
            failure(
                """
                package com.example.sdk

                internal open class Base

                class Derived : Base()
                """,
            ),
        )
        assertEquals(
            "Example.kt:5: move Nested out of the companion object",
            failure(
                """
                package com.example.sdk

                class Holder {
                    companion object {
                        class Nested
                    }
                }
                """,
            ),
        )
        assertEquals(
            "Example.kt:6: @sample isn't supported; say it in the description",
            failure(
                """
                package com.example.sdk

                /**
                 * Connects.
                 *
                 * @sample connect
                 */
                fun connect(): Boolean = true
                """,
            ),
        )
        assertEquals("Example.kt: declare the file's package", failure("class Lost"))
    }

    @Test
    fun failsWhenTwoKotlinPackagesShareAName() {
        val greeter = "/** Greets. */\nclass Greeter\n\n/** Says hello. */\nfun hello(): String = \"hello\"\n"
        val sameFunction = assertThrows(ExtractionException::class.java) {
            extract("a/Greeter.kt" to "package com.example.a\n\n$greeter", "b/Hello.kt" to "package com.example.b\n\nfun hello(): String = \"\"")
        }
        assertEquals("b/Hello.kt:3: com.example:sdk has functions named hello in two Kotlin packages", sameFunction.message)
        val sameClass = assertThrows(ExtractionException::class.java) {
            extract("a/Greeter.kt" to "package com.example.a\n\n$greeter", "b/Greeter.kt" to "package com.example.b\n\nclass Greeter")
        }
        assertEquals("com.example:sdk has more than one public symbol named Greeter", sameClass.message)
    }

    @Test
    fun failsAtTheFirstSyntaxError() {
        val error = assertThrows(ExtractionException::class.java) { parser.parse("Broken.kt", "package com.example.sdk\n\nclass {\n") }
        assertTrue(error.message, error.message!!.startsWith("Broken.kt:3: "))
    }

    private fun extract(vararg files: Pair<String, String>): List<Node> {
        val sources = files.map { (path, text) -> parser.parse(path, text.trimIndent()) }
        return Surface("com.example.generated").extract(listOf(DocsPackage("com.example:sdk", sources))).single().symbols
    }

    private fun failure(text: String): String? =
        assertThrows(ExtractionException::class.java) { extract("Example.kt" to text) }.message

    /** One line per symbol and member: its kind, name and flags, with members indented under it. */
    private fun outline(nodes: List<Node>, indent: String = ""): String = nodes.joinToString("\n") { node ->
        val flags = listOfNotNull("static".takeIf { node.static }, node.inherited?.let { "from $it" }, node.deprecated?.let { "deprecated: $it" })
        val line = "$indent${node.kind} ${node.name}" + flags.joinToString("") { " [$it]" }
        if (node.members.isEmpty()) line else line + "\n" + outline(node.members, "$indent  ")
    }

    private fun List<Node>.named(name: String): Node = single { it.name == name }

    companion object {
        private lateinit var parser: Parser

        @BeforeClass
        @JvmStatic
        fun startParser() {
            parser = Parser()
        }

        @AfterClass
        @JvmStatic
        fun stopParser() {
            parser.close()
        }
    }
}
