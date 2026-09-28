import { v1Operations, v1Routes, type V1Operation, type V1OperationKey } from "./v1-operations.js";

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
function known(key: string): key is V1OperationKey { return Object.hasOwn(v1Operations, key); }

/** Compatibility paths identify SDK operations only. They are never HTTP URLs. */
export function v1GraphqlRequest(method: string, path: string, body: RecordValue | undefined, context: {
  requestId: string; incarnation?: string; observedServingEpoch?: string;
}): { operation: V1Operation; body: RecordValue } {
  if (!path.startsWith("/") || path.includes("#") || path.includes("://") || path.includes("//"))
    throw new TypeError("Expected a closed SDK operation path");
  const [pathname = "", search = ""] = path.split("?");
  if (path.split("?").length > 2) throw new TypeError("Invalid SDK query");
  const parts = pathname.split("/");
  let plane: string, tail: string[], projectId: string | undefined;
  if (parts[1] === "management" && parts[2] === "v1") {
    plane = "management"; tail = parts.slice(3);
  } else if (parts[1] === "v1" && parts[2] === "projects" && parts[3]) {
    plane = "communication"; projectId = id(parts[3]); tail = parts.slice(4);
  } else throw new TypeError("Unknown SDK operation path");
  const match = v1Routes.find(([scope, verb, template]) => {
    if (scope !== plane || verb !== method || template === undefined) return false;
    const expected = template.split("/").slice(1);
    return expected.length === tail.length && expected.every((part, index) => part.startsWith(":") || part === tail[index]);
  });
  if (!match) throw new TypeError("This SDK operation has no GraphQL binding");
  const [, , template, binding, revision] = match;
  if (!template || !binding) throw new TypeError("Invalid generated operation catalog");
  const key = `${plane}.${binding}`;
  if (!known(key)) throw new TypeError("Missing generated GraphQL operation");
  const operation = v1Operations[key], input: RecordValue = { ...body };
  for (const [index, part] of template.split("/").slice(1).entries()) {
    if (!part.startsWith(":")) continue;
    const name = part.slice(1), value = tail[index];
    if (!value || Object.hasOwn(input, name)) throw new TypeError("Path fields cannot be overridden");
    input[name] = id(value);
  }
  if (revision && Object.hasOwn(input, revision)) {
    if (Object.hasOwn(input, "expectedRevision")) throw new TypeError("Duplicate revision precondition");
    input.expectedRevision = input[revision]; delete input[revision];
  }
  const supplied = new Set<string>();
  for (const [name, value] of new URLSearchParams(search)) {
    if (supplied.has(name) || Object.hasOwn(input, name) || !operation.inputFields.includes(name))
      throw new TypeError("Duplicate or unknown query parameter");
    supplied.add(name);
    if (name === "limit") {
      if (!/^[1-9][0-9]{0,2}$/.test(value) || Number(value) > 100) throw new TypeError("Invalid bounded page size");
      input[name] = Number(value);
    } else if (name === "after") {
      if (value.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new TypeError("Invalid durable cursor");
      input[name] = object(JSON.parse(atob(value.replaceAll("-", "+").replaceAll("_", "/"))));
    } else input[name] = value;
  }
  if (operation.inputFields.includes("limit") && !Object.hasOwn(input, "limit")) input.limit = 20;
  if (binding === "search" && Object.hasOwn(input, "conversationIds")) {
    if (Object.hasOwn(input, "scope")) throw new TypeError("Duplicate search scope");
    input.scope = { conversationIds: input.conversationIds }; delete input.conversationIds;
  }
  const caller: RecordValue = { ...context, ...(projectId ? { projectId } : {}) };
  if (Object.hasOwn(input, "credentialDeliveryPermit")) {
    caller.credentialDeliveryPermit = input.credentialDeliveryPermit; delete input.credentialDeliveryPermit;
  }
  return { operation, body: {
    query: operation.query, operationName: operation.operationName,
    variables: { context: caller, ...(operation.inputFields.length ? { input } : {}) },
  } };
}

function nullable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(nullable);
  if (value === null || typeof value !== "object") return value;
  const fields = object(value);
  if (typeof fields.signature === "string") return value;
  return Object.fromEntries(Object.entries(fields)
    .filter(([key, value]) => value !== null || key === "membership")
    .map(([key, value]) => [key, key === "props" ? value : nullable(value)]));
}

export function v1GraphqlEnvelope(value: unknown, operation: V1Operation): RecordValue {
  const envelope = object(nullable(value));
  if (operation.field === "capabilities" && envelope.result != null) {
    const result = object(envelope.result);
    if (Array.isArray(result.limits)) result.limits = Object.fromEntries(result.limits.map(value => {
      const entry = object(value);
      if (typeof entry.key !== "string") throw new TypeError("Invalid capability limit");
      return [entry.key, object(entry.value)];
    }));
  }
  if (operation.field === "resolveRequest" && envelope.result != null) {
    const result = object(envelope.result);
    if (result.receipt != null) {
      const receipt = object(result.receipt);
      if (receipt.result != null) {
        const entries = Object.values(object(receipt.result));
        if (entries.length !== 1) throw new TypeError("Retained receipt requires one typed result");
        receipt.result = entries[0]; result.result = entries[0];
      }
    }
  }
  return envelope;
}
