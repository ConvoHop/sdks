import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { cliOperations, cliScopes } from "@convohop/cli";
import { full, reply } from "../../../test/graphql-fixtures.mjs";
import {
  COMMUNICATION_URL, MANAGEMENT_URL, PORTAL_TOKEN, UUID, accepted, assertNoSecrets, assertUsage, fakeAuthority, problem,
  project, sandbox, stdinOf,
} from "./helpers.mjs";

const KEY = "fixture-issued-backend-key-never-in-output";
const SECRET = "fixture-webhook-secret-never-in-output";
const now = () => new Date("2026-10-08T12:00:00Z");
const reissue = "If no one has the credential, revoke the key or rotate the webhook secret, then issue a new one.";

const capsule = (fields = {}) => full("CredentialCapsule", { kind: "backendKey", keyId: "key-1",
  backendPrincipalId: "principal-1", backendKey: KEY, expiresAt: "2027-01-06T12:00:00.000Z", ...fields });
const operation = (operationId, fields = {}) => full("Operation", { operationId, kind: "issueBackendKey", state: "running",
  revision: "1", requestedAt: "2026-10-08T12:00:00.000Z", updatedAt: "2026-10-08T12:00:00.000Z", steps: [], ...fields });
const missing = path => assert.rejects(stat(path), { code: "ENOENT" });

/**
 * An authority that issues a key whose reply names its credential delivery, then redeems and acknowledges the delivery.
 * The answers that answers(fixture) returns replace its own.
 */
function keyAuthority(answers = () => ({})) {
  const table = {};
  const fixture = { ...fakeAuthority(table), deliveryId: randomUUID(), operationId: randomUUID() };
  const { projectId, incarnation, deliveryId, operationId } = fixture;
  fixture.delivery = full("CredentialDelivery", { deliveryId, kind: "backendKey", projectId,
    installationId: "installation-1", expiresAt: "2026-10-08T12:10:00.000Z", payloadDigest: "sha256-fixture" });
  Object.assign(table, {
    ManagementIssueBackendKey: request => accepted(request, operationId,
      { result: full("OperationResult", { delivery: fixture.delivery }) }),
    ManagementGetProject: request => reply(request, { result: project(projectId, incarnation) }),
    // Each permit names the request that got it, so a test can tell which permit a delivery request carried.
    ManagementCredentialPermit: request => reply(request, { result: { permit: request.variables.context.requestId } }),
    CommunicationRedeemCredential: request => reply(request, { result: capsule() }),
    CommunicationAcknowledgeCredential: request =>
      reply(request, { result: full("DeliveryAck", { deliveryId, acknowledged: true }) }),
  }, answers(fixture));
  return fixture;
}
const sent = (authority, name) => authority.requests.filter(request => request.operationName === name);
const permitOf = request => ({ permit: request.variables.context.requestId });
const redeemArgs = (authority, out) =>
  ["redeem", "--delivery", authority.deliveryId, "--project", authority.projectId, "--out", out];
const run = (cli, argv, authority, options = {}) => cli(argv, { env: authority.env, fetch: authority.fetch, now, ...options });

