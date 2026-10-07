import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkAnnotations, formatAnnotationReport } from "../lib/annotations.mjs";
import { IR_VERSION, IrBuildError, buildIr } from "../lib/ir.mjs";
import { createValidator } from "../lib/json-schema.mjs";
import { formatJson } from "../lib/json.mjs";
import { SourceError, loadSources } from "../lib/sources.mjs";
import { REPO_ROOT, copyFixture, fixtureSources, replaceOnce, repoSources } from "./helpers.mjs";

const find = (list, key, value) => {
  const found = list.find(item => item[key] === value);
  assert.ok(found, `no ${key} ${value}`);
  return found;
};

test("the committed repository IR is current, complete and valid", () => {
  const sources = repoSources();
  const ir = buildIr(sources);
  const committed = JSON.parse(readFileSync(join(REPO_ROOT, "schema/v1-ir.json"), "utf8"));
  assert.deepEqual(ir, committed, "schema/v1-ir.json is stale. Run npm run generate:graphql.");
  assert.deepEqual(createValidator(sources.irSchema)(committed), []);
  assert.equal(ir.irVersion, IR_VERSION);
  assert.deepEqual(ir.operations.map(operation => operation.id).sort(), Object.keys(sources.annotations.operations).sort());
  assert.deepEqual(ir.realtime.events.map(event => event.type).sort(), Object.keys(sources.annotations.realtime.events).sort());
  assert.ok(ir.realtime.events.length > 0 && ir.realtime.channels.length > 0);
});

test("the IR version is semantic and the IR schema accepts only its major version", () => {
  assert.equal(IR_VERSION, "1.0.0");
  const sources = fixtureSources();
  const ir = buildIr(sources);
  const validate = createValidator(sources.irSchema);
  assert.deepEqual(validate({ ...ir, irVersion: "1.7.0" }), []);
  assert.deepEqual(validate({ ...ir, irVersion: "2.0.0" }).map(error => error.path), ["/irVersion"]);
  const broken = structuredClone(ir);
  broken.operations[0].layer = "edge";
  broken.extra = true;
  delete broken.types[0].planes;
  assert.deepEqual(validate(broken), [
    { path: "/operations/0/layer", message: 'must be one of "client", "server", "both" (got "edge")' },
    { path: "/types/0", message: 'missing required property "planes"' },
    { path: "", message: 'has unknown property "extra"' },
  ]);
});

test("operations carry the plane, documents, context rules, inputs and annotations", () => {
  const ir = buildIr(fixtureSources());
  assert.equal(ir.$schema, "./v1-ir.schema.json");
  assert.deepEqual(ir.sources, { graphql: ["schema/alpha-v1.graphql", "schema/beta-v1.graphql"], annotations: "schema/v1-annotations.json" });
  assert.deepEqual(ir.planes.map(plane => [plane.name, plane.schema, plane.context.type, plane.resolveOperation]), [
    ["alpha", "schema/alpha-v1.graphql", "ContextInput", "alpha.resolveRequest"],
    ["beta", "schema/beta-v1.graphql", "ContextInput", "beta.resolveRequest"],
  ]);
  assert.deepEqual(ir.operations.map(operation => operation.id), [
    "alpha.capabilities", "alpha.resolveRequest", "alpha.items", "alpha.events", "alpha.job", "alpha.fetchHTTPStatus",
    "alpha.startJob", "alpha.ping", "alpha.redeem", "alpha.eventStream",
    "beta.capabilities", "beta.resolveRequest", "beta.widgets", "beta.createWidget",
  ]);
  const operation = id => find(ir.operations, "id", id);

  const status = operation("alpha.fetchHTTPStatus");
  const text = "query AlphaFetchHTTPStatus($context: ContextInput!, $input: FetchInput) {\n  fetchHTTPStatus(context: $context, input: $input)\n}";
  assert.deepEqual(status.document, { text, bytes: Buffer.byteLength(text), selectedFields: 1, depth: 0 });
  assert.deepEqual([status.kind, status.field, status.operationName, status.deprecated], ["query", "fetchHTTPStatus", "AlphaFetchHTTPStatus", { reason: "Use capabilities." }]);
  assert.deepEqual(status.arguments, [
    { name: "context", role: "context", type: { kind: "input", name: "ContextInput", nullable: false } },
    { name: "input", role: "input", type: { kind: "input", name: "FetchInput", nullable: true } },
  ]);
  assert.deepEqual(status.input, { argument: "input", type: "FetchInput", required: false });
  assert.deepEqual(status.result, { type: { kind: "scalar", name: "Int", nullable: true } });
  assert.deepEqual(status.errors, { sets: [], codes: ["UNAVAILABLE"] });
  assert.equal(operation("alpha.items").description, "List items.\n\nPages follow the cursor style.");

  const uses = id => operation(id).context.fields.map(field => `${field.name}:${field.use}`);
  assert.deepEqual(uses("alpha.capabilities"), ["tenant:optional", "requestId:required", "attempt:optional", "permit:forbidden", "tags:optional"]);
  assert.deepEqual(uses("alpha.redeem"), ["tenant:required", "requestId:required", "attempt:optional", "permit:required", "tags:optional"]);
  assert.deepEqual(uses("beta.widgets"), ["tenant:optional", "requestId:required", "attempt:optional", "permit:forbidden", "tags:optional"]);
  assert.equal(operation("alpha.capabilities").input, null);
  assert.equal(operation("alpha.redeem").idempotency, "permitBound");

  assert.deepEqual(operation("alpha.items").pagination,
    { style: "cursor", limitField: "limit", cursorField: "cursor", pagePath: [], pageType: "ItemPage", itemType: "Item" });
  assert.deepEqual(operation("alpha.events").pagination,
    { style: "replay", limitField: "limit", cursorField: "after", pagePath: [], pageType: "EventPage", itemType: "Event" });
  assert.deepEqual(operation("beta.widgets").pagination, { style: "bounded", pagePath: ["result"], pageType: "WidgetPage", itemType: "Widget" });
  assert.deepEqual(operation("alpha.ping").pagination, { style: "none" });

  const startJob = operation("alpha.startJob");
  assert.deepEqual(startJob.longRunning, { poll: "alpha.job", refField: "job" });
  assert.deepEqual(startJob.realtime, { mode: "none", emits: ["job.started", "job.finished"] });
  assert.deepEqual(startJob.errors, { sets: ["request", "http"], codes: ["INVALID_REQUEST", "NOT_FOUND", "TRANSPORT_UNKNOWN", "UNAVAILABLE"] });
  assert.deepEqual(operation("alpha.eventStream").realtime, { mode: "subscription", channel: "eventStream" });
  assert.deepEqual(operation("alpha.fetchHTTPStatus").auth, [{ credential: "userToken" }, { credential: "serverKey", scopes: ["itemRead", "widgetWrite"] }]);
});

