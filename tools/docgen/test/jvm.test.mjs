import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ExtractError, OUTPUT, extractJvm, extractorArguments, gradleCommand } from "../extractors/jvm.mjs";
import { REPO_ROOT, tempRoot, write } from "./helpers.mjs";

const LANGUAGE = Object.freeze({
  id: "jvm",
  packages: [
    { name: "com.example:server", source: "jvm/server" },
    { name: "com.example:server-kotlin", source: "jvm/server-kotlin" },
  ],
});
const SURFACE = '{"language":"jvm","packages":[]}\n';

function fails(action, message) {
  assert.throws(action, error => {
    assert.ok(error instanceof ExtractError, error.stack);
    assert.equal(error.message, message);
    return true;
  });
}

test("the Gradle command passes the packages in language.json order", () => {
  assert.deepEqual(extractorArguments(LANGUAGE), [
    "--language", "jvm",
    "--output", OUTPUT,
    "--package", "com.example:server=jvm/server",
    "--package", "com.example:server-kotlin=jvm/server-kotlin",
  ]);
  assert.deepEqual(gradleCommand(LANGUAGE), [
    "jvm/gradlew", "-p", "jvm", "--no-daemon", "--console=plain", "-q", ":docs-surface:extract",
    `--args=--language jvm --output ${OUTPUT} --package com.example:server=jvm/server --package com.example:server-kotlin=jvm/server-kotlin`,
  ]);
  for (const name of ["com.example:my server", "com.example:'server'", 'com.example:"server"', "com.example:server\\x"]) {
    fails(
      () => extractorArguments({ id: "jvm", packages: [{ name, source: "jvm/server" }] }),
      `Gradle can't pass ${JSON.stringify(`${name}=jvm/server`)} to the extractor; remove its whitespace, quotes and backslashes`,
    );
  }
});

test("extractJvm runs Gradle from the root and returns the surface it wrote", t => {
  const root = tempRoot(t);
  write(root, OUTPUT, "stale");
  const calls = [];
  const surface = extractJvm({
    root,
    language: LANGUAGE,
    run: (command, cwd) => {
      calls.push({ command, cwd });
      assert.equal(existsSync(join(root, OUTPUT)), false, "the previous surface is gone before Gradle runs");
      write(root, OUTPUT, SURFACE);
      return { status: 0, signal: null };
    },
  });
  assert.equal(surface, SURFACE);
  assert.deepEqual(calls, [{ command: gradleCommand(LANGUAGE), cwd: root }]);
});

test("extractJvm fails when Gradle fails, can't start or writes nothing, and never returns a stale surface", t => {
  const root = tempRoot(t);
  const task = "jvm/gradlew -p jvm --no-daemon --console=plain -q :docs-surface:extract";
  const extract = result => () => {
    write(root, OUTPUT, SURFACE);
    return extractJvm({ root, language: LANGUAGE, run: () => result });
  };
  fails(extract({ status: 1, signal: null }), `${task} exited with code 1`);
  fails(extract({ status: null, signal: "SIGTERM" }), `${task} exited with SIGTERM`);
  fails(extract({ error: new Error("spawnSync jvm/gradlew ENOENT") }), "couldn't run jvm/gradlew: spawnSync jvm/gradlew ENOENT");
  fails(extract({ status: 0, signal: null }), `${task} didn't write ${OUTPUT}`);
  assert.equal(existsSync(join(root, OUTPUT)), false);
});

test("the extractor command takes one language file", () => {
  const result = spawnSync(process.execPath, ["tools/docgen/extractors/jvm.mjs"], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "usage: node tools/docgen/extractors/jvm.mjs <language.json>\n");
});

test("the jvm language runs this extractor on its own language file", () => {
  const language = JSON.parse(readFileSync(join(REPO_ROOT, "docs/languages/jvm/language.json"), "utf8"));
  assert.deepEqual(language.extract.command, ["node", "tools/docgen/extractors/jvm.mjs", "docs/languages/jvm/language.json"]);
  assert.doesNotThrow(() => gradleCommand(language));
});
