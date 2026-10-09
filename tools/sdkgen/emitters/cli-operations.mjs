import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, namedTypeRef, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { formatJson } from "../lib/json.mjs";
import { codeUnitCompare } from "../lib/naming.mjs";
import {
  CREDENTIAL_OPERATIONS, authText, oneLine, paginationText, serverCredential, serverOperations,
} from "../lib/server-operations.mjs";

/**
 * Operation catalog for the convohop CLI (@convohop/cli).
 *
 * Lists the operations the MCP tools expose: each query and mutation that a
 * server bearer credential can call, without subscriptions, client-only,
 * deprecated and credential-returning operations. Each entry carries the
 * operation's text and annotations (credential, authorization, idempotency,
 * destructiveness, pagination and polling) and names its input type.
 * cliTypes describes every input type, enum and custom scalar that those
 * inputs use, so `convohop call <operation> --help` can explain any input.
 * cliScopes lists the backend-key scopes, so `convohop keys issue` can
 * check and explain them.
 */
export const DIRECTORY = "packages/cli/src/generated";
/** Operations whose results are credentials. `convohop call` never runs them. */
export const WITHHELD = CREDENTIAL_OPERATIONS;

const EMITTER = "cli-operations";
const NOTICE = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n";

/** The operations the CLI can call, in IR order. */
export const cliOperationList = ir => serverOperations(ir, EMITTER);

function operationEntry(ir, operation) {
  const credential = serverCredential(ir, operation, EMITTER);
  const paged = paginationText(ir, operation.pagination, EMITTER);
  const mode = byName(ir.idempotency).get(operation.idempotency);
  if (!mode) throw new EmitterError(`${EMITTER}: ${operation.id}: the IR does not define idempotency ${operation.idempotency}`);
  return {
    id: operation.id,
    plane: operation.plane,
    kind: operation.kind,
    summary: oneLine(operation.summary),
    ...(operation.description ? { description: operation.description.trim() } : {}),
    credential,
    requires: authText(ir, operation, credential, EMITTER),
    idempotency: operation.idempotency,
    retry: mode.retry,
    resolvable: mode.resolvable,
    destructive: operation.destructive === true,
    ...(paged ? { paged } : {}),
    ...(operation.longRunning ? { longRunning: { poll: operation.longRunning.poll, refField: operation.longRunning.refField } } : {}),
    ...(operation.input ? { input: operation.input.type } : {}),
  };
}

function fieldEntry(field) {
  return {
    name: field.name,
    type: printTypeRef(field.type),
    required: !field.type.nullable && field.defaultValue === undefined,
    ...(field.description ? { description: oneLine(field.description) } : {}),
    ...(field.defaultValue === undefined ? {} : { default: field.defaultValue }),
    ...(field.deprecated ? { deprecated: field.deprecated.reason ? { reason: oneLine(field.deprecated.reason) } : {} } : {}),
  };
}

/** The input types, enums and custom scalars the operations' inputs use, by name in code-unit order. */
export function cliTypeEntries(ir, operations) {
  const types = byName(ir.types);
  const found = new Map();
  const visit = (name, where) => {
    if (found.has(name)) return;
    const type = requireType(types, name, `${EMITTER}: ${where}`);
    const description = type.kind === "scalar" ? type.summary ?? type.description : type.description;
    const text = description ? { description: oneLine(description) } : {};
    if (type.kind === "scalar") {
      if (!type.builtIn) found.set(name, { kind: "scalar", ...text });
    } else if (type.kind === "enum") {
      found.set(name, { kind: "enum", ...text, values: type.values.map(value => value.name) });
    } else if (type.kind === "input") {
      // Set before visiting the fields, so recursive input types terminate.
      const entry = { kind: "input", ...text, fields: type.fields.map(fieldEntry) };
      found.set(name, entry);
      for (const field of type.fields) visit(namedTypeRef(field.type).name, `${where}.${field.name}`);
    } else {
      throw new EmitterError(`${EMITTER}: ${where}: ${type.kind} type ${type.name} cannot be an input`);
    }
  };
  for (const operation of operations) if (operation.input) visit(operation.input.type, operation.id);
  return Object.fromEntries([...found].sort(([a], [b]) => codeUnitCompare(a, b)));
}

