import {
  Kind, getNamedType, isEnumType, isInputObjectType, isInterfaceType, isListType, isNonNullType, isObjectType,
  isScalarType, isSpecifiedScalarType, isUnionType, parse, print, validate,
} from "graphql";
import { capitalize } from "./naming.mjs";

export const ROOT_KINDS = [["query", "getQueryType"], ["mutation", "getMutationType"], ["subscription", "getSubscriptionType"]];
const SERVER_BOUNDS = { fields: 500, depth: 12 };

/** A schema construct the generators cannot model. Callers report it with their own context. */
export class GraphqlModelError extends Error {}

export function rootTypeNames(schema) {
  return new Set(ROOT_KINDS.map(([, getter]) => schema[getter]()?.name).filter(Boolean));
}

export function namedKind(type) {
  if (isScalarType(type)) return "scalar";
  if (isEnumType(type)) return "enum";
  if (isObjectType(type)) return "object";
  if (isInputObjectType(type)) return "input";
  if (isUnionType(type)) return "union";
  if (isInterfaceType(type)) return "interface";
  throw new GraphqlModelError(`unsupported GraphQL type ${String(type)}`);
}

/** Converts a GraphQL type to a language-neutral type reference. */
export function typeRef(type) {
  let nullable = true;
  let current = type;
  if (isNonNullType(current)) {
    nullable = false;
    current = current.ofType;
  }
  if (isListType(current)) return { kind: "list", nullable, ofType: typeRef(current.ofType) };
  return { kind: namedKind(current), name: current.name, nullable };
}

/** Converts a GraphQL value literal (e.g. an input default) to JSON without coercion. */
export function astValueToJson(node) {
  switch (node.kind) {
    case Kind.INT: return Number.parseInt(node.value, 10);
    case Kind.FLOAT: return Number.parseFloat(node.value);
    case Kind.STRING: return node.value;
    case Kind.BOOLEAN: return node.value;
    case Kind.NULL: return null;
    case Kind.ENUM: return node.value;
    case Kind.LIST: return node.values.map(astValueToJson);
    case Kind.OBJECT: return Object.fromEntries(node.fields.map(field => [field.name.value, astValueToJson(field.value)]));
    default: throw new GraphqlModelError(`unsupported GraphQL default value kind ${node.kind}`);
  }
}

export function descriptionOf(item) {
  return typeof item.description === "string" && item.description.length > 0 ? item.description : undefined;
}

/**
 * `{ reason }` or `{}` when the schema element carries `@deprecated`, otherwise
 * undefined. The reason is recorded only when the schema states one, so
 * emitters can tell an explicit reason from graphql-js's implied default.
 */
export function deprecationOf(item) {
  const directive = item.astNode?.directives?.find(node => node.name.value === "deprecated");
  if (!directive) return undefined;
  const reason = directive.arguments?.find(node => node.name.value === "reason");
  return reason?.value.kind === Kind.STRING ? { reason: reason.value.value } : {};
}

export function isBuiltInScalar(type) {
  return isScalarType(type) && isSpecifiedScalarType(type);
}

/** `alpha` + `fetchHTTPStatus` gives `AlphaFetchHTTPStatus`, the name in schema/operations-v1.graphql. */
export function graphqlOperationName(plane, fieldName) {
  return capitalize(plane) + capitalize(fieldName);
}

/**
 * Builds the "select every public field" operation document for a root field
 * (the format of schema/operations-v1.graphql), validates it against the
 * schema and enforces the server's field and depth bounds.
 */
export function buildOperationDocument(schema, plane, kind, field) {
  const name = graphqlOperationName(plane, field.name);
  const variables = field.args.map(arg => `$${arg.name}: ${arg.type}`).join(", ");
  const args = field.args.map(arg => `${arg.name}: $${arg.name}`).join(", ");
  const document = parse(`${kind} ${name}(${variables}) { ${field.name}(${args}) ${selection(field.type)} }`);
  const errors = validate(schema, document);
  if (errors.length) throw new GraphqlModelError(`the generated ${name} document is invalid: ${errors.map(error => error.message).join("; ")}`);
  let fields = 0;
  let depth = 0;
  const count = (set, level = 0) => {
    if (!set) return;
    depth = Math.max(depth, level);
    for (const child of set.selections) {
      fields++;
      count(child.selectionSet, level + 1);
    }
  };
  count(document.definitions[0].selectionSet);
  if (fields > SERVER_BOUNDS.fields || depth > SERVER_BOUNDS.depth) {
    throw new GraphqlModelError(`the generated ${name} document selects ${fields} fields at depth ${depth}; the server allows ${SERVER_BOUNDS.fields} fields and depth ${SERVER_BOUNDS.depth}`);
  }
  return { operationName: name, document: print(document), selectedFields: fields, depth };
}

function selection(type, stack = []) {
  const named = getNamedType(type);
  if (!isObjectType(named)) return "";
  if (stack.includes(named.name) || stack.length >= SERVER_BOUNDS.depth) {
    throw new GraphqlModelError(`result type ${named.name} is recursive or nested deeper than ${SERVER_BOUNDS.depth} levels`);
  }
  return "{ " + Object.values(named.getFields()).map(child => child.name + selection(child.type, [...stack, named.name])).join(" ") + " }";
}
