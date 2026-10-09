import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import test from 'node:test';

import {
  componentOf,
  INTERNAL_SCOPE,
  loadReleaseConfig,
  readJson,
  readPackageManifest,
  releaseTypeOf,
  REPO_ROOT,
  REPOSITORY,
  REPOSITORY_URL,
  tagName,
} from '../../scripts/release/lib.mjs';

// Expands root `workspaces` entries; supports `*` within a path segment, like `conformance/*`.
function workspacePaths(patterns) {
  const paths = [];
  for (const pattern of patterns) {
    assert.ok(!/\*\*|^!|[?[{]/.test(pattern), `extend workspacePaths() to support the workspace pattern ${pattern}`);
    let matches = [''];
    for (const segment of posix.normalize(pattern).split('/')) {
      if (!segment.includes('*')) {
        matches = matches.map((base) => posix.join(base, segment));
        continue;
      }
      const name = new RegExp(`^${segment.split('*').map((part) => part.replace(/[.+^$()|\\]/g, '\\$&')).join('[^/]*')}$`);
      matches = matches.flatMap((base) =>
        readdirSync(join(REPO_ROOT, base), { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && name.test(entry.name))
          .map((entry) => posix.join(base, entry.name)),
      );
    }
    paths.push(...(pattern.includes('*') ? matches.filter((path) => existsSync(join(REPO_ROOT, path, 'package.json'))).sort() : matches));
  }
  return paths;
}

const { config, manifest } = loadReleaseConfig(REPO_ROOT);
const rootPackage = readJson(join(REPO_ROOT, 'package.json'));
const workspaces = workspacePaths(rootPackage.workspaces).map((path) => ({ path, pkg: readPackageManifest(REPO_ROOT, path) }));
const released = workspaces.filter(({ pkg }) => pkg.private !== true);
const unreleased = workspaces.filter(({ pkg }) => pkg.private === true);
const releasedNames = new Set(released.map(({ pkg }) => pkg.name));
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
// Top-level directories that hold tooling, tests, schemas and docs, never a released package.
const NON_PACKAGE_DIRECTORIES = ['tools', 'scripts', 'test', 'schema', 'docs', 'conformance'];

// Directories with a package.json, skipping dependencies, build output and dot-directories.
function packageDirectories(base = '.') {
  const paths = [];
  for (const entry of readdirSync(join(REPO_ROOT, base), { withFileTypes: true })) {
    if (entry.isFile() && entry.name === 'package.json') paths.push(base);
    if (entry.isDirectory() && !entry.name.startsWith('.') && !['node_modules', 'dist', 'build'].includes(entry.name)) {
      paths.push(...packageDirectories(posix.join(base, entry.name)));
    }
  }
  return paths.sort();
}

test('release-please releases exactly the public npm workspaces', () => {
  const configured = Object.keys(config.packages).filter((path) => releaseTypeOf(config, path) === 'node');
  assert.deepEqual(configured.sort(), released.map(({ path }) => path).sort());
  assert.deepEqual(released.map(({ path }) => path).sort(), ['packages/client', 'packages/core', 'packages/server']);
  // Workspaces such as test harnesses stay private and out of the release config.
  for (const { path } of unreleased) assert.equal(config.packages[path], undefined, `${path} is private`);
});

test('tooling, harnesses and the root are never released', () => {
  const releasedPaths = new Set(released.map(({ path }) => path));
  const others = packageDirectories().filter((path) => !releasedPaths.has(path));
  assert.ok(others.includes('.'));
  // Covers tools/ and test harnesses whether or not they are root workspaces.
  for (const path of others) {
    assert.equal(readPackageManifest(REPO_ROOT, path).private, true, `${path}/package.json must be "private": true`);
    assert.equal(config.packages[path], undefined, `${path} must stay out of release-please-config.json`);
  }
  for (const path of Object.keys(config.packages)) {
    const [top] = posix.normalize(path).split('/');
    assert.ok(path !== '.' && !NON_PACKAGE_DIRECTORIES.includes(top), `${path} is not a package directory`);
  }
});

test('every configured package can be built by release.yml', () => {
  for (const path of Object.keys(config.packages)) {
    assert.equal(
      releaseTypeOf(config, path),
      'node',
      `release.yml only builds npm packages; add a release job for ${path} and extend this test first`,
    );
  }
});

test('the manifest tracks every configured package', () => {
  assert.deepEqual(Object.keys(manifest).sort(), Object.keys(config.packages).sort());
  for (const [path, version] of Object.entries(manifest)) {
    const current = readPackageManifest(REPO_ROOT, path).version;
    assert.ok(version === '0.0.0' || version === current, `${path}: manifest ${version}, package.json ${current}`);
  }
});

test('versioning follows docs/sdk-strategy.md', () => {
  assert.equal(config['bump-minor-pre-major'], true);
  assert.equal(config['bump-patch-for-minor-pre-major'], false);
  assert.equal(config['initial-version'], '0.1.0');
  assert.match(config['bootstrap-sha'], /^[0-9a-f]{40}$/);
  assert.equal(config['separate-pull-requests'], false);
  assert.ok(config.plugins.some((plugin) => (plugin.type ?? plugin) === 'node-workspace'));
  // Drafts stay unpublished until every asset is attached.
  assert.equal(config.draft, true);
  assert.equal(config['force-tag-creation'], true);
});

test('tags are <component>-v<version> and unique per package', () => {
  const components = Object.keys(config.packages).map((path) => componentOf(config, path));
  assert.equal(new Set(components).size, components.length);
  assert.equal(tagName(config, 'packages/core', '0.1.0'), 'core-v0.1.0');
  const prefixes = Object.keys(config.packages).map((path) => tagName(config, path, ''));
  for (const prefix of prefixes) {
    assert.equal(prefixes.filter((other) => other.startsWith(prefix)).length, 1, `${prefix} overlaps another tag prefix`);
  }
});

test('the Go module matches its planned go/vX.Y.Z tags and carries LICENSE and NOTICE', () => {
  // Go finds the versions of a module in a subdirectory by tags that start with
  // that directory. Until release.yml can release Go, the entry is the one
  // RELEASING.md plans; see "Adding a package or language".
  const entry = config.packages.go ?? { 'release-type': 'go', component: 'go', 'tag-separator': '/' };
  const planned = { ...config, packages: { ...config.packages, go: entry } };
  const goMod = readFileSync(join(REPO_ROOT, 'go', 'go.mod'), 'utf8');
  assert.equal(/^module (\S+)$/m.exec(goMod)?.[1], `github.com/${REPOSITORY}/go`);
  assert.equal(tagName(planned, 'go', '0.1.0'), 'go/v0.1.0');
  const prefixes = Object.keys(planned.packages).map((path) => tagName(planned, path, ''));
  for (const prefix of prefixes) {
    assert.equal(prefixes.filter((other) => other.startsWith(prefix)).length, 1, `${prefix} overlaps another tag prefix`);
  }
  // A module zip holds only the files under go/.
  for (const file of ['LICENSE', 'NOTICE']) {
    assert.ok(readFileSync(join(REPO_ROOT, 'go', file)).equals(readFileSync(join(REPO_ROOT, file))), `go/${file} must copy the root ${file}`);
  }
});

test('public packages carry publish metadata, LICENSE and NOTICE', () => {
  const license = readFileSync(join(REPO_ROOT, 'LICENSE'));
  const notice = readFileSync(join(REPO_ROOT, 'NOTICE'));
  for (const { path, pkg } of released) {
    assert.equal(pkg.private, false, path);
    assert.deepEqual(pkg.publishConfig, { access: 'public', provenance: true }, path);
    assert.equal(pkg.license, 'Apache-2.0', path);
    assert.deepEqual(pkg.repository, { type: 'git', url: REPOSITORY_URL, directory: path }, path);
    assert.deepEqual(pkg.files, ['dist', '!dist/.tsbuildinfo', 'CHANGELOG.md', 'NOTICE'], path);
    assert.equal(pkg.type, 'module', path);
    assert.ok(existsSync(join(REPO_ROOT, path, 'README.md')), `${path}/README.md`);
    assert.ok(readFileSync(join(REPO_ROOT, path, 'LICENSE')).equals(license), `${path}/LICENSE must copy the root LICENSE`);
    assert.ok(readFileSync(join(REPO_ROOT, path, 'NOTICE')).equals(notice), `${path}/NOTICE must copy the root NOTICE`);
  }
});

test('internal dependencies stay releasable', () => {
  const versions = Object.fromEntries(released.map(({ pkg }) => [pkg.name, pkg.version]));
  for (const { path, pkg } of workspaces) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
        if (!name.startsWith(INTERNAL_SCOPE)) continue;
        if (pkg.private === true) {
          // Exact versions would break the workspace link when release-please bumps the target.
          assert.equal(spec, '*', `${path} ${field}.${name} must be "*" in an unreleased workspace`);
          continue;
        }
        // The node-workspace plugin treats devDependencies as release dependencies, so a test-only
        // dependency would cut a release of this package whenever the other one is released.
        assert.notEqual(
          field,
          'devDependencies',
          `${path} must not declare ${name} in devDependencies; tests import workspace packages through the workspace links`,
        );
        assert.ok(releasedNames.has(name), `${path} ${field}.${name} is not a released package`);
        assert.equal(spec, versions[name], `${path} ${field}.${name} must be exactly ${versions[name]}`);
      }
    }
  }
});

test('@types/node stays on the engines floor', () => {
  const floors = new Set(released.map(({ pkg }) => /^>=(\d+)/.exec(pkg.engines?.node ?? '')?.[1]));
  assert.deepEqual([...floors], ['22']);
  for (const pkg of [rootPackage, ...workspaces.map((workspace) => workspace.pkg)]) {
    const spec = pkg.devDependencies?.['@types/node'];
    if (spec) assert.match(spec, /^\^22\./, `${pkg.name} @types/node must stay on the Node 22 floor`);
  }
  const dependabot = readFileSync(join(REPO_ROOT, '.github', 'dependabot.yml'), 'utf8');
  assert.match(dependabot, /dependency-name: "@types\/node"\s+update-types: \["version-update:semver-major"\]/);
});
