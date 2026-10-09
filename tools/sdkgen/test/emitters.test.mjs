import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import config from "../sdkgen.config.mjs";
import { EmitterError, listEmittableFiles, renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { formatJson } from "../lib/json.mjs";
import { codeUnitCompare } from "../lib/naming.mjs";
import { javaIdentifier, javaPattern, javaString, kotlinIdentifier, kotlinString, renderJava, scalarMapping, serverTypeNames } from "../emitters/java.mjs";
import { coreOperationCatalog, operationTypeNames, renderErrorCodes, scalarTsType } from "../emitters/typescript.mjs";
import { operationCatalog } from "../lib/ir-model.mjs";
import { REPO_ROOT, assertGoldenTree, fixtureSources, repoSources } from "./helpers.mjs";

const render = sources => renderEmitters(buildIr(sources), config.emitters, { options: config.options });

test("the edge fixture renders to the golden files", () => {
  // golden/edge/packages/core/src/generated/graphql-types.ts was verified byte-identical to
  // @graphql-codegen/cli 7.4.3 with typescript-operations 6.1.7 before those packages were removed.
  assertGoldenTree("edge", render(fixtureSources()));
});

test("the committed generated files match a fresh render of the repository schemas", () => {
  const files = render(repoSources());
  assert.deepEqual(files.map(file => file.emitter).filter((name, i, all) => all.indexOf(name) === i), config.emitters.map(emitter => emitter.name));
  for (const file of files) {
    assert.equal(readFileSync(join(REPO_ROOT, file.path), "utf8"), file.contents, `${file.path} is stale. Run npm run generate:graphql.`);
  }
  for (const directory of config.emitters.flatMap(emitter => emitter.owns)) {
    const expected = files.filter(file => file.path.startsWith(`${directory}/`)).map(file => file.path).sort(codeUnitCompare);
    assert.deepEqual(listEmittableFiles(REPO_ROOT, directory), expected, `${directory} has stale files. Run npm run generate:graphql.`);
  }
});

test("the ir and graphql-operations emitters publish the IR, the documents and the runtime catalog", () => {
  const ir = buildIr(fixtureSources());
  const files = Object.fromEntries(render(fixtureSources()).map(file => [file.path, file.contents]));
  assert.equal(files["schema/ir.json"], formatJson(ir));
  assert.equal(files["schema/operations.graphql"], `${ir.operations.map(operation => operation.document.text).join("\n\n")}\n`);
  const catalog = JSON.parse(files["schema/operations.json"]).operations;
  assert.deepEqual(Object.keys(catalog), ir.operations.map(operation => operation.id));
  assert.deepEqual(catalog["alpha.fetchHTTPStatus"], {
    plane: "alpha", kind: "query", field: "fetchHTTPStatus", operationName: "AlphaFetchHTTPStatus",
    query: ir.operations.find(operation => operation.id === "alpha.fetchHTTPStatus").document.text, resultType: "Int", inputFields: ["method"],
  });
});

test("TypeScript names and scalar types follow the graphql-codegen conventions the packages rely on", () => {
  const names = (operationName, kind) => operationTypeNames({ id: "x", operationName, kind });
  assert.deepEqual(names("AlphaFetchHTTPStatus", "query"), { result: "AlphaFetchHttpStatusQuery", variables: "AlphaFetchHttpStatusQueryVariables" });
  assert.deepEqual(names("BetaCreateWidget", "mutation"), { result: "BetaCreateWidgetMutation", variables: "BetaCreateWidgetMutationVariables" });
  assert.deepEqual(names("AlphaEventStream", "subscription"), { result: "AlphaEventStreamSubscription", variables: "AlphaEventStreamSubscriptionVariables" });
  assert.throws(() => names("AlphaX", "fragment"), new EmitterError('typescript: x has unsupported kind "fragment"'));

  const scalar = (name, representation, builtIn = false) => ({ name, representation, builtIn });
  assert.equal(scalarTsType(scalar("ID", "string", true), "input"), "string | number");
  assert.equal(scalarTsType(scalar("ID", "string", true), "output"), "string");
  assert.equal(scalarTsType(scalar("ID", "string"), "input"), "string", "only the built-in ID accepts numbers");
  assert.deepEqual(["string", "integer", "number", "boolean", "object"].map(representation => scalarTsType(scalar("S", representation), "output")),
    ["string", "number", "number", "boolean", "Record<string, unknown>"]);
  assert.throws(() => scalarTsType(scalar("Big", "bigint"), "output"), new EmitterError('typescript: scalar Big has unsupported representation "bigint"'));
});

test("the core TypeScript catalog adds each operation's idempotency class to the published catalog", () => {
  const ir = buildIr(fixtureSources());
  const published = operationCatalog(ir), core = coreOperationCatalog(ir);
  assert.deepEqual(Object.keys(core), Object.keys(published));
  for (const operation of ir.operations) {
    const { idempotency, ...entry } = core[operation.id];
    assert.equal(idempotency, operation.idempotency);
    assert.deepEqual(entry, published[operation.id]);
  }
  assert.ok(ir.operations.some(operation => operation.idempotency === "ephemeral"), "the fixture covers ephemeral operations");
  assert.ok(Object.values(published).every(entry => !("idempotency" in entry)), "schema/operations.json is unchanged");
});

test("the TypeScript error-code table keeps each code's origin, status and retryability, and rejects codes it can't render", () => {
  const ir = buildIr(fixtureSources());
  const table = renderErrorCodes(ir);
  assert.match(table, /^  \/\*\* Temporarily unavailable\. \*\/\n  UNAVAILABLE: \{ origin: "server", status: 503, retryable: true \},$/m);
  assert.match(table, /^  TRANSPORT_UNKNOWN: \{ origin: "sdk", retryable: true \},$/m, "a code without a status omits it");
  const code = { name: "GOOD", summary: "ok", origin: "both", status: 400, retryable: false };
  const rejects = (override, message) => assert.throws(() => renderErrorCodes({ errors: { codes: [{ ...code, ...override }] } }),
    new EmitterError(`typescript: ${message}`));
  rejects({ name: "bad-name" }, 'error code "bad-name" is not SCREAMING_SNAKE_CASE');
  rejects({ origin: "client" }, 'error code GOOD has unsupported origin "client"');
  rejects({ status: 4.5 }, "error code GOOD has a non-integer status");
  rejects({ retryable: "yes" }, "error code GOOD has no boolean retryable");
});

const USAGE = `import type * as Generated from "./graphql-types.js";
import { errorCodes, type ErrorCodeDefinition } from "./errors.js";
import { operationCatalog, outputShapes, type OperationTypes } from "./operations.js";

type Variables<K extends keyof OperationTypes> = OperationTypes[K]["variables"];
type Result<K extends keyof OperationTypes> = OperationTypes[K]["result"];

export const ping: Variables<"alpha.ping"> = { context: { requestId: "r1" } };
export const items: Variables<"alpha.items"> = { context: { requestId: 7, tags: null }, input: { fruits: ["APPLE", "apple10"], limit: null } };
export const create: Variables<"beta.createWidget"> = { context: { requestId: "r2" }, input: { label: "x" } };
// @ts-expect-error a required input argument cannot be omitted
export const missingInput: Variables<"alpha.items"> = { context: { requestId: "r3" } };
// @ts-expect-error input fields without a default are required
export const missingLabel: Variables<"beta.createWidget"> = { context: { requestId: "r4" }, input: {} };
// @ts-expect-error variables are exact
export const extra: Variables<"alpha.ping"> = { context: { requestId: "r5" }, other: 1 };
// @ts-expect-error enum values are exact
export const fruit: Generated.Fruit = "apple";

declare const job: Result<"alpha.job">;
export const state: string | undefined = job.job?.state;
// @ts-expect-error nullable results must be narrowed
export const unchecked: string = job.job.state;
declare const events: Result<"alpha.events">;
export const sequence: string = events.events.items[0]?.sequence ?? "0";
// @ts-expect-error counters are canonical decimal strings, never numbers
export const numeric: number = events.events.items[0]!.sequence;

export const query: string = operationCatalog["alpha.items"].query;
export const inputFields: readonly string[] = operationCatalog["beta.widgets"].inputFields;
export const idempotency: string = operationCatalog["beta.widgets"].idempotency;
export const shape = outputShapes["Fruit"]?.kind;
// @ts-expect-error unknown operation keys are rejected
export const unknownOperation = operationCatalog["alpha.missing"];
export const unavailable: ErrorCodeDefinition | undefined = errorCodes["UNAVAILABLE"];
export const retryable: boolean | undefined = errorCodes["SOME_FUTURE_CODE"]?.retryable;
// @ts-expect-error the table is read-only
errorCodes["UNAVAILABLE"] = { origin: "server", retryable: false };
`;

test("the generated TypeScript type-checks under strict compiler settings", t => {
  const root = mkdtempSync(join(tmpdir(), "sdkgen-tsc-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of render(fixtureSources()).filter(entry => entry.emitter === "typescript")) writeFileSync(join(root, basename(file.path)), file.contents);
  writeFileSync(join(root, "usage.ts"), USAGE);
  writeFileSync(join(root, "package.json"), '{ "type": "module" }\n');
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true, noImplicitOverride: true, types: [], noEmit: true,
    },
    include: ["*.ts"],
  }));
  const result = spawnSync(process.execPath, [join(REPO_ROOT, "node_modules/typescript/bin/tsc"), "-p", root], { encoding: "utf8" });
  assert.equal(result.status, 0, `tsc failed:\n${result.stdout}${result.stderr}`);
});

