package com.convohop.docs.surface;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converts KDoc, which is Markdown already, the way the TypeScript extractor converts JSDoc: {@code [Name]} links
 * become code spans, as {@code [label][Name]} links become a code span of their label, and {@code @param},
 * {@code @return}, {@code @throws} and {@code @see} become paragraphs after the description. Code blocks fail, since
 * nothing tests them; other tags fail rather than being dropped.
 */
final class KotlinDoc {
  private static final Pattern LINE_PREFIX = Pattern.compile("^\\s*\\*(?: |(?=\\S)|$)");
  private static final Pattern TAG = Pattern.compile("^\\s*@([A-Za-z]+)(?:\\s+(.*))?$");
  private static final Pattern FENCE = Pattern.compile("^\\s*(?:```|~~~)");
  /** A line that Markdown reads as an indented code block when a blank line comes before it. */
  private static final Pattern INDENTED = Pattern.compile("^(?: {4}|\\t)");
  private static final Pattern NAMED = Pattern.compile("^\\[?([\\w.$]+)]?(?:\\s+([\\s\\S]*))?$");
  private static final Pattern CODE_SPAN = Pattern.compile("(`+)[\\s\\S]*?\\1");
  /** {@code [Name]} or {@code [label][Name]}, but not a Markdown link, reference definition or escaped bracket. */
  private static final Pattern LINK = Pattern.compile("(?<![\\]\\\\])\\[([^\\[\\]\\n]+)](?:\\[[^\\[\\]\\n]+])?(?![(\\[:])");

  private KotlinDoc() {}

  private record Tag(String name, int line, List<String> lines) {}

  /**
   * Converts the KDoc comment {@code raw}.
   *
   * @param file where the comment is, for errors
   * @param firstLine the line the comment starts on
   */
  static Doc convert(String raw, String file, int firstLine) {
    String[] lines = raw.substring(3, raw.length() - 2).split("\n", -1);
    List<String> description = new ArrayList<>();
    List<Tag> tags = new ArrayList<>();
    boolean afterBlank = true;
    for (int i = 0; i < lines.length; i++) {
      // The first line is what follows the opening /** on its line.
      String line = LINE_PREFIX.matcher(i == 0 ? lines[i].stripLeading() : lines[i]).replaceFirst("").stripTrailing();
      if (FENCE.matcher(line).lookingAt() || (afterBlank && INDENTED.matcher(line).lookingAt())) {
        throw new ExtractionException(file + ":" + (firstLine + i) + ": KDoc code blocks aren't tested; put example code in a"
            + " tested quickstart snippet");
      }
      afterBlank = line.isEmpty();
      Matcher tag = TAG.matcher(line);
      if (tag.matches()) {
        List<String> body = new ArrayList<>();
        body.add(tag.group(2) == null ? "" : tag.group(2));
        tags.add(new Tag(tag.group(1), firstLine + i, body));
      } else if (!tags.isEmpty()) {
        tags.get(tags.size() - 1).lines().add(line);
      } else {
        description.add(line);
      }
    }
    List<String> blocks = new ArrayList<>();
    blocks.add(markdown(String.join("\n", description)));
    List<String> parameters = new ArrayList<>();
    for (Tag tag : tags) {
      String body = String.join("\n", tag.lines()).strip();
      switch (tag.name()) {
        case "param" -> parameters.add("- " + named(body, tag, file, ": "));
        case "return" -> blocks.add(("Returns: " + markdown(body)).strip());
        case "throws", "exception" -> blocks.add("Throws: " + named(body, tag, file, " "));
        case "see" -> blocks.add("See " + named(body, tag, file, " "));
        default -> throw new ExtractionException(file + ":" + tag.line() + ": unsupported KDoc tag @" + tag.name() + "; "
            + Javadoc.UNSUPPORTED);
      }
    }
    if (!parameters.isEmpty()) blocks.add(1, "Parameters:\n\n" + String.join("\n", parameters));
    return new Doc(JavaSurface.join(blocks.toArray(new String[0])), null);
  }

  /** A tag body that starts with a name, optionally in brackets: the name as code, then any description. */
  private static String named(String body, Tag tag, String file, String separator) {
    Matcher named = NAMED.matcher(body);
    if (!named.matches()) throw new ExtractionException(file + ":" + tag.line() + ": @" + tag.name() + " needs a name first");
    String description = named.group(2) == null ? "" : markdown(named.group(2));
    return Markdown.codeSpan(named.group(1)) + (description.isEmpty() ? "" : separator + description);
  }

  /** Markdown, trimmed, with KDoc links as code spans. */
  private static String markdown(String raw) {
    String text = raw.strip();
    StringBuilder out = new StringBuilder();
    Matcher code = CODE_SPAN.matcher(text);
    int last = 0;
    while (code.find()) {
      out.append(links(text.substring(last, code.start()))).append(code.group());
      last = code.end();
    }
    return out.append(links(text.substring(last))).toString();
  }

  private static String links(String text) {
    Matcher link = LINK.matcher(text);
    StringBuilder out = new StringBuilder();
    while (link.find()) link.appendReplacement(out, Matcher.quoteReplacement(Markdown.codeSpan(link.group(1).strip())));
    return link.appendTail(out).toString();
  }
}
