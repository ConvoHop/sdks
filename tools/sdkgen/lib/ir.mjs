import {
  getNamedType, isEnumType, isInputObjectType, isInterfaceType, isNonNullType, isObjectType, isScalarType, isSpecifiedDirective,
  isUnionType,
} from "graphql";
import {
  checkAnnotations, contextFieldUses, expandedErrorCodes, formatAnnotationReport, inputArgument, resolvePagePath,
} from "./annotations.mjs";
import {
  GraphqlModelError, astValueToJson, buildOperationDocument, deprecationOf, descriptionOf, isBuiltInScalar, rootTypeNames, typeRef,
} from "./graphql-model.mjs";
import { createValidator, formatValidationErrors } from "./json-schema.mjs";
import { canonicalJson } from "./json.mjs";
import { codeUnitCompare } from "./naming.mjs";
import { planeOrder, schemaOperations } from "./sources.mjs";

export const IR_SCHEMA_REF = "./ir.schema.json";
export const GENERATION_DOCS = "docs/sdk-generation.md";

const BUILT_IN_REPRESENTATION = Object.freeze({ String: "string", ID: "string", Int: "integer", Float: "number", Boolean: "boolean" });

export class IrBuildError extends Error {}

/**
 * Builds the language-neutral IR from the GraphQL planes and the annotations.
 * Fails with the annotation report when annotations are incomplete, and with
 * a schema violation list when the result does not match ir.schema.json.
 * The result is plain JSON: building it, writing it and reading it back gives
 * an identical value.
 */
export function buildIr(sources) {
  const check = checkAnnotations(sources);
  if (!check.ok) throw new IrBuildError(formatAnnotationReport(check));
  const { annotations } = sources;
  const order = planeOrder(sources.planes, annotations);
  const planes = order.map(name => sources.planes.find(plane => plane.name === name));
  for (const plane of planes) rejectUnsupportedDirectives(plane);
  const types = buildTypes(planes, annotations);
  const operations = schemaOperations(sources.planes, order);
  const operationEntries = operations.map(operation => buildOperation(operation, annotations));
  const ir = {
    $schema: IR_SCHEMA_REF,
    api: annotations.api,
    sources: { graphql: planes.map(plane => plane.path), annotations: sources.annotationsPath },
    transport: annotations.transport,
    planes: planes.map(plane => buildPlane(plane, annotations.planes[plane.name])),
    credentials: catalog(annotations.credentials),
    scopes: catalog(annotations.scopes),
    conditions: catalog(annotations.conditions),
    idempotency: catalog(annotations.idempotency),
    pagination: catalog(annotations.pagination),
    errors: { codes: catalog(annotations.errorCodes), sets: catalog(annotations.errorSets) },
    realtime: buildRealtime(annotations, operations, operationEntries),
    operations: operationEntries,
    types,
  };
  const plain = JSON.parse(JSON.stringify(ir));
  const errors = createValidator(sources.irSchema, { label: "ir.schema.json" })(plain);
  if (errors.length) {
    throw new IrBuildError(`The generated IR violates schema/ir.schema.json:\n${formatValidationErrors(errors)}`);
  }
  return plain;
}

/** `{ name: value }` maps become `[{ name, ...value }]` sorted by name. */
function catalog(map) {
  return Object.keys(map).sort(codeUnitCompare).map(name => ({ name, ...map[name] }));
}

function buildPlane(plane, annotation) {
  return {
    name: plane.name,
    schema: plane.path,
    summary: annotation.summary,
    context: { argument: annotation.context.argument, type: annotation.context.input, rules: annotation.context.rules },
    resolveOperation: annotation.resolveOperation,
  };
}

/** Reports schema constructs graphql-model cannot represent as build errors with their location. */
function modelled(where, build) {
  try {
    return build();
  } catch (error) {
    if (error instanceof GraphqlModelError) throw new IrBuildError(`${where}: ${error.message}; see ${GENERATION_DOCS}`);
    throw error;
  }
}

