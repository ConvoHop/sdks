import test from "node:test";
import assert from "node:assert/strict";
import * as shim from "@convohop/server-sdk";
import * as server from "@convohop/server";
import { sortedKeys } from "../../../test/package-fixtures.mjs";

const legacy = ["V1ManagementClient", "V1ProjectServerClient"];

test("deprecated server-sdk keeps the frozen runtime exports of every built module", async () => {
  for (const module of ["index", "v1"]) {
    assert.deepEqual(sortedKeys(await import(new URL(`../dist/${module}.js`, import.meta.url))), legacy, module);
  }
  assert.deepEqual(sortedKeys(shim), legacy);
});

test("deprecated server-sdk exports the same bindings as @convohop/server", () => {
  for (const name of legacy) assert.equal(shim[name], server[name], name);
});
