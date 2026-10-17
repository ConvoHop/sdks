import assert from 'node:assert/strict';
import { existsSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { REPOSITORY, run } from '../../scripts/release/lib.mjs';
import {
  artifactFiles,
  planFromGit,
  planRegistryRelease,
  requirePubdevPackage,
  sealArtifacts,
  stageRegistrySource,
  verifyArtifacts,
} from '../../scripts/release/registry.mjs';
import { tempDir, writeFiles } from './helpers.mjs';

const SHA = 'a'.repeat(40);
const VERSION = '0.1.0';
const plan = (overrides = {}) => planRegistryRelease({
  registry: 'pypi',
  repository: REPOSITORY,
  eventName: 'workflow_dispatch',
  ref: 'refs/heads/main',
  sha: SHA,
  headSha: SHA,
  onMain: true,
  version: VERSION,
  publish: false,
  enabled: false,
  ...overrides,
});
const release = (overrides = {}) => ({
  registry: 'pypi', version: VERSION, sha: SHA, sourceRef: `refs/tags/python-v${VERSION}`, ...overrides,
});

test('registry preparation is explicit, stable-only and never implies publication', () => {
  assert.equal(plan().publish, false);
  assert.equal(plan().tag, `python-v${VERSION}`);
  assert.equal(plan({ registry: 'nuget' }).tag, `dotnet-v${VERSION}`);
  assert.equal(plan({ registry: 'pubdev' }).tag, `flutter-v${VERSION}`);
  for (const registry of ['maven-jvm', 'maven-android']) {
    assert.equal(plan({ registry }).publish, false);
  }
  for (const version of ['', '0.0.0', '01.2.3', '1.2', '1.2.3-rc.1', '1.2.3+build', '../1.2.3']) {
    assert.throws(() => plan({ version }), /stable version|preparation version/);
  }
  assert.throws(() => plan({ registry: 'npm' }), /Unsupported registry/);
});

test('registry planning binds repository, source commit, main ancestry and exact tag', () => {
  const tagged = plan({ ref: `refs/tags/python-v${VERSION}`, version: '' });
  assert.equal(tagged.version, VERSION);
  for (const overrides of [
    { repository: 'example/sdks' },
    { eventName: 'pull_request' },
    { ref: 'refs/heads/feature' },
    { ref: `refs/tags/dotnet-v${VERSION}` },
    { ref: `refs/tags/python-v${VERSION}`, version: '0.2.0' },
    { sha: 'not-a-commit' },
    { headSha: 'b'.repeat(40) },
    { onMain: false },
  ]) {
    assert.throws(() => plan(overrides));
  }
});

test('PyPI and NuGet publication needs a tagged manual request, readiness and exact confirmation', () => {
  for (const [registry, component] of [['pypi', 'python'], ['nuget', 'dotnet']]) {
    const requested = {
      registry, ref: `refs/tags/${component}-v${VERSION}`, publish: true, enabled: true,
      confirmation: `publish ${registry} ${VERSION}`,
    };
    assert.equal(plan(requested).publish, true);
    for (const overrides of [
      { enabled: false }, { confirmation: '' }, { confirmation: `publish ${registry} 0.2.0` },
      { ref: 'refs/heads/main' }, { eventName: 'push' },
    ]) {
      assert.throws(() => plan({ ...requested, ...overrides }));
    }
  }
  assert.throws(() => plan({
    registry: 'maven-jvm', ref: `refs/tags/jvm-v${VERSION}`,
    publish: true, enabled: true, confirmation: `publish maven-jvm ${VERSION}`,
  }), /Maven Central publication is paused/);
});

test('pub.dev automation requires a tag push, never a manually dispatched bootstrap', () => {
  const tagged = {
    registry: 'pubdev', eventName: 'push', ref: `refs/tags/flutter-v${VERSION}`,
    version: '', publish: true, enabled: true,
  };
  assert.equal(plan(tagged).publish, true);
  assert.equal(plan({ ...tagged, publish: false, enabled: false }).publish, false);
  assert.throws(() => plan({ ...tagged, eventName: 'workflow_dispatch' }), /tag push/);
  assert.throws(() => plan({ ...tagged, enabled: false }), /PUBLISH_ENABLED/);
  assert.throws(() => plan({ ...tagged, ref: 'refs/heads/main' }), /tag/);
});

test('pub.dev rejects absent, malformed and unavailable bootstrap evidence', async () => {
  const response = (status, body) => new Response(JSON.stringify(body), { status });
  await assert.rejects(requirePubdevPackage({ fetch: async () => response(404, {}) }), /first real publication/);
  await assert.rejects(requirePubdevPackage({ fetch: async () => response(503, {}) }), /HTTP 503/);
  for (const body of [{}, { name: 'other', versions: [{ version: VERSION }] }, { name: 'convohop', versions: [] }]) {
    await assert.rejects(requirePubdevPackage({ fetch: async () => response(200, body) }), /package evidence/);
  }
  await assert.rejects(requirePubdevPackage({ fetch: async () => { throw new Error('offline'); } }), /offline/);
  let requested;
  await requirePubdevPackage({ fetch: async (url) => {
    requested = url;
    return response(200, { name: 'convohop', versions: [{ version: VERSION }] });
  } });
  assert.equal(requested, 'https://pub.dev/api/packages/convohop');
});

test('artifact seals cover exact files, registry, version, ref and source commit', async (t) => {
  const directory = tempDir(t);
  for (const name of artifactFiles('pypi', VERSION)) writeFileSync(join(directory, name), name);
  await sealArtifacts({ ...release(), directory });
  await verifyArtifacts({ ...release(), directory });
  for (const overrides of [
    { registry: 'nuget' }, { version: '0.2.0' }, { sha: 'b'.repeat(40) }, { sourceRef: 'refs/heads/main' },
  ]) {
    await assert.rejects(verifyArtifacts({ ...release(overrides), directory }));
  }
  const name = artifactFiles('pypi', VERSION)[0];
  writeFileSync(join(directory, name), 'changed after build');
  await assert.rejects(verifyArtifacts({ ...release(), directory }), /checksum/);
});

test('sealing refuses missing, extra, nested and symlinked artifacts', async (t) => {
  const directory = tempDir(t);
  await assert.rejects(sealArtifacts({ ...release(), directory }), /Expected exactly/);
  for (const name of artifactFiles('pypi', VERSION)) writeFileSync(join(directory, name), name);
  writeFileSync(join(directory, 'unapproved.whl'), 'extra');
  await assert.rejects(sealArtifacts({ ...release(), directory }), /Expected exactly/);
  const linked = tempDir(t);
  const [first, second] = artifactFiles('pypi', VERSION);
  writeFileSync(join(linked, first), first);
  symlinkSync(join(linked, first), join(linked, second));
  await assert.rejects(sealArtifacts({ ...release(), directory: linked }), /regular file/);
});

async function sourceFixture(t) {
  const root = tempDir(t);
  writeFiles(root, {
    'python/pyproject.toml': '[project]\nname = "convohop"\nclassifiers = [\n  "Private :: Do Not Upload",\n]\n',
    'python/src/convohop/_version.py': '__version__ = "0.1.0"\n',
    'flutter/pubspec.yaml': 'name: convohop\nversion: 0.0.0\npublish_to: none\n',
    'flutter/lib/convohop.dart': "export 'src/version.dart';\n",
    'flutter/lib/src/version.dart': "const convoHopPackageVersion = '0.0.0';\n",
    'flutter/README.md': '# ConvoHop\n',
    'spec/push-payload/vectors.json': '{}\n',
  });
  for (const args of [
    ['init', '--quiet'],
    ['add', '.'],
    ['-c', 'user.name=Release fixture', '-c', 'user.email=fixture@example.invalid',
      'commit', '--quiet', '-m', 'test: fixture'],
  ]) {
    const result = await run('git', args, { cwd: root });
    assert.equal(result.code, 0, result.stderr);
  }
  const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: root });
  return { root, sha: stdout.trim() };
}

