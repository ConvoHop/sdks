import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mcpTools, { DIRECTORY, META_KEY, RETRY_TOOL, WITHHELD, mcpToolDefinitions, toolOperations } from "../emitters/mcp-tools.mjs";
import { EmitterError, renderEmitters } from "../lib/emitter.mjs";
import { buildIr } from "../lib/ir.mjs";
import { REPO_ROOT, fixtureSources, repoSources } from "./helpers.mjs";

const byName = tools => Object.fromEntries(tools.map(tool => [tool.name, tool]));
const edgeTools = (options = {}) => byName(mcpToolDefinitions(buildIr(fixtureSources(options))));
const UUID = {
  type: "string",
  description: "Canonical lowercase UUID. The nil UUID is rejected.",
  pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
  not: { enum: ["00000000-0000-0000-0000-000000000000"] },
};

test("server-callable queries and mutations become tools named after their plane and field", () => {
  assert.deepEqual(mcpToolDefinitions(buildIr(fixtureSources())).map(tool => [tool.name, tool.operation.id, tool.title]), [
    ["alpha_capabilities", "alpha.capabilities", "Alpha: capabilities"],
    ["alpha_resolve_request", "alpha.resolveRequest", "Alpha: resolve request"],
    ["alpha_job", "alpha.job", "Alpha: job"],
    ["alpha_start_job", "alpha.startJob", "Alpha: start job"],
    ["beta_capabilities", "beta.capabilities", "Beta: capabilities"],
    ["beta_resolve_request", "beta.resolveRequest", "Beta: resolve request"],
    ["beta_widgets", "beta.widgets", "Beta: widgets"],
    ["beta_create_widget", "beta.createWidget", "Beta: create widget"],
  ], "client-only (items, events, ping), context-permit (redeem), subscription (eventStream), deprecated (fetchHTTPStatus), " +
    "anonymous (requestAccess) and other-bearer (claimWidget) operations get no tool");
});

