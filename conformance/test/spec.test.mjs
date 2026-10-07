// The language-neutral spec files must agree with each other, with the reference implementations
// and with the built-in mock; these checks catch drift before any driver runs.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { FEATURES, OPERATIONS } from "../drivers/ts/dist/sdk.mjs";
import { REPO_ROOT, SCENARIO_DIR, readJson } from "../lib/files.mjs";
import { loadSuites } from "../lib/scenarios.mjs";
import { loadSpec, readSpecFiles } from "../lib/spec.mjs";
import { VECTOR_FILE, buildWebhookVectors, serializeWebhookVectors } from "../lib/webhook-vectors.mjs";
import { WEBHOOK_CODES, sign, verify } from "../lib/webhooks.mjs";
import { Domain, Problem, SCOPES } from "../mock/domain.mjs";
import { MAX_DOCUMENT_BYTES } from "../mock/resolvers.mjs";
import { MOCK_CAPABILITIES } from "../mock/server.mjs";

const sorted = values => [...values].sort();
const withoutNull = values => values.filter(value => value !== null);

let spec, files, suites, scenarios;
before(async () => {
  spec = await loadSpec();
  files = await readSpecFiles();
  suites = await loadSuites(SCENARIO_DIR, { validate: spec.validators.scenario, catalog: spec.catalog, vectors: spec.vectors });
  scenarios = suites.flatMap(suite => suite.scenarios.map(entry => entry.definition));
});

describe("scenario suites", () => {
  test("load, validate and pass the static checks", () => {
    assert.deepEqual(suites.map(suite => suite.suite),
      ["auth", "crud", "errors", "idempotency", "pagination", "realtime", "recovery", "webhooks"]);
    for (const suite of suites) assert.ok(suite.scenarios.length > 0, `${suite.suite} has no scenarios`);
  });

  test("exercise every coverage tag", () => {
    const covered = new Set(scenarios.flatMap(scenario => scenario.covers));
    const uncovered = files.scenarioSchema.$defs.coverage.enum.filter(tag => !covered.has(tag));
    assert.deepEqual(uncovered, [], `no scenario covers ${uncovered.join(", ")}`);
  });

  test("verify every webhook vector exactly once", () => {
    const used = scenarios.flatMap(scenario => scenario.steps).filter(step => step.do === "webhooks.verify").map(step => step.vector);
    assert.deepEqual(sorted(used), sorted(spec.vectors.keys()));
  });
});

describe("enumerations agree across the spec, the mock and the reference driver", () => {
  test("target capabilities", () => {
    const scenarioCapabilities = files.scenarioSchema.$defs.capability.enum;
    assert.deepEqual(sorted(files.targetSchema.properties.capabilities.items.enum), sorted(scenarioCapabilities));
    assert.deepEqual(sorted(MOCK_CAPABILITIES), sorted(scenarioCapabilities), "the mock should implement every capability");
  });

  test("driver features", () => {
    const known = files.scenarioSchema.$defs.feature.enum;
    for (const feature of FEATURES) assert.ok(known.includes(feature), `reference driver feature ${feature} is not in scenario.schema.json`);
  });

  test("the reference driver implements exactly the operation catalog", () => {
    const declared = Object.entries(OPERATIONS).flatMap(([role, operations]) => operations.map(operation => `${role}:${operation}`));
    const catalogued = Object.entries(spec.catalog).flatMap(([operation, entry]) => entry.roles.map(role => `${role}:${operation}`));
    assert.deepEqual(sorted(declared), sorted(catalogued));
  });

  test("webhook result codes", () => {
    const protocolCodes = withoutNull(files.protocolSchema.$defs.webhookCode.enum);
    const vectorCodes = withoutNull(files.vectorSchema.$defs.vector.properties.expected.properties.code.enum);
    assert.deepEqual(sorted(protocolCodes), sorted(WEBHOOK_CODES));
    assert.deepEqual(sorted(vectorCodes), sorted(WEBHOOK_CODES));
  });
});

