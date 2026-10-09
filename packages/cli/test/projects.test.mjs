import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { full, reply, resolution } from "../../../test/graphql-fixtures.mjs";
import {
  MANAGEMENT_URL, PORTAL_TOKEN, UUID, accepted, assertNoSecrets, assertUsage, fakeAuthority, problem, project, sandbox,
} from "./helpers.mjs";

const run = (cli, argv, authority, options = {}) => cli(argv, { env: authority.env, fetch: authority.fetch, ...options });
const operation = (operationId, fields = {}) => full("Operation", { operationId, kind: "createProject", state: "succeeded",
  revision: "3", requestedAt: "2026-10-08T12:00:00.000Z", updatedAt: "2026-10-08T12:01:00.000Z", steps: [], ...fields });

function assertManagementRequest(request, operationName, input) {
  assert.equal(request.url, `${MANAGEMENT_URL}/graphql`);
  assert.equal(request.authorization, `Bearer ${PORTAL_TOKEN}`);
  assert.equal(request.operationName, operationName);
  assert.deepEqual(request.variables.input, input);
  assert.deepEqual(Object.keys(request.variables.context), ["requestId"], "management requests name no project context");
  assert.match(request.variables.context.requestId, UUID);
}

test("projects get prints a project, sending only its ID with the portal token", async t => {
  const { cli } = await sandbox(t);
  let shown;
  const authority = fakeAuthority({
    ManagementGetProject: request =>
      reply(request, { result: shown = project(request.variables.input.projectId, randomUUID(), { name: "Chat" }) }),
  });
  const { projectId } = authority;
  const result = await run(cli, ["projects", "get", "--project", projectId.toUpperCase()], authority);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), shown);
  assert.equal(authority.requests.length, 1);
  assertManagementRequest(authority.requests[0], "ManagementGetProject", { projectId });
  assertNoSecrets(result, PORTAL_TOKEN);

  assertUsage(await cli(["projects", "get"]), "--project is required", "projects get");
  assertUsage(await cli(["projects", "get", "--project", "chat"]), "--project must be a UUID", "projects get");
});

test("projects get and operation get report what doesn't exist", async t => {
  const { cli } = await sandbox(t);
  const authority = fakeAuthority({
    ManagementGetProject: request => reply(request, { result: null }),
    ManagementGetOperation: request => reply(request, { result: null }),
  });
  const projectId = randomUUID(), operationId = randomUUID();
  const missingProject = await run(cli, ["projects", "get", "--project", projectId], authority);
  assert.equal(missingProject.code, 1);
  assert.equal(missingProject.stdout, "");
  assert.equal(missingProject.stderr, `convohop: NOT_FOUND: Project ${projectId} doesn't exist\n`);
  const missingOperation = await run(cli, ["operation", "get", "--operation", operationId], authority);
  assert.equal(missingOperation.code, 1);
  assert.equal(missingOperation.stdout, "");
  assert.equal(missingOperation.stderr, `convohop: NOT_FOUND: Operation ${operationId} doesn't exist\n`);
});

test("reads are sent again, each with a new request ID, when their outcome is unknown or the authority asks to wait", async t => {
  const { cli } = await sandbox(t);
  const plan = [];
  const authority = fakeAuthority({
    ManagementGetProject: request => {
      const next = plan.shift();
      if (next === "drop") throw new Error("connection reset");
      if (typeof next === "number") return problem(request, "RATE_LIMITED", 429, "Slow down", { retryAfter: next });
      if (next === "forbidden") return problem(request, "FORBIDDEN", 403, "The token can't read this project");
      return reply(request, { result: project(request.variables.input.projectId, randomUUID()) });
    },
  });
  const get = () => run(cli, ["projects", "get", "--project", authority.projectId], authority);
  const requestIds = () => authority.requests.splice(0).map(request => request.variables.context.requestId);

  plan.push("drop", 2);
  const recovered = await get();
  assert.equal(recovered.code, 0, recovered.stderr);
  assert.equal(recovered.stderr, "");
  assert.deepEqual(recovered.waits, [1000, 2000]);
  assert.equal(new Set(requestIds()).size, 3);

  plan.push("drop", "drop", "drop");
  const unknown = await get();
  assert.equal(unknown.code, 1);
  assert.equal(unknown.stdout, "");
  assert.deepEqual(unknown.waits, [1000, 2000]);
  const sent = requestIds();
  assert.equal(new Set(sent).size, 3);
  assert.equal(unknown.stderr, "convohop: TRANSPORT_UNKNOWN: Authority response unavailable; resolve the original request\n" +
    `  outcome: unknown\n  requestId: ${sent[2]}\n`);

  plan.push(31);
  const tooLong = await get();
  assert.equal(tooLong.code, 1);
  assert.deepEqual(tooLong.waits, []);
  assert.equal(tooLong.stderr, `convohop: RATE_LIMITED: Slow down\n  outcome: rejected\n  requestId: ${requestIds()[0]}\n` +
    "  retryAfter: 31s\n");

  plan.push("forbidden");
  const forbidden = await get();
  assert.equal(forbidden.code, 1);
  assert.deepEqual(forbidden.waits, []);
  assert.equal(forbidden.stderr, "convohop: FORBIDDEN: The token can't read this project\n  outcome: rejected\n" +
    `  requestId: ${requestIds()[0]}\n`);
  assert.equal(plan.length, 0);
});

