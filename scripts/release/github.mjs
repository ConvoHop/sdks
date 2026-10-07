// Minimal GitHub REST client for the release jobs. Pass `fetch` to stub it in tests.
import { REPOSITORY } from './lib.mjs';

function encodeRef(ref) {
  return ref.split('/').map(encodeURIComponent).join('/');
}

export function createGitHub({ env = process.env, fetch = globalThis.fetch } = {}) {
  const apiUrl = (env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');
  const repository = env.GITHUB_REPOSITORY || REPOSITORY;
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token) throw new Error('GH_TOKEN or GITHUB_TOKEN is required');

  async function request(method, url, { json, body, contentType, allow = [] } = {}) {
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'convohop-sdks-release',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    if (contentType) headers['Content-Type'] = contentType;
    const response = await fetch(url.startsWith('https://') ? url : `${apiUrl}${url}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : body,
    });
    if (!response.ok && !allow.includes(response.status)) {
      const text = await response.text().catch(() => '');
      throw new Error(`GitHub ${method} ${url.split('?')[0]} failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    return response;
  }

  async function listReleases() {
    const releases = [];
    for (let page = 1; ; page += 1) {
      const response = await request('GET', `/repos/${repository}/releases?per_page=100&page=${page}`);
      const batch = await response.json();
      releases.push(...batch);
      if (batch.length < 100) return releases;
    }
  }

  // Drafts are only visible through the list endpoint (with push access).
  async function findUniqueDraft(tag) {
    const matches = (await listReleases()).filter((release) => release.tag_name === tag);
    if (matches.length === 0) throw new Error(`No GitHub Release found for ${tag}`);
    if (matches.length > 1) throw new Error(`${matches.length} GitHub Releases use ${tag}; delete the duplicates first`);
    if (!matches[0].draft) throw new Error(`The GitHub Release for ${tag} is already published; refusing to change it`);
    return matches[0];
  }

  async function findRelease(tag) {
    const matches = (await listReleases()).filter((release) => release.tag_name === tag);
    if (matches.length !== 1) throw new Error(`Expected one GitHub Release for ${tag}, found ${matches.length}`);
    return matches[0];
  }

  // Replaces an existing asset with the same name so re-runs are idempotent.
  async function uploadAsset(release, name, data) {
    for (const asset of release.assets ?? []) {
      if (asset.name === name) await request('DELETE', `/repos/${repository}/releases/assets/${asset.id}`);
    }
    const uploadUrl = `${release.upload_url.replace(/\{.*\}$/, '')}?name=${encodeURIComponent(name)}`;
    const response = await request('POST', uploadUrl, { body: data, contentType: 'application/octet-stream' });
    return response.json();
  }

  async function publishRelease(release, { prerelease = false } = {}) {
    const json = prerelease ? { draft: false, prerelease: true } : { draft: false };
    const response = await request('PATCH', `/repos/${repository}/releases/${release.id}`, { json });
    return response.json();
  }

  // Resolves to the commit a tag points to, or undefined when the tag does not exist.
  async function resolveTagCommit(tag) {
    const response = await request('GET', `/repos/${repository}/git/ref/tags/${encodeRef(tag)}`, { allow: [404] });
    if (response.status === 404) return undefined;
    let { object } = await response.json();
    for (let depth = 0; object.type === 'tag' && depth < 5; depth += 1) {
      ({ object } = await (await request('GET', `/repos/${repository}/git/tags/${object.sha}`)).json());
    }
    if (object.type !== 'commit') throw new Error(`Tag ${tag} does not point to a commit`);
    return object.sha;
  }

  return { repository, listReleases, findUniqueDraft, findRelease, uploadAsset, publishRelease, resolveTagCommit };
}