test("Java and Kotlin literals and names keep schema text from ending a literal or becoming code", () => {
  assert.equal(javaString('a"b\\c\n\t\u0001\u007f é \u2028 \\u0022'), '"a\\"b\\\\c\\n\\t\\001\\177 \\u00e9 \\u2028 \\\\u0022"');
  assert.equal(kotlinString('$x "q" \\ \n\u0001'), '"\\$x \\"q\\" \\\\ \\n\\u0001"');
  assert.deepEqual(["class", "hashCode", "label"].map(javaIdentifier), ["class_", "hashCode_", "label"]);
  assert.deepEqual(["object", "value"].map(kotlinIdentifier), ["`object`", "value"]);
});

test("Java scalar patterns are translated only where java.util.regex and JavaScript agree", () => {
  assert.equal(javaPattern("^[0-9a-f]{8}-[0-9a-f]{4}$"), "^[0-9a-f]{8}-[0-9a-f]{4}\\z", "$ never matches before a final line terminator");
  assert.equal(javaPattern("^(0|[1-9][0-9]*)$"), "^(0|[1-9][0-9]*)\\z");
  assert.equal(javaPattern("^\\d+\\.[\\-_a-z]?$"), "^\\d+\\.[\\-_a-z]?\\z");
  const unsupported = [
    [".", "."], ["(?:a)", "a (? group"], ["\\s", "the escape \\s"], ["\\", "the escape \\"], ["é", '"é"'], ["[é]", "non-ASCII text"],
    ["[a&&b]", "& inside a character class"], ["[[a]]", "[ inside a character class"], ["[]a]", "an empty character class"],
    ["[a", "an unterminated character class"],
  ];
  for (const [pattern, detail] of unsupported) {
    assert.throws(() => javaPattern(pattern),
      new EmitterError(`java: scalar pattern ${JSON.stringify(pattern)} uses ${detail}, which the Java emitter does not translate`));
  }
});

