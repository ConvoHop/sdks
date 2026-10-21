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
  'npm-check': [],
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

test('only the explicitly gated npm release job can publish; all CI publication remains a dry run', () => {
  const publish = /publish\.mjs|\bnpm\b[^|;&]*\s(?:publish|pub)(?:\s|$)/;
  let publishes = 0;
  for (const { name, lines } of workflows) {
    for (const [job, jobLines] of sections(lines).jobs) {
      for (const { line, commands } of runScripts(jobLines)) {
        for (const command of commands.filter((text) => publish.test(text))) {
          if (name.endsWith('/release.yml') && job === 'npm') {
            assert.match(command, /publish\.mjs --publish --require-oidc/);
            assert.doesNotMatch(command, /--skip-published|--dry-run/);
          } else {
            publishes += 1;
            assert.match(command, /\s--dry-run(?:\s|$)/, `${name}:${line}: npm publishing must stay a dry run`);
          }
        }
      }
    }
  }
  assert.ok(publishes >= 2, 'expected dry-run publishes in CI and the credential-free release rehearsal');
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
  const npm = jobs.get('npm').join('\n');
  assert.match(npm, /needs\.plan\.outputs\.publish == 'true'/);
  assert.match(npm, /NPM_PUBLISH_ENABLED: \$\{\{ vars\.NPM_PUBLISH_ENABLED/);
  assert.match(npm, /PUBLISH_CONFIRMATION: \$\{\{ inputs\.confirmation \}\}/);
  assert.match(npm, /fetch-depth: 0/);
  assert.doesNotMatch(npm, /\bsecrets\.|NODE_AUTH_TOKEN|NPM_TOKEN/);
  assert.match(jobs.get('plan').join('\n'), /REQUEST_PUBLISH: \$\{\{ inputs\.publish \|\| false \}\}/);
  assert.match(jobs.get('upload').join('\n'), /needs\.plan\.outputs\.publish != 'true'/);
  assert.match(jobs.get('finalize').join('\n'), /needs\.plan\.outputs\.publish != 'true'/);
  assert.deepEqual(permissionsAt(jobs.get('npm-check'), 4), { contents: 'read' });
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
  // The mock offers every capability and the reference driver every feature, so any skip is a regression.
  assert.ok(conformanceChecks.includes('npm run conformance -- --strict'), 'the mock conformance job must run with --strict');
  const releaseChecks = new Set(npmChecks(release, 'build'));
  for (const check of [...ciChecks, ...conformanceChecks]) {
    assert.ok(releaseChecks.has(check), `release.yml build must also run \`${check}\` before attesting`);
  }
});

test('registry publishers are separate, explicitly gated jobs with no incidental branch publication', () => {
  const instructions = readFileSync(join(REPO_ROOT, 'RELEASING.md'), 'utf8');
  for (const [file, environment] of [
    ['pypi-release.yml', 'pypi'], ['nuget-release.yml', 'nuget'], ['pubdev-release.yml', 'pubdev'],
  ]) {
    const workflow = workflows.find(({ name }) => name.endsWith(`/${file}`));
    assert.ok(workflow, `${file} is missing`);
    const { top, jobs } = sections(workflow.lines);
    assert.deepEqual(permissionsAt(top, 0), {}, `${file} must default to no permissions`);
    assert.deepEqual([...jobs.keys()], ['prepare', 'publish']);
    const preparation = jobs.get('prepare').join('\n');
    assert.match(preparation, /uses: \.\/\.github\/workflows\/registry-prepare\.yml/);
    assert.deepEqual(permissionsAt(jobs.get('prepare'), 4), { contents: 'read' });
    const publication = jobs.get('publish').join('\n');
    assert.match(publication, /if: .*needs\.prepare\.outputs\.publish == 'true'/);
    assert.match(publication, new RegExp(`^ {4}environment: ${environment.replace('.', '\\.')}\\s*$`, 'm'));
    assert.ok(instructions.includes(`| \`${file}\` | \`${environment}\` |`), `${file} trust instructions must use ${environment}`);
    assert.deepEqual(permissionsAt(jobs.get('publish'), 4), { contents: 'read', 'id-token': 'write' });
    assert.match(publication, /ref: \$\{\{ needs\.prepare\.outputs\.sha \}\}/);
    assert.match(publication, /persist-credentials: false/);
    assert.match(publication, /registry\.mjs verify/);
    assert.doesNotMatch(publication, /\bsecrets\./, `${file} must use short-lived registry credentials, not a stored key`);
    if (file !== 'pubdev-release.yml') {
      assert.doesNotMatch(top.join('\n'), /^ {2}(push|pull_request|release):/m);
      assert.match(top.join('\n'), /publish:\n(?:.*\n)*? {8}default: false/);
      assert.match(preparation, /confirmation: \$\{\{ inputs\.confirmation \}\}/);
    } else {
      assert.match(top.join('\n'), /tags: \["flutter-v\*"\]/);
      assert.match(preparation, /github\.event_name == 'push' && vars\.PUBDEV_PUBLISH_ENABLED == 'true'/);
      assert.match(publication, /if: github\.event_name == 'push'/);
      assert.ok(publication.indexOf('registry.mjs pubdev-ready') < publication.indexOf('uses: dart-lang/setup-dart@'));
    }
  }
});

test('registry preparation has no credentials and preserves explicit publication readiness switches', () => {
  const workflow = workflows.find(({ name }) => name.endsWith('/registry-prepare.yml'));
  assert.ok(workflow);
  const { top, jobs } = sections(workflow.lines);
  assert.deepEqual(permissionsAt(top, 0), {});
  assert.deepEqual([...jobs.keys()], ['prepare']);
  const job = jobs.get('prepare');
  assert.deepEqual(permissionsAt(job, 4), { contents: 'read' });
  const text = job.join('\n');
  assert.doesNotMatch(text, /environment:|\bsecrets\.|id-token:|NuGet\/login|gh-action-pypi-publish|pub publish --force|nuget push/);
  assert.match(text, /vars\.PYPI_PUBLISH_ENABLED/);
  assert.match(text, /vars\.NUGET_PUBLISH_ENABLED/);
  assert.match(text, /vars\.PUBDEV_PUBLISH_ENABLED/);
  assert.match(text, /vars\.MAVEN_PUBLISH_ENABLED/);
  assert.match(text, /registry\.mjs plan/);
  assert.match(text, /registry\.mjs seal/);
  assert.match(text, /fetch-depth: 0/);
  assert.match(text, /--ignore-scripts/);
  assert.doesNotMatch(text, /conformance --|dev-stack\.mjs|self-hosted/);
});

test('Central reuses preparation, verifies before signing and gates existing credentials behind maven approval', () => {
  const maven = workflows.find(({ name }) => name.endsWith('/maven-prepare.yml'));
  assert.ok(maven);
  const { top, jobs } = sections(maven.lines);
  assert.deepEqual(permissionsAt(top, 0), {});
  assert.deepEqual([...jobs.keys()], ['prepare', 'publish']);
  assert.match(top.join('\n'), /publish:\n(?:.*\n)*? {8}default: false/);
  const preparation = jobs.get('prepare').join('\n');
  assert.match(preparation, /uses: \.\/\.github\/workflows\/registry-prepare\.yml/);
  assert.match(preparation, /confirmation: \$\{\{ inputs\.confirmation \}\}/);
  assert.deepEqual(permissionsAt(jobs.get('prepare'), 4), { contents: 'read' });
  const publication = jobs.get('publish').join('\n');
  assert.match(publication, /if: needs\.prepare\.outputs\.publish == 'true'/);
  assert.match(publication, /^ {4}environment: maven$/m);
  assert.deepEqual(permissionsAt(jobs.get('publish'), 4), { contents: 'read' });
  assert.match(publication, /ref: \$\{\{ needs\.prepare\.outputs\.sha \}\}/);
  assert.ok(publication.indexOf('registry.mjs verify') < publication.indexOf('secrets.MAVEN_SIGNING_KEY'));
  assert.ok(publication.indexOf('sign-maven') < publication.indexOf('secrets.MAVEN_CENTRAL_USERNAME'));
  assert.match(publication, /registry\.mjs maven-publish/);
  assert.doesNotMatch(publication, /id-token:|skip-existing|skip-duplicate|--retry/);
});

test('registry uploads verify exact assets before authentication and never blindly skip duplicates', () => {
  const pypi = workflows.find(({ name }) => name.endsWith('/pypi-release.yml')).lines.join('\n');
  assert.ok(pypi.indexOf('registry.mjs verify') < pypi.indexOf('uses: pypa/gh-action-pypi-publish@'));
  assert.match(pypi, /skip-existing: false/);
  assert.match(pypi, /attestations: true/);
  const nuget = workflows.find(({ name }) => name.endsWith('/nuget-release.yml')).lines.join('\n');
  assert.ok(nuget.indexOf('registry.mjs verify') < nuget.indexOf('uses: NuGet/login@'));
  assert.match(nuget, /user: \$\{\{ vars\.NUGET_USER \}\}/);
  assert.match(nuget, /NUGET_API_KEY: \$\{\{ steps\.login\.outputs\.NUGET_API_KEY \}\}/);
  assert.doesNotMatch(nuget, /--skip-duplicate/);
  assert.match(nuget, /registry-assets\/InstantRelay\.\$VERSION\.nupkg/);
  const pubdev = workflows.find(({ name }) => name.endsWith('/pubdev-release.yml')).lines.join('\n');
  assert.match(pubdev, /registry-assets\/instantrelay-\$VERSION\.tar\.gz/);
});

test('development metadata stays blocked while Central uses complete build-local publications', () => {
  const python = readFileSync(join(REPO_ROOT, 'python/pyproject.toml'), 'utf8');
  const flutter = readFileSync(join(REPO_ROOT, 'flutter/pubspec.yaml'), 'utf8');
  assert.match(python, /"Private :: Do Not Upload"/);
  assert.match(python, /^name = "instantrelay"$/m);
  assert.match(flutter, /^publish_to: none$/m);
  assert.match(flutter, /^name: instantrelay$/m);
  const dotnet = readFileSync(join(REPO_ROOT, 'dotnet/src/Relay/Relay.csproj'), 'utf8');
  assert.match(dotnet, /<PackageId>InstantRelay<\/PackageId>/);
  assert.match(dotnet, /<AssemblyName>Relay<\/AssemblyName>/);
  const maven = readFileSync(join(REPO_ROOT, 'scripts/release/maven-publishing.gradle.kts'), 'utf8');
  assert.match(maven, /useInMemoryPgpKeys\(signingKey, signingPassword\)/);
  assert.match(maven, /environmentVariable\("MAVEN_SIGNING_KEY"\)/);
  assert.match(maven, /environmentVariable\("MAVEN_SIGNING_PASSWORD"\)/);
  assert.match(maven, /layout\.buildDirectory\.dir\("repo"\)/);
  assert.doesNotMatch(maven, /https:\/\/central\.|ossrh|credentials\s*\{/);
  for (const module of ['core', 'push', 'relay']) {
    const build = readFileSync(join(REPO_ROOT, 'android', module, 'build.gradle.kts'), 'utf8');
    assert.match(build, /withJavadocJar\(\)/, `${module} must supply documentation, not just sources`);
    assert.match(build, /^description = ".+"/m, `${module} needs Central POM description metadata`);
  }
  for (const sdk of ['jvm', 'android']) {
    const workflow = workflows.find(({ name }) => name.endsWith(`/${sdk}.yml`)).lines.join('\n');
    assert.equal(workflow.match(/- scripts\/release\/maven-publishing\.gradle\.kts/g)?.length, 2);
    if (sdk === 'jvm') assert.match(workflow, /Validate shared Maven release configuration[\s\S]+?gradlew --no-daemon --console=plain help/);
  }
});

test('PR titles use exactly the commit types release-please knows', () => {
  const { config } = loadReleaseConfig(REPO_ROOT);
  const changelogSections = config['changelog-sections'];
  const changelogTypes = changelogSections.map(({ type }) => type).sort();
  const prTitle = workflows.find(({ name }) => name.endsWith('/pr-title.yml'));
  assert.ok(prTitle, 'pr-title.yml is missing');
  // Each step that checks titles has its own copy of the types, and every
  // copy must match, so they can't drift apart.
  const checks = [...sections(prTitle.lines).jobs.values()]
    .flatMap(stepsOf)
    .filter((step) => /^ *(?:- )?uses:\s*["']?amannn\/action-semantic-pull-request@/m.test(step));
  assert.ok(checks.length > 0, 'pr-title.yml must check titles with amannn/action-semantic-pull-request');
  for (const step of checks) {
    const lines = step.split('\n');
    const where = `${prTitle.name} step "${lines[0].trim().replace(/^- /, '')}"`;
    const key = lines.findIndex((line) => /^ *types:/.test(line));
    assert.match(lines[key] ?? '', /^ *types: \|\s*$/, `${where} must list types as a block`);
    const block = [];
    for (const next of lines.slice(key + 1)) {
      if (next.trim() !== '' && indentOf(next) <= indentOf(lines[key])) break;
      block.push(next);
    }
    // The action reads one type per non-empty line.
    const allowed = block.map((type) => type.trim()).filter(Boolean);
    assert.deepEqual(allowed.sort(), changelogTypes, `${where} must allow exactly the changelog section types`);
  }
  const visible = changelogSections.filter(({ hidden }) => !hidden).map(({ type }) => type);
  assert.deepEqual(visible.sort(), ['feat', 'fix', 'perf', 'revert'], 'only user-facing types release');
});
