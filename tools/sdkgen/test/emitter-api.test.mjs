import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import config from "../sdkgen.config.mjs";
import { EmitterError, assertSafePath, defineEmitter, listEmittableFiles, renderEmitters, runEmitters, syncFiles } from "../lib/emitter.mjs";
import { listTree } from "./helpers.mjs";

const IR = { operations: [{ id: "alpha.ping", document: { text: "query AlphaPing { ping }" } }] };
const emitter = (name, emit, extra = {}) => defineEmitter({ name, description: `${name} files`, emit, ...extra });
const constant = (name, files, extra) => emitter(name, () => files, extra);
const emitterError = message => error => error instanceof EmitterError && error.message === message;

function tempRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "sdkgen-emitter-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, path, contents) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), contents);
}

test("defineEmitter validates the definition and returns a frozen emitter", () => {
  const emit = () => [];
  const owns = ["generated/python"];
  const defined = defineEmitter({ name: "python-models", description: "Python models", owns, emit });
  assert.deepEqual({ ...defined }, { name: "python-models", description: "Python models", owns: ["generated/python"], emit });
  assert.ok(Object.isFrozen(defined) && Object.isFrozen(defined.owns));
  owns.push("elsewhere");
  assert.deepEqual(defined.owns, ["generated/python"]);
  assert.deepEqual(emitter("x2", emit).owns, []);

  const cases = [
    [null, "defineEmitter expects an object"],
    [{ name: "x", description: "d", emit, output: "dir", root: "." }, 'emitter "x": unknown option(s) output, root'],
    [{ name: "PythonModels", description: "d", emit }, 'emitter name must be kebab-case, got "PythonModels"'],
    [{ name: "python--models", description: "d", emit }, 'emitter name must be kebab-case, got "python--models"'],
    [{ description: "d", emit }, "emitter name must be kebab-case, got undefined"],
    [{ name: "x", description: " ", emit }, 'emitter "x" needs a description'],
    [{ name: "x", description: "d", owns: "generated", emit }, 'emitter "x": owns must be an array of directories'],
    [{ name: "x", description: "d", owns: ["../generated"], emit },
      'emitter "x" owns: unsafe path "../generated"; use a relative POSIX path whose segments use only letters, digits and _.@+=,- and do not start with a dot'],
    [{ name: "x", description: "d", emit: "files" }, 'emitter "x" needs an emit(ir, options) function'],
  ];
  for (const [definition, message] of cases) assert.throws(() => defineEmitter(definition), emitterError(message), message);
});

test("assertSafePath accepts only relative POSIX paths without dot segments", () => {
  for (const path of ["a", "docs/snippets/alpha/fetchHTTPStatus.md", "packages/@scope/pkg/graphql-types.ts", "a/b_c+d=e,f-g.h", "a/b..c"]) {
    assert.equal(assertSafePath(path, "test"), path);
  }
  for (const path of ["", "/abs/file", "a//b", "a/", "./a", "a/../b", "..", ".github/workflows/ci.yml", "a\\b", "C:/a", "a b", "naïve.md", "a/.hidden"]) {
    assert.throws(() => assertSafePath(path, "test"), EmitterError, JSON.stringify(path));
  }
  assert.throws(() => assertSafePath(7, "label"), emitterError("label: path must be a non-empty string"));
});

test("renderEmitters runs emitters in order on a frozen copy of the IR with their own options", () => {
  const seen = [];
  const first = emitter("first", (ir, options) => {
    seen.push(["first", options, Object.isFrozen(ir), Object.isFrozen(ir.operations[0].document)]);
    assert.throws(() => ir.operations.push({}), TypeError);
    return [{ path: "out/b.txt", contents: "b\n" }, { path: "out/a.txt", contents: "a\n" }];
  });
  const second = emitter("second", (_ir, options) => {
    seen.push(["second", options]);
    return [{ path: "other/c.txt", contents: "c\n" }];
  });
  const files = renderEmitters(IR, [first, second], { options: { first: { flag: true } } });
  assert.deepEqual(files, [
    { emitter: "first", path: "out/b.txt", contents: "b\n" },
    { emitter: "first", path: "out/a.txt", contents: "a\n" },
    { emitter: "second", path: "other/c.txt", contents: "c\n" },
  ]);
  assert.deepEqual(seen, [["first", { flag: true }, true, true], ["second", {}]]);
  assert.equal(Object.isFrozen(IR), false);
  assert.deepEqual(renderEmitters(IR, []), []);
});

