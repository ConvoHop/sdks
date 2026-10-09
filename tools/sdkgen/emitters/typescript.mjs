import { defineEmitter, EmitterError } from "../lib/emitter.mjs";
import { byName, namedTypeRef, operationCatalog, printTypeRef, requireType } from "../lib/ir-model.mjs";
import { codegenTypeName, naturalCompare } from "../lib/naming.mjs";

/**
 * TypeScript operation types for @convohop/core.
 *
 * graphql-types.ts reproduces, byte for byte, what the typescript-operations
 * plugin of graphql-codegen printed for schema/operations.graphql with
 * { useTypeImports, skipTypename, strictScalars }. Parity was verified against
 * @graphql-codegen/cli 7.4.3 and typescript-operations 6.1.7 before those
 * packages were removed; the golden files in tools/sdkgen/test/golden and the
 * strict tsc test now pin the output. operations.ts is the operation catalog
 * the runtime reads. Both are derived from the IR alone.
 */
export const DEFAULT_DIRECTORY = "packages/core/src/generated";

const NOTICE = "// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.\n";
const INTERNAL = "/** Internal type. DO NOT USE DIRECTLY. */\n";
const EXACT = `${INTERNAL}type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };`;
const INCREMENTAL = `${INTERNAL}export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };`;
const REPRESENTATION_TYPES = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  object: "Record<string, unknown>",
};
const KIND_SUFFIX = { query: "Query", mutation: "Mutation", subscription: "Subscription" };
const INPUT_MAYBE = " | null | undefined";
const OUTPUT_MAYBE = " | null";
// graphql-js prints `@deprecated` without a reason as this default.
const DEFAULT_DEPRECATION_REASON = "No longer supported";

/** The TypeScript type of a scalar. Like graphql-codegen, built-in ID inputs also accept numbers. */
export function scalarTsType(scalar, direction) {
  if (scalar.builtIn && scalar.name === "ID" && direction === "input") return "string | number";
  const type = REPRESENTATION_TYPES[scalar.representation];
  if (!type) throw new EmitterError(`typescript: scalar ${scalar.name} has unsupported representation ${JSON.stringify(scalar.representation)}`);
  return type;
}

/** `{ result, variables }` type names for an operation, composed the way graphql-codegen composes them. */
export function operationTypeNames(operation) {
  const base = codegenTypeName(operation.operationName);
  const suffix = KIND_SUFFIX[operation.kind];
  if (!suffix) throw new EmitterError(`typescript: ${operation.id} has unsupported kind ${JSON.stringify(operation.kind)}`);
  return { result: codegenTypeName(base + suffix), variables: codegenTypeName(`${base}${suffix}Variables`) };
}

const stripTrailingSpaces = text => text.replace(/ +\n/g, "\n");
const maybe = (type, suffix) => (type.endsWith(suffix) ? type : type + suffix);

function docComment(text, level) {
  if (!text) return "";
  const pad = "  ".repeat(level);
  const lines = text.split("*/").join("*\\/").split("\n");
  if (lines.length === 1) return `${pad}/** ${lines[0]} */\n`;
  return ["/**", ...lines.map(line => ` * ${line}`), " */\n"].map(line => pad + line).join("\n");
}

function fieldComment(field) {
  if (!field.deprecated) return docComment(field.description, 1);
  const reason = field.deprecated.reason ?? DEFAULT_DEPRECATION_REASON;
  return docComment(`${field.description ? `${field.description}\n` : ""}@deprecated ${reason}`, 1);
}

const declaration = (comment, name, body) => stripTrailingSpaces(`${comment}export type ${name} = ${body};\n`);

