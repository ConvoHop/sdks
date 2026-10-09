import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ExtractError, PACKAGE, PACKAGE_CONFIG, SCRIPT, extractCommand, extractDart, pubGetCommand } from "../extractors/dart.mjs";
import { REPO_ROOT } from "./helpers.mjs";

const ROOT = "/repo/";
const LANGUAGE_FILE = "docs/languages/flutter/language.json";
const SURFACE = '{"language":"flutter","packages":[]}\n';
const PUB_GET = `dart pub get --directory ${PACKAGE}`;
const EXTRACT = `dart ${SCRIPT}`;

function fails(action, message) {
  assert.throws(action, error => {
    assert.ok(error instanceof ExtractError, error.stack);
    assert.equal(error.message, message);
    return true;
  });
}

test("the extractor gets its locked dependencies and runs on the language file from the root", () => {
  assert.deepEqual(pubGetCommand(), ["dart", "--suppress-analytics", "pub", "get", "--enforce-lockfile", "--directory", PACKAGE]);
  assert.deepEqual(extractCommand(ROOT, LANGUAGE_FILE), ["dart", `--packages=${PACKAGE_CONFIG}`, SCRIPT, ROOT, `/repo/${LANGUAGE_FILE}`]);
  assert.deepEqual(extractCommand(ROOT, "/elsewhere/language.json"), ["dart", `--packages=${PACKAGE_CONFIG}`, SCRIPT, ROOT, "/elsewhere/language.json"]);
});

test("the extractor package commits its lockfile and ignores what pub writes", () => {
  assert.match(readFileSync(join(REPO_ROOT, PACKAGE, "pubspec.yaml"), "utf8"), /^name: convohop_docgen_dart$/m);
  assert.ok(existsSync(join(REPO_ROOT, PACKAGE, "pubspec.lock")));
  assert.ok(existsSync(join(REPO_ROOT, SCRIPT)));
  assert.equal(PACKAGE_CONFIG, `${PACKAGE}/.dart_tool/package_config.json`);
  assert.match(readFileSync(join(REPO_ROOT, PACKAGE, ".gitignore"), "utf8"), /^\.dart_tool\/$/m);
});

test("extractDart gets the dependencies, then returns the surface the extractor prints", () => {
  const calls = [];
  const surface = extractDart({
    root: ROOT,
    languageFile: LANGUAGE_FILE,
    run: (command, cwd, options) => {
      calls.push({ command, cwd, options });
      return { status: 0, signal: null, stdout: options.capture ? SURFACE : null };
    },
  });
  assert.equal(surface, SURFACE);
  assert.deepEqual(calls, [
    { command: pubGetCommand(), cwd: ROOT, options: { capture: false } },
    { command: extractCommand(ROOT, LANGUAGE_FILE), cwd: ROOT, options: { capture: true } },
  ]);
});

test("extractDart fails when pub or the extractor fails, can't start or prints nothing", () => {
  const extract = (pubGet, run) => () => {
    const results = [pubGet, run];
    return extractDart({ root: ROOT, languageFile: LANGUAGE_FILE, run: () => results.shift() });
  };
  const ok = { status: 0, signal: null, stdout: SURFACE };
  const enoent = { error: new Error("spawnSync dart ENOENT") };
  fails(extract(enoent), `couldn't run ${PUB_GET}: spawnSync dart ENOENT`);
  fails(extract({ status: 65, signal: null }), `${PUB_GET} exited with code 65`);
  fails(extract(ok, enoent), `couldn't run ${EXTRACT}: spawnSync dart ENOENT`);
  fails(extract(ok, { status: 1, signal: null, stdout: SURFACE }), `${EXTRACT} exited with code 1`);
  fails(extract(ok, { status: null, signal: "SIGTERM", stdout: "" }), `${EXTRACT} exited with SIGTERM`);
  fails(extract(ok, { status: 0, signal: null, stdout: "" }), `${EXTRACT} printed no surface`);
});

test("the extractor command takes one language file", () => {
  for (const args of [[], [LANGUAGE_FILE, LANGUAGE_FILE]]) {
    const result = spawnSync(process.execPath, ["tools/docgen/extractors/dart.mjs", ...args], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "usage: node tools/docgen/extractors/dart.mjs <language.json>\n");
  }
});

test("the flutter language runs this extractor on its own language file", () => {
  const language = JSON.parse(readFileSync(join(REPO_ROOT, LANGUAGE_FILE), "utf8"));
  assert.deepEqual(language.extract.command, ["node", "tools/docgen/extractors/dart.mjs", LANGUAGE_FILE]);
});
