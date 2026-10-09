import test from "node:test";
import assert from "node:assert/strict";
import { basename } from "node:path";
import { EmitterError } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import csharp, { csPattern, csString, memberName, scalarType } from "../emitters/csharp.mjs";
import { assertGoldenTree, fixtureSources, repoSources } from "./helpers.mjs";

const renderCs = (ir, layers) => Object.fromEntries(csharp.emit(ir, layers ? { layers } : {}).map(file => [basename(file.path), file.contents]));
const ALL_LAYERS = ["client", "server", "both"];

test("the C# emitter renders every layer of the edge fixture to the golden files", () => {
  // dotnet/test/ConvoHop.SdkgenEdge compiles these files with the runtime they depend on.
  assertGoldenTree("edge-all-layers", csharp.emit(buildIr(fixtureSources()), { layers: ALL_LAYERS }));
});

test("C# literals and member names keep schema text from ending a literal or becoming code", () => {
  assert.equal(csString('a"b\\c\n\t\u0001 é \u2028 \u2029 \u0085'), '"a\\"b\\\\c\\n\\t\\u0001 é \\u2028 \\u2029 \\u0085"',
    "C# also ends a line at U+0085, U+2028 and U+2029");
  assert.deepEqual(["fetchHTTPStatus", "foo_bar", "ok2Go"].map(name => memberName(name, "Widget.x")), ["FetchHttpStatus", "FooBar", "Ok2Go"]);
  for (const name of ["9lives", "é"]) {
    assert.throws(() => memberName(name, "Widget.x"), new EmitterError(`csharp: Widget.x: cannot derive a C# member name from ${JSON.stringify(name)}`));
  }
  const keyword = JSON.parse(JSON.stringify(buildIr(fixtureSources())).replaceAll('"Widget"', '"object"'));
  const files = renderCs(keyword);
  assert.match(files["Outputs.cs"], /\n {4}public sealed class @object\n/);
  assert.match(files["JsonContext.cs"], /typeof\(global::ConvoHop\.Models\.@object\)/);
});

test("C# error codes say whether the schema marks each code retryable, and null for a code it doesn't list", () => {
  const ir = buildIr(fixtureSources());
  const group = retryable => ir.errors.codes.filter(code => code.retryable === retryable)
    .map(code => `                case ${memberName(code.name, code.name)}:\n`).join("") + `                    return ${retryable};\n`;
  assert.ok(renderCs(ir)["ErrorCodes.cs"].includes(`${group(true)}${group(false)}                default:\n                    return null;\n`));
  const rejects = (change, message) => {
    const variant = JSON.parse(JSON.stringify(ir));
    change(variant.errors.codes);
    assert.throws(() => csharp.emit(variant), new EmitterError(`csharp: ${message}`));
  };
  rejects(codes => { codes[0].retryable = "yes"; }, `error code ${ir.errors.codes[0].name} has no boolean retryable`);
  rejects(codes => codes.push({ name: "RETRYABLE", summary: "Shadows the lookup.", origin: "server", retryable: false }),
    'ErrorCodes: "RETRYABLE" and "the Retryable lookup" both map to Retryable');
});

test("C# scalar patterns are translated only where .NET and JavaScript agree", () => {
  assert.equal(csPattern("^[0-9a-f]{8}-[0-9a-f]{4}$"), "^[0-9a-f]{8}-[0-9a-f]{4}\\z", "$ never matches before a final newline");
  assert.equal(csPattern("^\\d+\\.[\\-_a-z\\d]?$"), "^[0-9]+\\.[\\-_a-z0-9]?\\z", "\\d matches ASCII digits only");
  assert.equal(csPattern("^\\D[^a]\\/$"), "^[^0-9][^a]\\/\\z");
  const unsupported = [
    [".", "."], ["(?:a)", "a (? group"], ["\\s", "the escape \\s"], ["\\w", "the escape \\w"], ["\\", "the escape \\"], ["é", '"é"'],
    ["#", '"#"'], ["[é]", "non-ASCII text"], ["[[a]]", "[ inside a character class"], ["[]a]", "an empty character class"],
    ["[\\D]", "\\D inside a character class"], ["[a", "an unterminated character class"],
  ];
  for (const [pattern, detail] of unsupported) {
    assert.throws(() => csPattern(pattern),
      new EmitterError(`csharp: scalar pattern ${JSON.stringify(pattern)} uses ${detail}, which the C# emitter does not translate`));
  }
});

