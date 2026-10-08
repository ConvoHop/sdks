import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { run } from "../lib/cli.mjs";
import {
  API,
  CONFIG,
  LANGUAGE_DIRECTORY,
  LANGUAGE_FILE,
  REPO_ROOT,
  SURFACE_FILE,
  TEST_LOG,
  capture,
  editJson,
  editText,
  listTree,
  read,
  write,
  writeFixture,
} from "./helpers.mjs";

const SITE = CONFIG.outputDirectory;
const EXTRACT = `node ${LANGUAGE_DIRECTORY}/extract.mjs`;
const RUNNER = `node ${LANGUAGE_DIRECTORY}/examples/run.mjs`;
const REGENERATE = "Run npm run build && npm run extract:docs -- pseudo && npm run generate:docs and commit the result.";

/** Runs the CLI on the fixture at `root` and returns its exit code and output lines. */
function cli(root, ...argv) {
  const { out, err, io } = capture();
  const code = run([...argv, "--root", root], { ...io, config: CONFIG });
  return { code, out, err };
}

/** Every file under `directory` with its contents. */
function snapshot(root, directory) {
  return new Map(listTree(root, directory).map(path => [path, read(root, path)]));
}

function summary(root, verb) {
  const files = listTree(root, SITE);
  const pages = files.filter(path => path.endsWith(".md")).length;
  return `${pages} pages and ${files.length - pages} other files in ${SITE} ${verb}.`;
}

test("generate writes docs/site, then reports it up to date", t => {
  const root = writeFixture(t);
  const first = cli(root, "generate");
  assert.equal(first.code, 0);
  assert.deepEqual(first.err, []);
  const files = listTree(root, SITE);
  assert.ok(files.includes(`${SITE}/index.md`) && files.includes(`${SITE}/manifest.json`));
  assert.deepEqual(first.out, [...files.map(path => `wrote ${path}`), summary(root, "generated")]);

  const again = cli(root, "generate");
  assert.deepEqual(again, { code: 0, out: [summary(root, "generated")], err: [] });
  const check = cli(root, "generate", "--check");
  assert.deepEqual(check, { code: 0, out: [summary(root, "are up to date")], err: [] });
});

test("generate --check reports edited, missing and stale files and writes nothing; generate repairs them", t => {
  const root = writeFixture(t);
  assert.equal(cli(root, "generate").code, 0);
  const generated = snapshot(root, SITE);
  write(root, `${SITE}/index.md`, "# Edited\n");
  rmSync(join(root, SITE, "llms.txt"));
  write(root, `${SITE}/old/page.md`, "# Old\n");
  const before = snapshot(root, SITE);

  const check = cli(root, "generate", "--check");
  assert.equal(check.code, 1);
  assert.deepEqual(check.out, []);
  assert.deepEqual(check.err, [
    `Generated docs drift: ${SITE}/index.md`,
    `Generated docs drift: ${SITE}/llms.txt (missing)`,
    `Generated docs drift: ${SITE}/old/page.md (stale)`,
    "Run npm run generate:docs and commit the result.",
  ]);
  assert.deepEqual(snapshot(root, SITE), before);

  const repair = cli(root, "generate");
  assert.equal(repair.code, 0);
  assert.deepEqual(repair.out, [`wrote ${SITE}/index.md`, `wrote ${SITE}/llms.txt`, `removed ${SITE}/old/page.md`, summary(root, "generated")]);
  assert.deepEqual(snapshot(root, SITE), generated);
  assert.equal(existsSync(join(root, SITE, "old")), false, "generate prunes directories it emptied");
});

test("generate reports every problem and writes nothing", t => {
  const root = writeFixture(t);
  rmSync(join(root, "docs/snippets/alpha/purge.md"));
  editJson(root, LANGUAGE_FILE, language => {
    language.id = "other";
  });
  const failed = cli(root, "generate");
  assert.equal(failed.code, 1);
  assert.deepEqual(failed.out, []);
  assert.deepEqual(failed.err, [
    "docs/snippets has no page for alpha.purge; run npm run generate:graphql",
    `${LANGUAGE_FILE}: id other must match its directory, pseudo`,
    "2 docs problems; nothing was written.",
  ]);
  assert.equal(existsSync(join(root, SITE)), false);

  editJson(root, LANGUAGE_FILE, language => {
    language.id = "pseudo";
  });
  assert.deepEqual(cli(root, "generate", "--check").err, ["docs/snippets has no page for alpha.purge; run npm run generate:graphql", "1 docs problem; nothing was written."]);
});

test("extract --check compares the extractor's output with surface.json, and extract writes it with $schema first", t => {
  const root = writeFixture(t);
  assert.deepEqual(cli(root, "extract", "--check"), { code: 0, out: ["1 surface up to date."], err: [] });

  editJson(root, "packages/pseudo-client/api.json", api => {
    api.symbols[0].docs = "Calls the API as one user.";
  });
  const before = read(root, SURFACE_FILE);
  assert.deepEqual(cli(root, "extract", "--check", "pseudo"), {
    code: 1,
    out: [],
    err: [`Extracted surface drift: ${SURFACE_FILE}`, REGENERATE],
  });
  assert.equal(read(root, SURFACE_FILE), before);

  assert.deepEqual(cli(root, "extract"), { code: 0, out: [`wrote ${SURFACE_FILE}`, "Extracted 1 surface."], err: [] });
  const surface = JSON.parse(read(root, SURFACE_FILE));
  assert.deepEqual(Object.keys(surface), ["$schema", "language", "packages"]);
  assert.equal(surface.$schema, "../../../spec/docs/surface.schema.json");
  assert.equal(surface.packages[1].symbols[0].docs, "Calls the API as one user.");
  assert.equal(cli(root, "extract", "--check").code, 0);

  rmSync(join(root, SURFACE_FILE));
  assert.deepEqual(cli(root, "extract", "--check").err, [`Extracted surface drift: ${SURFACE_FILE} (missing)`, REGENERATE]);
});

