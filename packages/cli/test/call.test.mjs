import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { cliOperations } from "@convohop/cli";
import { reply, resolution } from "../../../test/graphql-fixtures.mjs";
import {
  BACKEND_KEY, COMMUNICATION_URL, UUID, assertNoSecrets, assertUsage, fakeAuthority, mockTarget, sandbox, stdinOf,
} from "./helpers.mjs";

const createPrincipal = externalUserId =>
  ["call", "communication.createPrincipal", "--input", JSON.stringify({ externalUserId })];
const requestLog = (control, field, requestId, count) =>
  control.waitLog({ kind: "request", match: { field, requestId }, count }).then(({ entries }) => entries);

test("call sends a communication mutation with the backend key and prints its reply", async t => {
  const { cli } = await sandbox(t);
  const { env, control, descriptor } = await mockTarget(t);
  const result = await cli(createPrincipal("cli-user"), { env, fetch });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.equal(output.kind, "reply");
  assert.match(output.requestId, UUID);
  assert.equal(output.payload.status, "committed");
  assert.equal(output.payload.requestId, output.requestId);
  assert.equal(output.payload.result.externalUserId, "cli-user");
  assert.deepEqual((await requestLog(control, "createPrincipal", output.requestId, 1)).map(entry => entry.status), [200]);
  assertNoSecrets(result, descriptor.credentials.backend);

  const resolved = await cli(["resolve", "--request", output.requestId, "--plane", "communication"], { env, fetch });
  assert.equal(resolved.code, 0, resolved.stderr);
  const looked = JSON.parse(resolved.stdout);
  assert.equal(looked.state, "committed");
  assert.equal(looked.requestId, output.requestId);
  assert.deepEqual(looked.receipt.result.principal, output.payload.result);
  assertNoSecrets(resolved, descriptor.credentials.backend);
});

for (const action of ["dropBeforeCommit", "dropAfterCommit"]) {
  test(`call recovers a mutation whose reply is lost (${action}) through its request ID`, async t => {
    const { cli } = await sandbox(t);
    const { env, control } = await mockTarget(t);
    await control.fault({ plane: "communication", field: "createPrincipal", action });
    const result = await cli(createPrincipal(`cli-${action}`), { env, fetch });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    const output = JSON.parse(result.stdout);
    assert.equal(output.kind, "recovered");
    assert.equal(output.resolution.state, "committed");
    assert.equal(output.resolution.requestId, output.requestId);
    assert.deepEqual(result.waits, [1000]);
    const sent = await requestLog(control, "createPrincipal", output.requestId, action === "dropBeforeCommit" ? 2 : 1);
    assert.deepEqual(sent.map(entry => entry.dropped), action === "dropBeforeCommit" ? [true, false] : [true]);
  });
}

test("call waits out a rate limit and sends the same request again, but not a wait over 30 seconds", async t => {
  const { cli } = await sandbox(t);
  const { env, control } = await mockTarget(t);
  await control.fault({ plane: "communication", field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 2 });
  const result = await cli(createPrincipal("cli-limited"), { env, fetch });
  assert.equal(result.code, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.kind, "reply");
  assert.deepEqual(result.waits, [2000]);
  assert.deepEqual((await requestLog(control, "createPrincipal", output.requestId, 2)).map(entry => [entry.status, entry.code]),
    [[429, "RATE_LIMITED"], [200, null]]);

  await control.fault({ plane: "communication", field: "createPrincipal", action: "rateLimit", retryAfterSeconds: 31 });
  const limited = await cli(createPrincipal("cli-limited-long"), { env, fetch });
  assert.equal(limited.code, 1);
  assert.equal(limited.stdout, "");
  assert.deepEqual(limited.waits, []);
  assert.match(limited.stderr, /^convohop: RATE_LIMITED: .+\n {2}outcome: rejected\n {2}requestId: [0-9a-f-]{36}\n {2}retryAfter: 31s\n {2}next: The authority asked to wait 31 seconds before sending again\.\n$/);
});

test("a missing scope is reported with the scope it needs, and the key never appears", async t => {
  const { cli } = await sandbox(t);
  const { env, descriptor } = await mockTarget(t);
  const input = { conversationId: randomUUID(), members: [{ principalId: randomUUID(), role: "member", expectedRevision: "0" }] };
  const result = await cli(["call", "communication.addMembers", "--input", JSON.stringify(input)],
    { env: { ...env, CONVOHOP_BACKEND_KEY: descriptor.credentials.backendLimited }, fetch });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^convohop: SCOPE_REQUIRED: .+\n {2}outcome: rejected\n {2}requestId: [0-9a-f-]{36}\n {2}scope: membershipManage\n$/);
  assertNoSecrets(result, descriptor.credentials.backendLimited, descriptor.credentials.backend);
});

