import test from "node:test";
import assert from "node:assert/strict";
import * as server from "@instantrelay/server";
import * as client from "@instantrelay/client";
import * as core from "@instantrelay/core";
import * as internal from "@instantrelay/core/internal";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

test("server runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(server), [
    "RelayManagementClient", "RelayProblem", "RelayTransport", "ProjectServerClient", "PushPayloadError",
    "ScopeRequiredProblem", "WebhookVerificationError", "operationCatalog", "parseConversation", "parseCounter",
    "parseCursor", "parseId", "parseMembership", "parseMessage", "parseObject", "parsePage", "parseSearchHit",
    "parseString", "push", "webhooks",
  ].sort());
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
    ["@instantrelay/core"]);
});
