package com.convohop.docs.surface;

import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * The overloads of one member or function name. They share one docs entry, from the documented overload with the
 * most parameters, and are deprecated only when every overload is.
 */
class Overloads {
  final String name;
  final String kind;
  final boolean isStatic;
  /** The symbol name of the base type that declares these members, or null. */
  final @Nullable String inherited;
  final List<String> signatures = new ArrayList<>();
  /** The members of the type an accessor returns, listed under the accessor. */
  final List<Node> nested = new ArrayList<>();
  Doc doc = Doc.EMPTY;
  private int documentedParameters = -1;
  private boolean deprecated = true;
  private @Nullable String deprecation;

  Overloads(String name, String kind, boolean isStatic, @Nullable String inherited) {
    this.name = name;
    this.kind = kind;
    this.isStatic = isStatic;
    this.inherited = inherited;
  }

  /**
   * Adds an overload.
   *
   * @param deprecated whether the overload is deprecated; its note is {@code doc.deprecated()}
   * @param parameters how many parameters the overload takes
   */
  void add(String signature, Doc doc, boolean deprecated, int parameters) {
    signatures.add(signature);
    if (!doc.text().isEmpty() && parameters > documentedParameters) {
      this.doc = new Doc(doc.text(), null);
      documentedParameters = parameters;
    }
    if (!deprecated) this.deprecated = false;
    else if (deprecation == null || deprecation.isEmpty()) deprecation = JavaSurface.orEmpty(doc.deprecated());
  }

  Node toNode() {
    Node node = new Node(name, kind);
    node.signatures.addAll(signatures);
    node.docs = doc.text();
    node.deprecated = deprecated && !signatures.isEmpty() ? JavaSurface.orEmpty(deprecation) : null;
    node.isStatic = isStatic;
    node.inherited = inherited;
    node.members.addAll(nested);
    return node;
  }
}
