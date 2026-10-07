// upload job: attaches tarballs, SBOMs, SHA256SUMS and Sigstore bundles to
// each package's draft GitHub Release. finalize job: publishes the drafts.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createGitHub } from './github.mjs';
import { isPrerelease, main, notice, parseArgs, parsePackageList, releaseAssetNames, sha256Sums } from './lib.mjs';

export const PREDICATE_TYPES = {
  provenance: 'https://slsa.dev/provenance/v1',
  sbom: 'https://cyclonedx.org/bom',
};

function sameNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function parseJson(data) {
  try {
    return JSON.parse(data.toString('utf8'));
  } catch {
    return undefined;
  }
}

// Checks that a Sigstore bundle signs an in-toto statement about `digest`, so
// stale bundles from an earlier build attempt are never attached.
export function checkBundle(name, data, { predicateType, digest }) {
  const bundle = parseJson(data);
  if (!String(bundle?.mediaType).startsWith('application/vnd.dev.sigstore.bundle')) {
    throw new Error(`${name} is not a Sigstore bundle`);
  }
  const envelope = bundle.dsseEnvelope;
  const statement =
    envelope?.payloadType === 'application/vnd.in-toto+json' && typeof envelope.payload === 'string'
      ? parseJson(Buffer.from(envelope.payload, 'base64'))
      : undefined;
  if (statement?._type !== 'https://in-toto.io/Statement/v1') throw new Error(`${name} does not sign an in-toto statement`);
  if (statement.predicateType !== predicateType) {
    throw new Error(`${name} has predicate type ${statement.predicateType}, expected ${predicateType}`);
  }
  const subjects = Array.isArray(statement.subject) ? statement.subject : [];
  if (!subjects.some((subject) => subject?.digest?.sha256 === digest)) {
    throw new Error(`${name} does not attest sha256:${digest}`);
  }
}

// Reads and checks the exact asset set for one package.
export function collectAssets(pkg, assets, attestations) {
  const assetDir = join(assets, pkg.component);
  const attestationDir = join(attestations, pkg.component);
  const built = [pkg.tarball, pkg.sbom, 'SHA256SUMS'];
  const bundles = {
    provenance: `${pkg.base}.provenance.sigstore.json`,
    sbom: `${pkg.base}.sbom.sigstore.json`,
  };
  for (const [dir, expected] of [
    [assetDir, built],
    [attestationDir, Object.values(bundles)],
  ]) {
    const actual = readdirSync(dir);
    if (!sameNames(actual, expected)) throw new Error(`${dir} has ${actual.sort().join(', ')}; expected ${expected.join(', ')}`);
  }
  const files = [
    ...built.map((name) => ({ name, data: readFileSync(join(assetDir, name)) })),
    ...Object.values(bundles).map((name) => ({ name, data: readFileSync(join(attestationDir, name)) })),
  ];
  const byName = Object.fromEntries(files.map((file) => [file.name, file.data]));
  const sums = sha256Sums([
    { name: pkg.tarball, data: byName[pkg.tarball] },
    { name: pkg.sbom, data: byName[pkg.sbom] },
  ]);
  if (byName.SHA256SUMS.toString('utf8') !== sums) throw new Error(`SHA256SUMS does not match the ${pkg.name} assets`);
  const digest = createHash('sha256').update(byName[pkg.tarball]).digest('hex');
  for (const [kind, name] of Object.entries(bundles)) {
    checkBundle(name, byName[name], { predicateType: PREDICATE_TYPES[kind], digest });
  }
  if (!sameNames(Object.keys(byName), releaseAssetNames(pkg))) throw new Error(`Unexpected asset set for ${pkg.name}`);
  return files;
}

export async function uploadAssets({ github, packages, assets, attestations }) {
  const collected = packages.map((pkg) => ({ pkg, files: collectAssets(pkg, assets, attestations) }));
  for (const { pkg, files } of collected) {
    const release = await github.findUniqueDraft(pkg.tag);
    for (const file of files) await github.uploadAsset(release, file.name, file.data);
    notice(`Attached ${files.map((file) => file.name).join(', ')} to the ${pkg.tag} draft`);
  }
}

export async function publishReleases({ github, packages }) {
  for (const pkg of packages) {
    const release = await github.findRelease(pkg.tag);
    if (!release.draft) {
      notice(`The ${pkg.tag} GitHub Release is already published`);
      continue;
    }
    const attached = new Set((release.assets ?? []).map((asset) => asset.name));
    const missing = releaseAssetNames(pkg).filter((name) => !attached.has(name));
    if (missing.length > 0) throw new Error(`The ${pkg.tag} draft is missing ${missing.join(', ')}`);
    // Prereleases stay marked on GitHub, as they use the `next` dist-tag on npm.
    await github.publishRelease(release, { prerelease: isPrerelease(pkg.version) });
    notice(`Published the ${pkg.tag} GitHub Release`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(async () => {
    const [command, ...rest] = process.argv.slice(2);
    if (!process.env.RELEASE_PACKAGES) throw new Error('RELEASE_PACKAGES is required');
    const packages = parsePackageList(process.env.RELEASE_PACKAGES);
    const github = createGitHub();
    if (command === 'upload') {
      const args = parseArgs(rest, { options: ['assets', 'attestations'] });
      if (!args.assets || !args.attestations) throw new Error('Usage: github-release.mjs upload --assets <dir> --attestations <dir>');
      await uploadAssets({ github, packages, assets: resolve(args.assets), attestations: resolve(args.attestations) });
    } else if (command === 'publish') {
      parseArgs(rest);
      await publishReleases({ github, packages });
    } else {
      throw new Error('Usage: github-release.mjs upload|publish');
    }
  });
}
