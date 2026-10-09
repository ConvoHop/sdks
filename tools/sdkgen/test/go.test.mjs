import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import config from "../sdkgen.config.mjs";
import go, { goName, goPattern, goString, scalarEntry } from "../emitters/go.mjs";
import { EmitterError } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { REPO_ROOT, fixtureSources, repoSources } from "./helpers.mjs";

const goError = message => new EmitterError(`go: ${message}`);
const edgeIr = () => buildIr(fixtureSources());
const render = (ir, options = config.options.go) => go.emit(ir, options);
const exposedIds = ir => ir.operations.filter(operation => operation.layer !== "client" && operation.kind !== "subscription").map(operation => operation.id);

// Patterns the Go emitter accepts, with inputs on which RE2 and ECMAScript
// (with the u flag, as JSON Schema validators run it) must agree.
const PATTERN_CASES = [
  { pattern: "^(0|[1-9][0-9]*)$", inputs: ["", "0", "00", "01", "10", "9223372036854775807", "-1", "1\n", "\n1", "1 ", "١"] },
  { pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", inputs: [
    "00000000-0000-0000-0000-000000000000", "0123abcd-ef01-2345-6789-abcdef012345", "0123ABCD-EF01-2345-6789-ABCDEF012345",
    "0123abcd-ef01-2345-6789-abcdef012345\n", "0123abcd-ef01-2345-6789-abcdef01234", "{0123abcd-ef01-2345-6789-abcdef012345}",
  ] },
  { pattern: "^\\d+\\.[\\-_a-z]?$", inputs: ["1.", "12.-", "1._", "1.z", "1.Z", "1.a\n", ".a", "١.a", "1x"] },
  { pattern: "^a{2,}b{0,1000}$", inputs: ["a", "aa", "aab", `aa${"b".repeat(1000)}`, `aa${"b".repeat(1001)}`] },
  { pattern: "^[\\]]$", inputs: ["]", "\\", "]]", ""] },
  { pattern: "^[^a]$", inputs: ["a", "b", "é", "😀", "\n", ""] },
  { pattern: "^\\D\\d$", inputs: ["x1", "😀1", "11", "x١"] },
  { pattern: "a|b$", inputs: ["a", "xa", "xb", "b\n", "ab"] },
];

test("Go names follow Go's initialism conventions", () => {
  assert.deepEqual(["fetchHTTPStatus", "principalIds", "graphqlPath", "wssUrl", "ttlMs", "uuid", "apis", "jsonUrls"].map(name => goName(name)),
    ["FetchHTTPStatus", "PrincipalIDs", "GraphQLPath", "WssURL", "TTLMs", "UUID", "APIs", "JSONURLs"]);
  assert.throws(() => goName("9lives"), goError('9lives: "9lives" does not map to an exported Go identifier'));
});

test("Go string literals keep schema text from ending the literal", () => {
  assert.equal(goString('a"b\\c\n\r\t\u0001\u007f é \ufeff `'), '"a\\"b\\\\c\\n\\r\\t\\x01\\x7f é \\uFEFF `"');
  assert.throws(() => goString("\ud800"), goError("string literal: text contains a lone surrogate"));
});

test("Go scalar patterns are accepted only where RE2 and ECMAScript agree", () => {
  for (const pattern of PATTERN_CASES.map(entry => entry.pattern)) assert.equal(goPattern(pattern), goString(pattern), `${pattern} runs unchanged`);
  const unsupported = [
    [".", "."], ["(?:a)", "a (? group"], ["\\s", "the escape \\s"], ["\\b", "the escape \\b"], ["\\", "the escape \\"], ["é", '"é"'],
    ["}", '"}"'], ["[é]", "non-ASCII text"], ["[[a]]", "[ inside a character class"], ["[]a]", "an empty character class"],
    ["[^]a]", "an empty character class"], ["[a", "an unterminated character class"], ["a{", "a { that does not start a repeat count"],
    ["a{,2}", "a { that does not start a repeat count"], ["a{1001}", "a repeat count above 1000"],
    ["a{3,2}", "a repeat range whose minimum exceeds its maximum"],
  ];
  for (const [pattern, detail] of unsupported) {
    assert.throws(() => goPattern(pattern, "scalar Sample"),
      goError(`scalar Sample: pattern ${JSON.stringify(pattern)} uses ${detail}, which the Go emitter does not translate`));
  }
});

