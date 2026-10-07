import { v1Operations, v1OutputShapes } from "../packages/core/dist/generated/v1-operations.js";

export function full(type, fields) {
  const shape = v1OutputShapes[type];
  if (shape?.kind !== "object") throw new TypeError(`Unknown fixture object ${type}`);
  return Object.fromEntries(Object.keys(shape.fields).map(key => [key, fields[key] ?? null]));
}

export function reply(request, fields) {
  const operation = Object.values(v1Operations).find(value => value.operationName === request.operationName);
  if (!operation) throw new TypeError("Unknown fixture operation");
  const now = new Date().toISOString();
  return Response.json({ data: { [operation.field]: full(operation.resultType.replace(/!$/, ""), {
    status: operation.kind === "mutation" ? "committed" : "ok",
    requestId: request.variables.context.requestId, serverTime: now,
    receiptId: crypto.randomUUID(), committedAt: now, replayed: false, ...fields,
  }) } });
}

export function resolution(requestId, state, retainedResult = null) {
  const now = new Date().toISOString();
  return full("RequestResolution", {
    state, requestId, checkedAt: now, resultWithheld: false,
    receipt: state === "notObservedYet" ? null : full("ResolvedReceipt", {
      status: state, requestId, receiptId: crypto.randomUUID(), committedAt: now,
      replayed: false, result: retainedResult == null ? null : full("RetainedResult", retainedResult),
    }),
  });
}

export function event(conversationId, sequence) {
  return full("Event", { eventId: crypto.randomUUID(), conversationId, sequence,
    eventVersion: "1", type: "messageCreated", occurredAt: new Date().toISOString() });
}
