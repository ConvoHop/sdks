package com.convohop.docs.android

/**
 * Converts KDoc comments to the surface's Markdown. KDoc is Markdown already, so this removes the comment syntax,
 * turns `[Name]` links into code spans (`[label][Name]` into a code span of the label) and turns `@param`,
 * `@return`, `@throws` and `@see` into paragraphs after the description. Code blocks fail, since nothing tests
 * them, and other tags fail rather than being dropped.
 */
object KDoc {
    private val TAG = Regex("""^@([A-Za-z]+)(?:\s+(.*))?$""")
    private val FENCE = Regex("""^\s*(```|~~~)""")
    private val NAMED = Regex("""^\[?([\w.$]+)]?(?:\s+([\s\S]*))?$""")

    private class Tag(val name: String, val line: Int, val lines: MutableList<String>)

    /** Converts [comment], the whole text of a doc comment that starts on [firstLine] of [file]. */
    fun convert(comment: String, file: String, firstLine: Int): String {
        require(comment.startsWith("/**") && comment.endsWith("*/")) { "not a KDoc comment: $comment" }
        val description = mutableListOf<String>()
        val tags = mutableListOf<Tag>()
        var afterBlank = true
        comment.substring(3, comment.length - 2).split('\n').forEachIndexed { index, raw ->
            val line = content(raw, index == 0)
            val place = "$file:${firstLine + index}"
            if (FENCE.containsMatchIn(line) || (afterBlank && (line.startsWith("    ") || line.startsWith("\t")))) {
                throw ExtractionException(
                    "$place: KDoc code blocks aren't tested; put example code in a tested quickstart snippet",
                )
            }
            afterBlank = line.isEmpty()
            val tag = TAG.matchEntire(line)
            when {
                tag != null -> tags += Tag(tag.groupValues[1], firstLine + index, mutableListOf(tag.groupValues[2]))
                tags.isNotEmpty() -> tags.last().lines += line.trimStart()
                else -> description += line
            }
        }
        val blocks = mutableListOf(markdown(description.joinToString("\n")))
        val parameters = mutableListOf<String>()
        for (tag in tags) {
            val body = tag.lines.joinToString("\n").trim()
            when (tag.name) {
                "param" -> parameters += "- " + named(body, tag, file, ": ")
                "return" -> blocks += "Returns: " + markdown(body).ifEmpty { fail(tag, file, "needs a description") }
                "throws", "exception" -> blocks += "Throws: " + named(body, tag, file, " ")
                "see" -> blocks += "See " + named(body, tag, file, " ")
                else -> fail(tag, file, "isn't supported; say it in the description")
            }
        }
        if (parameters.isNotEmpty()) blocks.add(1, "Parameters:\n\n" + parameters.joinToString("\n"))
        return join(blocks)
    }

    /** Paragraphs separated by blank lines, without empty ones. */
    fun join(blocks: List<String>): String = blocks.filter { it.isNotEmpty() }.joinToString("\n\n")

    /** A code span of [text], with a fence longer than any backtick run inside it. */
    fun codeSpan(text: String): String {
        val longest = Regex("`+").findAll(text).maxOfOrNull { it.value.length } ?: 0
        val fence = "`".repeat(longest + 1)
        val pad = if (text.startsWith("`") || text.endsWith("`")) " " else ""
        return "$fence$pad$text$pad$fence"
    }

    /** One comment line without the leading `*` and the space after it, or the rest of the opening line if [first]. */
    private fun content(raw: String, first: Boolean): String {
        val trimmed = raw.trimStart()
        val line = when {
            first -> trimmed
            trimmed.startsWith("*") -> trimmed.substring(1).let { if (it.startsWith(" ")) it.substring(1) else it }
            else -> trimmed
        }
        return line.trimEnd()
    }

    private fun fail(tag: Tag, file: String, problem: String): Nothing =
        throw ExtractionException("$file:${tag.line}: @${tag.name} $problem")

    /** A tag body that starts with a name, optionally in brackets: the name as code, then any description. */
    private fun named(body: String, tag: Tag, file: String, separator: String): String {
        val match = NAMED.matchEntire(body) ?: fail(tag, file, "needs a name first")
        val description = markdown(match.groupValues[2])
        return codeSpan(match.groupValues[1]) + if (description.isEmpty()) "" else separator + description
    }

    /** Trimmed Markdown with KDoc links as code spans. Code spans and escaped brackets stay as they are. */
    fun markdown(raw: String): String {
        val text = raw.trim()
        val out = StringBuilder()
        var i = 0
        while (i < text.length) {
            when (text[i]) {
                '`' -> {
                    val run = run(text, i)
                    val close = closingRun(text, i + run, run)
                    val end = if (close < 0) i + run else close + run
                    out.append(text, i, end)
                    i = end
                }
                '\\' -> {
                    val end = minOf(i + 2, text.length)
                    out.append(text, i, end)
                    i = end
                }
                '[' -> {
                    val link = link(text, i)
                    if (link == null) {
                        out.append('[')
                        i++
                    } else {
                        out.append(codeSpan(link.first))
                        i = link.second
                    }
                }
                else -> out.append(text[i++])
            }
        }
        return out.toString()
    }

    /** The label of a `[Name]` or `[label][Name]` link at [start] and the index after it, or null. */
    private fun link(text: String, start: Int): Pair<String, Int>? {
        val label = bracketed(text, start) ?: return null
        var end = start + label.length + 2
        if (text.getOrNull(end) == '[') {
            val target = bracketed(text, end) ?: return null
            end += target.length + 2
        }
        // A Markdown link, or a reference definition, which only a paragraph can start with.
        if (text.getOrNull(end) == '(' || text.getOrNull(end) == '[') return null
        if (text.getOrNull(end) == ':' && startsParagraph(text, start)) return null
        return label.trim() to end
    }

    /** Whether [index] starts a paragraph: after at most three spaces, on the first line or after a blank line. */
    private fun startsParagraph(text: String, index: Int): Boolean {
        val lineStart = text.lastIndexOf('\n', index - 1) + 1
        if (index - lineStart > 3 || (lineStart until index).any { text[it] != ' ' }) return false
        if (lineStart == 0) return true
        return text.substring(text.lastIndexOf('\n', lineStart - 2) + 1, lineStart - 1).isBlank()
    }

    /** The text between the `[` at [start] and the next `]`, if it is one non-empty line without brackets. */
    private fun bracketed(text: String, start: Int): String? {
        val end = text.indexOf(']', start + 1)
        if (end <= start + 1) return null
        val inner = text.substring(start + 1, end)
        return if (inner.any { it == '[' || it == '\n' } || inner.isBlank()) null else inner
    }

    private fun run(text: String, start: Int): Int {
        var end = start
        while (end < text.length && text[end] == '`') end++
        return end - start
    }

    /** Where the next run of exactly [length] backticks at or after [from] starts, or -1. */
    private fun closingRun(text: String, from: Int, length: Int): Int {
        var i = from
        while (i < text.length) {
            if (text[i] != '`') {
                i++
                continue
            }
            val run = run(text, i)
            if (run == length) return i
            i += run
        }
        return -1
    }
}