test("renderEmitters rejects invalid emitters and output with a precise message", () => {
  const file = (path, contents = "x\n") => ({ path, contents });
  const cases = [
    [[{ name: "plain", emit: () => [] }], "emitters must be created with defineEmitter (got \"plain\")"],
    [[constant("same", []), constant("same", [])], 'emitter names must be unique; "same" is registered twice'],
    [[emitter("bad", () => ({ path: "a", contents: "x\n" }))], 'emitter "bad" must return an array of { path, contents }'],
    [[constant("bad", [{ path: "a", contents: "x\n", mode: 0o644 }])], 'emitter "bad" returned an entry that is not exactly { path, contents }'],
    [[constant("bad", [{ path: "a" }])], 'emitter "bad" returned an entry that is not exactly { path, contents }'],
    [[constant("bad", [file("../a")])],
      'emitter "bad": unsafe path "../a"; use a relative POSIX path whose segments use only letters, digits and _.@+=,- and do not start with a dot'],
    [[constant("bad", [{ path: "a", contents: Buffer.from("x\n") }])], 'emitter "bad": a: contents must be a string'],
    [[constant("bad", [file("a", "x")])], 'emitter "bad": a: contents must end with a newline'],
    [[constant("bad", [file("a", "x\r\ny\n")])], 'emitter "bad": a: use LF line endings'],
    [[constant("one", [file("a")]), constant("two", [file("a")])], 'a is emitted by both "one" and "two"'],
    [[constant("one", [file("a"), file("a")])], 'emitter "one" emits a twice'],
    [[constant("one", [file("docs/Readme.md")]), constant("two", [file("docs/README.md")])],
      "docs/README.md and docs/Readme.md differ only in letter case and would collide on case-insensitive file systems"],
    [[constant("snippets", [file("docs/snippets/index.json")], { owns: ["docs/snippets"] }), constant("intruder", [file("docs/snippets/extra.md")])],
      'emitter "intruder" emits docs/snippets/extra.md inside docs/snippets, which emitter "snippets" owns'],
  ];
  for (const [emitters, message] of cases) assert.throws(() => renderEmitters(IR, emitters), emitterError(message), message);
  assert.doesNotThrow(() => renderEmitters(IR, [constant("snippets", [file("docs/snippets-extra.md")], { owns: ["docs/snippets"] })]));
});

test("syncFiles writes changed files, reports drift in check mode and removes stale owned files", t => {
  const root = tempRoot(t);
  const files = [{ path: "gen/a.txt", contents: "a\n" }, { path: "gen/nested/b.txt", contents: "b\n" }, { path: "loose.txt", contents: "c\n" }];
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"] }), { written: ["gen/a.txt", "gen/nested/b.txt", "loose.txt"], unchanged: [], removed: [], drift: [] });
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"], check: true }),
    { written: [], unchanged: ["gen/a.txt", "gen/nested/b.txt", "loose.txt"], removed: [], drift: [] });

  write(root, "gen/a.txt", "edited\n");
  rmSync(join(root, "loose.txt"));
  write(root, "gen/z-stale.txt", "old\n");
  write(root, "gen/nested/old.txt", "old\n");
  write(root, "unowned.txt", "kept\n");
  const before = listTree(root);
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"], check: true }), {
    written: [], unchanged: ["gen/nested/b.txt"], removed: [],
    drift: ["gen/a.txt", "loose.txt (missing)", "gen/nested/old.txt (stale)", "gen/z-stale.txt (stale)"],
  });
  assert.deepEqual(listTree(root), before, "check mode must not write");
  assert.equal(readFileSync(join(root, "gen/a.txt"), "utf8"), "edited\n");

  assert.deepEqual(syncFiles(root, files, { owns: ["gen", "missing-dir"] }), {
    written: ["gen/a.txt", "loose.txt"], unchanged: ["gen/nested/b.txt"], removed: ["gen/nested/old.txt", "gen/z-stale.txt"], drift: [],
  });
  assert.deepEqual(listTree(root), ["gen/a.txt", "gen/nested/b.txt", "loose.txt", "unowned.txt"]);
  assert.equal(readFileSync(join(root, "gen/a.txt"), "utf8"), "a\n");
});