test("Java scalar types follow the representation, and integers are Integer only when both bounds fit 32 bits", () => {
  const scalar = (representation, constraints) => ({ name: "SampleValue", representation, constraints, builtIn: false });
  const mapping = (representation, constraints) => {
    const { java, kotlin, decoder, factory } = scalarMapping(scalar(representation, constraints));
    assert.equal(decoder, "Scalars.SAMPLE_VALUE");
    return [java, kotlin, factory];
  };
  assert.deepEqual(scalarMapping({ name: "Int", representation: "integer", builtIn: true }), { java: "Integer", kotlin: "Int", decoder: "Wire.INT", factory: null });
  assert.deepEqual(mapping("integer", { minimum: 1, maximum: 100 }), ["Integer", "Int", "Wire.integer(1L, 100L)"]);
  assert.deepEqual(mapping("integer", { minimum: 0 }), ["Long", "Long", "Wire.longInteger(0L, null)"]);
  assert.deepEqual(mapping("integer", { minimum: 0, maximum: 2 ** 31 }), ["Long", "Long", "Wire.longInteger(0L, 2147483648L)"]);
  assert.deepEqual(mapping("number", { minimum: 0, maximum: 1.5 }), ["Double", "Double", "Wire.number(0.0, 1.5)"]);
  assert.deepEqual(mapping("boolean", {}), ["Boolean", "Boolean", "Wire.BOOLEAN"]);
  assert.deepEqual(mapping("string", { pattern: "^[a-z]+$", maximumDecimal: "99", disallowed: ["00"] }),
    ["String", "String", 'Wire.string("^[a-z]+\\\\z", "99", List.of("00"))']);
  assert.deepEqual(mapping("object", { maxCanonicalJsonBytes: 4096, requiredStringProperties: ["kind"] }),
    ["Map<String, @Nullable Object>", "Map<String, Any?>", 'Wire.objectScalar(4096, List.of("kind"))']);
  assert.throws(() => scalarMapping(scalar("bigint", {})), new EmitterError('java: scalar SampleValue has unsupported representation "bigint"'));
  assert.throws(() => scalarMapping(scalar("integer", { pattern: "x" })), new EmitterError("java: scalar SampleValue has unsupported integer constraint pattern"));
  assert.throws(() => scalarMapping({ name: "Upload", builtIn: true }), new EmitterError("java: unsupported built-in scalar Upload"));
  assert.throws(() => scalarMapping(scalar("integer", { maximum: 2 ** 53 })), new EmitterError("java: constraint 9007199254740992 is not a safe integer"));
});