test("projects create sends the project's settings and says how to follow its operation", async t => {
  const { cli } = await sandbox(t);
  const operationId = randomUUID(), deploymentId = randomUUID();
  const authority = fakeAuthority({ ManagementCreateProject: request => accepted(request, operationId) });
  const create = ["projects", "create", "--deployment", deploymentId.toUpperCase(), "--name", "Chat", "--environment",
    "production", "--backend-principal-name", "chat-backend"];
  const result = await run(cli, create, authority);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, `Follow it with convohop operation get --operation ${operationId}\n`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.kind, "reply");
  assert.equal(output.requestId, authority.requests[0].variables.context.requestId);
  assert.equal(output.payload.status, "accepted");
  assert.equal(output.payload.operation.operationId, operationId);
  assertManagementRequest(authority.requests[0], "ManagementCreateProject",
    { deploymentId, name: "Chat", environment: "production", backendPrincipalName: "chat-backend" });
  assertNoSecrets(result, PORTAL_TOKEN);

  for (const [name, message] of [
    ["--deployment", "--deployment is required"], ["--name", "--name is required"],
    ["--environment", "--environment is required"], ["--backend-principal-name", "--backend-principal-name is required"],
  ]) {
    const index = create.indexOf(name);
    assertUsage(await cli(create.toSpliced(index, 2)), message, "projects create");
  }
  assertUsage(await cli(create.with(3, "deployment-1")), "--deployment must be a UUID", "projects create");
});

test("projects usage and operation get print what the authority returns", async t => {
  const { cli } = await sandbox(t);
  const operationId = randomUUID();
  const usage = request => full("ProjectUsage", { projectId: request.variables.input.projectId, source: "meters",
    observedAt: "2026-10-08T12:00:00.000Z", complete: true, reason: "complete", from: request.variables.input.from ?? "2026-10-01",
    to: request.variables.input.to ?? "2026-10-08", meters: [] });
  const authority = fakeAuthority({
    ManagementProjectUsage: request => reply(request, { result: usage(request) }),
    ManagementGetOperation: request => reply(request, { result: operation(request.variables.input.operationId) }),
  });
  const { projectId } = authority;
  const period = await run(cli, ["projects", "usage", "--project", projectId, "--from", "2026-09-01", "--to", "2026-10-01"],
    authority);
  assert.equal(period.code, 0, period.stderr);
  assert.deepEqual(JSON.parse(period.stdout), usage({ variables: { input: { projectId, from: "2026-09-01", to: "2026-10-01" } } }));
  const current = await run(cli, ["projects", "usage", "--project", projectId], authority);
  assert.equal(current.code, 0, current.stderr);
  assert.equal(JSON.parse(current.stdout).from, "2026-10-01");
  const shown = await run(cli, ["operation", "get", "--operation", operationId.toUpperCase()], authority);
  assert.equal(shown.code, 0, shown.stderr);
  assert.deepEqual(JSON.parse(shown.stdout), operation(operationId));

  const [first, second, third] = authority.requests;
  assertManagementRequest(first, "ManagementProjectUsage", { projectId, from: "2026-09-01", to: "2026-10-01" });
  assertManagementRequest(second, "ManagementProjectUsage", { projectId });
  assertManagementRequest(third, "ManagementGetOperation", { operationId });
  assertUsage(await cli(["operation", "get"]), "--operation is required", "operation get");
});

test("resolve looks a management request up by default and rejects a missing resolution", async t => {
  const { cli } = await sandbox(t);
  const requestId = randomUUID();
  const answers = [
    request => reply(request, { result: resolution(request.variables.input.requestId, "notObservedYet") }),
    request => reply(request, { result: null }),
  ];
  const authority = fakeAuthority({ ManagementResolveRequest: request => answers.shift()(request) });
  const result = await run(cli, ["resolve", "--request", requestId.toUpperCase()], authority);
  assert.equal(result.code, 0, result.stderr);
  const looked = JSON.parse(result.stdout);
  assert.equal(looked.state, "notObservedYet");
  assert.equal(looked.requestId, requestId);
  assert.equal(looked.receipt, null);
  assertManagementRequest(authority.requests[0], "ManagementResolveRequest", { requestId });
  assert.notEqual(authority.requests[0].variables.context.requestId, requestId, "the lookup has its own request ID");

  // The transport rejects a null resolution as malformed before the CLI sees it.
  const missing = await run(cli, ["resolve", "--request", requestId], authority);
  assert.equal(missing.code, 1);
  assert.equal(missing.stdout, "");
  assert.equal(missing.stderr, "convohop: Invalid protocol object\n");
  assertUsage(await cli(["resolve"]), "--request is required", "resolve");
});