test("syncFiles ignores entries no emitter could write, such as .DS_Store, editor files and dot-directories", t => {
  const root = tempRoot(t);
  const files = [{ path: "gen/a.txt", contents: "a\n" }];
  write(root, "gen/a.txt", "a\n");
  const foreign = ["gen/.DS_Store", "gen/.a.txt.swp", "gen/.cache/blob.txt", "gen/a.txt~", "gen/old/.DS_Store"];
  for (const path of foreign) write(root, path, "foreign\n");
  write(root, "gen/old/stale.txt", "old\n");
  assert.deepEqual(listEmittableFiles(root, "gen"), ["gen/a.txt", "gen/old/stale.txt"]);
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"], check: true }).drift, ["gen/old/stale.txt (stale)"]);
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"] }), { written: [], unchanged: ["gen/a.txt"], removed: ["gen/old/stale.txt"], drift: [] });
  assert.deepEqual(listTree(root), ["gen/.DS_Store", "gen/.a.txt.swp", "gen/.cache/blob.txt", "gen/a.txt", "gen/a.txt~", "gen/old/.DS_Store"]);
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"], check: true }).drift, []);
});

test("syncFiles replaces owned files and directories renamed only in letter case, then prunes empty directories", t => {
  // On case-insensitive file systems, the default on macOS and Windows, each old name is the same entry as its replacement.
  const root = tempRoot(t);
  write(root, "gen/AddMember.md", "same\n");
  write(root, "gen/Plane/ping.md", "old\n");
  write(root, "gen/gone/deep/x.md", "old\n");
  const files = [{ path: "gen/addMember.md", contents: "same\n" }, { path: "gen/plane/ping.md", contents: "new\n" }];
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"] }), {
    written: ["gen/addMember.md", "gen/plane/ping.md"], unchanged: [], removed: ["gen/AddMember.md", "gen/Plane/ping.md", "gen/gone/deep/x.md"], drift: [],
  });
  assert.deepEqual(readdirSync(join(root, "gen")).sort(), ["addMember.md", "plane"]);
  assert.deepEqual(readdirSync(join(root, "gen/plane")), ["ping.md"]);
  assert.equal(readFileSync(join(root, "gen/plane/ping.md"), "utf8"), "new\n");
  assert.deepEqual(syncFiles(root, files, { owns: ["gen"], check: true }).drift, []);
});

test("runEmitters renders and syncs with every emitter's owned directories", t => {
  const root = tempRoot(t);
  write(root, "owned/stale.txt", "old\n");
  const emitters = [constant("owner", [{ path: "owned/new.txt", contents: "new\n" }], { owns: ["owned"] }), constant("loose", [{ path: "loose.txt", contents: "x\n" }])];
  assert.deepEqual(runEmitters(IR, emitters, { root, check: true }).drift, ["owned/new.txt (missing)", "loose.txt (missing)", "owned/stale.txt (stale)"]);
  const result = runEmitters(IR, emitters, { root });
  assert.deepEqual(result, {
    files: [{ emitter: "owner", path: "owned/new.txt", contents: "new\n" }, { emitter: "loose", path: "loose.txt", contents: "x\n" }],
    written: ["owned/new.txt", "loose.txt"], unchanged: [], removed: ["owned/stale.txt"], drift: [],
  });
  assert.equal(existsSync(join(root, "owned/stale.txt")), false);
});

test("the configured emitters are valid and uniquely named", () => {
  assert.deepEqual(config.emitters.map(entry => entry.name), ["ir", "graphql-operations", "typescript", "doc-snippets", "java", "mcp-tools", "cli-operations", "python", "csharp", "go", "android", "dart"]);
  assert.ok(config.emitters.every(entry => Object.isFrozen(entry)));
  assert.deepEqual(Object.keys(config.options).filter(name => !config.emitters.some(entry => entry.name === name)), [], "options for unknown emitters");
});
