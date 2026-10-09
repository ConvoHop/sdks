import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";
import { ASSEMBLY, ExtractError, PROJECT, buildCommand, extractCommand, extractDotnet } from "../extractors/dotnet.mjs";
import { REPO_ROOT } from "./helpers.mjs";

const ROOT = "/repo/";
const LANGUAGE_FILE = "docs/languages/dotnet/language.json";
const SURFACE = '{"language":"dotnet","packages":[]}\n';
const BUILD = `dotnet build ${PROJECT}`;
const EXTRACT = `dotnet ${ASSEMBLY}`;

function fails(action, message) {
  assert.throws(action, error => {
    assert.ok(error instanceof ExtractError, error.stack);
    assert.equal(error.message, message);
    return true;
  });
}

test("the extractor builds in Release and runs on the language file from the root", () => {
  assert.deepEqual(buildCommand(), [
    "dotnet", "build", PROJECT, "--configuration", "Release", "--nologo", "--verbosity", "quiet",
    "-consoleLoggerParameters:NoSummary", "--disable-build-servers",
  ]);
  assert.deepEqual(extractCommand(ROOT, LANGUAGE_FILE), ["dotnet", ASSEMBLY, ROOT, `/repo/${LANGUAGE_FILE}`]);
  assert.deepEqual(extractCommand(ROOT, "/elsewhere/language.json"), ["dotnet", ASSEMBLY, ROOT, "/elsewhere/language.json"]);
});

test("the assembly is where the Release build of the project puts it", () => {
  const props = readFileSync(join(REPO_ROOT, dirname(dirname(PROJECT)), "Directory.Build.props"), "utf8");
  const project = readFileSync(join(REPO_ROOT, PROJECT), "utf8");
  const framework = /<TargetFramework>([^<]+)<\/TargetFramework>/.exec(props)?.[1];
  const name = /<AssemblyName>([^<]+)<\/AssemblyName>/.exec(project)?.[1];
  assert.equal(name, basename(PROJECT, ".csproj"));
  assert.equal(ASSEMBLY, `${dirname(PROJECT)}/bin/Release/${framework}/${name}.dll`);
  assert.doesNotMatch(project, /<(TargetFrameworks?|OutputPath|BaseOutputPath)>/);
});

test("extractDotnet builds the extractor, then returns the surface it prints", () => {
  const calls = [];
  const surface = extractDotnet({
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

test("extractDotnet fails when the build or the extractor fails, can't start or prints nothing", () => {
  const extract = (build, run) => () => {
    const results = [build, run];
    return extractDotnet({ root: ROOT, languageFile: LANGUAGE_FILE, run: () => results.shift() });
  };
  const ok = { status: 0, signal: null, stdout: SURFACE };
  const enoent = { error: new Error("spawnSync dotnet ENOENT") };
  fails(extract(enoent), `couldn't run ${BUILD}: spawnSync dotnet ENOENT`);
  fails(extract({ status: 1, signal: null }), `${BUILD} exited with code 1`);
  fails(extract(ok, enoent), `couldn't run ${EXTRACT}: spawnSync dotnet ENOENT`);
  fails(extract(ok, { status: 1, signal: null, stdout: SURFACE }), `${EXTRACT} exited with code 1`);
  fails(extract(ok, { status: null, signal: "SIGTERM", stdout: "" }), `${EXTRACT} exited with SIGTERM`);
  fails(extract(ok, { status: 0, signal: null, stdout: "" }), `${EXTRACT} printed no surface`);
});

test("the extractor command takes one language file", () => {
  for (const args of [[], [LANGUAGE_FILE, LANGUAGE_FILE]]) {
    const result = spawnSync(process.execPath, ["tools/docgen/extractors/dotnet.mjs", ...args], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "usage: node tools/docgen/extractors/dotnet.mjs <language.json>\n");
  }
});

test("the dotnet language runs this extractor on its own language file", () => {
  const language = JSON.parse(readFileSync(join(REPO_ROOT, LANGUAGE_FILE), "utf8"));
  assert.deepEqual(language.extract.command, ["node", "tools/docgen/extractors/dotnet.mjs", LANGUAGE_FILE]);
});