test("keys issue --out redeems the new key into a file only the user can read, and never prints it", async t => {
  const { cli, directory } = await sandbox(t);
  const authority = keyAuthority();
  const { projectId, incarnation, deliveryId } = authority;
  const out = join(directory, "backend-key");
  const result = await run(cli, ["keys", "issue", "--project", projectId, "--name", "ci", "--scope", "messageWrite",
    "--scope", "messageRead", "--expires-in", "90d", "--out", out], authority);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assertNoSecrets(result, KEY, PORTAL_TOKEN);
  assert.equal(await readFile(out, "utf8"), `${KEY}\n`);
  assert.equal((await stat(out)).mode & 0o777, 0o600);
  const output = JSON.parse(result.stdout);
  assert.equal(output.request.kind, "reply");
  assert.equal(output.request.payload.result.delivery.deliveryId, deliveryId);
  assert.deepEqual(output.redemption, { deliveryId, kind: "backendKey", keyId: "key-1", backendPrincipalId: "principal-1",
    endpointId: null, secretVersion: null, expiresAt: "2027-01-06T12:00:00.000Z", file: out, acknowledged: true });

  assert.deepEqual(authority.names(), ["ManagementIssueBackendKey", "ManagementGetProject", "ManagementCredentialPermit",
    "CommunicationRedeemCredential", "CommunicationAcknowledgeCredential"]);
  const [issue, , permit, redemption, acknowledgement] = authority.requests;
  assert.equal(issue.url, `${MANAGEMENT_URL}/graphql`);
  assert.equal(issue.authorization, `Bearer ${PORTAL_TOKEN}`);
  assert.deepEqual(issue.variables.input, { projectId, name: "ci", scopes: ["messageWrite", "messageRead"],
    expiresAt: "2027-01-06T12:00:00.000Z" });
  const { redemptionRequestId } = permit.variables.input;
  assert.match(redemptionRequestId, UUID);
  assert.deepEqual(permit.variables.input, { projectId, deliveryId, redemptionRequestId });
  for (const request of [redemption, acknowledgement]) {
    assert.equal(request.url, `${COMMUNICATION_URL}/graphql`);
    assert.equal(request.authorization, null, "delivery requests carry a permit, not a credential");
    assert.deepEqual(request.variables.input, { deliveryId });
    const { context } = request.variables;
    assert.equal(context.projectId, projectId);
    assert.equal(context.incarnation, incarnation);
    assert.equal(context.observedServingEpoch, "1");
    assert.deepEqual(context.credentialDeliveryPermit, permitOf(permit));
  }
  assert.notEqual(redemption.variables.context.requestId, acknowledgement.variables.context.requestId);
});

test("keys issue without --out prints the request and how to redeem the key", async t => {
  const { cli } = await sandbox(t);
  const authority = keyAuthority();
  const result = await run(cli, ["keys", "issue", "--project", authority.projectId, "--name", "ci", "--scope", "messageRead",
    "--expires-at", "2027-01-31T02:00:00+02:00"], authority);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr,
    `Redeem the key with convohop redeem --delivery ${authority.deliveryId} --project ${authority.projectId} --out FILE\n`);
  assert.equal(JSON.parse(result.stdout).kind, "reply");
  assert.deepEqual(authority.names(), ["ManagementIssueBackendKey"]);
  assert.equal(authority.requests[0].variables.input.expiresAt, "2027-01-31T00:00:00.000Z");
});

test("keys issue checks its options, its file and the communication URL before it sends anything", async t => {
  const { cli, directory } = await sandbox(t);
  const authority = fakeAuthority();
  const projectOption = ["--project", authority.projectId], named = [...projectOption, "--name", "ci"];
  const scoped = [...named, "--scope", "messageRead"], expiring = [...scoped, "--expires-in", "1d"];
  const existing = join(directory, "existing"), out = join(directory, "key");
  await writeFile(existing, "keep\n");
  const withoutCommunication = { ...authority.env };
  delete withoutCommunication.CONVOHOP_COMMUNICATION_URL;
  const time = "--expires-at must be an ISO 8601 time with a zone, such as 2027-01-31T00:00:00Z";
  const duration = "--expires-in must be a number and a unit (s, m, h or d), such as 90d";
  for (const [argv, message, env = authority.env] of [
    [[], "--project is required"],
    [projectOption, "--name is required"],
    [named, "Set at least one --scope. convohop keys scopes lists them"],
    [[...named, "--scope", "nope"], "Unknown scope nope. convohop keys scopes lists them"],
    [[...named, "--scope", "sk_live/0123456789"], "Unknown scope. convohop keys scopes lists them"],
    [[...scoped, "--scope", "messageRead"], "--scope messageRead is given more than once"],
    [scoped, "Set --expires-at or --expires-in"],
    [[...scoped, "--expires-at", "2027-01-31T00:00:00Z", "--expires-in", "1d"], "Set --expires-at or --expires-in"],
    [[...scoped, "--expires-at", "2027-01-31"], time],
    [[...scoped, "--expires-at", "2027-01-31T00:00:00"], time],
    [[...scoped, "--expires-in", "90"], duration],
    [[...scoped, "--expires-in", "0d"], duration],
    [[...scoped, "--expires-in", "2w"], duration],
    [[...scoped, "--expires-at", "2026-10-08T11:59:59Z"], "The key must expire in the future"],
    [[...expiring, "--timeout", "3601"], "--timeout must be a whole number from 0 to 3600"],
    [[...expiring, "--out", out], "--out redeems the key from the communication authority: set --communication-url or " +
      "CONVOHOP_COMMUNICATION_URL, or log in with --communication-url", withoutCommunication],
    [[...expiring, "--out", "-"], "--out must name a file: convohop never prints credentials"],
    [[...expiring, "--out", existing], `${existing} already exists. Name a new file for the credential`],
  ]) {
    const result = await cli(["keys", "issue", ...argv], { env, now });
    assertUsage(result, message, "keys issue");
    assert.deepEqual(result.sent, [], message);
  }
  const unwritable = join(directory, "absent", "key");
  const failed = await cli(["keys", "issue", ...expiring, "--out", unwritable], { env: authority.env, now });
  assert.equal(failed.code, 1);
  assert.equal(failed.stderr, `convohop: Can't create ${unwritable}\n`);
  assert.deepEqual(failed.sent, []);
  assert.equal(await readFile(existing, "utf8"), "keep\n");
  await missing(out);
});