test("C# scalar types follow the representation, and custom integers must fit 32 bits", () => {
  const scalar = (representation, constraints, builtIn = false) => ({ name: "SampleValue", representation, constraints, builtIn });
  const type = (...args) => scalarType(scalar(...args));
  assert.deepEqual(type("string"), { type: "string", value: false });
  assert.deepEqual(type("integer", undefined, true), { type: "int", value: true });
  assert.deepEqual(type("integer", { minimum: -(2 ** 31), maximum: 2 ** 31 - 1 }), { type: "int", value: true });
  assert.deepEqual(type("number"), { type: "double", value: true });
  assert.deepEqual(type("boolean"), { type: "bool", value: true });
  assert.deepEqual(type("object"), { type: "global::System.Text.Json.JsonElement", value: true });
  for (const constraints of [{ minimum: 0 }, { minimum: 0, maximum: 2 ** 31 }, { minimum: -(2 ** 31) - 1, maximum: 0 }, { minimum: 0.5, maximum: 3 }]) {
    assert.throws(() => type("integer", constraints),
      new EmitterError("csharp: integer scalar SampleValue needs a minimum and maximum within 32 bits; extend the emitter for wider integers"));
  }
  assert.throws(() => type("bigint"), new EmitterError('csharp: scalar SampleValue has unsupported representation "bigint"'));
});

test("the C# emitter renders the requested layers' operations and only the types they reach", () => {
  const ir = buildIr(fixtureSources());
  const server = renderCs(ir);
  const all = renderCs(ir, ALL_LAYERS);
  assert.ok(!server["Enums.cs"].includes("enum Fruit") && all["Enums.cs"].includes("enum Fruit"), "client-only types need the client layer");
  assert.ok(!server["Operations.cs"].includes("AlphaItems") && all["Operations.cs"].includes('"AlphaItems"'));
  assert.ok(!all["Operations.cs"].includes("EventStream"), "subscriptions are skipped");
  assert.match(all["Enums.cs"], /\[global::System\.Obsolete\("Use APPLE\."\)\]\n {8}Elder,/);
  for (const layers of [[], ["edge"], "server"]) {
    assert.throws(() => csharp.emit(ir, { layers }), new EmitterError("csharp: layers must be a non-empty list of client, server, both"));
  }
});

test("the C# emitter rejects names and type positions it cannot map", () => {
  const withWidgetFields = (...names) => {
    const ir = buildIr(fixtureSources());
    const widget = ir.types.find(type => type.name === "Widget");
    widget.fields.push(...names.map(name => ({ ...widget.fields[0], name })));
    return ir;
  };
  assert.throws(() => renderCs(withWidgetFields("foo_bar", "fooBar")), new EmitterError('csharp: Widget: "foo_bar" and "fooBar" both map to FooBar'));
  assert.throws(() => renderCs(withWidgetFields("widget")), new EmitterError('csharp: Widget: "widget" maps to Widget, the name of its enclosing type'));
  assert.throws(() => renderCs(withWidgetFields("toString")),
    new EmitterError('csharp: Widget: "toString" maps to ToString, which would hide System.Object.ToString'));

  const ir = buildIr(fixtureSources());
  const input = ir.types.find(type => type.name === "CreateWidgetInput");
  input.fields[0] = { ...input.fields[0], type: { kind: "object", name: "Widget", nullable: true } };
  assert.throws(() => renderCs(ir), new EmitterError(`csharp: CreateWidgetInput.${input.fields[0].name}: input position references object type Widget`));
});