/** The catalog entries, keyed by operation ID in IR order. */
export function cliOperationEntries(ir) {
  return Object.fromEntries(cliOperationList(ir).map(operation => [operation.id, operationEntry(ir, operation)]));
}

/** The backend-key scopes' summaries, keyed by their exact wire names in IR order. */
export function cliScopeEntries(ir) {
  return Object.fromEntries(ir.scopes.map(scope => [scope.name, oneLine(scope.summary)]));
}

const DECLARATIONS = `/** One field of an input type. */
export interface CliInputField {
  readonly name: string;
  /** The GraphQL type, such as \`UUID!\` or \`[String!]!\`. */
  readonly type: string;
  /** Whether the input must set the field: it is non-null and has no default. */
  readonly required: boolean;
  readonly description?: string;
  /** The value the authority uses when the input leaves the field out. */
  readonly default?: unknown;
  readonly deprecated?: { readonly reason?: string };
}
/** An input type, enum or custom scalar that operation inputs use. */
export type CliType =
  | { readonly kind: "input"; readonly description?: string; readonly fields: readonly CliInputField[] }
  | { readonly kind: "enum"; readonly description?: string; readonly values: readonly string[] }
  | { readonly kind: "scalar"; readonly description?: string };
/** One operation and its annotations. */
export interface CliOperation {
  readonly id: string;
  readonly plane: string;
  readonly kind: "query" | "mutation";
  readonly summary: string;
  readonly description?: string;
  /** The bearer credential the CLI sends with the operation. */
  readonly credential: string;
  /** Who can call the operation with that credential: its scopes and conditions. */
  readonly requires: string;
  readonly idempotency: string;
  /** How the idempotency class retries: \`repeat\` (read-only), \`sameRequest\` (resend the same request) or \`none\`. */
  readonly retry: string;
  /** Whether resolveRequest can look up a request with an unknown outcome. */
  readonly resolvable: boolean;
  /** Whether it deletes, revokes, removes, disables or ends something. */
  readonly destructive: boolean;
  /** How the result pages, for paged operations. */
  readonly paged?: string;
  /** For long-running operations: the result field that identifies the work, and the operation that polls it. */
  readonly longRunning?: { readonly poll: string; readonly refField: string };
  /** The input type, a key of cliTypes; absent when the operation takes no input. */
  readonly input?: string;
}
`;

/** The contents of operations.ts. */
export function renderOperations(ir) {
  const operations = cliOperationList(ir);
  return NOTICE + DECLARATIONS +
    `/** Operations \`convohop call\` never runs, because their results are credentials. */\n` +
    `export const withheldOperations: Readonly<Record<string, string>> = ${formatJson(WITHHELD).trimEnd()};\n` +
    `/** The scopes a backend key can grant, by wire name, with what each allows. */\n` +
    `export const cliScopes: Readonly<Record<string, string>> = ${formatJson(cliScopeEntries(ir)).trimEnd()};\n` +
    `export const cliTypes: Readonly<Record<string, CliType>> = ${formatJson(cliTypeEntries(ir, operations)).trimEnd()};\n` +
    `export const cliOperations: Readonly<Record<string, CliOperation>> = ${formatJson(cliOperationEntries(ir)).trimEnd()};\n`;
}

export default defineEmitter({
  name: "cli-operations",
  description: "Operation catalog for the convohop CLI (@convohop/cli)",
  owns: [DIRECTORY],
  emit(ir) {
    return [{ path: `${DIRECTORY}/operations.ts`, contents: renderOperations(ir) }];
  },
});
