import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { builtImportSpecifiers } from "../../../test/package-fixtures.mjs";

test("built-import scan reports every import form and ignores string data", async () => {
  const dist = await mkdtemp(join(tmpdir(), "convohop-import-scan-"));
  try {
    await mkdir(join(dist, "generated"));
    await writeFile(join(dist, "imports.js"), [
      'import a from "default-import";',
      "import { b, c as d } from 'named-import';",
      'import {\n  e,\n  f,\n} from "multiline-import";',
      'import * as g from "namespace-import";',
      'import h, { from } from "mixed-import";',
      'import "side-effect-import";',
      'export * from "star-export";',
      'export * as i from "namespace-export";',
      'export { j } from "named-export"; export { k } from "same-line-export";',
      'const l = await import("dynamic-import");',
      "const m = () => import (\n  'spaced-dynamic-import'\n);",
      'import n from "./relative.js";',
      "",
    ].join("\n"));
    await writeFile(join(dist, "generated", "data.js"), [
      "export const shapes = {",
      '    "Range": { "from": "String!", "to": "String!", "import": "String!" },',
      '    "inputFields": [',
      '        "from",',
      '        "to"',
      "    ],",
      "};",
      'export const query = "query Q($from: String) { usage(from: $from) { from to } }";',
      'export const letters = Array.from("abc");',
      "",
    ].join("\n"));

    const imports = ["imports.js"];
    assert.deepEqual(await builtImportSpecifiers(pathToFileURL(`${dist}/`)), new Map([
      ["default-import", imports], ["named-import", imports], ["multiline-import", imports],
      ["namespace-import", imports], ["mixed-import", imports], ["side-effect-import", imports],
      ["star-export", imports], ["namespace-export", imports], ["named-export", imports],
      ["same-line-export", imports], ["dynamic-import", imports], ["spaced-dynamic-import", imports],
    ]));
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});
