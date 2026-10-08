import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ConvoHopProblem, ConvoHopTransport } from "@convohop/core";
import { jsonClone, parseURL, randomUUID, validatePlatform } from "@convohop/core/internal";
import { reply } from "../../../test/graphql-fixtures.mjs";

const projectId = crypto.randomUUID(), baseUrl = "http://127.0.0.1:18080";
function transport(respond, options = {}) {
  const values = new Map(), requests = [];
  const client = new ConvoHopTransport({ baseUrl, credential: "fixture-private-session", namespace: crypto.randomUUID(),
    incarnation: crypto.randomUUID(),
    recoveryStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    fetch: async (_url, init) => { const request = JSON.parse(init.body); requests.push(request); return respond(request); }, ...options });
  return { client, requests };
}
const typing = () => ({ conversationId: crypto.randomUUID(), isTyping: true });
const typed = request => reply(request, { status: "ok", receiptId: null, committedAt: null, replayed: null, result: { accepted: true } });
const send = () => ({ conversationId: crypto.randomUUID(), text: "héllo 👋", props: {} });
// Status "ok" lacks receipt evidence, so the mutation stays recorded as unknown with its fingerprint.
const unproven = request => reply(request, { status: "ok", result: { messageId: crypto.randomUUID() } });
const nodeDigest = data => new Uint8Array(createHash("sha256").update(data).digest());

test("a platform's shape is checked when the transport is built", () => {
  for (const [platform, message] of [
    [null, "platform must be an object"], [[], "platform must be an object"], ["platform", "platform must be an object"],
    [{ randomUUID: "id" }, "platform.randomUUID must be a function"], [{ sha256: {} }, "platform.sha256 must be a function"],
    [{ URL: "URL" }, "platform.URL must be a function"], [{ WebSocket: 1 }, "platform.WebSocket must be a function"],
    [{ connectivity: { online: true } }, "platform.connectivity must have a subscribe function"],
    [{ lifecycle: () => () => undefined }, "platform.lifecycle must have a subscribe function"],
  ]) assert.throws(() => transport(typed, { platform }), { name: "TypeError", message });
  const copy = validatePlatform({ randomUUID: () => crypto.randomUUID(), unknown: true });
  assert.ok(Object.isFrozen(copy));
  assert.deepEqual(Object.keys(copy), ["randomUUID"], "only known services are kept");
  assert.deepEqual(validatePlatform(undefined), {});
});

