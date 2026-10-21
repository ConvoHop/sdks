// Build job (and PR CI): packs each npm package, inspects the tarball and
// writes a CycloneDX SBOM and SHA256SUMS to <out>/<component>/.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  main,
  npmReleasePackages,
  parseArgs,
  readJson,
  REPO_ROOT,
  resolveReleases,
  run,
  setOutput,
  sha256Sums,
  sri,
} from './lib.mjs';
import { createSbom } from './sbom.mjs';
import { inspectTarball } from './tarball.mjs';

export function verifyNpmAssets({ root = REPO_ROOT, assets, packages }) {
  const selected = new Set(packages.map((pkg) => pkg.name));
  const all = npmReleasePackages(root);
  const expected = all.filter((pkg) => selected.has(pkg.name));
  if (packages.length === 0 || JSON.stringify(packages) !== JSON.stringify(expected)) {
    throw new Error('npm artifacts must match the checked-out packages in dependency order');
  }
  const internalVersions = Object.fromEntries(all.map((pkg) => [pkg.name, pkg.version]));
  for (const pkg of packages) {
    const directory = join(assets, pkg.component);
    const names = [pkg.tarball, pkg.sbom, 'SHA256SUMS'].sort();
    if (!lstatSync(directory).isDirectory() || JSON.stringify(readdirSync(directory).sort()) !== JSON.stringify(names)) {
      throw new Error(`Unexpected npm artifact file set for ${pkg.name}`);
    }
    if (names.some((name) => !lstatSync(join(directory, name)).isFile())) throw new Error('npm artifacts must be regular files');
    const tarball = readFileSync(join(directory, pkg.tarball));
    const sbom = readFileSync(join(directory, pkg.sbom));
    if (readFileSync(join(directory, 'SHA256SUMS'), 'utf8') !== sha256Sums([
      { name: pkg.tarball, data: tarball }, { name: pkg.sbom, data: sbom },
    ])) throw new Error(`npm artifact checksum mismatch for ${pkg.name}`);
    const { problems } = inspectTarball(tarball, {
      name: pkg.name, version: pkg.version, directory: pkg.path, internalVersions,
      requireChangelog: existsSync(join(root, pkg.path, 'CHANGELOG.md')),
      license: readFileSync(join(root, 'LICENSE')), notice: readFileSync(join(root, 'NOTICE')),
    });
    if (problems.length) throw new Error(`${pkg.tarball} failed inspection:\n- ${problems.join('\n- ')}`);
  }
}

// Without `releases`, builds every configured npm package at its package.json version.
export async function buildAssets({ root = REPO_ROOT, out, releases, npm = 'npm' }) {
  const packages = releases ? resolveReleases(root, releases) : npmReleasePackages(root);
  const lock = readJson(join(root, 'package-lock.json'));
  const license = readFileSync(join(root, 'LICENSE'));
  const notice = readFileSync(join(root, 'NOTICE'));
  const internalVersions = Object.fromEntries(npmReleasePackages(root).map((pkg) => [pkg.name, pkg.version]));
  for (const pkg of packages) {
    const locked = lock.packages?.[pkg.path]?.version;
    if (locked !== pkg.version) throw new Error(`package-lock.json has ${pkg.path} at ${locked}, not ${pkg.version}`);
    const dir = join(out, pkg.component);
    if (existsSync(dir) && readdirSync(dir).length > 0) throw new Error(`${dir} is not empty`);
    mkdirSync(dir, { recursive: true });
    const packed = await run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', dir, '--workspace', pkg.path], {
      cwd: root,
    });
    if (packed.code !== 0) throw new Error(`npm pack failed for ${pkg.name}:\n${packed.stderr}`);
    const [result] = JSON.parse(packed.stdout);
    if (result?.filename !== pkg.tarball) throw new Error(`npm pack wrote ${result?.filename}, expected ${pkg.tarball}`);
    const tarball = readFileSync(join(dir, pkg.tarball));
    if (result.integrity !== sri(tarball)) throw new Error(`${pkg.tarball} does not match the integrity npm reported`);
    const { files, problems } = inspectTarball(tarball, {
      name: pkg.name,
      version: pkg.version,
      directory: pkg.path,
      internalVersions,
      requireChangelog: existsSync(join(root, pkg.path, 'CHANGELOG.md')),
      license,
      notice,
    });
    if (problems.length > 0) throw new Error(`${pkg.tarball} failed inspection:\n- ${problems.join('\n- ')}`);
    const sbom = Buffer.from(`${JSON.stringify(createSbom({ lock, path: pkg.path, tarball }), null, 2)}\n`);
    writeFileSync(join(dir, pkg.sbom), sbom);
    writeFileSync(
      join(dir, 'SHA256SUMS'),
      sha256Sums([
        { name: pkg.tarball, data: tarball },
        { name: pkg.sbom, data: sbom },
      ]),
    );
    console.log(`${pkg.tarball}: ${files.length} files (${files.join(', ')})`);
  }
  return packages;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(async () => {
    const args = parseArgs(process.argv.slice(2), { options: ['out'] });
    if (!args.out) throw new Error('Usage: assets.mjs --out <dir>');
    const packages = await buildAssets({ out: resolve(args.out), releases: process.env.RELEASES || undefined });
    setOutput('packages', JSON.stringify(packages));
  });
}