test("call asks before a destructive operation and sends it only after yes", async t => {
  const { cli } = await sandbox(t);
  const authority = fakeAuthority({ CommunicationDeleteMessage: request => reply(request, {}) });
  const input = { conversationId: randomUUID(), messageId: randomUUID(), expectedRevision: "3" };
  const argv = ["call", "communication.deleteMessage", "--input", JSON.stringify(input)];
  const deletes = () => authority.requests.filter(request => request.operationName === "CommunicationDeleteMessage");
  const send = (stdin, extra = []) => cli([...argv, ...extra], { env: authority.env, fetch: authority.fetch, stdin });
  const prompt = `communication.deleteMessage is destructive: ${cliOperations["communication.deleteMessage"].summary}\n` +
    "Type yes to run it: ";

  assertUsage(await send(stdinOf("yes\n")), "communication.deleteMessage is destructive. Pass --yes to run it without a prompt",
    "call");
  for (const answer of ["no\n", "y\n", ""]) {
    const declined = await send(stdinOf(answer, { tty: true }));
    assert.equal(declined.code, 1, answer);
    assert.equal(declined.stdout, "");
    assert.equal(declined.stderr, `${prompt}convohop: Cancelled; nothing was sent\n`);
  }
  assert.deepEqual(deletes(), []);

  const confirmed = await send(stdinOf(" yes \n", { tty: true }));
  assert.equal(confirmed.code, 0, confirmed.stderr);
  assert.equal(confirmed.stderr, prompt);
  assert.equal(JSON.parse(confirmed.stdout).kind, "reply");
  const forced = await send(stdinOf(), ["--yes"]);
  assert.equal(forced.code, 0, forced.stderr);
  assert.equal(forced.stderr, "");
  assert.equal(deletes().length, 2);
  for (const request of deletes()) {
    assert.equal(request.url, `${COMMUNICATION_URL}/graphql`);
    assert.equal(request.authorization, `Bearer ${BACKEND_KEY}`);
    assert.deepEqual(request.variables.input, input);
    assert.equal(request.variables.context.projectId, authority.projectId);
    assert.equal(request.variables.context.incarnation, authority.incarnation);
  }
  assert.notEqual(deletes()[0].variables.context.requestId, deletes()[1].variables.context.requestId);
});

test("call exits 3 with how to look the request up when its outcome stays unknown, and 130 when interrupted", async t => {
  const { cli } = await sandbox(t);
  const authority = fakeAuthority({
    CommunicationCreatePrincipal: () => {
      throw new Error("connection reset");
    },
    CommunicationResolveRequest: request =>
      reply(request, { result: resolution(request.variables.input.requestId, "notObservedYet") }),
  });
  const result = await cli(createPrincipal("cli-unknown"), { env: authority.env, fetch: authority.fetch });
  assert.equal(result.code, 3);
  assert.equal(result.stdout, "");
  assert.deepEqual(result.waits, [1000, 2000, 4000]);
  assert.deepEqual(authority.names(),
    ["CommunicationRoute", ...Array(3).fill(["CommunicationCreatePrincipal", "CommunicationResolveRequest"]).flat()]);
  const [create, ...others] = authority.requests.slice(1);
  const { requestId } = create.variables.context;
  for (const request of others)
    assert.equal(request.operationName === "CommunicationResolveRequest" ? request.variables.input.requestId
      : request.variables.context.requestId, requestId);
  assert.ok(authority.requests.slice(1).filter(request => request.operationName === "CommunicationCreatePrincipal")
    .every(request => request.variables.input.externalUserId === "cli-unknown"));
  const lookUp = `Don't run the command again: that sends a new request. Check it with convohop resolve --request ${requestId} ` +
    `--plane communication --project ${authority.projectId}`;
  assert.equal(result.stderr, "convohop: RESOLUTION_REQUIRED: The request's outcome is unknown\n  outcome: unknown\n" +
    `  requestId: ${requestId}\n  next: ${lookUp}\n`);

  const controller = new AbortController();
  const interrupted = await cli(createPrincipal("cli-interrupted"), { env: authority.env, fetch: authority.fetch,
    signal: controller.signal, sleep: async () => controller.abort() });
  assert.equal(interrupted.code, 130);
  const sentAgain = authority.requests.filter(request => request.operationName === "CommunicationCreatePrincipal").at(-1);
  assert.equal(sentAgain.variables.input.externalUserId, "cli-interrupted");
  const again = sentAgain.variables.context.requestId;
  assert.equal(interrupted.stderr, "convohop: TRANSPORT_UNKNOWN: Interrupted; the request's outcome is unknown\n" +
    `  outcome: unknown\n  requestId: ${again}\n  next: ${lookUp.replaceAll(requestId, again)}\n`);
});

