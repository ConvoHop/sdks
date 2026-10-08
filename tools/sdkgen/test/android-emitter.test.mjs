import test from "node:test";
import assert from "node:assert/strict";
import android, { DIRECTORY, kdoc, kotlinIdentifier, kotlinString, renderKotlin } from "../emitters/android.mjs";
import { EmitterError, renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { fixtureSources } from "./helpers.mjs";

const FILES = ["Codec.kt", "Scalars.kt", "Enums.kt", "Objects.kt", "Inputs.kt", "Operations.kt", "Protocol.kt", "ErrorCodes.kt"];

const edge = () => buildIr(fixtureSources());

/** Renders the edge IR after `mutate(ir, typeNamed)` edits a copy. */
function render(mutate = () => {}) {
  const ir = edge();
  mutate(ir, name => ir.types.find(type => type.name === name) ?? assert.fail(`no type ${name}`));
  return renderKotlin(ir);
}

/** Renames a type and every reference to it. */
function renameType(ir, from, to) {
  const walk = value => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      if (value.name === from && (typeof value.kind === "string")) value.name = to;
      Object.values(value).forEach(walk);
    }
  };
  walk(ir.types);
  walk(ir.operations.map(operation => [operation.arguments, operation.result]));
}

const rejects = (mutate, message) => assert.throws(() => render(mutate), new EmitterError(`android: ${message}`));

test("kotlinString escapes quotes, templates, control and non-ASCII characters", () => {
  assert.equal(kotlinString("plain"), "\"plain\"");
  assert.equal(kotlinString("a\"b\\c$d{e}"), "\"a\\\"b\\\\c\\$d{e}\"");
  assert.equal(kotlinString("\n\r\t\u0001\u007f"), "\"\\n\\r\\t\\u0001\\u007f\"");
  assert.equal(kotlinString("é😀"), "\"\\u00e9\\ud83d\\ude00\"");
});

test("kotlinIdentifier backticks hard keywords and rejects unusable names", () => {
  assert.equal(kotlinIdentifier("value", "x"), "value");
  assert.equal(kotlinIdentifier("object", "x"), "`object`");
  assert.equal(kotlinIdentifier("in", "x"), "`in`");
  assert.throws(() => kotlinIdentifier("__", "Item.__"), new EmitterError('android: Item.__: "__" is not a usable Kotlin name'));
  assert.throws(() => kotlinIdentifier("a-b", "Item.a-b"), new EmitterError('android: Item.a-b: "a-b" is not a usable Kotlin name'));
});

test("kdoc breaks nested comment markers, normalizes line breaks and trims trailing space", () => {
  assert.equal(kdoc(""), "");
  assert.equal(kdoc("One line."), "/** One line. */\n");
  assert.equal(kdoc("Ends */ and opens /* here.", "    "), "    /** Ends *\\/ and opens /\\* here. */\n");
  assert.equal(kdoc("First.  \r\n\r\nThird.\rFourth."), "/**\n * First.\n *\n * Third.\n * Fourth.\n */\n");
});

test("the emitter owns its directory, takes no options and writes one file per concern", () => {
  assert.equal(android.name, "android");
  assert.deepEqual(android.owns, [DIRECTORY]);
  const files = renderEmitters(edge(), [android]);
  assert.deepEqual(files.map(file => file.path), FILES.map(name => `${DIRECTORY}/${name}`));
  for (const file of files) {
    assert.match(file.contents, /^\/\/ Generated from the current unversioned GraphQL schemas\. Run npm run generate:graphql\.\npackage com\.convohop\.android\.generated\n/);
    assert.ok(file.contents.endsWith("\n") && !file.contents.endsWith("\n\n"), file.path);
    assert.doesNotMatch(file.contents, /[ \t]+$/m, file.path);
  }
  assert.throws(() => renderEmitters(edge(), [android], { options: { android: { directory: "elsewhere" } } }),
    new EmitterError("android: unknown option(s) directory"));
});

test("only client operations and the types they reach are generated", () => {
  const files = render();
  const operations = files["Operations.kt"];
  for (const id of ["alpha.capabilities", "alpha.resolveRequest", "alpha.items", "alpha.events", "alpha.fetchHTTPStatus", "alpha.ping", "alpha.eventStream"]) {
    assert.match(operations, new RegExp(`id = "${id.replace(".", "\\.")}"`), id);
  }
  for (const id of ["alpha.job", "alpha.startJob", "alpha.redeem", "beta.capabilities", "beta.widgets", "beta.createWidget"]) {
    assert.doesNotMatch(operations, new RegExp(`id = "${id.replace(".", "\\.")}"`), id);
  }
  assert.doesNotMatch(operations, /object Beta/);
  const declarations = Object.values(files).join("\n");
  for (const name of ["Widget", "WidgetState", "Ratio", "CreateWidgetInput"]) assert.doesNotMatch(declarations, new RegExp(`\\b${name}\\b`), name);
  assert.match(operations, /public val fetchHTTPStatus: OperationSpec<FetchInput\?, Int\?> =/);
  assert.match(operations, /public val capabilities: OperationSpec<Unit, Capabilities> =/);
  assert.match(operations, /\{ _ -> null \},/);
});