test("types record shared planes, defaults, deprecations, nested lists and scalar constraints", () => {
  const ir = buildIr(fixtureSources());
  const type = name => find(ir.types, "name", name);
  assert.ok(ir.types.every(entry => !entry.name.startsWith("__") && !["Query", "Mutation", "Subscription"].includes(entry.name)));
  assert.deepEqual(ir.types.filter(entry => entry.planes.length > 1).map(entry => entry.name),
    ["Counter", "ContextInput", "String", "ID", "Int", "Capabilities", "ResolveInput", "Receipt", "Boolean"]);
  assert.deepEqual(type("Ratio").planes, ["beta"]);

  assert.deepEqual(type("CreateWidgetInput").fields.map(field => [field.name, field.defaultValue]),
    [["label", undefined], ["state", "ACTIVE"], ["ratio", 0.5], ["nested", undefined], ["shape", { kind: "box", sides: [1, 2] }]]);
  assert.deepEqual(type("ContextInput").fields.map(field => field.defaultValue), [undefined, undefined, 1, undefined, ["a", "b|c"]]);
  assert.deepEqual(type("Fruit").values, [
    { name: "BANANA", description: "Curved and yellow." }, { name: "APPLE" }, { name: "cherry" }, { name: "apple10" }, { name: "apple9" },
    { name: "DATE", deprecated: {} }, { name: "ELDER", description: "Elderberries.", deprecated: { reason: "Use APPLE." } },
  ]);
  const item = type("Item");
  assert.deepEqual(find(item.fields, "name", "oldName").deprecated, {});
  assert.deepEqual(find(item.fields, "name", "legacyCode").deprecated, { reason: "Use id." });
  assert.deepEqual(find(item.fields, "name", "grid").type,
    { kind: "list", nullable: false, ofType: { kind: "list", nullable: true, ofType: { kind: "scalar", name: "Int", nullable: false } } });
  assert.equal(type("Counter").description,
    "Non-negative counter as a decimal string.\nDescriptions keep their line breaks, and a closing comment marker */ stays escaped.");

  const scalar = name => {
    const { name: _name, kind: _kind, planes: _planes, description: _description, ...rest } = type(name);
    return rest;
  };
  assert.deepEqual(scalar("Counter"), {
    builtIn: false, representation: "string", summary: "Non-negative counter as a canonical decimal string.",
    constraints: { pattern: "^(0|[1-9][0-9]*)$", maximumDecimal: "9223372036854775807" },
  });
  assert.deepEqual(scalar("PageSize").constraints, { minimum: 1, maximum: 50 });
  assert.deepEqual(scalar("Blob").constraints, { maxCanonicalJsonBytes: 1024, requiredStringProperties: ["signature"] });
  assert.deepEqual(["String", "ID", "Int", "Float", "Boolean"].map(scalar), [
    { builtIn: true, representation: "string" }, { builtIn: true, representation: "string" }, { builtIn: true, representation: "integer" },
    { builtIn: true, representation: "number" }, { builtIn: true, representation: "boolean" },
  ]);
});

