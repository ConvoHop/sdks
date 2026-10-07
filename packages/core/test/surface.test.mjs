import test from "node:test";
import assert from "node:assert/strict";
import * as core from "@convohop/core";
import * as internal from "@convohop/core/internal";
import * as generated from "@convohop/core/internal/generated";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

const publicValues = [
  "ScopeRequiredProblem", "V1Problem", "V1Transport", "v1Conversation", "v1Counter", "v1Cursor", "v1Id", "v1Membership",
  "v1Message", "v1Operations", "v1Page", "v1Record", "v1SearchHit", "v1String",
];
const internalValues = [
  "authenticatedTransport", "canonical", "currentSession", "eventPage", "origin", "route", "sameSession",
  "sessionExpiry", "sessionMetadata", "timestamp", "validateOutput",
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
  for (const path of ["dist/index.js", "dist/protocol.js", "dist/generated/v1-operations.js", "src/index.ts"]) {
    await assert.rejects(import(`@convohop/core/${path}`), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" }, path);
  }
});

test("core is isomorphic: built JavaScript has no Node, media or sibling-package imports", async () => {
  assert.deepEqual([...await builtImportSpecifiers(new URL("../dist/", import.meta.url))], []);
});