test("communication operations need a backend key, a project, its incarnation and the authority's URL", async t => {
  const { cli, directory } = await sandbox(t);
  const authority = fakeAuthority();
  const argv = ["call", "communication.getPrincipal", "--input", JSON.stringify({ principalId: randomUUID() })];
  const without = name => {
    const env = { ...authority.env };
    delete env[name];
    return cli(argv, { env });
  };
  assertUsage(await without("CONVOHOP_BACKEND_KEY"),
    "Communication operations need a backend key: set CONVOHOP_BACKEND_KEY or CONVOHOP_BACKEND_KEY_FILE");
  assertUsage(await without("CONVOHOP_PROJECT_ID"), "Set --project or CONVOHOP_PROJECT_ID", "call");
  assertUsage(await without("CONVOHOP_INCARNATION"),
    "Set --incarnation or CONVOHOP_INCARNATION. convohop projects get --project ID shows it", "call");
  assertUsage(await without("CONVOHOP_COMMUNICATION_URL"),
    "Set --communication-url or CONVOHOP_COMMUNICATION_URL, or log in with --communication-url", "call");
  const secret = "c2VjcmV0LWluLWEtcHJvamVjdC1vcHRpb24";
  const invalid = await cli([...argv, "--project", secret], { env: authority.env });
  assertUsage(invalid, "--project must be a UUID", "call");
  assertNoSecrets(invalid, secret);
  const empty = await cli(argv, { env: { ...authority.env, CONVOHOP_BACKEND_KEY: "",
    CONVOHOP_BACKEND_KEY_FILE: `${directory}/missing` } });
  assert.equal(empty.code, 1);
  assert.equal(empty.stderr, "convohop: Can't read the file that CONVOHOP_BACKEND_KEY_FILE names\n");
});

test("--project and --incarnation choose the communication project, and IDs are compared in lower case", async t => {
  const { cli } = await sandbox(t);
  const projectId = randomUUID(), incarnation = randomUUID(), principalId = randomUUID();
  const authority = fakeAuthority({
    CommunicationRoute: request => reply(request, { result: { projectId, incarnation, servingEpoch: "1" } }),
    CommunicationGetPrincipal: request => reply(request, {}),
  });
  const result = await cli(["call", "communication.getPrincipal", "--input", JSON.stringify({ principalId }),
    "--project", projectId.toUpperCase(), "--incarnation", incarnation.toUpperCase()],
  { env: authority.env, fetch: authority.fetch });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(authority.names(), ["CommunicationRoute", "CommunicationGetPrincipal"]);
  for (const request of authority.requests) {
    assert.equal(request.variables.context.projectId, projectId);
    assert.equal(request.variables.context.incarnation, incarnation);
  }
});

test("keys issue requests a key and says how to redeem it, and resolve looks up the request", async t => {
  const { cli } = await sandbox(t);
  const { env, descriptor } = await mockTarget(t);
  const result = await cli(["keys", "issue", "--project", descriptor.projectId, "--name", "ci", "--scope", "messageRead",
    "--scope", "messageWrite", "--expires-at", "2099-01-01T00:00:00Z"], { env, fetch });
  assert.equal(result.code, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.kind, "reply");
  assert.equal(output.payload.status, "accepted");
  const { operationId } = output.payload.operation;
  assert.match(operationId, UUID);
  assert.equal(result.stderr, `Redeem the key with convohop redeem --operation ${operationId} --out FILE\n`);
  assertNoSecrets(result, descriptor.credentials.management);

  const resolved = await cli(["resolve", "--request", output.requestId.toUpperCase()], { env, fetch });
  assert.equal(resolved.code, 0, resolved.stderr);
  const resolution = JSON.parse(resolved.stdout);
  assert.equal(resolution.state, "accepted");
  assert.equal(resolution.requestId, output.requestId);
  assert.equal(resolution.receipt.operation.operationId, operationId);

  const unseen = await cli(["resolve", "--request", randomUUID()], { env, fetch });
  assert.equal(unseen.code, 0, unseen.stderr);
  assert.equal(JSON.parse(unseen.stdout).state, "notObservedYet");
  assertUsage(await cli(["resolve", "--request", randomUUID(), "--plane", "media"], { env }),
    "--plane must be management or communication", "resolve");
});
