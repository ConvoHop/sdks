import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { describeNpmPackage, loadReleaseConfig, REPO_ROOT, REPOSITORY, run, sha256Sums, sri } from '../../scripts/release/lib.mjs';
import { distTag, publishArgs, publishPackages } from '../../scripts/release/publish.mjs';
import { fixtureRoot, LICENSE_TEXT, NOTICE_TEXT, packageTarball, publishableManifest, tempDir, writeFiles } from './helpers.mjs';

const { config } = loadReleaseConfig(REPO_ROOT);
const core = describeNpmPackage(config, 'packages/core', '@instantrelay/core', '0.2.0');
const client = describeNpmPackage(config, 'packages/client', '@instantrelay/client', '0.3.0-beta.1');
const MANIFESTS = Object.fromEntries([core, client].map((pkg) => [pkg.path, publishableManifest({
  name: pkg.name, version: pkg.version,
  repository: { type: 'git', url: `git+https://github.com/${REPOSITORY}.git`, directory: pkg.path },
  ...(pkg === client ? { dependencies: { [core.name]: core.version } } : {}),
})]));
const TARBALLS = Object.fromEntries([core, client].map((pkg) => [
  pkg.tarball, packageTarball({ manifest: MANIFESTS[pkg.path] }),
]));

// Answers `npm --version`, `npm view` and `npm publish` from FAKE_NPM_* and logs every call.
const FAKE_NPM = `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args) + '\\n');
if (args[0] === '--version') {
  console.log(process.env.FAKE_NPM_VERSION);
} else if (args[0] === 'view') {
  const answer = JSON.parse(process.env.FAKE_NPM_VIEW)[args[1]] ?? 'E404';
  if (answer === 'E404' || answer === 'E500') {
    console.log(JSON.stringify({ error: { code: answer, summary: answer + ' from the registry' } }));
    process.exit(1);
  }
  console.log(JSON.stringify(answer));
} else if (args[0] === 'publish') {
  process.exit(Number(process.env.FAKE_NPM_PUBLISH_EXIT ?? 0));
}
`;