test("the C# emitter renders a plane API per plane with lazy pages methods for cursor-paginated queries", () => {
  const block = lines => lines.map(line => `        ${line}`).join("\n");
  const pages = (method, page, input, reply, plane, member, cursor, scalar, order, accessor) => block([
    `public global::System.Collections.Generic.IAsyncEnumerable<global::ConvoHop.Models.${page}> ${method}(global::ConvoHop.Models.${input} input, global::System.Threading.CancellationToken cancellationToken = default)`,
    "{",
    `    return global::ConvoHop.Internal.PageSequence.Create<global::ConvoHop.Models.${input}, global::ConvoHop.Models.${reply}, global::ConvoHop.Models.${page}>(`,
    `        _executor, global::ConvoHop.Operations.${plane}.${member}, input, "${cursor}",`,
    `        global::ConvoHop.Generated.GeneratedSchema.Types["${scalar}"], global::ConvoHop.Internal.PageOrder.${order},`,
    `        ${accessor}, page => page.Complete, page => page.RefreshRequired, page => page.NextCursor,`,
    "        cancellationToken);",
    "}",
  ]);
  const repo = renderCs(buildIr(repoSources()))["Apis.cs"];
  assert.ok(repo.includes(pages("MessagesPagesAsync", "MessagePage", "MessagesRequestInput", "MessagesReply", "Communication", "Messages",
    "beforeSequence", "Decimal", "Descending", "reply => reply.Result")), "a descending style with a decimal cursor checks that each next cursor decreases");
  assert.ok(repo.includes(pages("MembersPagesAsync", "MemberPage", "MembersRequestInput", "MembersReply", "Communication", "Members",
    "cursor", "String", "Opaque", "reply => reply.Result")));
  const management = repo.slice(repo.indexOf("public sealed class ManagementApi"));
  assert.ok(management.length > 0 && !management.includes("PagesAsync"), "bounded and unpaginated queries get no pages method");
  assert.ok(repo.includes(block([
    "public global::System.Threading.Tasks.Task<global::ConvoHop.Models.RedeemCredentialReply> RedeemCredentialAsync(global::ConvoHop.Models.RedeemCredentialRequestInput input, global::System.Text.Json.JsonElement credentialDeliveryPermit, string? requestId = null, global::System.Threading.CancellationToken cancellationToken = default)",
    "{",
    "    if (input is null) throw new global::System.ArgumentNullException(nameof(input));",
    '    if (credentialDeliveryPermit.ValueKind == global::System.Text.Json.JsonValueKind.Undefined) throw new global::System.ArgumentException("Expected a credential, not a default JsonElement", nameof(credentialDeliveryPermit));',
    "    return _executor.ExecuteAsync(global::ConvoHop.Operations.Communication.RedeemCredential, input, requestId, credentialDeliveryPermit, cancellationToken);",
    "}",
  ])), "a context credential is a parameter, and only sameRequest mutations take a request ID");
  assert.match(repo, /<para>Destructive: it deletes, revokes, removes, disables or ends something\.<\/para>\n(?: {8}\/\/\/ .*\n)*? {8}public global::System\.Threading\.Tasks\.Task<global::ConvoHop\.Models\.DeleteMessageReply> DeleteMessageAsync\(/);
  assert.match(repo, /public global::System\.Threading\.Tasks\.Task<global::ConvoHop\.Models\.CapabilitiesReply> CapabilitiesAsync\(global::System\.Threading\.CancellationToken cancellationToken = default\)\n {8}\{\n {12}return _executor\.ExecuteAsync\(global::ConvoHop\.Operations\.Management\.Capabilities, global::ConvoHop\.NoInput\.Value, null, null, cancellationToken\);/);

  const edge = renderCs(buildIr(fixtureSources()), ALL_LAYERS)["Apis.cs"];
  assert.ok(edge.includes(pages("ItemsPagesAsync", "ItemPage", "ItemsInput", "ItemPage", "Alpha", "Items", "cursor", "String", "Opaque", "reply => reply")),
    "an empty pagePath pages the result itself");
  assert.ok(edge.includes(pages("EventsPagesAsync", "EventPage", "EventsInput", "EventPage", "Alpha", "Events", "after", "String", "Opaque", "reply => reply")),
    "an ordered style compares only decimal cursors");
  assert.match(edge, /\[global::System\.Obsolete\("Use capabilities\."\)\]\n {8}public global::System\.Threading\.Tasks\.Task<int\?> FetchHttpStatusAsync\(global::ConvoHop\.Models\.FetchInput\? input = null, global::System\.Threading\.CancellationToken cancellationToken = default\)\n/);
  assert.match(edge, /public global::System\.Threading\.Tasks\.Task<bool> PingAsync\(global::ConvoHop\.Models\.PingInput\? input = null, global::System\.Threading\.CancellationToken cancellationToken = default\)\n/,
    "an ephemeral mutation takes no request ID");
  assert.match(edge, /RedeemAsync\(global::ConvoHop\.Models\.RedeemInput input, string permit, string\? requestId = null, global::System\.Threading\.CancellationToken cancellationToken = default\)\n {8}\{\n {12}if \(input is null\) throw new global::System\.ArgumentNullException\(nameof\(input\)\);\n {12}if \(permit is null\) throw new global::System\.ArgumentNullException\(nameof\(permit\)\);\n/);
  assert.ok(!edge.slice(edge.indexOf("public sealed class BetaApi")).includes("PagesAsync"));
});

test("the C# emitter rejects operations its plane APIs cannot call", () => {
  const rejects = (change, message) => {
    const ir = buildIr(fixtureSources());
    change(ir, id => ir.operations.find(operation => operation.id === id));
    assert.throws(() => csharp.emit(ir, { layers: ALL_LAYERS }), new EmitterError(`csharp: ${message}`));
  };
  rejects((ir, op) => { op("alpha.capabilities").idempotency = "magic"; }, 'alpha.capabilities has unsupported idempotency "magic"');
  rejects(ir => { ir.idempotency.find(policy => policy.name === "safe").retry = "sometimes"; }, 'alpha.capabilities has unsupported idempotency "safe"');
  rejects((ir, op) => { op("alpha.capabilities").plane = "gamma"; }, "alpha.capabilities names unknown plane gamma");
  rejects((ir, op) => {
    ir.credentials.push({ ...ir.credentials.find(credential => credential.name === "permit"), name: "secondPermit" });
    op("alpha.redeem").auth.push({ credential: "secondPermit" });
  }, "alpha.redeem accepts several context credentials");
  const permitField = (field, message) => rejects(ir => { ir.credentials.find(credential => credential.name === "permit").contextField = field; }, message);
  permitField("nope", "alpha.redeem: ContextInput has no nope field");
  permitField("tags", "alpha.redeem: context credential tags is not a scalar; extend the emitter");
  permitField("requestId", 'alpha.redeem: context credential "requestId" cannot be a C# parameter name');
});

test("the C# emitter rejects cursor pagination it cannot page", () => {
  const rejects = (change, message) => {
    const ir = buildIr(fixtureSources());
    change(ir, ir.operations.find(operation => operation.id === "alpha.items"));
    assert.throws(() => csharp.emit(ir, { layers: ALL_LAYERS }), new EmitterError(`csharp: alpha.items${message}`));
  };
  rejects((ir, items) => { items.pagination.pagePath = ["a", "b"]; }, ": pagePath a.b is deeper than one field; extend the emitter");
  rejects((ir, items) => { items.pagination.pagePath = ["items"]; }, ": pagePath field ItemPage.items is not an object field");
  rejects((ir, items) => { items.pagination.pageType = "Item"; }, ": pagePath reaches ItemPage, not the page type Item");
  rejects((ir, items) => { items.pagination.cursorField = "limit"; }, ": the cursor input ItemsInput.limit is not a string scalar; extend the emitter");
  rejects((ir, items) => { items.pagination.cursorField = "box"; }, ": the cursor input ItemsInput.box is not an optional scalar field");
  rejects((ir, items) => { items.pagination.style = "lookahead"; }, ' names unknown pagination style "lookahead"');
  rejects((ir, items) => { items.kind = "mutation"; }, ": cursor pagination of a mutation; extend the emitter");
  rejects((ir, items) => { items.auth = [{ credential: "permit" }]; }, ": cursor pagination with a context credential; extend the emitter");
  rejects(ir => { ir.pagination.find(style => style.name === "cursor").order = "random"; },
    ': pagination style cursor has order "random"; extend the emitter');
  rejects(ir => { ir.pagination.find(style => style.name === "cursor").pageFields = ["items", "complete"]; },
    ": pagination style cursor has no refreshRequired, nextCursor page field; extend the emitter");
  rejects(ir => { ir.types.find(type => type.name === "ItemPage").fields.find(field => field.name === "complete").type.nullable = true; },
    ": ItemPage needs complete: Boolean!, refreshRequired: Boolean! and a string nextCursor");
  const ir = buildIr(fixtureSources());
  ir.operations.find(operation => operation.id === "alpha.ping").field = "itemsPages";
  assert.throws(() => csharp.emit(ir, { layers: ALL_LAYERS }), new EmitterError('csharp: AlphaApi: "items pages" and "itemsPages" both map to ItemsPagesAsync'));
});
