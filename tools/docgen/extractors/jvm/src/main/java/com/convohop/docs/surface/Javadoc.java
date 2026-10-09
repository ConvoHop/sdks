package com.convohop.docs.surface;

import com.sun.source.doctree.BlockTagTree;
import com.sun.source.doctree.DeprecatedTree;
import com.sun.source.doctree.DocCommentTree;
import com.sun.source.doctree.DocTree;
import com.sun.source.doctree.EndElementTree;
import com.sun.source.doctree.EntityTree;
import com.sun.source.doctree.ErroneousTree;
import com.sun.source.doctree.InlineTagTree;
import com.sun.source.doctree.LinkTree;
import com.sun.source.doctree.LiteralTree;
import com.sun.source.doctree.ParamTree;
import com.sun.source.doctree.ReferenceTree;
import com.sun.source.doctree.ReturnTree;
import com.sun.source.doctree.SeeTree;
import com.sun.source.doctree.StartElementTree;
import com.sun.source.doctree.TextTree;
import com.sun.source.doctree.ThrowsTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.util.DocTrees;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Converts Javadoc to the Markdown the surface format holds, laid out like the TypeScript extractor's JSDoc: the
 * description, then {@code Parameters:}, {@code Returns:}, {@code Throws:} and {@code See} paragraphs. It accepts the
 * markup the SDK uses and fails on the rest rather than dropping it.
 */
final class Javadoc {
  static final String UNSUPPORTED = "document it in prose, or put example code in a tested quickstart snippet";
  private static final Pattern PACKAGE_PREFIX = Pattern.compile("\\b[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)*\\.(?=[A-Z])");

  private final DocTrees trees;
  private final CompilationUnitTree unit;
  private final DocCommentTree comment;

  private Javadoc(DocTrees trees, CompilationUnitTree unit, DocCommentTree comment) {
    this.trees = trees;
    this.unit = unit;
    this.comment = comment;
  }

  /** Converts {@code comment}, which may be null, from {@code unit}. */
  static Doc convert(DocTrees trees, CompilationUnitTree unit, DocCommentTree comment) {
    return comment == null ? Doc.EMPTY : new Javadoc(trees, unit, comment).convert();
  }

  /** How docs name a program element: {@code com.example.Foo#bar(java.lang.String)} becomes {@code Foo.bar(String)}. */
  static String display(String reference) {
    String shown = PACKAGE_PREFIX.matcher(reference).replaceAll("");
    if (shown.startsWith("#")) shown = shown.substring(1);
    return shown.replace('#', '.');
  }

  /** An error at {@code position} in {@code unit}, as {@code path:line: message}. */
  static ExtractionException failure(CompilationUnitTree unit, long position, String message) {
    String file = Sources.display(Path.of(unit.getSourceFile().toUri()));
    String line = position < 0 ? "" : ":" + unit.getLineMap().getLineNumber(position);
    return new ExtractionException(file + line + ": " + message);
  }

  private Doc convert() {
    List<String> blocks = new ArrayList<>(paragraphs(comment.getFullBody(), true));
    List<String> parameters = new ArrayList<>();
    List<String> extra = new ArrayList<>();
    String deprecated = null;
    for (DocTree tag : comment.getBlockTags()) {
      switch (tag.getKind()) {
        case PARAM -> {
          ParamTree param = (ParamTree) tag;
          String name = param.getName().getName().toString();
          String description = single(param.getDescription());
          parameters.add("- " + Markdown.codeSpan(param.isTypeParameter() ? "<" + name + ">" : name)
              + (description.isEmpty() ? "" : ": " + description));
        }
        case RETURN -> extra.add(("Returns: " + single(((ReturnTree) tag).getDescription())).strip());
        case THROWS, EXCEPTION -> {
          ThrowsTree thrown = (ThrowsTree) tag;
          String description = single(thrown.getDescription());
          extra.add("Throws: " + Markdown.codeSpan(display(thrown.getExceptionName().getSignature()))
              + (description.isEmpty() ? "" : " " + description));
        }
        case SEE -> extra.add("See " + see((SeeTree) tag));
        case DEPRECATED -> deprecated = String.join("\n\n", paragraphs(((DeprecatedTree) tag).getBody(), true));
        default -> throw fail(tag, "unsupported Javadoc tag @" + ((BlockTagTree) tag).getTagName() + "; " + UNSUPPORTED);
      }
    }
    if (!parameters.isEmpty()) extra.add(0, "Parameters:\n\n" + String.join("\n", parameters));
    blocks.addAll(extra);
    return new Doc(String.join("\n\n", blocks), deprecated);
  }

