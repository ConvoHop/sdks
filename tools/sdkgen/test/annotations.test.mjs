import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAnnotations, contextFieldUses, expandedErrorCodes, formatAnnotationReport, pointer, ruleApplies,
} from "../lib/annotations.mjs";
import { fixtureSources, replaceOnce, repoSources } from "./helpers.mjs";

const check = options => checkAnnotations(fixtureSources(options));

test("the repository and fixture annotations cover every operation", () => {
  const sources = repoSources();
  const result = checkAnnotations(sources);
  assert.equal(formatAnnotationReport(result), [
    `Annotations OK: ${Object.keys(sources.annotations.operations).length} operations across ${sources.planes.length} planes`,
    "are annotated in schema/annotations.json.",
  ].join(" "));
  assert.equal(result.ok, true);
  assert.equal(result.operationCount, Object.keys(sources.annotations.operations).length);

  assert.equal(formatAnnotationReport(check()), "Annotations OK: 16 operations across 2 planes are annotated in schema/annotations.json.");
});

test("resumeOperation covers paused and blocked operations with the existing owner and retry contract", () => {
  const { annotations } = repoSources();
  const { summary, errors: _errors, ...behavior } = annotations.operations["management.resumeOperation"];
  assert.match(summary, /^Resume a paused or blocked operation\./);
  assert.deepEqual(behavior, {
    layer: "server",
    auth: [{ credential: "portalCredential", condition: "owner" }],
    idempotency: "idempotent",
    pagination: { style: "none" },
    realtime: { mode: "none" },
  });
  const { summary: _summary, ...policy } = annotations.idempotency.idempotent;
  assert.deepEqual(policy, {
    retry: "sameRequest", resolvable: true, retryBudget: { maxAttempts: 3, windowMs: 60000 },
  });
});

test("resumeOperation declares blocked agent-key admission problems with their existing non-retryable statuses", () => {
  const { annotations } = repoSources();
  const operation = annotations.operations["management.resumeOperation"];
  assert.deepEqual(operation.errors, {
    sets: ["request", "http", "mutation"],
    codes: [
      "NOT_FOUND", "REVISION_CONFLICT",
      "AGENTIC_NOT_CONFIGURED", "AGENT_GRANT_REVOKED", "AGENT_GRANT_EXPIRED", "AGENT_KEY_LIMIT",
    ],
  });
  for (const [code, status] of [
    ["AGENTIC_NOT_CONFIGURED", 503], ["AGENT_GRANT_REVOKED", 403],
    ["AGENT_GRANT_EXPIRED", 403], ["AGENT_KEY_LIMIT", 409],
  ]) {
    const { summary: _summary, ...definition } = annotations.errorCodes[code];
    assert.deepEqual(definition, { origin: "server", status, retryable: false }, code);
    assert.ok(expandedErrorCodes(annotations, operation).includes(code), code);
  }
});

test("the failure report lists missing, unknown, invalid and inconsistent entries in that order", () => {
  const result = check({
    annotations: annotations => {
      delete annotations.operations["alpha.ping"];
      annotations.operations["gamma.x"] = structuredClone(annotations.operations["beta.capabilities"]);
      annotations.operations["alpha.pong"] = structuredClone(annotations.operations["alpha.items"]);
      annotations.operations["alpha.items"].layer = "edge";
    },
    planes: { beta: text => replaceOnce(text, "type Mutation {\n", "type Mutation {\n  widgets(context: ContextInput!): Boolean!\n") },
  });
  assert.equal(result.ok, false);
  assert.equal(formatAnnotationReport(result), `Annotation check failed for schema/annotations.json: 1 missing, 2 unknown, 1 invalid, 1 inconsistent.

MISSING: 1 schema operation(s) have no entry under "operations":
  alpha.ping  mutation      schema/alpha.graphql

UNKNOWN: 2 annotation(s) match no schema operation. Remove or rename them:
  gamma.x     no schema/gamma.graphql plane schema exists
  alpha.pong  schema/alpha.graphql has no root field "pong" (renamed to alpha.ping?)

INVALID: 1 violation(s) of schema/annotations.schema.json:
  /operations/alpha.items/layer: must be one of "client", "server", "both" (got "edge")

INCONSISTENT: 1 problem(s):
  schema/beta.graphql: mutation field "widgets" and query field "widgets" both map to operation id "beta.widgets"; root field names must be unique within a plane

Starter entries for the missing operations. Paste them under "operations", replace every <placeholder>,
check each default, then run \`npm run check:annotations\` again:

  "alpha.ping": {
    "summary": "<One sentence that says what the operation does.>",
    "layer": "<client|server|both>",
    "auth": [{"credential": "<permit|serverKey|userToken|anon|agentToken>"}],
    "idempotency": "<idempotent|singleUse|permitBound|replayOnly|ephemeral>",
    "pagination": {"style": "none"},
    "realtime": {"mode": "none"},
    "errors": {"sets": ["request", "http"], "codes": []}
  }

How to annotate operations: CONTRIBUTING.md#annotating-operations`);
});

