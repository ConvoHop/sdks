import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { createGitHub } from '../../scripts/release/github.mjs';
import { collectAssets, PREDICATE_TYPES, publishReleases, uploadAssets } from '../../scripts/release/github-release.mjs';
import { describeNpmPackage, loadReleaseConfig, REPO_ROOT, releaseAssetNames, sha256Sums } from '../../scripts/release/lib.mjs';
import { tempDir } from './helpers.mjs';

const TOKEN = 'test-token-value';
const ENV = { GH_TOKEN: TOKEN, GITHUB_REPOSITORY: 'ConvoHop/sdks', GITHUB_API_URL: 'https://api.github.test' };

function stubFetch(routes) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body });
    const route = routes.find(([method, pattern]) => method === init.method && pattern.test(url));
    if (!route) return new Response('not found', { status: 404 });
    const [, , status, body] = route;
    return new Response(body === undefined ? null : JSON.stringify(typeof body === 'function' ? body(url) : body), { status });
  };
  return { fetch, calls };
}

const release = (fields) => ({
  id: 7,
  tag_name: 'core-v0.2.0',
  draft: true,
  assets: [],
  upload_url: 'https://uploads.github.test/repos/ConvoHop/sdks/releases/7/assets{?name,label}',
  ...fields,
});

test('the GitHub client needs a token and never echoes it', async () => {
  assert.throws(() => createGitHub({ env: {}, fetch: async () => {} }), /GH_TOKEN or GITHUB_TOKEN/);
  const { fetch, calls } = stubFetch([['GET', /releases/, 500, { message: 'boom' }]]);
  const github = createGitHub({ env: ENV, fetch });
  const error = await github.listReleases().catch((caught) => caught);
  assert.match(error.message, /HTTP 500/);
  assert.ok(!error.message.includes(TOKEN));
  assert.equal(calls[0].headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(calls[0].url, 'https://api.github.test/repos/ConvoHop/sdks/releases?per_page=100&page=1');
});

test('drafts are found through the paginated release list', async () => {
  const page = (url) =>
    url.endsWith('page=1') ? Array.from({ length: 100 }, (_, id) => release({ id, tag_name: `x-v${id}.0.0` })) : [release()];
  const { fetch, calls } = stubFetch([['GET', /\/releases\?/, 200, page]]);
  const github = createGitHub({ env: ENV, fetch });
  assert.equal((await github.findUniqueDraft('core-v0.2.0')).id, 7);
  assert.equal(calls.length, 2);
  await assert.rejects(github.findUniqueDraft('core-v9.9.9'), /No GitHub Release found/);

  const published = createGitHub({ env: ENV, fetch: stubFetch([['GET', /releases/, 200, [release({ draft: false })]]]).fetch });
  await assert.rejects(published.findUniqueDraft('core-v0.2.0'), /already published/);
  assert.equal((await published.findRelease('core-v0.2.0')).draft, false);
  const duplicated = createGitHub({ env: ENV, fetch: stubFetch([['GET', /releases/, 200, [release(), release({ id: 8 })]]]).fetch });
  await assert.rejects(duplicated.findUniqueDraft('core-v0.2.0'), /2 GitHub Releases/);
  await assert.rejects(duplicated.findRelease('core-v0.2.0'), /found 2/);
});

test('uploads replace same-name assets and publishing un-drafts', async () => {
  const { fetch, calls } = stubFetch([
    ['DELETE', /\/releases\/assets\/41$/, 204],
    ['POST', /^https:\/\/uploads\.github\.test\//, 201, { id: 42 }],
    ['PATCH', /\/releases\/7$/, 200, { id: 7, draft: false }],
  ]);
  const github = createGitHub({ env: ENV, fetch });
  const draft = release({ assets: [{ id: 41, name: 'SHA256SUMS' }, { id: 40, name: 'other' }] });
  await github.uploadAsset(draft, 'SHA256SUMS', Buffer.from('sums'));
  await github.publishRelease(draft);
  await github.publishRelease(draft, { prerelease: true });
  assert.deepEqual(
    calls.map(({ method, url }) => `${method} ${url}`),
    [
      'DELETE https://api.github.test/repos/ConvoHop/sdks/releases/assets/41',
      'POST https://uploads.github.test/repos/ConvoHop/sdks/releases/7/assets?name=SHA256SUMS',
      'PATCH https://api.github.test/repos/ConvoHop/sdks/releases/7',
      'PATCH https://api.github.test/repos/ConvoHop/sdks/releases/7',
    ],
  );
  assert.equal(calls[1].headers['Content-Type'], 'application/octet-stream');
  assert.deepEqual(JSON.parse(calls[2].body), { draft: false });
  assert.deepEqual(JSON.parse(calls[3].body), { draft: false, prerelease: true });
});

test('tags resolve to commits through annotated tags', async () => {
  const sha = 'c'.repeat(40);
  const { fetch } = stubFetch([
    ['GET', /\/git\/ref\/tags\/core-v0\.2\.0$/, 200, { object: { type: 'commit', sha } }],
    ['GET', /\/git\/ref\/tags\/client-v0\.2\.0$/, 200, { object: { type: 'tag', sha: 'd'.repeat(40) } }],
    ['GET', /\/git\/tags\/d{40}$/, 200, { object: { type: 'commit', sha } }],
    ['GET', /\/git\/ref\/tags\/server-v0\.2\.0$/, 200, { object: { type: 'tree', sha } }],
  ]);
  const github = createGitHub({ env: ENV, fetch });
  assert.equal(await github.resolveTagCommit('core-v0.2.0'), sha);
  assert.equal(await github.resolveTagCommit('client-v0.2.0'), sha);
  await assert.rejects(github.resolveTagCommit('server-v0.2.0'), /does not point to a commit/);
  assert.equal(await github.resolveTagCommit('core-v9.9.9'), undefined);
});

const { config } = loadReleaseConfig(REPO_ROOT);
const core = describeNpmPackage(config, 'packages/core', '@convohop/core', '0.2.0');
const TARBALL = Buffer.from('tarball');
const TARBALL_SHA256 = createHash('sha256').update(TARBALL).digest('hex');

function bundle(predicateType, digest = TARBALL_SHA256, fields = {}) {
  const statement = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: core.tarball, digest: { sha256: digest } }],
    predicateType,
    predicate: {},
  };
  return JSON.stringify({
    mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json',
    dsseEnvelope: {
      payload: Buffer.from(JSON.stringify(statement)).toString('base64'),
      payloadType: 'application/vnd.in-toto+json',
      signatures: [],
    },
    ...fields,
  });
}

