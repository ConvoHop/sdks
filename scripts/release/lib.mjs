// Shared helpers for the release pipeline (see RELEASING.md). The release
// scripts are dependency-free so release jobs only need Node.js and npm.
import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REPOSITORY = 'ConvoHop/sdks';
export const REPOSITORY_URL = `git+https://github.com/${REPOSITORY}.git`;
export const LICENSE_ID = 'Apache-2.0';
export const INTERNAL_SCOPE = '@convohop/';
// npm trusted publishing (OIDC) needs npm 11.5.1 or later.
export const MIN_NPM_VERSION = '11.5.1';
export const RUNTIME_DEPENDENCY_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function isSemver(value) {
  return typeof value === 'string' && SEMVER.test(value);
}

// True for versions with a prerelease part, such as 0.3.0-rc.1, but not for build metadata alone.
export function isPrerelease(value) {
  return SEMVER.exec(String(value))?.[4] !== undefined;
}

// Compares major.minor.patch only; prerelease tags are ignored.
export function compareVersionCores(left, right) {
  const parse = (value) => {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(value).trim());
    if (!match) throw new Error(`Not a version: ${value}`);
    return match.slice(1).map(Number);
  };
  const [a, b] = [parse(left), parse(right)];
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadReleaseConfig(root = REPO_ROOT) {
  return {
    config: readJson(join(root, 'release-please-config.json')),
    manifest: readJson(join(root, '.release-please-manifest.json')),
  };
}

function setting(config, path, key, fallback) {
  return config.packages?.[path]?.[key] ?? config[key] ?? fallback;
}

export function releaseTypeOf(config, path) {
  return setting(config, path, 'release-type', undefined);
}

export function componentOf(config, path) {
  const component = config.packages?.[path]?.component;
  if (typeof component !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(component)) {
    throw new Error(`${path} must set a lowercase "component" in release-please-config.json`);
  }
  return component;
}

// Mirrors release-please's tag format for manifest releases.
export function tagName(config, path, version) {
  if (!config.packages?.[path]) throw new Error(`${path} is not in release-please-config.json`);
  const component = componentOf(config, path);
  const withComponent = setting(config, path, 'include-component-in-tag', true);
  const withV = setting(config, path, 'include-v-in-tag', true);
  const separator = setting(config, path, 'tag-separator', '-');
  return `${withComponent ? `${component}${separator}` : ''}${withV ? 'v' : ''}${version}`;
}

export function tarballBase(name, version) {
  const flat = name.startsWith('@') ? name.slice(1).replace('/', '-') : name;
  return `${flat}-${version}`;
}

export function describeNpmPackage(config, path, name, version) {
  const type = releaseTypeOf(config, path);
  if (type !== 'node') throw new Error(`${path} has release-type ${type}; release.yml only builds npm packages`);
  if (!isSemver(version)) throw new Error(`${path}: ${version} is not a semantic version`);
  const base = tarballBase(name, version);
  return {
    path,
    component: componentOf(config, path),
    name,
    version,
    tag: tagName(config, path, version),
    base,
    tarball: `${base}.tgz`,
    sbom: `${base}.cdx.json`,
  };
}

export function internalRuntimeDependencies(manifest) {
  const names = new Set();
  for (const field of RUNTIME_DEPENDENCY_FIELDS) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (name.startsWith(INTERNAL_SCOPE)) names.add(name);
    }
  }
  return names;
}

// Stable topological order: dependencies first, ties in input order.
export function orderByDependencies(packages, readManifest) {
  const names = new Set(packages.map((pkg) => pkg.name));
  const pending = new Map(
    packages.map((pkg) => [pkg.name, [...internalRuntimeDependencies(readManifest(pkg))].filter((name) => names.has(name))]),
  );
  const ordered = [];
  while (pending.size > 0) {
    const ready = packages.find(
      (pkg) => pending.has(pkg.name) && pending.get(pkg.name).every((name) => !pending.has(name)),
    );
    if (!ready) throw new Error(`Dependency cycle between ${[...pending.keys()].join(', ')}`);
    ordered.push(ready);
    pending.delete(ready.name);
  }
  return ordered;
}

export function readPackageManifest(root, path) {
  return readJson(join(root, path, 'package.json'));
}

// Every npm package configured for release-please, at its package.json version.
export function npmReleasePackages(root = REPO_ROOT) {
  const { config } = loadReleaseConfig(root);
  const packages = Object.keys(config.packages ?? {})
    .filter((path) => releaseTypeOf(config, path) === 'node')
    .map((path) => {
      const manifest = readPackageManifest(root, path);
      return describeNpmPackage(config, path, manifest.name, manifest.version);
    });
  return orderByDependencies(packages, (pkg) => readPackageManifest(root, pkg.path));
}

