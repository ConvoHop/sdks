import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ExtractError, OUTPUT, extractAndroid, extractorArguments, gradleCommand } from "../extractors/android.mjs";
import { REPO_ROOT, tempRoot, write } from "./helpers.mjs";

const LANGUAGE = Object.freeze({
  id: "android",
  packages: [
    { name: "com.example:android", source: "android/app" },
    { name: "com.example:android-core", source: "android/core" },
  ],
});
const SURFACE = '{"language":"android","packages":[]}\n';

function fails(action, message) {
  assert.throws(action, error => {
    assert.ok(error instanceof ExtractError, error.stack);
    assert.equal(error.message, message);
    return true;
  });
}

test("the Gradle command passes the packages in language.json order", () => {
  assert.deepEqual(extractorArguments(LANGUAGE), [
    "--language", "android",
    "--output", OUTPUT,
    "--package", "com.example:android=android/app",
    "--package", "com.example:android-core=android/core",
  ]);
  assert.deepEqual(gradleCommand(LANGUAGE), [
    "android/gradlew", "-p", "android", "--no-daemon", "--console=plain", "-q", ":docs-surface:extract",
    `--args=--language android --output ${OUTPUT} --package com.example:android=android/app --package com.example:android-core=android/core`,
  ]);
  for (const name of ["com.example:my android", "com.example:'android'", 'com.example:"android"', "com.example:android\\x"]) {
    fails(
      () => extractorArguments({ id: "android", packages: [{ name, source: "android/app" }] }),
      `Gradle can't pass ${JSON.stringify(`${name}=android/app`)} to the extractor; remove its whitespace, quotes and backslashes`,
    );
  }
});

test("extractAndroid runs Gradle from the root and returns the surface it wrote", t => {
  const root = tempRoot(t);
  write(root, OUTPUT, "stale");
  const calls = [];
  const surface = extractAndroid({
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

test("extractAndroid fails when Gradle fails, can't start or writes nothing, and never returns a stale surface", t => {
  const root = tempRoot(t);
  const task = "android/gradlew -p android --no-daemon --console=plain -q :docs-surface:extract";
  const extract = result => () => {
    write(root, OUTPUT, SURFACE);
    return extractAndroid({ root, language: LANGUAGE, run: () => result });
  };
  fails(extract({ status: 1, signal: null }), `${task} exited with code 1`);
  fails(extract({ status: null, signal: "SIGTERM" }), `${task} exited with SIGTERM`);
  fails(extract({ error: new Error("spawnSync android/gradlew ENOENT") }), "couldn't run android/gradlew: spawnSync android/gradlew ENOENT");
  fails(extract({ status: 0, signal: null }), `${task} didn't write ${OUTPUT}`);
  assert.equal(existsSync(join(root, OUTPUT)), false);
});

test("the extractor command takes one language file", () => {
  const result = spawnSync(process.execPath, ["tools/docgen/extractors/android.mjs"], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "usage: node tools/docgen/extractors/android.mjs <language.json>\n");
});

test("the android language runs this extractor on its own language file and tests with the Android build", () => {
  const language = JSON.parse(readFileSync(join(REPO_ROOT, "docs/languages/android/language.json"), "utf8"));
  assert.deepEqual(language.extract.command, ["node", "tools/docgen/extractors/android.mjs", "docs/languages/android/language.json"]);
  assert.doesNotThrow(() => gradleCommand(language));
  // The packages are Gradle modules of the Android build, which the extractor reads by path.
  for (const pkg of language.packages) assert.ok(existsSync(join(REPO_ROOT, pkg.source, "src/main/kotlin")), pkg.source);
  assert.deepEqual(language.test.command.slice(0, 3), ["android/gradlew", "-p", "android"]);
});