function rejectUnsupportedDirectives(plane) {
  for (const directive of plane.schema.getDirectives()) {
    if (!isSpecifiedDirective(directive)) {
      throw new IrBuildError(`${plane.path}: custom directive @${directive.name} is not supported by the SDK generators; see ${GENERATION_DOCS}`);
    }
  }
}

function buildOperation(operation, annotations) {
  const entry = annotations.operations[operation.id];
  const plane = annotations.planes[operation.plane];
  const { field } = operation;
  const built = modelled(operation.id, () => buildOperationDocument(operation.schema, operation.plane, operation.kind, field));
  const bytes = Buffer.byteLength(built.document, "utf8");
  const limit = annotations.transport.http.maxDocumentBytes;
  if (bytes > limit) {
    throw new IrBuildError(`${operation.id}: the generated document is ${bytes} bytes; transport.http.maxDocumentBytes allows ${limit}`);
  }
  const input = inputArgument(operation);
  const contextType = operation.schema.getType(plane.context.input);
  return {
    id: operation.id,
    plane: operation.plane,
    kind: operation.kind,
    field: field.name,
    operationName: built.operationName,
    summary: entry.summary,
    description: descriptionOf(field),
    deprecated: deprecationOf(field),
    layer: entry.layer,
    auth: entry.auth,
    arguments: field.args.map(arg => ({ name: arg.name, role: arg.name === plane.context.argument ? "context" : "input", type: typeRef(arg.type) })),
    context: {
      argument: plane.context.argument,
      type: plane.context.input,
      fields: contextFieldUses({ plane, contextType, operationId: operation.id, auth: entry.auth, credentials: annotations.credentials }),
    },
    input: input ? { argument: "input", type: getNamedType(input.type).name, required: isNonNullType(input.type) } : null,
    result: { type: typeRef(field.type) },
    document: { text: built.document, bytes, selectedFields: built.selectedFields, depth: built.depth },
    idempotency: entry.idempotency,
    destructive: entry.destructive,
    pagination: buildPagination(operation, entry.pagination),
    realtime: entry.realtime,
    longRunning: entry.longRunning,
    errors: { sets: entry.errors.sets, codes: expandedErrorCodes(annotations, entry) },
  };
}

function buildPagination(operation, pagination) {
  if (pagination.style === "none") return { style: "none" };
  const page = resolvePagePath(operation, pagination.pagePath).type;
  return {
    style: pagination.style,
    limitField: pagination.limitField,
    cursorField: pagination.cursorField,
    pagePath: pagination.pagePath,
    pageType: page.name,
    itemType: getNamedType(page.getFields().items.type).name,
  };
}

function buildRealtime(annotations, operations, operationEntries) {
  const { envelope, channels, events } = annotations.realtime;
  const index = new Map(operations.map(operation => [operation.id, operation]));
  const plane = operations.find(operation => operation.plane === envelope.plane)?.schema;
  const envelopeType = plane?.getType(envelope.type);
  const fieldType = name => getNamedType(envelopeType.getFields()[name].type).name;
  const emitters = new Map();
  for (const operation of operationEntries) {
    for (const type of operation.realtime.emits ?? []) emitters.set(type, [...(emitters.get(type) ?? []), operation.id]);
  }
  return {
    envelope: {
      plane: envelope.plane,
      type: envelope.type,
      discriminator: envelope.discriminator,
      payload: envelope.payload,
      payloadType: fieldType(envelope.payload),
      subject: envelope.subject,
      subjectType: fieldType(envelope.subject),
      unknownTypes: envelope.unknownTypes,
    },
    channels: Object.keys(channels).sort(codeUnitCompare).map(name => {
      const channel = channels[name];
      const subscription = index.get(channel.subscription);
      const page = resolvePagePath(subscription, annotations.operations[subscription.id].pagination.pagePath).type;
      return {
        name,
        summary: channel.summary,
        subscription: channel.subscription,
        replay: channel.replay,
        pageType: page.name,
        endpoint: channel.endpoint,
        connectionInit: channel.connectionInit,
        ordering: channel.ordering,
        limits: channel.limits,
        reconnect: channel.reconnect,
      };
    }),
    events: Object.keys(events).sort(codeUnitCompare).map(type => ({
      type,
      summary: events[type].summary,
      subject: events[type].subject,
      payload: events[type].payload,
      emittedBy: (emitters.get(type) ?? []).sort(codeUnitCompare),
    })),
  };
}

