// Plan job: decides which releases this run builds. A push builds what
// release-please just released; a manual dispatch on a release tag rebuilds
// the releases tagged at that commit. Either way every release must be tagged
// at the commit the run was triggered for, so the workflow definition and the
// provenance both belong to the release commit.
import { pathToFileURL } from 'node:url';

import { createGitHub } from './github.mjs';
import { isSemver, loadReleaseConfig, main, releaseTypeOf, REPO_ROOT, REPOSITORY, run, setOutput, tagName } from './lib.mjs';

export function planNpmPublication({
  repository, eventName, ref, sha, headSha, onMain, releases,
  publish = false, enabled = false, confirmation = '',
}) {
  if (typeof publish !== 'boolean' || typeof enabled !== 'boolean') throw new Error('Publication switches must be booleans');
  if (!publish) return false;
  if (repository !== REPOSITORY) throw new Error(`npm releases must run in ${REPOSITORY}`);
  if (eventName !== 'workflow_dispatch') throw new Error('npm publication requires a manual dispatch');
  const tag = typeof ref === 'string' && ref.startsWith('refs/tags/') ? ref.slice('refs/tags/'.length) : '';
  if (!tag || !releases.some((release) => release.tag === tag)) throw new Error('npm publication requires an exact planned release tag');
  if (!/^[0-9a-f]{40}$/.test(String(sha)) || sha !== headSha || onMain !== true) {
    throw new Error('npm publication requires the triggering release commit in origin/main');
  }
  if (!enabled) throw new Error('Configure npm ownership, trusted publishers and the protected npm environment before setting NPM_PUBLISH_ENABLED=true');
  if (confirmation !== `publish npm ${tag}`) throw new Error(`Explicit publication confirmation must be: publish npm ${tag}`);
  return true;
}

export async function npmPublicationFromGit({ root = REPO_ROOT, env = process.env, releases, publish = false }) {
  const request = {
    repository: env.GITHUB_REPOSITORY, eventName: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF,
    releases, publish, enabled: env.NPM_PUBLISH_ENABLED === 'true', confirmation: env.PUBLISH_CONFIRMATION ?? '',
  };
  if (publish !== true) return planNpmPublication(request);
  if (!/^[0-9a-f]{40}$/.test(String(env.GITHUB_SHA))) throw new Error('Expected a full triggering source SHA');
  const options = { cwd: root };
  const source = await run('git', ['rev-parse', '--verify', `${env.GITHUB_SHA}^{commit}`], options);
  const head = await run('git', ['rev-parse', 'HEAD'], options);
  if (source.code !== 0 || head.code !== 0) throw new Error('Cannot resolve the npm release source commit');
  const sha = source.stdout.trim();
  const headSha = head.stdout.trim();
  const ancestor = await run('git', ['merge-base', '--is-ancestor', headSha, 'origin/main'], options);
  if (![0, 1].includes(ancestor.code)) throw new Error('Cannot verify npm release ancestry in origin/main');
  const approved = planNpmPublication({ ...request, sha, headSha, onMain: ancestor.code === 0 });
  const tag = await run('git', ['rev-parse', '--verify', `${env.GITHUB_REF}^{commit}`], options);
  if (tag.code !== 0 || tag.stdout.trim() !== sha) throw new Error('The npm release tag no longer identifies the triggering commit');
  return approved;
}

function fromReleasePlease(json) {
  let outputs;
  try {
    outputs = JSON.parse(json || '{}');
  } catch {
    throw new Error('RELEASE_OUTPUTS is not valid JSON');
  }
  if (String(outputs.releases_created) !== 'true') throw new Error('release-please did not create any releases');
  let paths;
  try {
    paths = JSON.parse(outputs.paths_released ?? '[]');
  } catch {
    throw new Error('paths_released is not valid JSON');
  }
  if (!Array.isArray(paths) || paths.length === 0) throw new Error('release-please reported no released paths');
  return paths.map((path) => ({
    path,
    version: outputs[`${path}--version`],
    tag: outputs[`${path}--tag_name`],
    sha: outputs[`${path}--sha`],
  }));
}

// Every configured package whose manifest version is tagged at `sha`.
async function fromTags({ config, manifest, sha, github }) {
  const releases = [];
  for (const path of Object.keys(config.packages ?? {})) {
    const version = manifest[path];
    if (!isSemver(version)) continue;
    const tag = tagName(config, path, version);
    if ((await github.resolveTagCommit(tag)) === sha) releases.push({ path, version, tag });
  }
  if (releases.length === 0) {
    throw new Error(
      `No release tag points to ${sha}. Run this workflow on a release tag, for example: gh workflow run release.yml --ref core-v0.1.0`,
    );
  }
  return releases;
}

export async function planRelease({ eventName, releaseOutputs, sha, config, manifest, github }) {
  if (!/^[0-9a-f]{40}$/.test(String(sha))) throw new Error('GITHUB_SHA must be the commit SHA of this run');
  let releases;
  if (eventName === 'push') releases = fromReleasePlease(releaseOutputs);
  else if (eventName === 'workflow_dispatch') releases = await fromTags({ config, manifest, sha, github });
  else throw new Error(`Unsupported event ${eventName}`);

  const paths = new Set();
  for (const { path, version, tag } of releases) {
    if (!config.packages?.[path]) throw new Error(`${path} is not in release-please-config.json`);
    const type = releaseTypeOf(config, path);
    if (type !== 'node') {
      throw new Error(`release.yml cannot publish ${path} (release-type ${type}); add a job for it before releasing it`);
    }
    if (!isSemver(version)) throw new Error(`${path}: ${version} is not a semantic version`);
    const expected = tagName(config, path, version);
    if (tag !== expected) throw new Error(`${path} ${version} should be tagged ${expected}, not ${tag}`);
    if (paths.has(path)) throw new Error(`${path} is listed twice`);
    paths.add(path);
  }

  for (const release of releases) {
    const commit = await github.resolveTagCommit(release.tag);
    if (commit === undefined) throw new Error(`Tag ${release.tag} does not exist`);
    if (release.sha && release.sha !== commit) {
      throw new Error(`${release.tag} points to ${commit}, but release-please released ${release.sha}`);
    }
    if (commit !== sha) {
      throw new Error(
        `${release.tag} points to ${commit}, not to ${sha}, which triggered this run. ` +
          `Run this workflow on the tag to build it: gh workflow run release.yml --ref ${release.tag}`,
      );
    }
  }
  return { sha, releases: releases.map(({ path, version, tag }) => ({ path, version, tag })) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(async () => {
    const { config, manifest } = loadReleaseConfig(REPO_ROOT);
    const plan = await planRelease({
      eventName: process.env.EVENT_NAME,
      releaseOutputs: process.env.RELEASE_OUTPUTS,
      sha: process.env.GITHUB_SHA,
      config,
      manifest,
      github: createGitHub(),
    });
    console.log(`Release commit ${plan.sha}: ${plan.releases.map((release) => release.tag).join(', ')}`);
    const requested = process.env.REQUEST_PUBLISH ?? 'false';
    if (!['true', 'false'].includes(requested)) throw new Error('REQUEST_PUBLISH must be true or false');
    const publish = await npmPublicationFromGit({ releases: plan.releases, publish: requested === 'true' });
    setOutput('sha', plan.sha);
    setOutput('releases', JSON.stringify(plan.releases));
    setOutput('publish', String(publish));
  });
}
