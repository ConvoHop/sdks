package com.convohop.android.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

internal class PushJsonTest {
    @Test
    fun parsesEveryValueKind() {
        assertEquals(
            mapOf("a" to listOf(true, false, null, JsonNumber("-1.5e+3"), JsonNumber("0")), "b" to "x", "c" to emptyMap<String, Any?>()),
            PushJson.parse(" {\"a\" : [true,false,null,-1.5e+3,0],\r\n\t\"b\":\"x\", \"c\":{}}\n"),
        )
        assertEquals("text", PushJson.parse("\"text\""))
        assertNull(PushJson.parse("null"))
        assertEquals(JsonNumber("12.50E-1"), PushJson.parse("12.50E-1"))
        assertEquals(emptyList<Any?>(), PushJson.parse("[ ]"))
    }

    @Test
    fun keepsNumbersAsText() {
        assertEquals(JsonNumber("9007199254740993"), PushJson.parse("9007199254740993"))
        assertEquals("1.10", PushJson.write(PushJson.parse("1.10")))
    }

    @Test
    fun decodesEscapes() {
        assertEquals(
            "\"\\/\b\u000c\n\r\t\u00e9\ud83d\udc4b",
            PushJson.parse("\"\\\"\\\\\\/\\b\\f\\n\\r\\t\\u00E9\\ud83d\\udc4b\""),
        )
    }

    @Test
    fun rejectsInvalidDocuments() {
        val invalid = listOf(
            "", " ", "{", "}", "[", "[1,]", "{\"a\":1,}", "{\"a\" 1}", "{a:1}", "{\"a\":1}x", "01", "-", "1.", ".5", "1e",
            "+1", "tru", "nul", "True", "NaN", "Infinity", "'a'", "\"\\x\"", "\"\\u12\"", "\"\\u12g4\"", "\"abc", "\"\\",
            "\"a\u0001\"", "\"\t\"", "{\"a\":1,\"a\":2}", "[1 2]", "[1]]",
        )
        for (text in invalid) {
            assertThrows(text, JsonSyntaxException::class.java) { PushJson.parse(text) }
        }
    }

    @Test
    fun boundsNesting() {
        assertEquals(64, depth(PushJson.parse("[".repeat(64) + "]".repeat(64))))
        assertThrows(JsonSyntaxException::class.java) { PushJson.parse("[".repeat(65) + "]".repeat(65)) }
        PushJson.parse("{\"a\":".repeat(64) + "1" + "}".repeat(64))
        assertThrows(JsonSyntaxException::class.java) { PushJson.parse("{\"a\":".repeat(65) + "1" + "}".repeat(65)) }
    }

    @Test
    fun writesCompactJson() {
        val value = linkedMapOf<String, Any?>(
            "s" to "q\"b\\n\n r\r t\t b\b f\u000c c\u0001 e\u001f é 👋",
            "n" to null,
            "t" to true,
            "f" to false,
            "i" to 7,
            "l" to -9_007_199_254_740_993L,
            "j" to JsonNumber("1.50"),
            "a" to listOf(1, emptyList<Any?>(), emptyMap<String, Any?>()),
        )
        val text = PushJson.write(value)
        assertEquals(
            "{\"s\":\"q\\\"b\\\\n\\n r\\r t\\t b\\b f\\f c\\u0001 e\\u001f é 👋\",\"n\":null,\"t\":true,\"f\":false," +
                "\"i\":7,\"l\":-9007199254740993,\"j\":1.50,\"a\":[1,[],{}]}",
            text,
        )
        assertEquals(text, PushJson.write(PushJson.parse(text)))
    }

    @Test
    fun refusesValuesJsonCannotHold() {
        assertThrows(IllegalArgumentException::class.java) { PushJson.write(1.5) }
        assertThrows(IllegalArgumentException::class.java) { PushJson.write(mapOf("a" to Any())) }
    }

    private fun depth(value: Any?): Int = if (value is List<*>) 1 + depth(value.firstOrNull()) else 0
}