function writeReleaseFiles(
  t,
  { sums, provenance = bundle(PREDICATE_TYPES.provenance), sbom = bundle(PREDICATE_TYPES.sbom), extra } = {},
) {
  const pkg = core;
  const root = tempDir(t);
  const assets = join(root, 'assets');
  const attestations = join(root, 'attestations');
  mkdirSync(join(assets, pkg.component), { recursive: true });
  mkdirSync(join(attestations, pkg.component), { recursive: true });
  const files = { [pkg.tarball]: TARBALL, [pkg.sbom]: Buffer.from('{}') };
  for (const [name, data] of Object.entries(files)) writeFileSync(join(assets, pkg.component, name), data);
  const computed = sha256Sums(Object.entries(files).map(([name, data]) => ({ name, data })));
  writeFileSync(join(assets, pkg.component, 'SHA256SUMS'), sums ?? computed);
  writeFileSync(join(attestations, pkg.component, `${pkg.base}.provenance.sigstore.json`), provenance);
  writeFileSync(join(attestations, pkg.component, `${pkg.base}.sbom.sigstore.json`), sbom);
  if (extra) writeFileSync(join(assets, pkg.component, extra), 'x');
  return { assets, attestations };
}

test('release assets are checked before anything is uploaded', (t) => {
  const dirs = writeReleaseFiles(t);
  assert.deepEqual(
    collectAssets(core, dirs.assets, dirs.attestations).map((file) => file.name).sort(),
    releaseAssetNames(core),
  );
  const check = (options) => {
    const { assets, attestations } = writeReleaseFiles(t, options);
    return () => collectAssets(core, assets, attestations);
  };
  assert.throws(check({ sums: 'tampered' }), /SHA256SUMS does not match/);
  assert.throws(check({ extra: 'notes.txt' }), /expected/);
  assert.throws(check({ sbom: '{"mediaType":"text/plain"}' }), /sbom\.sigstore\.json is not a Sigstore bundle/);
  assert.throws(
    check({ sbom: bundle(PREDICATE_TYPES.sbom, undefined, { dsseEnvelope: { payloadType: 'text/plain', payload: '' } }) }),
    /does not sign an in-toto statement/,
  );
  assert.throws(check({ sbom: bundle(PREDICATE_TYPES.provenance) }), /expected https:\/\/cyclonedx\.org\/bom/);
  assert.throws(check({ provenance: bundle(PREDICATE_TYPES.provenance, '0'.repeat(64)) }), /does not attest sha256:/);
});

test('uploadAssets attaches every asset to each draft', async (t) => {
  const { assets, attestations } = writeReleaseFiles(t);
  const uploads = [];
  const github = {
    async findUniqueDraft(tag) {
      return release({ tag_name: tag });
    },
    async uploadAsset(draft, name) {
      uploads.push(`${draft.tag_name}/${name}`);
    },
  };
  await uploadAssets({ github, packages: [core], assets, attestations });
  assert.deepEqual(uploads.sort(), releaseAssetNames(core).map((name) => `core-v0.2.0/${name}`));

  uploads.length = 0;
  const client = describeNpmPackage(config, 'packages/client', '@convohop/client', '0.2.0');
  await assert.rejects(uploadAssets({ github, packages: [core, client], assets, attestations }), /ENOENT/);
  assert.deepEqual(uploads, [], 'nothing is uploaded when any package is incomplete');
});

test('publishReleases un-drafts only complete releases', async () => {
  const published = [];
  const complete = release({ assets: releaseAssetNames(core).map((name, id) => ({ id, name })) });
  const github = (found) => ({
    async findRelease() {
      return found;
    },
    async publishRelease(draft, options) {
      published.push([draft.id, options]);
    },
  });
  await publishReleases({ github: github(complete), packages: [core] });
  assert.deepEqual(published, [[7, { prerelease: false }]]);
  await publishReleases({ github: github({ ...complete, draft: false }), packages: [core] });
  assert.equal(published.length, 1);
  await assert.rejects(
    publishReleases({ github: github(release({ assets: [{ id: 1, name: core.tarball }] })), packages: [core] }),
    /missing .*SHA256SUMS/,
  );

  const rc = describeNpmPackage(config, 'packages/core', '@convohop/core', '0.3.0-rc.1');
  const rcDraft = release({ tag_name: rc.tag, assets: releaseAssetNames(rc).map((name, id) => ({ id, name })) });
  await publishReleases({ github: github(rcDraft), packages: [rc] });
  assert.deepEqual(published[1], [7, { prerelease: true }]);
});
