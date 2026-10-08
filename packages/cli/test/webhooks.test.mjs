import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { full, reply } from "../../../test/graphql-fixtures.mjs";
import {
  MANAGEMENT_URL, PORTAL_TOKEN, accepted, assertNoSecrets, assertUsage, fakeAuthority, problem, sandbox,
} from "./helpers.mjs";

const run = (cli, argv, authority, options = {}) => cli(argv, { env: authority.env, fetch: authority.fetch, ...options });
const delivery = (fields = {}) => full("WebhookDelivery", { effectId: randomUUID(), eventId: randomUUID(), state: "pending",
  attempts: "0", nextAttemptAt: "2026-10-08T12:00:05.000Z", eventType: "message.created",
  createdAt: "2026-10-08T12:00:00.000Z", ...fields });
const page = (items, fields = {}) => full("WebhookDeliveryPage", { items, complete: true, refreshRequired: false, ...fields });
const endpoint = (fields = {}) => full("WebhookEndpoint", { endpointId: randomUUID(), url: "https://hooks.example.com/convohop",
  eventTypes: ["message.created"], enabled: true, status: "healthy", revision: "2", secretVersion: "1",
  rotationPending: false, consecutiveFailures: 0, ...fields });
const lines = text => text.trimEnd().split("\n").map(line => JSON.parse(line));

test("webhooks list and webhooks deliveries print the authority's pages", async t => {
  const { cli } = await sandbox(t);
  const endpoints = full("WebhookEndpointPage", { items: [endpoint()], complete: true, refreshRequired: false });
  const deliveries = page([delivery({ state: "delivered", attempts: "1", lastHttpStatus: 204, lastLatencyMs: 87 })]);
  const authority = fakeAuthority({
    ManagementWebhookEndpoints: request => reply(request, { result: endpoints }),
    ManagementWebhookDeliveries: request => reply(request, { result: deliveries }),
  });
  const { projectId } = authority, { endpointId } = endpoints.items[0];
  const list = await run(cli, ["webhooks", "list", "--project", projectId], authority);
  assert.equal(list.code, 0, list.stderr);
  assert.equal(list.stderr, "");
  assert.deepEqual(JSON.parse(list.stdout), endpoints);
  const shown = await run(cli, ["webhooks", "deliveries", "--project", projectId, "--endpoint", endpointId.toUpperCase()],
    authority);
  assert.equal(shown.code, 0, shown.stderr);
  assert.deepEqual(JSON.parse(shown.stdout), deliveries);

  assert.deepEqual(authority.requests.map(request => [request.operationName, request.variables.input]), [
    ["ManagementWebhookEndpoints", { projectId }], ["ManagementWebhookDeliveries", { projectId, endpointId }]]);
  for (const request of authority.requests) {
    assert.equal(request.url, `${MANAGEMENT_URL}/graphql`);
    assert.equal(request.authorization, `Bearer ${PORTAL_TOKEN}`);
  }
  assertNoSecrets(list, PORTAL_TOKEN);
  assertNoSecrets(shown, PORTAL_TOKEN);
  assertUsage(await cli(["webhooks", "deliveries", "--project", projectId]), "--endpoint is required", "webhooks deliveries");
});

test("webhooks tail prints new and changed deliveries as JSON lines, and warns once about partial pages", async t => {
  const { cli } = await sandbox(t);
  const first = delivery(), second = delivery(), third = delivery();
  const retrying = { ...first, state: "retrying", attempts: "1", lastOutcome: "httpError", lastHttpStatus: 500 };
  const pages = [
    page([first, second], { complete: false, partialReason: "sampled" }),
    page([retrying, second], { complete: false, partialReason: "sampled" }),
    page([second, third, first]),
  ];
  const authority = fakeAuthority({ ManagementWebhookDeliveries: request => reply(request, { result: pages.shift() }) });
  const endpointId = randomUUID();
  const result = await run(cli, ["webhooks", "tail", "--project", authority.projectId, "--endpoint", endpointId,
    "--interval", "2", "--polls", "3"], authority);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "warning: the authority returned part of the deliveries (sampled)\n");
  assert.deepEqual(lines(result.stdout), [
    { change: "new", delivery: first }, { change: "new", delivery: second },
    { change: "changed", delivery: retrying },
    { change: "new", delivery: third }, { change: "changed", delivery: first },
  ]);
  assert.deepEqual(result.waits, [2000, 2000]);
  assert.equal(pages.length, 0);
  assert.equal(new Set(authority.requests.map(request => request.variables.context.requestId)).size, 3);
  for (const request of authority.requests)
    assert.deepEqual(request.variables.input, { projectId: authority.projectId, endpointId });
});