test("a rejected key issue leaves no file and says nothing about redeeming", async t => {
  const { cli, directory } = await sandbox(t);
  const authority = keyAuthority(() => ({
    ManagementIssueBackendKey: request => problem(request, "FORBIDDEN", 403, "The portal user can't issue keys"),
  }));
  const out = join(directory, "key");
  const result = await run(cli, ["keys", "issue", "--project", authority.projectId, "--name", "ci", "--scope", "messageRead",
    "--expires-in", "1d", "--out", out], authority);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  const [issue] = authority.requests;
  assert.equal(result.stderr, "convohop: FORBIDDEN: The portal user can't issue keys\n  outcome: rejected\n" +
    `  requestId: ${issue.variables.context.requestId}\n`);
  assert.deepEqual(authority.names(), ["ManagementIssueBackendKey"]);
  await missing(out);
});

test("redeem --operation waits for the operation's credential delivery, then redeems it", async t => {
  const { cli, directory } = await sandbox(t);
  let polls = 0;
  const authority = keyAuthority(({ operationId, delivery }) => ({
    ManagementGetOperation: request => reply(request, { result: operation(operationId, ++polls < 3 ? {}
      : { state: "succeeded", result: full("OperationResult", { delivery }) }) }),
  }));
  const out = join(directory, "key");
  const result = await run(cli, ["redeem", "--operation", authority.operationId.toUpperCase(), "--out", out], authority);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(result.waits, [2000, 2000]);
  assert.equal(JSON.parse(result.stdout).deliveryId, authority.deliveryId);
  assert.equal(await readFile(out, "utf8"), `${KEY}\n`);
  assert.deepEqual(sent(authority, "ManagementGetOperation").map(request => request.variables.input),
    Array(3).fill({ operationId: authority.operationId }));
  assertNoSecrets(result, KEY);

  const elsewhere = join(directory, "elsewhere");
  const mismatch = await run(cli, ["redeem", "--operation", authority.operationId, "--project", randomUUID(),
    "--out", elsewhere], authority);
  assert.equal(mismatch.code, 1);
  assert.equal(mismatch.stderr, "convohop: The credential delivery is for another project\n");
  assert.equal(sent(authority, "ManagementCredentialPermit").length, 1);
  await missing(elsewhere);
});

