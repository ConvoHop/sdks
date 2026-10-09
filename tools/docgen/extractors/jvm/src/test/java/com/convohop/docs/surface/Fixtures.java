package com.convohop.docs.surface;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** Helpers for tests that extract fixture sources. */
final class Fixtures {
  private Fixtures() {}

  /** Writes {@code text} to {@code root/relative}, creating its directories. */
  static Path write(Path root, String relative, String text) throws IOException {
    Path file = root.resolve(relative);
    Files.createDirectories(file.getParent());
    Files.writeString(file, text, StandardCharsets.UTF_8);
    return file;
  }

  /** The names of {@code nodes} in order, with {@code static } before static members. */
  static List<String> names(List<Node> nodes) {
    List<String> names = new ArrayList<>();
    for (Node node : nodes) names.add(node.isStatic ? "static " + node.name : node.name);
    return names;
  }

  static Node symbol(List<Node> symbols, String name) {
    return find(symbols, name, false);
  }

  static Node member(Node symbol, String name) {
    return find(symbol.members, name, false);
  }

  static Node staticMember(Node symbol, String name) {
    return find(symbol.members, name, true);
  }

  private static Node find(List<Node> nodes, String name, boolean isStatic) {
    for (Node node : nodes) {
      if (node.name.equals(name) && node.isStatic == isStatic) return node;
    }
    throw new AssertionError("no " + (isStatic ? "static " : "") + name + " in " + names(nodes));
  }
}
