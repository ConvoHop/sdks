import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import test from 'node:test';

import { readJson, readPackageManifest, REPO_ROOT } from '../../scripts/release/lib.mjs';
import { createSbom, purl } from '../../scripts/release/sbom.mjs';

const lock = readJson(join(REPO_ROOT, 'package-lock.json'));
const DEV_ONLY = ['typescript', '@types/node', 'publint', '@arethetypeswrong/cli', 'graphql'];

function names(sbom) {
  return sbom.components.map((component) => (component.group ? `${component.group}/${component.name}` : component.name));
}

function checkGraph(sbom) {
  const refs = new Set(sbom.components.map((component) => component['bom-ref']));
  refs.add(sbom.metadata.component['bom-ref']);
  assert.equal(sbom.dependencies.length, refs.size);
  for (const { ref, dependsOn } of sbom.dependencies) {
    assert.ok(refs.has(ref), ref);
    for (const dependency of dependsOn) assert.ok(refs.has(dependency), `${ref} -> ${dependency}`);
  }
}

test('SBOMs cover each package runtime closure and nothing else', () => {
  // A name that's no longer installed would make the exclusion check below pass vacuously.
  for (const name of DEV_ONLY) {
    assert.equal(lock.packages[`node_modules/${name}`]?.dev, true, `${name} is not a locked dev dependency; update DEV_ONLY`);
  }
  const core = createSbom({ lock, path: 'packages/core' });
  assert.deepEqual(core.components, []);
  const server = createSbom({ lock, path: 'packages/server' });
  assert.deepEqual(names(server), ['@convohop/core']);
  const client = createSbom({ lock, path: 'packages/client' });
  for (const name of ['@convohop/core', 'livekit-client', 'tslib']) assert.ok(names(client).includes(name), name);
  for (const sbom of [core, server, client]) {
    checkGraph(sbom);
    for (const name of [...DEV_ONLY, '@convohop/server', '@convohop/client']) {
      assert.ok(!names(sbom).includes(name), `${sbom.metadata.component.name} must not list ${name}`);
    }
  }
  const direct = Object.keys(readPackageManifest(REPO_ROOT, 'packages/client').dependencies).map((name) => {
    const entry = lock.packages[`node_modules/${name}`];
    return purl(name, (entry.link ? lock.packages[entry.resolved] : entry).version);
  });
  assert.deepEqual(client.dependencies.find(({ ref }) => ref === client.metadata.component['bom-ref']).dependsOn, direct.sort());
});

test('SBOMs are deterministic and identify the tarball', () => {
  const tarball = Buffer.from('tarball bytes');
  const first = createSbom({ lock, path: 'packages/client', tarball });
  assert.deepEqual(createSbom({ lock, path: 'packages/client', tarball }), first);
  assert.notEqual(createSbom({ lock, path: 'packages/client', tarball: Buffer.from('other') }).serialNumber, first.serialNumber);
  // actions/attest only recognizes CycloneDX documents with these three fields.
  assert.equal(first.bomFormat, 'CycloneDX');
  assert.equal(first.specVersion, '1.5');
  assert.match(first.serialNumber, /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(first.metadata.timestamp, undefined);
  assert.deepEqual(first.metadata.component.hashes, [
    { alg: 'SHA-256', content: createHash('sha256').update(tarball).digest('hex') },
    { alg: 'SHA-512', content: createHash('sha512').update(tarball).digest('hex') },
  ]);
  assert.equal(first.metadata.component.purl, 'pkg:npm/%40convohop/client@0.1.0');
});

const integrity = `sha512-${createHash('sha512').update('a').digest('base64')}`;

function syntheticLock(rootDependencies, packages) {
  return {
    packages: {
      'packages/app': { name: '@convohop/app', version: '1.0.0', license: 'Apache-2.0', ...rootDependencies },
      ...packages,
    },
  };
}

test('SBOMs follow Node.js resolution through the lockfile', () => {
  const sbom = createSbom({
    lock: syntheticLock(
      { dependencies: { a: '^1.0.0', '@convohop/lib': '1.0.0' }, optionalDependencies: { gone: '*' }, peerDependencies: { peer: '*' } },
      {
        'node_modules/a': {
          version: '1.0.0',
          license: '(MIT OR Apache-2.0)',
          integrity,
          resolved: 'https://registry.npmjs.org/a/-/a-1.0.0.tgz',
          dependencies: { b: '^2.0.0' },
        },
        'node_modules/a/node_modules/b': { version: '2.0.0', license: 'SEE LICENSE IN LICENSE.txt' },
        'node_modules/b': { version: '1.0.0', license: 'MIT' },
        'node_modules/@convohop/lib': { resolved: 'packages/lib', link: true },
        'packages/lib': { name: '@convohop/lib', version: '1.0.0', license: 'Apache-2.0', devDependencies: { b: '*' } },
      },
    ),
    path: 'packages/app',
  });
  assert.deepEqual(
    sbom.components.map((component) => component.purl),
    ['pkg:npm/%40convohop/lib@1.0.0', 'pkg:npm/a@1.0.0', 'pkg:npm/b@2.0.0'],
  );
  const [lib, a, b] = sbom.components;
  assert.equal(lib.group, '@convohop');
  assert.deepEqual(lib.licenses, [{ license: { id: 'Apache-2.0' } }]);
  assert.deepEqual(a.licenses, [{ expression: '(MIT OR Apache-2.0)' }]);
  assert.deepEqual(a.hashes, [{ alg: 'SHA-512', content: createHash('sha512').update('a').digest('hex') }]);
  assert.deepEqual(a.externalReferences, [{ type: 'distribution', url: 'https://registry.npmjs.org/a/-/a-1.0.0.tgz' }]);
  assert.deepEqual(b.licenses, [{ license: { name: 'SEE LICENSE IN LICENSE.txt' } }]);
  assert.deepEqual(
    sbom.dependencies.find(({ ref }) => ref === 'pkg:npm/a@1.0.0').dependsOn,
    ['pkg:npm/b@2.0.0'],
  );
});

test('SBOMs fail on unresolvable runtime dependencies', () => {
  assert.throws(
    () => createSbom({ lock: syntheticLock({ dependencies: { missing: '1.0.0' } }, {}), path: 'packages/app' }),
    /cannot resolve missing/,
  );
  assert.throws(() => createSbom({ lock: syntheticLock({}, {}), path: 'packages/other' }), /no workspace entry/);
  assert.throws(
    () =>
      createSbom({
        lock: syntheticLock({ dependencies: { x: '*' } }, { 'node_modules/x': { resolved: 'packages/x', link: true } }),
        path: 'packages/app',
      }),
    /links node_modules\/x to missing packages\/x/,
  );
});

test('purl encodes scoped names and versions', () => {
  assert.equal(purl('@convohop/core', '0.1.0'), 'pkg:npm/%40convohop/core@0.1.0');
  assert.equal(purl('livekit-client', '2.0.0-rc.1+build'), 'pkg:npm/livekit-client@2.0.0-rc.1%2Bbuild');
});
