import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { EmitterError } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { dartClassName, dartMemberName, dartString, renderDart } from "../emitters/dart.mjs";
import { fixtureSources, replaceOnce } from "./helpers.mjs";

const edgeIr = () => structuredClone(buildIr(fixtureSources()));
const renderFiles = ir => Object.fromEntries(renderDart(ir, "out").map(file => [basename(file.path), file.contents]));
/** Renders the edge fixture after adding `fields` to ItemPage, which alpha.items returns, and appending `types`. */
const renderWithItemPage = (fields, types = "") => renderDart(buildIr(fixtureSources({
  planes: { alpha: text => `${replaceOnce(text, "type ItemPage {\n", `type ItemPage {\n${fields}`)}\n${types}` },
})));

test("Dart names follow Dart conventions and avoid reserved words", () => {
  assert.equal(dartClassName("HTTPMethod"), "HttpMethod");
  assert.equal(dartClassName("Box_3dInput"), "Box3dInput");
  assert.throws(() => dartClassName("_9"), new EmitterError('dart: type "_9" has no Dart class name'));
  assert.deepEqual(["GET", "fetchHTTPStatus", "type", "on", "class", "await", "toJson", "hashCode"].map(name => dartMemberName(name)),
    ["get", "fetchHttpStatus", "type", "on", "classValue", "awaitValue", "toJsonValue", "hashCodeValue"]);
  assert.throws(() => dartMemberName("_9"), new EmitterError('dart: "_9" has no Dart identifier'));
  assert.equal(dartString("a'b$c\\d\ne\u0001"), "'a\\'b\\$c\\\\d\\ne\\u{1}'");
  assert.throws(() => dartString("\ud800"), EmitterError);
});

test("the Dart emitter generates only what a user session can run", () => {
  const ir = edgeIr();
  const catalog = renderFiles(ir)["catalog.dart"];
  const generated = [...catalog.matchAll(/^ {2}'([a-z]+\.[A-Za-z]+)': Operations\./gm)].map(match => match[1]);
  assert.deepEqual(generated, ir.operations.filter(operation => operation.layer !== "server").map(operation => operation.id));
  const models = renderFiles(ir)["models.dart"];
  assert.doesNotMatch(models, /class (Job|StartJobInput|ContextInput)\b/, "server-only types and the context argument are not generated");
  assert.match(models, /^ {2}get\('GET'\);$/m);
});

test("every generated Dart file opts out of dart format, so formatting a package leaves it as emitted", () => {
  for (const file of renderDart(edgeIr())) assert.match(file.contents, /^\/\/ Generated [^\n]*\n\/\/ dart format off\n/, file.path);
});

test("the Dart emitter rejects names that would collide or shadow Dart names", () => {
  assert.throws(() => renderWithItemPage("  class: String\n  classValue: String\n"),
    new EmitterError("dart: type ItemPage: class and classValue both become classValue"));
  assert.throws(() => renderWithItemPage("  a: Box_3d\n  b: Box3d\n", "type Box_3d { x: Int }\ntype Box3d { y: Int }\n"),
    new EmitterError("dart: types Box_3d and Box3d both become Box3d"));
  assert.throws(() => renderWithItemPage("  stamp: Duration\n", "type Duration { ms: Int }\n"),
    new EmitterError("dart: type Duration would shadow the Dart name Duration"));
  assert.throws(() => renderWithItemPage("  operations: Operations\n", "type Operations { ok: Boolean }\n"),
    new EmitterError("dart: type Operations would shadow the Dart name Operations"));
});

test("the Dart emitter rejects scalars it cannot decode faithfully", () => {
  const withCounter = change => {
    const ir = edgeIr();
    change(ir.types.find(type => type.name === "Counter"));
    return () => renderDart(ir);
  };
  assert.throws(withCounter(type => { type.representation = "bigint"; }),
    new EmitterError('dart: scalar Counter has unsupported representation "bigint"'));
  assert.throws(withCounter(type => { type.constraints = { ...type.constraints, maxLength: 3 }; }),
    new EmitterError("dart: scalar Counter has unsupported constraint maxLength"));
  assert.throws(withCounter(type => { type.constraints = { ...type.constraints, maximumDecimal: "01" }; }),
    new EmitterError("dart: scalar Counter maximumDecimal must be a canonical decimal string"));
});

const USAGE = `import 'generated.dart';

final class FakeAlpha extends AlphaOperations {
  FakeAlpha(this.responses);

  final Map<String, Object?> responses;
  final calls = <(String, Map<String, Object?>, String?)>[];

  @override
  Future<T> execute<T>(OperationSpec<T> operation, Map<String, Object?> input, {String? requestId}) async {
    calls.add((operation.id, input, requestId));
    return operation.decode(responses[operation.id]);
  }
}

void check(bool condition, String message) {
  if (!condition) throw StateError(message);
}

void rejects(Object? Function() decode, String path, [String? value]) {
  try {
    decode();
  } on FormatException catch (error) {
    check(error.message.startsWith('Malformed GraphQL response: \$path '), 'expected \$path, got \${error.message}');
    check(value == null || !error.message.contains(value), 'errors must not echo values');
    return;
  }
  throw StateError('expected a FormatException at \$path');
}

Map<String, Object?> item([Map<String, Object?> changes = const {}]) => <String, Object?>{
      'id': 'i1',
      'name': 'Pear',
      'fruit': 'APPLE',
      'weight': 1,
      'ripe': true,
      'oldName': null,
      'legacyCode': null,
      'grid': <Object?>[<Object?>[1, 2], null],
      'aliases': <Object?>['a', null],
      'history': <Object?>[<Object?>['cherry', null]],
      ...changes,
    };

Map<String, Object?> event(String sequence) => <String, Object?>{
      'sequence': sequence,
      'type': 'item.changed',
      'subjectRef': <String, Object?>{'kind': 'item', 'id': 'i1'},
      'payload': <String, Object?>{'itemId': 'i1', 'jobId': null, 'revision': null, 'note': null},
    };

Future<void> main() async {
  final alpha = FakeAlpha(<String, Object?>{
    'alpha.items': <String, Object?>{'items': <Object?>[item()], 'complete': true, 'refreshRequired': false, 'nextCursor': null},
    'alpha.ping': true,
    'alpha.capabilities': <String, Object?>{'version': '1', 'wssUrl': null, 'features': <Object?>[]},
  });
  final page = await alpha.items(
    const ItemsInput(fruits: <Fruit>[Fruit.apple], method: HttpMethod.get, box: Box3dInput(width: 1, height: 2, depth: 3)),
    requestId: 'r1',
  );
  final decoded = page.items.single;
  check(decoded.fruit == Fruit.apple && decoded.weight == 1.0 && decoded.grid[1] == null, 'decodes values');
  check(decoded.history!.single[0] == Fruit.cherry && decoded.history!.single[1] == null, 'decodes nested nullable enums');
  check(decoded.toJson()['history'].toString() == '[[cherry, null]]', 'encodes enums by wire value');
  final (id, input, requestId) = alpha.calls.single;
  check(id == 'alpha.items' && requestId == 'r1', 'passes the operation and request ID');
  check(input['method'] == 'GET' && input['fruits'].toString() == '[APPLE]', 'encodes enum inputs');
  check((input['box'] as Map<String, Object?>)['depth'] == 3.0, 'encodes nested inputs');
  check(!input.containsKey('limit') && !input.containsKey('cursor'), 'omits null inputs');
  check(await alpha.ping() && alpha.calls.last.\$2.isEmpty, 'sends empty optional input');
  check((await alpha.capabilities()).features.isEmpty, 'decodes empty lists');
  check(Event.fromJson(event('9223372036854775807')).sequence == '9223372036854775807', 'keeps counters as strings');
  check(Item.fromJson(Map<Object?, Object?>.from(item())).name == 'Pear', 'accepts maps with string keys');

  rejects(() => Item.fromJson(item()..remove('oldName')), r'$.oldName');
  rejects(() => Item.fromJson(item({'ripe': null})), r'$.ripe');
  rejects(() => Item.fromJson(item({'fruit': 'KIWI'})), r'$.fruit', 'KIWI');
  rejects(() => Item.fromJson(item({'grid': <Object?>[<Object?>[9007199254740992]]})), r'$.grid[0][0]');
  rejects(() => Item.fromJson(item({'weight': double.nan})), r'$.weight');
  rejects(() => Item.fromJson(item({'aliases': List<Object?>.filled(101, 'a')})), r'$.aliases');
  rejects(() => Item.fromJson(<Object?, Object?>{1: 'x'}), r'$');
  rejects(() => Event.fromJson(event('01')), r'$.sequence', '01');
  rejects(() => Event.fromJson(event('9223372036854775808')), r'$.sequence', '9223372036854775808');
  rejects(() => Operations.alphaItems.decode(null), r'$');
  rejects(() => Fruit.fromJson('apple'), r'$');

  check(operationCatalog['alpha.items'] == Operations.alphaItems, 'catalogs operations by ID');
  check(Operations.alphaItems.document.startsWith('query AlphaItems(\\$context: ContextInput!'), 'keeps documents');
  check(Operations.alphaPing.idempotency == IdempotencyClasses.ephemeral, 'links idempotency classes');
  check(Operations.alphaItems.contextFields['requestId'] == 'required', 'lists context rules');
  check(realtimeChannels['eventStream']!.terminalCloseCodes.contains(4401), 'describes realtime channels');
  check(realtimeEvents['job.finished']!.requiredFields.contains('revision'), 'describes realtime events');
  check(errorCodes.values.every((spec) => spec.code.isNotEmpty), 'describes error codes');
}
`;

test("the generated Dart analyzes cleanly, survives dart format and decodes like the TypeScript validator", {
  skip: process.env.SDKGEN_DART !== "1" && "set SDKGEN_DART=1 to analyze and run the generated Dart with the Dart SDK",
}, t => {
  const root = mkdtempSync(join(tmpdir(), "sdkgen-dart-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = renderFiles(buildIr(fixtureSources()));
  for (const [name, contents] of Object.entries(files)) writeFileSync(join(root, name), contents);
  writeFileSync(join(root, "usage.dart"), USAGE);
  const dart = args => spawnSync("dart", args, { cwd: root, encoding: "utf8" });
  const analyze = dart(["analyze", "--fatal-infos", "--fatal-warnings", "."]);
  assert.equal(analyze.status, 0, `dart analyze failed:\n${analyze.stdout}${analyze.stderr}`);
  const format = dart(["format", "--output=none", "--set-exit-if-changed", ...Object.keys(files)]);
  assert.equal(format.status, 0, `dart format would rewrite the generated Dart:\n${format.stdout}${format.stderr}`);
  const run = dart(["run", "usage.dart"]);
  assert.equal(run.status, 0, `the usage checks failed:\n${run.stdout}${run.stderr}`);
});
