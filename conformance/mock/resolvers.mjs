// GraphQL execution for the conformance mock. Documents are parsed, validated and
// executed against the authority-exported schemas so every response carries the
// exact shape the SDKs request; resolvers delegate to the deterministic Domain.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildSchema, execute, getOperationAST, parse, validate, valueFromASTUntyped } from "graphql";
import { Problem } from "./domain.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const I64_MAX = 9223372036854775807n;
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
// transport.http.maxDocumentBytes in schema/ir.json; conformance/test/spec.test.mjs keeps them equal.
export const MAX_DOCUMENT_BYTES = 32768;

const SCALARS = {
  UUID: value => typeof value === "string" && UUID.test(value) && value !== NIL_UUID,
  Decimal: value => typeof value === "string" && DECIMAL.test(value) && BigInt(value) <= I64_MAX,
  PageSize: value => Number.isSafeInteger(value) && value >= 1 && value <= 100,
  Properties: isRecord,
  SignedProof: isRecord,
};

function strictSchema(file) {
  const schema = buildSchema(readFileSync(new URL(`../../schema/${file}`, import.meta.url), "utf8"));
  for (const [name, accepts] of Object.entries(SCALARS)) {
    const type = schema.getType(name);
    if (!type) throw new Error(`Schema ${file} no longer declares scalar ${name}`);
    const coerce = value => {
      if (!accepts(value)) throw new TypeError(`Invalid ${name} value`);
      return value;
    };
    type.serialize = type.coerceOutputValue = coerce;
    type.parseValue = type.coerceInputValue = coerce;
    type.parseLiteral = node => coerce(valueFromASTUntyped(node));
  }
  return schema;
}

export const schemas = Object.freeze({
  communication: strictSchema("communication.graphql"),
  management: strictSchema("management.graphql"),
});

const reply = (requestId, result) => ({ status: "ok", requestId, serverTime: new Date().toISOString(), receiptId: null,
  committedAt: null, replayed: null, operation: null, resourceRef: null, result });

function resolvers(domain, routeTarget) {
  const mutation = field => (actor, context, input) =>
    domain.commit(actor, context.requestId, field, input, () => domain[field](actor, input));
  const query = read => (actor, context, input) => reply(context.requestId, read(actor, input));
  return {
    communication: {
      route: query(actor => {
        domain.route(actor);
        const { communicationBase, wssUrl } = routeTarget();
        return { projectId: domain.projectId, incarnation: domain.incarnation, servingEpoch: domain.servingEpoch,
          communicationBase, wssUrl, expiresAt: new Date(Date.now() + 300000).toISOString(), signature: "conformance-mock" };
      }),
      getConversation: query((actor, input) => domain.getConversation(actor, input)),
      members: query((actor, input) => domain.members(actor, input)),
      messages: query((actor, input) => domain.messages(actor, input)),
      events: query((actor, input) => domain.events(actor, input)),
      resolveRequest: query((actor, input) => domain.resolve(actor, input.requestId)),
      createPrincipal: mutation("createPrincipal"),
      issueSession: mutation("issueSession"),
      createConversation: mutation("createConversation"),
      addMembers: mutation("addMembers"),
      sendMessage: mutation("sendMessage"),
      editMessage: mutation("editMessage"),
      deleteMessage: mutation("deleteMessage"),
    },
    management: {
      issueBackendKey: mutation("issueBackendKey"),
      resolveRequest: query((actor, input) => domain.resolve(actor, input.requestId)),
    },
  };
}

// Error extensions follow the public problem shape; rate limits add retryAfter in whole seconds.
export function problemBody(problem, requestId) {
  return { message: problem.message, extensions: { code: problem.code, requestId: requestId ?? randomUUID(),
    outcome: problem.outcome, status: problem.status,
    ...(problem.retryAfterSeconds === undefined ? {} : { retryAfter: problem.retryAfterSeconds }) } };
}

// graphql-js only preserves Error instances as originalError.
class Captured extends Error { constructor(args) { super("captured"); this.args = args; } }

