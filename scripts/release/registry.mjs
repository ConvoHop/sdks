import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { main, parseArgs, REPO_ROOT, REPOSITORY, run, setOutput, sha256Sums } from './lib.mjs';

const REGISTRIES = {
  pypi: { component: 'python', package: 'convohop' },
  nuget: { component: 'dotnet', package: 'ConvoHop' },
  pubdev: { component: 'flutter', package: 'convohop' },
  'maven-jvm': { component: 'jvm', package: 'com.convohop' },
  'maven-android': { component: 'android', package: 'com.convohop' },
};

function registryOf(registry) {
  if (!Object.hasOwn(REGISTRIES, registry)) throw new Error(`Unsupported registry ${registry}`);
  return REGISTRIES[registry];
}

function requireVersion(version) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version === '0.0.0') {
    throw new Error('A nonzero stable version (major.minor.patch) is required; prereleases are not supported here yet');
  }
}

function requireSha(sha) {
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) throw new Error('Expected a full source commit SHA');
}

export function planRegistryRelease({
  registry, repository, eventName, ref, sha, headSha, onMain, version = '',
  publish = false, enabled = false, confirmation = '',
}) {
  const { component } = registryOf(registry);
  if (repository !== REPOSITORY) throw new Error(`Registry releases must run in ${REPOSITORY}`);
  if (!['workflow_dispatch', 'push'].includes(eventName) || (eventName === 'push' && registry !== 'pubdev')) {
    throw new Error('Only manual preparation/publication or a Flutter release tag push is supported');
  }
  requireSha(sha);
  if (sha !== headSha) throw new Error('The checkout must be the commit that triggered this workflow');
  if (onMain !== true) throw new Error('The release commit must already belong to origin/main');
  const prefix = `refs/tags/${component}-v`;
  const tagged = typeof ref === 'string' && ref.startsWith(prefix);
  if (tagged) {
    const taggedVersion = ref.slice(prefix.length);
    if (version !== '' && version !== taggedVersion) throw new Error('The requested version differs from the release tag');
    version = taggedVersion;
  } else if (ref !== 'refs/heads/main') {
    throw new Error(`Prepare on main or on an exact ${component}-v<version> release tag`);
  } else if (version === '') {
    throw new Error('Specify a preparation version on main; tagged runs derive it from the tag');
  }
  requireVersion(version);
  if (eventName === 'push' && !tagged) throw new Error('pub.dev automation requires a release tag push');
  if (typeof publish !== 'boolean' || typeof enabled !== 'boolean') throw new Error('Publication switches must be booleans');
  if (publish) {
    if (registry.startsWith('maven-')) throw new Error('Maven Central publication is paused pending domain namespace verification');
    if (!tagged) throw new Error('Publication requires the exact immutable release tag, never main');
    if (!enabled) throw new Error('Configure registry trust and the protected environment before setting its PUBLISH_ENABLED variable to true');
    if (registry === 'pubdev') {
      if (eventName !== 'push') throw new Error('pub.dev automation requires a tag push; dispatch only prepares the manual bootstrap');
    } else if (eventName !== 'workflow_dispatch' || confirmation !== `publish ${registry} ${version}`) {
      throw new Error(`Explicit publication confirmation must be: publish ${registry} ${version}`);
    }
  }
  return {
    registry, version, tag: `${component}-v${version}`, sha, sourceRef: ref, publish,
    artifact: `registry-${registry}-${sha}`,
  };
}

export function artifactFiles(registry, version) {
  registryOf(registry);
  requireVersion(version);
  if (registry === 'pypi') return [`convohop-${version}-py3-none-any.whl`, `convohop-${version}.tar.gz`].sort();
  if (registry === 'nuget') return [`ConvoHop.${version}.nupkg`, `ConvoHop.${version}.snupkg`].sort();
  if (registry === 'pubdev') return [`convohop-${version}.tar.gz`];
  return [`convohop-${registry}-${version}-unsigned.tar.gz`];
}

function descriptor({ registry, version, sha, sourceRef }) {
  const { component, package: packageName } = registryOf(registry);
  requireVersion(version);
  requireSha(sha);
  const tag = `${component}-v${version}`;
  if (!['refs/heads/main', `refs/tags/${tag}`].includes(sourceRef)) throw new Error('Invalid release source ref');
  return { registry, package: packageName, version, tag, sourceSha: sha, sourceRef, files: artifactFiles(registry, version) };
}

function checkFiles(directory, expected) {
  const names = readdirSync(directory).sort();
  if (JSON.stringify(names) !== JSON.stringify([...expected].sort())) {
    throw new Error(`Expected exactly ${expected.join(', ')}; found ${names.join(', ')}`);
  }
  for (const name of names) {
    if (!lstatSync(join(directory, name)).isFile()) throw new Error(`${name} must be a regular file, not a directory or symlink`);
  }
}

