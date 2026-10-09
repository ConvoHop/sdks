package com.convohop.android.push

/** A JSON number, kept as its text so no precision is lost. */
internal class JsonNumber(val text: String) {
    override fun equals(other: Any?): Boolean = other is JsonNumber && other.text == text

    override fun hashCode(): Int = text.hashCode()

    override fun toString(): String = text
}

internal class JsonSyntaxException(message: String) : RuntimeException(message) {
    override fun fillInStackTrace(): Throwable = this
}

/**
 * A strict RFC 8259 reader and a compact writer, so the push module needs no
 * JSON library and parses the same way on the JVM and on devices. Objects
 * become [Map]s with unique keys, arrays [List]s, numbers [JsonNumber]s, and
 * `null` is Kotlin null. Anything else, including duplicate keys, raw control
 * characters and nesting deeper than 64, is a [JsonSyntaxException].
 */
internal object PushJson {
    private const val MAX_DEPTH = 64

    fun parse(text: String): Any? {
        val reader = Reader(text)
        reader.skipWhitespace()
        val value = reader.value(0)
        reader.skipWhitespace()
        if (reader.index != text.length) throw JsonSyntaxException("Unexpected text after the JSON value")
        return value
    }

    fun write(value: Any?): String = StringBuilder().also { write(value, it) }.toString()

    private fun write(value: Any?, out: StringBuilder) {
        when (value) {
            null -> out.append("null")
            is Boolean -> out.append(value)
            is Int, is Long -> out.append(value)
            is JsonNumber -> out.append(value.text)
            is String -> quote(value, out)
            is Map<*, *> -> {
                out.append('{')
                var first = true
                for ((key, item) in value) {
                    if (!first) out.append(',')
                    first = false
                    quote(key as String, out)
                    out.append(':')
                    write(item, out)
                }
                out.append('}')
            }
            is List<*> -> {
                out.append('[')
                value.forEachIndexed { index, item ->
                    if (index > 0) out.append(',')
                    write(item, out)
                }
                out.append(']')
            }
            else -> throw IllegalArgumentException("Unsupported JSON value")
        }
    }

    private fun quote(text: String, out: StringBuilder) {
        out.append('"')
        for (c in text) {
            when {
                c == '"' -> out.append("\\\"")
                c == '\\' -> out.append("\\\\")
                c == '\n' -> out.append("\\n")
                c == '\r' -> out.append("\\r")
                c == '\t' -> out.append("\\t")
                c == '\b' -> out.append("\\b")
                c == '\u000c' -> out.append("\\f")
                c < ' ' -> out.append("\\u00").append(HEX[c.code shr 4]).append(HEX[c.code and 0xf])
                else -> out.append(c)
            }
        }
        out.append('"')
    }

    private const val HEX = "0123456789abcdef"

    private class Reader(private val text: String) {
        var index = 0

        fun skipWhitespace() {
            while (index < text.length) {
                val c = text[index]
                if (c != ' ' && c != '\t' && c != '\n' && c != '\r') return
                index++
            }
        }

        fun value(depth: Int): Any? {
            if (index >= text.length) fail("Unexpected end of JSON")
            return when (text[index]) {
                '{' -> obj(depth + 1)
                '[' -> array(depth + 1)
                '"' -> string()
                't' -> literal("true", true)
                'f' -> literal("false", false)
                'n' -> literal("null", null)
                else -> number()
            }
        }

        private fun obj(depth: Int): Map<String, Any?> {
            if (depth > MAX_DEPTH) fail("JSON nesting exceeds its bound")
            index++
            val result = LinkedHashMap<String, Any?>()
            skipWhitespace()
            if (peek() == '}') {
                index++
                return result
            }
            while (true) {
                skipWhitespace()
                if (peek() != '"') fail("Expected an object key")
                val key = string()
                if (result.containsKey(key)) fail("Duplicate object key")
                skipWhitespace()
                expect(':')
                skipWhitespace()
                result[key] = value(depth)
                skipWhitespace()
                when (peek()) {
                    ',' -> index++
                    '}' -> {
                        index++
                        return result
                    }
                    else -> fail("Expected ',' or '}'")
                }
            }
        }

        private fun array(depth: Int): List<Any?> {
            if (depth > MAX_DEPTH) fail("JSON nesting exceeds its bound")
            index++
            val result = ArrayList<Any?>()
            skipWhitespace()
            if (peek() == ']') {
                index++
                return result
            }
            while (true) {
                skipWhitespace()
                result.add(value(depth))
                skipWhitespace()
                when (peek()) {
                    ',' -> index++
                    ']' -> {
                        index++
                        return result
                    }
                    else -> fail("Expected ',' or ']'")
                }
            }
        }

        private fun string(): String {
            index++
            val out = StringBuilder()
            while (true) {
                if (index >= text.length) fail("Unterminated string")
                val c = text[index++]
                when {
                    c == '"' -> return out.toString()
                    c == '\\' -> {
                        if (index >= text.length) fail("Unterminated escape")
                        when (val e = text[index++]) {
                            '"', '\\', '/' -> out.append(e)
                            'b' -> out.append('\b')
                            'f' -> out.append('\u000c')
                            'n' -> out.append('\n')
                            'r' -> out.append('\r')
                            't' -> out.append('\t')
                            'u' -> {
                                if (index + 4 > text.length) fail("Truncated unicode escape")
                                var code = 0
                                repeat(4) {
                                    val digit = Character.digit(text[index++], 16)
                                    if (digit < 0) fail("Invalid unicode escape")
                                    code = code * 16 + digit
                                }
                                out.append(code.toChar())
                            }
                            else -> fail("Invalid escape")
                        }
                    }
                    c < ' ' -> fail("Unescaped control character in a string")
                    else -> out.append(c)
                }
            }
        }

        private fun literal(word: String, value: Any?): Any? {
            if (!text.startsWith(word, index)) fail("Unrecognized JSON literal")
            index += word.length
            return value
        }

        private fun number(): JsonNumber {
            val start = index
            if (peek() == '-') index++
            when {
                peek() == '0' -> index++
                peek() in '1'..'9' -> digits()
                else -> fail("Unrecognized JSON value")
            }
            if (peek() == '.') {
                index++
                if (peek() !in '0'..'9') fail("Expected a fraction digit")
                digits()
            }
            if (peek() == 'e' || peek() == 'E') {
                index++
                if (peek() == '+' || peek() == '-') index++
                if (peek() !in '0'..'9') fail("Expected an exponent digit")
                digits()
            }
            return JsonNumber(text.substring(start, index))
        }

        private fun digits() {
            while (peek() in '0'..'9') index++
        }

        private fun peek(): Char = if (index < text.length) text[index] else '\u0000'

        private fun expect(c: Char) {
            if (peek() != c) fail("Expected '$c'")
            index++
        }

        private fun fail(message: String): Nothing = throw JsonSyntaxException(message)
    }
}
