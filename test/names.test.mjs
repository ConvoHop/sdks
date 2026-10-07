// Fails when a tracked path or an exported identifier gains a version marker such as `v1`, `V2`
// or `_v3`. The policy is in CONTRIBUTING.md, "Versioning".
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

// Versions the policy keeps. Each match is removed before the marker check, so an entry covers
// only its own text. Add an entry only with the external specification or consumer that needs it.
const ALLOWED = [
  [/(?<![A-Za-z0-9])v\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?/g, "npm semver and release tags"],
  [/standard-webhooks-v1/g, "Standard Webhooks signature scheme"],
  [/(?<![A-Za-z0-9])rtc\/v1(?:\/validate)?/g, "LiveKit signalling endpoints"],
  [/(?<![A-Za-z0-9])(?:Statement|provenance)\/v1/g, "in-toto and SLSA type URIs"],
  [/(?<![A-Za-z0-9])uuidV[1-8](?![0-9])/g, "RFC 9562 UUID versions"],
];
const MARKERS = [/(?:^|[^A-Za-z0-9])[vV]\d+(?![a-z])/, /[a-z0-9]V\d+(?![a-z])/, /_[vV]\d+(?![a-z])/];

const strip = text => ALLOWED.reduce((rest, [pattern]) => rest.replace(pattern, " "), text);
const marked = text => MARKERS.some(marker => marker.test(strip(text)));

const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx|graphql)$/;
const EXPORTS = [
  /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:class|interface|type|const|let|var|function\*?|enum|namespace)\s+([A-Za-z_$][\w$]*)/g,
  /export\s+(?:type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)/g,
];
const EXPORT_LIST = /export\s+(?:type\s+)?\{([^}]*)\}/g;
const GRAPHQL_TYPE = /^\s*(?:extend\s+)?(?:type|input|enum|interface|union|scalar)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;

function exportedNames(path, text) {
  if (path.endsWith(".graphql")) return [...text.matchAll(GRAPHQL_TYPE)].map(match => match[1]);
  const names = EXPORTS.flatMap(pattern => [...text.matchAll(pattern)].map(match => match[1]));
  for (const [, list] of text.matchAll(EXPORT_LIST))
    for (const entry of list.split(",")) names.push(entry.replace(/^\s*type\s+/, "").split(/\s+as\s+/).pop().trim());
  return names.filter(Boolean);
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z", "-s"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\0").filter(Boolean).map(line => line.split("\t"))
    .filter(([meta]) => !meta.startsWith("160000")).map(([, path]) => path);
}

const POLICY = "Remove the version marker, or add a reasoned ALLOWED entry (CONTRIBUTING.md, Versioning)";

test("the marker check flags version markers and spares kept versions", () => {
  for (const name of ["schema/communication-v1.graphql", "docs/snippets/v1/a.md", "V1Client", "v1Id", "parse_v2", "ClientV3"])
    assert.equal(marked(name), true, name);
  for (const name of ["schema/communication.graphql", "release/v1.2.3-rc.1/notes.md", "standard-webhooks-v1.json",
    "mock/rtc/v1/validate.json", "provenance/v1/statement.json", "uuidV5", "IPv4", "Version", "h264", "base64"])
    assert.equal(marked(name), false, name);
});

test("tracked paths carry no version markers", () => {
  assert.deepEqual(trackedFiles().filter(marked), [], POLICY);
});

test("exported identifiers carry no version markers", () => {
  const found = trackedFiles().filter(path => SOURCE.test(path)).flatMap(path =>
    exportedNames(path, readFileSync(join(ROOT, path), "utf8")).filter(marked).map(name => `${path}: ${name}`));
  assert.deepEqual(found, [], POLICY);
});
