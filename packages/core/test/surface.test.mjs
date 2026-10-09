import test from "node:test";
import assert from "node:assert/strict";
import * as core from "@convohop/core";
import * as internal from "@convohop/core/internal";
import * as generated from "@convohop/core/internal/generated";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

const publicValues = [
  "ConvoHopProblem", "ConvoHopTransport", "ScopeRequiredProblem", "operationCatalog", "parseConversation",
  "parseCounter", "parseCursor", "parseId", "parseMembership", "parseMessage", "parseObject", "parsePage",
  "parseSearchHit", "parseString",
];
const internalValues = [
  "authenticatedTransport", "canonical", "currentSession", "eventPage", "jsonClone", "origin", "parseURL", "randomUUID", "route",
  "sameSession", "sessionExpiry", "sessionMetadata", "timestamp", "validateOutput", "validatePlatform",
];

test("public core exports are pinned and exclude implementation helpers", () => {
  assert.deepEqual(sortedKeys(core), publicValues);
  assert.deepEqual(sortedKeys(internal), internalValues);
  for (const name of internalValues) assert.equal(Object.hasOwn(core, name), false, name);
});

test("flat generated types are type-only and kept behind the internal entry point", () => {
  assert.deepEqual(sortedKeys(generated), []);
});

test("built modules are reachable only through the exports map", async () => {
  for (const path of ["dist/index.js", "dist/protocol.js", "dist/generated/operations.js", "src/index.ts"]) {
    await assert.rejects(import(`@convohop/core/${path}`), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" }, path);
  }
});

test("core is isomorphic: built JavaScript has no Node, media or sibling-package imports", async () => {
  assert.deepEqual([...await builtImportSpecifiers(new URL("../dist/", import.meta.url))], []);
});
