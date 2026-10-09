package com.convohop.docs.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class KDocTest {
    private fun convert(vararg lines: String): String = KDoc.convert(lines.joinToString("\n"), "Example.kt", 7)

    private fun failure(vararg lines: String): String? =
        assertThrows(ExtractionException::class.java) { convert(*lines) }.message

    @Test
    fun keepsTheMarkdownAndTurnsLinksIntoCode() {
        assertEquals("Greets `name`.", convert("/** Greets [name]. */"))
        assertEquals(
            "Sends with the `client`'s session; see [the guide](https://example.com) and `a[0]`.\n\nA \\[second\\] paragraph.",
            convert(
                "/**",
                " * Sends with the [client][ConvoHopClient]'s session; see [the guide](https://example.com) and `a[0]`.",
                " *",
                " * A \\[second\\] paragraph.",
                " */",
            ),
        )
    }

    @Test
    fun aLinkBeforeAColonIsALinkUnlessItStartsAParagraph() {
        assertEquals(
            "The layer over a `ConvoHopClient`: one outbox. Reports it as a\n`PushRegistration.Token`: store it.\n\n[guide]: https://example.com",
            convert(
                "/**",
                " * The layer over a [ConvoHopClient]: one outbox. Reports it as a",
                " * [PushRegistration.Token]: store it.",
                " *",
                " * [guide]: https://example.com",
                " */",
            ),
        )
        assertEquals("[guide]: https://example.com", convert("/** [guide]: https://example.com */"))
    }

    @Test
    fun putsParametersAfterTheDescriptionAndTheOtherTagsAfterThem() {
        assertEquals(
            listOf(
                "Joins a call.",
                "Parameters:\n\n- `alertId`: The alert's ID, from\nthe push.\n- `video`: Whether to publish video.",
                "Returns: The joined `ConvoHopCall`.",
                "Throws: `IllegalStateException` When the client is closed.",
                "See `leave`",
            ).joinToString("\n\n"),
            convert(
                "/**",
                " * Joins a call.",
                " *",
                " * @param alertId The alert's ID, from",
                " *   the push.",
                " * @return The joined [ConvoHopCall].",
                " * @param [video] Whether to publish video.",
                " * @throws IllegalStateException When the client is closed.",
                " * @see leave",
                " */",
            ),
        )
    }

    @Test
    fun failsOnCodeBlocksAndTagsItCannotPlace() {
        // Lines count from line 7, where the comment starts.
        val untested = "KDoc code blocks aren't tested; put example code in a tested quickstart snippet"
        assertEquals("Example.kt:9: $untested", failure("/**", " * Connects:", " * ```kotlin", " * connect()", " * ```", " */"))
        assertEquals("Example.kt:10: $untested", failure("/**", " * Connects:", " *", " *     connect()", " */"))
        assertEquals(
            "Example.kt:9: @sample isn't supported; say it in the description",
            failure("/**", " * Connects.", " * @sample com.example.connect", " */"),
        )
        assertEquals("Example.kt:7: @return needs a description", failure("/** @return */"))
        assertEquals("Example.kt:8: @param needs a name first", failure("/**", " * @param", " */"))
    }

    @Test
    fun codeSpansOutlastTheBackticksInside() {
        assertEquals("`plain`", KDoc.codeSpan("plain"))
        assertEquals("``a`b``", KDoc.codeSpan("a`b"))
        assertEquals("`` `tick` ``", KDoc.codeSpan("`tick`"))
    }
}