  private String see(SeeTree tag) {
    List<? extends DocTree> parts = tag.getReference();
    if (parts.isEmpty() || parts.get(0).getKind() != DocTree.Kind.REFERENCE) {
      throw fail(tag, "@see takes a class or member reference; link other targets in prose");
    }
    String label = Markdown.collapse(plain(parts.subList(1, parts.size()))).strip();
    return Markdown.codeSpan(label.isEmpty() ? display(((ReferenceTree) parts.get(0)).getSignature()) : label);
  }

  /** A block tag's description, which must be a single paragraph. */
  private String single(List<? extends DocTree> body) {
    List<String> paragraphs = paragraphs(body, false);
    return paragraphs.isEmpty() ? "" : paragraphs.get(0);
  }

  private List<String> paragraphs(List<? extends DocTree> body, boolean blocks) {
    Paragraphs paragraphs = new Paragraphs(blocks);
    for (DocTree node : body) paragraphs.add(node);
    return paragraphs.finish();
  }

  /** The text of a link label, which holds only text, entities and code. */
  private String plain(List<? extends DocTree> label) {
    StringBuilder text = new StringBuilder();
    for (DocTree node : label) {
      switch (node.getKind()) {
        case TEXT -> text.append(((TextTree) node).getBody());
        case ENTITY -> text.append(entity((EntityTree) node));
        case CODE, LITERAL -> text.append(((LiteralTree) node).getBody().getBody());
        default -> throw fail(node, "unsupported " + describe(node) + " in a link label");
      }
    }
    return text.toString();
  }

  private String linkLabel(LinkTree link) {
    String label = Markdown.collapse(plain(link.getLabel())).strip();
    return label.isEmpty() ? display(link.getReference().getSignature()) : label;
  }

