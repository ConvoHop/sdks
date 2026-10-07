import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { buildAssets } from '../../scripts/release/assets.mjs';
import { npmReleasePackages, REPO_ROOT, resolveReleases, sha256Sums } from '../../scripts/release/lib.mjs';
import { inspectTarball, readTarGz } from '../../scripts/release/tarball.mjs';
import { EXPECTED, fixtureRoot, packageTarball, publishableManifest, tarGz, tempDir } from './helpers.mjs';

test('buildAssets packs every public package with only publishable files', async (t) => {
  const out = tempDir(t);
  const packages = await buildAssets({ out });
  assert.deepEqual(packages, npmReleasePackages(REPO_ROOT));
  assert.deepEqual(
    packages.map((pkg) => pkg.name),
    ['@convohop/core', '@convohop/client', '@convohop/server'],
  );
  for (const pkg of packages) {
    const dir = join(out, pkg.component);
    assert.deepEqual(readdirSync(dir).sort(), ['SHA256SUMS', pkg.sbom, pkg.tarball].sort());
    const tarball = readFileSync(join(dir, pkg.tarball));
    const sbom = readFileSync(join(dir, pkg.sbom));
    assert.equal(
      readFileSync(join(dir, 'SHA256SUMS'), 'utf8'),
      sha256Sums([
        { name: pkg.tarball, data: tarball },
        { name: pkg.sbom, data: sbom },
      ]),
    );
    const files = readTarGz(tarball).map((entry) => entry.name.replace(/^package\//, ''));
    for (const required of ['package.json', 'README.md', 'LICENSE', 'NOTICE', 'dist/index.js', 'dist/index.d.ts']) {
      assert.ok(files.includes(required), `${pkg.tarball} is missing ${required}`);
    }
    for (const file of files) {
      assert.ok(
        ['package.json', 'README.md', 'LICENSE', 'NOTICE', 'CHANGELOG.md'].includes(file) || file.startsWith('dist/'),
        `${pkg.tarball} must not contain ${file}`,
      );
      assert.doesNotMatch(file, /\.tsbuildinfo$|(^|\/)(src|test)\//, `${pkg.tarball} must not contain ${file}`);
    }
    const parsed = JSON.parse(sbom);
    assert.equal(parsed.metadata.component.name, pkg.name.split('/')[1]);
  }
  await assert.rejects(buildAssets({ out }), /is not empty/);
});

const CONFIG = {
  'release-type': 'node',
  packages: {
    'packages/core': { component: 'core' },
    'packages/client': { component: 'client' },
    'packages/python': { component: 'python', 'release-type': 'python' },
  },
};

function releaseRoot(t, { coreVersion = '0.2.0', manifestCore = '0.2.0' } = {}) {
  return fixtureRoot(t, {
    config: CONFIG,
    manifest: { 'packages/core': manifestCore, 'packages/client': '0.2.1', 'packages/python': '0.1.0' },
    packages: {
      'packages/core': { name: '@convohop/core', version: coreVersion },
      'packages/client': { name: '@convohop/client', version: '0.2.1', dependencies: { '@convohop/core': coreVersion } },
      'packages/python': { name: 'not-npm', version: '0.1.0' },
    },
  });
}

test('resolveReleases checks releases against the release commit', (t) => {
  const root = releaseRoot(t);
  const releases = resolveReleases(
    root,
    JSON.stringify([
      { path: 'packages/client', version: '0.2.1', tag: 'client-v0.2.1' },
      { path: 'packages/core', version: '0.2.0', tag: 'core-v0.2.0' },
    ]),
  );
  assert.deepEqual(
    releases.map((pkg) => [pkg.name, pkg.tag, pkg.tarball, pkg.sbom]),
    [
      ['@convohop/core', 'core-v0.2.0', 'convohop-core-0.2.0.tgz', 'convohop-core-0.2.0.cdx.json'],
      ['@convohop/client', 'client-v0.2.1', 'convohop-client-0.2.1.tgz', 'convohop-client-0.2.1.cdx.json'],
    ],
  );
  const core = (fields) => JSON.stringify([{ path: 'packages/core', version: '0.2.0', tag: 'core-v0.2.0', ...fields }]);
  assert.throws(() => resolveReleases(root, core({ tag: 'v0.2.0' })), /should be tagged core-v0.2.0/);
  assert.throws(() => resolveReleases(root, core({ version: '0.3.0', tag: 'core-v0.3.0' })), /package.json is 0.2.0/);
  assert.throws(() => resolveReleases(root, core({ path: 'packages/server' })), /not in release-please-config/);
  assert.throws(() => resolveReleases(root, `[${core().slice(1, -1)},${core().slice(1, -1)}]`), /twice/);
  assert.throws(() => resolveReleases(root, '[]'), /non-empty/);
  assert.throws(() => resolveReleases(root, 'nope'), /not valid JSON/);
  assert.throws(() => resolveReleases(releaseRoot(t, { manifestCore: '0.1.0' }), core()), /manifest/);
});

test('resolveReleases refuses packages release.yml cannot build', (t) => {
  const root = releaseRoot(t);
  const release = JSON.stringify([{ path: 'packages/python', version: '0.1.0', tag: 'python-v0.1.0' }]);
  assert.throws(() => resolveReleases(root, release), /release-type python/);
});

test('inspectTarball accepts a minimal publishable package', () => {
  const { files, problems } = inspectTarball(packageTarball(), EXPECTED);
  assert.deepEqual(problems, []);
  assert.deepEqual(files, ['LICENSE', 'NOTICE', 'README.md', 'dist/index.d.ts', 'dist/index.js', 'package.json']);
});

test('inspectTarball rejects sources, tests, build info and secrets', () => {
  const extra = ['src/index.ts', 'test/client.test.mjs', 'dist/.tsbuildinfo', 'tsconfig.json', '.npmrc', '.env', 'docs/guide.md'];
  const { problems } = inspectTarball(
    packageTarball({ extra: extra.map((name) => ({ name: `package/${name}`, data: 'x' })) }),
    EXPECTED,
  );
  for (const name of extra) assert.ok(problems.some((problem) => problem.startsWith(`${name}:`)), `${name}: ${problems}`);
});

test('inspectTarball requires LICENSE, NOTICE, README and every export target', () => {
  const missing = inspectTarball(packageTarball({ omit: ['LICENSE', 'NOTICE', 'README.md', 'dist/index.js'] }), EXPECTED);
  for (const problem of ['LICENSE: missing', 'NOTICE: missing', 'README.md: missing', 'dist/index.js: referenced by package.json but not packed']) {
    assert.ok(missing.problems.includes(problem), `${problem}: ${missing.problems}`);
  }
  const changed = inspectTarball(packageTarball(), { ...EXPECTED, license: Buffer.from('MIT'), requireChangelog: true });
  assert.ok(changed.problems.includes('LICENSE: differs from the repository LICENSE'));
  assert.ok(changed.problems.includes('CHANGELOG.md: missing'));
  const wildcard = publishableManifest({ exports: { './*': './dist/*.js', './missing/*': './lib/*.js' } });
  assert.deepEqual(inspectTarball(packageTarball({ manifest: wildcard }), EXPECTED).problems, [
    'lib/*.js: referenced by package.json but not packed',
  ]);
});

test('inspectTarball checks the published package.json', () => {
  const manifest = publishableManifest({
    version: '1.2.4',
    private: true,
    license: 'MIT',
    publishConfig: { access: 'restricted', registry: 'https://npm.example.com/' },
    repository: { type: 'git', url: 'git+https://github.com/example/fork.git', directory: 'packages/other' },
    dependencies: { '@convohop/core': '^1.0.0', '@convohop/internal': '1.0.0', leftpad: 'github:example/leftpad' },
    peerDependencies: { '@convohop/core': 'workspace:*' },
  });
  const { problems } = inspectTarball(packageTarball({ manifest }), EXPECTED);
  for (const pattern of [
    /version is 1.2.4/,
    /is private/,
    /access must be "public"/,
    /provenance must be true/,
    /registry must not be set/,
    /license must be Apache-2.0/,
    /repository.url/,
    /repository.directory/,
    /dependencies.@convohop\/core is \^1.0.0, expected exactly 1.0.0/,
    /dependencies.@convohop\/internal is not a released package/,
    /dependencies.leftpad is not a registry dependency/,
    /peerDependencies.@convohop\/core is not a registry dependency/,
  ]) {
    assert.ok(problems.some((problem) => pattern.test(problem)), `${pattern}: ${problems}`);
  }
});

test('inspectTarball keeps prerelease internal dependencies out of stable releases', () => {
  const internalVersions = { '@convohop/core': '0.3.0-rc.1' };
  const check = (version) =>
    inspectTarball(
      packageTarball({ manifest: publishableManifest({ version, dependencies: { '@convohop/core': '0.3.0-rc.1' } }) }),
      { ...EXPECTED, version, internalVersions },
    ).problems;
  assert.deepEqual(check('0.2.1'), ['dependencies.@convohop/core is prerelease 0.3.0-rc.1, so 0.2.1 must be a prerelease too']);
  assert.deepEqual(check('0.2.1+build.7'), [
    'dependencies.@convohop/core is prerelease 0.3.0-rc.1, so 0.2.1+build.7 must be a prerelease too',
  ]);
  assert.deepEqual(check('0.3.0-rc.1'), []);
});

test('inspectTarball rejects links and paths outside package/', () => {
  const { problems } = inspectTarball(
    packageTarball({
      extra: [
        { name: 'package/dist/link.js', type: '2' },
        { name: 'other/file.js', data: 'x' },
        { name: 'package/../escape.js', data: 'x' },
      ],
    }),
    EXPECTED,
  );
  assert.ok(problems.includes('package/dist/link.js: unexpected tar entry type 2'));
  assert.ok(problems.includes('other/file.js: outside the package/ directory'));
  assert.ok(problems.includes('package/../escape.js: outside the package/ directory'));
});

test('readTarGz reads ustar prefixes, pax paths and GNU long names', () => {
  const long = `package/dist/${'nested/'.repeat(20)}index.js`;
  const entries = readTarGz(
    tarGz([
      { name: 'index.js', prefix: 'package/dist/prefixed', data: 'a' },
      { name: 'truncated', pax: { path: long }, data: 'b' },
      { name: 'truncated', longName: `${long}.map`, data: 'c' },
      { name: 'package/dist', type: '5' },
    ]),
  );
  assert.deepEqual(
    entries.map((entry) => [entry.name, entry.type, entry.data.toString()]),
    [
      ['package/dist/prefixed/index.js', '0', 'a'],
      [long, '0', 'b'],
      [`${long}.map`, '0', 'c'],
      ['package/dist', '5', ''],
    ],
  );
  assert.throws(() => readTarGz(Buffer.from('not gzip')), /incorrect header check|unknown compression/i);
});
