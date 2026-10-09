import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import config from "../sdkgen.config.mjs";
import { EmitterError } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { codeUnitCompare } from "../lib/naming.mjs";
import python, { docstring, includedOperations, pythonName, renderPythonPlane, renderPythonTypes } from "../emitters/python.mjs";
import { REPO_ROOT, assertGoldenTree, fixtureSources, repoSources } from "./helpers.mjs";

const DIRECTORY = "src/convohop/_generated";
const edgeIr = () => buildIr(fixtureSources());

// The edge fixture with its client queries and mutations opened to the server key, so the Python emitter renders
// the enums, keyword names, nested lists and replay pages those operations use.
function openIr() {
  return buildIr(fixtureSources({
    annotations: annotations => {
      for (const id of ["alpha.items", "alpha.events", "alpha.ping"]) {
        const operation = annotations.operations[id];
        operation.layer = "both";
        operation.auth.push({ credential: "serverKey", scopes: ["itemRead"] });
      }
    },
  }));
}

const emit = ir => python.emit(ir, { directory: DIRECTORY });
const error = message => new EmitterError(`python: ${message}`);

test("the edge fixture with every client operation opened renders to the Python golden files", () => {
  assertGoldenTree("python", emit(openIr()));
});

test("the emitter covers the server queries and mutations a bearer credential authorizes", () => {
  assert.deepEqual(includedOperations(edgeIr()).map(operation => operation.id), [
    "alpha.capabilities", "alpha.resolveRequest", "alpha.job", "alpha.fetchHTTPStatus", "alpha.startJob",
    "beta.capabilities", "beta.resolveRequest", "beta.widgets", "beta.createWidget",
  ], "client-only operations, subscriptions and permit-authorized operations stay out");
  const ids = includedOperations(buildIr(repoSources())).map(operation => operation.id);
  assert.ok(ids.includes("communication.sendMessage") && ids.includes("management.createProject"));
  assert.ok(!ids.includes("communication.conversationEvents"), "subscriptions need graphql-transport-ws");
  assert.ok(!ids.includes("communication.redeemCredential"), "a delivery permit is not a bearer credential");
});

test("the generated package holds exactly the modules the emitter writes", () => {
  const directory = config.options.python.directory;
  const expected = python.emit(buildIr(repoSources()), config.options.python).map(file => file.path).sort(codeUnitCompare);
  const actual = readdirSync(join(REPO_ROOT, directory), { withFileTypes: true })
    .filter(entry => entry.name !== "__pycache__")
    .map(entry => `${directory}/${entry.name}`).sort(codeUnitCompare);
  assert.deepEqual(actual, expected, `${directory} has stale files. Run npm run generate:graphql.`);
});

test("Python names are snake_case identifiers with keywords escaped", () => {
  assert.equal(pythonName("wssUrl", "x"), "wss_url");
  assert.equal(pythonName("fetchHTTPStatus", "x"), "fetch_http_status");
  assert.equal(pythonName("item10", "x"), "item10");
  assert.equal(pythonName("from", "x"), "from_");
  assert.equal(pythonName("class", "x"), "class_");
  assert.equal(pythonName("None", "x"), "none", "snake_case lowercases, so only lowercase keywords collide");
  assert.throws(() => pythonName("9lives", "T.f"), error('T.f: "9lives" has no Python identifier'));
});

test("docstrings escape backslashes and quote runs and drop trailing spaces", () => {
  assert.equal(docstring("A \\d+ match", ""), '"""A \\\\d+ match"""');
  assert.equal(docstring('Say "hi"', ""), '"""Say "hi\\""""');
  assert.equal(docstring('Three """ quotes', "  "), '  """Three \\""" quotes"""');
  assert.equal(docstring("First  \n\nSecond\n", "    "), '    """First\n\n    Second\n    """');
});

test("the emitter rejects names that would collide or shadow generated members", () => {
  const withField = (type, field) => {
    const ir = openIr();
    const target = ir.types.find(entry => entry.name === type);
    target.fields.push({ ...structuredClone(target.fields[0]), name: field });
    return ir;
  };
  assert.throws(() => renderPythonTypes(withField("Item", "toDict")), error("Item.toDict would shadow to_dict"));
  assert.throws(() => renderPythonTypes(withField("Item", "self")), error("Item.self would shadow self"));
  assert.throws(() => renderPythonTypes(withField("ItemsInput", "Limit")), error("ItemsInput.Limit and ItemsInput.limit both map to limit"));
  assert.throws(() => renderPythonPlane(withField("StartJobInput", "requestId"), "alpha"), error("alpha.startJob input would shadow request_id"));

  const renamed = (id, field) => {
    const ir = openIr();
    ir.operations.find(operation => operation.id === id).field = field;
    return ir;
  };
  assert.throws(() => renderPythonPlane(renamed("alpha.job", "close"), "alpha"), error("alpha.job would shadow the client attribute close"));
  assert.throws(() => renderPythonPlane(renamed("alpha.job", "iterItems"), "alpha"), error("alpha.job and alpha.items both map to iter_items"));

  const retyped = name => {
    const ir = openIr();
    const type = ir.types.find(entry => entry.name === "Receipt");
    type.name = name;
    for (const operation of ir.operations) if (operation.result.type.name === "Receipt") operation.result.type.name = name;
    for (const entry of ir.types) for (const field of entry.fields ?? []) if (field.type.name === "Receipt") field.type.name = name;
    return ir;
  };
  assert.throws(() => renderPythonTypes(retyped("Mapping")), error("type Mapping would shadow a Python keyword or a generated name"));
  assert.throws(() => renderPythonTypes(retyped("AlphaOperations")), error("type AlphaOperations would shadow a Python keyword or a generated name"));
});

test("the rendered Python compiles", t => {
  const probe = spawnSync("python3", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    t.skip("python3 is not installed; the Python workflow type-checks the golden files");
    return;
  }
  // compile() checks syntax without writing __pycache__ next to the golden files.
  const script = "import json, sys\nfor name, source in json.load(sys.stdin).items():\n    compile(source, name, 'exec')\n";
  for (const ir of [edgeIr(), openIr(), buildIr(repoSources())]) {
    const files = Object.fromEntries(emit(ir).map(file => [file.path, file.contents]));
    const result = spawnSync("python3", ["-c", script], { input: JSON.stringify(files), encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
});
