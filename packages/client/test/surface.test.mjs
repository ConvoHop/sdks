import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as client from "@instantrelay/client";
import * as push from "@instantrelay/client/push";
import * as core from "@instantrelay/core";
import * as internal from "@instantrelay/core/internal";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

test("client runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(client), [
    "ConversationHandle", "ConversationLive", "ConversationStore", "ConversationStream", "RelayClient",
    "RelayProblem", "RelayTransport", "LiveEndOperation", "LiveParticipationHandle", "LiveSessionHandle",
    "LiveStartOperation", "MediaConnection", "Outbox", "ScopeRequiredProblem", "TypingIndicator", "operationCatalog",
    "parseConversation", "parseCounter", "parseCursor", "parseId", "parseMembership", "parseMessage", "parseObject",
    "parsePage", "parseSearchHit", "parseString",
  ].sort());
});

test("push runtime exports are pinned and import nothing, so a service worker bundles them alone", async () => {
  assert.deepEqual(sortedKeys(push), [
    "NotificationHandler", "defaultWebNotification", "handleNotification", "handleNotificationClick", "handlePushEvent",
    "parsePushNotification", "parsePushPayload", "showPushNotification", "subscribePush", "unsubscribePush",
  ]);
  for (const name of Object.keys(push)) assert.equal(Object.hasOwn(client, name), false, name);
  const source = await readFile(new URL("../dist/push.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^[ \t]*(?:import|export)\b[^;]*?\bfrom[ \t]*["']|^[ \t]*import[ \t]*["']|\bimport[ \t]*\(/m);
});

test("client re-exports the public core surface by identity and hides core internals", () => {
  for (const [name, value] of Object.entries(core)) assert.equal(client[name], value, name);
  for (const name of Object.keys(internal)) assert.equal(Object.hasOwn(client, name), false, name);
});

test("client is browser and React Native safe: built JavaScript imports no Node built-ins", async () => {
  assert.deepEqual([...(await builtImportSpecifiers(new URL("../dist/", import.meta.url))).keys()].sort(),
    ["@instantrelay/core", "@instantrelay/core/internal", "livekit-client"]);
});
