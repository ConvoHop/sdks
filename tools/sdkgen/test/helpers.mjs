import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildASTSchema, parse } from "graphql";
import { loadSources } from "../lib/sources.mjs";
import { codeUnitCompare } from "../lib/naming.mjs";

export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
/** The edge-case fixture: two small planes that exercise every construct the generators support. */
export const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/edge/", import.meta.url));
export const GOLDEN_ROOT = fileURLToPath(new URL("./golden/", import.meta.url));
export const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";

const SCHEMA_FILES = ["v1-annotations.schema.json", "v1-ir.schema.json"];
const REPO_SCHEMAS = {
  annotationsSchema: join(REPO_ROOT, "schema/v1-annotations.schema.json"),
  irSchema: join(REPO_ROOT, "schema/v1-ir.schema.json"),
};

export function repoSources() {
  return loadSources({ root: REPO_ROOT });
}

/**
 * Loads the edge fixture with the repository's JSON Schemas. `annotations`
 * mutates a copy of the fixture annotations; `planes` maps a plane name to a
 * function that rewrites its SDL, and `extraPlanes` adds `{ name: sdl }` planes.
 */
export function fixtureSources({ annotations, planes = {}, extraPlanes = {} } = {}) {
  const sources = loadSources({ root: FIXTURE_ROOT, paths: REPO_SCHEMAS });
  if (annotations) {
    const copy = structuredClone(sources.annotations);
    sources.annotations = annotations(copy) ?? copy;
  }
  const reparse = (plane, text) => {
    const document = parse(text);
    return { ...plane, text, document, schema: buildASTSchema(document) };
  };
  sources.planes = sources.planes.map(plane => (planes[plane.name] ? reparse(plane, planes[plane.name](plane.text)) : plane));
  for (const [name, text] of Object.entries(extraPlanes)) {
    const file = `${name}-v1.graphql`;
    sources.planes.push(reparse({ name, file, path: `schema/${file}` }, text));
  }
  return sources;
}

/** Replaces the single occurrence of `search`, failing when it occurs zero or several times. */
export function replaceOnce(text, search, replacement) {
  const parts = text.split(search);
  assert.equal(parts.length, 2, `expected exactly one occurrence of ${JSON.stringify(search)}`);
  return parts.join(replacement);
}

/** Copies the edge fixture and the repository JSON Schemas into a temporary root removed after the test. */
export function copyFixture(t) {
  const root = mkdtempSync(join(tmpdir(), "sdkgen-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(FIXTURE_ROOT, "schema"), join(root, "schema"), { recursive: true });
  for (const file of SCHEMA_FILES) cpSync(join(REPO_ROOT, "schema", file), join(root, "schema", file));
  return root;
}

export function listTree(root, directory = "") {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listTree(root, path) : [path];
  }).sort(codeUnitCompare);
}

/**
 * Compares rendered `{ path, contents }` files with test/golden/<name>.
 * UPDATE_GOLDEN=1 rewrites the golden tree instead; review the diff before committing it.
 */
export function assertGoldenTree(name, files) {
  const root = join(GOLDEN_ROOT, name);
  if (UPDATE_GOLDEN) {
    rmSync(root, { recursive: true, force: true });
    for (const file of files) {
      mkdirSync(dirname(join(root, file.path)), { recursive: true });
      writeFileSync(join(root, file.path), file.contents);
    }
    return;
  }
  const hint = "Run UPDATE_GOLDEN=1 npm run test:sdkgen and review the golden diff.";
  assert.deepEqual(listTree(root), files.map(file => file.path).sort(codeUnitCompare), `golden ${name} lists different files. ${hint}`);
  for (const file of files) {
    assert.equal(file.contents, readFileSync(join(root, file.path), "utf8"), `${file.path} differs from golden ${name}. ${hint}`);
  }
}

/** Captures CLI output lines. */
export function capture() {
  const out = [];
  const err = [];
  return { out, err, io: { out: line => out.push(line), err: line => err.push(line) } };
}