/**
 * Named types in graphql-js type-map order of the first plane that defines
 * them. Types shared by several planes must be identical so every SDK can use
 * one model per name.
 */
function buildTypes(planes, annotations) {
  const entries = new Map();
  for (const plane of planes) {
    const roots = rootTypeNames(plane.schema);
    for (const type of Object.values(plane.schema.getTypeMap())) {
      if (type.name.startsWith("__") || roots.has(type.name)) continue;
      const { kind, ...body } = modelled(`${plane.path}: ${type.name}`, () => buildType(type, plane, annotations));
      const key = canonicalJson({ kind, ...body });
      const existing = entries.get(type.name);
      if (!existing) {
        entries.set(type.name, { path: plane.path, key, entry: { name: type.name, kind, planes: [plane.name], ...body } });
      } else if (existing.key !== key) {
        throw new IrBuildError(`${type.name} differs between ${existing.path} and ${plane.path}; make the definitions identical or rename one`);
      } else {
        existing.entry.planes.push(plane.name);
      }
    }
  }
  return [...entries.values()].map(item => item.entry);
}

function buildType(type, plane, annotations) {
  const where = `${plane.path}: ${type.name}`;
  if (isUnionType(type) || isInterfaceType(type)) {
    throw new IrBuildError(`${where}: ${isUnionType(type) ? "union" : "interface"} types are not supported by the SDK generators; see ${GENERATION_DOCS}`);
  }
  if (isScalarType(type)) return buildScalar(type, annotations);
  const description = descriptionOf(type);
  if (isEnumType(type)) {
    return {
      kind: "enum",
      description,
      values: type.getValues().map(value => ({ name: value.name, description: descriptionOf(value), deprecated: deprecationOf(value) })),
    };
  }
  if (isObjectType(type)) {
    return {
      kind: "object",
      description,
      fields: Object.values(type.getFields()).map(field => {
        if (field.args.length) throw new IrBuildError(`${where}.${field.name}: only root fields may take arguments`);
        return { name: field.name, description: descriptionOf(field), deprecated: deprecationOf(field), type: typeRef(field.type) };
      }),
    };
  }
  if (isInputObjectType(type)) {
    if (type.isOneOf) throw new IrBuildError(`${where}: @oneOf input types are not supported by the SDK generators; see ${GENERATION_DOCS}`);
    return {
      kind: "input",
      description,
      fields: Object.values(type.getFields()).map(field => {
        const literal = field.astNode?.defaultValue;
        return {
          name: field.name,
          description: descriptionOf(field),
          deprecated: deprecationOf(field),
          type: typeRef(field.type),
          defaultValue: literal ? astValueToJson(literal) : undefined,
        };
      }),
    };
  }
  throw new IrBuildError(`${where}: unsupported GraphQL type`);
}

function buildScalar(type, annotations) {
  if (isBuiltInScalar(type)) return { kind: "scalar", builtIn: true, representation: BUILT_IN_REPRESENTATION[type.name] };
  const { representation, summary, ...constraints } = annotations.scalars[type.name];
  return {
    kind: "scalar",
    description: descriptionOf(type),
    builtIn: false,
    representation,
    summary,
    constraints: Object.keys(constraints).length ? constraints : undefined,
  };
}