test("extract reports a failing extractor or invalid output and writes nothing", t => {
  const root = writeFixture(t);
  const before = read(root, SURFACE_FILE);
  const extractor = read(root, `${LANGUAGE_DIRECTORY}/extract.mjs`);

  rmSync(join(root, "packages/pseudo-client/api.json"));
  const failed = cli(root, "extract");
  assert.equal(failed.code, 1);
  assert.deepEqual(failed.out, []);
  assert.equal(failed.err.length, 1);
  assert.match(failed.err[0], new RegExp(`^pseudo: ${EXTRACT} exited with code 1\\npseudo extractor: ENOENT`));

  write(root, `${LANGUAGE_DIRECTORY}/extract.mjs`, 'process.stdout.write("surface\\n");\n');
  const garbled = cli(root, "extract");
  assert.equal(garbled.code, 1);
  assert.match(garbled.err.join("\n"), new RegExp(`^pseudo: ${EXTRACT} didn't print JSON: `));

  write(root, `${LANGUAGE_DIRECTORY}/extract.mjs`, extractor);
  write(root, "packages/pseudo-client/api.json", API["pseudo-client"]);
  editText(root, `${LANGUAGE_DIRECTORY}/extract.mjs`, source => source.replace('language: "pseudo"', 'language: "mono"'));
  assert.deepEqual(cli(root, "extract"), { code: 1, out: [], err: [`${EXTRACT} output: language is mono, not pseudo`] });
  assert.equal(read(root, SURFACE_FILE), before);

  assert.deepEqual(cli(root, "extract", "nope"), { code: 1, out: [], err: ['unknown or invalid language "nope"'] });
});

test("test runs each language's test command, after its install command with --install", t => {
  const root = writeFixture(t);
  assert.deepEqual(cli(root, "test"), { code: 0, out: [], err: [`> pseudo: ${RUNNER} test`] });
  assert.equal(read(root, TEST_LOG), "test\n");

  rmSync(join(root, TEST_LOG));
  assert.deepEqual(cli(root, "test", "--install", "pseudo"), { code: 0, out: [], err: [`> pseudo: ${RUNNER} install`, `> pseudo: ${RUNNER} test`] });
  assert.equal(read(root, TEST_LOG), "install\ntest\n");

  assert.deepEqual(cli(root, "test", "nope"), { code: 1, out: [], err: ['unknown or invalid language "nope"'] });
});

test("test fails when a command fails or can't start, and skips the test command after a failed install", t => {
  const root = writeFixture(t);
  write(root, `${LANGUAGE_DIRECTORY}/examples/fail`, "");
  assert.deepEqual(cli(root, "test"), { code: 1, out: [], err: [`> pseudo: ${RUNNER} test`, `pseudo: ${RUNNER} test exited with code 3`] });

  editJson(root, LANGUAGE_FILE, language => {
    language.test.install = ["node", "-e", "process.exitCode = 4"];
  });
  rmSync(join(root, TEST_LOG));
  assert.deepEqual(cli(root, "test", "--install"), {
    code: 1,
    out: [],
    err: ["> pseudo: node -e process.exitCode = 4", "pseudo: node -e process.exitCode = 4 exited with code 4"],
  });
  assert.equal(existsSync(join(root, TEST_LOG)), false, "the test command didn't run");

  editJson(root, LANGUAGE_FILE, language => {
    language.test.command = ["docgen-test-missing-command"];
  });
  const missing = cli(root, "test");
  assert.equal(missing.code, 1);
  assert.equal(missing.err[0], "> pseudo: docgen-test-missing-command");
  assert.match(missing.err[1], /^pseudo: couldn't run docgen-test-missing-command: /);
});

test("usage errors exit 2 with the usage; --help exits 0", () => {
  for (const [argv, message] of [
    [[], /^missing command\n\nUsage: /],
    [["build"], /^unknown command "build"\n\nUsage: /],
    [["generate", "pseudo"], /^unexpected argument "pseudo"; generate renders every language\n\nUsage: /],
    [["test", "--check"], /^--check does not apply to "test"\n\nUsage: /],
    [["extract", "--install"], /^--install does not apply to "extract"\n\nUsage: /],
    [["generate", "--force"], /^Unknown option '--force'/],
  ]) {
    const { out, err, io } = capture();
    assert.equal(run(argv, { ...io, config: CONFIG }), 2, argv.join(" "));
    assert.deepEqual(out, []);
    assert.equal(err.length, 1);
    assert.match(err[0], message);
  }
  for (const argv of [["-h"], ["generate", "--help"]]) {
    const { out, err, io } = capture();
    assert.equal(run(argv, { ...io, config: CONFIG }), 0);
    assert.deepEqual(err, []);
    assert.match(out.join("\n"), /^Usage: node tools\/docgen\/cli\.mjs <command>/);
  }
});

test("tools/docgen/cli.mjs exits with the command's code", () => {
  const help = spawnSync(process.execPath, ["tools/docgen/cli.mjs", "--help"], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^Usage: /);
  const usage = spawnSync(process.execPath, ["tools/docgen/cli.mjs", "publish"], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^unknown command "publish"/);
});
