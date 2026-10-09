package com.convohop.docs.android

/** A problem in the sources or arguments that stops extraction, with a `file:line:` prefix when it has a place. */
class ExtractionException(message: String) : RuntimeException(message)

/**
 * A symbol or member of the surface (spec/docs/surface.schema.json). Symbols leave [static] false and [inherited]
 * null; members of a property, such as an inner class's, go in [members].
 */
class Node(
    val name: String,
    val kind: String,
    val signatures: MutableList<String>,
    var docs: String,
    var deprecated: String? = null,
    val static: Boolean = false,
    val inherited: String? = null,
    val members: MutableList<Node> = mutableListOf(),
) {
    /** A copy that [base] declares, for a type that inherits it. */
    fun inheritedFrom(base: String, static: Boolean): Node =
        Node(name, kind, signatures.toMutableList(), docs, deprecated, static, base, members.toMutableList())

    fun toJson(): Any? = linkedMapOf<String, Any?>().apply {
        put("name", name)
        put("kind", kind)
        put("signatures", signatures)
        put("docs", docs)
        deprecated?.let { put("deprecated", it) }
        if (static) put("static", true)
        inherited?.let { put("inherited", it) }
        if (members.isNotEmpty()) put("members", members.map { it.toJson() })
    }
}

/** One documented package: its name in language.json and its public symbols. */
class SurfacePackage(val name: String, val symbols: List<Node>) {
    fun toJson(): Any = linkedMapOf("name" to name, "symbols" to symbols.map { it.toJson() })
}

/** Writes maps, lists, strings and booleans as JSON with two-space indentation and a final newline. */
object Json {
    fun write(value: Any?): String = StringBuilder().also { writeValue(it, value, "") }.append('\n').toString()

    private fun writeValue(out: StringBuilder, value: Any?, indent: String) {
        when (value) {
            null -> out.append("null")
            is Boolean -> out.append(value)
            is String -> string(out, value)
            is Map<*, *> -> block(out, value.entries.toList(), "{", "}", indent) { entry, inner ->
                string(out, entry.key as String)
                out.append(": ")
                writeValue(out, entry.value, inner)
            }
            is List<*> -> block(out, value, "[", "]", indent) { item, inner -> writeValue(out, item, inner) }
            else -> throw IllegalArgumentException("can't write ${value::class.java.name} as JSON")
        }
    }

    private fun <T> block(
        out: StringBuilder,
        items: List<T>,
        open: String,
        close: String,
        indent: String,
        item: (T, String) -> Unit,
    ) {
        if (items.isEmpty()) {
            out.append(open).append(close)
            return
        }
        val inner = "$indent  "
        out.append(open).append('\n')
        items.forEachIndexed { index, value ->
            out.append(inner)
            item(value, inner)
            out.append(if (index == items.lastIndex) "\n" else ",\n")
        }
        out.append(indent).append(close)
    }

    private fun string(out: StringBuilder, value: String) {
        out.append('"')
        for (char in value) {
            when (char) {
                '"' -> out.append("\\\"")
                '\\' -> out.append("\\\\")
                '\n' -> out.append("\\n")
                '\r' -> out.append("\\r")
                '\t' -> out.append("\\t")
                else -> if (char < ' ' || char == '\u2028' || char == '\u2029') {
                    out.append("\\u").append(char.code.toString(16).padStart(4, '0'))
                } else {
                    out.append(char)
                }
            }
        }
        out.append('"')
    }
}