function parseJsonArray(json, label) {
  let value;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a non-empty JSON array`);
  return value;
}

// Resolves the plan job's [{path, version, tag}] against the checked-out release commit.
export function resolveReleases(root, json) {
  const { config, manifest } = loadReleaseConfig(root);
  const packages = parseJsonArray(json, 'RELEASES').map((release) => {
    const { path, version, tag } = release ?? {};
    if (!config.packages?.[path]) throw new Error(`${path} is not in release-please-config.json`);
    const packageJson = readPackageManifest(root, path);
    if (packageJson.version !== version) {
      throw new Error(`${path}/package.json is ${packageJson.version}, but the release is ${version}`);
    }
    if (manifest[path] !== version) {
      throw new Error(`.release-please-manifest.json has ${path} at ${manifest[path]}, but the release is ${version}`);
    }
    const pkg = describeNpmPackage(config, path, packageJson.name, version);
    if (pkg.tag !== tag) throw new Error(`${path} ${version} should be tagged ${pkg.tag}, not ${tag}`);
    return pkg;
  });
  if (new Set(packages.map((pkg) => pkg.path)).size !== packages.length) throw new Error('RELEASES lists a package twice');
  return orderByDependencies(packages, (pkg) => readPackageManifest(root, pkg.path));
}

const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Parses the build job's package descriptors (RELEASE_PACKAGES).
export function parsePackageList(json, label = 'RELEASE_PACKAGES') {
  const packages = parseJsonArray(json, label);
  for (const pkg of packages) {
    for (const key of ['path', 'component', 'name', 'version', 'tag', 'base', 'tarball', 'sbom']) {
      if (typeof pkg?.[key] !== 'string' || pkg[key] === '') throw new Error(`${label} entry is missing ${key}`);
    }
    for (const key of ['component', 'base', 'tarball', 'sbom']) {
      if (!SAFE_FILE_NAME.test(pkg[key])) throw new Error(`${label} entry for ${pkg.name} has an unsafe ${key}`);
    }
    if (pkg.tarball !== `${pkg.base}.tgz` || pkg.sbom !== `${pkg.base}.cdx.json`) {
      throw new Error(`${label} entry for ${pkg.name} has inconsistent file names`);
    }
  }
  return packages;
}

export function packagesFromEnv(root = REPO_ROOT, env = process.env) {
  return env.RELEASE_PACKAGES ? parsePackageList(env.RELEASE_PACKAGES) : npmReleasePackages(root);
}

export function releaseAssetNames(pkg) {
  return [
    pkg.tarball,
    pkg.sbom,
    'SHA256SUMS',
    `${pkg.base}.provenance.sigstore.json`,
    `${pkg.base}.sbom.sigstore.json`,
  ].sort();
}

export function sha256Sums(files) {
  return files
    .map(({ name, data }) => ({ name, digest: createHash('sha256').update(data).digest('hex') }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map(({ name, digest }) => `${digest}  ${name}\n`)
    .join('');
}

export function sri(data) {
  return `sha512-${createHash('sha512').update(data).digest('base64')}`;
}

// Runs a command without a shell. Resolves with the exit code; rejects only when it cannot run.
export function run(command, args, { cwd = REPO_ROOT, env = process.env } = {}) {
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { cwd, env, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && typeof error.code !== 'number') reject(error);
      else resolvePromise({ code: error ? error.code : 0, stdout, stderr });
    });
  });
}

export function setOutput(name, value, env = process.env) {
  if (!env.GITHUB_OUTPUT) {
    console.log(`${name}=${value}`);
    return;
  }
  const delimiter = `EOF_${randomBytes(16).toString('hex')}`;
  appendFileSync(env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

export function notice(message, env = process.env) {
  console.log(env.GITHUB_ACTIONS === 'true' ? `::notice::${escapeCommand(message)}` : message);
}

function escapeCommand(message) {
  return message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

export function parseArgs(argv, { flags = [], options = [] } = {}) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const match = /^--([a-z-]+)(?:=(.*))?$/s.exec(arg);
    if (!match) throw new Error(`Unexpected argument ${arg}`);
    const [, key, inline] = match;
    if (flags.includes(key) && inline === undefined) {
      result[key] = true;
    } else if (options.includes(key)) {
      const value = inline ?? argv[++index];
      if (value === undefined || value === '') throw new Error(`--${key} needs a value`);
      result[key] = value;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return result;
}

export async function main(fn) {
  try {
    await fn();
  } catch (error) {
    const message = String(error?.message ?? error);
    console.error(process.env.GITHUB_ACTIONS === 'true' ? `::error::${escapeCommand(message)}` : message);
    process.exitCode = 1;
  }
}
