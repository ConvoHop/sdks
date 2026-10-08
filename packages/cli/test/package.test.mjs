import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as cli from "@convohop/cli";
import { builtImportSpecifiers, sortedKeys } from "../../../test/package-fixtures.mjs";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const bin = fileURLToPath(new URL(`../${manifest.bin.convohop}`, import.meta.url));

test("cli runtime exports are pinned", () => {
  assert.deepEqual(sortedKeys(cli), [
    "REDACTED", "cliOperations", "cliScopes", "cliTypes", "redact", "redactedFields", "run", "withheldOperations",
  ]);
});

test("cli built JavaScript loads only the server SDK and Node.js built-ins", async () => {
  assert.deepEqual([...(await builtImportSpecifiers(new URL("../dist/", import.meta.url))).keys()].sort(), [
    "@convohop/server", "node:child_process", "node:crypto", "node:fs", "node:fs/promises", "node:os", "node:path",
    "node:readline", "node:timers/promises",
  ]);
  assert.deepEqual(Object.keys(manifest.dependencies), ["@convohop/server"]);
  assert.equal(manifest.private, true);
});

test("the convohop binary is an executable Node.js script that reports its exit code", async t => {
  assert.deepEqual(manifest.bin, { convohop: "dist/bin.js" });
  assert.match(await readFile(bin, "utf8"), /^#!\/usr\/bin\/env node\n/);
  assert.deepEqual(manifest.sideEffects, ["./dist/bin.js"]);

  const directory = await mkdtemp(join(tmpdir(), "convohop-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const env = { PATH: process.env.PATH ?? "", CONVOHOP_CONFIG_DIR: join(directory, "config") };
  const version = spawnSync(process.execPath, [bin, "--version"], { encoding: "utf8", env, timeout: 30_000 });
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout, `${manifest.version}\n`);
  const unknown = spawnSync(process.execPath, [bin, "frobnicate"], { encoding: "utf8", env, timeout: 30_000 });
  assert.equal(unknown.status, 2);
  assert.equal(unknown.stdout, "");
  assert.equal(unknown.stderr, "convohop: Unknown command frobnicate\nRun convohop --help for usage.\n");
});
