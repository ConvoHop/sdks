import test from "node:test";
import assert from "node:assert/strict";
import * as server from "@convohop/server";
import * as client from "@convohop/client";
import * as core from "@convohop/core";
import * as internal from "@convohop/core/internal";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

test("server runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(server), [
    "ConvoHopManagementClient", "ConvoHopProblem", "ConvoHopTransport", "ProjectServerClient",
    "ScopeRequiredProblem", "WebhookVerificationError", "operationCatalog", "parseConversation",
    "parseCounter", "parseCursor", "parseId", "parseMembership", "parseMessage", "parseObject", "parsePage",
    "parseSearchHit", "parseString", "webhooks",
  ]);
});

test("server shares core bindings with the client and exposes no user-token, realtime or media API", () => {
  for (const [name, value] of Object.entries(core)) {
    assert.equal(server[name], value, name);
    assert.equal(server[name], client[name], name);
  }
  for (const name of Object.keys(client).filter(name => !Object.hasOwn(core, name))) {
    assert.equal(Object.hasOwn(server, name), false, name);
  }
  for (const name of Object.keys(internal)) assert.equal(Object.hasOwn(server, name), false, name);
});

test("server built JavaScript loads neither the client nor the media stack", async () => {
  assert.deepEqual([...(await builtImportSpecifiers(new URL("../dist/", import.meta.url))).keys()].sort(),
    ["@convohop/core"]);
});