function fakeNpm(t, { version = '11.6.2', view = {}, publishExit = 0, oidc = true } = {}) {
  const dir = tempDir(t);
  const root = fixtureRoot(t, {
    config: { ...config, packages: Object.fromEntries([core, client].map((pkg) => [pkg.path, config.packages[pkg.path]])) },
    manifest: Object.fromEntries([core, client].map((pkg) => [pkg.path, pkg.version])),
    packages: MANIFESTS,
  });
  writeFiles(root, { LICENSE: LICENSE_TEXT, NOTICE: NOTICE_TEXT });
  const npm = join(dir, 'npm.cjs');
  writeFileSync(npm, FAKE_NPM);
  chmodSync(npm, 0o755);
  const assets = join(dir, 'assets');
  for (const pkg of [core, client]) {
    mkdirSync(join(assets, pkg.component), { recursive: true });
    writeFileSync(join(assets, pkg.component, pkg.tarball), TARBALLS[pkg.tarball]);
    const sbom = Buffer.from('{}\n');
    writeFileSync(join(assets, pkg.component, pkg.sbom), sbom);
    writeFileSync(join(assets, pkg.component, 'SHA256SUMS'), sha256Sums([
      { name: pkg.tarball, data: TARBALLS[pkg.tarball] }, { name: pkg.sbom, data: sbom },
    ]));
  }
  const log = join(dir, 'npm.log');
  writeFileSync(log, '');
  const env = {
    ...process.env,
    GITHUB_ACTIONS: '',
    NODE_AUTH_TOKEN: '',
    NPM_TOKEN: '',
    FAKE_NPM_LOG: log,
    FAKE_NPM_VERSION: version,
    FAKE_NPM_VIEW: JSON.stringify(view),
    FAKE_NPM_PUBLISH_EXIT: String(publishExit),
    ACTIONS_ID_TOKEN_REQUEST_URL: oidc ? 'https://token.actions.test/' : '',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: oidc ? 'request-token' : '',
  };
  const calls = () =>
    readFileSync(log, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  const publish = (options = {}) =>
    publishPackages({ root, assets, packages: [core, client], dryRun: true, requireOidc: true, env, npm, ...options });
  return { root, env, assets, calls, publish };
}

const skipOnWindows = { skip: process.platform === 'win32' && 'uses a POSIX shebang fake npm' };

test('publish arguments default to a dry run and preserve provenance, registry and prerelease tags', () => {
  assert.equal(distTag('0.2.0'), undefined);
  assert.equal(distTag('0.3.0-beta.1'), 'next');
  assert.equal(distTag('1.0.0+build-7'), undefined, 'build metadata is not a prerelease');
  assert.deepEqual(publishArgs('core.tgz', '0.2.0'), [
    'publish', 'core.tgz', '--dry-run', '--provenance', '--access', 'public',
    '--ignore-scripts', '--registry', 'https://registry.npmjs.org',
  ]);
  assert.deepEqual(publishArgs('client.tgz', '0.3.0-beta.1').slice(-2), ['--tag', 'next']);
  assert.equal(publishArgs('core.tgz', '0.2.0', { dryRun: false }).includes('--dry-run'), false);
});

test('publishing requires an explicit, mutually exclusive mode', skipOnWindows, async (t) => {
  const { calls, publish } = fakeNpm(t);
  await assert.rejects(publish({ dryRun: false }), /Choose exactly one/);
  await assert.rejects(publish({ dryRun: undefined }), /Choose exactly one/);
  await assert.rejects(publish({ publish: true }), /Choose exactly one/);
  await assert.rejects(publish({ dryRun: false, publish: true, skipPublished: true }), /only for a dry run/);
  assert.deepEqual(calls(), []);
});

test('real npm publication rechecks tag, main ancestry, readiness and OIDC without a token fallback', skipOnWindows, async (t) => {
  const { root, env, calls, publish } = fakeNpm(t);
  for (const args of [
    ['init', '--quiet'], ['add', '.'],
    ['-c', 'user.name=Release fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'test: release'],
    ['tag', core.tag], ['update-ref', 'refs/remotes/origin/main', 'HEAD'],
  ]) {
    const result = await run('git', args, { cwd: root });
    assert.equal(result.code, 0, result.stderr);
  }
  const sha = (await run('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
  const approved = {
    ...env, GITHUB_REPOSITORY: REPOSITORY, GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: `refs/tags/${core.tag}`, GITHUB_SHA: sha,
    NPM_PUBLISH_ENABLED: 'true', PUBLISH_CONFIRMATION: `publish npm ${core.tag}`,
  };
  const real = (overrides = {}) => publish({ dryRun: false, publish: true, env: { ...approved, ...overrides } });
  await assert.rejects(real({ NPM_PUBLISH_ENABLED: '' }), /NPM_PUBLISH_ENABLED/);
  await assert.rejects(real({ NODE_AUTH_TOKEN: 'test-token-not-a-credential' }), /not a stored token/);
  await assert.rejects(real({ ACTIONS_ID_TOKEN_REQUEST_TOKEN: '' }), /No GitHub OIDC token/);
  assert.deepEqual(calls(), [], 'guard failures must not invoke npm');
  await real();
  assert.deepEqual(calls().filter(([command]) => command === 'publish').map((args) => args.includes('--dry-run')), [false, false]);
});

test('changed, extra, malformed and misordered assets fail before npm authentication', skipOnWindows, async (t) => {
  const changed = fakeNpm(t);
  writeFileSync(join(changed.assets, core.component, core.tarball), 'tampered');
  await assert.rejects(changed.publish(), /checksum mismatch/);
  assert.deepEqual(changed.calls(), []);
  const extra = fakeNpm(t);
  writeFileSync(join(extra.assets, core.component, 'extra.tgz'), 'unapproved');
  await assert.rejects(extra.publish(), /file set/);
  await assert.rejects(extra.publish({ packages: [client, core] }), /dependency order/);
  const malformed = fakeNpm(t);
  const data = Buffer.from('not a tarball');
  writeFileSync(join(malformed.assets, core.component, core.tarball), data);
  writeFileSync(join(malformed.assets, core.component, 'SHA256SUMS'), sha256Sums([
    { name: core.tarball, data }, { name: core.sbom, data: Buffer.from('{}\n') },
  ]));
  await assert.rejects(malformed.publish());
  assert.deepEqual(malformed.calls(), []);
});

test('the release job needs OIDC and npm 11.5.1 or later', skipOnWindows, async (t) => {
  await assert.rejects(fakeNpm(t, { oidc: false }).publish(), /No GitHub OIDC token/);
  await assert.rejects(fakeNpm(t, { version: '10.9.4' }).publish(), /needs npm 11\.5\.1 or later/);
  await fakeNpm(t, { oidc: false }).publish({ requireOidc: false });
});

test('unpublished versions are dry-run published in order', skipOnWindows, async (t) => {
  const { assets, calls, publish } = fakeNpm(t);
  await publish();
  assert.deepEqual(calls(), [
    ['--version'],
    ['view', '@instantrelay/core@0.2.0', 'dist.integrity', '--json', '--registry', 'https://registry.npmjs.org'],
    publishArgs(join(assets, 'core', core.tarball), '0.2.0'),
    ['view', '@instantrelay/client@0.3.0-beta.1', 'dist.integrity', '--json', '--registry', 'https://registry.npmjs.org'],
    publishArgs(join(assets, 'client', client.tarball), '0.3.0-beta.1'),
  ]);
});

test('published versions are skipped only when they match', skipOnWindows, async (t) => {
  const same = fakeNpm(t, { view: { '@instantrelay/core@0.2.0': sri(TARBALLS[core.tarball]) } });
  await same.publish();
  assert.equal(same.calls().filter(([command]) => command === 'publish').length, 1);

  const different = fakeNpm(t, { view: { '@instantrelay/core@0.2.0': sri(Buffer.from('other')) } });
  await assert.rejects(different.publish(), /already on npm with a different tarball/);
  const skipped = fakeNpm(t, { view: { '@instantrelay/core@0.2.0': sri(Buffer.from('other')) } });
  await skipped.publish({ skipPublished: true });
  assert.deepEqual(
    skipped.calls().filter(([command]) => command === 'publish').map(([, file]) => file),
    [join(skipped.assets, 'client', client.tarball)],
  );
});

test('registry and publish failures stop the job', skipOnWindows, async (t) => {
  await assert.rejects(
    fakeNpm(t, { view: { '@instantrelay/core@0.2.0': 'E500' } }).publish(),
    /npm view @instantrelay\/core@0\.2\.0 failed: E500 from the registry/,
  );
  await assert.rejects(fakeNpm(t, { publishExit: 1 }).publish(), /npm publish --dry-run failed for @instantrelay\/core@0\.2\.0/);
});