// Scenario expectations that schema/v1-ir.json does not define yet.
const PENDING_ERROR_CODES = new Set();
// HTTP guards that generated SDK requests never trip, and the mock's own internal failures.
const MOCK_ONLY_CODES = new Set(["METHOD_NOT_ALLOWED", "UNSUPPORTED_MEDIA_TYPE", "MOCK_FAILURE"]);
const ROLE_CREDENTIALS = { user: "userSession", backend: "backendKey", management: "portalCredential" };
// Its requestId names the request to resolve, not a request of its own.
const RESOLVE_REQUEST = "communication.resolveRequest";

/** Collects the strings in `code` positions of a matcher, through operators that take values or matchers. */
function mentionedCodes(matcher, found, atCode = false) {
  if (typeof matcher === "string" && atCode) found.add(matcher);
  else if (Array.isArray(matcher)) for (const item of matcher) mentionedCodes(item, found, atCode);
  else if (matcher !== null && typeof matcher === "object") {
    for (const [key, value] of Object.entries(matcher)) {
      if (!key.startsWith("$")) mentionedCodes(value, found, key === "code");
      else if (["$anyOf", "$contains", "$each", "$eq", "$ne"].includes(key)) mentionedCodes(value, found, atCode);
    }
  }
  return found;
}

/** Collects [code, status] for each code of the matchers in a value that pin a numeric or null status. */
function pinnedStatuses(value, found = []) {
  if (Array.isArray(value)) for (const item of value) pinnedStatuses(item, found);
  else if (value !== null && typeof value === "object") {
    if ("code" in value && (typeof value.status === "number" || value.status === null))
      for (const code of mentionedCodes(value.code, new Set(), true)) found.push([code, value.status]);
    for (const item of Object.values(value)) pinnedStatuses(item, found);
  }
  return found;
}

/** Collects every string in a value that is one of the given names, wherever it appears. */
function namedStrings(value, names, found = new Set()) {
  if (typeof value === "string") { if (names.has(value)) found.add(value); }
  else if (value !== null && typeof value === "object") for (const item of Object.values(value)) namedStrings(item, names, found);
  return found;
}

/** Whether a realtime.collect step expects its subscription to have ended, as the runner evaluates it. */
const expectsEnd = step => step.expect?.closed ?? (step.until?.closed === true);

