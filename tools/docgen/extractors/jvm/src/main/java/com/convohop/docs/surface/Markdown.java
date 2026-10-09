package com.convohop.docs.surface;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Builds the Markdown the surface format holds (docs/docs-pipeline.md). */
final class Markdown {
  private static final String ESCAPED = "\\`*_[]<>{}~";
  private static final String BLOCK_STARTS = "#>+-=|~";
  private static final Pattern ENTITY = Pattern.compile("&(?:[A-Za-z][A-Za-z0-9]*|#[0-9]+|#[xX][0-9A-Fa-f]+);");
  private static final Pattern ORDERED_ITEM = Pattern.compile("(\\d+)([.)])");
  private static final Pattern WHITESPACE = Pattern.compile("\\s+");

  private Markdown() {}

  /** Escapes prose so Markdown shows it as written, wherever it sits on a line. */
  static String escape(String text) {
    StringBuilder out = new StringBuilder(text.length());
    Matcher entity = ENTITY.matcher(text);
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      if (ESCAPED.indexOf(c) >= 0 || (c == '&' && entity.region(i, text.length()).lookingAt())) out.append('\\');
      out.append(c);
    }
    return out.toString();
  }

  /** Escapes the start of a paragraph that Markdown would read as a heading, quote, list, table or fence. */
  static String escapeParagraphStart(String paragraph) {
    if (paragraph.isEmpty()) return paragraph;
    if (BLOCK_STARTS.indexOf(paragraph.charAt(0)) >= 0) return "\\" + paragraph;
    Matcher item = ORDERED_ITEM.matcher(paragraph);
    if (item.lookingAt()) return item.group(1) + "\\" + item.group(2) + paragraph.substring(item.end());
    return paragraph;
  }

  /** A code span that holds {@code code}, which may contain backticks; tools/docgen/lib/markdown.mjs#codeSpan. */
  static String codeSpan(String code) {
    if (code.indexOf('\n') >= 0) throw new IllegalArgumentException("code spans can't span lines: " + code);
    int longest = 0;
    int run = 0;
    for (int i = 0; i < code.length(); i++) {
      run = code.charAt(i) == '`' ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    String ticks = "`".repeat(longest + 1);
    String pad = code.startsWith("`") || code.endsWith("`") ? " " : "";
    return ticks + pad + code + pad + ticks;
  }

  /** Collapses each run of whitespace, line breaks included, to one space. */
  static String collapse(String text) {
    return WHITESPACE.matcher(text).replaceAll(" ");
  }
}
