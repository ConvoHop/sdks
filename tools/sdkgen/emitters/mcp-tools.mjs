import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, requireType } from "../lib/ir-model.mjs";
import { formatJson } from "../lib/json.mjs";
import { capitalize, snakeCase, words } from "../lib/naming.mjs";
import {
  CREDENTIAL_OPERATIONS, authText, oneLine, paginationText, serverCredential, serverOperations,
} from "../lib/server-operations.mjs";

/**
 * MCP tool catalog for @convohop/mcp.
 *
 * Each query and mutation that a server bearer credential can call becomes
 * one tool. Its entry carries the operation's annotations (credential,
 * scopes, conditions, idempotency, destructiveness, pagination and polling),
 * maps them to MCP tool hints and describes the operation's input type as a
 * JSON Schema object. Subscriptions, client-only and deprecated operations
 * and the operations in WITHHELD get no tool.
 */
export const DIRECTORY = "packages/mcp/src/generated";
/** The hand-written @convohop/mcp tool that resolves a mutation with an unknown outcome and resends it only when the authority never saw it. */
export const RETRY_TOOL = "retry_request";
/** The tool `_meta` key that carries the operation annotations. */
export const META_KEY = "com.convohop/operation";

/** Operations whose results are credentials. An agent must never receive them, so they get no tool. */
export const WITHHELD = CREDENTIAL_OPERATIONS;

const NOTICE = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n";
// Portable across MCP clients: some reject dots and names longer than 64 characters.
const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const REPRESENTATION_TYPES = { string: "string", integer: "integer", number: "number", boolean: "boolean", object: "object" };
const CONSTRAINTS = new Set(["pattern", "disallowed", "minimum", "maximum", "maximumDecimal", "maxCanonicalJsonBytes", "requiredStringProperties"]);

export const toolName = operation => `${operation.plane}_${snakeCase(operation.field)}`;

/** The first server credential sent as a bearer token, which the MCP server authenticates the tool with. */
export const toolCredential = (ir, operation) => serverCredential(ir, operation, "mcp-tools");

/** The operations that become tools, in IR order. */
export const toolOperations = ir => serverOperations(ir, "mcp-tools");

function nullable(schema) {
  if (schema.enum) return { ...schema, type: [schema.type, "null"], enum: [...schema.enum, null] };
  return { ...schema, type: [schema.type, "null"] };
}

function scalarSchema(scalar, where) {
  // GraphQL coerces integer literals and variables to the built-in ID.
  if (scalar.builtIn && scalar.name === "ID") return { type: ["string", "integer"] };
  const type = REPRESENTATION_TYPES[scalar.representation];
  if (!type) throw new EmitterError(`mcp-tools: ${where}: scalar ${scalar.name} has unsupported representation ${JSON.stringify(scalar.representation)}`);
  const schema = { type };
  if (scalar.summary) schema.description = scalar.summary;
  const constraints = scalar.constraints ?? {};
  const unknown = Object.keys(constraints).filter(key => !CONSTRAINTS.has(key));
  if (unknown.length) throw new EmitterError(`mcp-tools: ${where}: scalar ${scalar.name} has unsupported constraint(s) ${unknown.join(", ")}`);
  // maximumDecimal and maxCanonicalJsonBytes have no JSON Schema keyword; the SDK transport and the authority enforce them.
  if (constraints.pattern !== undefined) schema.pattern = constraints.pattern;
  if (constraints.minimum !== undefined) schema.minimum = constraints.minimum;
  if (constraints.maximum !== undefined) schema.maximum = constraints.maximum;
  if (constraints.requiredStringProperties) {
    schema.properties = Object.fromEntries(constraints.requiredStringProperties.map(name => [name, { type: "string" }]));
    schema.required = [...constraints.requiredStringProperties];
  }
  if (constraints.disallowed) schema.not = { enum: [...constraints.disallowed] };
  return schema;
}

