import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { push, webhooks } from "@convohop/server";
import { PUSH_VECTOR_FILE, canonicalBytes, measuredPart } from "../../../conformance/lib/push-vectors.mjs";
import { UUID, assertNoSecrets, assertUsage, sandbox, stdinOf } from "./helpers.mjs";

const document = JSON.parse(await readFile(PUSH_VECTOR_FILE, "utf8"));
const NOW = new Date("2026-10-08T12:00:00.000Z");
const BUNDLE_ID = "com.example.chat";
const EPHEMERAL_NOTE = "Signed with a new secret for this run. Pass --secret-file to sign as your endpoint.\n";

/** A sandboxed cli and a 0600 file holding a new endpoint secret. */
async function withSecret(t) {
  const box = await sandbox(t);
  const secret = `whsec_${randomBytes(32).toString("base64")}`, secretFile = join(box.directory, "webhook-secret");
  await writeFile(secretFile, `${secret}\n`, { mode: 0o600 });
  return { ...box, secret, secretFile };
}

/** Checks that each payload is what the @convohop/server builder makes of the printed event, with its measured size. */
function assertBuilt(output, options) {
  for (const [builder, built] of Object.entries(output.payloads)) {
    const request = push[builder](output.event, { now: NOW, bundleId: BUNDLE_ID, ...options });
    assert.deepEqual(built, request && { request: JSON.parse(JSON.stringify(request)),
      bytes: canonicalBytes(measuredPart[builder](request)) }, builder);
  }
}

const visible = output => output.payloads.webPush.request.payload.convohop;

test("push test builds each push-payload vector's requests from a verified delivery of its event", async t => {
  const { cli, secret, secretFile } = await withSecret(t);
  assert.ok(document.vectors.length > 0);
  for (const vector of document.vectors) {
    const { bundleId, title, body, preview } = vector.options;
    // The README makes an empty title or body the same as none, and the CLI takes no empty option values.
    const argv = ["push", "test", "--event", "-", "--secret-file", secretFile, "--bundle-id", bundleId,
      ...(title ? ["--title", title] : []), ...(body ? ["--body", body] : []), ...(preview === false ? ["--no-preview"] : [])];
    const event = { ...vector.event, ...vector.unknownFields }, now = new Date(vector.nowSeconds * 1000);
    const result = await cli(argv, { stdin: stdinOf(JSON.stringify(event)), now: () => now });
    assert.equal(result.code, 0, `${vector.id}: ${result.stderr}`);
    assert.equal(result.stderr, "", vector.id);
    const output = JSON.parse(result.stdout);
    assert.match(output.webhook.id, /^msg_[0-9a-f]{32}$/, vector.id);
    assert.deepEqual(output.webhook, { id: output.webhook.id, timestamp: vector.nowSeconds, secretSource: "file" }, vector.id);
    assert.deepEqual(output.event, event, vector.id);
    assert.deepEqual(output.payloads, vector.expected, vector.id);
    assertNoSecrets(result, secret);
    assert.deepEqual(result.sent, []);
  }
});

test("push test reports each invalid event with the builders' error, and a body that isn't a notification", async t => {
  const { cli, directory, secretFile } = await withSecret(t);
  const now = new Date(document.vectors[0].nowSeconds * 1000);
  const signed = (event, argv = []) => cli(["push", "test", "--event", "-", "--secret-file", secretFile, ...argv],
    { stdin: stdinOf(typeof event === "string" ? event : JSON.stringify(event)), now: () => now });
  assert.ok(document.invalidEvents.length > 0);
  for (const invalid of document.invalidEvents) {
    let message;
    assert.throws(() => push.apnsAlert(invalid.event, { bundleId: BUNDLE_ID, now }), error => (message = error.message, true));
    const result = await signed(invalid.event, ["--bundle-id", BUNDLE_ID]);
    assert.equal(result.code, 1, invalid.id);
    assert.equal(result.stdout, "", invalid.id);
    assert.equal(result.stderr, `convohop: INVALID_EVENT: ${message}\n`, invalid.id);
  }

  const conversationId = randomUUID();
  const created = { eventId: randomUUID(), eventType: "conversation.created", occurredAt: now.toISOString(),
    projectId: randomUUID(), subjectRef: { id: conversationId, kind: "conversation" }, conversationId };
  for (const [body, stderr] of [
    [created, "INVALID_EVENT: Invalid notification event: eventType must be a notification event type"],
    ["not json", "INVALID_BODY: Webhook body is not UTF-8 JSON"],
    ["[1,2]", "INVALID_BODY: Webhook body is not a ConvoHop event envelope"],
  ]) {
    const result = await signed(body);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `convohop: ${stderr}\n`);
  }
  assertUsage(await signed(" ".repeat(4097)), "--event must be at most 4096 bytes", "push test");

  const vector = document.vectors[0], eventFile = join(directory, "event.json");
  await writeFile(eventFile, JSON.stringify(vector.event));
  const fromFile = await cli(["push", "test", "--event", eventFile, "--secret-file", secretFile, "--bundle-id", BUNDLE_ID],
    { now: () => new Date(vector.nowSeconds * 1000) });
  assert.equal(fromFile.code, 0, fromFile.stderr);
  assert.deepEqual(JSON.parse(fromFile.stdout).event, vector.event);
  const missing = join(directory, "missing.json"), unread = await cli(["push", "test", "--event", missing]);
  assert.equal(unread.code, 1);
  assert.equal(unread.stderr, `convohop: Can't read ${missing}\n`);
});