test("keys issue --out says the key is issued when its delivery doesn't come, and leaves no file", async t => {
  const { cli, directory } = await sandbox(t);
  const cases = [
    { fields: { blockedReason: "The project is suspended" }, timeout: "120", waits: [],
      message: id => `Operation ${id} is blocked: The project is suspended`, next: id => `convohop operation get --operation ${id}` },
    { fields: {}, timeout: "4", waits: [2000, 2000],
      message: id => `Operation ${id} has no credential delivery after 4 seconds (state running)`,
      next: id => `Wait, then run convohop redeem --operation ${id} --out FILE` },
  ];
  for (const { fields, timeout, waits, message, next } of cases) {
    const authority = keyAuthority(({ operationId }) => ({
      ManagementIssueBackendKey: request => accepted(request, operationId),
      ManagementGetOperation: request => reply(request, { result: operation(operationId, fields) }),
    }));
    const out = join(directory, `key-${timeout}`), id = authority.operationId;
    const result = await run(cli, ["keys", "issue", "--project", authority.projectId, "--name", "ci", "--scope",
      "messageRead", "--expires-in", "1d", "--out", out, "--timeout", timeout], authority);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `The key is issued (operation ${id}).\nconvohop: ${message(id)}\n  next: ${next(id)}\n`);
    assert.deepEqual(result.waits, waits);
    assert.equal(sent(authority, "ManagementGetOperation").length, waits.length + 1);
    assert.ok(!authority.names().includes("ManagementCredentialPermit"));
    await missing(out);
  }

  const gone = keyAuthority(() => ({ ManagementGetOperation: request => reply(request, {}) }));
  const result = await run(cli, ["redeem", "--operation", gone.operationId, "--out", join(directory, "gone")], gone);
  assert.equal(result.code, 1);
  assert.equal(result.stderr, `convohop: Operation ${gone.operationId} doesn't exist\n`);
});

test("redeem writes a webhook secret to its file and prints only its metadata", async t => {
  const { cli, directory } = await sandbox(t);
  const endpointId = randomUUID();
  const authority = keyAuthority(() => ({
    CommunicationRedeemCredential: request => reply(request, { result: capsule({ kind: "webhookSecret", keyId: null,
      backendPrincipalId: null, backendKey: null, endpointId, secretVersion: "2", secret: SECRET }) }),
  }));
  const out = join(directory, "webhook-secret");
  const result = await run(cli, redeemArgs(authority, out), authority);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { deliveryId: authority.deliveryId, kind: "webhookSecret", keyId: null,
    backendPrincipalId: null, endpointId, secretVersion: "2", expiresAt: "2027-01-06T12:00:00.000Z", file: out,
    acknowledged: true });
  assert.equal(await readFile(out, "utf8"), `${SECRET}\n`);
  assertNoSecrets(result, SECRET);
});

test("redeem refuses a delivery without exactly one credential, and leaves no file", async t => {
  const { cli, directory } = await sandbox(t);
  for (const [index, fields] of [{ backendKey: null }, { backendKey: "" }, { secret: SECRET }].entries()) {
    const authority = keyAuthority(() => ({
      CommunicationRedeemCredential: request => reply(request, { result: capsule(fields) }),
    }));
    const out = join(directory, `key-${index}`);
    const result = await run(cli, redeemArgs(authority, out), authority);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `convohop: The credential delivery returned no usable credential\n  next: ${reissue}\n`);
    assert.ok(!authority.names().includes("CommunicationAcknowledgeCredential"));
    await missing(out);
  }
});

test("a delivery that was already redeemed is reported with what to do next", async t => {
  const { cli, directory } = await sandbox(t);
  const authority = keyAuthority(() => ({
    CommunicationRedeemCredential: request => problem(request, "DELIVERY_CONSUMED", 409, "The delivery was redeemed"),
  }));
  const out = join(directory, "key");
  const result = await run(cli, redeemArgs(authority, out), authority);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  const [redemption] = sent(authority, "CommunicationRedeemCredential");
  assert.equal(result.stderr, "convohop: DELIVERY_CONSUMED: The delivery was redeemed\n  outcome: rejected\n" +
    `  requestId: ${redemption.variables.context.requestId}\n  next: ${reissue}\n`);
  assert.deepEqual(result.waits, []);
  await missing(out);
});

test("a redemption whose outcome stays unknown is resent with its request ID and a new permit, then exits 3", async t => {
  const { cli, directory } = await sandbox(t);
  const authority = keyAuthority(() => ({
    CommunicationRedeemCredential: () => {
      throw new Error("connection reset");
    },
  }));
  const { deliveryId, projectId } = authority;
  const out = join(directory, "key");
  const result = await run(cli, redeemArgs(authority, out), authority);
  assert.equal(result.code, 3);
  assert.equal(result.stdout, "");
  assert.deepEqual(result.waits, [1000, 2000]);
  const redemptions = sent(authority, "CommunicationRedeemCredential"), permits = sent(authority, "ManagementCredentialPermit");
  assert.equal(redemptions.length, 3);
  const { requestId } = redemptions[0].variables.context;
  assert.ok(redemptions.every(request => request.variables.context.requestId === requestId));
  assert.deepEqual(redemptions.map(request => request.variables.context.credentialDeliveryPermit), permits.map(permitOf));
  assert.equal(new Set(permits.map(request => request.variables.input.redemptionRequestId)).size, 1);
  assert.equal(result.stderr, "convohop: TRANSPORT_UNKNOWN: The redemption's outcome is unknown\n  outcome: unknown\n" +
    `  requestId: ${requestId}\n  next: The credential may be redeemed but not received. Run convohop redeem --delivery ` +
    `${deliveryId} --project ${projectId} --out FILE; if it reports DELIVERY_CONSUMED: ${reissue}\n`);
  await missing(out);
});

