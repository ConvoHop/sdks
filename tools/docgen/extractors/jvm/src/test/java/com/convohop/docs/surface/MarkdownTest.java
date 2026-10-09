package com.convohop.docs.surface;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class MarkdownTest {
  @Test
  void escapesMarkupAndAmpersandsThatStartEntities() {
    assertEquals("a \\* b \\_c\\_ \\`d\\` \\[e\\] \\<f\\> \\{g\\} \\~h \\\\ i", Markdown.escape("a * b _c_ `d` [e] <f> {g} ~h \\ i"));
    assertEquals("Tom & Jerry \\&amp; \\&#38; \\&#x26; &", Markdown.escape("Tom & Jerry &amp; &#38; &#x26; &"));
  }

  @Test
  void escapesParagraphStartsThatMarkdownReadsAsBlocks() {
    assertEquals("\\# Not a heading", Markdown.escapeParagraphStart("# Not a heading"));
    assertEquals("\\> Not a quote", Markdown.escapeParagraphStart("> Not a quote"));
    assertEquals("\\- Not a list", Markdown.escapeParagraphStart("- Not a list"));
    assertEquals("\\+ Not a list", Markdown.escapeParagraphStart("+ Not a list"));
    assertEquals("\\= Not a heading underline", Markdown.escapeParagraphStart("= Not a heading underline"));
    assertEquals("\\| Not a table", Markdown.escapeParagraphStart("| Not a table"));
    assertEquals("\\~~~ Not a fence", Markdown.escapeParagraphStart("~~~ Not a fence"));
    assertEquals("12\\. Not a list", Markdown.escapeParagraphStart("12. Not a list"));
    assertEquals("3\\) Not a list", Markdown.escapeParagraphStart("3) Not a list"));
    assertEquals("Version 1. Plain", Markdown.escapeParagraphStart("Version 1. Plain"));
    assertEquals("", Markdown.escapeParagraphStart(""));
  }

  @Test
  void codeSpansHoldBackticks() {
    assertEquals("`a`", Markdown.codeSpan("a"));
    assertEquals("``a`b``", Markdown.codeSpan("a`b"));
    assertEquals("``` `a``b ```", Markdown.codeSpan("`a``b"));
    assertThrows(IllegalArgumentException.class, () -> Markdown.codeSpan("a\nb"));
  }

  @Test
  void collapsesEachRunOfWhitespace() {
    assertEquals(" a b c ", Markdown.collapse(" a \n\t b  c\n"));
  }
}
