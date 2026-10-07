import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import config from "../sdkgen.config.mjs";
import { EmitterError, listEmittableFiles, renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { formatJson } from "../lib/json.mjs";
import { codeUnitCompare } from "../lib/naming.mjs";
import { operationTypeNames, scalarTsType } from "../emitters/typescript.mjs";
import { REPO_ROOT, assertGoldenTree, fixtureSources, repoSources } from "./helpers.mjs";

const render = sources => renderEmitters(buildIr(sources), config.emitters, { options: config.options });

test("the edge fixture renders to the golden files", () => {
  // golden/edge/packages/core/src/generated/v1-generated.ts was verified byte-identical to
  // @graphql-codegen/cli 7.4.3 with typescript-operations 6.1.7 before those packages were removed.
  assertGoldenTree("edge", render(fixtureSources()));
});

test("the committed generated files match a fresh render of the repository schemas", () => {
  const files = render(repoSources());
  assert.deepEqual(files.map(file => file.emitter).filter((name, i, all) => all.indexOf(name) === i), config.emitters.map(emitter => emitter.name));
  for (const file of files) {
    assert.equal(readFileSync(join(REPO_ROOT, file.path), "utf8"), file.contents, `${file.path} is stale. Run npm run generate:graphql.`);
  }
  for (const directory of config.emitters.flatMap(emitter => emitter.owns)) {
    const expected = files.filter(file => file.path.startsWith(`${directory}/`)).map(file => file.path).sort(codeUnitCompare);
    assert.deepEqual(listEmittableFiles(REPO_ROOT, directory), expected, `${directory} has stale files. Run npm run generate:graphql.`);
  }
});

test("the ir and graphql-operations emitters publish the IR, the documents and the runtime catalog", () => {
  const ir = buildIr(fixtureSources());
  const files = Object.fromEntries(render(fixtureSources()).map(file => [file.path, file.contents]));
  assert.equal(files["schema/v1-ir.json"], formatJson(ir));
  assert.equal(files["schema/operations-v1.graphql"], `${ir.operations.map(operation => operation.document.text).join("\n\n")}\n`);
  const catalog = JSON.parse(files["schema/v1-operations.json"]).operations;
  assert.deepEqual(Object.keys(catalog), ir.operations.map(operation => operation.id));
  assert.deepEqual(catalog["alpha.fetchHTTPStatus"], {
    plane: "alpha", kind: "query", field: "fetchHTTPStatus", operationName: "AlphaFetchHTTPStatus",
    query: ir.operations.find(operation => operation.id === "alpha.fetchHTTPStatus").document.text, resultType: "Int", inputFields: ["method"],
  });
});

test("TypeScript names and scalar types follow the graphql-codegen conventions the packages rely on", () => {
  const names = (operationName, kind) => operationTypeNames({ id: "x", operationName, kind });
  assert.deepEqual(names("AlphaFetchHTTPStatus", "query"), { result: "AlphaFetchHttpStatusQuery", variables: "AlphaFetchHttpStatusQueryVariables" });
  assert.deepEqual(names("BetaCreateWidget", "mutation"), { result: "BetaCreateWidgetMutation", variables: "BetaCreateWidgetMutationVariables" });
  assert.deepEqual(names("AlphaEventStream", "subscription"), { result: "AlphaEventStreamSubscription", variables: "AlphaEventStreamSubscriptionVariables" });
  assert.throws(() => names("AlphaX", "fragment"), new EmitterError('typescript: x has unsupported kind "fragment"'));

  const scalar = (name, representation, builtIn = false) => ({ name, representation, builtIn });
  assert.equal(scalarTsType(scalar("ID", "string", true), "input"), "string | number");
  assert.equal(scalarTsType(scalar("ID", "string", true), "output"), "string");
  assert.equal(scalarTsType(scalar("ID", "string"), "input"), "string", "only the built-in ID accepts numbers");
  assert.deepEqual(["string", "integer", "number", "boolean", "object"].map(representation => scalarTsType(scalar("S", representation), "output")),
    ["string", "number", "number", "boolean", "Record<string, unknown>"]);
  assert.throws(() => scalarTsType(scalar("Big", "bigint"), "output"), new EmitterError('typescript: scalar Big has unsupported representation "bigint"'));
});

const USAGE = `import type * as Generated from "./v1-generated.js";
import { v1Operations, v1OutputShapes, type V1OperationTypes } from "./v1-operations.js";

type Variables<K extends keyof V1OperationTypes> = V1OperationTypes[K]["variables"];
type Result<K extends keyof V1OperationTypes> = V1OperationTypes[K]["result"];

export const ping: Variables<"alpha.ping"> = { context: { requestId: "r1" } };
export const items: Variables<"alpha.items"> = { context: { requestId: 7, tags: null }, input: { fruits: ["APPLE", "apple10"], limit: null } };
export const create: Variables<"beta.createWidget"> = { context: { requestId: "r2" }, input: { label: "x" } };
// @ts-expect-error a required input argument cannot be omitted
export const missingInput: Variables<"alpha.items"> = { context: { requestId: "r3" } };
// @ts-expect-error input fields without a default are required
export const missingLabel: Variables<"beta.createWidget"> = { context: { requestId: "r4" }, input: {} };
// @ts-expect-error variables are exact
export const extra: Variables<"alpha.ping"> = { context: { requestId: "r5" }, other: 1 };
// @ts-expect-error enum values are exact
export const fruit: Generated.Fruit = "apple";

declare const job: Result<"alpha.job">;
export const state: string | undefined = job.job?.state;
// @ts-expect-error nullable results must be narrowed
export const unchecked: string = job.job.state;
declare const events: Result<"alpha.events">;
export const sequence: string = events.events.items[0]?.sequence ?? "0";
// @ts-expect-error counters are canonical decimal strings, never numbers
export const numeric: number = events.events.items[0]!.sequence;

export const query: string = v1Operations["alpha.items"].query;
export const inputFields: readonly string[] = v1Operations["beta.widgets"].inputFields;
export const shape = v1OutputShapes["Fruit"]?.kind;
// @ts-expect-error unknown operation keys are rejected
export const unknownOperation = v1Operations["alpha.missing"];
`;

test("the generated TypeScript type-checks under strict compiler settings", t => {
  const root = mkdtempSync(join(tmpdir(), "sdkgen-tsc-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of render(fixtureSources()).filter(entry => entry.emitter === "typescript")) writeFileSync(join(root, basename(file.path)), file.contents);
  writeFileSync(join(root, "usage.ts"), USAGE);
  writeFileSync(join(root, "package.json"), '{ "type": "module" }\n');
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true, noImplicitOverride: true, types: [], noEmit: true,
    },
    include: ["*.ts"],
  }));
  const result = spawnSync(process.execPath, [join(REPO_ROOT, "node_modules/typescript/bin/tsc"), "-p", root], { encoding: "utf8" });
  assert.equal(result.status, 0, `tsc failed:\n${result.stdout}${result.stderr}`);
});