test('annotated registry tags resolve to the same checked-out main commit', async (t) => {
  const { root, sha } = await sourceFixture(t);
  const ref = `refs/tags/python-v${VERSION}`;
  for (const args of [
    ['update-ref', 'refs/remotes/origin/main', sha],
    ['-c', 'user.name=Release fixture', '-c', 'user.email=fixture@example.invalid',
      'tag', '--annotate', `python-v${VERSION}`, '-m', 'release fixture', sha],
  ]) {
    const result = await run('git', args, { cwd: root });
    assert.equal(result.code, 0, result.stderr);
  }
  const tag = (await run('git', ['rev-parse', ref], { cwd: root })).stdout.trim();
  assert.notEqual(tag, sha);
  const result = await planFromGit({
    REGISTRY: 'pypi', GITHUB_SHA: tag, GITHUB_REF: ref,
    GITHUB_REPOSITORY: REPOSITORY, GITHUB_EVENT_NAME: 'workflow_dispatch',
  }, root);
  assert.equal(result.sha, sha);
  assert.equal(result.publish, false);
  const tree = (await run('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root })).stdout.trim();
  const other = await run('git', [
    '-c', 'user.name=Release fixture', '-c', 'user.email=fixture@example.invalid',
    'commit-tree', tree, '-p', sha, '-m', 'unrelated tag target',
  ], { cwd: root });
  assert.equal(other.code, 0, other.stderr);
  const moved = await run('git', ['update-ref', ref, other.stdout.trim()], { cwd: root });
  assert.equal(moved.code, 0, moved.stderr);
  await assert.rejects(planFromGit({
    REGISTRY: 'pypi', GITHUB_SHA: tag, GITHUB_REF: ref,
    GITHUB_REPOSITORY: REPOSITORY, GITHUB_EVENT_NAME: 'workflow_dispatch',
  }, root), /tag no longer identifies/);
});

test('Python staging releases only the committed copy and preserves the development upload fence', async (t) => {
  const { root, sha } = await sourceFixture(t);
  const original = readFileSync(join(root, 'python/pyproject.toml'), 'utf8');
  writeFileSync(join(root, 'python/untracked-secret'), 'must not be packaged');
  writeFileSync(join(root, 'python/src/convohop/_version.py'), '__version__ = "uncommitted"\n');
  const out = join(tempDir(t), 'stage');
  await stageRegistrySource({ registry: 'pypi', version: '0.2.0', sha, root, out });
  assert.equal(readFileSync(join(root, 'python/pyproject.toml'), 'utf8'), original);
  assert.doesNotMatch(readFileSync(join(out, 'python/pyproject.toml'), 'utf8'), /Private :: Do Not Upload/);
  assert.equal(readFileSync(join(out, 'python/src/convohop/_version.py'), 'utf8'), '__version__ = "0.2.0"\n');
  assert.equal(existsSync(join(out, 'python/untracked-secret')), false);
  await assert.rejects(stageRegistrySource({ registry: 'pypi', version: VERSION, sha, root, out }), /exists/);
});

test('Flutter staging generates release metadata and changelog without enabling the source checkout', async (t) => {
  const { root, sha } = await sourceFixture(t);
  const out = join(tempDir(t), 'stage');
  const assets = tempDir(t);
  await stageRegistrySource({ registry: 'pubdev', version: VERSION, sha, root, out, assets });
  const pubspec = readFileSync(join(out, 'flutter/pubspec.yaml'), 'utf8');
  assert.match(pubspec, /^version: 0\.1\.0$/m);
  assert.match(pubspec, /^publish_to: https:\/\/pub\.dev$/m);
  assert.equal(readFileSync(join(out, 'flutter/lib/src/version.dart'), 'utf8'),
    `const convoHopPackageVersion = '${VERSION}';\n`);
  assert.equal(readFileSync(join(root, 'flutter/lib/src/version.dart'), 'utf8'),
    "const convoHopPackageVersion = '0.0.0';\n");
  assert.match(readFileSync(join(root, 'flutter/pubspec.yaml'), 'utf8'), /^publish_to: none$/m);
  assert.match(readFileSync(join(out, 'flutter/CHANGELOG.md'), 'utf8'), new RegExp(sha));
  assert.ok(existsSync(join(out, 'spec/push-payload/vectors.json')));
  assert.ok(existsSync(join(assets, `convohop-${VERSION}.tar.gz`)));
});

test('archive metadata and Maven bundles have maintained standard-library regression coverage', async () => {
  const result = await run('python3', ['-m', 'unittest', 'discover', '-s', 'test/release', '-p', '*_test.py', '-v'], {
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Ran \d+ tests/);
});