// Parses, validates and coerces a request document without running a resolver.
function prepare(plane, request, allowed) {
  if (!isRecord(request) || typeof request.query !== "string" ||
      (request.operationName != null && typeof request.operationName !== "string") ||
      (request.variables != null && !isRecord(request.variables)))
    throw new Problem("GRAPHQL_INVALID_REQUEST", 400, "Expected a GraphQL request object");
  if (Buffer.byteLength(request.query) > MAX_DOCUMENT_BYTES)
    throw new Problem("GRAPHQL_QUERY_LIMIT", 400, `GraphQL documents are limited to ${MAX_DOCUMENT_BYTES} bytes`);
  const schema = schemas[plane];
  let document;
  try { document = parse(request.query); }
  catch { throw new Problem("GRAPHQL_INVALID_REQUEST", 400, "GraphQL document does not parse"); }
  if (validate(schema, document).length) throw new Problem("GRAPHQL_INVALID_REQUEST", 400, "GraphQL document does not validate");
  const operation = getOperationAST(document, request.operationName ?? undefined);
  if (!operation || !allowed.includes(operation.operation))
    throw new Problem("GRAPHQL_INVALID_REQUEST", 400, `Expected one ${allowed.join(" or ")} operation`);
  const fields = operation.selectionSet.selections;
  if (fields.length !== 1 || fields[0].kind !== "Field")
    throw new Problem("GRAPHQL_INVALID_REQUEST", 400, "Requests must select exactly one root field");
  const field = fields[0].name.value;
  const run = rootValue => execute({ schema, document, rootValue, operationName: request.operationName ?? undefined,
    variableValues: request.variables ?? {} });
  const captured = run({ [field]: args => { throw new Captured(args); } });
  const error = captured.errors?.[0];
  if (!(error?.originalError instanceof Captured))
    throw new Problem("INVALID_REQUEST", 400, error?.message ?? "Variables did not coerce");
  const { context, input = {} } = error.originalError.args;
  return { field, context, input, run };
}

const requestIdOf = request => {
  const id = request?.variables?.context?.requestId;
  return typeof id === "string" && UUID.test(id) && id !== NIL_UUID ? id : undefined;
};

export function createGraphqlHandler(domain, { routeTarget, faults, log }) {
  const fields = resolvers(domain, routeTarget);
  return function handle(plane, request, authorization) {
    let requestId = requestIdOf(request), field;
    try {
      const prepared = prepare(plane, request, ["query", "mutation"]);
      field = prepared.field; requestId = prepared.context.requestId;
      const actor = domain.authenticate(plane, authorization);
      domain.checkContext(plane, prepared.context);
      const fault = faults.take(plane, field);
      if (fault?.action === "rateLimit")
        throw new Problem("RATE_LIMITED", 429, "Request rate exceeded; retry later",
          { retryAfterSeconds: fault.retryAfterSeconds });
      if (fault?.action === "dropBeforeCommit") return finish({ status: 0, drop: true });
      const resolver = fields[plane][field];
      if (!resolver) throw new Problem("FEATURE_UNSUPPORTED", 422, `${field} is not offered by the conformance mock`);
      let value, failure;
      const result = prepared.run({ [field]: () => {
        try { value = resolver(actor, prepared.context, prepared.input); return value; }
        catch (error) { failure = error; throw error; }
      } });
      if (failure) throw failure;
      if (result.errors?.length) throw new Error(`Mock produced an invalid ${field} response: ${result.errors[0].message}`);
      return finish({ status: fault?.action === "dropAfterCommit" ? 0 : 200, drop: fault?.action === "dropAfterCommit",
        body: { data: result.data } });
    } catch (error) {
      if (!(error instanceof Problem)) {
        return finish({ status: 500, body: { errors: [problemBody(new Problem("MOCK_FAILURE", 500,
          error instanceof Error ? error.message : "Mock failure", { outcome: "unknown" }), requestId)] } });
      }
      const headers = error.retryAfterSeconds === undefined ? {} : { "retry-after": String(error.retryAfterSeconds) };
      return finish({ status: error.status, headers, body: { errors: [problemBody(error, requestId)], data: null } });
    }
    function finish(response) {
      log.add({ kind: "request", plane, field: field ?? null, requestId: requestId ?? null,
        status: response.status, code: response.body?.errors?.[0]?.extensions?.code ?? null, dropped: Boolean(response.drop) });
      return response;
    }
  };
}

// Validates a graphql-transport-ws subscribe payload and returns a renderer for event pages.
export function prepareSubscription(domain, actor, payload) {
  const prepared = prepare("communication", payload, ["subscription"]);
  if (prepared.field !== "conversationEvents")
    throw new Problem("FEATURE_UNSUPPORTED", 422, `${prepared.field} is not offered by the conformance mock`);
  domain.checkContext("communication", prepared.context);
  const { conversation, start } = domain.replayStart(actor, prepared.input.conversationId, prepared.input.after);
  return {
    requestId: prepared.context.requestId, conversation, start,
    render(page) {
      const result = prepared.run({ conversationEvents: () => page });
      if (result.errors?.length) throw new Error(`Mock produced an invalid event page: ${result.errors[0].message}`);
      return result;
    },
  };
}