test("starter entries default what the schema implies and fail until every placeholder is replaced", () => {
  const remove = annotations => {
    delete annotations.operations["alpha.ping"];
    delete annotations.operations["beta.widgets"];
  };
  const result = check({ annotations: remove });
  assert.deepEqual(result.missing.map(item => [item.id, item.kind, item.schemaPath]), [
    ["alpha.ping", "mutation", "schema/alpha.graphql"],
    ["beta.widgets", "query", "schema/beta.graphql"],
  ]);
  const report = formatAnnotationReport(result);
  assert.match(report, /^Annotation check failed for schema\/annotations\.json: 2 missing\.\n/);
  assert.match(report, /\n {2}alpha\.ping {4}mutation {6}schema\/alpha\.graphql\n {2}beta\.widgets {2}query {9}schema\/beta\.graphql\n/);
  const [ping, widgets] = result.missing.map(item => item.stub);
  assert.deepEqual(widgets, {
    summary: "<One sentence that says what the operation does.>",
    layer: "<client|server|both>",
    auth: [{ credential: "<permit|serverKey|userToken|anon|agentToken>" }],
    idempotency: "safe",
    pagination: { style: "<cursor|sequence|replay|bounded>", pagePath: ["result"] },
    realtime: { mode: "none" },
    errors: { sets: ["request"], codes: [] },
  });

  const pasted = check({
    annotations: annotations => {
      remove(annotations);
      Object.assign(annotations.operations, { "alpha.ping": ping, "beta.widgets": widgets });
    },
  });
  assert.deepEqual(pasted.missing, []);
  assert.deepEqual(pasted.schemaErrors.map(error => [error.path, error.message.replace(/ \(got .*\)$/s, "")]), [
    ["/operations/alpha.ping/layer", 'must be one of "client", "server", "both"'],
    ["/operations/alpha.ping/auth/0/credential", "must match pattern ^[a-z][A-Za-z0-9]*$"],
    ["/operations/alpha.ping/idempotency", 'must be one of "safe", "idempotent", "singleUse", "permitBound", "replayOnly", "ephemeral"'],
    ["/operations/beta.widgets/layer", 'must be one of "client", "server", "both"'],
    ["/operations/beta.widgets/auth/0/credential", "must match pattern ^[a-z][A-Za-z0-9]*$"],
    ["/operations/beta.widgets/pagination/style", 'must be one of "none", "cursor", "sequence", "replay", "bounded"'],
    ["/operations/beta.widgets/pagination", 'missing required property "limitField"'],
    ["/operations/beta.widgets/pagination", 'missing required property "cursorField"'],
  ]);

  const decided = {
    "alpha.ping": { ...ping, layer: "client", auth: [{ credential: "userToken" }], idempotency: "ephemeral" },
    "beta.widgets": {
      ...widgets, summary: "List widgets.", layer: "server", auth: [{ credential: "serverKey", scopes: ["itemRead"] }],
      pagination: { style: "bounded", pagePath: ["result"] },
    },
  };
  const placeholderSummary = check({ annotations: annotations => { Object.assign(annotations.operations, decided); } });
  assert.deepEqual(placeholderSummary.problems, [{ path: "/operations/alpha.ping/summary", message: "replace the placeholder summary" }]);
  decided["alpha.ping"].summary = "Send a ping.";
  assert.equal(check({ annotations: annotations => { Object.assign(annotations.operations, decided); } }).ok, true);
});

