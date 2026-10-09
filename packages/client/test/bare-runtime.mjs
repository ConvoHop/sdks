// Runs the client as React Native would, without the browser globals Node provides. Started by runtime.test.mjs, which
// compares a run without them ("bare") against one with them ("full").
import module from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const bare = process.env.CONVOHOP_RUNTIME === "bare", NodeURL = URL;
const resolved = [], hooked = typeof module.registerHooks === "function";
if (hooked) module.registerHooks({ resolve(specifier, context, next) { resolved.push(specifier); return next(specifier, context); } });
const removed = ["AggregateError", "crypto", "CustomEvent", "DOMException", "Event", "EventTarget", "navigator",
  "structuredClone", "TextDecoder", "TextEncoder", "WebSocket"];
if (bare) {
  for (const name of removed) delete globalThis[name];
  delete AbortSignal.timeout;
  delete AbortSignal.prototype.throwIfAborted;
  const left = removed.filter(name => name in globalThis);
  if (left.length || "timeout" in AbortSignal || "throwIfAborted" in AbortSignal.prototype) throw new Error(`Globals remain: ${left}`);
  // React Native defines these. Its own URL isn't WHATWG-conformant, so apps pass a polyfill's.
  globalThis.window = globalThis;
  globalThis.navigator = { product: "ReactNative" };
  globalThis.URL = class { constructor(href) { this.href = href; } };
}

// The SDK loads first, so nothing else has evaluated its modules with the globals present.
const { ConvoHopClient, Outbox } = await import("@convohop/client");
const push = await import("@convohop/client/push");
const { full } = await import("../../../test/graphql-fixtures.mjs");
const { operationCatalog } = await import("../../core/dist/generated/operations.js");

const operation = operationCatalog["communication.sendMessage"];
const projectId = "3b0b8a4e-3a51-4d8e-9c1f-0c6f0a3e2d11", principalId = "5f7e0c2a-9d14-4b6a-8e3f-2a1c4b5d6e7f";
const incarnation = "8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f", conversationId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const platform = bare ? {
  randomUUID, URL: NodeURL, sha256: async data => new Uint8Array(createHash("sha256").update(data).digest()),
} : {};
let sequence = 0;
// Node's Response needs TextDecoder, so the fake answers with the members the transport reads, as React Native's fetch has.
const fetch = async (url, init) => {
  const request = JSON.parse(init.body), now = new Date().toISOString(), at = String(++sequence);
  if (request.operationName !== operation.operationName) throw new Error(`Unexpected ${request.operationName}`);
  const body = JSON.stringify({ data: { [operation.field]: full(operation.resultType.replace(/!$/, ""), {
    status: "committed", requestId: request.variables.context.requestId, serverTime: now, receiptId: randomUUID(),
    committedAt: now, replayed: false, result: { messageId: randomUUID(), conversationId, sequence: at, revision: "1",
      status: "sent", cursor: { incarnation, conversationId, sequence: at } } }) } });
  return { ok: true, status: 200, redirected: false, url, headers: { get: () => null }, text: async () => body };
};
const options = { projectId, principalId, incarnation, sessionToken: "fixture-private-session", baseUrl: "https://chat.example.test", fetch };

let refused = null;
if (bare) {
  try { new ConvoHopClient({ ...options, platform: { randomUUID } }); }
  catch (error) { refused = error.message; }
}
const client = new ConvoHopClient({ ...options, platform });
const receipt = await client.send(conversationId, "héllo 👋\u2028", undefined, { nested: { list: [1, "two", null, true] } });
const outbox = new Outbox(client);
outbox.send(conversationId, "queued 🎈");
await outbox.flush();
outbox.close();
const { vectors } = JSON.parse(readFileSync(new NodeURL("../../../spec/push-payload/vectors.json", import.meta.url), "utf8"));
const pushed = vectors.find(vector => vector.id === "message-title").expected.webPush.request.payload;
const { kind } = push.handleNotification(pushed, Date.now());
process.stdout.write(JSON.stringify({
  refused, fingerprints: client.http.recoveryStates.map(state => state.payloadFingerprint), sent: receipt.status,
  outbox: outbox.entries.map(entry => entry.status), hooked, sdkResolved: resolved.includes("@convohop/client"),
  livekit: resolved.some(specifier => specifier === "livekit-client" || specifier.startsWith("livekit-client/")),
  pushed: kind,
}) + "\n");
