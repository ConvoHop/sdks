// Workflow policies for the release pipeline. zizmor audits the workflows in
// CI; these checks also run locally and cover rules zizmor does not know.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

import { loadReleaseConfig, REPO_ROOT } from '../../scripts/release/lib.mjs';

const GITHUB_DIR = join(REPO_ROOT, '.github');
const WORKFLOWS_DIR = join(GITHUB_DIR, 'workflows');
const YAML = /\.ya?ml$/;

// The only write permissions each release.yml job may hold.
const RELEASE_JOB_WRITES = {
  'release-please': ['contents', 'issues', 'pull-requests'],
  plan: [],
  build: [],
  attest: ['attestations', 'id-token'],
  upload: ['contents'],
  npm: ['id-token'],
  finalize: ['contents'],
};

function yamlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return yamlFiles(path);
    return YAML.test(entry.name) ? [path] : [];
  });
}

function load(path) {
  return { name: relative(REPO_ROOT, path), lines: readFileSync(path, 'utf8').split(/\r?\n/) };
}

const workflows = readdirSync(WORKFLOWS_DIR)
  .filter((name) => YAML.test(name))
  .map((name) => load(join(WORKFLOWS_DIR, name)));
const release = workflows.find(({ name }) => name.endsWith('/release.yml'));

const indentOf = (line) => /^ */.exec(line)[0].length;
const isContent = (line) => line.trim() !== '' && !line.trimStart().startsWith('#');