function createRenderer(ir) {
  const types = byName(ir.types);
  const typeOf = (ref, where) => requireType(types, ref.name, where);

  function inputType(ref, where) {
    let type;
    if (ref.kind === "list") type = `Array<${inputType(ref.ofType, where)}>`;
    else if (ref.kind === "scalar") type = scalarTsType(typeOf(ref, where), "input");
    else if (ref.kind === "enum" || ref.kind === "input") type = codegenTypeName(ref.name);
    else throw new EmitterError(`typescript: ${where}: ${ref.kind} ${ref.name} cannot be an input`);
    return ref.nullable ? maybe(type, INPUT_MAYBE) : type;
  }

  function outputType(ref, where) {
    let type;
    if (ref.kind === "list") type = `Array<${outputType(ref.ofType, where)}>`;
    else if (ref.kind === "scalar") type = scalarTsType(typeOf(ref, where), "output");
    else if (ref.kind === "enum") type = codegenTypeName(ref.name);
    else if (ref.kind === "object") type = selection(typeOf(ref, where), where);
    else throw new EmitterError(`typescript: ${where}: ${ref.kind} ${ref.name} cannot be an output`);
    return ref.nullable ? maybe(type, OUTPUT_MAYBE) : type;
  }

  // The IR documents select every field of every object type they reach.
  // graphql-codegen prints leaf fields before fields with sub-selections.
  function selection(type, where) {
    const isLeaf = field => namedTypeRef(field.type).kind !== "object";
    const ordered = [...type.fields.filter(isLeaf), ...type.fields.filter(field => !isLeaf(field))];
    return `{ ${ordered.map(field => `${field.name}: ${outputType(field.type, `${where} ${type.name}.${field.name}`)}`).join(", ")} }`;
  }

  function collectInput(name, used, where) {
    if (used.has(name)) return;
    const type = requireType(types, name, where);
    if (type.kind === "scalar") return;
    used.add(name);
    if (type.kind === "input") for (const field of type.fields) collectInput(namedTypeRef(field.type).name, used, `${where} ${name}.${field.name}`);
  }

  function collectOutputEnums(ref, used, seen, where) {
    const named = namedTypeRef(ref);
    if (named.kind === "enum") used.add(named.name);
    if (named.kind !== "object" || seen.has(named.name)) return;
    seen.add(named.name);
    for (const field of typeOf(named, where).fields) collectOutputEnums(field.type, used, seen, `${where} ${named.name}.${field.name}`);
  }

  function schemaTypeDeclaration(type) {
    const name = codegenTypeName(type.name);
    if (type.kind === "enum") {
      const values = [...type.values].sort((a, b) => naturalCompare(a.name, b.name))
        .map(value => `${docComment(value.description, 1)}  | '${value.name}'`);
      return declaration(docComment(type.description, 0), name, `\n${values.join("\n")}`);
    }
    if (type.kind === "input") {
      const fields = [...type.fields].sort((a, b) => naturalCompare(a.name, b.name)).map(field => {
        const optional = field.type.nullable || field.defaultValue !== undefined;
        return `${fieldComment(field)}  ${field.name}${optional ? "?" : ""}: ${inputType(field.type, `${type.name}.${field.name}`)};`;
      });
      return declaration(docComment(type.description, 0), name, `{\n${fields.join("\n")}\n}`);
    }
    throw new EmitterError(`typescript: ${type.kind} ${type.name} is not declared as a schema type`);
  }

  function operationDeclarations(operation) {
    const names = operationTypeNames(operation);
    if (operation.arguments.length === 0) throw new EmitterError(`typescript: ${operation.id} has no variables; operations take context and optional input`);
    const variables = operation.arguments.map(arg => {
      if (arg.type.kind !== "input") throw new EmitterError(`typescript: ${operation.id} argument ${arg.name} must be an input object`);
      return `  ${arg.name}${arg.type.nullable ? "?" : ""}: ${inputType(arg.type, operation.id)};`;
    });
    const variablesDeclaration = declaration("", names.variables, `Exact<{\n${variables.join("\n")}\n}>`);
    const result = declaration("", names.result, `{ ${operation.field}: ${outputType(operation.result.type, operation.id)} }`);
    return `${variablesDeclaration}\n\n${result}`;
  }

  return { collectInput, collectOutputEnums, schemaTypeDeclaration, operationDeclarations };
}

/** The contents of graphql-types.ts. */
export function renderGeneratedTypes(ir) {
  const renderer = createRenderer(ir);
  const used = new Set();
  for (const operation of ir.operations) {
    for (const arg of operation.arguments) renderer.collectInput(namedTypeRef(arg.type).name, used, operation.id);
    renderer.collectOutputEnums(operation.result.type, used, new Set(), operation.id);
  }
  const schemaTypes = ir.types.filter(type => used.has(type.name))
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map(type => renderer.schemaTypeDeclaration(type));
  const operations = ir.operations.map(operation => renderer.operationDeclarations(operation));
  return [EXACT, INCREMENTAL, [...schemaTypes, ...operations].join("\n")].join("\n");
}

/** `outputShapes`: every non-input type, keyed by name, in IR order. */
export function outputShapes(ir) {
  const shape = type => {
    if (type.kind === "object") return { kind: "object", fields: Object.fromEntries(type.fields.map(field => [field.name, printTypeRef(field.type)])) };
    if (type.kind === "enum") return { kind: "enum", values: type.values.map(value => value.name) };
    return { kind: "scalar" };
  };
  return Object.fromEntries(ir.types.filter(type => type.kind !== "input").map(type => [type.name, shape(type)]));
}

/**
 * The core runtime catalog: the published `operationCatalog` plus each
 * operation's idempotency class, which the transport uses to decide whether a
 * mutation is persisted for recovery.
 */
export function coreOperationCatalog(ir) {
  const idempotency = new Map(ir.operations.map(operation => [operation.id, operation.idempotency]));
  return Object.fromEntries(Object.entries(operationCatalog(ir)).map(([id, { plane, kind, ...rest }]) =>
    [id, { plane, kind, idempotency: idempotency.get(id), ...rest }]));
}

/** The contents of operations.ts. */
export function renderOperationCatalog(ir) {
  const types = ir.operations.map(operation => {
    const names = operationTypeNames(operation);
    return `  "${operation.id}": { variables: Generated.${names.variables}; result: Generated.${names.result} };`;
  });
  return NOTICE +
    'import type * as Generated from "./graphql-types.js";\n' +
    `export interface OperationTypes {\n${types.join("\n")}\n}\n` +
    "export type OperationKey = keyof OperationTypes;\n" +
    "export interface OperationCatalogEntry { plane: string; kind: string; idempotency: string; field: string; operationName: string; query: string; resultType: string; inputFields: readonly string[] }\n" +
    'export type OutputShape = { kind: "scalar" } | { kind: "enum"; values: readonly string[] } | { kind: "object"; fields: Readonly<Record<string, string>> };\n' +
    `export const outputShapes: Readonly<Record<string, OutputShape>> = ${JSON.stringify(outputShapes(ir), null, 2)};\n` +
    `export const operationCatalog: Record<OperationKey, OperationCatalogEntry> = ${JSON.stringify(coreOperationCatalog(ir), null, 2)};\n`;
}

export default defineEmitter({
  name: "typescript",
  description: "TypeScript operation types and catalog for @convohop/core",
  emit(ir, { directory = DEFAULT_DIRECTORY } = {}) {
    return [
      { path: `${directory}/graphql-types.ts`, contents: renderGeneratedTypes(ir) },
      { path: `${directory}/operations.ts`, contents: renderOperationCatalog(ir) },
    ];
  },
});