test("push test signs a sample message, call or cancellation for the given recipient and platforms", async t => {
  const { cli } = await sandbox(t);
  const sample = async (argv, options) => {
    const result = await cli(["push", "test", ...argv], { now: () => NOW });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, EPHEMERAL_NOTE);
    assert.ok(!result.stdout.includes("whsec_"), "the run's secret isn't printed");
    assert.deepEqual(result.sent, []);
    const output = JSON.parse(result.stdout);
    assert.match(output.webhook.id, /^msg_[0-9a-f]{32}$/);
    assert.deepEqual(output.webhook, { id: output.webhook.id, timestamp: NOW.getTime() / 1000, secretSource: "ephemeral" });
    const { event } = output;
    for (const field of ["eventId", "projectId", "recipientId", "conversationId", "senderId"]) assert.match(event[field], UUID);
    assert.equal(event.occurredAt, NOW.toISOString());
    assert.equal(event.connected, false);
    assertBuilt(output, options);
    return output;
  };

  const message = await sample([]);
  assert.deepEqual(Object.keys(message.payloads), ["fcm", "webPush"]);
  assert.equal(message.event.eventType, "notification.message");
  assert.match(message.event.messageId, UUID);
  assert.deepEqual(message.event.subjectRef, { id: message.event.messageId, kind: "message" });
  assert.equal(Object.hasOwn(message.event, "preview"), false);

  const previewed = await sample(["--preview-text", "See you at 6", "--title", "Ada Lovelace"], { title: "Ada Lovelace" });
  assert.deepEqual(previewed.event.preview, { text: "See you at 6", truncated: false });
  assert.equal(visible(previewed).title, "Ada Lovelace");
  assert.equal(visible(previewed).body, "See you at 6");
  const hidden = await sample(["--preview-text", "See you at 6", "--no-preview"], { preview: false });
  assert.equal(Object.hasOwn(visible(hidden), "body"), false);
  const replaced = await sample(["--preview-text", "See you at 6", "--body", "New message"], { body: "New message" });
  assert.equal(visible(replaced).body, "New message");

  const projectId = randomUUID(), recipientId = randomUUID();
  const call = await sample(["--type", "call", "--project", projectId.toUpperCase(), "--recipient", recipientId.toUpperCase(),
    "--bundle-id", BUNDLE_ID, "--platform", "fcm", "--platform", "apns-voip"]);
  assert.deepEqual(Object.keys(call.payloads), ["apnsVoip", "fcm"], "platforms print in a fixed order");
  assert.equal(call.event.eventType, "notification.call");
  assert.equal(call.event.projectId, projectId);
  assert.equal(call.event.recipientId, recipientId);
  assert.match(call.event.liveSessionId, UUID);
  assert.match(call.event.alertId, UUID);
  assert.deepEqual(call.event.subjectRef, { id: call.event.liveSessionId, kind: "liveSession" });
  assert.equal(call.event.expiresAt, new Date(NOW.getTime() + 30_000).toISOString());
  assert.equal(call.event.mediaProfile, "AUDIO_VIDEO");
  assert.equal(Object.hasOwn(call.event, "reason"), false);
  assert.notEqual(call.payloads.apnsVoip, null);

  const ended = await sample(["--type", "call-cancelled", "--bundle-id", BUNDLE_ID]);
  assert.deepEqual(Object.keys(ended.payloads), ["apnsAlert", "apnsVoip", "fcm", "webPush"]);
  assert.equal(ended.event.eventType, "notification.callCancelled");
  assert.equal(ended.event.reason, "ended");
  const declined = await sample(["--type", "call-cancelled", "--reason", "declined"]);
  assert.equal(declined.event.reason, "declined");
});