// Top-level lines, and the lines of each job keyed by job id.
function sections(lines) {
  const top = [];
  const jobs = new Map();
  let inJobs = false;
  let job;
  for (const line of lines) {
    if (/^[^\s#]/.test(line)) {
      inJobs = /^jobs:\s*$/.test(line);
      job = undefined;
      top.push(line);
      continue;
    }
    const header = inJobs && /^ {2}([A-Za-z0-9_-]+):\s*(?:#.*)?$/.exec(line);
    if (header) {
      job = [];
      jobs.set(header[1], job);
    } else if (job) {
      job.push(line);
    } else {
      top.push(line);
    }
  }
  return { top, jobs };
}

// The `permissions:` mapping at the given indentation, or undefined if absent.
function permissionsAt(lines, indent) {
  const key = `${' '.repeat(indent)}permissions:`;
  const index = lines.findIndex((line) => line.startsWith(key));
  if (index === -1) return undefined;
  const inline = lines[index].slice(key.length).replace(/#.*/, '').trim();
  if (inline) return inline === '{}' ? {} : inline;
  const permissions = {};
  for (const line of lines.slice(index + 1)) {
    if (!isContent(line)) continue;
    if (indentOf(line) <= indent) break;
    const match = /^\s+([a-z-]+):\s*(read|write|none)\s*(?:#.*)?$/.exec(line);
    assert.ok(match, `unexpected permissions entry: ${line.trim()}`);
    permissions[match[1]] = match[2];
  }
  return permissions;
}

// Every `run:` script with its line number and shell commands.
function runScripts(lines) {
  const scripts = [];
  lines.forEach((line, index) => {
    const match = /^( *)(- )?run:(.*)$/.exec(line);
    if (!match) return;
    const keyIndent = match[1].length + (match[2] ? 2 : 0);
    const header = match[3].trim();
    const body = [];
    if (/^[|>][-+]?\s*(?:#.*)?$/.test(header)) {
      for (const next of lines.slice(index + 1)) {
        if (next.trim() !== '' && indentOf(next) <= keyIndent) break;
        body.push(next.trim());
      }
    } else {
      body.push(header);
    }
    // Folded scripts are one command; literal scripts have one per line.
    const commands = header.startsWith('>') ? [body.join(' ')] : body.join('\n').replace(/\\\n/g, ' ').split('\n');
    scripts.push({ line: index + 1, text: [header, ...body].join('\n'), commands: commands.filter(Boolean) });
  });
  return scripts;
}

// The steps of a job, each as one string.
function stepsOf(jobLines) {
  const start = jobLines.findIndex((line) => /^ {4}steps:\s*$/.test(line));
  if (start === -1) return [];
  const steps = [];
  for (const line of jobLines.slice(start + 1)) {
    if (isContent(line) && indentOf(line) <= 4) break;
    if (/^ {6}- /.test(line)) steps.push([line]);
    else if (steps.length > 0) steps.at(-1).push(line);
  }
  return steps.map((step) => step.join('\n'));
}

test('every action is pinned to a full commit SHA with its version', () => {
  const remote = /^[\w.-]+\/[\w.-]+(?:\/[\w./-]+)?@[0-9a-f]{40}$/;
  const pinnedImage = /^docker:\/\/\S+@sha256:[0-9a-f]{64}$/;
  let checked = 0;
  for (const { name, lines } of yamlFiles(GITHUB_DIR).map(load)) {
    lines.forEach((line, index) => {
      const match = /^\s*(?:- )?uses:\s*(["']?)([^\s"'#]+)\1\s*(.*)$/.exec(line);
      if (!match) return;
      checked += 1;
      const [, , ref, comment] = match;
      const where = `${name}:${index + 1}`;
      if (ref.startsWith('./') || pinnedImage.test(ref)) return;
      assert.match(ref, remote, `${where}: pin ${ref} to a full commit SHA`);
      assert.match(comment, /^# v\d+\.\d+\.\d+\S*$/, `${where}: add the release as "# vX.Y.Z" after the SHA`);
    });
  }
  assert.ok(checked > 0, 'no uses: lines found');
});

test('workflows never run untrusted code with secrets or write tokens', () => {
  for (const { name, lines } of workflows) {
    const text = lines.join('\n');
    assert.doesNotMatch(text, /\bpull_request_target\b/, `${name}: pull_request_target runs fork code with secrets`);
    assert.doesNotMatch(text, /\bworkflow_run\b/, `${name}: workflow_run runs with secrets after fork PRs`);
  }
});

test('every workflow restricts the GITHUB_TOKEN', () => {
  for (const { name, lines } of workflows) {
    const { top, jobs } = sections(lines);
    assert.ok(jobs.size > 0, `${name}: no jobs found`);
    if (permissionsAt(top, 0) !== undefined) continue;
    for (const [job, jobLines] of jobs) {
      assert.notEqual(permissionsAt(jobLines, 4), undefined, `${name}: job ${job} must declare permissions`);
    }
  }
});

test('run scripts read expressions from env, never inline', () => {
  for (const { name, lines } of workflows) {
    for (const { line, text } of runScripts(lines)) {
      assert.doesNotMatch(text, /\$\{\{/, `${name}:${line}: pass expressions to run scripts through env`);
    }
  }
});

test('npm publishing stays a dry run until REL-PUB', () => {
  const publish = /publish\.mjs|\bnpm\b[^|;&]*\s(?:publish|pub)(?:\s|$)/;
  let publishes = 0;
  for (const { name, lines } of workflows) {
    for (const { line, commands } of runScripts(lines)) {
      for (const command of commands.filter((text) => publish.test(text))) {
        publishes += 1;
        assert.match(command, /\s--dry-run(?:\s|$)/, `${name}:${line}: npm publishing must stay a dry run`);
      }
    }
  }
  assert.ok(publishes >= 2, 'expected dry-run publishes in CI and release.yml');
});

test('release.yml grants each job only the permissions it needs', () => {
  assert.ok(release, 'release.yml is missing');
  const { top, jobs } = sections(release.lines);
  assert.deepEqual(permissionsAt(top, 0), {}, 'release.yml must default to no permissions');
  assert.deepEqual([...jobs.keys()], Object.keys(RELEASE_JOB_WRITES), 'review the permissions of new release jobs');
  for (const [job, jobLines] of jobs) {
    const permissions = permissionsAt(jobLines, 4);
    assert.equal(typeof permissions, 'object', `${job} must list its permissions`);
    const writes = Object.keys(permissions).filter((scope) => permissions[scope] === 'write');
    assert.deepEqual(writes.sort(), RELEASE_JOB_WRITES[job], `${job} write permissions`);
  }
});

test('release.yml publishes from the npm environment at the release commit', () => {
  const { jobs } = sections(release.lines);
  assert.match(jobs.get('npm').join('\n'), /^ {4}environment:(?: npm| *\n {6}name: npm)\s*(?:#.*)?$/m);
  for (const [job, jobLines] of jobs) {
    if (job !== 'npm') assert.doesNotMatch(jobLines.join('\n'), /^ {4}environment:/m, `${job} must not use an environment`);
    for (const step of stepsOf(jobLines).filter((text) => /uses: actions\/checkout@/.test(text))) {
      assert.match(step, /persist-credentials: false/, `${job}: checkout must not persist the token`);
      if (job === 'plan') continue;
      assert.match(step, /ref: \$\{\{ needs\.plan\.outputs\.sha \}\}/, `${job}: check out the planned release commit`);
    }
  }
});

test('the release build runs every npm check that CI runs', () => {
  const ci = workflows.find(({ name }) => name.endsWith('/sdk-ci.yml'));
  assert.ok(ci, 'sdk-ci.yml is missing');
  // Only the mock job: the dev-stack job needs a running dev stack.
  const conformance = workflows.find(({ name }) => name.endsWith('/conformance.yml'));
  assert.ok(conformance, 'conformance.yml is missing');
  const npmChecks = (workflow, job) => {
    const jobLines = sections(workflow.lines).jobs.get(job);
    assert.ok(jobLines, `${workflow.name}: job ${job} is missing`);
    return runScripts(jobLines)
      .flatMap(({ commands }) => commands)
      .filter((command) => /^npm (?:test|run)(?:\s|$)/.test(command));
  };
  const ciChecks = npmChecks(ci, 'node');
  assert.ok(ciChecks.length >= 4, `expected the CI checks, found: ${ciChecks.join(', ')}`);
  const conformanceChecks = npmChecks(conformance, 'mock');
  assert.ok(conformanceChecks.length >= 1, 'expected the conformance check in conformance.yml');
  const releaseChecks = new Set(npmChecks(release, 'build'));
  for (const check of [...ciChecks, ...conformanceChecks]) {
    assert.ok(releaseChecks.has(check), `release.yml build must also run \`${check}\` before attesting`);
  }
});

test('PR titles use exactly the commit types release-please knows', () => {
  const { config } = loadReleaseConfig(REPO_ROOT);
  const prTitle = readFileSync(join(WORKFLOWS_DIR, 'pr-title.yml'), 'utf8');
  const block = /^( +)types: \|\n((?:\1 {2}[a-z]+\n)+)/m.exec(prTitle);
  assert.ok(block, 'pr-title.yml must list types as a block');
  const allowed = block[2].split('\n').map((type) => type.trim()).filter(Boolean);
  const changelogSections = config['changelog-sections'];
  assert.deepEqual([...allowed].sort(), changelogSections.map(({ type }) => type).sort());
  const visible = changelogSections.filter(({ hidden }) => !hidden).map(({ type }) => type);
  assert.deepEqual(visible.sort(), ['feat', 'fix', 'perf', 'revert'], 'only user-facing types release');
});
