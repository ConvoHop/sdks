import test from "node:test";
import assert from "node:assert/strict";
import docSnippets, { DEFAULT_DIRECTORY, SNIPPETS_VERSION, code, escapeMarkdown } from "../emitters/doc-snippets.mjs";
import { EmitterError, renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { codeUnitCompare } from "../lib/naming.mjs";
import { fixtureSources, replaceOnce, repoSources } from "./helpers.mjs";

const snippets = ir => renderEmitters(ir, [docSnippets]);
const snippetOf = (files, plane, field) => files.find(file => file.path === `${DEFAULT_DIRECTORY}/${plane}/${field}.md`).contents;

/**
 * Lists characters that would start HTML, JSX or an MDX expression: `<`, `>`, `{` or `}` in prose, outside fenced
 * blocks, code spans and backslash escapes. Scans left to right like CommonMark, so an escaped backtick opens no span.
 */
function rawSyntax(markdown) {
  let fence = null;
  const prose = markdown.split("\n").filter(line => {
    if (fence) {
      if (new RegExp(`^${fence}\`*\\s*$`).test(line)) fence = null;
      return false;
    }
    fence = /^(`{3,})/.exec(line)?.[1] ?? null;
    return !fence;
  }).join("\n");
  const found = [];
  for (let i = 0; i < prose.length;) {
    if (prose[i] === "\\" && /[!-/:-@[-`{-~]/.test(prose[i + 1] ?? "")) {
      i += 2;
    } else if (prose[i] === "`") {
      const run = /^`+/.exec(prose.slice(i))[0];
      const close = new RegExp(`(?<!\`)${run}(?!\`)`, "g");
      close.lastIndex = i + run.length;
      const match = close.exec(prose);
      i = match ? match.index + run.length : i + run.length;
    } else {
      if ("<>{}".includes(prose[i])) found.push(`${prose[i]} in ${JSON.stringify(prose.slice(Math.max(0, i - 30), i + 30))}`);
      i += 1;
    }
  }
  return found;
}

test("escapeMarkdown escapes Markdown and MDX syntax but keeps identifiers readable", () => {
  const cases = [
    ["plain text, 1. ok", "plain text, 1. ok"],
    ["WRONG_REGION and snake_case", "WRONG_REGION and snake_case"],
    ["_emphasis_ and trailing_", "\\_emphasis\\_ and trailing\\_"],
    ["<b> {x} [l](u)", "\\<b\\> \\{x\\} \\[l\\](u)"],
    ["# *a* ~b~ &amp; `c`", "\\# \\*a\\* \\~b\\~ \\&amp; \\`c\\`"],
    ["back\\slash", "back\\\\slash"],
  ];
  for (const [input, expected] of cases) assert.equal(escapeMarkdown(input), expected, input);
});

test("code spans grow their fence and pad content that starts or ends with a backtick", () => {
  const cases = [["x", "`x`"], ["a`b", "``a`b``"], ["`x", "`` `x ``"], ["x``", "``` x`` ```"], ["Map<K, {v}>", "`Map<K, {v}>`"]];
  for (const [input, expected] of cases) assert.equal(code(input), expected, input);
});

test("snippets contain no raw HTML, JSX or MDX expressions outside code", () => {
  assert.equal(rawSyntax("a <b> {c}").length, 4);
  assert.deepEqual(rawSyntax("`<b>` ``{`}`` \\<b\\> \\{c\\}\n```graphql\n{ a }\n```\nend"), []);
  assert.equal(rawSyntax("\\\\<b").length, 1, "an escaped backslash does not escape what follows");
  assert.equal(rawSyntax("\\`<b>`").length, 2, "an escaped backtick does not open a code span");
  for (const [label, sources] of [["repository", repoSources()], ["fixture", fixtureSources()]]) {
    for (const file of snippets(buildIr(sources)).filter(entry => entry.path.endsWith(".md"))) {
      assert.deepEqual(rawSyntax(file.contents), [], `${label} ${file.path}`);
    }
  }
});

test("index.json lists exactly the operation snippets, in IR order", () => {
  for (const sources of [repoSources(), fixtureSources()]) {
    const ir = buildIr(sources);
    const files = snippets(ir);
    const index = JSON.parse(files.find(file => file.path === `${DEFAULT_DIRECTORY}/index.json`).contents);
    assert.deepEqual(Object.keys(index), ["snippetsVersion", "irVersion", "source", "operations"]);
    assert.equal(index.snippetsVersion, SNIPPETS_VERSION);
    assert.equal(index.irVersion, ir.irVersion);
    assert.equal(index.source, "schema/ir.json");
    assert.deepEqual(index.operations.map(entry => entry.id), ir.operations.map(operation => operation.id));
    const listed = index.operations.map(entry => `${DEFAULT_DIRECTORY}/${entry.path}`).sort(codeUnitCompare);
    const operationFiles = files.map(file => file.path).filter(path => !/\/(README\.md|index\.json)$/.test(path)).sort(codeUnitCompare);
    assert.deepEqual(listed, operationFiles);
    for (const [i, entry] of index.operations.entries()) {
      const operation = ir.operations[i];
      assert.equal(entry.path, `${operation.plane}/${operation.field}.md`);
      assert.equal(entry.deprecated, operation.deprecated ? true : undefined, entry.id);
      assert.ok(snippetOf(files, operation.plane, operation.field).startsWith(`## ${code(operation.field)}\n\n`), entry.id);
    }
  }
  assert.equal(SNIPPETS_VERSION, 1);
});

test("descriptions become escaped paragraphs that cannot start lists, quotes, headings or code blocks", () => {
  const description = ["1) one", "", "10. ten", "", "- dash", "", "+ plus", "", "= equals", "", "> quote", "", "# heading", "", "* star", "", "    indented", "code", "", "<div>{html}</div>"];
  const block = ['"""', ...description, '"""'].map(line => (line ? `  ${line}` : line)).join("\n");
  const sources = fixtureSources({ planes: { alpha: sdl => replaceOnce(sdl, '  "Server capabilities."\n', `${block}\n`) } });
  const snippet = snippetOf(snippets(buildIr(sources)), "alpha", "capabilities");
  const expected = ["1\\) one", "10\\. ten", "\\- dash", "\\+ plus", "\\= equals", "\\> quote", "\\# heading", "\\* star", "indented code", "\\<div\\>\\{html\\}\\</div\\>"];
  assert.deepEqual(snippet.split("\n\n").slice(1, 2 + expected.length), ["Read the server capabilities.", ...expected]);
  assert.deepEqual(rawSyntax(snippet), []);
});

test("transient error advice follows the retry policy of the operation's idempotency class", () => {
  const ir = buildIr(fixtureSources());
  const files = snippets(ir);
  const advice = {
    repeat: "Transient, so repeating the request may succeed",
    sameRequest: "Transient, so a retry with the same `requestId` and input may succeed",
    none: "Transient, but this operation is never retried; send a fresh request",
  };
  const retryable = new Set(ir.errors.codes.filter(definition => definition.retryable).map(definition => definition.name));
  const policies = new Set();
  for (const operation of ir.operations) {
    const { retry } = ir.idempotency.find(entry => entry.name === operation.idempotency);
    const lines = snippetOf(files, operation.plane, operation.field).split("\n").filter(line => line.startsWith("- Transient"));
    const expected = operation.errors.codes.some(name => retryable.has(name)) ? [advice[retry]] : [];
    assert.deepEqual(lines.map(line => line.slice(2, line.indexOf(":"))), expected, operation.id);
    if (expected.length) policies.add(retry);
  }
  assert.deepEqual([...policies].sort(), ["none", "repeat", "sameRequest"], "the fixture covers every retry policy");
});

test("doc-snippets fails loudly on IR references it cannot resolve", () => {
  const ir = buildIr(fixtureSources());
  const render = mutate => () => {
    const copy = structuredClone(ir);
    mutate(copy, id => copy.operations.find(operation => operation.id === id));
    return snippets(copy);
  };
  assert.throws(render((_, op) => { op("alpha.items").layer = "edge"; }), new EmitterError('doc-snippets: alpha.items has unknown layer "edge"'));
  assert.throws(render((_, op) => { op("alpha.startJob").errors.codes.push("NOPE"); }), new EmitterError('doc-snippets: alpha.startJob references unknown error code "NOPE"'));
  assert.throws(render((_, op) => { op("alpha.startJob").realtime.emits = ["job.exploded"]; }), new EmitterError('doc-snippets: alpha.startJob references unknown event "job.exploded"'));
  assert.throws(render(copy => { copy.idempotency.find(entry => entry.name === "safe").retry = "sometimes"; }),
    new EmitterError('doc-snippets: alpha.capabilities has unknown retry policy "sometimes"'));
});
