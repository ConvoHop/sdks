// Unit tests for the runner's building blocks: matchers, interpolation, static scenario checks,
// target descriptors, redaction, reports and the JSON Schema subset.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { event } from "../../test/graphql-fixtures.mjs";
import { parseCommand } from "../lib/driver-client.mjs";
import { collectSecrets, redact } from "../lib/engine.mjs";
import { InterpolationError, MissingValue, Scope, checkReference, references } from "../lib/interpolate.mjs";
import { SchemaError, compileSchema, formatErrors } from "../lib/json-schema.mjs";
import { match, validateMatcher } from "../lib/matchers.mjs";
import { failureText, junit, markdown, totals, writeReports } from "../lib/report.mjs";
import { ScenarioError, analyzeScenario, loadSuites, selected } from "../lib/scenarios.mjs";
import { loadSpec } from "../lib/spec.mjs";
import { TargetError, checkDescriptor, openTarget, substituteEnvironment } from "../lib/target.mjs";

const BEYOND_SAFE = "9007199254740993";
const CONVERSATION = "4f7f2c1e-3c5b-4b8e-9f0a-1d2e3f4a5b6c";
const ok = (actual, pattern) => assert.deepEqual(match(actual, pattern), [], `${JSON.stringify(actual)} should match`);
const mismatch = (actual, pattern, text) => {
  const failures = match(actual, pattern);
  assert.equal(failures.length, 1, `expected one mismatch, got ${JSON.stringify(failures)}`);
  assert.match(failures[0], text);
};

let spec, temp;
before(async () => {
  spec = await loadSpec();
  temp = await mkdtemp(join(tmpdir(), "convohop-conformance-lib-"));
});
after(() => rm(temp, { recursive: true, force: true }));

