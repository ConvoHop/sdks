import test from "node:test";
import assert from "node:assert/strict";
import swift, { DEFAULT_DIRECTORY, renderSwiftOperations, renderSwiftTypes, swiftIdentifier, swiftString, swiftTypeName } from "../emitters/swift.mjs";
import { EmitterError, renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { codeUnitCompare } from "../lib/naming.mjs";
import { fixtureSources, replaceOnce, repoSources } from "./helpers.mjs";

const CLIENT_LAYERS = new Set(["client", "both"]);
const edgeIr = (options = {}) => buildIr(fixtureSources(options));

/** The value of the multi-line string literal that follows `document: ` in the descriptor for `id`. */
function documentLiteral(operations, id) {
  const start = operations.indexOf(`"${id}": GraphQLOperationDescriptor(`);
  assert.notEqual(start, -1, id);
  const open = operations.indexOf('document: """\n', start) + 'document: """\n'.length;
  const close = /\n( *)"""/g;
  close.lastIndex = open;
  const end = close.exec(operations);
  const pad = end[1];
  return operations.slice(open, end.index).split("\n").map(line => {
    assert.ok(line === "" || line.startsWith(pad), `${id}: ${JSON.stringify(line)} is not indented like the closing delimiter`);
    return line.slice(pad.length);
  }).join("\n");
}

test("Swift names keep GraphQL names, prefix reserved type names and escape keywords", () => {
  assert.equal(swiftTypeName("Message"), "Message");
  assert.equal(swiftTypeName("Operation"), "ConvoHopOperation", "Foundation declares Operation");
  assert.equal(swiftTypeName("JSONValue"), "ConvoHopJSONValue", "the generated support types keep their names");
  assert.equal(swiftIdentifier("repeat"), "`repeat`");
  assert.equal(swiftIdentifier("type"), "type");
  assert.throws(() => swiftIdentifier("a-b"), new EmitterError('swift: "a-b" is not a Swift identifier'));
  assert.equal(swiftString('a"b\\c\n\r\t\u0001\u007f|é'), '"a\\"b\\\\c\\n\\r\\t\\u{1}\\u{7f}|é"');
});

test("Types.swift declares only the types client operations reach, mapping scalars by representation", () => {
  const types = renderSwiftTypes(edgeIr());
  const declared = [...types.matchAll(/^public (?:struct|enum) (\w+)/gm)].map(match => match[1]);
  assert.deepEqual(declared.slice(0, 2), ["JSONValue", "NoInput"]);
  assert.deepEqual(declared.slice(2), [...declared.slice(2)].sort((a, b) => a.localeCompare(b, "en", { numeric: true })));
  for (const name of ["Capabilities", "ContextInput", "Event", "EventPage", "Fruit", "HTTPMethod", "Item", "ItemPage", "Receipt"]) assert.ok(declared.includes(name), name);
  for (const name of ["Job", "JobInput", "RedeemInput", "StartJobInput", "StartJobPayload"]) assert.ok(!declared.includes(name), `${name} is server-only`);
  assert.match(types, /public var sequence: String\n/, "Counter is a decimal string");
  assert.match(types, /public var limit: Int\n/, "PageSize is an integer");
  assert.match(types, /public var weight: Double\?\n/);
  assert.match(types, /public var grid: \[\[Int\]\?\]\n/);
  assert.match(types, /public var history: \[\[Fruit\?\]\]\?\n/);
  assert.match(types, /wssUrl: String\? = nil,\n/, "optional fields default to nil in the initializer");
  assert.match(types, /^\/\/ Generated from the current unversioned GraphQL schemas\. Run npm run generate:graphql\.\n/);
  assert.ok(types.endsWith("}\n") && !types.includes("\r"));
});

test("enums keep schema order and raw values, and deprecations stay in doc comments", () => {
  const types = renderSwiftTypes(edgeIr());
  const fruit = /public enum Fruit: String, Codable, Hashable, Sendable, CaseIterable \{\n([\s\S]*?)\n\}/.exec(types)[1];
  assert.deepEqual([...fruit.matchAll(/case (\w+) = "(\w+)"/g)].map(match => [match[1], match[2]]), [
    ["banana", "BANANA"], ["apple", "APPLE"], ["cherry", "cherry"], ["apple10", "apple10"], ["apple9", "apple9"], ["date", "DATE"], ["elder", "ELDER"],
  ]);
  assert.match(fruit, /\/\/\/ - Note: Deprecated\. No longer supported\.\n {4}case date/);
  assert.match(fruit, /\/\/\/ Elderberries\.\n {4}\/\/\/\n {4}\/\/\/ - Note: Deprecated\. Use APPLE\.\n {4}case elder/);
  const operations = renderSwiftOperations(edgeIr());
  assert.match(operations, /\/\/\/ - Note: Deprecated\. Use capabilities\.\n {4}public static let alphaFetchHttpStatus/);
  assert.ok(![types, operations].some(text => text.includes("@available")), "availability attributes break synthesized conformances");
});

test("Operations.swift types every client operation in IR order and reproduces its document exactly", () => {
  const ir = edgeIr();
  const operations = renderSwiftOperations(ir);
  const client = ir.operations.filter(operation => CLIENT_LAYERS.has(operation.layer));
  const typed = [...operations.matchAll(/public static let (\w+) = GraphQLOperation<(.+)>\(\n {8}GraphQLCatalog\.operations\["([\w.]+)"\]!\)/g)];
  assert.deepEqual(typed.map(match => match[3]), client.map(operation => operation.id));
  assert.deepEqual(Object.fromEntries(typed.map(match => [match[1], match[2]])), {
    alphaCapabilities: "NoInput, Capabilities",
    alphaResolveRequest: "ResolveInput, Receipt",
    alphaItems: "ItemsInput, ItemPage",
    alphaEvents: "EventsInput, EventPage",
    alphaFetchHttpStatus: "FetchInput, Int?",
    alphaPing: "PingInput, Bool",
    alphaEventStream: "EventsInput, EventPage",
  });
  for (const operation of client) assert.equal(documentLiteral(operations, operation.id), operation.document.text, operation.id);
  assert.ok(!operations.includes('"alpha.startJob"'), "server-only operations are not in the client catalog");
  assert.match(operations, /"alpha\.items": GraphQLOperationDescriptor\([\s\S]*?inputFields: \["limit", "cursor", "fruits", "minWeight", "includeDeprecated", "method", "box", "legacyFilter", "item2", "item10"\],\n {12}idempotency: \.safe,/);
  assert.match(operations, /"alpha\.ping": GraphQLOperationDescriptor\([\s\S]*?idempotency: \.ephemeral,/);
  assert.match(operations, /public static let permitBound = GraphQLIdempotency\(\n {8}name: "permitBound", retry: \.sameRequest, resolvable: false, retryBudget: GraphQLRetryBudget\(maxAttempts: \d+, windowMs: \d+\)\)/);
  assert.match(operations, /GraphQLContextField\(name: "permit", use: \.forbidden\)/);
});

test("output shapes cover exactly the output types, and error codes cover the client operations", () => {
  const ir = edgeIr();
  const operations = renderSwiftOperations(ir);
  const shapes = [...operations.matchAll(/^ {8}"(\w+)": \.(scalar|enumeration|object)\(/gm)].map(match => match[1]);
  assert.deepEqual(shapes, [...shapes].sort((a, b) => a.localeCompare(b, "en", { numeric: true })));
  for (const name of ["Boolean", "Capabilities", "Counter", "Event", "EventPage", "Fruit", "Int", "Item", "ItemPage", "Receipt"]) assert.ok(shapes.includes(name), name);
  for (const name of ["ContextInput", "ItemsInput", "Job", "Blob"]) assert.ok(!shapes.includes(name), `${name} is not a client output`);
  assert.match(operations, /"Item": \.object\(\[\n {12}GraphQLOutputField\(name: "id", type: "ID!"\),/);
  assert.match(operations, /"Fruit": \.enumeration\(\["BANANA", "APPLE", "cherry", "apple10", "apple9", "DATE", "ELDER"\]\)/);

  const client = ir.operations.filter(operation => CLIENT_LAYERS.has(operation.layer));
  const expected = ir.errors.codes.filter(code => code.origin === "sdk" || client.some(operation => operation.errors?.codes.includes(code.name)))
    .map(code => code.name).sort(codeUnitCompare);
  const declared = [...operations.matchAll(/ConvoHopErrorCode\(rawValue: "(\w+)"\)/g)].map(match => match[1]);
  assert.deepEqual(declared, expected);
  assert.match(operations, /enum GraphQLRealtime \{[\s\S]*static let eventStream = GraphQLRealtimeChannel\([\s\S]*connectionInit: \["tenant", "token"\],[\s\S]*jitterMs: 0,\n {8}terminalCloseCodes: \[4401, 4403\]\n/);
});

test("keyword fields are escaped and reserved type names are prefixed throughout", () => {
  const ir = edgeIr({
    planes: { alpha: text => replaceOnce(text, "input PingInput {\n  note: String\n}", "input PingInput {\n  repeat: Int\n}").replaceAll(/\bReceipt\b/g, "Result") },
  });
  const types = renderSwiftTypes(ir);
  const operations = renderSwiftOperations(ir);
  assert.match(types, /public var `repeat`: Int\?\n/);
  assert.match(types, /self\.`repeat` = `repeat`\n/);
  assert.match(types, /public struct ConvoHopResult: Codable, Hashable, Sendable \{/);
  assert.match(operations, /public static let alphaResolveRequest = GraphQLOperation<ResolveInput, ConvoHopResult>/);
  assert.match(operations, /resultType: "Result!"/, "the catalog keeps GraphQL type names");
  assert.match(operations, /"Result": \.object\(/);
});

test("the Swift emitter rejects schemas whose names collide in Swift", () => {
  const values = edgeIr({ planes: { alpha: text => replaceOnce(text, "  apple9\n", "  apple9\n  bananaSplit\n  BANANA_SPLIT\n") } });
  assert.throws(() => renderSwiftTypes(values), new EmitterError('swift: enum Fruit values "bananaSplit" and "BANANA_SPLIT" both map to bananaSplit'));
  const types = edgeIr({ planes: { alpha: text => text.replaceAll(/\bReceipt\b/g, "Result").replaceAll(/\bSubjectRef\b/g, "ConvoHopResult") } });
  assert.throws(() => renderSwiftTypes(types), new EmitterError('swift: types "ConvoHopResult" and "Result" both map to ConvoHopResult'));
});

test("the repository renders one typed operation per client operation into the configured directory", () => {
  const ir = buildIr(repoSources());
  const files = renderEmitters(ir, [swift]);
  assert.deepEqual(files.map(file => file.path), [`${DEFAULT_DIRECTORY}/Types.swift`, `${DEFAULT_DIRECTORY}/Operations.swift`]);
  const operations = files[1].contents;
  const client = ir.operations.filter(operation => CLIENT_LAYERS.has(operation.layer)).map(operation => operation.id);
  assert.deepEqual([...operations.matchAll(/GraphQLCatalog\.operations\["([\w.]+)"\]!\)/g)].map(match => match[1]), client);
  assert.ok(client.length > 0 && client.every(id => id.startsWith("communication.")), "client operations are on the communication plane");
  assert.match(files[0].contents, /public struct ConvoHopOperation: Codable, Hashable, Sendable \{/);
});
