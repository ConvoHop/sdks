import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { describeNpmPackage, loadReleaseConfig, REPO_ROOT, sri } from '../../scripts/release/lib.mjs';
import { distTag, publishArgs, publishPackages } from '../../scripts/release/publish.mjs';
import { tempDir } from './helpers.mjs';

const { config } = loadReleaseConfig(REPO_ROOT);
const core = describeNpmPackage(config, 'packages/core', '@convohop/core', '0.2.0');
const client = describeNpmPackage(config, 'packages/client', '@convohop/client', '0.3.0-beta.1');
const TARBALLS = { [core.tarball]: Buffer.from('core tarball'), [client.tarball]: Buffer.from('client tarball') };

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
  const npm = join(dir, 'npm.cjs');
  writeFileSync(npm, FAKE_NPM);
  chmodSync(npm, 0o755);
  const assets = join(dir, 'assets');
  for (const pkg of [core, client]) {
    mkdirSync(join(assets, pkg.component), { recursive: true });
    writeFileSync(join(assets, pkg.component, pkg.tarball), TARBALLS[pkg.tarball]);
  }
  const log = join(dir, 'npm.log');
  writeFileSync(log, '');
  const env = {
    ...process.env,
    GITHUB_ACTIONS: '',
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
    publishPackages({ assets, packages: [core, client], dryRun: true, requireOidc: true, env, npm, ...options });
  return { assets, calls, publish };
}

const skipOnWindows = { skip: process.platform === 'win32' && 'uses a POSIX shebang fake npm' };

test('publish arguments are always a dry run, with a dist-tag for prereleases', () => {
  assert.equal(distTag('0.2.0'), undefined);
  assert.equal(distTag('0.3.0-beta.1'), 'next');
  assert.equal(distTag('1.0.0+build-7'), undefined, 'build metadata is not a prerelease');
  assert.deepEqual(publishArgs('core.tgz', '0.2.0'), ['publish', 'core.tgz', '--dry-run', '--provenance', '--access', 'public']);
  assert.deepEqual(publishArgs('client.tgz', '0.3.0-beta.1').slice(-2), ['--tag', 'next']);
});

test('real publishing is disabled until REL-PUB', skipOnWindows, async (t) => {
  const { calls, publish } = fakeNpm(t);
  await assert.rejects(publish({ dryRun: false }), /disabled until REL-PUB/);
  await assert.rejects(publish({ dryRun: undefined }), /disabled until REL-PUB/);
  assert.deepEqual(calls(), []);
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
    ['view', '@convohop/core@0.2.0', 'dist.integrity', '--json'],
    publishArgs(join(assets, 'core', core.tarball), '0.2.0'),
    ['view', '@convohop/client@0.3.0-beta.1', 'dist.integrity', '--json'],
    publishArgs(join(assets, 'client', client.tarball), '0.3.0-beta.1'),
  ]);
});

test('published versions are skipped only when they match', skipOnWindows, async (t) => {
  const same = fakeNpm(t, { view: { '@convohop/core@0.2.0': sri(TARBALLS[core.tarball]) } });
  await same.publish();
  assert.equal(same.calls().filter(([command]) => command === 'publish').length, 1);

  const different = fakeNpm(t, { view: { '@convohop/core@0.2.0': sri(Buffer.from('other')) } });
  await assert.rejects(different.publish(), /already on npm with a different tarball/);
  const skipped = fakeNpm(t, { view: { '@convohop/core@0.2.0': sri(Buffer.from('other')) } });
  await skipped.publish({ skipPublished: true });
  assert.deepEqual(
    skipped.calls().filter(([command]) => command === 'publish').map(([, file]) => file),
    [join(skipped.assets, 'client', client.tarball)],
  );
});

test('registry and publish failures stop the job', skipOnWindows, async (t) => {
  await assert.rejects(
    fakeNpm(t, { view: { '@convohop/core@0.2.0': 'E500' } }).publish(),
    /npm view @convohop\/core@0\.2\.0 failed: E500 from the registry/,
  );
  await assert.rejects(fakeNpm(t, { publishExit: 1 }).publish(), /npm publish --dry-run failed for @convohop\/core@0\.2\.0/);
});
