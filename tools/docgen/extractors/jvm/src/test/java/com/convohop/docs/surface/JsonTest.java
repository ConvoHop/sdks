package com.convohop.docs.surface;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class JsonTest {
  @Test
  void writesNodesInTheSurfaceFormat() {
    Node member = new Node("SIZE", "property");
    member.signatures.add("public static final int SIZE = 1");
    member.isStatic = true;
    member.inherited = "Base";
    Node symbol = new Node("Box", "class");
    symbol.signatures.add("public class Box");
    symbol.docs = "Says \"hi\"\\\n\tthen\u0001.";
    symbol.deprecated = "";
    symbol.members.add(member);
    assertEquals("{\"name\":\"Box\",\"kind\":\"class\",\"signatures\":[\"public class Box\"],"
        + "\"docs\":\"Says \\\"hi\\\"\\\\\\n\\tthen\\u0001.\",\"deprecated\":\"\",\"members\":[{\"name\":\"SIZE\","
        + "\"kind\":\"property\",\"signatures\":[\"public static final int SIZE = 1\"],\"docs\":\"\",\"static\":true,"
        + "\"inherited\":\"Base\"}]}", Json.write(symbol.toJson()));
  }

  @Test
  void leavesOutWhatANodeDoesntHave() {
    assertEquals("{\"name\":\"run\",\"kind\":\"function\",\"signatures\":[],\"docs\":\"\"}",
        Json.write(new Node("run", "function").toJson()));
  }
}
