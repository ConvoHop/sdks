import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const runs = new Map();
function run(runtime) {
  if (runs.has(runtime)) return runs.get(runtime);
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const child = spawnSync(process.execPath, [fileURLToPath(new URL("bare-runtime.mjs", import.meta.url))],
    { env: { ...env, CONVOHOP_RUNTIME: runtime }, encoding: "utf8", timeout: 30_000 });
  assert.equal(child.status, 0, `The ${runtime} runtime failed:\n${child.stderr}`);
  runs.set(runtime, JSON.parse(child.stdout));
  return runs.get(runtime);
}

test("on createPlatform, without the globals Hermes lacks, the client sends and fingerprints as on Web Crypto", () => {
  const bare = run("bare"), full = run("full");
  assert.equal(bare.refused, "This runtime's URL is not WHATWG-conformant; pass a conforming platform.URL");
  for (const result of [bare, full]) {
    assert.equal(result.sent, "sent");
    assert.deepEqual(result.outbox, ["sent"]);
    assert.equal(result.fingerprints.length, 2);
    assert.ok(result.sdkResolved, "the resolve hook saw the SDK load");
    assert.deepEqual(result.livekit, [], "only @convohop/react-native/media loads LiveKit");
  }
  assert.deepEqual(bare.fingerprints, full.fingerprints, "the platform's SHA-256 and the core's UTF-8 match Web Crypto and TextEncoder");
  for (const id of bare.requestIds) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.ok(bare.nativeRandom >= bare.requestIds.length, "request IDs come from the native generator");
  assert.equal(full.nativeRandom, 0);
  assert.deepEqual(bare.pushed.map(result => result.kind), ["message", "message", "ring", "ring", "stopRinging"]);
  assert.deepEqual(bare.pushed, full.pushed, "APNs and FCM payloads parse the same without the globals");
});

test("@convohop/react's hooks load without the globals Hermes lacks, and without react-dom", () => {
  const { hooks, reactDom } = run("bare");
  assert.equal(hooks, "function");
  // react-dom is installed here as a peer of a LiveKit package, so an import of it would still resolve.
  assert.deepEqual(reactDom, [], "@convohop/react imports no react-dom");
});