function createSchemaBuilder(ir) {
  const types = byName(ir.types);

  function typeSchema(ref, where, stack) {
    let schema;
    if (ref.kind === "list") {
      schema = { type: "array", items: typeSchema(ref.ofType, where, stack) };
    } else {
      const type = requireType(types, ref.name, `mcp-tools: ${where}`);
      if (type.kind === "scalar") schema = scalarSchema(type, where);
      else if (type.kind === "enum") schema = { type: "string", ...(type.description ? { description: oneLine(type.description) } : {}), enum: type.values.map(value => value.name) };
      else if (type.kind === "input") schema = objectSchema(type, where, stack);
      else throw new EmitterError(`mcp-tools: ${where}: ${type.kind} type ${type.name} cannot be an input`);
    }
    if (!ref.nullable) return schema;
    if (Array.isArray(schema.type)) return schema.type.includes("null") ? schema : { ...schema, type: [...schema.type, "null"] };
    return nullable(schema);
  }

  function fieldSchema(field, where, stack) {
    const schema = typeSchema(field.type, where, stack);
    const notes = [];
    if (field.description) notes.push(oneLine(field.description));
    if (field.deprecated) notes.push(`Deprecated${field.deprecated.reason ? `: ${oneLine(field.deprecated.reason)}` : "."}`);
    const result = { ...schema };
    if (notes.length) result.description = notes.join(" ");
    if (field.defaultValue !== undefined) result.default = field.defaultValue;
    if (field.deprecated) result.deprecated = true;
    return result;
  }

  function objectSchema(type, where, stack) {
    if (stack.includes(type.name)) throw new EmitterError(`mcp-tools: ${where}: input type ${type.name} is recursive, and tool schemas inline nested inputs`);
    const next = [...stack, type.name];
    const properties = {};
    const required = [];
    for (const field of type.fields) {
      properties[field.name] = fieldSchema(field, `${where}.${field.name}`, next);
      if (!field.type.nullable && field.defaultValue === undefined) required.push(field.name);
    }
    return {
      type: "object",
      ...(type.description ? { description: oneLine(type.description) } : {}),
      properties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
    };
  }

  return function inputSchema(operation) {
    if (!operation.input) return { type: "object", properties: {}, additionalProperties: false };
    return objectSchema(requireType(types, operation.input.type, `mcp-tools: ${operation.id}`), operation.id, []);
  };
}

function retryText(ir, operation) {
  if (operation.kind === "query") return "Read-only and safe to repeat.";
  const mode = byName(ir.idempotency).get(operation.idempotency);
  if (!mode) throw new EmitterError(`mcp-tools: ${operation.id}: the IR does not define idempotency ${operation.idempotency}`);
  if (mode.retry === "none") return "A transient signal that is never retried. Call the tool again to send a new signal.";
  if (!mode.resolvable) return "Each call is a new request. Its outcome can't be looked up, so don't repeat a call whose outcome is unknown.";
  return `Each call is a new request. Results and errors carry its requestId. When the outcome is unknown, call ${RETRY_TOOL} with that requestId instead of calling this tool again.`;
}

function toolEntry(ir, operation, names, inputSchema) {
  const credential = toolCredential(ir, operation);
  const pollTool = operation.longRunning ? names.get(operation.longRunning.poll) : undefined;
  const notes = [
    `Operation ${operation.id} (${operation.kind}).`,
    `Requires ${authText(ir, operation, credential, "mcp-tools")}.`,
    retryText(ir, operation),
  ];
  if (operation.destructive) notes.push("Destructive: it deletes, revokes, removes, disables or ends something. Confirm with the user before calling it.");
  const paged = paginationText(ir, operation.pagination, "mcp-tools");
  if (paged) notes.push(paged);
  if (operation.longRunning) {
    const poll = pollTool ?? operation.longRunning.poll;
    notes.push(`Long-running: the result's ${operation.longRunning.refField} identifies work that finishes later. Poll it with ${poll}.`);
  }
  const description = [oneLine(operation.summary), ...(operation.description ? [operation.description.trim()] : []), notes.join("\n")].join("\n\n");
  const readOnly = operation.kind === "query";
  return {
    name: names.get(operation.id),
    title: `${capitalize(operation.plane)}: ${words(operation.field).join(" ")}`,
    description,
    inputSchema,
    annotations: {
      readOnlyHint: readOnly,
      destructiveHint: operation.destructive === true,
      // Each call sends a new request ID, so repeating a mutation is a new request even when the arguments match.
      idempotentHint: readOnly,
      openWorldHint: false,
    },
    operation: {
      id: operation.id,
      plane: operation.plane,
      kind: operation.kind,
      credential,
      auth: operation.auth,
      idempotency: operation.idempotency,
      destructive: operation.destructive === true,
      pagination: operation.pagination,
      ...(operation.longRunning ? { longRunning: { ...operation.longRunning, ...(pollTool ? { tool: pollTool } : {}) } } : {}),
    },
  };
}