test("Go scalar entries carry every constraint the runtime enforces, and reject the rest", () => {
  const scalars = Object.fromEntries(buildIr(repoSources()).types.filter(type => type.kind === "scalar").map(type => [type.name, scalarEntry(type)]));
  assert.deepEqual(scalars, {
    String: '{name: "String", representation: "string"}',
    Boolean: '{name: "Boolean", representation: "boolean"}',
    Decimal: '{name: "Decimal", representation: "string", pattern: "^(0|[1-9][0-9]*)$", maximumDecimal: "9223372036854775807"}',
    Int: '{name: "Int", representation: "integer"}',
    PageSize: '{name: "PageSize", representation: "integer", minimum: new(float64(1)), maximum: new(float64(100))}',
    Properties: '{name: "Properties", representation: "object", maxCanonicalJSONBytes: 8192}',
    SignedProof: '{name: "SignedProof", representation: "object", maxCanonicalJSONBytes: 32768, requiredStringProperties: []string{"signature"}}',
    UUID: '{name: "UUID", representation: "string", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", disallowed: []string{"00000000-0000-0000-0000-000000000000"}}',
  });
  const sample = (representation, constraints) => () => scalarEntry({ name: "Sample", representation, constraints });
  assert.equal(sample("number", { minimum: -0.5, maximum: 0.5 })(), '{name: "Sample", representation: "number", minimum: new(float64(-0.5)), maximum: new(float64(0.5))}');
  const rejected = [
    [sample("bigint", {}), 'unsupported representation "bigint"'],
    [sample("integer", { pattern: "x" }), "unsupported integer constraint pattern"],
    [sample("boolean", { minimum: 0 }), "unsupported boolean constraint minimum"],
    [sample("integer", { minimum: 2 ** 53 }), "minimum 9007199254740992 is not a safe integer"],
    [sample("integer", { maximum: 1.5 }), "maximum 1.5 is not a safe integer"],
    [sample("number", { minimum: -Infinity }), "minimum -Infinity is not a finite number"],
    [sample("integer", { minimum: 2, maximum: 1 }), "minimum exceeds maximum"],
    [sample("object", { maxCanonicalJsonBytes: 0 }), "maxCanonicalJsonBytes must be a positive integer"],
    [sample("string", { maximumDecimal: "01" }), "maximumDecimal must be a canonical decimal string"],
    [sample("string", { maximumDecimal: 5 }), "maximumDecimal must be a canonical decimal string"],
  ];
  for (const [entry, message] of rejected) assert.throws(entry, goError(`scalar Sample: ${message}`));
});

test("the Go emitter rejects schema names that collide with the runtime, a client or another member", () => {
  const renamed = name => JSON.parse(JSON.stringify(edgeIr()).replaceAll('"Widget"', JSON.stringify(name)));
  for (const name of ["Problem", "ErrorCode", "Option"]) {
    assert.throws(() => render(renamed(name), {}), goError(`type ${name}: maps to ${name}, which the hand-written runtime already uses in package convohop`));
  }
  assert.throws(() => render(renamed("AlphaClient"), {}), goError("type AlphaClient: maps to AlphaClient, which the alpha client already uses in package convohop"));
  assert.throws(() => render(edgeIr(), { clients: { alpha: "alphaClient" } }), goError('plane alpha: client name "alphaClient" is not an exported Go identifier'));
  assert.throws(() => render(edgeIr(), { clients: { alpha: "Problem" } }), goError("the alpha client: maps to Problem, which the hand-written runtime already uses in package convohop"));
  for (const [field, method, owner] of [["retry", "Retry", "the hand-written runtime"], ["initialize", "Initialize", "the hand-written runtime"], ["capabilities", "Capabilities", "beta.capabilities"]]) {
    const ir = edgeIr();
    ir.operations.find(operation => operation.id === "beta.widgets").field = field;
    assert.throws(() => render(ir, {}), goError(`beta.widgets: maps to ${method}, which ${owner} already uses in BetaClient's methods`));
  }
  const ir = edgeIr();
  const widget = ir.types.find(type => type.name === "Widget");
  widget.fields.push({ ...widget.fields[0], name: "Label" });
  assert.throws(() => render(ir, {}), goError("Widget.Label: maps to Label, which Widget.label already uses in struct Widget"));
});