test("documents and descriptions cannot break out of Kotlin strings or comments", () => {
  const files = render();
  assert.match(files["Operations.kt"], /document = "query AlphaCapabilities\(\\\$context: ContextInput!\) \{\\n/);
  assert.match(files["Scalars.kt"], /a closing comment marker \*\\\/ stays escaped\./);
  assert.match(files["Scalars.kt"], /Regex\("\^\(0\|\[1-9\]\[0-9\]\*\)\\\$"\)/);
  assert.match(files["Codec.kt"], /Regex\("-\?\(0\|\[1-9\]\[0-9\]\*\)\(\\\\\.\[0-9\]\+\)\?/);
});

test("keyword field names are backticked in declarations but not in JSON names", () => {
  const files = render((_, type) => {
    type("Receipt").fields.find(field => field.name === "committed").name = "object";
  });
  assert.match(files["Objects.kt"], /public val `object`: Boolean,/);
  assert.match(files["Objects.kt"], /"object" to JsonPrimitive\(this\.`object`\),/);
  assert.match(files["Objects.kt"], /`object` = obj\.field\("object", path\)\.asBoolean\("\$\{path\}\.object"\),/);
});

test("credential fields are redacted from the generated toString", () => {
  assert.doesNotMatch(Object.values(render()).join("\n"), /override fun toString/);
  const files = render((_, type) => {
    type("Capabilities").fields.find(field => field.name === "wssUrl").name = "sessionToken";
    type("ContextInput").fields.find(field => field.name === "permit").name = "deliveryToken";
  });
  assert.match(files["Objects.kt"],
    /override fun toString\(\): String =\n {8}"Capabilities\(" \+\n {8}"version=\$\{this\.version\}, " \+\n {8}"sessionToken=<redacted>, " \+\n {8}"features=\$\{this\.features\}\)"\n\}/);
  assert.match(files["Inputs.kt"], /"ContextInput\(" \+[\s\S]*"deliveryToken=<redacted>, " \+/);
  assert.doesNotMatch(files["Objects.kt"], /"Receipt\(/);
});

test("names that would shadow generated declarations or collide on case are rejected", () => {
  rejects(ir => renameType(ir, "Receipt", "Scalars"), "type Scalars would shadow a name the generated code uses");
  rejects(ir => renameType(ir, "Receipt", "object"), "type object would shadow a name the generated code uses");
  rejects(ir => renameType(ir, "Receipt", "ITEM"), "type Item collides with ITEM on case-insensitive file systems");
  rejects(ir => renameType(ir, "Receipt", "OPERATIONS"), "type OPERATIONS collides with Operations on case-insensitive file systems");
  rejects(ir => renameType(ir, "Receipt", "Alpha"), "plane alpha maps to Operations.Alpha, which would shadow a type");
  rejects((_, type) => { type("Item").fields[0].name = "toJson"; }, "Item.toJson would shadow a name the generated code uses");
  rejects((_, type) => { type("Item").fields[0].name = "component1"; }, "Item.component1 would shadow a name the generated code uses");
  rejects((_, type) => { type("Item").fields[0].name = "Receipt"; }, "Item.Receipt would shadow a name the generated code uses");
  rejects((_, type) => { type("Fruit").values[0].name = "name"; }, "Fruit.name would shadow an enum member");
  rejects(ir => { ir.operations.find(operation => operation.id === "alpha.ping").field = "all"; }, "alpha.ping: field all would shadow a name the generated code uses");
  rejects(ir => { ir.realtime.channels[0].name = "events"; }, "realtime channel events would shadow Realtime.events");
  rejects(ir => { ir.errors.codes[0].name = "notFound"; }, 'error code "notFound" is not SCREAMING_SNAKE_CASE');
});

test("recursive outputs, unsupported kinds and unknown constraints are rejected", () => {
  rejects((_, type) => { type("Item").fields.push({ name: "page", type: { kind: "object", name: "ItemPage", nullable: true } }); },
    "recursive output types are not supported: Item -> ItemPage -> Item");
  rejects((_, type) => { type("Receipt").kind = "interface"; }, "alpha.resolveRequest: interface Receipt is not supported");
  rejects((_, type) => { type("Counter").constraints.bogus = 1; }, "scalar Counter has unsupported constraint(s) bogus");
  rejects((_, type) => { type("Counter").constraints.maximumDecimal = 1000; }, "scalar Counter: maximumDecimal must be a decimal string");
  rejects((_, type) => { type("PageSize").constraints.maximum = 2 ** 31; }, "scalar PageSize: maximum must fit a Kotlin Int");
  for (const pattern of ["[0-9]+", "^[0-9]+", "[0-9]+$", "^[0-9]+\\$"]) {
    rejects((_, type) => { type("Counter").constraints.pattern = pattern; }, "scalar Counter: pattern must be anchored with ^ and $");
  }
});
