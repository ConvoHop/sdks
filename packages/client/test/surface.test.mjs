import test from "node:test";
import assert from "node:assert/strict";
import * as client from "@convohop/client";
import * as core from "@convohop/core";
import * as internal from "@convohop/core/internal";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

test("client runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(client), [
    "ConversationHandle", "ConversationLive", "ConversationStream", "ConvoHopClient", "ConvoHopProblem",
    "ConvoHopTransport", "LiveEndOperation", "LiveParticipationHandle", "LiveSessionHandle", "LiveStartOperation",
    "MediaConnection", "ScopeRequiredProblem", "operationCatalog", "parseConversation", "parseCounter",
    "parseCursor", "parseId", "parseMembership", "parseMessage", "parseObject", "parsePage", "parseSearchHit",
    "parseString",
  ]);
});

test("client re-exports the public core surface by identity and hides core internals", () => {
  for (const [name, value] of Object.entries(core)) assert.equal(client[name], value, name);
  for (const name of Object.keys(internal)) assert.equal(Object.hasOwn(client, name), false, name);
});

test("client is browser and React Native safe: built JavaScript imports no Node built-ins", async () => {
  assert.deepEqual([...(await builtImportSpecifiers(new URL("../dist/", import.meta.url))).keys()].sort(),
    ["@convohop/core", "@convohop/core/internal", "livekit-client"]);
});
