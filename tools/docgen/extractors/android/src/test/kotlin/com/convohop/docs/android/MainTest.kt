package com.convohop.docs.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.deleteExisting
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText

class MainTest {
    @get:Rule
    val folder = TemporaryFolder()

    private val errors = mutableListOf<String>()

    private val root: Path get() = folder.root.toPath()

    @Test
    fun writesEachModulesSurfaceInArgumentOrder() {
        write("core/src/main/kotlin/com/example/core/Client.kt", "package com.example.core\n\n/** A client. */\nclass Client\n")
        write(
            "push/src/main/kotlin/com/example/push/Push.kt",
            "package com.example.push\n\n/** Registers [token]. */\nfun register(token: String): Boolean = token.isNotEmpty()\n",
        )
        // Overloads merge in path order, whatever order the file system lists them in.
        write(
            "push/src/main/kotlin/com/example/push/Again.kt",
            "package com.example.push\n\n/** Registers [token] for [user]. */\nfun register(token: String, user: String): Boolean = user.isNotEmpty()\n",
        )
        write("push/src/main/AndroidManifest.xml", "<manifest />\n")

        val code = run("--language", "android", "--output", "docs/surface.json", "--package", "com.example:push=push", "--package", "com.example:core=core")

        assertEquals(listOf<String>(), errors)
        assertEquals(0, code)
        assertEquals(
            """
            {
              "language": "android",
              "packages": [
                {
                  "name": "com.example:push",
                  "symbols": [
                    {
                      "name": "register",
                      "kind": "function",
                      "signatures": [
                        "public fun register(token: String, user: String): Boolean",
                        "public fun register(token: String): Boolean"
                      ],
                      "docs": "Registers `token` for `user`.\n\nRegisters `token`.\n\nPackage: `com.example.push`."
                    }
                  ]
                },
                {
                  "name": "com.example:core",
                  "symbols": [
                    {
                      "name": "Client",
                      "kind": "class",
                      "signatures": [
                        "public class Client"
                      ],
                      "docs": "A client.\n\nPackage: `com.example.core`.",
                      "members": [
                        {
                          "name": "constructor",
                          "kind": "constructor",
                          "signatures": [
                            "public constructor()"
                          ],
                          "docs": ""
                        }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent() + "\n",
            root.resolve("docs/surface.json").readText(),
        )
    }

    @Test
    fun rejectsBadUsage() {
        val usage = "usage: extract --language <id> --output <surface.json> --package <name>=<module> ..."
        val cases = listOf(
            listOf("--output", "s.json", "--package", "a=core") to "--language is required",
            listOf("--language", "android", "--package", "a=core") to "--output is required",
            listOf("--language", "android", "--output", "s.json") to "give at least one --package",
            listOf("--language", "android", "--output", "s.json", "--package", "core") to "--package takes <name>=<module>, not core",
            listOf("--language", "android", "--output", "s.json", "--package", "a=") to "--package takes <name>=<module>, not a=",
            listOf("--package", "a=core", "--package", "a=push") to "package a is given twice",
            listOf("--language", "android", "--output") to "--output needs a value",
            listOf("--language", "android", "--verbose", "yes") to "unknown argument --verbose",
        )
        for ((args, problem) in cases) {
            errors.clear()
            assertEquals(args.toString(), 2, run(*args.toTypedArray()))
            assertEquals(listOf("android extractor: $problem\n$usage"), errors)
        }
    }

    @Test
    fun reportsSourceProblemsWithoutWritingTheSurface() {
        val args = arrayOf("--language", "android", "--output", "docs/surface.json", "--package", "com.example:core=core")
        assertEquals(1, run(*args))
        assertEquals(listOf("android extractor: core/src/main/kotlin isn't a directory"), errors)

        write("core/src/main/kotlin/com/example/core/Client.kt", "package com.example.core\n\nfun answer() = 42\n")
        assertEquals(
            "core/src/main/kotlin/com/example/core/Client.kt:3: give public function answer an explicit return type",
            failure(*args),
        )

        write("core/src/main/kotlin/com/example/core/Client.kt", "package com.example.core\n\nclass Client\n")
        write("core/src/main/java/com/example/core/Legacy.java", "package com.example.core;\n")
        assertEquals(
            "core/src/main/java/com/example/core/Legacy.java: the docs extractor reads only Kotlin; write the SDK in Kotlin",
            failure(*args),
        )

        root.resolve("core/src/main/java/com/example/core/Legacy.java").deleteExisting()
        write("core/src/main/java/com/example/core/Stray.kt", "package com.example.core\n\nclass Stray\n")
        assertEquals("core/src/main/java/com/example/core/Stray.kt: put Kotlin sources under src/main/kotlin", failure(*args))

        assertFalse(root.resolve("docs/surface.json").exists())
    }

    private fun write(path: String, text: String) {
        val file = root.resolve(path)
        file.parent.createDirectories()
        file.writeText(text)
    }

    private fun run(vararg args: String): Int = extract(arrayOf(*args), root) { errors += it }

    /** The one error a run that fails on the sources reports, without the extractor's prefix. */
    private fun failure(vararg args: String): String {
        errors.clear()
        assertEquals(1, run(*args))
        return errors.single().removePrefix("android extractor: ")
    }
}
