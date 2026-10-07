import assert from 'node:assert/strict';
import test from 'node:test';

import { loadReleaseConfig, REPO_ROOT } from '../../scripts/release/lib.mjs';
import { planRelease } from '../../scripts/release/plan.mjs';

const { config } = loadReleaseConfig(REPO_ROOT);
const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const MANIFEST = { 'packages/core': '0.2.0', 'packages/client': '0.2.1', 'packages/server': '0.1.0' };

function stubGitHub(commits) {
  return {
    async resolveTagCommit(tag) {
      return commits[tag];
    },
  };
}

function releasePleaseOutputs(releases, extra = {}) {
  const outputs = { releases_created: 'true', paths_released: JSON.stringify(releases.map(([path]) => path)), ...extra };
  for (const [path, version, tag, sha = SHA] of releases) {
    Object.assign(outputs, { [`${path}--version`]: version, [`${path}--tag_name`]: tag, [`${path}--sha`]: sha });
  }
  return JSON.stringify(outputs);
}

const plan = (fields, commits = { 'core-v0.2.0': SHA, 'client-v0.2.1': SHA }) =>
  planRelease({ eventName: 'push', sha: SHA, config, manifest: MANIFEST, github: stubGitHub(commits), ...fields });

test('a release-please push plans the released packages at the release commit', async () => {
  const result = await plan({
    releaseOutputs: releasePleaseOutputs([
      ['packages/core', '0.2.0', 'core-v0.2.0'],
      ['packages/client', '0.2.1', 'client-v0.2.1'],
    ]),
  });
  assert.deepEqual(result, {
    sha: SHA,
    releases: [
      { path: 'packages/core', version: '0.2.0', tag: 'core-v0.2.0' },
      { path: 'packages/client', version: '0.2.1', tag: 'client-v0.2.1' },
    ],
  });
});

test('a push plan rejects inconsistent release-please outputs', async () => {
  const core = (fields = {}) => releasePleaseOutputs([['packages/core', '0.2.0', 'core-v0.2.0']], fields);
  await assert.rejects(plan({ releaseOutputs: core({ releases_created: 'false' }) }), /did not create any releases/);
  await assert.rejects(plan({ releaseOutputs: core({ paths_released: '[]' }) }), /no released paths/);
  await assert.rejects(plan({ releaseOutputs: '{' }), /not valid JSON/);
  await assert.rejects(plan({ releaseOutputs: core(), sha: 'main' }), /must be the commit SHA/);
  await assert.rejects(
    plan({ releaseOutputs: releasePleaseOutputs([['packages/core', '0.2.0', 'v0.2.0']]) }),
    /should be tagged core-v0.2.0/,
  );
  await assert.rejects(
    plan({ releaseOutputs: releasePleaseOutputs([['packages/core', 'latest', 'core-vlatest']]) }),
    /not a semantic version/,
  );
  await assert.rejects(
    plan({ releaseOutputs: releasePleaseOutputs([['conformance', '0.1.0', 'conformance-v0.1.0']]) }),
    /not in release-please-config/,
  );
  await assert.rejects(plan({ releaseOutputs: core() }, {}), /Tag core-v0.2.0 does not exist/);
  await assert.rejects(
    plan({ releaseOutputs: releasePleaseOutputs([['packages/core', '0.2.0', 'core-v0.2.0', OTHER]]) }),
    /points to a{40}, but release-please released b{40}/,
  );
});

test('a push plan only builds releases tagged at the commit that triggered the run', async () => {
  // A later push's run can create the releases of an earlier merged release PR.
  await assert.rejects(
    plan(
      { releaseOutputs: releasePleaseOutputs([['packages/core', '0.2.0', 'core-v0.2.0', OTHER]]) },
      { 'core-v0.2.0': OTHER },
    ),
    /points to b{40}, not to a{40}.*gh workflow run release\.yml --ref core-v0\.2\.0/,
  );
});

test('a dispatch on a release tag rebuilds every release tagged at that commit', async () => {
  const dispatch = (commits, fields = {}) => plan({ eventName: 'workflow_dispatch', ...fields }, commits);
  assert.deepEqual(await dispatch({ 'core-v0.2.0': SHA, 'client-v0.2.1': SHA, 'server-v0.1.0': OTHER }), {
    sha: SHA,
    releases: [
      { path: 'packages/core', version: '0.2.0', tag: 'core-v0.2.0' },
      { path: 'packages/client', version: '0.2.1', tag: 'client-v0.2.1' },
    ],
  });
  await assert.rejects(dispatch({ 'core-v0.2.0': OTHER }), /No release tag points to a{40}/);
  await assert.rejects(dispatch({}, { manifest: { 'packages/core': '0.0.0' } }), /No release tag points/);
  await assert.rejects(plan({ eventName: 'pull_request' }), /Unsupported event/);
});

test('a plan refuses packages without a release job', async () => {
  const withPython = {
    ...config,
    packages: { ...config.packages, 'packages/python': { component: 'python', 'release-type': 'python' } },
  };
  await assert.rejects(
    planRelease({
      eventName: 'workflow_dispatch',
      sha: SHA,
      config: withPython,
      manifest: { ...MANIFEST, 'packages/python': '0.1.0' },
      github: stubGitHub({ 'python-v0.1.0': SHA }),
    }),
    /add a job for it/,
  );
});
