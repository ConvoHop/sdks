// npm job (and PR CI): dry-run publishes the packed tarballs in dependency order.
// Real publishing stays disabled until REL-PUB; see RELEASING.md.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  compareVersionCores,
  isPrerelease,
  main,
  MIN_NPM_VERSION,
  notice,
  packagesFromEnv,
  parseArgs,
  REPO_ROOT,
  run,
  sri,
} from './lib.mjs';

// npm refuses to tag a prerelease as `latest` implicitly.
export function distTag(version) {
  return isPrerelease(version) ? 'next' : undefined;
}

export function publishArgs(file, version) {
  const tag = distTag(version);
  return ['publish', file, '--dry-run', '--provenance', '--access', 'public', ...(tag ? ['--tag', tag] : [])];
}

// Resolves to the published dist.integrity, or undefined when npm has no such version.
async function publishedIntegrity(npm, pkg, options) {
  const result = await run(npm, ['view', `${pkg.name}@${pkg.version}`, 'dist.integrity', '--json'], options);
  let parsed;
  try {
    parsed = result.stdout.trim() ? JSON.parse(result.stdout) : undefined;
  } catch {
    parsed = undefined;
  }
  if (result.code === 0 && typeof parsed === 'string') return parsed;
  if (result.code !== 0 && parsed?.error?.code === 'E404') return undefined;
  throw new Error(`npm view ${pkg.name}@${pkg.version} failed: ${parsed?.error?.summary ?? result.stderr.trim()}`);
}

export async function publishPackages({
  root = REPO_ROOT,
  assets,
  packages,
  dryRun,
  requireOidc = false,
  skipPublished = false,
  env = process.env,
  npm = 'npm',
}) {
  if (dryRun !== true) throw new Error('Real npm publishing is disabled until REL-PUB; pass --dry-run');
  if (requireOidc && !(env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)) {
    throw new Error('No GitHub OIDC token is available; the npm job needs `id-token: write`');
  }
  const options = { cwd: root, env };
  const version = await run(npm, ['--version'], options);
  const npmVersion = version.stdout.trim();
  if (version.code !== 0 || compareVersionCores(npmVersion, MIN_NPM_VERSION) < 0) {
    throw new Error(`npm ${npmVersion || 'is unavailable'}; trusted publishing needs npm ${MIN_NPM_VERSION} or later`);
  }
  for (const pkg of packages) {
    const file = join(assets, pkg.component, pkg.tarball);
    const tarball = readFileSync(file);
    const published = await publishedIntegrity(npm, pkg, options);
    if (published !== undefined) {
      if (skipPublished) {
        notice(`${pkg.name}@${pkg.version} is already on npm; skipping its publish dry run`, env);
        continue;
      }
      if (published !== sri(tarball)) {
        throw new Error(`${pkg.name}@${pkg.version} is already on npm with a different tarball`);
      }
      notice(`${pkg.name}@${pkg.version} is already on npm with this tarball; skipping`, env);
      continue;
    }
    const result = await run(npm, publishArgs(file, pkg.version), options);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (result.code !== 0) throw new Error(`npm publish --dry-run failed for ${pkg.name}@${pkg.version}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(async () => {
    const args = parseArgs(process.argv.slice(2), {
      flags: ['dry-run', 'require-oidc', 'skip-published'],
      options: ['assets'],
    });
    if (!args.assets) throw new Error('Usage: publish.mjs --dry-run --assets <dir> [--require-oidc] [--skip-published]');
    await publishPackages({
      assets: resolve(args.assets),
      packages: packagesFromEnv(),
      dryRun: args['dry-run'] === true,
      requireOidc: args['require-oidc'] === true,
      skipPublished: args['skip-published'] === true,
    });
  });
}
