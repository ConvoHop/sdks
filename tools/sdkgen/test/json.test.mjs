import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, formatJson, isPlainObject, own } from "../lib/json.mjs";

test("formatJson keeps values that fit on one line and preserves key order", () => {
  assert.equal(formatJson({ b: 1, a: [true, null, "x"] }), '{"b": 1, "a": [true, null, "x"]}\n');
  assert.equal(formatJson(["ab"], { width: 6 }), '["ab"]\n');
  assert.equal(formatJson(["ab"], { width: 5 }), '[\n  "ab"\n]\n');
});

test("formatJson expands nested values with two-space indentation and accounts for key prefixes", () => {
  assert.equal(formatJson({ list: ["aaaa", "bbbb"] }, { width: 10 }), '{\n  "list": [\n    "aaaa",\n    "bbbb"\n  ]\n}\n');
  const long = "x".repeat(120);
  assert.equal(formatJson({ a: [], b: {}, c: long }), `{\n  "a": [],\n  "b": {},\n  "c": "${long}"\n}\n`);
  assert.equal(formatJson({ abcdef: [], ghijkl: {} }, { width: 4 }), '{\n  "abcdef": [],\n  "ghijkl": {}\n}\n');
});

test("formatJson rejects values that JSON cannot represent instead of dropping them", () => {
  assert.throws(() => formatJson({ a: undefined }), { name: "TypeError", message: "Cannot serialize undefined as JSON" });
  assert.throws(() => formatJson([() => 1]), { name: "TypeError", message: "Cannot serialize function as JSON" });
  assert.throws(() => formatJson(undefined), TypeError);
  assert.throws(() => formatJson({ big: 1n }), TypeError);
});

test("own reads own properties only", () => {
  assert.equal(own({}, "constructor"), undefined);
  assert.equal(own({}, "toString"), undefined);
  assert.equal(own({ constructor: 1 }, "constructor"), 1);
  assert.equal(own(JSON.parse('{"__proto__": 5}'), "__proto__"), 5);
  assert.equal(own([1], "length"), undefined);
  assert.equal(own(null, "x"), undefined);
  assert.equal(own("text", "length"), undefined);
});

test("isPlainObject and canonicalJson", () => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject("x"), false);
  assert.equal(canonicalJson({ b: [1, { d: 1, c: 2 }], a: null }), '{"a":null,"b":[1,{"c":2,"d":1}]}');
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
});