test("the Go emitter writes three files with the generated-code header, a method and catalog entry per server operation", () => {
  for (const [ir, directory, options] of [[edgeIr(), "go", {}], [buildIr(repoSources()), "go", config.options.go], [edgeIr(), "out/go", { directory: "out/go" }]]) {
    const files = render(ir, options);
    assert.deepEqual(files.map(file => file.path), ["types_gen.go", "operations_gen.go", "catalog_gen.go"].map(name => `${directory}/${name}`));
    for (const file of files) assert.match(file.contents, /^\/\/ Code generated .* DO NOT EDIT\.\n/, `${file.path} starts with the line go generate tools recognise`);
    const [, operations, catalog] = files.map(file => file.contents);
    const ids = exposedIds(ir);
    assert.deepEqual([...catalog.matchAll(/^\t\tid: +"([^"]+)",$/gm)].map(match => match[1]), ids, "the catalog lists the server operations in IR order");
    assert.equal([...operations.matchAll(/^func \(c \*\w+\) \w+\(ctx context\.Context,/gm)].length - [...operations.matchAll(/^func \(c \*\w+\) \w+Pages\(/gm)].length, ids.length);
  }
});

const GO_MINIMUM_MINOR = 26;
const GO_ENV = { ...process.env, GOTOOLCHAIN: "local", GOWORK: "off", GOFLAGS: "" };
const GO_DIFFERENTIAL = `package main

import (
	"encoding/json"
	"os"
	"regexp"
)

// Reads [{pattern, inputs}] and writes whether each input matches, the way
// the convohop runtime checks scalar values.
func main() {
	var cases []struct {
		Pattern string   \`json:"pattern"\`
		Inputs  []string \`json:"inputs"\`
	}
	if err := json.NewDecoder(os.Stdin).Decode(&cases); err != nil {
		panic(err)
	}
	results := make([][]bool, len(cases))
	for i, c := range cases {
		re := regexp.MustCompile(c.Pattern)
		results[i] = []bool{}
		for _, input := range c.Inputs {
			results[i] = append(results[i], re.MatchString(input))
		}
	}
	if err := json.NewEncoder(os.Stdout).Encode(results); err != nil {
		panic(err)
	}
}
`;
// The runtime declarations the generated files use, other than catalog.go.
const RUNTIME_STUB = `package convohop

import "context"

type ErrorCode string

type CallOption func()

type transport struct{}

func (*transport) call(context.Context, string, any, any, any, []CallOption) error { return nil }
`;

/** Runs a Go tool, failing with its output. */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", env: GO_ENV, timeout: 300_000, ...options });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${basename(command)} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`);
  return result.stdout;
}

/** The Go toolchain root, or a skip when Go 1.26+ is missing and CONVOHOP_REQUIRE_GO is not 1. */
function goRoot(t) {
  const result = spawnSync("go", ["env", "GOVERSION", "GOROOT"], { encoding: "utf8", env: GO_ENV });
  const [version, root] = result.status === 0 ? result.stdout.trim().split("\n") : [];
  const match = /^go1\.(\d+)(\.|$|rc|beta)/.exec(version ?? "");
  if (match && Number(match[1]) >= GO_MINIMUM_MINOR) return root;
  const reason = match ? `${version} is older than go1.${GO_MINIMUM_MINOR}` : "Go is not installed";
  if (process.env.CONVOHOP_REQUIRE_GO === "1") assert.fail(`${reason}, and CONVOHOP_REQUIRE_GO=1 requires it`);
  t.skip(`${reason}; set CONVOHOP_REQUIRE_GO=1 to require it`);
  return null;
}

function writeModule(root, name, files) {
  const directory = join(root, name);
  mkdirSync(directory);
  writeFileSync(join(directory, "go.mod"), `module example.com/${name}\n\ngo 1.${GO_MINIMUM_MINOR}.0\n`);
  for (const [file, contents] of Object.entries(files)) writeFileSync(join(directory, file), contents);
  return directory;
}

test("Go output is gofmt-clean, and the edge output type-checks and passes go vet (needs Go 1.26+)", t => {
  const root = goRoot(t);
  if (!root) return;
  const work = mkdtempSync(join(tmpdir(), "sdkgen-go-"));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const contents = files => Object.fromEntries(files.map(file => [basename(file.path), file.contents]));
  const edge = writeModule(work, "edge", { ...contents(render(edgeIr(), {})), "stub.go": RUNTIME_STUB });
  copyFileSync(join(REPO_ROOT, "go/catalog.go"), join(edge, "catalog.go"));
  const repo = writeModule(work, "repo", contents(render(buildIr(repoSources()))));
  const generated = [edge, repo].flatMap(directory => ["types_gen.go", "operations_gen.go", "catalog_gen.go"].map(name => join(directory, name)));
  const gofmt = join(root, "bin", process.platform === "win32" ? "gofmt.exe" : "gofmt");
  assert.equal(run(gofmt, ["-l", ...generated]), "", "gofmt would rewrite these files, including their doc comments");
  run("go", ["vet", "./..."], { cwd: edge });
});

test("Go's regexp matches like ECMAScript on every pattern the emitter accepts (needs Go 1.26+)", t => {
  const root = goRoot(t);
  if (!root) return;
  const work = mkdtempSync(join(tmpdir(), "sdkgen-go-"));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const program = writeModule(work, "differential", { "main.go": GO_DIFFERENTIAL });
  const goResults = JSON.parse(run("go", ["run", "."], { cwd: program, input: JSON.stringify(PATTERN_CASES) }));
  PATTERN_CASES.forEach(({ pattern, inputs }, index) => {
    goPattern(pattern);
    const expected = inputs.map(input => new RegExp(pattern, "u").test(input));
    assert.deepEqual(goResults[index], expected, `Go and ECMAScript disagree on ${pattern} for ${JSON.stringify(inputs)}`);
  });
});