test("push test signs with the endpoint's secret from a file, standard input or the environment, and never prints it",
  async t => {
    const { cli, directory, secret, secretFile } = await withSecret(t);
    for (const { argv = [], stdin, env, source } of [
      { argv: ["--secret-file", secretFile], source: "file" },
      { argv: ["--secret-file", "-"], stdin: `${secret}\n`, source: "file" },
      { env: { CONVOHOP_WEBHOOK_SECRET: secret }, source: "environment" },
      { env: { CONVOHOP_WEBHOOK_SECRET_FILE: secretFile }, source: "environment" },
    ]) {
      const result = await cli(["push", "test", ...argv], { stdin: stdinOf(stdin), env, now: () => NOW });
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stderr, "", "only a new secret gets a note");
      assert.equal(JSON.parse(result.stdout).webhook.secretSource, source);
      assertNoSecrets(result, secret, secret.slice("whsec_".length));
    }

    const malformed = join(directory, "malformed"), empty = join(directory, "empty"), large = join(directory, "large");
    await writeFile(malformed, "not-a-webhook-secret\n");
    await writeFile(empty, "\n");
    await writeFile(large, `whsec_${"A".repeat(1024)}`);
    const failures = [
      [["--secret-file", malformed], {},
        "INVALID_SECRET: A webhook secret must be whsec_ followed by padded standard Base64 of 24 to 64 bytes"],
      [["--secret-file", empty], {}, "--secret-file names an empty file"],
      [["--secret-file", join(directory, "missing")], {}, `Can't read ${join(directory, "missing")}`],
      [[], { CONVOHOP_WEBHOOK_SECRET_FILE: empty }, "CONVOHOP_WEBHOOK_SECRET_FILE names an empty file"],
      [[], { CONVOHOP_WEBHOOK_SECRET_FILE: join(directory, "missing") },
        "Can't read the file that CONVOHOP_WEBHOOK_SECRET_FILE names"],
    ];
    for (const [argv, env, message] of failures) {
      const result = await cli(["push", "test", ...argv], { env });
      assert.equal(result.code, 1, message);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, `convohop: ${message}\n`);
      assertNoSecrets(result, "not-a-webhook-secret");
    }
    assertUsage(await cli(["push", "test", "--secret-file", large]), "--secret-file must be at most 1024 bytes", "push test");
    assertUsage(await cli(["push", "test", "--event", "-", "--secret-file", "-"]),
      "--event and --secret-file can't both read standard input", "push test");
    assertUsage(await cli(["push", "test"], { env: { CONVOHOP_WEBHOOK_SECRET: secret, CONVOHOP_WEBHOOK_SECRET_FILE: secretFile } }),
      "Set CONVOHOP_WEBHOOK_SECRET or CONVOHOP_WEBHOOK_SECRET_FILE, not both");
  });

test("push test checks its options before it signs or sends anything", async t => {
  const { cli } = await sandbox(t);
  const cases = [
    [["--platform", "sms"], "Unknown platform sms. Use apns-alert, apns-voip, fcm or web-push"],
    [["--platform", "Web Push"], "Unknown platform. Use apns-alert, apns-voip, fcm or web-push"],
    [["--platform", "fcm", "--platform", "fcm"], "--platform fcm is given more than once"],
    [["--platform", "apns-alert"], "--platform apns-alert needs --bundle-id"],
    [["--platform", "fcm", "--platform", "apns-voip"], "--platform apns-voip needs --bundle-id"],
    [["--type", "sms"], "Unknown type sms. Use message, call or call-cancelled"],
    [["--type", "Call"], "Unknown type. Use message, call or call-cancelled"],
    [["--type", "call", "--preview-text", "Hi"], "--preview-text applies to message samples"],
    [["--reason", "declined"], "--reason applies to call-cancelled samples"],
    [["--type", "call", "--reason", "declined"], "--reason applies to call-cancelled samples"],
    [["--project", "project-1"], "--project must be a UUID"],
    [["--recipient", "recipient-1"], "--recipient must be a UUID"],
    ...[["type", "call"], ["project", randomUUID()], ["recipient", randomUUID()], ["preview-text", "Hi"], ["reason", "ended"]]
      .map(([name, value]) => [["--event", "-", `--${name}`, value], `--${name} sets up a sample; don't combine it with --event`]),
    [["--deliver", "hooks.example.com"], "--deliver is not a URL"],
    [["--deliver", "http://hooks.example.com/convohop"], "--deliver must be an https URL, or http on localhost"],
    [["--deliver", "ftp://localhost/convohop"], "--deliver must be an https URL, or http on localhost"],
    [["--deliver", "https://hook-user:hook-password@hooks.example.com/convohop"],
      "--deliver must not contain a user name or password"],
    [["--deliver", "https://hooks.example.com/convohop"], "--deliver needs the endpoint's secret: set --secret-file, " +
      "CONVOHOP_WEBHOOK_SECRET or CONVOHOP_WEBHOOK_SECRET_FILE"],
  ];
  for (const [argv, message] of cases) {
    const result = await cli(["push", "test", ...argv], { stdin: stdinOf("{}") });
    assertUsage(result, message, "push test");
    assert.deepEqual(result.sent, []);
    assert.ok(!result.stderr.includes("hook-password"));
  }
});