/** The tool definitions, in IR order. */
export function mcpToolDefinitions(ir) {
  const operations = toolOperations(ir);
  const names = new Map();
  const seen = new Map();
  for (const operation of operations) {
    const name = toolName(operation);
    if (!TOOL_NAME.test(name)) throw new EmitterError(`mcp-tools: ${operation.id}: tool name ${name} must match ${TOOL_NAME}`);
    if (name === RETRY_TOOL) throw new EmitterError(`mcp-tools: ${operation.id}: tool name ${name} is reserved`);
    if (seen.has(name)) throw new EmitterError(`mcp-tools: ${operation.id} and ${seen.get(name)} both map to tool name ${name}`);
    seen.set(name, operation.id);
    names.set(operation.id, name);
  }
  const inputSchema = createSchemaBuilder(ir);
  return operations.map(operation => toolEntry(ir, operation, names, inputSchema(operation)));
}

const DECLARATIONS = `/** The JSON Schema (2020-12) keywords that tool input schemas use. */
export interface JsonSchema {
  type?: JsonSchemaTypeName | JsonSchemaTypeName[];
  description?: string;
  deprecated?: boolean;
  default?: unknown;
  properties?: { [name: string]: JsonSchema };
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: (string | null)[];
  not?: JsonSchema;
  pattern?: string;
  minimum?: number;
  maximum?: number;
}
export type JsonSchemaTypeName = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";
export interface McpToolAuth { readonly credential: string; readonly scopes?: readonly string[]; readonly condition?: string }
export interface McpToolPagination {
  readonly style: string; readonly limitField?: string; readonly cursorField?: string;
  readonly pagePath?: readonly string[]; readonly pageType?: string; readonly itemType?: string;
}
/** Operation annotations, published in the tool's \`_meta\` under operationMetaKey. */
export interface McpToolOperation {
  readonly id: string;
  readonly plane: string;
  readonly kind: "query" | "mutation";
  /** The credential the server authenticates this tool with. */
  readonly credential: string;
  readonly auth: readonly McpToolAuth[];
  readonly idempotency: string;
  readonly destructive: boolean;
  readonly pagination: McpToolPagination;
  readonly longRunning?: { readonly poll: string; readonly refField: string; readonly tool?: string };
}
export interface McpToolAnnotations {
  readonly readOnlyHint: boolean;
  readonly destructiveHint: boolean;
  readonly idempotentHint: boolean;
  readonly openWorldHint: boolean;
}
export interface McpToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly annotations: McpToolAnnotations;
  readonly operation: McpToolOperation;
}
`;

/** The contents of tools.ts. */
export function renderTools(ir) {
  const tools = formatJson(mcpToolDefinitions(ir)).trimEnd();
  return NOTICE + DECLARATIONS +
    `export const retryToolName = ${JSON.stringify(RETRY_TOOL)};\n` +
    `export const operationMetaKey = ${JSON.stringify(META_KEY)};\n` +
    `export const withheldOperations: Readonly<Record<string, string>> = ${formatJson(WITHHELD).trimEnd()};\n` +
    `export const mcpTools: readonly McpToolDefinition[] = ${tools};\n`;
}

export default defineEmitter({
  name: "mcp-tools",
  description: "MCP tool catalog for @convohop/mcp",
  owns: [DIRECTORY],
  emit(ir) {
    return [{ path: `${DIRECTORY}/tools.ts`, contents: renderTools(ir) }];
  },
});
