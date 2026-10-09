import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function run(runtime) {
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const child = spawnSync(process.execPath, [fileURLToPath(new URL("bare-runtime.mjs", import.meta.url))],
    { env: { ...env, CONVOHOP_RUNTIME: runtime }, encoding: "utf8", timeout: 30_000 });
  assert.equal(child.status, 0, `The ${runtime} runtime failed:\n${child.stderr}`);
  return JSON.parse(child.stdout);
}

test("without browser globals, as in React Native, the client sends and fingerprints like a browser", () => {
  const bare = run("bare"), full = run("full");
  assert.equal(bare.refused, "This runtime's URL is not WHATWG-conformant; pass a conforming platform.URL");
  assert.equal(full.refused, null);
  for (const result of [bare, full]) {
    assert.equal(result.sent, "sent");
    assert.deepEqual(result.outbox, ["sent"]);
    assert.equal(result.pushed, "message");
    assert.equal(result.fingerprints.length, 2);
    assert.equal(result.livekit, false, "only a call loads livekit-client");
    if (result.hooked) assert.ok(result.sdkResolved, "the resolve hook saw the SDK load");
  }
  assert.deepEqual(bare.fingerprints, full.fingerprints, "platform SHA-256 and UTF-8 match Web Crypto and TextEncoder");
});