function checksums(directory, names) {
  return sha256Sums(names.map((name) => ({ name, data: readFileSync(join(directory, name)) })));
}

export async function sealArtifacts({ directory, ...release }) {
  const metadata = descriptor(release);
  checkFiles(directory, metadata.files);
  writeFileSync(join(directory, 'RELEASE.json'), `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
  writeFileSync(join(directory, 'SHA256SUMS'), checksums(directory, [...metadata.files, 'RELEASE.json']), { flag: 'wx' });
}

export async function verifyArtifacts({ directory, ...release }) {
  const metadata = descriptor(release);
  checkFiles(directory, [...metadata.files, 'RELEASE.json', 'SHA256SUMS']);
  if (readFileSync(join(directory, 'RELEASE.json'), 'utf8') !== `${JSON.stringify(metadata, null, 2)}\n`) {
    throw new Error('Release metadata does not match this registry, version, source ref and commit');
  }
  if (readFileSync(join(directory, 'SHA256SUMS'), 'utf8') !== checksums(directory, [...metadata.files, 'RELEASE.json'])) {
    throw new Error('Release artifact checksum mismatch');
  }
}

async function checked(command, args, options) {
  const result = await run(command, args, options);
  if (result.code !== 0) throw new Error(`${command} failed (${result.code}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

export async function planFromGit(env = process.env, root = REPO_ROOT) {
  requireSha(env.GITHUB_SHA);
  const options = { cwd: root };
  const headSha = await checked('git', ['rev-parse', 'HEAD'], options);
  // A pushed annotated tag can name a tag object; release metadata always names its commit.
  const sha = await checked('git', ['rev-parse', '--verify', `${env.GITHUB_SHA}^{commit}`], options);
  if (env.GITHUB_REF?.startsWith('refs/tags/')) {
    const taggedSha = await checked('git', ['rev-parse', '--verify', `${env.GITHUB_REF}^{commit}`], options);
    if (taggedSha !== sha) throw new Error('The release tag no longer identifies the commit that triggered this run');
  }
  const ancestor = await run('git', ['merge-base', '--is-ancestor', headSha, 'origin/main'], options);
  if (![0, 1].includes(ancestor.code)) throw new Error(`Cannot verify main ancestry: ${ancestor.stderr}`);
  return planRegistryRelease({
    registry: env.REGISTRY, repository: env.GITHUB_REPOSITORY, eventName: env.GITHUB_EVENT_NAME,
    ref: env.GITHUB_REF, sha, headSha, onMain: ancestor.code === 0,
    version: env.REQUESTED_VERSION ?? '', publish: boolean(env.REQUEST_PUBLISH ?? 'false', 'REQUEST_PUBLISH'),
    enabled: env.PUBLISH_ENABLED === 'true', confirmation: env.PUBLISH_CONFIRMATION ?? '',
  });
}

function replaceOnce(text, pattern, replacement, label) {
  if ([...text.matchAll(pattern)].length !== 1) throw new Error(`Expected exactly one ${label} in the committed source`);
  return text.replace(pattern, replacement);
}

function checkSourceTree(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = lstatSync(path);
    if (stat.isDirectory()) checkSourceTree(path);
    else if (!stat.isFile()) throw new Error('Release source must not contain symlinks or special files');
  }
}

export async function stageRegistrySource({ registry, version, sha, root = REPO_ROOT, out, assets }) {
  if (!['pypi', 'pubdev'].includes(registry)) throw new Error('Only Python and Flutter need a staged source copy');
  requireVersion(version);
  requireSha(sha);
  out = resolve(out);
  root = resolve(root);
  if (root === out || root.startsWith(`${out}/`)) throw new Error('The source staging directory cannot contain the checkout');
  mkdirSync(dirname(out), { recursive: true });
  if (existsSync(out)) throw new Error('The source staging directory already exists');
  mkdirSync(out);
  const archiveDirectory = mkdtempSync(join(tmpdir(), 'convohop-registry-'));
  try {
    const source = registry === 'pypi' ? 'python' : 'flutter';
    const archive = join(archiveDirectory, 'source.tar');
    // Only committed files enter the release; ignored build output and local credentials never do.
    await checked('git', ['archive', '--format=tar', `--output=${archive}`, sha, '--', source, ...(registry === 'pubdev' ? ['spec'] : [])], { cwd: root });
    await checked('tar', ['-xf', archive, '-C', out]);
    checkSourceTree(out);
    if (registry === 'pypi') {
      const project = join(out, 'python/pyproject.toml');
      let metadata = replaceOnce(readFileSync(project, 'utf8'), /^ *"Private :: Do Not Upload",?\r?\n/gm, '', 'private upload classifier');
      metadata = metadata.replace(/^ *# Registry publishing is not approved yet; PyPI rejects uploads that carry this classifier\.\r?\n/m, '');
      writeFileSync(project, metadata);
      const versionFile = join(out, 'python/src/convohop/_version.py');
      writeFileSync(versionFile, replaceOnce(readFileSync(versionFile, 'utf8'), /^__version__ = "[^"]+"$/gm, `__version__ = "${version}"`, 'Python version'));
    } else {
      if (!assets) throw new Error('Flutter staging needs an artifact output directory');
      const packageRoot = join(out, 'flutter');
      const pubspec = join(packageRoot, 'pubspec.yaml');
      let metadata = replaceOnce(readFileSync(pubspec, 'utf8'), /^version: .+$/gm, `version: ${version}`, 'Flutter version');
      metadata = replaceOnce(metadata, /^publish_to: none$/gm, 'publish_to: https://pub.dev', 'Flutter upload fence');
      metadata = metadata.replace(/^# Registry publishing waits for release approval; see RELEASING\.md\.\n/m, '');
      writeFileSync(pubspec, metadata);
      const versionFile = join(packageRoot, 'lib/src/version.dart');
      writeFileSync(versionFile, replaceOnce(readFileSync(versionFile, 'utf8'),
        /^const convoHopPackageVersion = '[^']+';$/gm,
        `const convoHopPackageVersion = '${version}';`, 'Flutter package version'));
      const changelog = join(packageRoot, 'CHANGELOG.md');
      if (!existsSync(changelog)) {
        writeFileSync(changelog, `# Changelog\n\n## ${version}\n\nPrepared from the [release source](https://github.com/${REPOSITORY}/tree/${sha}/flutter) at ${sha}.\n`);
      }
      mkdirSync(assets, { recursive: true });
      const archivePath = join(assets, artifactFiles(registry, version)[0]);
      if (existsSync(archivePath)) throw new Error('The Flutter source archive already exists');
      await checked('tar', ['-czf', archivePath, '-C', packageRoot, '.']);
    }
  } finally {
    rmSync(archiveDirectory, { recursive: true, force: true });
  }
}

export async function requirePubdevPackage({ fetch = globalThis.fetch } = {}) {
  const response = await fetch('https://pub.dev/api/packages/convohop', { signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) throw new Error('Complete the first real publication manually before enabling pub.dev automation');
  if (!response.ok) throw new Error(`pub.dev bootstrap check failed with HTTP ${response.status}`);
  const body = await response.json();
  if (body?.name !== 'convohop' || !Array.isArray(body.versions) || body.versions.length === 0
    || !body.versions.every((entry) => typeof entry?.version === 'string' && entry.version !== '')) {
    throw new Error('pub.dev returned malformed package evidence for convohop');
  }
}

function boolean(value, name) {
  if (!['true', 'false'].includes(value)) throw new Error(`${name} must be true or false`);
  return value === 'true';
}

async function inspectArtifacts(options) {
  await checked('python3', [
    join(REPO_ROOT, 'scripts/release/registry-artifacts.py'), 'inspect',
    '--registry', options.registry, '--version', options.version, '--sha', options.sha,
    '--directory', options.directory,
  ]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(async () => {
    const command = process.argv[2];
    const args = parseArgs(process.argv.slice(3), {
      options: ['registry', 'version', 'sha', 'source-ref', 'out', 'directory', 'repository'],
    });
    if (command === 'plan') {
      const plan = await planFromGit();
      for (const [name, value] of Object.entries(plan)) setOutput(name, String(value));
    } else if (command === 'stage') {
      await stageRegistrySource({
        registry: args.registry, version: args.version, sha: args.sha, out: args.out, assets: args.directory,
      });
    } else if (command === 'seal' || command === 'verify') {
      const options = {
        registry: args.registry, version: args.version, sha: args.sha,
        sourceRef: args['source-ref'], directory: args.directory,
      };
      if (command === 'verify') await verifyArtifacts(options);
      await inspectArtifacts(options);
      if (command === 'seal') await sealArtifacts(options);
    } else if (command === 'maven-bundle') {
      if (!['maven-jvm', 'maven-android'].includes(args.registry)) throw new Error('Expected a Maven preparation target');
      requireVersion(args.version);
      mkdirSync(args.directory, { recursive: true });
      await checked('python3', [
        join(REPO_ROOT, 'scripts/release/registry-artifacts.py'), 'bundle-maven',
        '--sdk', args.registry.slice('maven-'.length), '--version', args.version,
        '--repository', args.repository, '--out', join(args.directory, artifactFiles(args.registry, args.version)[0]),
      ]);
    } else if (command === 'pubdev-ready') {
      await requirePubdevPackage();
    } else {
      throw new Error('Expected plan, stage, seal, verify, maven-bundle or pubdev-ready');
    }
  });
}
