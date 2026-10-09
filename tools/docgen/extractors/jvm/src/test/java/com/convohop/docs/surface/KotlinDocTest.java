package com.convohop.docs.surface;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class KotlinDocTest {
  /** Converts a comment of {@code lines} that starts on line 10 of F.kt. */
  private static Doc convert(String... lines) {
    return KotlinDoc.convert(String.join("\n", lines), "F.kt", 10);
  }

  private static String failure(String... lines) {
    return assertThrows(ExtractionException.class, () -> convert(lines)).getMessage();
  }

  @Test
  void linksBecomeCodeSpans() {
    Doc doc = convert(
        "/**",
        " * Sends [Message] to [Conversation.members].",
        " *",
        " * See [the docs](https://example.com) and [label][Target].",
        " * Keeps `[Code]` and \\[escaped].",
        " */");
    assertEquals("Sends `Message` to `Conversation.members`.\n\n"
        + "See [the docs](https://example.com) and `label`.\nKeeps `[Code]` and \\[escaped].", doc.text());
    assertNull(doc.deprecated());
  }

  @Test
  void oneLineComments() {
    assertEquals("Sends `text`.", convert("/** Sends [text]. */").text());
  }

  @Test
  void tagsBecomeParagraphsAfterTheDescription() {
    Doc doc = convert(
        "/**",
        " * Sends a message.",
        " *",
        " * @param [text] the text, as [String],",
        " *     sent as is",
        " * @param count",
        " * @return the [Message] ID",
        " * @throws IllegalStateException when closed",
        " * @exception java.io.IOException",
        " * @see Other for more",
        " */");
    assertEquals(String.join("\n",
        "Sends a message.",
        "",
        "Parameters:",
        "",
        "- `text`: the text, as `String`,",
        "    sent as is",
        "- `count`",
        "",
        "Returns: the `Message` ID",
        "",
        "Throws: `IllegalStateException` when closed",
        "",
        "Throws: `java.io.IOException`",
        "",
        "See `Other` for more"), doc.text());
  }

  @Test
  void rejectsCodeBlocks() {
    String fence = failure("/**", " * Example:", " *", " * ```kotlin", " * send()", " * ```", " */");
    assertEquals("F.kt:13: KDoc code blocks aren't tested; put example code in a tested quickstart snippet", fence);
    String indented = failure("/**", " * Example:", " *", " *     send()", " */");
    assertEquals("F.kt:13: KDoc code blocks aren't tested; put example code in a tested quickstart snippet", indented);
  }

  @Test
  void rejectsTagsItCantShow() {
    assertEquals("F.kt:12: unsupported KDoc tag @sample; document it in prose, or put example code in a tested quickstart snippet",
        failure("/**", " * Sends.", " * @sample com.example.send", " */"));
    assertEquals("F.kt:11: @param needs a name first", failure("/**", " * @param", " */"));
  }
}