test("realtime models the envelope, channels and the operations that emit each event type", () => {
  const { realtime } = buildIr(fixtureSources());
  assert.deepEqual(realtime.envelope, {
    plane: "alpha", type: "Event", discriminator: "type", payload: "payload", payloadType: "EventPayload",
    subject: "subjectRef", subjectType: "SubjectRef", unknownTypes: "deliverAsUnknown",
  });
  assert.deepEqual(realtime.channels.map(channel => [channel.name, channel.subscription, channel.replay, channel.pageType, channel.endpoint]), [
    ["eventStream", "alpha.eventStream", "alpha.events", "EventPage", { operation: "alpha.capabilities", resultField: "wssUrl" }],
  ]);
  assert.deepEqual(realtime.events.map(event => [event.type, event.subject, event.payload, event.emittedBy]), [
    ["item.changed", "item", { required: ["itemId"], optional: ["note"] }, ["alpha.ping"]],
    ["job.finished", "job", { required: ["jobId", "revision"], optional: [] }, ["alpha.startJob"]],
    ["job.started", "job", { required: ["jobId"], optional: [] }, ["alpha.startJob"]],
  ]);
});

test("the IR is plain JSON and does not depend on annotation key order", () => {
  const ir = buildIr(fixtureSources());
  assert.deepEqual(JSON.parse(JSON.stringify(ir)), ir);
  assert.equal(formatJson(buildIr(fixtureSources())), formatJson(ir));

  const reverse = map => Object.fromEntries(Object.entries(map).reverse());
  const reordered = buildIr(fixtureSources({
    annotations: annotations => {
      for (const key of ["operations", "credentials", "scopes", "conditions", "idempotency", "pagination", "scalars", "errorCodes", "errorSets"]) {
        annotations[key] = reverse(annotations[key]);
      }
      annotations.realtime.events = reverse(annotations.realtime.events);
      annotations.realtime.channels = reverse(annotations.realtime.channels);
    },
  }));
  assert.equal(formatJson(reordered), formatJson(ir));

  const planesReversed = buildIr(fixtureSources({ annotations: annotations => { annotations.planes = reverse(annotations.planes); } }));
  assert.deepEqual(planesReversed.planes.map(plane => plane.name), ["beta", "alpha"]);
  assert.equal(planesReversed.operations[0].id, "beta.capabilities");
  assert.deepEqual(find(planesReversed.types, "name", "Counter").planes, ["beta", "alpha"]);
});

const appendTo = (plane, sdl) => ({ planes: { [plane]: text => `${text}\n${sdl}` } });
const addJobField = (field, sdl) => ({ planes: { alpha: text => `${replaceOnce(text, "  output: Blob\n", `  output: Blob\n  ${field}\n`)}\n${sdl}` } });
const UNSUPPORTED = [
  ["union types", appendTo("alpha", "union Result = Item | Job\n"),
    "schema/alpha-v1.graphql: Result: union types are not supported by the SDK generators; see docs/sdk-generation.md"],
  ["interface types", appendTo("alpha", "interface Named {\n  name: String!\n}\n"),
    "schema/alpha-v1.graphql: Named: interface types are not supported by the SDK generators; see docs/sdk-generation.md"],
  ["@oneOf inputs", appendTo("alpha", "input Choice @oneOf {\n  a: Int\n  b: String\n}\n"),
    "schema/alpha-v1.graphql: Choice: @oneOf input types are not supported by the SDK generators; see docs/sdk-generation.md"],
  ["custom directives", appendTo("beta", "directive @internal on FIELD_DEFINITION\n"),
    "schema/beta-v1.graphql: custom directive @internal is not supported by the SDK generators; see docs/sdk-generation.md"],
  ["arguments on non-root fields", { planes: { alpha: text => replaceOnce(text, "  name: String!\n", "  name(locale: String): String!\n") } },
    "schema/alpha-v1.graphql: Item.name: only root fields may take arguments"],
  ["shared type names with different definitions", { planes: { beta: text => replaceOnce(text, "  version: String!\n", "  version: String\n") } },
    "Capabilities differs between schema/alpha-v1.graphql and schema/beta-v1.graphql; make the definitions identical or rename one"],
  ["recursive result types", addJobField("parent: Job", ""),
    "alpha.job: result type Job is recursive or nested deeper than 12 levels; see docs/sdk-generation.md"],
  ["result types nested deeper than the server allows", addJobField("nest: N0",
    Array.from({ length: 13 }, (_, i) => `type N${i} {\n  ${i === 12 ? "leaf: Int" : `next: N${i + 1}`}\n}\n`).join("")),
  "alpha.job: result type N11 is recursive or nested deeper than 12 levels; see docs/sdk-generation.md"],
  ["documents that select more fields than the server allows", addJobField("wide: Wide",
    `type Wide {\n${Array.from({ length: 500 }, (_, i) => `  f${i}: Int\n`).join("")}}\n`),
  "alpha.job: the generated AlphaJob document selects 506 fields at depth 2; the server allows 500 fields and depth 12; see docs/sdk-generation.md"],
];

