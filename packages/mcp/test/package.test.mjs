import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as mcp from "@convohop/mcp";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("mcp runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(mcp), [
    "REDACTED", "createConvoHopMcpServer", "mcpTools", "operationMetaKey", "redact", "redactObject", "redactedFields",
    "retryToolName", "serverOptionsFromEnvironment", "withheldOperations",
  ]);
});

test("mcp built JavaScript loads only the server SDK, the MCP server SDK and Node.js built-ins", async () => {
  assert.deepEqual([...(await builtImportSpecifiers(new URL("../dist/", import.meta.url))).keys()].sort(), [
    "@convohop/server", "@modelcontextprotocol/server", "@modelcontextprotocol/server/stdio", "node:crypto", "node:fs",
  ]);
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), ["@convohop/server", "@modelcontextprotocol/server"]);
});

test("the convohop-mcp binary is an executable Node.js script", async () => {
  assert.deepEqual(manifest.bin, { "convohop-mcp": "dist/bin.js" });
  assert.match(await readFile(new URL(`../${manifest.bin["convohop-mcp"]}`, import.meta.url), "utf8"), /^#!\/usr\/bin\/env node\n/);
  assert.deepEqual(manifest.sideEffects, ["./dist/bin.js"]);
});
