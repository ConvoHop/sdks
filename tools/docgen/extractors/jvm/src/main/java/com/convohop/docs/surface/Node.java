package com.convohop.docs.surface;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A symbol or member in the docs pipeline's surface format (spec/docs/surface.schema.json). */
final class Node {
  final String name;
  final String kind;
  final List<String> signatures = new ArrayList<>();
  final List<Node> members = new ArrayList<>();
  String docs = "";
  /** The deprecation note as Markdown, possibly empty; null when the declaration isn't deprecated. */
  String deprecated;
  boolean isStatic;
  /** The symbol name of the base type that declares an inherited member. */
  String inherited;

  Node(String name, String kind) {
    this.name = name;
    this.kind = kind;
  }

  /** The JSON value, with fields in the order the TypeScript extractor prints them. */
  Map<String, Object> toJson() {
    Map<String, Object> json = new LinkedHashMap<>();
    json.put("name", name);
    json.put("kind", kind);
    json.put("signatures", List.copyOf(signatures));
    json.put("docs", docs);
    if (deprecated != null) json.put("deprecated", deprecated);
    if (isStatic) json.put("static", true);
    if (inherited != null) json.put("inherited", inherited);
    if (!members.isEmpty()) {
      List<Object> children = new ArrayList<>();
      for (Node member : members) children.add(member.toJson());
      json.put("members", children);
    }
    return json;
  }
}