test("tool hints and operation metadata carry the auth, idempotency, pagination and polling annotations", () => {
  const tools = edgeTools();
  assert.deepEqual(tools.alpha_job.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  assert.deepEqual(tools.alpha_start_job.annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    "each call sends a new request ID, so a mutation is never idempotent across calls");
  assert.deepEqual(tools.alpha_start_job.operation, {
    id: "alpha.startJob", plane: "alpha", kind: "mutation", credential: "serverKey",
    auth: [{ credential: "serverKey", scopes: ["widgetWrite"] }], idempotency: "idempotent", destructive: false,
    pagination: { style: "none" }, longRunning: { poll: "alpha.job", refField: "job", tool: "alpha_job" },
  });
  assert.deepEqual(tools.alpha_resolve_request.operation.auth, [{ credential: "userToken", condition: "owner" }, { credential: "serverKey", scopes: ["itemRead"] }],
    "the metadata keeps every authorization alternative");
  assert.equal(tools.alpha_resolve_request.operation.credential, "serverKey");
  assert.equal(tools.beta_widgets.operation.pagination.style, "bounded");
  assert.equal(tools.beta_create_widget.operation.idempotency, "singleUse");

  const start = tools.alpha_start_job.description;
  assert.equal(start.split("\n\n")[0], "Start a job. It finishes asynchronously.");
  assert.match(start, /^Operation alpha\.startJob \(mutation\)\.$/m);
  assert.match(start, /^Requires serverKey with scope widgetWrite\.$/m);
  assert.match(start, new RegExp(`call ${RETRY_TOOL} with that requestId instead of calling this tool again\\.$`, "m"));
  assert.match(start, /^Long-running: the result's job identifies work that finishes later\. Poll it with alpha_job\.$/m);
  assert.doesNotMatch(start, /Destructive/);
  assert.match(tools.alpha_resolve_request.description, /^Requires serverKey with scope itemRead\.$/m);
  assert.doesNotMatch(tools.alpha_resolve_request.description, /userToken/, "only the alternatives the server can satisfy are described");
  assert.match(tools.alpha_job.description, /^Read-only and safe to repeat\.$/m);
  assert.match(tools.beta_widgets.description, /^Paged \(bounded\): One bounded page\.$/m);
  assert.equal(tools.alpha_capabilities.description,
    "Read the server capabilities.\n\nServer capabilities.\n\nOperation alpha.capabilities (query).\nRequires serverKey.\nRead-only and safe to repeat.",
    "the schema description follows the summary, then the annotation notes");
});

test("destructive mutations are marked for clients and agents", () => {
  const tool = edgeTools({ annotations: a => { a.operations["beta.createWidget"].destructive = true; } }).beta_create_widget;
  assert.equal(tool.annotations.destructiveHint, true);
  assert.equal(tool.annotations.readOnlyHint, false);
  assert.equal(tool.operation.destructive, true);
  assert.match(tool.description, /^Destructive: it deletes, revokes, removes, disables or ends something\. Confirm with the user before calling it\.$/m);
});

test("input schemas describe the operation input type exactly", () => {
  const tools = edgeTools();
  assert.deepEqual(tools.alpha_capabilities.inputSchema, { type: "object", properties: {}, additionalProperties: false });
  assert.deepEqual(tools.alpha_job.inputSchema, {
    type: "object", properties: { operationId: { type: ["string", "integer"] } }, required: ["operationId"], additionalProperties: false,
  }, "GraphQL coerces integers to the built-in ID");
  assert.deepEqual(tools.alpha_start_job.inputSchema, {
    type: "object",
    properties: {
      itemId: { type: ["string", "integer"] },
      repeat: { type: ["integer", "null"], description: "How many times to run.", default: 1 },
      props: {
        type: ["object", "null"], description: "Server-signed JSON object. Pass it back unchanged.",
        properties: { signature: { type: "string" } }, required: ["signature"],
      },
    },
    required: ["itemId"],
    additionalProperties: false,
  });
  assert.deepEqual(tools.beta_create_widget.inputSchema, {
    type: "object",
    properties: {
      label: { type: "string" },
      state: { type: ["string", "null"], enum: ["ACTIVE", "ARCHIVED", null], default: "ACTIVE" },
      ratio: { type: ["number", "null"], description: "Fraction between 0 and 1.", minimum: 0, maximum: 1, default: 0.5 },
      nested: { type: ["array", "null"], items: { type: "array", items: { type: "integer" } } },
      shape: {
        type: ["object", "null"],
        properties: { kind: { type: "string" }, sides: { type: "array", items: { type: "integer" } } },
        required: ["kind", "sides"], additionalProperties: false, default: { kind: "box", sides: [1, 2] },
      },
    },
    required: ["label"],
    additionalProperties: false,
  }, "fields with defaults are optional, nullable fields accept null and nested inputs are inlined");
  assert.deepEqual(tools.beta_widgets.inputSchema.properties.states, {
    type: ["array", "null"], items: { type: "string", enum: ["ACTIVE", "ARCHIVED"] },
  });
});

test("deprecated input fields and enum descriptions are kept", () => {
  const ir = buildIr(fixtureSources());
  const items = ir.operations.find(operation => operation.id === "alpha.items");
  // alpha.items is client-only; give a server-layer copy its input to exercise deprecated fields and enums.
  const copy = { ...structuredClone(ir.operations.find(operation => operation.id === "alpha.job")), id: "alpha.itemsCopy", field: "itemsCopy", input: items.input };
  const tool = byName(mcpToolDefinitions({ ...ir, operations: [...ir.operations, copy] })).alpha_items_copy;
  assert.deepEqual(tool.inputSchema.properties.legacyFilter, { type: ["string", "null"], description: "Deprecated: Use fruits.", deprecated: true });
  assert.equal(tool.inputSchema.properties.fruits.items.description, "Kinds of fruit. The values are deliberately unsorted.");
  assert.deepEqual(tool.inputSchema.properties.box.type, ["object", "null"]);
  assert.deepEqual(tool.inputSchema.properties.box.required, ["width", "height", "depth"]);
  assert.equal(tool.inputSchema.description, "Filters for alpha.items. A closing comment marker */ must not end a generated comment.");
});

test("unsupported inputs and ambiguous tool names are rejected", () => {
  const ir = () => buildIr(fixtureSources());
  const recursive = ir();
  recursive.types.find(type => type.name === "ShapeInput").fields.push({ name: "inner", type: { kind: "input", name: "ShapeInput", nullable: true } });
  assert.throws(() => mcpToolDefinitions(recursive),
    new EmitterError("mcp-tools: beta.createWidget.shape.inner: input type ShapeInput is recursive, and tool schemas inline nested inputs"));

  const constrained = ir();
  constrained.types.find(type => type.name === "Ratio").constraints.multipleOf = 2;
  assert.throws(() => mcpToolDefinitions(constrained), new EmitterError("mcp-tools: beta.createWidget.ratio: scalar Ratio has unsupported constraint(s) multipleOf"));

  const colliding = ir();
  const capabilities = colliding.operations.find(operation => operation.id === "beta.capabilities");
  colliding.operations.push({ ...structuredClone(capabilities), id: "beta.Capabilities", field: "Capabilities" });
  assert.throws(() => mcpToolDefinitions(colliding), new EmitterError("mcp-tools: beta.Capabilities and beta.capabilities both map to tool name beta_capabilities"));
});

test("the repository catalog withholds credential-returning and consent operations and marks destructive ones", () => {
  const ir = buildIr(repoSources());
  const ids = new Set(ir.operations.map(operation => operation.id));
  for (const id of Object.keys(WITHHELD)) assert.ok(ids.has(id), `withheld operation ${id} no longer exists; update WITHHELD`);
  const tools = mcpToolDefinitions(ir);
  const toolIds = new Set(tools.map(tool => tool.operation.id));
  for (const id of Object.keys(WITHHELD)) assert.ok(!toolIds.has(id), `${id} must not be a tool`);
  assert.deepEqual(toolOperations(ir).map(operation => operation.id), tools.map(tool => tool.operation.id));
  assert.ok(tools.every(tool => tool.operation.credential === (tool.operation.plane === "management" ? "portalCredential" : "backendKey")));
  assert.deepEqual(tools.filter(tool => tool.annotations.destructiveHint).map(tool => tool.operation.id).sort(), [
    "communication.deleteMessage", "communication.disablePrincipal", "communication.endLiveSession", "communication.removeMember",
    "communication.revokeSession", "management.disableWebhook", "management.revokeAgentGrant", "management.revokeBackendKey",
    "management.rotateWebhookSecret", "management.updateWebhook",
  ]);
  const revoke = byName(tools).management_revoke_backend_key;
  assert.match(revoke.description, /^Requires portalCredential \(condition owner: The caller owns the organization, deployment or project\)\.$/m);
  assert.equal(revoke.operation.longRunning.tool, "management_get_operation");
  assert.deepEqual(revoke.inputSchema.properties.projectId, UUID);
});

const USAGE = `import { mcpTools, operationMetaKey, retryToolName, withheldOperations, type JsonSchema, type McpToolDefinition } from "./tools.js";

export const first: McpToolDefinition | undefined = mcpTools[0];
export const schema: JsonSchema | undefined = first?.inputSchema;
export const names: string[] = mcpTools.map(tool => tool.name);
export const keys: string = operationMetaKey + retryToolName + Object.keys(withheldOperations).join();
export const destructive: boolean | undefined = first?.annotations.destructiveHint;
// @ts-expect-error the catalog is read-only
mcpTools.push(mcpTools[0]!);
`;

test("the generated catalog type-checks under strict compiler settings", t => {
  const root = mkdtempSync(join(tmpdir(), "sdkgen-mcp-tsc-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const [file] = renderEmitters(buildIr(fixtureSources()), [mcpTools]);
  assert.equal(file.path, `${DIRECTORY}/tools.ts`);
  assert.match(file.contents, new RegExp(`export const operationMetaKey = "${META_KEY}";`));
  writeFileSync(join(root, "tools.ts"), file.contents);
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
