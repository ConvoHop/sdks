import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { EXECUTABLE, ExtractError, PACKAGE, PRODUCT, buildCommand, extractCommand, extractSwift } from "../extractors/swift.mjs";
import { REPO_ROOT } from "./helpers.mjs";

const ROOT = "/repo/";
const LANGUAGE_FILE = "docs/languages/swift/language.json";
const SURFACE = '{"language":"swift","packages":[]}\n';
const BUILD = `swift build --package-path ${PACKAGE}`;

function fails(action, message) {
  assert.throws(action, error => {
    assert.ok(error instanceof ExtractError, error.stack);
    assert.equal(error.message, message);
    return true;
  });
}

test("the extractor builds from its lockfile and runs on the language file from the root", () => {
  assert.deepEqual(buildCommand(), ["swift", "build", "--package-path", PACKAGE, "--product", PRODUCT, "--force-resolved-versions", "--disable-keychain"]);
  assert.deepEqual(extractCommand(ROOT, LANGUAGE_FILE), [`/repo/${EXECUTABLE}`, ROOT, `/repo/${LANGUAGE_FILE}`]);
  assert.deepEqual(extractCommand(ROOT, "/elsewhere/language.json"), [`/repo/${EXECUTABLE}`, ROOT, "/elsewhere/language.json"]);
});

test("the extractor package commits its lockfile and ignores what SwiftPM writes", () => {
  const manifest = readFileSync(join(REPO_ROOT, PACKAGE, "Package.swift"), "utf8");
  assert.match(manifest, /\.executable\(name: "swift-surface", targets: \["swift-surface"\]\)/);
  assert.match(manifest, /\.package\(url: "https:\/\/github\.com\/swiftlang\/swift-syntax\.git", exact: "[0-9.]+"\)/);
  const resolved = JSON.parse(readFileSync(join(REPO_ROOT, PACKAGE, "Package.resolved"), "utf8"));
  assert.deepEqual(resolved.pins.map(pin => pin.identity), ["swift-syntax"]);
  assert.equal(resolved.pins[0].state.version, manifest.match(/swift-syntax\.git", exact: "([0-9.]+)"/)[1]);
  assert.ok(existsSync(join(REPO_ROOT, PACKAGE, "Sources", PRODUCT, "main.swift")));
  assert.equal(EXECUTABLE, `${PACKAGE}/.build/debug/${PRODUCT}`);
  const ignored = readFileSync(join(REPO_ROOT, PACKAGE, ".gitignore"), "utf8");
  assert.match(ignored, /^\.build\/$/m);
  assert.match(ignored, /^\.swiftpm\/$/m);
});

test("extractSwift builds the extractor, then returns the surface it prints", () => {
  const calls = [];
  const surface = extractSwift({
    root: ROOT,
    languageFile: LANGUAGE_FILE,
    run: (command, cwd, options) => {
      calls.push({ command, cwd, options });
      return { status: 0, signal: null, stdout: options.capture ? SURFACE : null };
    },
  });
  assert.equal(surface, SURFACE);
  assert.deepEqual(calls, [
    { command: buildCommand(), cwd: ROOT, options: { capture: false } },
    { command: extractCommand(ROOT, LANGUAGE_FILE), cwd: ROOT, options: { capture: true } },
  ]);
});

test("extractSwift fails when the build or the extractor fails, can't start or prints nothing", () => {
  const extract = (build, run) => () => {
    const results = [build, run];
    return extractSwift({ root: ROOT, languageFile: LANGUAGE_FILE, run: () => results.shift() });
  };
  const ok = { status: 0, signal: null, stdout: SURFACE };
  fails(extract({ error: new Error("spawnSync swift ENOENT") }), `couldn't run ${BUILD}: spawnSync swift ENOENT`);
  fails(extract({ status: 1, signal: null }), `${BUILD} exited with code 1`);
  fails(extract(ok, { error: new Error(`spawnSync /repo/${EXECUTABLE} ENOENT`) }), `couldn't run ${EXECUTABLE}: spawnSync /repo/${EXECUTABLE} ENOENT`);
  fails(extract(ok, { status: 1, signal: null, stdout: SURFACE }), `${EXECUTABLE} exited with code 1`);
  fails(extract(ok, { status: null, signal: "SIGTERM", stdout: "" }), `${EXECUTABLE} exited with SIGTERM`);
  fails(extract(ok, { status: 0, signal: null, stdout: "" }), `${EXECUTABLE} printed no surface`);
});

test("the extractor command takes one language file", () => {
  for (const args of [[], [LANGUAGE_FILE, LANGUAGE_FILE]]) {
    const result = spawnSync(process.execPath, ["tools/docgen/extractors/swift.mjs", ...args], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "usage: node tools/docgen/extractors/swift.mjs <language.json>\n");
  }
});

test("the swift language runs this extractor on its own language file", () => {
  const language = JSON.parse(readFileSync(join(REPO_ROOT, LANGUAGE_FILE), "utf8"));
  assert.deepEqual(language.extract.command, ["node", "tools/docgen/extractors/swift.mjs", LANGUAGE_FILE]);
});