for (const [name, options, message] of UNSUPPORTED) {
  test(`the IR rejects ${name}`, () => {
    const sources = fixtureSources(options);
    assert.equal(checkAnnotations(sources).ok, true, "the annotations must stay valid");
    assert.throws(() => buildIr(sources), error => error instanceof IrBuildError && error.message === message);
  });
}

test("documents must fit the transport's document size limit", () => {
  const largest = Math.max(...buildIr(fixtureSources()).operations.map(operation => operation.document.bytes));
  assert.doesNotThrow(() => buildIr(fixtureSources({ annotations: annotations => { annotations.transport.http.maxDocumentBytes = largest; } })));
  const bytes = find(buildIr(fixtureSources()).operations, "id", "alpha.capabilities").document.bytes;
  assert.throws(() => buildIr(fixtureSources({ annotations: annotations => { annotations.transport.http.maxDocumentBytes = bytes - 1; } })),
    { message: `alpha.capabilities: the generated document is ${bytes} bytes; transport.http.maxDocumentBytes allows ${bytes - 1}` });
});

test("the build stops with the annotation report or the IR schema violations", () => {
  const sources = fixtureSources({ annotations: annotations => { delete annotations.operations["alpha.ping"]; } });
  assert.throws(() => buildIr(sources), error => error instanceof IrBuildError && error.message === formatAnnotationReport(checkAnnotations(sources)));

  const strict = fixtureSources();
  strict.irSchema = structuredClone(strict.irSchema);
  strict.irSchema.properties.irVersion.pattern = "^2\\.";
  assert.throws(() => buildIr(strict), error => error instanceof IrBuildError
    && error.message === 'The generated IR violates schema/v1-ir.schema.json:\n  /irVersion: must match pattern ^2\\. (got "1.0.0")');
});

test("input files that cannot be loaded are reported by repository path", t => {
  const root = copyFixture(t);
  const load = (paths = {}) => () => loadSources({ root, paths });
  const sourceError = prefix => error => error instanceof SourceError && error.message.startsWith(prefix);

  writeFileSync(join(root, "schema/operations-v1.graphql"), "query Q {\n  a\n}\n");
  writeFileSync(join(root, "schema/notes.graphql"), "type Query {\n  a: Int\n}\n");
  assert.deepEqual(load()().planes.map(plane => plane.path), ["schema/alpha-v1.graphql", "schema/beta-v1.graphql"]);

  const alpha = join(root, "schema/alpha-v1.graphql");
  const original = readFileSync(alpha, "utf8");
  writeFileSync(alpha, "type Query {");
  assert.throws(load(), sourceError("schema/alpha-v1.graphql is not valid GraphQL: Syntax Error: "));
  writeFileSync(alpha, "type Query {\n  a: Missing\n}\n");
  assert.throws(load(), { message: 'schema/alpha-v1.graphql is not a valid GraphQL schema: Unknown type "Missing".' });
  writeFileSync(alpha, replaceOnce(original, "  note: String\n}\n\ninput FetchInput", "  note: Item\n}\n\ninput FetchInput"));
  assert.throws(load(), { message: "schema/alpha-v1.graphql is not a valid GraphQL schema: The type of PingInput.note must be Input Type but got: Item." });
  writeFileSync(alpha, original);

  assert.throws(load({ schemaDir: "graphql" }), sourceError("graphql cannot be read: ENOENT"));
  writeFileSync(join(root, "schema/v1-annotations.json"), "{");
  assert.throws(load(), sourceError("schema/v1-annotations.json is not valid JSON: "));
  rmSync(join(root, "schema/v1-annotations.json"));
  assert.throws(load(), sourceError("schema/v1-annotations.json cannot be read: ENOENT"));
});