test("redeem renews an expired permit and follows a moved project, but not a new incarnation", async t => {
  const { cli, directory } = await sandbox(t);
  let redemptions = 0;
  const renewed = keyAuthority(() => ({
    CommunicationRedeemCredential: request => ++redemptions === 1
      ? problem(request, "PERMIT_EXPIRED", 401, "The permit expired") : reply(request, { result: capsule() }),
  }));
  const first = await run(cli, redeemArgs(renewed, join(directory, "renewed")), renewed);
  assert.equal(first.code, 0, first.stderr);
  const permits = sent(renewed, "ManagementCredentialPermit");
  assert.equal(permits.length, 2);
  assert.equal(permits[0].variables.input.redemptionRequestId, permits[1].variables.input.redemptionRequestId);
  const delivered = [...sent(renewed, "CommunicationRedeemCredential"), ...sent(renewed, "CommunicationAcknowledgeCredential")];
  assert.deepEqual(delivered.map(request => request.variables.context.credentialDeliveryPermit),
    [permitOf(permits[0]), permitOf(permits[1]), permitOf(permits[1])]);
  assert.equal(delivered[0].variables.context.requestId, delivered[1].variables.context.requestId);

  let epochs = 0, moves = 0;
  const moved = keyAuthority(({ projectId, incarnation }) => ({
    ManagementGetProject: request => reply(request, { result: project(projectId, incarnation, { servingEpoch: String(++epochs) }) }),
    CommunicationRedeemCredential: request => ++moves === 1
      ? problem(request, "WRONG_REGION", 421, "The project moved") : reply(request, { result: capsule() }),
  }));
  const second = await run(cli, redeemArgs(moved, join(directory, "moved")), moved);
  assert.equal(second.code, 0, second.stderr);
  assert.deepEqual(sent(moved, "CommunicationRedeemCredential").map(request => request.variables.context.observedServingEpoch),
    ["1", "2"]);
  assert.equal(sent(moved, "CommunicationAcknowledgeCredential")[0].variables.context.observedServingEpoch, "2");
  assert.equal(sent(moved, "ManagementCredentialPermit").length, 1);

  let lookups = 0;
  const replaced = keyAuthority(({ projectId, incarnation }) => ({
    ManagementGetProject: request => reply(request, { result: project(projectId, ++lookups === 1 ? incarnation : randomUUID()) }),
    CommunicationRedeemCredential: request => problem(request, "WRONG_REGION", 421, "The project moved"),
  }));
  const out = join(directory, "replaced");
  const third = await run(cli, redeemArgs(replaced, out), replaced);
  assert.equal(third.code, 1);
  assert.equal(third.stderr, `convohop: The project's incarnation changed, so the delivery can't be redeemed\n  next: ${reissue}\n`);
  assert.equal(sent(replaced, "CommunicationRedeemCredential").length, 1);
  await missing(out);
});

test("a failed acknowledgement is a warning: the credential is saved", async t => {
  const { cli, directory } = await sandbox(t);
  const answers = [
    ["FORBIDDEN", () => request => problem(request, "FORBIDDEN", 403, "No")],
    ["NOT_ACKNOWLEDGED", ({ deliveryId }) => request =>
      reply(request, { result: full("DeliveryAck", { deliveryId, acknowledged: false }) })],
    ["NOT_ACKNOWLEDGED", () => request => reply(request, { result: full("DeliveryAck", { deliveryId: randomUUID(), acknowledged: true }) })],
  ];
  for (const [index, [code, answer]] of answers.entries()) {
    const authority = keyAuthority(fixture => ({ CommunicationAcknowledgeCredential: answer(fixture) }));
    const out = join(directory, `key-${index}`);
    const result = await run(cli, redeemArgs(authority, out), authority);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, `warning: the credential is saved, but its delivery isn't acknowledged (${code})\n`);
    assert.equal(JSON.parse(result.stdout).acknowledged, false);
    assert.equal(await readFile(out, "utf8"), `${KEY}\n`);
    assertNoSecrets(result, KEY);
  }
});