test("the Java emitter rejects schema type names that would shadow the names its output uses", () => {
  const renamed = name => JSON.parse(JSON.stringify(buildIr(fixtureSources())).replaceAll('"Widget"', JSON.stringify(name)));
  for (const name of ["Wire", "Builder", "BetaApi"]) {
    assert.throws(() => renderJava(renamed(name)), new EmitterError(`java: type ${name} would shadow a name the generated Java uses; rename it or extend the emitter`));
  }
  const withFields = (...names) => {
    const ir = buildIr(fixtureSources());
    const widget = ir.types.find(type => type.name === "Widget");
    widget.fields.push(...names.map(name => ({ ...widget.fields[0], name })));
    return ir;
  };
  assert.throws(() => renderJava(withFields("default", "default_")), new EmitterError("java: Widget.default_ collides with another field's Java name"));
  assert.throws(() => renderJava(withFields("class")), new EmitterError("java: Widget.class collides with a generated method"));

  const helper = buildIr(fixtureSources());
  const operation = helper.operations.find(entry => entry.layer === "server");
  operation.field = "interruptible";
  assert.throws(() => renderJava(helper),
    new EmitterError(`java: ${operation.id} would shadow the Kotlin interruptible helper; rename it or extend the emitter`));
});

test("the Java emitter renders deprecated enum values and input fields, and leaves client-only types out", () => {
  const base = buildIr(fixtureSources());
  const ir = structuredClone(base);
  for (const operation of ir.operations) if (["alpha.items", "alpha.events", "alpha.ping"].includes(operation.id)) operation.layer = "server";
  const added = [...serverTypeNames(ir)].filter(name => !serverTypeNames(base).has(name));
  assert.deepEqual(added.sort(codeUnitCompare),
    ["Box_3dInput", "Event", "EventPage", "EventPayload", "EventsInput", "Fruit", "Item", "ItemPage", "ItemsInput", "PageSize", "PingInput", "SubjectRef"]);
  assert.ok(!render(fixtureSources()).some(file => file.path.endsWith("/model/Fruit.java")), "client-only types are not generated");

  const files = Object.fromEntries(renderJava(ir).map(file => [basename(file.path), file.contents]));
  assert.match(files["Fruit.java"], /\n {2}APPLE10\("apple10"\),\n {2}APPLE9\("apple9"\),\n/, "enum values keep schema order and wire values");
  assert.match(files["Fruit.java"], /\n {3}\* @deprecated Use APPLE\.\n {3}\*\/\n {2}@Deprecated\n {2}ELDER\("ELDER"\);\n/);
  assert.match(files["ItemsInput.java"], /\* @deprecated Use fruits\.\n {3}\*\/\n {2}@Deprecated\n {2}public @Nullable String getLegacyFilter\(\) \{/);
  assert.match(files["Scalars.java"], /public static final Wire\.Decoder<Integer> PAGE_SIZE =\n {6}Wire\.integer\(1L, 50L\);/);
  assert.match(files["AlphaApi.java"], /\n {2}public ItemPage items\(ItemsInput input\) \{/);
  assert.match(files["AlphaApi.java"], /\n {2}public Boolean ping\(@Nullable PingInput input\) \{/);
  assert.match(files["AlphaSuspendApi.kt"], /public suspend fun ping\(input: PingInput\? = null\): Boolean =/);
});

test("the Java emitter adds lazy pages methods to cursor-paginated queries", () => {
  const ir = buildIr(fixtureSources());
  for (const operation of ir.operations) if (["alpha.items", "alpha.events"].includes(operation.id)) operation.layer = "server";
  const files = Object.fromEntries(renderJava(ir).map(file => [basename(file.path), file.contents]));
  assert.match(files["AlphaApi.java"], new RegExp([
    String.raw`\n {2}public Iterable<ItemPage> itemsPages\(ItemsInput input\) \{`,
    String.raw`\n {4}return Pages\.<ItemPage, ItemPage>of\(`,
    String.raw`\n {8}this\.executor, Operations\.ALPHA_ITEMS, Wire\.nonNull\(input, "input"\)\.toJson\(\), "cursor", Wire\.STRING,`,
    String.raw`\n {8}Pages\.Order\.OPAQUE, reply -> reply, ItemPage::getComplete, ItemPage::getRefreshRequired,`,
    String.raw`\n {8}ItemPage::getNextCursor\);\n {2}\}`,
  ].join("")));
  assert.match(files["AlphaApi.java"], /"after", Wire\.STRING,\n {8}Pages\.Order\.OPAQUE, reply -> reply, EventPage::getComplete/,
    "an ordered style compares only decimal cursors");
  assert.match(files["AlphaApi.java"], /\n {3}\* @throws IllegalArgumentException if the input's <code>cursor<\/code> is not a valid cursor\n/);
  assert.match(files["AlphaSuspendApi.kt"], /\n {4}public fun itemsPages\(input: ItemsInput\): Flow<ItemPage> =\n {8}pageFlow\(dispatcher, api\.itemsPages\(input\)\)\n/);
  assert.match(files["AlphaSuspendApi.kt"], /\nimport kotlinx\.coroutines\.flow\.Flow\n/);
  assert.ok(!files["BetaApi.java"].includes("Pages"), "bounded and unpaginated queries get no pages method");

  const repo = Object.fromEntries(renderJava(buildIr(repoSources())).map(file => [basename(file.path), file.contents]));
  assert.match(repo["CommunicationApi.java"],
    /public Iterable<MessagePage> messagesPages\(MessagesRequestInput input\) \{\n.*\n.*"beforeSequence", Scalars\.DECIMAL,\n {8}Pages\.Order\.DESCENDING, MessagesReply::getResult,/,
    "a descending style with a decimal cursor checks that each next cursor decreases");
  assert.match(repo["CommunicationApi.java"], /"cursor", Wire\.STRING,\n {8}Pages\.Order\.OPAQUE, MembersReply::getResult,/);
  assert.ok(!repo["ManagementApi.java"].includes("Pages"));
});

test("the Java emitter rejects cursor pagination it cannot page", () => {
  const variant = change => {
    const ir = buildIr(fixtureSources());
    const items = ir.operations.find(operation => operation.id === "alpha.items");
    items.layer = "server";
    change(ir, items);
    return ir;
  };
  const rejects = (change, message) => assert.throws(() => renderJava(variant(change)), new EmitterError(`java: alpha.items${message}`));
  rejects((ir, items) => { items.pagination.pagePath = ["a", "b"]; }, ": pagePath a.b is deeper than one field; extend the emitter");
  rejects((ir, items) => { items.pagination.pagePath = ["items"]; }, ": pagePath field ItemPage.items is not an object field");
  rejects((ir, items) => { items.pagination.pageType = "Item"; }, ": pagePath reaches ItemPage, not the page type Item");
  rejects((ir, items) => { items.pagination.cursorField = "limit"; }, ": the cursor input ItemsInput.limit is not a string scalar; extend the emitter");
  rejects((ir, items) => { items.pagination.cursorField = "box"; }, ": the cursor input ItemsInput.box is not an optional scalar field");
  rejects((ir, items) => { items.pagination.style = "lookahead"; }, ' names unknown pagination style "lookahead"');
  rejects(ir => { ir.pagination.find(style => style.name === "cursor").order = "random"; },
    ': pagination style cursor has order "random"; extend the emitter');
  rejects(ir => { ir.types.find(type => type.name === "ItemPage").fields.find(field => field.name === "complete").type.nullable = true; },
    ": ItemPage needs complete: Boolean!, refreshRequired: Boolean! and a string nextCursor");
  rejects(ir => {
    const ping = ir.operations.find(operation => operation.id === "alpha.ping");
    Object.assign(ping, { layer: "server", field: "itemsPages" });
  }, " and alpha.ping both map to the method itemsPages");
  assert.throws(() => renderJava(variant(ir => {
    Object.assign(ir.operations.find(operation => operation.id === "alpha.ping"), { layer: "server", field: "pageFlow" });
  })), new EmitterError("java: alpha.ping would shadow the Kotlin pageFlow helper; rename it or extend the emitter"));
});
