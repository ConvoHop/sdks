import test from "node:test";
import assert from "node:assert/strict";
import * as client from "@convohop/client";
import * as core from "@convohop/core";
import * as internal from "@convohop/core/internal";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

test("client runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(client), [
    "ConversationHandle", "ConversationLive", "LiveEndOperation", "LiveParticipationHandle", "LiveSessionHandle",
    "LiveStartOperation", "ScopeRequiredProblem", "V1Client", "V1MediaConnection", "V1Problem", "V1Realtime",
    "V1Transport", "v1Conversation", "v1Counter", "v1Cursor", "v1Id", "v1Membership", "v1Message", "v1Operations",
    "v1Page", "v1Record", "v1SearchHit", "v1String",
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
