import { EmitterError } from "./emitter.mjs";

/**
 * Pure helpers over the IR (schema/v1-ir.json). Emitters read only the IR, so
 * they use these helpers instead of graphql-js.
 */

/** Prints an IR type reference in GraphQL syntax, e.g. `[UUID!]!`. */
export function printTypeRef(ref) {
  const inner = ref.kind === "list" ? `[${printTypeRef(ref.ofType)}]` : ref.name;
  return ref.nullable ? inner : `${inner}!`;
}

/** The named type at the bottom of any list wrappers. */
export function namedTypeRef(ref) {
  return ref.kind === "list" ? namedTypeRef(ref.ofType) : ref;
}

/** `{ name }` entries (types, catalogs) indexed by name. */
export function byName(entries) {
  return new Map(entries.map(entry => [entry.name, entry]));
}

/** The IR type entry for a name, failing loudly for references the IR does not define. */
export function requireType(types, name, where) {
  const type = types.get(name);
  if (!type) throw new EmitterError(`${where}: the IR does not define type ${name}`);
  return type;
}

/**
 * The runtime operation catalog keyed by operation id, as published in
 * schema/v1-operations.json and @convohop/core's `v1Operations`.
 */
export function operationCatalog(ir) {
  const types = byName(ir.types);
  return Object.fromEntries(ir.operations.map(operation => [operation.id, {
    plane: operation.plane,
    kind: operation.kind,
    field: operation.field,
    operationName: operation.operationName,
    query: operation.document.text,
    resultType: printTypeRef(operation.result.type),
    inputFields: operation.input ? requireType(types, operation.input.type, operation.id).fields.map(field => field.name) : [],
  }]));
}
