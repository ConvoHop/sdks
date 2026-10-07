// Shared fixtures for the release pipeline tests.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

export function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'convohop-release-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeFiles(root, files) {
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
}

// A repository root with release-please files and package manifests.
export function fixtureRoot(t, { config, manifest, packages }) {
  const root = tempDir(t);
  writeJson(join(root, 'release-please-config.json'), config);
  writeJson(join(root, '.release-please-manifest.json'), manifest);
  for (const [path, pkg] of Object.entries(packages)) writeJson(join(root, path, 'package.json'), pkg);
  return root;
}

function octal(value, width) {
  return `${value.toString(8).padStart(width - 1, '0')}\0`;
}

function tarHeader(name, size, type, prefix = '') {
  const block = Buffer.alloc(512);
  block.write(name, 0, 100, 'utf8');
  block.write(octal(0o644, 8), 100);
  block.write(octal(0, 8), 108);
  block.write(octal(0, 8), 116);
  block.write(octal(size, 12), 124);
  block.write(octal(499162500, 12), 136);
  block.fill(0x20, 148, 156);
  block.write(type, 156);
  block.write('ustar\0', 257);
  block.write('00', 263);
  block.write(prefix, 345, 155, 'utf8');
  const checksum = block.reduce((sum, byte) => sum + byte, 0);
  block.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);
  return block;
}

function padBlock(data) {
  const remainder = data.length % 512;
  return remainder === 0 ? data : Buffer.concat([data, Buffer.alloc(512 - remainder)]);
}

function paxRecord(key, value) {
  const body = ` ${key}=${value}\n`;
  let length = body.length + 1;
  while (String(length).length + body.length !== length) length = String(length).length + body.length;
  return `${length}${body}`;
}

// entries: [{ name, data, type = '0', prefix, pax: {path}, longName }]
export function tarGz(entries) {
  const blocks = [];
  for (const entry of entries) {
    const data = Buffer.from(entry.data ?? '');
    if (entry.pax) {
      const body = Buffer.from(Object.entries(entry.pax).map(([key, value]) => paxRecord(key, value)).join(''));
      blocks.push(tarHeader('PaxHeader', body.length, 'x'), padBlock(body));
    }
    if (entry.longName) {
      const body = Buffer.from(`${entry.longName}\0`);
      blocks.push(tarHeader('././@LongLink', body.length, 'L'), padBlock(body));
    }
    blocks.push(tarHeader(entry.name, data.length, entry.type ?? '0', entry.prefix), padBlock(data));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

export const LICENSE_TEXT = 'Apache License\nVersion 2.0\n';
export const NOTICE_TEXT = 'ConvoHop SDKs\n';

export function publishableManifest(overrides = {}) {
  return {
    name: '@convohop/example',
    version: '1.2.3',
    license: 'Apache-2.0',
    type: 'module',
    repository: { type: 'git', url: 'git+https://github.com/ConvoHop/sdks.git', directory: 'packages/example' },
    exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' }, './package.json': './package.json' },
    publishConfig: { access: 'public', provenance: true },
    ...overrides,
  };
}

// A package tarball that passes inspectTarball, plus `extra` entries.
export function packageTarball({ manifest = publishableManifest(), omit = [], extra = [] } = {}) {
  const files = {
    'package/package.json': JSON.stringify(manifest),
    'package/README.md': '# Example\n',
    'package/LICENSE': LICENSE_TEXT,
    'package/NOTICE': NOTICE_TEXT,
    'package/dist/index.js': 'export {};\n',
    'package/dist/index.d.ts': 'export {};\n',
  };
  for (const name of omit) delete files[`package/${name}`];
  return tarGz([...Object.entries(files).map(([name, data]) => ({ name, data })), ...extra]);
}

export const EXPECTED = {
  name: '@convohop/example',
  version: '1.2.3',
  directory: 'packages/example',
  internalVersions: { '@convohop/core': '1.0.0' },
  license: Buffer.from(LICENSE_TEXT),
  notice: Buffer.from(NOTICE_TEXT),
};
