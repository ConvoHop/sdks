import { v1Operations, v1OutputShapes, type V1Operation, type V1OperationKey, type V1OperationTypes } from "./v1-operations.js";

export type CommunicationOperation = Extract<V1OperationKey, `communication.${string}`>;
export type OperationInput<K extends V1OperationKey> =
  V1OperationTypes[K]["variables"] extends { input?: infer I } ? NonNullable<I> : Record<string, never>;
type FieldName<K> = K extends `${"communication" | "management"}.${infer F}` ? F : never;
export type OperationPayload<K extends V1OperationKey> =
  V1OperationTypes[K]["result"][FieldName<K> & keyof V1OperationTypes[K]["result"]];

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
  const shape = v1OutputShapes[type];
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

export function operationPayload<K extends V1OperationKey>(key: K, value: unknown): OperationPayload<K> {
  validateOutput(value, v1Operations[key].resultType);
  return value as OperationPayload<K>;
}

export function validateOperationPayload(operation: V1Operation, value: unknown): void {
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
export function operationKey(key: unknown): V1OperationKey {
  if (typeof key !== "string" || !Object.hasOwn(v1Operations, key)) throw new TypeError("Unknown generated GraphQL operation");
  return key as V1OperationKey;
}

export function v1GraphqlRequest(key: V1OperationKey, input: RecordValue, context: {
  requestId: string; projectId?: string; incarnation?: string; observedServingEpoch?: string;
  credentialDeliveryPermit?: RecordValue;
}): { operation: V1Operation; body: RecordValue } {
  const operation = v1Operations[operationKey(key)];
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