/** A webhook endpoint on 127.0.0.1 that keeps each delivery and answers it with the next status. */
async function endpointServer(t, statuses) {
  const received = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      received.push({ method: request.method, url: request.url, headers: request.headers, body: Buffer.concat(chunks) });
      const status = statuses.shift() ?? 500;
      response.writeHead(status, status === 302 ? { location: "/redirected" } : {}).end();
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  return { origin: `http://127.0.0.1:${server.address().port}`, received };
}

test("push test --deliver posts the signed delivery, which webhooks.verify accepts, and never prints the URL", async t => {
  const { cli, secret, secretFile } = await withSecret(t);
  const endpoint = await endpointServer(t, [204, 500, 302]);
  const vector = document.vectors[0], now = new Date(vector.nowSeconds * 1000), body = JSON.stringify(vector.event);
  const target = `${endpoint.origin}/convohop/hooks?token=hook-query-token#fragment`;
  const deliver = () => cli(["push", "test", "--event", "-", "--secret-file", secretFile, "--deliver", target],
    { stdin: stdinOf(body), now: () => now, fetch: globalThis.fetch });
  const assertQuiet = result => {
    for (const text of ["hook-query-token", "127.0.0.1", "/convohop/hooks"])
      assert.ok(!result.stdout.includes(text) && !result.stderr.includes(text), `output contains ${text}`);
    assertNoSecrets(result, secret);
  };

  const result = await deliver();
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.delivery, { status: 204, ok: true });
  assert.equal(output.webhook.secretSource, "file");
  assert.deepEqual(output.payloads, { fcm: vector.expected.fcm, webPush: vector.expected.webPush });
  assertQuiet(result);
  const [delivery] = endpoint.received;
  assert.equal(delivery.method, "POST");
  assert.equal(delivery.url, "/convohop/hooks?token=hook-query-token");
  assert.equal(delivery.headers["content-type"], "application/json");
  assert.equal(delivery.headers["webhook-id"], output.webhook.id);
  assert.equal(delivery.headers["webhook-timestamp"], String(output.webhook.timestamp));
  assert.equal(delivery.body.toString("utf8"), body, "the endpoint gets the exact bytes that were signed");
  const verified = await webhooks.verify({ headers: delivery.headers, body: delivery.body, secrets: secret, now });
  assert.deepEqual(verified.event, { ...vector.event, known: true });

  for (const status of [500, 302]) {
    const failed = await deliver();
    assert.equal(failed.code, 1);
    assert.deepEqual(JSON.parse(failed.stdout).delivery, { status, ok: false });
    assert.equal(failed.stderr, `convohop: The endpoint answered HTTP ${status}\n`);
    assertQuiet(failed);
  }
  assert.equal(endpoint.received.length, 3, "a redirect isn't followed");
});

test("push test --deliver reports an endpoint it can't reach or that doesn't answer, and stops when interrupted",
  async t => {
    const { cli, secret, secretFile } = await withSecret(t);
    const closed = await new Promise(resolve => {
      const server = createServer().listen(0, "127.0.0.1", () => {
        const { port } = server.address();
        server.close(() => resolve(port));
      });
    });
    const run = (url, options) => cli(["push", "test", "--secret-file", secretFile, "--deliver", url], { now: () => NOW, ...options });
    const unreachable = await run(`http://127.0.0.1:${closed}/hooks?token=hook-query-token`, { fetch: globalThis.fetch });
    assert.equal(unreachable.code, 1);
    assert.equal(unreachable.stdout, "");
    assert.equal(unreachable.stderr, "convohop: Can't reach the endpoint\n");

    const calls = [];
    const slow = await run("https://hooks.example.com/convohop?token=hook-query-token", {
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    });
    assert.equal(slow.code, 1);
    assert.equal(slow.stdout, "");
    assert.equal(slow.stderr, "convohop: The endpoint didn't answer within 12 seconds\n");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://hooks.example.com/convohop?token=hook-query-token");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.redirect, "manual");
    assert.ok(calls[0].init.signal instanceof AbortSignal);

    const controller = new AbortController();
    const interrupted = await run("https://hooks.example.com/convohop", {
      signal: controller.signal,
      fetch: async () => {
        controller.abort();
        throw new DOMException("This operation was aborted", "AbortError");
      },
    });
    assert.equal(interrupted.code, 130);
    assert.equal(interrupted.stdout, "");
    assert.equal(interrupted.stderr, "convohop: Interrupted\n");
    for (const result of [unreachable, slow, interrupted]) {
      assert.ok(!result.stderr.includes("hook-query-token"));
      assertNoSecrets(result, secret);
    }
  });
