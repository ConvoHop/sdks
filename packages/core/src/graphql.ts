import { operationCatalog, outputShapes, type OperationCatalogEntry, type OperationKey, type OperationTypes } from "./generated/operations.js";

export type OperationInput<K extends OperationKey> =
  OperationTypes[K]["variables"] extends { input?: infer I } ? NonNullable<I> : Record<string, never>;
type FieldName<K> = K extends `${"communication" | "management"}.${infer F}` ? F : never;
export type OperationPayload<K extends OperationKey> =
  OperationTypes[K]["result"][FieldName<K> & keyof OperationTypes[K]["result"]];

export function validateOutput(value: unknown, type: string, depth = 0): void {
  if (depth > 16) throw new TypeError("GraphQL response exceeds its depth bound");
  const required = type.endsWith("!");
  if (required) type = type.slice(0, -1);
  if (value == null) {
    if (required || value === undefined) throw new TypeError(`Missing GraphQL response field: ${type}`);
    return;
  }
  if (type.startsWith("[")) {
    if (!Array.isArray(value) || value.length > 100) throw new TypeError("Invalid bounded GraphQL list");
    for (const item of value) validateOutput(item, type.slice(1, -1), depth + 1);
    return;
  }
  const shape = outputShapes[type];
  if (!shape) throw new TypeError(`Unknown generated output type: ${type}`);
  if (shape.kind === "object") {
    const record = object(value);
    if (type === "RetainedResult" && Object.values(record).filter(field => field != null).length !== 1)
      throw new TypeError("Retained receipt requires exactly one typed result");
    for (const [field, child] of Object.entries(shape.fields)) validateOutput(record[field], child, depth + 1);
  } else if (shape.kind === "enum") {
    if (typeof value !== "string" || !shape.values.includes(value)) throw new TypeError(`Unknown ${type}`);
  } else if (type === "Properties" || type === "SignedProof") {
    object(value);
  } else if (type === "Boolean") {
    if (typeof value !== "boolean") throw new TypeError("Expected GraphQL boolean");
  } else if (type === "Int" || type === "PageSize") {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new TypeError("Expected safe GraphQL integer");
  } else {
    if (typeof value !== "string") throw new TypeError(`Expected GraphQL ${type} string`);
    if (type === "UUID") id(value);
    if (type === "Decimal" && (!/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) > 9223372036854775807n))
      throw new TypeError("Invalid GraphQL decimal");
  }
}

export function operationPayload<K extends OperationKey>(key: K, value: unknown): OperationPayload<K> {
  validateOutput(value, operationCatalog[key].resultType);
  return value as OperationPayload<K>;
}

export function validateOperationPayload(operation: OperationCatalogEntry, value: unknown): void {
  validateOutput(value, operation.resultType);
}

type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected a GraphQL protocol object");
  return value as RecordValue;
}
function id(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value) ||
      value === "00000000-0000-0000-0000-000000000000") throw new TypeError("Expected a canonical UUID");
  return value;
}
export function operationKey(key: unknown): OperationKey {
  if (typeof key !== "string" || !Object.hasOwn(operationCatalog, key)) throw new TypeError("Unknown generated GraphQL operation");
  return key as OperationKey;
}

export function buildGraphqlRequest(key: OperationKey, input: RecordValue, context: {
  requestId: string; projectId?: string; incarnation?: string; observedServingEpoch?: string;
  credentialDeliveryPermit?: RecordValue;
}): { operation: OperationCatalogEntry; body: RecordValue } {
  const operation = operationCatalog[operationKey(key)];
  if (operation.kind === "subscription") throw new TypeError("Use graphql-transport-ws for subscriptions");
  if (operation.plane === "communication") {
    if (!context.projectId) throw new TypeError("Communication operations require an explicit project");
    id(context.projectId);
  } else if (context.projectId !== undefined) {
    throw new TypeError("Management project selection belongs in the generated operation input");
  }
  if (Object.keys(input).some(name => !operation.inputFields.includes(name))) throw new TypeError("Unknown GraphQL input field");
  if (context.credentialDeliveryPermit !== undefined &&
      key !== "communication.redeemCredential" && key !== "communication.acknowledgeCredential")
    throw new TypeError("A credential delivery permit is only valid for redemption or acknowledgement");
  return { operation, body: {
    query: operation.query, operationName: operation.operationName,
    variables: { context, ...(operation.inputFields.length ? { input } : {}) },
  } };
}