test("Ctrl-C ends webhooks tail normally; a failed poll or a missing page ends it with an error", async t => {
  const { cli } = await sandbox(t);
  const shown = delivery();
  const answers = [];
  const authority = fakeAuthority({ ManagementWebhookDeliveries: request => answers.shift()(request) });
  const tail = ["webhooks", "tail", "--project", authority.projectId, "--endpoint", randomUUID()];

  answers.push(request => reply(request, { result: page([shown], { complete: false }) }));
  const controller = new AbortController();
  const stopped = await run(cli, tail, authority, { signal: controller.signal, sleep: async () => controller.abort() });
  assert.equal(stopped.code, 0, stopped.stderr);
  assert.equal(stopped.stderr, "warning: the authority returned part of the deliveries\n");
  assert.deepEqual(lines(stopped.stdout), [{ change: "new", delivery: shown }]);

  answers.push(request => reply(request, { result: page([shown]) }),
    request => problem(request, "FORBIDDEN", 403, "The token can't read this endpoint"));
  const failed = await run(cli, tail, authority);
  assert.equal(failed.code, 1);
  assert.deepEqual(lines(failed.stdout), [{ change: "new", delivery: shown }]);
  assert.deepEqual(failed.waits, [5000]);
  const { requestId } = authority.requests.at(-1).variables.context;
  assert.equal(failed.stderr, `convohop: FORBIDDEN: The token can't read this endpoint\n  outcome: rejected\n  requestId: ${requestId}\n`);

  answers.push(request => reply(request, { result: null }));
  const empty = await run(cli, tail, authority);
  assert.equal(empty.code, 1);
  assert.equal(empty.stdout, "");
  assert.equal(empty.stderr, "convohop: The authority returned no deliveries page\n");
  assert.equal(answers.length, 0);
});

test("webhooks tail checks its options before it polls", async t => {
  const { cli } = await sandbox(t);
  const tail = ["webhooks", "tail", "--project", randomUUID(), "--endpoint", randomUUID()];
  for (const [extra, message] of [
    [["--interval", "0"], "--interval must be a whole number from 1 to 300"],
    [["--interval", "301"], "--interval must be a whole number from 1 to 300"],
    [["--interval", "1.5"], "--interval must be a whole number from 1 to 300"],
    [["--interval", "-1"], "--interval must be a whole number from 1 to 300"],
    [["--polls", "0"], "--polls must be a whole number from 1 to 1000000"],
    [["--polls", "1e3"], "--polls must be a whole number from 1 to 1000000"],
  ]) assertUsage(await cli([...tail, ...extra]), message, "webhooks tail");
  assertUsage(await cli(tail.slice(0, 4)), "--endpoint is required", "webhooks tail");
  assertUsage(await cli(["webhooks", "tail", "--endpoint", randomUUID()]), "--project is required", "webhooks tail");
});

test("webhooks replay redelivers one delivery or a time range, never every delivery by accident", async t => {
  const { cli } = await sandbox(t);
  const operationId = randomUUID(), endpointId = randomUUID(), effectId = randomUUID();
  const authority = fakeAuthority({
    ManagementReplayWebhookDeliveries: request => request.variables.input.effectId
      ? reply(request, { result: full("OperationResult", { endpointId, replayedDeliveries: 1, skippedDeliveries: 0 }) })
      : accepted(request, operationId),
  });
  const { projectId } = authority;
  const replay = ["webhooks", "replay", "--project", projectId, "--endpoint", endpointId];
  const since = "2026-10-08T00:00:00Z", until = "2026-10-08T12:00:00Z";

  const one = await run(cli, [...replay, "--effect", effectId.toUpperCase()], authority);
  assert.equal(one.code, 0, one.stderr);
  assert.equal(one.stderr, "");
  const output = JSON.parse(one.stdout);
  assert.equal(output.kind, "reply");
  assert.equal(output.payload.status, "committed");
  assert.equal(output.payload.result.replayedDeliveries, 1);
  const range = await run(cli, [...replay, "--since", since, "--until", until], authority);
  assert.equal(range.code, 0, range.stderr);
  assert.equal(range.stderr, `Follow it with convohop operation get --operation ${operationId}\n`);
  assert.equal(JSON.parse(range.stdout).payload.status, "accepted");
  assert.equal((await run(cli, [...replay, "--until", until], authority)).code, 0);

  assert.deepEqual(authority.requests.map(request => request.variables.input), [
    { projectId, endpointId, effectId }, { projectId, endpointId, since, until }, { projectId, endpointId, until }]);
  assert.equal(new Set(authority.requests.map(request => request.variables.context.requestId)).size, 3);
  assertNoSecrets(one, PORTAL_TOKEN);

  for (const [extra, message] of [
    [[], "Set --effect, --since or --until"],
    [["--effect", effectId, "--since", since], "--effect redelivers one delivery; don't combine it with --since or --until"],
    [["--effect", effectId, "--until", until], "--effect redelivers one delivery; don't combine it with --since or --until"],
    [["--effect", "delivery-1"], "--effect must be a UUID"],
  ]) assertUsage(await cli([...replay, ...extra]), message, "webhooks replay");
  assertUsage(await cli(["webhooks", "replay", "--endpoint", endpointId, "--effect", effectId]), "--project is required",
    "webhooks replay");
});

test("a rejected replay reports the authority's problem and sends nothing else", async t => {
  const { cli } = await sandbox(t);
  const authority = fakeAuthority({
    ManagementReplayWebhookDeliveries: request => problem(request, "NOT_FOUND", 404, "The delivery doesn't exist"),
  });
  const result = await run(cli, ["webhooks", "replay", "--project", authority.projectId, "--endpoint", randomUUID(),
    "--effect", randomUUID()], authority);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.deepEqual(authority.names(), ["ManagementReplayWebhookDeliveries"]);
  const { requestId } = authority.requests[0].variables.context;
  assert.equal(result.stderr, `convohop: NOT_FOUND: The delivery doesn't exist\n  outcome: rejected\n  requestId: ${requestId}\n`);
});
