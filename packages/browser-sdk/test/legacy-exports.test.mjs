import test from "node:test";
import assert from "node:assert/strict";
import * as shim from "@convohop/browser-sdk";
import * as client from "@convohop/client";
import * as internal from "@convohop/core/internal";
import { sortedKeys } from "../../../test/package-fixtures.mjs";

// Frozen runtime surface of each built module that existing consumers import by package name or dist path.
const v1 = [
  "V1Client", "V1Problem", "V1Realtime", "V1Transport", "v1Conversation", "v1Counter", "v1Cursor", "v1Id", "v1Membership",
  "v1Message", "v1Page", "v1Record", "v1SearchHit", "v1String",
];
const live = [
  "ConversationHandle", "ConversationLive", "LiveEndOperation", "LiveParticipationHandle", "LiveSessionHandle",
  "LiveStartOperation",
];
const legacy = {
  index: [...v1, ...live, "V1MediaConnection", "v1Operations"].sort(),
  v1, live,
  "v1-media": ["V1MediaConnection"],
  "v1-graphql": ["operationKey", "operationPayload", "v1GraphqlRequest", "validateOperationPayload", "validateOutput"],
  "v1-operations": ["v1Operations", "v1OutputShapes"],
  "v1-generated": [],
};
const load = module => import(new URL(`../dist/${module}.js`, import.meta.url));

test("deprecated browser-sdk keeps the frozen runtime exports of every built module", async () => {
  for (const [module, names] of Object.entries(legacy)) assert.deepEqual(sortedKeys(await load(module)), names, module);
  assert.equal(shim, await load("index"));
});

test("deprecated browser-sdk exports the same bindings as @convohop/client and core", async () => {
  for (const module of Object.keys(legacy)) {
    for (const [name, value] of Object.entries(await load(module))) {
      assert.equal(value, Object.hasOwn(client, name) ? client[name] : internal[name], `${module}.${name}`);
    }
  }
  assert.ok(new client.V1Problem("code", "request", "rejected", 400, "problem") instanceof shim.V1Problem);
});