test("schema violations are reported without semantic checks", () => {
  const result = check({
    annotations: annotations => {
      annotations.operations["alpha.items"].layer = "edge";
      annotations.operations["alpha.job"].auth[0].scopes = ["unknownScope"];
    },
  });
  assert.deepEqual(result.schemaErrors, [{ path: "/operations/alpha.items/layer", message: 'must be one of "client", "server", "both" (got "edge")' }]);
  assert.deepEqual(result.problems, []);
  const scopedAnonymous = check({ annotations: annotations => { annotations.credentials.anon.scoped = true; } });
  assert.deepEqual(scopedAnonymous.schemaErrors.map(error => error.path), ["/credentials/anon/scoped"]);
  assert.deepEqual(scopedAnonymous.problems, []);
  const malformed = check({ annotations: () => ({ $schema: "./other.schema.json" }) });
  assert.equal(malformed.missing.length, 16);
  assert.ok(malformed.schemaErrors.some(error => error.path === "/$schema" && error.message === 'must equal "./annotations.schema.json"'));
  assert.match(formatAnnotationReport(malformed), /\n {2}"alpha\.ping": \{\n {4}"summary": "<One sentence that says what the operation does\.>",\n {4}"layer"/);
});

const forPlane = (plane, edit) => ({ planes: { [plane]: edit } });
const SEMANTIC_CASES = [
  ["a discovered plane needs an entry", { annotations: a => { delete a.planes.beta; } }, [
    ["/planes", 'missing entry "beta" for schema/beta.graphql'],
  ]],
  ["a plane entry needs a schema", { annotations: a => { a.planes.gamma = structuredClone(a.planes.beta); } }, [
    ["/planes/gamma", "no schema/gamma.graphql plane schema exists"],
  ]],
  ["plane schema file", { annotations: a => { a.planes.beta.schema = "alpha.graphql"; } }, [
    ["/planes/beta/schema", 'must be "beta.graphql"'],
  ]],
  ["resolveOperation plane and kind", { annotations: a => { a.planes.beta.resolveOperation = "alpha.ping"; } }, [
    ["/planes/beta/resolveOperation", '"alpha.ping" must be in the beta plane'],
    ["/planes/beta/resolveOperation", '"alpha.ping" must be a query (it is a mutation)'],
  ]],
  ["unknown resolveOperation", { annotations: a => { a.planes.beta.resolveOperation = "beta.nothing"; } }, [
    ["/planes/beta/resolveOperation", 'unknown operation "beta.nothing"'],
  ]],
  ["context input type", { annotations: a => { a.planes.beta.context.input = "Widget"; } }, [
    ["/planes/beta/context/input", "Widget is not an input type in schema/beta.graphql"],
    ...["query capabilities", "query resolveRequest", "query widgets", "mutation createWidget", "mutation requestAccess",
      "mutation claimWidget"].map(field => [`schema/beta.graphql ${field}`, "must take context: Widget!"]),
  ]],
  ["context rule fields", { annotations: a => { a.planes.alpha.context.rules[1].fields.push("nope", "requestId"); } }, [
    ["/planes/alpha/context/rules/1/fields/1", 'ContextInput has no field "nope"'],
    ["/planes/alpha/context/rules/1/fields/2", 'cannot forbid non-null field "requestId"'],
  ]],
  ["context rule operation lists", { annotations: a => { a.planes.beta.context.rules[0].except = ["alpha.redeem"]; } }, [
    ["/planes/beta/context/rules/0/except/0", '"alpha.redeem" must be in the beta plane'],
  ]],
  ["custom scalars", { annotations: a => { a.scalars.Extra = a.scalars.Ratio; delete a.scalars.Ratio; } }, [
    ["/scalars", 'missing entry for custom scalar "Ratio" declared in schema/beta.graphql'],
    ["/scalars/Extra", 'no plane schema declares scalar "Extra"'],
  ]],
  ["retryable error codes", { annotations: a => { a.errorCodes.NOT_FOUND.retryable = true; } }, [
    ["/errorCodes/NOT_FOUND/retryable", "cannot be true for status 404; a retryable code is transient (429 or 5xx)"],
  ]],
  ["error set codes", { annotations: a => { a.errorSets.http.codes.push("NOPE"); } }, [
    ["/errorSets/http/codes/1", 'unknown error code "NOPE"'],
  ]],
  ["envelope plane", { annotations: a => { a.realtime.envelope.plane = "beta"; } }, [
    ["/realtime/envelope/type", "Event is not an object type in schema/beta.graphql"],
    ["/realtime/channels/eventStream/subscription", '"alpha.eventStream" must be in the beta plane'],
    ["/realtime/channels/eventStream/replay", '"alpha.events" must be in the beta plane'],
  ]],
  ["envelope fields", { annotations: a => Object.assign(a.realtime.envelope, { discriminator: "sequence", subject: "nope" }) && a }, [
    ["/realtime/envelope/subject", 'Event has no field "nope"'],
    ["/realtime/envelope/discriminator", "Event.sequence must be String!"],
  ]],
  ["envelope payload", { annotations: a => { a.realtime.envelope.payload = "type"; } }, [
    ["/realtime/envelope/payload", "Event.type must be an object type"],
  ]],
  ["event payload fields", { annotations: a => { a.realtime.events["job.started"].payload.optional = ["nope", "jobId"]; } }, [
    ["/realtime/events/job.started/payload/optional/0", 'EventPayload has no field "nope"'],
    ["/realtime/events/job.started/payload", '"jobId" is both required and optional'],
  ]],
  ["channel subscription entry", { annotations: a => { a.operations["alpha.eventStream"].realtime = { mode: "none" }; } }, [
    ["/realtime/channels/eventStream/subscription", 'alpha.eventStream must declare realtime {"mode": "subscription", "channel": "eventStream"}'],
    ["/operations/alpha.eventStream/realtime/mode", 'subscriptions must use mode "subscription"'],
  ]],
  ["channel replay style", {
    annotations: a => { a.operations["alpha.events"].pagination.style = "cursor"; },
  }, [
    ["/realtime/channels/eventStream/replay", 'alpha.events must use pagination style "replay"'],
  ]],
  ["channel replay page type", {
    annotations: a => {
      a.realtime.channels.eventStream.replay = "alpha.items";
      a.operations["alpha.items"].pagination.style = "replay";
    },
  }, [
    ["/realtime/channels/eventStream/replay", "alpha.items pages must hold Event items"],
    ["/realtime/channels/eventStream/replay", "must return the same page type as the subscription (EventPage), not ItemPage"],
  ]],
  ["channel endpoint", { annotations: a => { a.realtime.channels.eventStream.endpoint.operation = "alpha.ping"; } }, [
    ["/realtime/channels/eventStream/endpoint/operation", '"alpha.ping" must be a query (it is a mutation)'],
  ]],
  ["auth entries", {
    annotations: a => {
      a.operations["alpha.items"].auth = [{ credential: "userToken" }, { credential: "userToken" }, { credential: "apiKey" }];
      a.operations["alpha.job"].auth[0].scopes = ["itemRead", "nope"];
      a.operations["alpha.resolveRequest"].auth[0].condition = "admin";
      a.operations["alpha.ping"].auth = [{ credential: "userToken", scopes: ["itemRead"] }];
    },
  }, [
    ["/operations/alpha.resolveRequest/auth/0/condition", 'unknown condition "admin"'],
    ["/operations/alpha.items/auth/1", "duplicates an earlier entry"],
    ["/operations/alpha.items/auth/2/credential", 'unknown credential "apiKey"'],
    ["/operations/alpha.job/auth/0/scopes/1", 'unknown scope "nope"'],
    ["/operations/alpha.ping/auth/0/scopes", "userToken credentials carry no scopes"],
  ]],
  ["layers match credential runtimes", {
    annotations: a => {
      a.operations["alpha.capabilities"].auth = [{ credential: "userToken" }];
      a.operations["alpha.items"].auth.push({ credential: "serverKey", scopes: ["itemRead"] });
      a.operations["alpha.job"].auth.push({ credential: "userToken" });
    },
  }, [
    ["/operations/alpha.capabilities/layer", '"both" requires at least one client credential and one server credential in auth'],
    ["/operations/alpha.items/layer", '"client" operations accept only client credentials; use "both" when server credentials are also accepted'],
    ["/operations/alpha.job/layer", '"server" operations cannot accept client credentials; use "both" or "client"'],
  ]],
  ["context-carried credentials follow the context rules", {
    annotations: a => {
      a.operations["alpha.job"].auth.push({ credential: "permit" });
      a.planes.alpha.context.rules[1].except.push("alpha.ping");
    },
  }, [
    ["/operations/alpha.job/auth", "accepts permit, but the alpha context rules forbid permit for this operation"],
    ["/planes/alpha/context/rules", "permit carries permit credentials, so it must be forbidden for alpha.ping, which does not accept permit"],
  ]],
  ["context-carried credentials need a context field", { annotations: a => { a.credentials.permit.contextField = "ticket"; } }, [
    ["/operations/alpha.redeem/auth", "permit travels in context.ticket, but ContextInput has no such field"],
  ]],
  ["idempotency matches the operation kind and credentials", {
    annotations: a => {
      a.operations["alpha.items"].idempotency = "idempotent";
      a.operations["alpha.ping"].idempotency = "safe";
      a.operations["alpha.startJob"].idempotency = "permitBound";
      a.operations["alpha.redeem"].idempotency = "idempotent";
    },
  }, [
    ["/operations/alpha.items/idempotency", 'query operations are read-only and must be "safe"'],
    ["/operations/alpha.startJob/idempotency", '"permitBound" requires every auth entry to use a context-carried permit credential'],
    ["/operations/alpha.ping/idempotency", 'mutations cannot be "safe"'],
    ["/operations/alpha.redeem/idempotency", 'mutations authorized by a context-carried permit must be "permitBound"'],
  ]],
  ["a credential with carrier none excludes other credentials", {
    annotations: a => { a.operations["beta.requestAccess"].auth.push({ credential: "serverKey", scopes: ["widgetWrite"] }); },
  }, [
    ["/operations/beta.requestAccess/auth", 'an operation that accepts a credential with carrier "none" accepts no other credential'],
  ]],
  ["resolvable classes need credentials the resolveOperation accepts", {
    annotations: a => {
      a.operations["beta.requestAccess"].idempotency = "singleUse";
      a.operations["beta.claimWidget"].idempotency = "idempotent";
    },
  }, [
    ["/operations/beta.requestAccess/auth/0/credential",
      '"singleUse" outcomes are resolved with beta.resolveRequest, which does not accept anon; use a class whose outcomes are not resolvable'],
    ["/operations/beta.claimWidget/auth/0/credential",
      '"idempotent" outcomes are resolved with beta.resolveRequest, which does not accept agentToken; use a class whose outcomes are not resolvable'],
  ]],
  ["destructive marks only mutations", { annotations: a => { a.operations["alpha.items"].destructive = true; } }, [
    ["/operations/alpha.items/destructive", "query operations are read-only and cannot be destructive"],
  ]],
  ["pagination fields and page paths", {
    annotations: a => {
      a.operations["alpha.items"].pagination.limitField = "size";
      a.operations["alpha.ping"].pagination = { style: "bounded", pagePath: [] };
      a.operations["beta.widgets"].pagination.pagePath = ["nope"];
      a.operations["alpha.capabilities"].pagination = { style: "cursor", limitField: "limit", cursorField: "cursor", pagePath: [] };
    },
  }, [
    ["/operations/alpha.capabilities/pagination/limitField", "alpha.capabilities has no input argument"],
    ["/operations/alpha.capabilities/pagination/cursorField", "alpha.capabilities has no input argument"],
    ...["items", "complete", "refreshRequired", "nextCursor"]
      .map(field => ["/operations/alpha.capabilities/pagination/pagePath", `Capabilities lacks "${field}", which style "cursor" requires`]),
    ["/operations/alpha.items/pagination/limitField", 'ItemsInput has no field "size"'],
    ["/operations/alpha.ping/pagination/style", "mutations are not paged"],
    ["/operations/alpha.ping/pagination/pagePath", "Boolean is not an object type"],
    ["/operations/beta.widgets/pagination/pagePath", 'WidgetsPayload has no field "nope"'],
  ]],
  ["page types", forPlane("beta", text => replaceOnce(replaceOnce(text, "  refreshRequired: Boolean!\n", ""), "items: [Widget!]!", "items: Widget!")), [
    ["/operations/beta.widgets/pagination/pagePath", 'WidgetPage lacks "refreshRequired", which style "bounded" requires'],
    ["/operations/beta.widgets/pagination/pagePath", "WidgetPage.items must be a list"],
  ]],
  ["realtime modes and emitted events", {
    annotations: a => {
      a.operations["alpha.items"].realtime = { mode: "subscription", channel: "eventStream" };
      a.operations["alpha.job"].realtime = { mode: "none", emits: ["job.started"] };
      a.operations["alpha.ping"].realtime.emits = ["item.deleted"];
      a.operations["alpha.redeem"].realtime = { mode: "subscription", channel: "other" };
    },
  }, [
    ["/operations/alpha.items/realtime/mode", 'only subscriptions use mode "subscription"'],
    ["/operations/alpha.items/realtime/channel", 'channel "eventStream" is served by alpha.eventStream'],
    ["/operations/alpha.job/realtime/emits", "only mutations emit events"],
    ["/operations/alpha.ping/realtime/emits/0", 'unknown event type "item.deleted"'],
    ["/operations/alpha.redeem/realtime/mode", 'only subscriptions use mode "subscription"'],
    ["/operations/alpha.redeem/realtime/channel", 'unknown channel "other"'],
  ]],
  ["long-running operations", {
    annotations: a => {
      a.operations["alpha.items"].longRunning = { poll: "alpha.job", refField: "job" };
      a.operations["alpha.startJob"].longRunning = { poll: "beta.widgets", refField: "receipt" };
      a.operations["alpha.ping"].longRunning = { poll: "alpha.items", refField: "job" };
    },
  }, [
    ["/operations/alpha.items/longRunning", "only mutations start long-running work"],
    ["/operations/alpha.items/longRunning/refField", 'ItemPage has no field "job"'],
    ["/operations/alpha.startJob/longRunning/poll", '"beta.widgets" must be in the alpha plane'],
    ["/operations/alpha.startJob/longRunning/poll", "beta.widgets input must have an operationId field"],
    ["/operations/alpha.startJob/longRunning/refField", "Receipt must have an operationId field"],
    ["/operations/alpha.ping/longRunning/poll", "alpha.items input must have an operationId field"],
    ["/operations/alpha.ping/longRunning/refField", 'Boolean has no field "job"'],
  ]],
  ["error sets and codes", {
    annotations: a => {
      a.operations["alpha.items"].errors = { sets: ["request", "nope"], codes: ["UNAVAILABLE", "NOPE"] };
    },
  }, [
    ["/operations/alpha.items/errors/sets/1", 'unknown error set "nope"'],
    ["/operations/alpha.items/errors/codes/0", '"UNAVAILABLE" is already included by error set "request"'],
    ["/operations/alpha.items/errors/codes/1", 'unknown error code "NOPE"'],
  ]],
  ["root field arguments", forPlane("alpha", text => replaceOnce(text,
    "ping(context: ContextInput!, input: PingInput): Boolean!", "ping(context: ContextInput, input: String, dryRun: Boolean): Boolean!")), [
    ["schema/alpha.graphql mutation ping", "must take context: ContextInput!"],
    ["schema/alpha.graphql mutation ping", "input must be an input object type, not String"],
    ["schema/alpha.graphql mutation ping", 'unsupported argument "dryRun"; root fields take only context and input'],
  ]],
];

for (const [name, options, expected] of SEMANTIC_CASES) {
  test(`semantic check: ${name}`, () => {
    const result = check(options);
    assert.deepEqual(result.schemaErrors, [], "the case must stay schema-valid");
    assert.deepEqual(result.problems.map(problem => [problem.path, problem.message]), expected);
    assert.equal(result.ok, false);
    const report = formatAnnotationReport(result);
    assert.ok(report.includes(`\nINCONSISTENT: ${expected.length} problem(s):\n`), report);
    for (const [path, message] of expected) assert.ok(report.includes(`\n  ${path}: ${message}`), report);
  });
}

test("annotation helpers", () => {
  assert.equal(pointer("operations", "a/b~c", 0), "/operations/a~1b~0c/0");
  assert.equal(ruleApplies({ only: ["a.x"] }, "a.x"), true);
  assert.equal(ruleApplies({ only: ["a.x"] }, "a.y"), false);
  assert.equal(ruleApplies({ except: ["a.x"] }, "a.x"), false);
  assert.equal(ruleApplies({}, "a.x"), true);

  const sources = fixtureSources();
  const { annotations } = sources;
  assert.deepEqual(expandedErrorCodes(annotations, annotations.operations["alpha.items"]),
    ["CURSOR_EXPIRED", "INVALID_REQUEST", "TRANSPORT_UNKNOWN", "UNAVAILABLE"]);
  const alpha = sources.planes.find(plane => plane.name === "alpha");
  const uses = operationId => contextFieldUses({
    plane: annotations.planes.alpha, contextType: alpha.schema.getType("ContextInput"), operationId,
    auth: annotations.operations[operationId].auth, credentials: annotations.credentials,
  });
  assert.deepEqual(uses("alpha.capabilities"), [
    { name: "tenant", use: "optional" }, { name: "requestId", use: "required" }, { name: "attempt", use: "optional" },
    { name: "permit", use: "forbidden" }, { name: "tags", use: "optional" },
  ]);
  assert.deepEqual(uses("alpha.redeem").map(item => item.use), ["required", "required", "optional", "required", "optional"]);
});