test("request IDs come from the platform and must be canonical lowercase UUIDs", async () => {
  const issued = [crypto.randomUUID(), crypto.randomUUID()];
  const supplied = [...issued];
  const { client, requests } = transport(typed, { platform: { randomUUID: () => supplied.shift() } });
  await client.execute("communication.typing", projectId, typing());
  await client.execute("communication.typing", projectId, typing());
  assert.deepEqual(requests.map(request => request.variables.context.requestId), issued);
  for (const id of ["0F8FAD5B-D9CB-469F-A165-70867728950E", "00000000-0000-0000-0000-000000000000", "not-a-uuid", 42, undefined]) {
    const bad = transport(typed, { platform: { randomUUID: () => id } });
    await assert.rejects(bad.client.execute("communication.typing", projectId, typing()),
      { name: "TypeError", message: "randomUUID must return a canonical lowercase UUID" });
    assert.equal(bad.requests.length, 0);
  }
  assert.match(randomUUID(), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

test("a nonconforming URL implementation is refused before it decides where credentials go", async () => {
  const fields = ["href", "origin", "protocol", "username", "password", "host", "hostname", "port", "pathname", "search", "hash"];
  function Lossy(value, base) {
    const url = new URL(value, base);
    return { ...Object.fromEntries(fields.map(key => [key, url[key]])), password: "" };
  }
  function Broken() { throw new TypeError("unsupported"); }
  for (const URLConstructor of [Lossy, Broken])
    assert.throws(() => transport(typed, { platform: { URL: URLConstructor } }),
      { name: "TypeError", message: "This runtime's URL is not WHATWG-conformant; pass a conforming platform.URL" });
  let constructed = 0;
  class Counted extends URL { constructor(...args) { super(...args); constructed++; } }
  const { client } = transport(typed, { platform: { URL: Counted } });
  assert.equal(client.baseUrl, baseUrl);
  assert.ok(constructed > 0, "a conforming platform URL is used");
  assert.throws(() => parseURL("not a url", { URL: Counted }, "Invalid realtime URL"), { name: "TypeError", message: "Invalid realtime URL" });
  assert.throws(() => transport(typed, { baseUrl: "https://example.com/path" }),
    { name: "TypeError", message: "Use an HTTPS origin, or explicit loopback HTTP for local development" });
});

test("platform.sha256 must reproduce a known digest before fingerprints use it", async () => {
  for (const sha256 of [async () => new Uint8Array(32), async () => new Uint8Array(31), async () => { throw new Error("no digest"); }]) {
    const { client, requests } = transport(unproven, { platform: { sha256 } });
    await assert.rejects(client.execute("communication.sendMessage", projectId, send()),
      { name: "TypeError", message: "platform.sha256 does not compute SHA-256" });
    assert.equal(requests.length, 0);
    assert.deepEqual(client.recoveryStates, []);
  }
  const input = send(), fingerprints = [];
  for (const platform of [undefined, { sha256: async data => nodeDigest(data) }, { sha256: async data => new Uint8Array(nodeDigest(data)).buffer }]) {
    const { client } = transport(unproven, { platform });
    await assert.rejects(client.execute("communication.sendMessage", projectId, input), { code: "INVALID_RESPONSE" });
    fingerprints.push(client.recoveryStates[0].payloadFingerprint);
  }
  assert.match(fingerprints[0], /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(new Set(fingerprints).size, 1, "a platform digest fingerprints exactly like Web Crypto");
});

test("a redirected response is an unknown outcome, not the authority's answer", async () => {
  const redirects = [{ redirected: { value: true } }, { url: { value: "https://elsewhere.example/graphql" } }];
  for (const redirect of redirects) {
    const { client } = transport(request => Object.defineProperties(unproven(request), redirect));
    const requestId = crypto.randomUUID();
    await assert.rejects(client.execute("communication.sendMessage", projectId, send(), requestId), error =>
      error instanceof ConvoHopProblem && error.code === "TRANSPORT_UNKNOWN" && error.outcome === "unknown" && error.status === 0 &&
      error.requestId === requestId && error.message === "Authority response was redirected; resolve the original request");
    assert.equal(client.recoveryStates[0].resolutionState, "unknown", "the original request stays resolvable");
  }
  const { client } = transport(request => Object.defineProperty(typed(request), "url", { value: baseUrl + "/graphql" }));
  assert.equal((await client.execute("communication.typing", projectId, typing())).status, "ok", "the authority's own URL is accepted");
});

test("protocol copies reject what JSON cannot carry before anything is sent", async () => {
  assert.deepEqual(jsonClone({ b: [1, "x", null, { c: true }], a: 1 }), { a: 1, b: [1, "x", null, { c: true }] });
  assert.throws(() => jsonClone({ a: undefined }), { name: "TypeError", message: "JSON payload cannot contain undefined values" });
  for (const value of [2 ** 53, Number.NaN, Number.POSITIVE_INFINITY])
    assert.throws(() => jsonClone([value]), { name: "TypeError", message: "Unsafe protocol number" });
  const { client, requests } = transport(unproven);
  await assert.rejects(client.execute("communication.sendMessage", projectId, { ...send(), props: { nested: undefined } }),
    { name: "TypeError", message: "JSON payload cannot contain undefined values" });
  assert.equal(requests.length, 0);
  assert.deepEqual(client.recoveryStates, []);
});
