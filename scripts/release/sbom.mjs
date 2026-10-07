// CycloneDX 1.5 SBOMs for workspace packages, resolved from package-lock.json.
// `npm sbom --workspace` describes the monorepo root and mixes in workspace
// devDependencies, so the release pipeline builds per-package SBOMs here.
import { createHash } from 'node:crypto';

import { REPOSITORY } from './lib.mjs';

const HASH_ALGORITHMS = { sha1: 'SHA-1', sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' };
const SPDX_IDS = new Set([
  '0BSD', 'Apache-2.0', 'BlueOak-1.0.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC-BY-4.0', 'CC0-1.0',
  'ISC', 'MIT', 'MIT-0', 'MPL-2.0', 'Python-2.0', 'Unlicense', 'Zlib',
]);
const VCS = [{ type: 'vcs', url: `https://github.com/${REPOSITORY}` }];

function parentLocation(location) {
  const index = location.lastIndexOf('/node_modules/');
  return index === -1 ? '' : location.slice(0, index);
}

function packageNameAt(location) {
  const parts = location.split('node_modules/');
  return parts[parts.length - 1];
}

// Node.js module resolution over package-lock.json locations.
function resolveInLock(packages, from, name) {
  for (let base = from; ; base = parentLocation(base)) {
    const location = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
    const entry = packages[location];
    if (entry?.link) {
      const target = packages[entry.resolved];
      if (!target) throw new Error(`package-lock.json links ${location} to missing ${entry.resolved}`);
      return { location: entry.resolved, entry: target };
    }
    if (entry) return { location, entry };
    if (!base) return undefined;
  }
}

// Runtime edges: dependencies are required; optional and peer dependencies are
// included when the lockfile has them (consumers may provide peers themselves).
function runtimeEdges(entry) {
  const edges = new Map();
  for (const name of Object.keys(entry.peerDependencies ?? {})) edges.set(name, true);
  for (const name of Object.keys(entry.optionalDependencies ?? {})) edges.set(name, true);
  for (const name of Object.keys(entry.dependencies ?? {})) edges.set(name, false);
  return [...edges].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export function purl(name, version) {
  const [scope, short] = name.startsWith('@') ? name.split('/') : [undefined, name];
  const path = scope ? `${encodeURIComponent(scope)}/${encodeURIComponent(short)}` : encodeURIComponent(short);
  return `pkg:npm/${path}@${encodeURIComponent(version)}`;
}

function cdxHashes(integrity) {
  return String(integrity ?? '')
    .split(/\s+/)
    .map((value) => /^(sha1|sha256|sha384|sha512)-(.+)$/.exec(value))
    .filter(Boolean)
    .map(([, algorithm, digest]) => ({ alg: HASH_ALGORITHMS[algorithm], content: Buffer.from(digest, 'base64').toString('hex') }));
}

function cdxLicenses(license) {
  if (typeof license !== 'string' || license === '') return undefined;
  if (SPDX_IDS.has(license)) return [{ license: { id: license } }];
  if (/[()]|\s(AND|OR|WITH)\s/.test(license)) return [{ expression: license }];
  return [{ license: { name: license } }];
}

function cdxComponent(name, entry, { hashes = cdxHashes(entry.integrity), externalReferences } = {}) {
  const ref = purl(name, entry.version);
  const [group, short] = name.startsWith('@') ? name.split('/') : [undefined, name];
  const licenses = cdxLicenses(entry.license);
  const references =
    externalReferences ?? (/^https:\/\//.test(entry.resolved ?? '') ? [{ type: 'distribution', url: entry.resolved }] : []);
  return {
    type: 'library',
    'bom-ref': ref,
    ...(group ? { group } : {}),
    name: short,
    version: entry.version,
    purl: ref,
    ...(licenses ? { licenses } : {}),
    ...(hashes.length ? { hashes } : {}),
    ...(references.length ? { externalReferences: references } : {}),
  };
}

function uuidV5(name) {
  const urlNamespace = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex');
  const bytes = createHash('sha1').update(urlNamespace).update(name).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Runtime closure of the workspace package at `path` (never devDependencies).
// Deterministic for a given lockfile and tarball: no timestamps, sorted output.
export function createSbom({ lock, path, tarball }) {
  const packages = lock.packages ?? {};
  const rootEntry = packages[path];
  if (!rootEntry?.name || !rootEntry.version) throw new Error(`package-lock.json has no workspace entry for ${path}`);
  const tarballHashes = tarball
    ? ['sha256', 'sha512'].map((algorithm) => ({
        alg: HASH_ALGORITHMS[algorithm],
        content: createHash(algorithm).update(tarball).digest('hex'),
      }))
    : [];
  const root = cdxComponent(rootEntry.name, rootEntry, { hashes: tarballHashes, externalReferences: VCS });
  const components = new Map();
  const dependencies = new Map([[root['bom-ref'], new Set()]]);
  const visited = new Set([path]);
  const queue = [{ location: path, entry: rootEntry, ref: root['bom-ref'] }];
  while (queue.length > 0) {
    const { location, entry, ref } = queue.shift();
    for (const [name, optional] of runtimeEdges(entry)) {
      const resolved = resolveInLock(packages, location, name);
      if (!resolved) {
        if (optional) continue;
        throw new Error(`package-lock.json cannot resolve ${name} for ${location}`);
      }
      if (!resolved.entry.version) throw new Error(`package-lock.json has no version for ${resolved.location}`);
      const component = cdxComponent(resolved.entry.name ?? packageNameAt(resolved.location), resolved.entry);
      const dependencyRef = component['bom-ref'];
      if (dependencyRef === root['bom-ref']) continue;
      dependencies.get(ref).add(dependencyRef);
      if (!components.has(dependencyRef)) components.set(dependencyRef, component);
      if (!dependencies.has(dependencyRef)) dependencies.set(dependencyRef, new Set());
      if (!visited.has(resolved.location)) {
        visited.add(resolved.location);
        queue.push({ location: resolved.location, entry: resolved.entry, ref: dependencyRef });
      }
    }
  }
  const byRef = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const digest = tarballHashes.find((hash) => hash.alg === 'SHA-512')?.content ?? 'unpacked';
  return {
    $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${uuidV5(`${root.purl}#${digest}`)}`,
    version: 1,
    metadata: {
      lifecycles: [{ phase: 'build' }],
      tools: {
        components: [{ type: 'application', name: 'ConvoHop SDK release scripts', externalReferences: VCS }],
      },
      component: root,
    },
    components: [...components.values()].sort((a, b) => byRef(a['bom-ref'], b['bom-ref'])),
    dependencies: [...dependencies]
      .map(([ref, dependsOn]) => ({ ref, dependsOn: [...dependsOn].sort(byRef) }))
      .sort((a, b) => byRef(a.ref, b.ref)),
  };
}