describe("the operation catalog and scenarios agree with schema/v1-ir.json", () => {
  let ir, irOperations, channel;
  before(async () => {
    ir = await readJson(join(REPO_ROOT, "schema", "v1-ir.json"));
    irOperations = new Map(ir.operations.map(operation => [operation.id, operation]));
    channel = ir.realtime.channels.find(candidate => candidate.name === files.operations.realtime.irChannel);
  });

  test("every operation maps to an IR operation that accepts each of its roles", t => {
    assert.match(ir.irVersion, /^1\./, "the IR format changed; review these checks");
    for (const [name, entry] of Object.entries(spec.catalog)) {
      const operation = irOperations.get(entry.irOperation);
      assert.ok(operation, `${name}: ${entry.irOperation} is not an IR operation`);
      for (const role of entry.roles) {
        const credential = ir.credentials.find(candidate => candidate.name === ROLE_CREDENTIALS[role]);
        assert.ok(credential, `the IR has no ${ROLE_CREDENTIALS[role]} credential for ${role} clients`);
        assert.ok(operation.auth.some(rule => rule.credential === credential.name), `${name}: ${operation.id} does not accept ${credential.name}`);
        assert.ok([credential.runtime, "both"].includes(operation.layer),
          `${name}: ${operation.id} belongs to the ${operation.layer} layer, but ${role} clients run on the ${credential.runtime}`);
      }
    }
    const covered = new Set([...Object.values(spec.catalog).map(entry => entry.irOperation), channel?.subscription].filter(Boolean));
    t.diagnostic(`the catalog and its realtime channel cover ${covered.size} of ${ir.operations.length} IR operations`);
  });

  test("operations take exactly the pagination arguments of their IR operation", () => {
    const pagingFields = new Set(ir.operations.flatMap(({ pagination }) => [pagination.cursorField, pagination.limitField]).filter(Boolean));
    for (const [name, entry] of Object.entries(spec.catalog)) {
      const { pagination } = irOperations.get(entry.irOperation);
      const own = [pagination.cursorField, pagination.limitField].filter(Boolean);
      const paging = [...entry.required, ...entry.optional].filter(argument => pagingFields.has(argument));
      assert.deepEqual(paging.filter(argument => !own.includes(argument)), [],
        `${name}: ${entry.irOperation} pages with ${own.join(" and ") || "no arguments"}`);
      if (pagination.cursorField) assert.ok(paging.includes(pagination.cursorField), `${name} cannot pass ${pagination.cursorField}`);
    }
  });

  test("requestId pins only operations that the IR retries with the same request and can resolve", () => {
    const classes = new Map(ir.idempotency.map(policy => [policy.name, policy]));
    for (const [name, entry] of Object.entries(spec.catalog)) {
      if (entry.irOperation === RESOLVE_REQUEST) assert.ok(entry.required.includes("requestId"), `${name} needs the requestId to resolve`);
      else if ([...entry.required, ...entry.optional].includes("requestId")) {
        const { idempotency } = irOperations.get(entry.irOperation);
        const policy = classes.get(idempotency);
        assert.ok(policy?.retry === "sameRequest" && policy.resolvable === true,
          `${name}: ${entry.irOperation} is ${idempotency}, which neither retries the same request nor resolves it`);
      }
    }
  });

  test("realtime steps use a user channel whose replay and endpoint operations the catalog covers", () => {
    assert.ok(channel, `${files.operations.realtime.irChannel} is not an IR realtime channel`);
    const subscription = irOperations.get(channel.subscription);
    assert.equal(subscription?.kind, "subscription");
    assert.ok(subscription.auth.some(rule => rule.credential === ROLE_CREDENTIALS.user), `${subscription.id} does not accept user sessions`);
    const catalogued = new Set(Object.values(spec.catalog).map(entry => entry.irOperation));
    for (const operation of [channel.replay, channel.endpoint.operation]) assert.ok(catalogued.has(operation), `no operation maps to ${operation}`);
  });

  test("realtime drops end or resume the subscription as the IR's close codes require", () => {
    const { terminalCloseCodes, baseDelayMs, jitterMs } = channel.reconnect;
    const kinds = new Set();
    for (const { id, steps } of scenarios) {
      const open = new Map(); // subscription handle -> conversationId template
      steps.forEach((step, index) => {
        if (step.do === "realtime.subscribe" && step.expect === undefined) open.set(step.subscription, step.conversationId);
        if (step.do === "realtime.close" || (step.do === "realtime.collect" && expectsEnd(step))) open.delete(step.subscription);
        if (step.do !== "control.realtimeDrop") return;
        const terminal = terminalCloseCodes.includes(step.code);
        kinds.add(terminal);
        // The drop's effects are observed up to the next drop.
        const next = steps.findIndex((later, at) => at > index && later.do === "control.realtimeDrop");
        const window = steps.slice(index + 1, next === -1 ? undefined : next);
        const dropped = [...open].filter(([, conversationId]) => step.conversationId === undefined || step.conversationId === conversationId);
        const observations = dropped.map(([handle]) => window.find(later => later.do === "realtime.collect" && later.subscription === handle))
          .filter(Boolean);
        assert.ok(observations.length > 0, `${id}: no realtime.collect on a dropped subscription follows the drop with ${step.code}`);
        for (const collect of observations)
          assert.equal(expectsEnd(collect), terminal, `${id}: the IR ${terminal ? "ends" : "resumes"} subscriptions closed with ${step.code}`);
        if (!terminal) return;
        const conclusion = window.findIndex(later => later.do === "control.waitLog" && later.kind === "subscribe");
        assert.ok(conclusion !== -1, `${id}: no control.waitLog of subscribe entries shows that ${step.code} is not retried`);
        assert.ok(window[conclusion].expect !== undefined, `${id}: the control.waitLog after ${step.code} must expect the subscribe entries it finds`);
        const waited = window.slice(0, conclusion).filter(later => later.do === "sleep").reduce((total, later) => total + later.ms, 0);
        assert.ok(waited > baseDelayMs + jitterMs, `${id} must wait out the first reconnect delay before checking that there is no reconnect`);
      });
    }
    assert.deepEqual(sorted(kinds), [false, true], "scenarios should drop with both terminal and resumable close codes");
  });

  test("scenarios expect only error codes that the IR defines for the operation", t => {
    const allCodes = ir.errors.codes.map(code => code.name);
    const codeNames = new Set([...allCodes, ...PENDING_ERROR_CODES]);
    const subscription = irOperations.get(channel.subscription);
    for (const scenario of scenarios) {
      for (const step of scenario.steps) {
        const codes = new Set();
        for (const key of ["error", "errors"]) if (step.expect?.[key] !== undefined) mentionedCodes(step.expect[key], codes);
        // A code anywhere else would escape the check below.
        const stray = [...namedStrings(step, codeNames)].filter(code => !codes.has(code));
        assert.deepEqual(stray, [], `${scenario.id}: ${step.do} names error codes outside the code fields of expect.error and expect.errors`);
        if (codes.size === 0) continue;
        let allowed;
        if (step.do === "invoke") {
          // A retry resends the original mutation, so any code can come back.
          allowed = step.operation === "requests.retry" ? allCodes : irOperations.get(spec.catalog[step.operation].irOperation).errors.codes;
        } else if (step.do.startsWith("realtime.")) allowed = subscription.errors.codes;
        else assert.fail(`${scenario.id}: no IR operation defines the errors of ${step.do}`);
        for (const code of codes) {
          if (PENDING_ERROR_CODES.has(code) && !allCodes.includes(code)) continue;
          assert.ok(allowed.includes(code), `${scenario.id}: ${step.operation ?? step.do} cannot fail with ${code} according to the IR`);
        }
      }
    }
    for (const code of PENDING_ERROR_CODES) if (allCodes.includes(code)) t.diagnostic(`${code} is in the IR now; remove it from PENDING_ERROR_CODES`);
  });

  test("scenarios pin the IR's HTTP status for each error code", () => {
    const statuses = new Map(ir.errors.codes.map(code => [code.name, code.status]));
    let checked = 0;
    for (const scenario of scenarios) {
      for (const step of scenario.steps) {
        for (const [code, status] of pinnedStatuses([step.expect?.error, step.expect?.errors])) {
          const expected = statuses.get(code);
          if (expected === undefined) continue;
          assert.equal(status, expected, `${scenario.id}: the IR answers ${code} with HTTP ${expected}`);
          checked += 1;
        }
      }
    }
    assert.ok(checked > 0, "no scenario pins an HTTP status");
  });

  test("the mock's backend-key scopes and GraphQL document limit are the IR's", () => {
    assert.deepEqual(sorted(SCOPES), sorted(ir.scopes.map(scope => scope.name)));
    assert.equal(MAX_DOCUMENT_BYTES, ir.transport.http.maxDocumentBytes);
  });

  test("the mock authorizes user sessions and backend keys as the IR's auth rules require", () => {
    // A fresh authority per call, with a conversation in which alice, a member, wrote a message.
    const fixture = () => {
      const domain = new Domain();
      const admin = { kind: "backend", scopes: new Set(SCOPES), scope: `backend:${domain.projectId}` };
      const principal = externalUserId => domain.createPrincipal(admin, { externalUserId }).result.principalId;
      const alice = principal("alice"), bob = principal("bob");
      const { conversationId } = domain.createConversation(admin,
        { title: "Authorization", props: {}, members: [{ principalId: alice, role: "member" }] }).result;
      const user = { kind: "user", principalId: alice, sessionId: domain.nextId(), scope: `user:${alice}` };
      const { messageId } = domain.sendMessage(user, { conversationId, text: "hello", props: {} }).result;
      return { domain, user, alice, bob, conversationId, messageId };
    };
    const calls = {
      "communication.route": ({ domain }, actor) => domain.route(actor),
      "communication.createPrincipal": ({ domain }, actor) => domain.createPrincipal(actor, { externalUserId: "carol" }),
      "communication.issueSession": ({ domain, alice }, actor) =>
        domain.issueSession(actor, { principalId: alice, deviceId: domain.nextId(), requestedTtlMs: "60000" }),
      "communication.createConversation": ({ domain }, actor) =>
        domain.createConversation(actor, { title: "Another", props: {}, members: [] }),
      "communication.getConversation": ({ domain, conversationId }, actor) => domain.getConversation(actor, { conversationId }),
      "communication.members": ({ domain, conversationId }, actor) => domain.members(actor, { conversationId, limit: 10 }),
      "communication.addMembers": ({ domain, conversationId, bob }, actor) =>
        domain.addMembers(actor, { conversationId, members: [{ principalId: bob, role: "member", expectedRevision: "0" }] }),
      "communication.sendMessage": ({ domain, conversationId }, actor) =>
        domain.sendMessage(actor, { conversationId, text: "again", props: {} }),
      "communication.messages": ({ domain, conversationId }, actor) => domain.messages(actor, { conversationId, limit: 10 }),
      "communication.editMessage": ({ domain, conversationId, messageId }, actor) =>
        domain.editMessage(actor, { conversationId, messageId, expectedRevision: "1", text: "edited" }),
      "communication.deleteMessage": ({ domain, conversationId, messageId }, actor) =>
        domain.deleteMessage(actor, { conversationId, messageId, expectedRevision: "1" }),
      "communication.events": ({ domain, conversationId }, actor) => domain.events(actor, { conversationId, limit: 10 }),
      [channel.subscription]: ({ domain, conversationId }, actor) => domain.replayStart(actor, conversationId),
      [RESOLVE_REQUEST]: ({ domain }, actor) => domain.resolve(actor, domain.nextId()),
    };
    // The management plane authenticates nothing but the management credential.
    const exempt = new Set(["management.issueBackendKey"]);
    const covered = new Set([...Object.values(spec.catalog).map(entry => entry.irOperation), channel.subscription]);
    assert.deepEqual([...covered].filter(id => !(id in calls) && !exempt.has(id)), [], "add a mock call for each operation");
    const failure = (id, actorFor) => {
      const context = fixture();
      try { calls[id](context, actorFor(context)); return null; }
      catch (error) { if (error instanceof Problem) return [error.code, error.status]; throw error; }
    };
    const backendKey = scopes => ({ domain }) => ({ kind: "backend", scopes: new Set(scopes), scope: `backend:${domain.projectId}` });
    for (const id of Object.keys(calls)) {
      const { auth } = irOperations.get(id);
      const userRules = auth.filter(rule => rule.credential === ROLE_CREDENTIALS.user);
      // alice meets each of these conditions; another condition needs a fixture that meets it.
      for (const { condition } of userRules)
        assert.ok([undefined, "member", "authorOrModerator", "ownRequest"].includes(condition), `${id}: review the ${condition} condition`);
      if (userRules.length) assert.equal(failure(id, ({ user }) => user), null, `${id} should accept alice's user session`);
      else assert.deepEqual(failure(id, ({ user }) => user), ["FORBIDDEN", 403], `${id} should refuse user sessions`);
      const rules = auth.filter(rule => rule.credential === ROLE_CREDENTIALS.backend);
      if (rules.length === 0) {
        assert.deepEqual(failure(id, backendKey(SCOPES)), ["FORBIDDEN", 403], `${id} should refuse backend keys whatever their scopes`);
        continue;
      }
      for (const rule of rules) {
        const result = failure(id, backendKey(rule.scopes ?? []));
        // The mock leaves the backend data plane out, but only after authorizing the key.
        assert.ok(result === null || result[0] === "FEATURE_UNSUPPORTED",
          `${id} should accept a backend key with ${rule.scopes?.join(" and ") || "no scopes"}, not fail with ${result}`);
      }
      for (const scope of new Set(rules.flatMap(rule => rule.scopes ?? []))) {
        const held = SCOPES.filter(candidate => candidate !== scope);
        if (rules.some(rule => (rule.scopes ?? []).every(required => held.includes(required)))) continue;
        assert.deepEqual(failure(id, backendKey(held)), ["SCOPE_REQUIRED", 403], `${id} should require the ${scope} scope`);
      }
    }
  });

  test("the mock fails only with IR error codes and their IR statuses", async () => {
    const statuses = new Map(ir.errors.codes.map(code => [code.name, code.status]));
    const directory = join(REPO_ROOT, "conformance", "mock");
    for (const file of (await readdir(directory)).filter(name => name.endsWith(".mjs"))) {
      const source = await readFile(join(directory, file), "utf8");
      const problems = [...source.matchAll(/new Problem\("([A-Z_]+)",\s*(\d+)/g)];
      assert.equal(problems.length, source.match(/new Problem\(/g)?.length ?? 0, `${file}: give each Problem a literal code and status`);
      for (const [, code, status] of problems) {
        if (!statuses.has(code)) {
          assert.ok(PENDING_ERROR_CODES.has(code) || MOCK_ONLY_CODES.has(code), `${file}: ${code} is not an IR error code`);
          continue;
        }
        const expected = statuses.get(code);
        if (expected !== undefined) assert.equal(Number(status), expected, `${file}: the IR answers ${code} with HTTP ${expected}`);
      }
    }
  });
});

describe("webhook signature vectors", () => {
  test("the committed file is the generator output (npm run generate:conformance)", async () => {
    assert.equal(await readFile(VECTOR_FILE, "utf8"), serializeWebhookVectors(buildWebhookVectors()));
  });

  test("the reference verifier returns each vector's hand-written expectation", () => {
    for (const vector of spec.vectors.values()) assert.deepEqual(verify(vector), vector.expected, vector.id);
  });

  test("the reference signer matches the Standard Webhooks interoperability example", () => {
    const example = { id: "msg_p5jXN8AQM9LWM0D4loKWxJek", timestamp: "1614265330", payload: "{\"test\": 2432232314}",
      secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw" };
    assert.equal(sign(example), "g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=");
    const headers = { "webhook-id": example.id, "webhook-timestamp": example.timestamp,
      "webhook-signature": `v1,${sign(example)}` };
    assert.deepEqual(verify({ payload: example.payload, headers, secrets: [example.secret], nowSeconds: 1614265330, toleranceSeconds: 300 }),
      { valid: true, code: null });
  });

  test("every valid vector becomes invalid when its payload, secret or clock changes", () => {
    const valid = [...spec.vectors.values()].filter(vector => vector.expected.valid);
    assert.ok(valid.length >= 3);
    for (const vector of valid) {
      assert.deepEqual(verify({ ...vector, payload: `${vector.payload} ` }), { valid: false, code: "WEBHOOK_SIGNATURE_INVALID" }, vector.id);
      assert.deepEqual(verify({ ...vector, secrets: ["whsec_dW5yZWxhdGVkLWZpeHR1cmUta2V5"] }),
        { valid: false, code: "WEBHOOK_SIGNATURE_INVALID" }, vector.id);
      const [, timestamp] = Object.entries(vector.headers).find(([name]) => name.toLowerCase() === "webhook-timestamp");
      assert.deepEqual(verify({ ...vector, nowSeconds: Number(timestamp) + vector.toleranceSeconds + 1 }),
        { valid: false, code: "WEBHOOK_TIMESTAMP_EXPIRED" }, vector.id);
      assert.deepEqual(verify({ ...vector, nowSeconds: Number(timestamp) - vector.toleranceSeconds - 1 }),
        { valid: false, code: "WEBHOOK_TIMESTAMP_FUTURE" }, vector.id);
    }
  });

  test("cover valid, wrong-secret, expired, multiple-secret and every failure code", () => {
    const vectors = [...spec.vectors.values()];
    for (const id of ["valid-single-secret", "wrong-secret", "expired-timestamp", "rotation-new-secret", "rotation-old-secret",
      "multiple-secrets-none-match"]) assert.ok(spec.vectors.has(id), `missing vector ${id}`);
    assert.ok(vectors.some(vector => vector.expected.valid && vector.secrets.length > 1), "no valid multiple-secret vector");
    assert.ok(vectors.some(vector => !vector.expected.valid && vector.secrets.length > 1), "no invalid multiple-secret vector");
    const codes = new Set(vectors.map(vector => vector.expected.code));
    assert.deepEqual(WEBHOOK_CODES.filter(code => !codes.has(code)), []);
  });
});
