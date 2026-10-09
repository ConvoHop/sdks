import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import cliOperations, {
  DIRECTORY, WITHHELD, cliOperationEntries, cliOperationList, cliScopeEntries, cliTypeEntries,
} from "../emitters/cli-operations.mjs";
import { mcpToolDefinitions } from "../emitters/mcp-tools.mjs";
import { EmitterError, renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { REPO_ROOT, fixtureSources, repoSources } from "./helpers.mjs";

const edge = (options = {}) => buildIr(fixtureSources(options));
const types = ir => cliTypeEntries(ir, cliOperationList(ir));

test("the catalog lists the operations the MCP tools expose, in IR order", () => {
  for (const ir of [edge(), buildIr(repoSources())]) {
    assert.deepEqual(Object.keys(cliOperationEntries(ir)), mcpToolDefinitions(ir).map(tool => tool.operation.id));
  }
  assert.deepEqual(Object.keys(cliOperationEntries(edge())), [
    "alpha.capabilities", "alpha.resolveRequest", "alpha.job", "alpha.startJob",
    "beta.capabilities", "beta.resolveRequest", "beta.widgets", "beta.createWidget",
  ], "client-only (items, events, ping), context-permit (redeem), subscription (eventStream) and deprecated (fetchHTTPStatus) operations are left out");
});

test("entries carry the operation text, credential, authorization, retry, pagination and polling annotations", () => {
  const entries = cliOperationEntries(edge());
  assert.deepEqual(entries["alpha.startJob"], {
    id: "alpha.startJob", plane: "alpha", kind: "mutation", summary: "Start a job. It finishes asynchronously.",
    credential: "serverKey", requires: "serverKey with scope widgetWrite", idempotency: "idempotent", retry: "sameRequest",
    resolvable: true, destructive: false, longRunning: { poll: "alpha.job", refField: "job" }, input: "StartJobInput",
  });
  assert.deepEqual(entries["alpha.capabilities"], {
    id: "alpha.capabilities", plane: "alpha", kind: "query", summary: "Read the server capabilities.", description: "Server capabilities.",
    credential: "serverKey", requires: "serverKey", idempotency: "safe", retry: "repeat", resolvable: false, destructive: false,
  }, "operations without input have no input type");
  assert.equal(entries["alpha.resolveRequest"].requires, "serverKey with scope itemRead",
    "only the alternatives the CLI's credential can satisfy are described");
  assert.equal(entries["beta.widgets"].paged, "Paged (bounded): One bounded page.");
  assert.equal(entries["beta.createWidget"].idempotency, "singleUse");

  const destructive = cliOperationEntries(edge({ annotations: a => { a.operations["beta.createWidget"].destructive = true; } }));
  assert.equal(destructive["beta.createWidget"].destructive, true);
});

test("cliTypes describes every input type, enum and custom scalar the inputs use", () => {
  const catalog = types(edge());
  assert.deepEqual(Object.keys(catalog), [
    "Blob", "CreateWidgetInput", "JobInput", "Ratio", "ResolveInput", "ShapeInput", "StartJobInput", "WidgetState", "WidgetsInput",
  ], "built-in scalars and types that only client-only or excluded operations use are left out");
  assert.deepEqual(catalog.CreateWidgetInput.fields, [
    { name: "label", type: "String!", required: true },
    { name: "state", type: "WidgetState", required: false, default: "ACTIVE" },
    { name: "ratio", type: "Ratio", required: false, default: 0.5 },
    { name: "nested", type: "[[Int!]!]", required: false },
    { name: "shape", type: "ShapeInput", required: false, default: { kind: "box", sides: [1, 2] } },
  ]);
  assert.deepEqual(catalog.StartJobInput.fields[1], { name: "repeat", type: "Int", required: false, description: "How many times to run.", default: 1 });
  assert.deepEqual(catalog.WidgetState, { kind: "enum", values: ["ACTIVE", "ARCHIVED"] });
  assert.deepEqual(catalog.Ratio, { kind: "scalar", description: "Fraction between 0 and 1." }, "scalars use their one-line summary");
});

test("cliScopes lists every backend-key scope by wire name, with its summary, in IR order", () => {
  assert.deepEqual(cliScopeEntries(edge()), { itemRead: "Read items and jobs.", widgetWrite: "Create widgets and start jobs." });
  const ir = buildIr(repoSources());
  assert.deepEqual(Object.keys(cliScopeEntries(ir)), ir.scopes.map(scope => scope.name));
  assert.ok(Object.values(cliScopeEntries(ir)).every(summary => summary && !summary.includes("\n")));
});

test("deprecated fields, enum descriptions and recursive input types are kept", () => {
  const ir = edge();
  const items = ir.operations.find(operation => operation.id === "alpha.items");
  // alpha.items is client-only; give a server-layer copy its input to exercise deprecated fields and enums.
  const copy = { ...structuredClone(ir.operations.find(operation => operation.id === "alpha.job")), id: "alpha.itemsCopy", field: "itemsCopy", input: items.input };
  const catalog = cliTypeEntries(ir, [copy]);
  assert.equal(catalog.ItemsInput.description, "Filters for alpha.items. A closing comment marker */ must not end a generated comment.");
  assert.deepEqual(catalog.ItemsInput.fields.find(field => field.name === "legacyFilter"),
    { name: "legacyFilter", type: "String", required: false, deprecated: { reason: "Use fruits." } });
  assert.equal(catalog.Fruit.description, "Kinds of fruit. The values are deliberately unsorted.");
  assert.ok(catalog.Box_3dInput, "nested input types are listed");

  const recursive = edge();
  recursive.types.find(type => type.name === "ShapeInput").fields.push({ name: "inner", type: { kind: "input", name: "ShapeInput", nullable: true } });
  assert.deepEqual(types(recursive).ShapeInput.fields.at(-1), { name: "inner", type: "ShapeInput", required: false });

  const output = edge();
  output.types.find(type => type.name === "ShapeInput").fields[0].type = { kind: "object", name: "Item", nullable: false };
  assert.throws(() => types(output), new EmitterError("cli-operations: beta.createWidget.shape.kind: object type Item cannot be an input"));
});

test("the repository catalog withholds credential-returning operations and marks destructive ones", () => {
  const ir = buildIr(repoSources());
  const entries = Object.values(cliOperationEntries(ir));
  const ids = new Set(ir.operations.map(operation => operation.id));
  for (const id of Object.keys(WITHHELD)) {
    assert.ok(ids.has(id), `withheld operation ${id} no longer exists; update CREDENTIAL_OPERATIONS`);
    assert.ok(!entries.some(entry => entry.id === id), `${id} must not be in the catalog`);
  }
  assert.ok(entries.every(entry => entry.credential === (entry.plane === "management" ? "portalCredential" : "backendKey")),
    "the CLI sends the portal credential to the management plane and a backend key to the communication plane");
  assert.deepEqual(entries.filter(entry => entry.destructive).map(entry => entry.id).sort(), [
    "communication.deleteMessage", "communication.disablePrincipal", "communication.endLiveSession", "communication.removeMember",
    "communication.revokeSession", "management.disableWebhook", "management.revokeBackendKey", "management.rotateWebhookSecret",
    "management.updateWebhook",
  ]);
  const revoke = entries.find(entry => entry.id === "management.revokeBackendKey");
  assert.equal(revoke.requires, "portalCredential (condition owner: The caller owns the organization, deployment or project)");
  assert.deepEqual(revoke.longRunning, { poll: "management.getOperation", refField: "operation" });
  assert.ok(entries.every(entry => entry.kind === "query" || (entry.retry === "sameRequest" && entry.resolvable)),
    "every mutation the CLI runs can be resent and resolved; update the CLI's recovery before adding other classes");
  const catalog = types(ir);
  assert.deepEqual(catalog[revoke.input].fields.map(field => `${field.name}: ${field.type}`),
    ["projectId: UUID!", "keyId: String!", "expectedRevision: Decimal!", "revokeIssuedSessions: Boolean!"]);
  assert.equal(catalog.UUID.description, "Canonical lowercase UUID. The nil UUID is rejected.");
});

const USAGE = `import { cliOperations, cliScopes, cliTypes, withheldOperations, type CliOperation, type CliType } from "./operations.js";

export const first: CliOperation | undefined = Object.values(cliOperations)[0];
export const type: CliType | undefined = first?.input === undefined ? undefined : cliTypes[first.input];
export const fields: string[] = type?.kind === "input" ? type.fields.map(field => field.name) : [];
export const withheld: string[] = Object.keys(withheldOperations);
export const scope: string | undefined = cliScopes.itemRead;
export const destructive: boolean | undefined = cliOperations["beta.createWidget"]?.destructive;
// @ts-expect-error the catalog is read-only
cliOperations["beta.createWidget"] = first!;
`;

test("the generated catalog type-checks under strict compiler settings", t => {
  const root = mkdtempSync(join(tmpdir(), "sdkgen-cli-tsc-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const [file] = renderEmitters(edge(), [cliOperations]);
  assert.equal(file.path, `${DIRECTORY}/operations.ts`);
  writeFileSync(join(root, "operations.ts"), file.contents);
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