  private String entity(EntityTree node) {
    String name = node.getName().toString();
    switch (name) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return "\"";
      case "apos":
        return "'";
      default:
        break;
    }
    try {
      int codePoint = -1;
      if (name.startsWith("#x") || name.startsWith("#X")) codePoint = Integer.parseInt(name.substring(2), 16);
      else if (name.startsWith("#")) codePoint = Integer.parseInt(name.substring(1));
      if (Character.isValidCodePoint(codePoint)) return new String(Character.toChars(codePoint));
    } catch (NumberFormatException e) {
      // Reported below.
    }
    throw fail(node, "unsupported HTML entity &" + name + "; write the character itself");
  }

  private static String describe(DocTree node) {
    if (node instanceof InlineTagTree tag) return "Javadoc tag {@" + tag.getTagName() + "}";
    if (node instanceof StartElementTree element) return "HTML element <" + element.getName() + ">";
    if (node instanceof EndElementTree element) return "HTML end tag </" + element.getName() + ">";
    return "Javadoc " + node.getKind().name().toLowerCase(Locale.ROOT).replace('_', ' ');
  }

  private ExtractionException fail(DocTree node, String message) {
    long position = trees.getSourcePositions().getStartPosition(unit, comment, node);
    if (position < 0) position = trees.getSourcePositions().getStartPosition(unit, comment, comment);
    return failure(unit, position, message);
  }

  /** Collects Markdown paragraphs. Prose collapses its whitespace, like HTML; code becomes code spans. */
  private final class Paragraphs {
    private final boolean blocks;
    private final List<String> done = new ArrayList<>();
    private final StringBuilder paragraph = new StringBuilder();
    private final StringBuilder text = new StringBuilder();
    /** The text of the open {@code <code>} element, or null. */
    private StringBuilder code;
    private DocTree codeStart;

    Paragraphs(boolean blocks) {
      this.blocks = blocks;
    }

    void add(DocTree node) {
      if (code != null) {
        addCode(node);
        return;
      }
      switch (node.getKind()) {
        case TEXT -> text.append(((TextTree) node).getBody());
        case ENTITY -> text.append(entity((EntityTree) node));
        case LITERAL -> text.append(((LiteralTree) node).getBody().getBody());
        case CODE -> code(((LiteralTree) node).getBody().getBody());
        case LINK -> code(linkLabel((LinkTree) node));
        case LINK_PLAIN -> {
          LinkTree link = (LinkTree) node;
          if (link.getLabel().isEmpty()) code(display(link.getReference().getSignature()));
          else text.append(plain(link.getLabel()));
        }
        case START_ELEMENT -> start((StartElementTree) node);
        case END_ELEMENT -> end((EndElementTree) node);
        case COMMENT -> {}
        case ERRONEOUS -> throw fail(node, "malformed Javadoc: "
            + ((ErroneousTree) node).getDiagnostic().getMessage(Locale.ROOT));
        default -> throw fail(node, "unsupported " + describe(node) + "; " + UNSUPPORTED);
      }
    }

    private void start(StartElementTree element) {
      String name = element.getName().toString().toLowerCase(Locale.ROOT);
      if (!name.equals("p") && !name.equals("code")) {
        throw fail(element, "unsupported HTML element <" + name + ">; use {@code ...} for code and <p> between paragraphs, or "
            + UNSUPPORTED);
      }
      if (!element.getAttributes().isEmpty()) throw fail(element, "unsupported attributes on <" + name + ">");
      if (name.equals("p")) {
        paragraphBreak(element);
      } else if (element.isSelfClosing()) {
        throw fail(element, "empty <code/> element");
      } else {
        flushText();
        code = new StringBuilder();
        codeStart = element;
      }
    }

    private void end(EndElementTree element) {
      String name = element.getName().toString().toLowerCase(Locale.ROOT);
      if (name.equals("p")) paragraphBreak(element);
      else throw fail(element, "unexpected </" + name + ">");
    }

    private void addCode(DocTree node) {
      switch (node.getKind()) {
        case TEXT -> code.append(((TextTree) node).getBody());
        case ENTITY -> code.append(entity((EntityTree) node));
        case CODE, LITERAL -> code.append(((LiteralTree) node).getBody().getBody());
        case LINK, LINK_PLAIN -> code.append(linkLabel((LinkTree) node));
        case END_ELEMENT -> {
          if (!((EndElementTree) node).getName().toString().equalsIgnoreCase("code")) {
            throw fail(node, "unsupported " + describe(node) + " inside <code>");
          }
          String content = code.toString();
          code = null;
          code(content);
        }
        default -> throw fail(node, "unsupported " + describe(node) + " inside <code>");
      }
    }

    private void paragraphBreak(DocTree node) {
      if (!blocks) throw fail(node, "a block tag's description must be one paragraph; move the rest to the main description");
      endParagraph();
    }

    private void code(String raw) {
      flushText();
      String content = Markdown.collapse(raw).strip();
      if (!content.isEmpty()) paragraph.append(Markdown.codeSpan(content));
    }

    private void flushText() {
      if (text.length() == 0) return;
      paragraph.append(Markdown.escape(Markdown.collapse(text.toString())));
      text.setLength(0);
    }

    private void endParagraph() {
      if (code != null) throw fail(codeStart, "unclosed <code>");
      flushText();
      String finished = paragraph.toString().strip();
      paragraph.setLength(0);
      if (!finished.isEmpty()) done.add(blocks ? Markdown.escapeParagraphStart(finished) : finished);
    }

    List<String> finish() {
      endParagraph();
      return done;
    }
  }
}
