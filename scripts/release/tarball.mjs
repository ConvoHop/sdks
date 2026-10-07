// Reads npm tarballs and checks what would be published.
import { gunzipSync } from 'node:zlib';

import { INTERNAL_SCOPE, isPrerelease, LICENSE_ID, REPOSITORY_URL, RUNTIME_DEPENDENCY_FIELDS } from './lib.mjs';

function cString(buffer) {
  const end = buffer.indexOf(0);
  return buffer.subarray(0, end === -1 ? buffer.length : end).toString('utf8');
}

function parsePax(buffer) {
  const records = {};
  let offset = 0;
  while (offset < buffer.length) {
    const space = buffer.indexOf(0x20, offset);
    if (space === -1) break;
    const length = Number.parseInt(buffer.subarray(offset, space).toString('utf8'), 10);
    if (!Number.isInteger(length) || length <= 0) break;
    const record = buffer.subarray(space + 1, offset + length - 1).toString('utf8');
    const equals = record.indexOf('=');
    if (equals > 0) records[record.slice(0, equals)] = record.slice(equals + 1);
    offset += length;
  }
  return records;
}

// Minimal ustar/pax/GNU reader for gzipped npm tarballs.
export function readTarGz(buffer) {
  const tar = gunzipSync(buffer);
  const entries = [];
  let offset = 0;
  let pax = {};
  let longName;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const size = Number.parseInt(cString(header.subarray(124, 136)).trim() || '0', 8);
    if (!Number.isInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('Corrupt tar header');
    const type = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    const ustar = cString(header.subarray(257, 263)).startsWith('ustar');
    const prefix = ustar ? cString(header.subarray(345, 500)) : '';
    const body = tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      pax = parsePax(body);
      continue;
    }
    if (type === 'g') continue;
    if (type === 'L') {
      longName = cString(body);
      continue;
    }
    const shortName = cString(header.subarray(0, 100));
    const name = pax.path ?? longName ?? (prefix ? `${prefix}/${shortName}` : shortName);
    entries.push({ name, type, data: Buffer.from(body) });
    pax = {};
    longName = undefined;
  }
  return entries;
}

const ROOT_FILES = new Set(['package.json', 'README.md', 'LICENSE', 'NOTICE', 'CHANGELOG.md']);
const REQUIRED_FILES = ['package.json', 'README.md', 'LICENSE', 'NOTICE'];
const FORBIDDEN_FILES = [
  /(^|\/)src\//,
  /(^|\/)tests?\//,
  /(^|\/)__tests__\//,
  /\.test\.[cm]?[jt]sx?$/,
  /\.tsbuildinfo$/,
  /(^|\/)tsconfig[^/]*\.json$/,
  /(^|\/)\.env/,
  /(^|\/)\.npmrc$/,
];
const NON_REGISTRY_SPEC = /^(workspace|file|link|portal|patch|git|git\+[a-z]+|github|gitlab|bitbucket|https?):/;

function collectTargets(value, targets) {
  if (typeof value === 'string') targets.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectTargets(item, targets));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectTargets(item, targets));
  return targets;
}

function referencedFiles(manifest) {
  const targets = collectTargets([manifest.main, manifest.module, manifest.types, manifest.typings, manifest.bin, manifest.exports], []);
  return [...new Set(targets.map((target) => target.replace(/^\.\//, '')))].filter((target) => target !== 'package.json');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPacked(files, target) {
  if (!target.includes('*')) return files.has(target);
  const pattern = new RegExp(`^${target.split('*').map(escapeRegExp).join('.+')}$`);
  return [...files.keys()].some((file) => pattern.test(file));
}

// Checks the package.json that npm would publish.
export function checkPublishedManifest(manifest, { name, version, directory, internalVersions = {} }) {
  const problems = [];
  if (manifest.name !== name) problems.push(`package.json name is ${manifest.name}, expected ${name}`);
  if (manifest.version !== version) problems.push(`package.json version is ${manifest.version}, expected ${version}`);
  if (manifest.private === true) problems.push('package.json is private');
  if (manifest.publishConfig?.access !== 'public') problems.push('publishConfig.access must be "public"');
  if (manifest.publishConfig?.provenance !== true) problems.push('publishConfig.provenance must be true');
  if (manifest.publishConfig?.registry !== undefined) problems.push('publishConfig.registry must not be set');
  if (manifest.license !== LICENSE_ID) problems.push(`license must be ${LICENSE_ID}`);
  if (manifest.repository?.url !== REPOSITORY_URL) problems.push(`repository.url must be ${REPOSITORY_URL}`);
  if (manifest.repository?.directory !== directory) problems.push(`repository.directory must be ${directory}`);
  for (const field of RUNTIME_DEPENDENCY_FIELDS) {
    for (const [dependency, spec] of Object.entries(manifest[field] ?? {})) {
      if (NON_REGISTRY_SPEC.test(String(spec))) problems.push(`${field}.${dependency} is not a registry dependency (${spec})`);
      if (!dependency.startsWith(INTERNAL_SCOPE)) continue;
      if (!(dependency in internalVersions)) {
        problems.push(`${field}.${dependency} is not a released package`);
      } else if (spec !== internalVersions[dependency]) {
        problems.push(`${field}.${dependency} is ${spec}, expected exactly ${internalVersions[dependency]}`);
      } else if (isPrerelease(spec) && !isPrerelease(version)) {
        // A stable release would pull a prerelease into every install.
        problems.push(`${field}.${dependency} is prerelease ${spec}, so ${version} must be a prerelease too`);
      }
    }
  }
  return problems;
}

// expected: { name, version, directory, internalVersions, requireChangelog, license, notice }
export function inspectTarball(buffer, expected) {
  const problems = [];
  const files = new Map();
  for (const entry of readTarGz(buffer)) {
    if (entry.type === '5') continue;
    if (entry.type !== '0') {
      problems.push(`${entry.name}: unexpected tar entry type ${entry.type}`);
      continue;
    }
    if (!entry.name.startsWith('package/') || entry.name.split('/').includes('..')) {
      problems.push(`${entry.name}: outside the package/ directory`);
      continue;
    }
    files.set(entry.name.slice('package/'.length), entry.data);
  }
  for (const file of files.keys()) {
    if (FORBIDDEN_FILES.some((pattern) => pattern.test(file))) problems.push(`${file}: must not be published`);
    else if (!ROOT_FILES.has(file) && !file.startsWith('dist/')) problems.push(`${file}: not in the publish allowlist`);
  }
  for (const file of REQUIRED_FILES) {
    if (!files.has(file)) problems.push(`${file}: missing`);
  }
  if (expected.requireChangelog && !files.has('CHANGELOG.md')) problems.push('CHANGELOG.md: missing');
  for (const [file, contents] of [
    ['LICENSE', expected.license],
    ['NOTICE', expected.notice],
  ]) {
    if (contents !== undefined && files.has(file) && !files.get(file).equals(contents)) {
      problems.push(`${file}: differs from the repository ${file}`);
    }
  }
  let manifest;
  if (files.has('package.json')) {
    try {
      manifest = JSON.parse(files.get('package.json').toString('utf8'));
    } catch {
      problems.push('package.json: not valid JSON');
    }
  }
  if (manifest) {
    problems.push(...checkPublishedManifest(manifest, expected));
    for (const target of referencedFiles(manifest)) {
      if (!isPacked(files, target)) problems.push(`${target}: referenced by package.json but not packed`);
    }
  }
  return { files: [...files.keys()].sort(), manifest, problems };
}