test("redeem checks its options before it sends anything", async t => {
  const { cli, directory } = await sandbox(t);
  const authority = fakeAuthority(), id = randomUUID(), out = join(directory, "key");
  const withoutCommunication = { ...authority.env };
  delete withoutCommunication.CONVOHOP_COMMUNICATION_URL;
  for (const [argv, message, env = authority.env] of [
    [["--out", out], "Set --operation, or --delivery and --project"],
    [["--operation", id, "--delivery", id, "--project", id, "--out", out], "Set --operation, or --delivery and --project"],
    [["--delivery", id, "--out", out], "--delivery needs --project"],
    [["--operation", id], "--out is required"],
    [["--operation", "operation-1", "--out", out], "--operation must be a UUID"],
    [["--operation", id, "--out", out, "--timeout", "-1"], "--timeout must be a whole number from 0 to 3600"],
    [["--operation", id, "--out", out], "Set --communication-url or CONVOHOP_COMMUNICATION_URL, or log in with " +
      "--communication-url", withoutCommunication],
    [["--operation", id, "--out", "-"], "--out must name a file: convohop never prints credentials"],
  ]) {
    const result = await cli(["redeem", ...argv], { env });
    assertUsage(result, message, "redeem");
    assert.deepEqual(result.sent, [], message);
  }
  await missing(out);
});

test("keys revoke asks first, checks the revision and revokes the key", async t => {
  const { cli } = await sandbox(t);
  const authority = fakeAuthority({ ManagementRevokeBackendKey: request => reply(request, {}) });
  const revoke = ["keys", "revoke", "--project", authority.projectId, "--key", "key-1", "--expected-revision"];
  const options = { env: authority.env, fetch: authority.fetch };
  for (const revision of ["01", "1.5", "seven"])
    assertUsage(await cli([...revoke, revision, "--yes"], options), "--expected-revision must be a whole number", "keys revoke");
  assertUsage(await cli([...revoke, "7"], { ...options, stdin: stdinOf("yes\n") }),
    "management.revokeBackendKey is destructive. Pass --yes to run it without a prompt", "keys revoke");
  const prompt = `management.revokeBackendKey is destructive: ${cliOperations["management.revokeBackendKey"].summary}\n` +
    "Type yes to run it: ";
  const declined = await cli([...revoke, "7"], { ...options, stdin: stdinOf("no\n", { tty: true }) });
  assert.equal(declined.code, 1);
  assert.equal(declined.stderr, `${prompt}convohop: Cancelled; nothing was sent\n`);
  assert.deepEqual(authority.requests, []);

  const confirmed = await cli([...revoke, "7"], { ...options, stdin: stdinOf("yes\n", { tty: true }) });
  assert.equal(confirmed.code, 0, confirmed.stderr);
  assert.equal(confirmed.stderr, prompt);
  const forced = await cli([...revoke, "8", "--revoke-sessions", "--yes"], options);
  assert.equal(forced.code, 0, forced.stderr);
  assert.equal(forced.stderr, "");
  assert.equal(JSON.parse(forced.stdout).kind, "reply");
  assert.deepEqual(authority.requests.map(request => request.variables.input), [
    { projectId: authority.projectId, keyId: "key-1", expectedRevision: "7", revokeIssuedSessions: false },
    { projectId: authority.projectId, keyId: "key-1", expectedRevision: "8", revokeIssuedSessions: true },
  ]);
  assert.ok(authority.requests.every(request => request.authorization === `Bearer ${PORTAL_TOKEN}`));
  assertNoSecrets(forced, PORTAL_TOKEN);
});

test("keys scopes lists the scopes the schema defines", async t => {
  const { cli } = await sandbox(t);
  const result = await cli(["keys", "scopes"]);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), cliScopes);
  assert.ok(Object.hasOwn(cliScopes, "messageRead"));
});
