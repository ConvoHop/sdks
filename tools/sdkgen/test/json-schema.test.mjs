import test from "node:test";
import assert from "node:assert/strict";
import { createValidator, formatValidationErrors, SchemaCompileError } from "../lib/json-schema.mjs";

const validate = (schema, value) => createValidator(schema)(value);
const compileError = (schema, message) => assert.throws(() => createValidator(schema, { label: "s.json" }), { name: "Error", message });

test("compiling rejects unsupported keywords and malformed keyword values", () => {
  assert.ok(new SchemaCompileError("x") instanceof Error);
  assert.throws(() => createValidator({ format: "email" }), SchemaCompileError);
  compileError([], "s.json #: schema must be an object or boolean");
  compileError({ format: "email" }, "s.json #/format: unsupported JSON Schema keyword");
  compileError({ multipleOf: 2 }, "s.json #/multipleOf: unsupported JSON Schema keyword");
  compileError({ properties: { "a/b": { contains: {} } } }, "s.json #/properties/a~1b/contains: unsupported JSON Schema keyword");
  compileError({ $defs: { x: { unevaluatedProperties: false } } }, "s.json #/$defs/x/unevaluatedProperties: unsupported JSON Schema keyword");
  compileError({ items: { anyOf: [{ format: "uri" }] } }, "s.json #/items/anyOf/0/format: unsupported JSON Schema keyword");
  compileError({ allOf: [] }, "s.json #/allOf: must be a non-empty array");
  compileError({ properties: [] }, "s.json #/properties: must be an object");
  compileError({ $ref: "other.json#/x" }, 's.json #/$ref: only local "#/..." references are supported (got "other.json#/x")');
  compileError({ $ref: "#/$defs/missing", $defs: {} }, "s.json #/$ref: unresolved reference #/$defs/missing");
  compileError({ $ref: "#/constructor" }, "s.json #/$ref: unresolved reference #/constructor");
  compileError({ pattern: 7 }, "s.json #/pattern: pattern must be a string");
  assert.throws(() => createValidator({ pattern: "(" }, { label: "s.json" }), { message: /^s\.json #\/pattern: invalid pattern: / });
  assert.throws(() => createValidator({ patternProperties: { "[": {} } }, { label: "s.json" }), { message: /^s\.json #\/patternProperties: invalid pattern: / });
  compileError({ type: [] }, "s.json #/type: must name at least one type");
  compileError({ type: "float" }, 's.json #/type: unknown type "float"');
  compileError({ minLength: -1 }, "s.json #/minLength: must be a non-negative integer");
  compileError({ maxItems: 1.5 }, "s.json #/maxItems: must be a non-negative integer");
  compileError({ minimum: "1" }, "s.json #/minimum: must be a number");
  compileError({ uniqueItems: "yes" }, "s.json #/uniqueItems: must be a boolean");
  compileError({ enum: [] }, "s.json #/enum: must be a non-empty array");
  compileError({ required: [1] }, "s.json #/required: must be an array of strings");
  compileError({ dependentRequired: { a: "b" } }, "s.json #/dependentRequired: must map property names to arrays of strings");
});

test("compiling accepts annotation keywords, boolean schemas and escaped local references", () => {
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema", $comment: "c", title: "t", description: "d", default: 1, examples: [1],
    deprecated: false, readOnly: true, writeOnly: false,
    $defs: { "a/b": { type: "string" }, "t~x": true },
    properties: { slash: { $ref: "#/$defs/a~1b" }, tilde: { $ref: "#/$defs/t~0x" }, never: false },
  };
  const check = createValidator(schema);
  assert.deepEqual(check({ slash: "x", tilde: 1 }), []);
  assert.deepEqual(check({ slash: 1, never: 0 }), [
    { path: "/slash", message: "must be string (got integer)" },
    { path: "/never", message: "is not allowed here" },
  ]);
});

test("type, const and enum", () => {
  assert.deepEqual(validate({ type: "integer" }, 1.5), [{ path: "", message: "must be integer (got number)" }]);
  assert.deepEqual(validate({ type: "number" }, 2), []);
  assert.deepEqual(validate({ type: ["string", "null"] }, 1), [{ path: "", message: "must be string or null (got integer)" }]);
  assert.deepEqual(validate({ type: "object" }, []), [{ path: "", message: "must be object (got array)" }]);
  assert.deepEqual(validate({ const: { a: 1, b: 2 } }, { b: 2, a: 1 }), []);
  assert.deepEqual(validate({ const: { a: 1, b: 2 } }, { a: 1 }), [{ path: "", message: 'must equal {"a":1,"b":2}' }]);
  assert.deepEqual(validate({ enum: ["a", 1, null] }, "b"), [{ path: "", message: 'must be one of "a", 1, null (got "b")' }]);
  const many = Array.from({ length: 17 }, (_, index) => `v${index}`);
  const [error] = validate({ enum: many }, "x".repeat(80));
  assert.equal(error.message, `must be one of ${many.slice(0, 16).map(item => JSON.stringify(item)).join(", ")}, ... (got "${"x".repeat(56)}...)`);
});

test("string, number and array keywords", () => {
  assert.deepEqual(validate({ maxLength: 1 }, "😀"), [], "lengths count code points");
  assert.deepEqual(validate({ minLength: 2, maxLength: 3 }, "a"), [{ path: "", message: "must have at least 2 characters" }]);
  assert.deepEqual(validate({ maxLength: 3 }, "abcd"), [{ path: "", message: "must have at most 3 characters" }]);
  assert.deepEqual(validate({ pattern: "^.$" }, "😀"), [], "patterns use the unicode flag");
  assert.deepEqual(validate({ pattern: "^a+$" }, "b"), [{ path: "", message: 'must match pattern ^a+$ (got "b")' }]);
  assert.deepEqual(validate({ minimum: 1, maximum: 3 }, 0), [{ path: "", message: "must be >= 1" }]);
  assert.deepEqual(validate({ maximum: 3 }, 4), [{ path: "", message: "must be <= 3" }]);
  assert.deepEqual(validate({ exclusiveMinimum: 1 }, 1), [{ path: "", message: "must be > 1" }]);
  assert.deepEqual(validate({ exclusiveMaximum: 1 }, 1), [{ path: "", message: "must be < 1" }]);
  assert.deepEqual(validate({ minItems: 1 }, []), [{ path: "", message: "must have at least 1 items" }]);
  assert.deepEqual(validate({ maxItems: 1 }, [1, 2]), [{ path: "", message: "must have at most 1 items" }]);
  assert.deepEqual(validate({ uniqueItems: true }, [{ a: 1, b: 2 }, 3, { b: 2, a: 1 }]), [{ path: "/2", message: "duplicates item 0" }]);
  assert.deepEqual(validate({ prefixItems: [{ type: "string" }], items: { type: "integer" } }, [1, 2, "x"]), [
    { path: "/0", message: "must be string (got integer)" },
    { path: "/2", message: "must be integer (got string)" },
  ]);
  assert.deepEqual(validate({ prefixItems: [{ type: "string" }, { type: "string" }] }, ["x"]), []);
  assert.deepEqual(validate({ minLength: 5, minimum: 5, minItems: 5 }, true), [], "keywords only apply to their own instance type");
});

test("object keywords, including prototype-named properties and pointer escaping", () => {
  const closed = { type: "object", properties: { constructor: { type: "string" } }, additionalProperties: false };
  assert.deepEqual(validate(closed, {}), []);
  assert.deepEqual(validate(closed, { constructor: 1 }), [{ path: "/constructor", message: "must be string (got integer)" }]);
  assert.deepEqual(validate(closed, JSON.parse('{"__proto__": 1, "toString": 2}')), [
    { path: "", message: 'has unknown property "__proto__"' },
    { path: "", message: 'has unknown property "toString"' },
  ]);
  assert.deepEqual(validate({ required: ["constructor", "a"] }, { a: 1 }), [{ path: "", message: 'missing required property "constructor"' }]);
  assert.deepEqual(validate({ minProperties: 1 }, {}), [{ path: "", message: "must have at least 1 properties" }]);
  assert.deepEqual(validate({ maxProperties: 1 }, { a: 1, b: 2 }), [{ path: "", message: "must have at most 1 properties" }]);
  assert.deepEqual(validate({ dependentRequired: { a: ["b", "c"] } }, { a: 1, c: 1 }), [{ path: "", message: 'property "a" requires "b"' }]);
  assert.deepEqual(validate({ dependentRequired: { a: ["b"] } }, { b: 1 }), []);
  assert.deepEqual(validate({ patternProperties: { "^x": { type: "integer" } }, additionalProperties: { type: "string" } }, { x1: "a", y: 1, "a/b~c": 2 }), [
    { path: "/x1", message: "must be integer (got string)" },
    { path: "/y", message: "must be string (got integer)" },
    { path: "/a~1b~0c", message: "must be string (got integer)" },
  ]);
  assert.deepEqual(validate({ propertyNames: { pattern: "^[a-z]+$" } }, { ok: 1, Bad: 2 }), [
    { path: "/Bad", message: 'property name must match pattern ^[a-z]+$ (got "Bad")' },
  ]);
  const tree = { type: "object", properties: { name: { type: "string" }, child: { $ref: "#" } }, additionalProperties: false };
  assert.deepEqual(validate(tree, { name: "a", child: { name: "b", child: { name: 3 } } }), [{ path: "/child/child/name", message: "must be string (got integer)" }]);
});

test("combinators report the closest failing branch", () => {
  const anyOf = { anyOf: [{ type: "string", minLength: 3 }, { type: "integer" }] };
  assert.deepEqual(validate(anyOf, 1), []);
  assert.deepEqual(validate(anyOf, "ab"), [{ path: "", message: "must have at least 3 characters" }]);
  const oneOf = { oneOf: [{ type: "integer" }, { minimum: 0 }] };
  assert.deepEqual(validate(oneOf, -1), []);
  assert.deepEqual(validate(oneOf, 1), [{ path: "", message: "must match exactly one oneOf branch (matched 2)" }]);
  assert.deepEqual(validate(oneOf, -1.5), [{ path: "", message: "must be integer (got number)" }]);
  assert.deepEqual(validate({ allOf: [{ minimum: 1 }, { maximum: 0 }] }, 2), [{ path: "", message: "must be <= 0" }]);
  assert.deepEqual(validate({ not: { const: "x" } }, "x"), [{ path: "", message: "must not match the excluded schema" }]);
  assert.deepEqual(validate({ not: { const: "x" } }, "y"), []);
  const conditional = { if: { required: ["kind"] }, then: { required: ["value"] }, else: { maxProperties: 0 } };
  assert.deepEqual(validate(conditional, { kind: 1 }), [{ path: "", message: 'missing required property "value"' }]);
  assert.deepEqual(validate(conditional, { other: 1 }), [{ path: "", message: "must have at most 0 properties" }]);
  assert.deepEqual(validate(conditional, { kind: 1, value: 2 }), []);
  const overlapping = { required: ["value"], allOf: [{ if: { required: ["kind"] }, then: { required: ["value"] } }] };
  assert.deepEqual(validate(overlapping, { kind: 1 }), [{ path: "", message: 'missing required property "value"' }]);
});

test("formatValidationErrors prints JSON Pointers and caps long reports", () => {
  const errors = [{ path: "", message: "a" }, { path: "/x/0", message: "b" }, { path: "/y", message: "c" }];
  assert.equal(formatValidationErrors(errors), "  /: a\n  /x/0: b\n  /y: c");
  assert.equal(formatValidationErrors(errors, { limit: 2 }), "  /: a\n  /x/0: b\n  ... 1 more");
  assert.equal(formatValidationErrors([]), "");
});