describe("matchers", () => {
  test("compare counters as integers, never as JavaScript numbers", () => {
    ok(BEYOND_SAFE, { $gte: "9007199254740992", $lte: BEYOND_SAFE });
    mismatch("9007199254740992", { $gte: BEYOND_SAFE }, /expected >= "9007199254740993"/);
    mismatch(BEYOND_SAFE, { $lte: "9007199254740992" }, /expected <= "9007199254740992"/);
    mismatch(BEYOND_SAFE, { $gte: 1 }, /comparable/);
    mismatch(9, { $gte: "1" }, /comparable/);
    ok(3, { $gte: 2.5, $lte: 3 });
  });

  test("counter, uuid and timestamp types", () => {
    ok("0", { $type: "counter" });
    ok("9223372036854775807", { $type: "counter" });
    for (const value of ["9223372036854775808", "01", "-1", "1.0", 1, ""]) mismatch(value, { $type: "counter" }, /expected type counter/);
    ok(CONVERSATION, { $type: "uuid" });
    for (const value of [CONVERSATION.toUpperCase(), "00000000-0000-0000-0000-000000000000", `${CONVERSATION}0`])
      mismatch(value, { $type: "uuid" }, /expected type uuid/);
    for (const value of ["2026-01-01T00:00:00Z", "2026-01-01T00:00:00.1Z", "2026-01-01T00:00:00.123456789+05:30"])
      ok(value, { $type: "timestamp" });
    for (const value of ["2026-01-01 00:00:00Z", "2026-01-01T00:00:00", "2026-13-01T00:00:00Z", "2026-01-01T00:00:00.1234567890Z"])
      mismatch(value, { $type: "timestamp" }, /expected type timestamp/);
    ok(null, { $type: ["string", "null"] });
    mismatch(1.5, { $type: "integer" }, /expected type integer/);
  });

  test("$sequences requires each sequence exactly once in order, beyond the safe-integer range", () => {
    const events = sequences => sequences.map(sequence => event(CONVERSATION, sequence));
    const range = { $sequences: { from: BEYOND_SAFE, to: "9007199254740995" } };
    ok(events([BEYOND_SAFE, "9007199254740994", "9007199254740995"]), range);
    mismatch(events([BEYOND_SAFE, "9007199254740995"]), range, /exactly once in order but got \[9007199254740993,9007199254740995\]/);
    mismatch(events([BEYOND_SAFE, BEYOND_SAFE, "9007199254740994", "9007199254740995"]), range, /exactly once/);
    mismatch(events(["9007199254740994", BEYOND_SAFE, "9007199254740995"]), range, /exactly once/);
    mismatch([{ sequence: 1 }], { $sequences: { from: "1", to: "1" } }, /counter sequences/);
  });

  test("objects match as subsets, arrays by exact length and plain values strictly", () => {
    ok({ a: 1, b: { c: "x", d: true } }, { b: { c: "x" } });
    mismatch({ a: 1 }, { b: 1 }, /^at \/b: .*the property is missing/);
    mismatch([1, 2], [1], /expected 1 items but got 2/);
    mismatch({ list: ["1"] }, { list: [1] }, /^at \/list\/0: expected 1 but got "1"/);
    mismatch({ "a/b~": 2 }, { "a/b~": 1 }, /^at \/a~1b~0:/);
  });

  test("collection and logic operators", () => {
    ok([{ code: "A" }, { code: "B" }], { $contains: { code: "B" }, $length: 2, $each: { code: { $type: "string" } } });
    mismatch([{ code: "A" }], { $contains: { code: "B" } }, /none matched/);
    mismatch([{ code: "A" }, { code: 2 }], { $each: { code: { $type: "string" } } }, /^at \/1\/code: expected type string/);
    ok("😀x", { $length: 2 });
    mismatch("abc", { $length: { $lte: 2 } }, /^at #length: expected <= 2/);
    ok("RATE_LIMITED", { $anyOf: ["UNAVAILABLE", "RATE_LIMITED"] });
    mismatch("NOPE", { $anyOf: [{ $type: "integer" }, "YES"] }, /any of 2 alternatives to match; closest: at \/: expected type integer/);
    ok({ a: 1 }, { $ne: { a: 2 } });
    mismatch({ a: 1, b: 2 }, { $eq: { a: 1 } }, /expected exactly/);
    ok({ a: [1, { b: null }] }, { $eq: { a: [1, { b: null }] } });
  });

  test("validateMatcher reports malformed patterns with JSON pointers", () => {
    assert.deepEqual(validateMatcher({ list: [{ $type: "uuid" }], range: { $sequences: { from: "${saved.a.b}", to: "5" } },
      at: { $gte: "${saved.a.c}" } }), []);
    assert.deepEqual(validateMatcher({ "a/b": { $type: "uuidish" } }), ["/a~1b/$type: must name one or more of " +
      "string, number, integer, boolean, null, object, array, uuid, counter, timestamp"]);
    assert.deepEqual(validateMatcher({ $type: "string", code: "A" }),
      ["/code: unknown matcher operator (mixing fields and operators is not allowed)"]);
    assert.deepEqual(validateMatcher({ $sequences: { from: "3", to: "1" } }), ["/$sequences: from must not exceed to"]);
    assert.deepEqual(validateMatcher({ $sequences: { from: 1, to: "2" } }), ["/$sequences: must be {\"from\": counter, \"to\": counter}"]);
    assert.deepEqual(validateMatcher({ $gte: "01" }), ["/$gte: must be a number or a canonical counter string"]);
    assert.deepEqual(validateMatcher({ $anyOf: [] }), ["/$anyOf: must be a non-empty array of matchers"]);
    assert.deepEqual(validateMatcher({ $each: { $bogus: 1 } }),
      ["/$each/$bogus: unknown matcher operator (mixing fields and operators is not allowed)"]);
  });
});

describe("interpolation", () => {
  test("a whole reference yields a copy of the raw value; embedded references must be primitives", () => {
    const scope = new Scope({ name: "t" });
    scope.saved.set("page", { items: [{ id: "a", count: 2 }, { id: "b" }] });
    const items = scope.interpolate("${saved.page.items}");
    assert.deepEqual(items, [{ id: "a", count: 2 }, { id: "b" }]);
    items[0].id = "changed";
    assert.equal(scope.interpolate("${saved.page.items.0.id}"), "a");
    assert.equal(scope.interpolate("${saved.page.items.0.count}"), 2);
    assert.equal(scope.interpolate("${saved.page.items.1.id}-${saved.page.items.0.count}"), "b-2");
    assert.throws(() => scope.interpolate("x${saved.page.items}"), { name: "InterpolationError", message: /is not a primitive/ });
    assert.throws(() => scope.interpolate("${saved.page.items.01.id}"), { name: "InterpolationError", message: /has no items\.01\.id/ });
    assert.throws(() => scope.interpolate("${saved.other}"), { name: "InterpolationError", message: /nothing was saved as other/ });
    assert.deepEqual(scope.interpolate({ "${nonce}": ["${target.name}", 1, true, null] }), { "${nonce}": ["t", 1, true, null] });
  });

  test("nonce and labelled uuids are stable within a scope and fresh across scopes", () => {
    const first = new Scope({}), second = new Scope({});
    assert.match(first.interpolate("${nonce}"), /^[0-9a-f]{16}$/);
    assert.equal(first.interpolate("alice-${nonce}"), `alice-${first.interpolate("${nonce}")}`);
    assert.notEqual(first.interpolate("${nonce}"), second.interpolate("${nonce}"));
    const device = first.interpolate("${uuid.device}");
    assert.match(device, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(first.interpolate("${uuid.device}"), device);
    assert.notEqual(first.interpolate("${uuid.other}"), device);
    assert.notEqual(second.interpolate("${uuid.device}"), device);
  });

  test("clock offsets use the injected clock", () => {
    const scope = new Scope({}, { now: () => Date.UTC(2026, 0, 1) });
    assert.equal(scope.interpolate("${clock.isoPlusMs.-1500}"), "2025-12-31T23:59:58.500Z");
    assert.equal(scope.interpolate("${clock.isoPlusMs.60000}"), "2026-01-01T00:01:00.000Z");
  });

  test("absent target values skip instead of failing", () => {
    const scope = new Scope({ credentials: { backend: "k" } });
    assert.throws(() => scope.interpolate("${target.credentials.management}"),
      error => error instanceof MissingValue && error.path === "credentials.management");
    assert.throws(() => scope.interpolate("${bogus}"), InterpolationError);
  });

  test("references and their static checks", () => {
    assert.deepEqual(references({ "${key}": ["a ${nonce} ${uuid.x}", { deep: "${saved.y.z}" }], n: 1 }), ["nonce", "uuid.x", "saved.y.z"]);
    for (const reference of ["nonce", "uuid.a", "target.credentials.backend", "saved.x.0.y", "clock.isoPlusMs.-5", "clock.isoPlusMs.0"])
      assert.equal(checkReference(reference), undefined, reference);
    const problems = {
      env: /unknown root "env"/, "nonce.x": /nonce takes no path/, uuid: /use uuid.<label>/, "uuid.a.b": /use uuid.<label>/,
      target: /target needs a path/, saved: /saved needs a path/, "saved.a..b": /empty or invalid path segment/,
      "saved.a b": /empty or invalid path segment/, "clock.isoPlusMs.1e3": /clock.isoPlusMs/, "clock.isoPlusMs.1234567890123": /clock.isoPlusMs/,
      "clock.now": /clock.isoPlusMs/,
    };
    for (const [reference, problem] of Object.entries(problems)) assert.match(checkReference(reference) ?? "", problem, reference);
  });
});

describe("static scenario checks", () => {
  const analyze = steps => analyzeScenario({ id: "probe.case", title: "Probe", covers: ["crud"], steps },
    { catalog: spec.catalog, vectors: spec.vectors });

  test("derive roles, operations, features, capabilities and target fields", () => {
    const { problems, requirements } = analyzeScenario({ id: "probe.case", title: "Probe", covers: ["crud"],
      requires: { capabilities: ["auth.shortSessionTtl"] }, steps: [
        { do: "client.create", client: "b", role: "backend", credential: "${target.credentials.backend}" },
        { do: "invoke", client: "b", operation: "principals.create", args: { externalUserId: "x" }, save: "p", requires: ["retryAfter"] },
        { do: "client.create", client: "u", role: "user", credential: "t", principalId: "${saved.p.principalId}", storage: "s" },
        { do: "realtime.subscribe", client: "u", subscription: "feed", conversationId: "c", requires: ["realtime.reconnectPolicy"] },
        { do: "realtime.collect", subscription: "feed", until: { count: 1 } },
        { do: "client.create", client: "m", role: "management", credential: "${target.credentials.management}" },
        { do: "control.fault", field: "sendMessage", action: "dropAfterCommit" },
        { do: "webhooks.verify", vector: "valid-single-secret" },
      ] }, { catalog: spec.catalog, vectors: spec.vectors });
    assert.deepEqual(problems, []);
    assert.deepEqual([...requirements.roles], ["backend", "user", "management"]);
    assert.deepEqual([...requirements.operations], ["backend:principals.create"]);
    assert.deepEqual([...requirements.features].sort(), ["backend:retryAfter", "primary:webhooks.verify", "user:realtime",
      "user:realtime.reconnectPolicy", "user:recovery.storage"]);
    assert.deepEqual([...requirements.capabilities].sort(), ["auth.shortSessionTtl", "control.fault"]);
    assert.deepEqual([...requirements.targetFields].sort(), ["credentials.backend", "credentials.management", "managementActorId", "managementUrl"]);
  });

  test("report each misuse with its step", () => {
    const { problems } = analyze([
      { do: "invoke", client: "ghost", operation: "conversations.get", args: { conversationId: "c" } },
      { do: "client.create", client: "b", role: "backend", credential: "k", principalId: "p" },
      { do: "client.create", client: "b", role: "backend", credential: "k" },
      { do: "client.create", client: "u", role: "user", credential: "k" },
      { do: "client.create", client: "m", role: "management", credential: "k", projectId: "p", baseUrl: "http://x" },
      { do: "client.create", client: "a", role: "user", credential: "k", principalId: "p", actorId: "x" },
      { do: "invoke", client: "b", operation: "messages.fly", save: "x" },
      { do: "invoke", client: "b", operation: "messages.send", args: { conversationId: "c", colour: "red" }, save: "x" },
      { do: "invoke", client: "b", operation: "principals.create", args: { externalUserId: "${saved.nothing.id}" },
        expect: { value: { $type: "uuidish" } } },
      { do: "realtime.subscribe", client: "b", subscription: "feed", conversationId: "c" },
      { do: "realtime.collect", subscription: "missing" },
      { do: "webhooks.verify", vector: "no-such-vector" },
      { do: "invoke", client: "u", operation: "events.list", args: { conversationId: "${env.HOME}" } },
      { do: "invoke", client: "b", operation: "events.list", args: { conversationId: "c" } },
      { do: "invoke", client: "b", operation: "messages.send", args: { conversationId: "c", text: "t", requestId: "r" }, repeat: 2 },
    ]);
    const expected = [
      /^probe\.case step 1 \(invoke\): client ghost is not open$/,
      /step 2 \(client\.create\): backend clients do not take principalId$/,
      /step 3 \(client\.create\): client b is already open$/,
      /step 4 \(client\.create\): user clients need principalId$/,
      /step 5 \(client\.create\): management clients do not take projectId$/,
      /step 6 \(client\.create\): only management clients take actorId$/,
      /step 7 \(invoke\): unknown operation messages\.fly; see spec\/conformance\/operations\.json$/,
      /step 8 \(invoke\): messages\.send has no argument colour$/,
      /step 8 \(invoke\): messages\.send needs argument text$/,
      /step 8 \(invoke\): save name x is already used$/,
      /step 9 \(invoke\): \$\{saved\.nothing\.id\} reads nothing, which no earlier step saves$/,
      /step 9 \(invoke\): expect\.value: \/\$type: must name one or more of/,
      /step 10 \(realtime\.subscribe\): only user clients subscribe$/,
      /step 11 \(realtime\.collect\): subscription missing is not open$/,
      /step 12 \(webhooks\.verify\): unknown webhook vector no-such-vector/,
      /step 13 \(invoke\): \$\{env\.HOME\} uses unknown root "env"/,
      /step 14 \(invoke\): events\.list is not available to backend clients$/,
      /step 15 \(invoke\): a repeated invoke must not fix args\.requestId, because each call is a new request$/,
    ];
    assert.equal(problems.length, expected.length, problems.join("\n"));
    expected.forEach((pattern, index) => assert.match(problems[index], pattern));
  });

  test("closing a client closes its subscriptions", () => {
    const { problems } = analyze([
      { do: "client.create", client: "u", role: "user", credential: "k", principalId: "p" },
      { do: "realtime.subscribe", client: "u", subscription: "feed", conversationId: "c" },
      { do: "client.close", client: "u" },
      { do: "realtime.close", subscription: "feed" },
    ]);
    assert.deepEqual(problems, ["probe.case step 4 (realtime.close): subscription feed is not open"]);
  });

  test("filters select ids, id prefixes and wildcards with literal punctuation", () => {
    assert.ok(selected("crud.messages.edit", []));
    assert.ok(selected("crud.messages.edit", ["crud"]));
    assert.ok(selected("crud.messages.edit", ["crud.messages.edit"]));
    assert.ok(!selected("crudx.messages", ["crud"]));
    assert.ok(!selected("crud.messages.edit", ["crud.messages.ed"]));
    assert.ok(selected("crud.messages.edit", ["*.edit"]));
    assert.ok(selected("crud.messages.edit", ["nope", "crud.*.edit"]));
    assert.ok(!selected("crudXmessages", ["crud.*"]));
    assert.ok(selected("a(b+c", ["a(b+*"]));
    assert.ok(!selected("aab", ["a+*"]));
  });

  test("loadSuites rejects unreadable, malformed and inconsistent suite files with every problem listed", async () => {
    const options = { validate: spec.validators.scenario, catalog: spec.catalog, vectors: spec.vectors };
    const suite = (name, scenarios) => JSON.stringify({ suite: name, title: name, scenarios });
    const scenario = id => ({ id, title: id, covers: ["crud"], steps: [{ do: "sleep", ms: 0 }] });
    await assert.rejects(loadSuites(join(temp, "missing"), options), { name: "ScenarioError", message: /cannot read/ });
    const empty = join(temp, "empty");
    await mkdir(empty);
    await assert.rejects(loadSuites(empty, options), /contains no \*\.json scenario files/);

    const broken = join(temp, "broken");
    await mkdir(broken);
    await writeFile(join(broken, "alpha.json"), suite("alpha", [scenario("alpha.one"), scenario("beta.two")]));
    await writeFile(join(broken, "beta.json"), suite("gamma", [scenario("alpha.one")]));
    await writeFile(join(broken, "delta.json"), "{ not json");
    await writeFile(join(broken, "epsilon.json"), JSON.stringify({ suite: "epsilon", title: "e", scenarios: [] }));
    await writeFile(join(broken, "notes.txt"), "ignored");
    const error = await loadSuites(broken, options).then(() => assert.fail("expected ScenarioError"), failure => failure);
    assert.ok(error instanceof ScenarioError);
    const expected = [
      /^alpha\.json: scenario id beta\.two must start with "alpha\."$/,
      /^beta\.json: suite must be "beta" to match the file name$/,
      /^beta\.json: scenario id alpha\.one must start with "gamma\."$/,
      /^beta\.json: scenario id alpha\.one is already defined in alpha\.json$/,
      /delta\.json is not valid JSON/,
      /^epsilon\.json: \/scenarios must have at least 1 items$/,
    ];
    assert.equal(error.problems.length, expected.length, error.problems.join("\n"));
    expected.forEach((pattern, index) => assert.match(error.problems[index], pattern));
  });
});

describe("targets", () => {
  const DEV_STACK = new URL("../targets/dev-stack.json", import.meta.url).pathname;
  const uuid = digit => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
  const REQUIRED_ENV = { CONVOHOP_DEV_COMMUNICATION_URL: "https://dev-stack.example.test", CONVOHOP_DEV_PROJECT_ID: uuid("a"),
    CONVOHOP_DEV_INCARNATION: uuid("b") };

  test("environment placeholders substitute, and unset or empty ones remove their property or element", () => {
    const value = { a: "${env:A}", b: "x-${env:B}-${env:A}", list: ["${env:A}", "${env:MISSING}", "plain"], nested: { gone: "${env:EMPTY}" },
      n: 1, flag: false, nothing: null };
    assert.deepEqual(substituteEnvironment(value, { A: "1", B: "2", EMPTY: "" }),
      { a: "1", b: "x-2-1", list: ["1", "plain"], nested: {}, n: 1, flag: false, nothing: null });
    assert.equal(substituteEnvironment("${env:MISSING}", {}), undefined);
    assert.equal(substituteEnvironment("$env:A {env:A}", { A: "1" }), "$env:A {env:A}");
  });

  test("descriptors must validate and declare a control URL for control capabilities", () => {
    const descriptor = { name: "local", communicationUrl: "http://127.0.0.1:8080", projectId: uuid("a"), incarnation: uuid("b") };
    assert.equal(checkDescriptor(descriptor, spec.validators.target), descriptor);
    assert.throws(() => checkDescriptor({ ...descriptor, capabilities: ["control.fault", "control.reset"] }, spec.validators.target),
      { name: "TargetError", message: "target declares control.fault, control.reset but no control URL" });
    for (const invalid of [{ projectId: uuid("a").toUpperCase() }, { communicationUrl: "http://host/graphql?x=1" },
      { credentials: { Backend: "k" } }, { credentials: { backend: "" } }, { capabilities: ["control.teleport"] }, { extra: true }])
      assert.throws(() => checkDescriptor({ ...descriptor, ...invalid }, spec.validators.target), /^TargetError: target descriptor is invalid: /);
  });

  test("the dev-stack descriptor resolves from the environment", async () => {
    const full = { ...REQUIRED_ENV, CONVOHOP_DEV_MANAGEMENT_URL: "https://dev-stack.example.test/management",
      CONVOHOP_DEV_MANAGEMENT_ACTOR_ID: uuid("c"), CONVOHOP_DEV_BACKEND_KEY: "backend-fixture", CONVOHOP_DEV_BACKEND_KEY_LIMITED: "limited-fixture",
      CONVOHOP_DEV_BACKEND_KEY_EXPIRED: "expired-fixture", CONVOHOP_DEV_MANAGEMENT_TOKEN: "management-fixture",
      CONVOHOP_DEV_CONTROL_URL: "http://127.0.0.1:9000/__conformance" };
    const target = await openTarget(DEV_STACK, { validate: spec.validators.target, environment: full });
    assert.equal(target.kind, "file");
    assert.ok(Object.isFrozen(target.descriptor));
    assert.equal(target.descriptor.$schema, undefined);
    assert.deepEqual({ ...target.descriptor, description: undefined }, { description: undefined, name: "dev-stack",
      communicationUrl: full.CONVOHOP_DEV_COMMUNICATION_URL, managementUrl: full.CONVOHOP_DEV_MANAGEMENT_URL, projectId: uuid("a"),
      incarnation: uuid("b"), managementActorId: uuid("c"), credentials: { backend: "backend-fixture", backendLimited: "limited-fixture",
        backendExpired: "expired-fixture", management: "management-fixture" }, control: full.CONVOHOP_DEV_CONTROL_URL, capabilities: [] });
    await target.close();

    const partial = await openTarget(DEV_STACK, { validate: spec.validators.target, environment: REQUIRED_ENV });
    assert.deepEqual(Object.keys(partial.descriptor).sort(),
      ["capabilities", "communicationUrl", "credentials", "description", "incarnation", "name", "projectId"]);
    assert.deepEqual(partial.descriptor.credentials, {});

    await assert.rejects(openTarget(DEV_STACK, { validate: spec.validators.target, environment: {} }),
      { name: "TargetError", message: /^target descriptor is invalid: .*communicationUrl/ });
    await assert.rejects(openTarget("missing-target.json", { validate: spec.validators.target, environment: {}, cwd: temp }),
      { name: "TargetError", message: /^cannot read target missing-target\.json: / });
  });
});

describe("redaction", () => {
  test("collects bearer material under secret keys anywhere in a saved value", () => {
    const session = "mock-session.0123456789", connect = "connect-token-abcdef";
    const secrets = collectSecrets({ sessionToken: session, nested: { list: [{ connectToken: connect }] }, token: "short",
      principalId: "not-a-secret-but-long", credential: 12345678 });
    assert.deepEqual([...secrets].sort(), [connect, session]);
  });

  test("replaces the longest secrets first and ignores short ones", () => {
    const secrets = new Set(["abcdefgh", "abcdefgh-ijklmnop", "abc"]);
    assert.equal(redact("got abcdefgh-ijklmnop and abcdefgh, abc", secrets), "got [redacted] and [redacted], abc");
  });
});

describe("reports", () => {
  const longLine = `${"x".repeat(600)}`;
  const summary = {
    runner: { name: "runner", version: "0" },
    driver: { name: "probe", version: "1.0.0", language: "javascript", roles: ["user"], features: ["realtime"] },
    fixtureDriver: null, target: { kind: "mock", name: "mock", capabilities: ["control.reset"] },
    startedAt: "2026-01-01T00:00:00.000Z", durationMs: 1234,
    suites: [{ suite: "probe", title: "Probe", durationMs: 1000, scenarios: [
      { id: "probe.pass", title: "Passes", covers: ["crud"], status: "passed", durationMs: 10 },
      { id: "probe.skip", title: "Skips", covers: ["crud"], status: "skipped", durationMs: 0, reason: "needs a|b\nfeature" },
      { id: "probe.fail", title: "Fails <here>", covers: ["crud"], status: "failed", durationMs: 20,
        failure: { step: 3, do: "invoke", message: `bad <&"> value ]]> \u0001 end\nsecond line` } },
      { id: "probe.setup", title: "Setup", covers: ["crud"], status: "failed", durationMs: 1,
        failure: { step: null, do: null, message: longLine } },
    ] }],
  };

  test("totals and failure text", () => {
    assert.deepEqual(totals(summary.suites[0].scenarios), { scenarios: 4, passed: 1, failed: 2, skipped: 1 });
    assert.equal(failureText({ step: 2, do: "invoke", message: "m" }), "step 2 (invoke): m");
    assert.equal(failureText({ step: null, do: null, message: "m" }), "m");
  });

  test("JUnit escapes attributes, splits CDATA terminators and drops XML-invalid characters", () => {
    const xml = junit(summary);
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<testsuites name="ConvoHop conformance" tests="4" failures="2" errors="0" skipped="1" time="1\.234">/);
    assert.match(xml, /<testcase classname="conformance\.probe" name="probe\.pass" time="0\.010"\/>/);
    assert.match(xml, /<skipped message="needs a\|b&#10;feature"\/>/);
    assert.match(xml, /<failure message="step 3 \(invoke\): bad &lt;&amp;&quot;&gt; value \]\]&gt; \uFFFD end" type="invoke">/);
    assert.ok(xml.includes("<![CDATA[Fails <here>\nstep 3 (invoke): bad <&\"> value ]]]]><![CDATA[> \uFFFD end\nsecond line]]>"));
    assert.ok(!xml.includes("\u0001"));
    const setup = /<failure message="(x+)" type="scenario">/.exec(xml);
    assert.equal(setup?.[1].length, 500);
    assert.match(xml, /<property name="driver\.features" value="realtime"\/>/);
    assert.equal((xml.match(/<testcase /g) ?? []).length, 4);
  });

  test("Markdown escapes table cells", () => {
    const text = markdown(summary);
    assert.match(text, /\*\*1 passed, 2 failed, 1 skipped\*\* of 4 scenarios in 1\.234 s\./);
    assert.match(text, /\| probe \| 1 \| 2 \| 1 \|/);
    assert.match(text, /\| `probe\.skip` \| needs a\\\|b feature \|/);
    assert.match(text, /\| `probe\.fail` \| step 3 \(invoke\): bad <&"> value \]\]> \u0001 end second line \|/);
  });

  test("writeReports writes all three files and appends to the step summary", async () => {
    const directory = join(temp, "reports", "nested"), stepSummary = join(temp, "step-summary.md");
    const files = await writeReports(directory, summary, { stepSummary });
    await writeReports(directory, summary, { stepSummary });
    assert.deepEqual(JSON.parse(await readFile(files.summary, "utf8")), summary);
    assert.equal(await readFile(files.junit, "utf8"), junit(summary));
    assert.equal(await readFile(files.markdown, "utf8"), markdown(summary));
    assert.equal(await readFile(stepSummary, "utf8"), markdown(summary).repeat(2));
    await writeReports(join(temp, "reports", "quiet"), summary, { stepSummary: null });
    assert.equal(await readFile(stepSummary, "utf8"), markdown(summary).repeat(2));
  });
});

describe("driver command lines", () => {
  test("split on whitespace, group quotes and map node to this Node binary", () => {
    assert.deepEqual(parseCommand("node driver.mjs --name 'a b' \"c 'd'\"  e"), [process.execPath, "driver.mjs", "--name", "a b", "c 'd'", "e"]);
    assert.deepEqual(parseCommand("  python3 -m convohop_driver ''"), ["python3", "-m", "convohop_driver", ""]);
    assert.deepEqual(parseCommand("./node driver"), ["./node", "driver"]);
    assert.deepEqual(parseCommand("dotnet run --project=\"My Driver\""), ["dotnet", "run", "--project=My Driver"]);
    assert.throws(() => parseCommand("node 'driver.mjs"), /^Error: the command has an unterminated quote$/);
    assert.throws(() => parseCommand("   "), /^Error: the command is empty$/);
  });
});

describe("JSON Schema subset", () => {
  test("rejects keywords it does not implement instead of ignoring them", () => {
    assert.throws(() => compileSchema({ type: "string", format: "email" }), { name: "SchemaError", message: /Unsupported JSON Schema keyword format/ });
    assert.throws(() => compileSchema({ properties: { a: { $ref: "https://example.test/schema" } } }), /Unresolvable \$ref/);
    assert.throws(() => compileSchema({ $ref: "#/$defs/missing" }), SchemaError);
    assert.doesNotThrow(() => compileSchema({ title: "t", description: "d", $comment: "c", examples: [1], type: "integer" }));
  });

  test("validates the keywords the conformance schemas use", () => {
    const validate = compileSchema({
      type: "object", additionalProperties: false, required: ["name", "kind"],
      properties: {
        name: { type: "string", minLength: 2, maxLength: 3 },
        kind: { enum: ["a", "b"] },
        size: { type: "integer", minimum: 1, exclusiveMaximum: 10 },
        tags: { type: "array", uniqueItems: true, items: { type: "string" } },
        pick: { oneOf: [{ type: "string" }, { const: "both" }] },
      },
      if: { properties: { kind: { const: "b" } }, required: ["kind"] }, then: { required: ["size"] },
    });
    assert.deepEqual(validate({ name: "😀😀", kind: "a" }), []);
    assert.deepEqual(validate({ name: "abc", kind: "b", size: 9, tags: ["x", "y"], pick: "x" }), []);
    const errors = validate({ name: "a", kind: "b", tags: ["x", "x"], pick: "both", extra: 1 });
    assert.deepEqual(errors.map(error => error.path).sort(), ["", "/extra", "/name", "/pick", "/tags"]);
    assert.equal(formatErrors(errors, 2), "/name must have at least 2 characters; /tags must not contain duplicate items; ... 3 more");
    assert.equal(validate({ name: "abcd", kind: "c", size: 10 }).length, 3);
  });
});
