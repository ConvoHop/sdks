import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import config from "../sdkgen.config.mjs";
import { run } from "../lib/cli.mjs";
import { renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { formatJson } from "../lib/json.mjs";
import { loadSources } from "../lib/sources.mjs";
import { REPO_ROOT, capture, copyFixture, listTree } from "./helpers.mjs";

const REGENERATE = "Run npm run generate:graphql and commit the result.";
const SUMMARY = "16 typed GraphQL operations validated against both exported schemas.";

function cli(...argv) {
  const { out, err, io } = capture();
  const status = run(argv, io);
  return { status, out: out.join("\n"), err: err.join("\n") };
}

const generatedPaths = root => renderEmitters(buildIr(loadSources({ root })), config.emitters, { options: config.options }).map(file => file.path);

function editAnnotations(root, edit) {
  const path = join(root, "schema/annotations.json");
  const annotations = JSON.parse(readFileSync(path, "utf8"));
  edit(annotations);
  writeFileSync(path, formatJson(annotations));
}

test("generate writes every generated file once, and --check then passes", t => {
  const root = copyFixture(t);
  const paths = generatedPaths(root);
  assert.equal(paths.length, 86);
  const first = cli("generate", "--root", root);
  assert.deepEqual(first, { status: 0, out: [...paths.map(path => `wrote ${path}`), SUMMARY].join("\n"), err: "" });
  for (const path of paths) assert.ok(existsSync(join(root, path)), path);
  assert.deepEqual(cli("generate", "--root", root), { status: 0, out: SUMMARY, err: "" }, "an unchanged file is not rewritten");
  assert.deepEqual(cli("generate", "--check", "--root", root), { status: 0, out: `${SUMMARY}\n${paths.length} generated files are up to date.`, err: "" });
});

test("generate --check reports edited, missing and stale files without touching them", t => {
  const root = copyFixture(t);
  assert.equal(cli("generate", "--root", root).status, 0);
  writeFileSync(join(root, "schema/operations.json"), "{}\n");
  rmSync(join(root, "docs/snippets/alpha/ping.md"));
  writeFileSync(join(root, "docs/snippets/alpha/old.md"), "## `old`\n");
  const before = listTree(root);

  const check = cli("generate", "--check", "--root", root);
  assert.deepEqual(check, {
    status: 1,
    out: "",
    err: [
      "Generated GraphQL drift: schema/operations.json",
      "Generated GraphQL drift: docs/snippets/alpha/ping.md (missing)",
      "Generated GraphQL drift: docs/snippets/alpha/old.md (stale)",
      REGENERATE,
    ].join("\n"),
  });
  assert.deepEqual(listTree(root), before);
  assert.equal(readFileSync(join(root, "schema/operations.json"), "utf8"), "{}\n");

  const fix = cli("generate", "--root", root);
  assert.deepEqual(fix, {
    status: 0,
    out: ["wrote schema/operations.json", "wrote docs/snippets/alpha/ping.md", "removed docs/snippets/alpha/old.md", SUMMARY].join("\n"),
    err: "",
  });
  assert.equal(cli("generate", "--check", "--root", root).status, 0);
});

test("emit runs only the named emitters and checks only their files", t => {
  const root = copyFixture(t);
  assert.deepEqual(cli("emit", "ir", "--root", root), { status: 0, out: `wrote schema/ir.json\n${SUMMARY}`, err: "" });
  assert.equal(existsSync(join(root, "packages")), false);
  assert.equal(existsSync(join(root, "docs")), false);
  assert.deepEqual(cli("emit", "ir", "--check", "--root", root), { status: 0, out: `${SUMMARY}\n1 generated files are up to date.`, err: "" });
  const snippets = cli("emit", "typescript", "doc-snippets", "--check", "--root", root);
  assert.equal(snippets.status, 1);
  assert.match(snippets.err, /^Generated GraphQL drift: packages\/core\/src\/generated\/graphql-types\.ts \(missing\)$/m);
  assert.match(snippets.err, /^Generated GraphQL drift: docs\/snippets\/index\.json \(missing\)$/m);
  assert.doesNotMatch(snippets.err, /ir\.json/);
});

test("ir prints the IR without writing files", t => {
  const root = copyFixture(t);
  const before = listTree(root);
  assert.deepEqual(cli("ir", "--root", root), { status: 0, out: formatJson(buildIr(loadSources({ root }))).trimEnd(), err: "" });
  assert.deepEqual(listTree(root), before);
});

test("usage errors exit 2 with the message and the usage text", () => {
  const cases = [
    [[], "missing command"],
    [["build"], 'unknown command "build"'],
    [["generate", "extra"], 'unexpected argument "extra"'],
    [["ir", "--check"], '--check does not apply to "ir"'],
    [["check-annotations", "--check"], '--check does not apply to "check-annotations"'],
    [["emit"], "emit needs at least one emitter name"],
    [["emit", "ir", "nonexistent"], 'unknown emitter "nonexistent"'],
    [["generate", "--bogus"], /^Unknown option '--bogus'/],
    [["generate", "--root"], /^Option '--root <value>' argument missing/],
  ];
  for (const [argv, message] of cases) {
    const result = cli(...argv);
    assert.equal(result.status, 2, argv.join(" "));
    assert.equal(result.out, "");
    const [first, ...rest] = result.err.split("\n\n");
    if (typeof message === "string") assert.equal(first, message);
    else assert.match(first, message);
    assert.match(rest.join("\n\n"), /^Usage: node tools\/sdkgen\/cli\.mjs <command>/);
  }
  for (const flag of ["-h", "--help"]) {
    const help = cli(flag);
    assert.equal(help.status, 0);
    assert.match(help.out, /^Usage: node tools\/sdkgen\/cli\.mjs <command>[\s\S]*emit <name>\.\.\. \[--check\] {2}Run only the named emitters: ir, graphql-operations, typescript, doc-snippets, java, mcp-tools, cli-operations, python, csharp, go, android, dart, swift\./);
  }
});

test("check-annotations lists missing and unknown operations, and generation refuses to run", t => {
  const root = copyFixture(t);
  assert.deepEqual(cli("check-annotations", "--root", root), {
    status: 0,
    out: "Annotations OK: 16 operations across 2 planes are annotated in schema/annotations.json.",
    err: "",
  });
  editAnnotations(root, annotations => {
    annotations.operations["alpha.gone"] = annotations.operations["alpha.ping"];
    delete annotations.operations["alpha.ping"];
  });
  const check = cli("check-annotations", "--root", root);
  assert.equal(check.status, 1);
  assert.equal(check.out, "");
  assert.match(check.err, /^Annotation check failed for schema\/annotations\.json: 1 missing, 1 unknown\.$/m);
  assert.match(check.err, /^ {2}alpha\.ping +mutation +schema\/alpha\.graphql$/m);
  assert.match(check.err, /^ {2}alpha\.gone +schema\/alpha\.graphql has no root field "gone"$/m);
  assert.match(check.err, /^ {2}"alpha\.ping": \{$/m, "prints a starter entry");
  for (const command of [["generate"], ["generate", "--check"], ["ir"]]) {
    const result = cli(...command, "--root", root);
    assert.equal(result.status, 1, command.join(" "));
    assert.equal(result.err, check.err, command.join(" "));
  }
  assert.equal(existsSync(join(root, "schema/ir.json")), false);
});

test("unreadable sources exit 1 with the file name", t => {
  const root = copyFixture(t);
  writeFileSync(join(root, "schema/annotations.json"), "{\n");
  const invalid = cli("ir", "--root", root);
  assert.equal(invalid.status, 1);
  assert.match(invalid.err, /^schema\/annotations\.json is not valid JSON: /);
  rmSync(join(root, "schema/annotations.json"));
  const missing = cli("generate", "--root", root);
  assert.equal(missing.status, 1);
  assert.match(missing.err, /^schema\/annotations\.json cannot be read: ENOENT/);
});

test("the entry point sets the process exit code", t => {
  const node = argv => spawnSync(process.execPath, [join(REPO_ROOT, "tools/sdkgen/cli.mjs"), ...argv], { encoding: "utf8" });
  const current = node(["generate", "--check"]);
  assert.equal(current.status, 0, `${current.stdout}${current.stderr}`);
  assert.match(current.stdout, /\d+ generated files are up to date\.\n$/);
  const usage = node(["nope"]);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^unknown command "nope"\n/);
  const root = copyFixture(t);
  editAnnotations(root, annotations => { delete annotations.operations["beta.widgets"]; });
  const failed = node(["check-annotations", "--root", root]);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /^MISSING: 1 schema operation\(s\) have no entry under "operations":$/m);
});
