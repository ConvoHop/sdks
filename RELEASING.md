# Releasing the ConvoHop SDKs

This document explains how the SDK packages in this repository are versioned
and released, how to install and verify a release, and what has to happen
before releases go to package registries.

> [!IMPORTANT]
> No registry publication is claimed by this document. The existing npm
> release train publishes GitHub Releases and only dry-runs npm. Separate
> [registry workflows](#registry-release-preparation) prepare Python, .NET,
> Flutter and Maven artifacts. PyPI/NuGet publishing needs an explicit tagged
> dispatch, readiness configuration and environment approval; pub.dev also
> needs a real manual first publication. Maven Central publication remains
> paused for domain namespace verification.

## What gets released

[release-please](https://github.com/googleapis/release-please) runs in
manifest mode. [`release-please-config.json`](release-please-config.json)
lists the packages it releases.
[`.release-please-manifest.json`](.release-please-manifest.json) records the
last released version of each one, where `0.0.0` means not released yet.

| Package | Directory | Tags | Changelog |
| --- | --- | --- | --- |
| `@convohop/core` | `packages/core` | `core-vX.Y.Z` | `packages/core/CHANGELOG.md` |
| `@convohop/client` | `packages/client` | `client-vX.Y.Z` | `packages/client/CHANGELOG.md` |
| `@convohop/server` | `packages/server` | `server-vX.Y.Z` | `packages/server/CHANGELOG.md` |

Nothing else joins this automatic npm release train, including the root workspace, `schema/`,
`tools/`, `scripts/`, `test/`, `docs/` and test harnesses such as the
conformance suite. Any other directory with a `package.json`, such as a
tool or a harness, stays `"private": true` and out of the release
configuration. `npm run check:release` enforces both.

Each GitHub Release has these assets. `<base>` is the tarball name without
its extension, for example `convohop-client-0.1.0`.

| Asset | Contents |
| --- | --- |
| `<base>.tgz` | The npm package, exactly as `npm publish` would upload it |
| `<base>.cdx.json` | A CycloneDX 1.5 SBOM of the package's runtime dependencies, resolved from `package-lock.json` |
| `SHA256SUMS` | SHA-256 checksums of the tarball and the SBOM |
| `<base>.provenance.sigstore.json` | Signed SLSA build provenance for the tarball, the SBOM and `SHA256SUMS` |
| `<base>.sbom.sigstore.json` | A signed attestation that binds the SBOM to the tarball |

`scripts/release/sbom.mjs` writes the SBOM, because `npm sbom` describes the
whole workspace, including development dependencies. GitHub also stores both
attestations with this repository, so `gh attestation verify` works without
the bundle files.

## How a release happens

1. Pull requests are squash-merged into `main`, and the pull request title
   becomes the commit message. See [Versioning](#versioning).
2. On every push to `main`, the [release workflow](.github/workflows/release.yml)
   runs release-please. It keeps one release pull request open, titled
   `chore: release main`. That pull request bumps the version of each package
   with releasable changes, the exact `@convohop/core` dependency of the
   packages that use it, `package-lock.json`, the manifest and each
   package's `CHANGELOG.md`.
3. release-please opens and updates the release pull request with
   `GITHUB_TOKEN`, so GitHub
   [doesn't start its checks by itself](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs),
   and the required checks block the merge. Start them when the pull
   request opens and after each push to it, in one of these ways:
   - In the pull request's merge box, select **Approve workflows to run**.
     Anyone with write access can approve.
   - Close and reopen the pull request, for example with `gh pr close` and
     `gh pr reopen`. Checks start normally when a person reopens it.
   - As a last resort, an administrator who can bypass the `main` ruleset
     merges without the checks. The release workflow still runs CI's checks
     and tests on the merge commit before it attests or attaches anything.

   On Node.js 24, CI packs the bumped packages and dry-runs `npm publish`.
4. A maintainer reviews the versions and changelogs and merges the release
   pull request once the release is approved.
5. That merge is another push to `main`. This time release-please tags the
   merge commit for each released package and creates a draft GitHub Release
   with the changelog as its notes. Tags created with `GITHUB_TOKEN` don't
   start other workflows, so the same run builds the release:
   1. **Plan** checks that every new tag points to the commit that started
      the run.
   2. **Build, check and pack** checks out that commit, installs the locked
      dependencies without lifecycle scripts, runs every check and test,
      including the conformance scenarios against the mock, and packs each
      released package with its SBOM and `SHA256SUMS`.
   3. **Attest** signs build provenance and an SBOM attestation for each
      package, then verifies them as a user would.
   4. **Attach the assets to the draft releases** checks the complete asset
      set and uploads it.
   5. **Publish to npm (dry run)** waits for approval in the `npm`
      environment. It then runs
      `npm publish --dry-run --provenance --access public` for each tarball,
      `@convohop/core` first.
   6. **Publish the GitHub Releases** publishes the drafts. A release stays a
      draft until every asset is attached, so a published release is never
      missing assets.

The workflow's token has no permissions by default. Each job asks only for
what it needs:

| Job | Token permissions |
| --- | --- |
| Release PR and tags | `contents`, `issues` and `pull-requests`: write |
| Plan; Build, check and pack | `contents: read` |
| Attest | `contents: read`, `id-token: write`, `attestations: write` |
| Attach the assets to the draft releases | `contents: write` |
| Publish to npm (dry run) | `contents: read`, `id-token: write`, in the `npm` environment |
| Publish the GitHub Releases | `contents: write` |

Only one release run executes at a time:

- Jobs that a run skips never request approval, so only a run that releases
  something waits in the `npm` environment. While it waits, later runs
  queue behind it, and the release pull request isn't updated until the
  deployment is approved or rejected.
- GitHub keeps only the newest pending run. If another push lands while the
  run for a release merge is still pending, GitHub cancels that pending run.
  The next run tags the release, but its Plan job fails because the tags
  point to the release commit, not to the commit that started the run. The
  error tells you to run the workflow on the tag, as described in
  [Recovering a release](#recovering-a-release).

## Versioning

release-please gives each package its next version from the commits that
changed files in its directory since its last release.

| Commit | While at 0.x | From 1.0.0 |
| --- | --- | --- |
| `feat` | Minor | Minor |
| `fix`, `perf` or `revert` | Patch | Patch |
| Any type with `!`, such as `feat!:`, or a `BREAKING CHANGE:` footer | Minor | Major |
| `docs`, `test`, `refactor`, `build`, `ci`, `chore` or `style` | No release, and not in the changelog | No release, and not in the changelog |

While a package is at 0.x, `feat` still makes a minor release. That keeps
the [SDK strategy](docs/sdk-strategy.md#0x-until-general-availability)
promise that a patch release contains only fixes.

- **Which packages a commit releases.** A commit counts for every package
  whose directory it changes. The scope in the title, such as `(client)`, is
  only for readers. A commit that changes nothing in a package directory,
  such as a lockfile-only dependency update, releases nothing.
- **Dependents.** When `@convohop/core` is released, release-please also
  releases `@convohop/client` and `@convohop/server` with at least a patch
  bump, and updates their exact `@convohop/core` dependency. If a core
  change adds to or breaks the API that client or server re-exports, change
  that package in the same pull request too, for example its README or
  tests. That gives it the minor release the change needs.
- **Internal dependencies.** Released packages depend on each other with
  exact versions in `dependencies`, such as `"@convohop/core": "0.1.0"`.
  Don't add a released package to another package's `devDependencies`:
  release-please would treat it as a release dependency. Workspace links
  already make every package importable in tests.
- **Unreleased workspaces** depend on released packages with `"*"`, so
  version bumps don't break their workspace links.
- **Dependabot.** Production dependency updates are titled `fix(deps): …`,
  development updates `chore(deps-dev): …` and GitHub Actions updates
  `ci: …`. A production update releases a patch only of the packages whose
  `package.json` it changes. If an update changes a package's public API,
  retitle the pull request before you merge it.

Don't edit `CHANGELOG.md` files, package versions or the manifest by hand.
To change how a merged pull request is released, use a commit override.

## Commit overrides

To change the commit message that release-please reads for a merged pull
request, add an override block to the pull request's description. For
example, this marks a change as breaking and gives the migration note for
the changelog:

```text
BEGIN_COMMIT_OVERRIDE
feat(client)!: rename `connect` to `connectMedia`

BREAKING CHANGE: Call `call.connectMedia()` where you called `call.connect()`.
END_COMMIT_OVERRIDE
```

- release-please uses the override the next time it runs, which is the next
  push to `main`.
- To record several changes, separate the messages with a blank line. Each
  one starts with a type, such as `fix:`. Put a breaking message first,
  because release-please doesn't start a new message at a header with `!`.
- Every message applies to all the packages that the pull request changed.
- A `Release-As: X.Y.Z` footer sets the next version of every package that
  the pull request changed, whatever the commit type. The changelog always
  lists a message with this footer, even when its type is hidden, such as
  `chore`.

## Prereleases

- To start a prerelease, put a `Release-As: 0.3.0-rc.1` footer in a commit
  override on a pull request that changes the package.
- Later commits keep the prerelease suffix: a fix after `0.3.0-rc.1` makes
  `0.3.1-rc.1`. Set each release candidate with `Release-As`, and finish
  with `Release-As: 0.3.0`.
- A stable release can't depend on a prerelease. When you prerelease
  `@convohop/core`, include `@convohop/client` and `@convohop/server` in the
  same pull request. CI on the release pull request fails if a stable
  package would pin a prerelease of core.
- A prerelease is published with the npm `next` dist-tag, and its GitHub
  Release is marked as a prerelease.

## First release

- `bootstrap-sha` in the configuration is the commit that split the SDKs
  into the current packages. The first changelogs start after it.
- Every package starts at `0.0.0` in the manifest, which means not released
  yet. A package with releasable changes gets the configured
  `initial-version`, 0.1.0, as its first release.
- The pull request that added this pipeline has this override in its
  description, so each package's first release is exactly 0.1.0:

  ```text
  BEGIN_COMMIT_OVERRIDE
  chore: release 0.1.0

  Release-As: 0.1.0
  END_COMMIT_OVERRIDE
  ```

  Without it, a package with no releasable changes of its own would be
  released only because `@convohop/core` is, with a patch bump from the
  0.1.0 in its `package.json` to 0.1.1. That was true of
  `@convohop/server` when the pipeline was added. Every package has had
  releasable changes since then and would start at 0.1.0 anyway, so the
  override is now a safeguard. Each package's first changelog lists the
  override as "release 0.1.0" under Miscellaneous Chores.

## Recovering a release

- **A job failed.** Fix the cause, then use **Re-run failed jobs** on the
  workflow run. Every step can be repeated: uploads replace assets with the
  same name, the Attach job refuses to change a release that's already
  published, and the npm job skips versions that npm already has with the
  same contents. Don't use **Re-run all jobs**: release-please would find
  nothing left to release, so the run would skip every release job.
- **The run was cancelled, Plan failed because the tags point to another
  commit, or the run is too old to re-run** (after 30 days). Run the
  workflow on one of the release tags:

  ```sh
  gh workflow run release.yml --repo ConvoHop/sdks --ref core-v0.1.0
  ```

  This rebuilds every release tagged at that commit, so one command covers
  packages released together.
- **Release PR and tags failed.** Re-run it. It creates the missing tags and
  releases. If it failed after it created a draft, the re-run can create a
  second draft for the same tag. The Attach job then stops and names the
  tag. Delete the extra draft on the Releases page, and re-run the failed
  jobs.
- **Only some drafts were published.** Re-run Publish the GitHub Releases.
  After 30 days, check that the draft has all five assets, then run
  `gh release edit client-v0.1.0 --repo ConvoHop/sdks --draft=false`. Add
  `--prerelease` for a prerelease.
- **Never move or delete a release tag, or reuse a version.** If a release
  can't be built, delete its draft, merge a fix and release the next
  version.

## Installing and verifying a release

For example, to install client 0.1.0:

```sh
gh release download core-v0.1.0 --repo ConvoHop/sdks --dir convohop/core
gh release download client-v0.1.0 --repo ConvoHop/sdks --dir convohop/client

# Check the downloads. On macOS, use `shasum -a 256 -c SHA256SUMS`.
(cd convohop/core && sha256sum -c SHA256SUMS)
(cd convohop/client && sha256sum -c SHA256SUMS)

# Check that this repository's release workflow built the tarball from the tagged commit.
gh attestation verify convohop/client/convohop-client-0.1.0.tgz --repo ConvoHop/sdks \
  --signer-workflow ConvoHop/sdks/.github/workflows/release.yml \
  --source-digest "$(gh api repos/ConvoHop/sdks/commits/client-v0.1.0 --jq .sha)"

npm install ./convohop/core/convohop-core-0.1.0.tgz ./convohop/client/convohop-client-0.1.0.tgz
```

- Always install the `@convohop/core` tarball that the client or server
  needs, in the same command. Otherwise npm looks for `@convohop/core` on
  the registry, where it isn't published yet. To see the exact version, run
  `tar -xzOf convohop/client/convohop-client-0.1.0.tgz package/package.json`.
- npm saves the tarball paths in your `package.json`, so keep the tarballs
  with your project.
- To check the SBOM attestation, add
  `--predicate-type https://cyclonedx.org/bom`. To check the downloaded
  bundle instead of the copy stored on GitHub, add
  `--bundle convohop/client/convohop-client-0.1.0.provenance.sigstore.json`.
- Use `--source-digest`, not `--source-ref`. A release that was rebuilt on
  its tag has a different ref from one built on `main`, but the commit is
  the same.

## Repository settings

The workflows depend on these settings, which a repository administrator
applies:

- **Actions:** allow GitHub Actions to create and approve pull requests.
  An organization policy can block this setting, so allow it there first.
  Without it, the Release PR and tags job fails when it opens or updates
  the release pull request. The default workflow token can stay read-only,
  because every workflow declares its permissions.
- **Pull requests:** allow squash merging only, with the pull request title
  as the default commit message and no commit body.
- **`npm` environment:** create it before the first release. Otherwise
  GitHub creates it on first use, without protection. Require reviewers,
  limit deployments to the `main` branch and `*-v*` tags, and don't add
  secrets.
- **`main` branch ruleset:** require pull requests and the status checks
  "TypeScript packages (Node 22)", "TypeScript packages (Node 24)",
  "Conventional Commit title" and "zizmor", and block force pushes and
  deletion. Checks on the release pull request have to be started by hand,
  as step 3 of [How a release happens](#how-a-release-happens) describes.
  For the last-resort merge, allow only administrators to bypass the
  ruleset, and only through pull requests.
- **Release tag ruleset** for `*-v*`: block updates and deletion. Don't
  restrict creation, because release-please creates the tags.
- **Optional:** turn on immutable releases. This works because the workflow
  publishes a release only after its assets are attached.

## Adding a package or language

To release a new npm package:

1. Make the workspace `"private": false`, with the same `publishConfig`,
   `license`, `repository`, `files` and `type` as the existing packages, a
   README, and copies of the root `LICENSE` and `NOTICE`.
2. Add it to `packages` in `release-please-config.json` with
   `"release-type": "node"` and a unique `component`, and to the manifest at
   `0.0.0`. Its first release is 0.1.0.
3. Run `npm run check:release`.

Python, .NET, Flutter, JVM and Android use the separate, explicitly invoked
[registry preparation path](#registry-release-preparation). Their versions
come from reviewed registry tags, not from changes to the npm manifest.
To add another language to the automatic release-please train instead:

1. Add its directory to the configuration with a matching release type, such
   as `python`, `go` or `dart`, or `simple` with `extra-files`, and to the
   manifest at `0.0.0`. Go uses `"component": "go"` and
   `"tag-separator": "/"`, so its tags are `go/vX.Y.Z`.
2. Add a job to the release workflow that builds, attests and publishes it,
   and extend `scripts/release/plan.mjs` and `test/release/`. Until then,
   `npm run check:release` and the Plan job reject any release type other
   than `node`, so nothing is released without a job.
3. Add a Dependabot entry for its package ecosystem.

Go needs more care, because its tag is the release:

- Anyone can fetch a version as soon as its `go/vX.Y.Z` tag exists, and the
  Go module proxy and checksum database then keep it for good. A bad version
  can't be replaced, only retracted with a `retract` directive in a later
  version.
- Because `force-tag-creation` is on, release-please creates each tag with
  its draft release, before any release job runs. Decide when the Go tag is
  created before adding the entry. For example, turn `force-tag-creation`
  off for `go` and have the release job create the tag after its checks
  pass. release-please finds earlier releases by their tags, so plan for a
  run that fails before the tag exists.
- Don't add a placeholder entry with `"skip-github-release": true`.
  release-please doesn't tag a merged release pull request whose only
  packages skip GitHub Releases. That pull request keeps its
  `autorelease: pending` label, and release-please then stops opening
  release pull requests for every package, npm included. Without tags,
  release-please also can't find the last Go release.
- Add `go/v*` to the release tag ruleset, because `*-v*` doesn't match Go
  tags.

Until then, the [Go workflow](.github/workflows/go.yml) rehearses a release.
It tags a throwaway repository that holds only `go/` as `go/v0.1.0`, then
fetches, builds and tests the module from that tag as `go get` would.
`npm run check:release` checks that the module path in `go/go.mod` matches
the planned tags.

The Swift SDK is released from its own repository.

## Before registry publishing (REL-PUB)

Registry publishing is tracked as REL-PUB. For npm:

1. Claim the `@convohop` scope as an npm organization, and require
   two-factor authentication for its members.
2. Publish the first version of each package by hand. Trusted publishing
   can only be configured for a package that exists. Use the verified,
   attested tarballs from the GitHub Releases, `@convohop/core` first:
   `npm publish convohop-core-0.1.0.tgz --access public --provenance=false`.
   Provenance needs a CI identity, so these first versions don't have it.
3. Configure a trusted publisher for each package on npmjs.com, or with
   `npm trust github`: repository `ConvoHop/sdks`, workflow `release.yml`,
   environment `npm`. Then set publishing access to require two-factor
   authentication and disallow tokens.
4. Turn on publishing. Allow real publishing in
   `scripts/release/publish.mjs`, remove `--dry-run` from the npm job in
   `release.yml` and rename the job, keep the dry run in PR CI, and update
   `test/release/publish.test.mjs` and `test/release/workflows.test.mjs`.
   A dry run can't prove that trusted publishing works, so watch the first
   real release closely.
5. Update `README.md`, the package READMEs (they ship in the tarballs),
   [`docs/sdk-strategy.md`](docs/sdk-strategy.md) and this document. List
   each official package in the release notes.

Other registries use the preparation and setup instructions below. Go's
`go/vX.Y.Z` tag is its release; read the Go notes in
[Adding a package or language](#adding-a-package-or-language) first.

## Registry release preparation

These workflows do not join the npm release train or change
`.release-please-manifest.json`. A registry tag is the version authority:
`python-vX.Y.Z`, `dotnet-vX.Y.Z`, `flutter-vX.Y.Z`, `jvm-vX.Y.Z` or
`android-vX.Y.Z`. Only nonzero stable `major.minor.patch` versions are
supported here; prereleases fail explicitly. Never move a tag, reuse a
published version, or hand-edit development versions to prepare a release.

[`registry-prepare.yml`](.github/workflows/registry-prepare.yml) checks the
repository identity, exact workflow/checkout commit and ancestry in
`origin/main`. It accepts either `main` with an explicit preparation version,
or the corresponding immutable release tag. It checks generated source,
runs Python/.NET/Flutter's maintained unit tests as appropriate, and builds
the real package. It has only `contents: read`, no environment, no registry
credentials and no OIDC permission. It neither creates a tag/GitHub Release
nor uploads to a registry.

Python and Flutter are copied from committed files into an isolated
directory. Only that copy loses `Private :: Do Not Upload` or
`publish_to: none`, and receives the tag/preparation version, including its
imported package-version declaration. Flutter also
receives a generated changelog linking to its exact source commit when no
source changelog exists. .NET and Gradle receive build-time version
properties. Ignored files, local credentials and uncommitted changes do not
enter the staged source archive. The development upload blocks remain in
the checkout, including after preparation.

Prepare without any registry accounts or publishing approval:

```sh
gh workflow run pypi-release.yml --repo ConvoHop/sdks --ref main -f version=0.1.0
gh workflow run nuget-release.yml --repo ConvoHop/sdks --ref main -f version=0.1.0
gh workflow run pubdev-release.yml --repo ConvoHop/sdks --ref main -f version=0.1.0
gh workflow run maven-prepare.yml --repo ConvoHop/sdks --ref main -f sdk=jvm -f version=0.1.0
gh workflow run maven-prepare.yml --repo ConvoHop/sdks --ref main -f sdk=android -f version=0.1.0
```

`0.1.0` is an example to review, not a claim that the version exists.
Tag-based preparation omits `version`, for example `--ref python-v0.1.0`.
Before a real release, use a reviewed, passing main commit, approve the
version and create its protected tag through the maintainer's authorized
release procedure. A preparation on `main` is not permission to publish.

Each run uploads `registry-<registry>-<sha>-<attempt>` as an Actions artifact
for 14 days. It includes the wheel/sdist, NuGet package/symbols, Flutter
source archive or explicitly unsigned Maven bundle, plus `RELEASE.json` and
`SHA256SUMS`. `RELEASE.json` records the package, version, full source SHA,
actual source ref, prospective/actual tag and exact file list. Publication
downloads the same run's artifact and rechecks metadata, source identity,
file set and checksums before authentication. Python package/import
versions, NuGet Source Link and both target frameworks, Flutter upload
metadata, and Maven coordinates/dependency pins/docs/checksums are checked
by the maintained artifact helper.

The build helpers require Node 22+ and Python 3.11+. Archive checks use
Python's standard library, not a registry connection. The focused local
checks are:

```sh
node --test test/release/registry.test.mjs test/release/workflows.test.mjs
actionlint .github/workflows/registry-prepare.yml .github/workflows/pypi-release.yml \
  .github/workflows/nuget-release.yml .github/workflows/pubdev-release.yml \
  .github/workflows/maven-prepare.yml
npm run check:release
```

These are packaging/source checks, not evidence of hosted registry
authentication, production service compatibility or real native media.

## Registry trust and first publication

Accounts alone do not establish package ownership, name availability or
trusted publishing. The account owner verifies email/required 2FA and name
availability, then performs the registry setup in their own signed-in
browser. Never share passwords, 2FA codes, tokens or signing keys in an
issue, pull request or chat.

Use these exact values from the committed workflows:

| Registry | Project/package scope | Repository owner | Repository | Workflow filename | GitHub environment | Release tag |
| --- | --- | --- | --- | --- | --- | --- |
| PyPI | `convohop` (also the Python import) | `ConvoHop` | `sdks` | `pypi-release.yml` | `pypi` | `python-vX.Y.Z` |
| NuGet | `ConvoHop` now; separately authorize future `ConvoHop.*` | `ConvoHop` | `sdks` | `nuget-release.yml` | `nuget` | `dotnet-vX.Y.Z` |
| pub.dev | `convohop` | `ConvoHop` | `sdks` | `pubdev-release.yml` | `pub.dev` | `flutter-vX.Y.Z` |

PyPI and NuGet ask for the **filename only**, not the workflow display name
or `.github/workflows/` path. pub.dev instead binds the full repository
`ConvoHop/sdks`, tag pattern **`flutter-v{{version}}`** and required
environment `pub.dev`; it has no workflow-filename field.

First create the `pypi`, `nuget` and `pub.dev` GitHub environments with
required reviewers, prevention of self-review and deployment restrictions
allowing only their respective release tag patterns. Do this **before**
enabling publishing: GitHub otherwise auto-creates an unprotected
environment when a job first references it. Preparation never references
these environments.

All readiness switches are repository **variables**, not credentials, and
are off when absent. Keep `PYPI_PUBLISH_ENABLED`, `NUGET_PUBLISH_ENABLED`
and `PUBDEV_PUBLISH_ENABLED` unset or `false` until the corresponding
external setup and environment protections are complete. `NUGET_USER` is
the only account-name variable: set it to the exact NuGet **profile name**,
not an email address or the PyPI username. Its value must be confirmed by
the owner; the workflow does not guess it. No stored PyPI, NuGet or pub.dev
API key is needed.

### PyPI

For a new project, register a
[pending Trusted Publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/)
under the owner's PyPI account with project name `convohop` and the exact
table values. A pending publisher neither creates nor reserves the project
until its first real upload. Do not upload a placeholder to reserve the
name. If the project already exists, its owner instead adds an
[existing-project Trusted Publisher](https://docs.pypi.org/trusted-publishers/adding-a-publisher/)
with the same values.

After verifying that setup and the protected `pypi` environment, set
`PYPI_PUBLISH_ENABLED=true`. For an approved, existing `python-v0.1.0` tag:

```sh
gh workflow run pypi-release.yml --repo ConvoHop/sdks --ref python-v0.1.0 \
  -F publish=true -f 'confirmation=publish pypi 0.1.0'
```

Review the artifact, source SHA and version before approving the environment.
The non-reusable publishing job uses PyPA's OIDC action and PEP 740
attestations. The same first upload creates the real project and converts
its pending publisher; no manual priming upload or password is needed.

### NuGet

Create a [Trusted Publishing policy](https://learn.microsoft.com/nuget/nuget-org/trusted-publishing)
under the individual or organization that will own `ConvoHop`, using the
table's repository, filename and `nuget` environment. Authorize publishing
**new packages and new versions** of `ConvoHop`, so the first real package
can be created. Future `ConvoHop.*` packages need their own explicit glob
scope; `ConvoHop.*` does not cover the unqualified `ConvoHop` package.
Neither an account nor a trust policy proves that the package ID is
available or owned by that account.

Set `NUGET_USER` to the owner's verified NuGet profile name, then
`NUGET_PUBLISH_ENABLED=true` after setup. For an approved, existing tag:

```sh
gh workflow run nuget-release.yml --repo ConvoHop/sdks --ref dotnet-v0.1.0 \
  -F publish=true -f 'confirmation=publish nuget 0.1.0'
```

After environment approval, `NuGet/login` exchanges OIDC for a short-lived
key immediately before pushing `ConvoHop.<version>.nupkg` and its matching
`.snupkg`. The key is passed through a masked step output/environment, not
interpolated into a script or stored in repository settings.

### pub.dev bootstrap, then automation

Automated publishing can only be configured by an uploader/admin **after a
real package exists**. Keep `PUBDEV_PUBLISH_ENABLED` off during bootstrap.
Prepare the approved `flutter-v0.1.0` tag with a manual dispatch, download
its artifact and check `SHA256SUMS` (`shasum -a 256 -c SHA256SUMS` on macOS)
and the exact source ref/SHA/version in `RELEASE.json`. Extract
`convohop-0.1.0.tar.gz` into a new empty directory. The account owner then
performs the first real publication locally from that directory:

```sh
flutter pub get
flutter pub publish --dry-run
flutter pub publish
```

The last command is a real, interactive publication; it is not part of
preparation and must be separately authorized. The owner completes browser
sign-in and the publication confirmation themselves. This uploads the full
SDK, not a placeholder. An individual uploader account is sufficient;
creating a domain-verified pub.dev publisher is not required for this
bootstrap.

Once `convohop` exists, its uploader/admin opens
`https://pub.dev/packages/convohop/admin`, enables
[GitHub automated publishing](https://dart.dev/tools/pub/automated-publishing)
for repository `ConvoHop/sdks`, tag pattern `flutter-v{{version}}`, and
**requires** GitHub environment `pub.dev`. Confirm its GitHub environment
protections, then set `PUBDEV_PUBLISH_ENABLED=true`.

Only a subsequent protected `flutter-v<new-version>` **tag push** can
automate publication, and it still waits for environment approval. The
publishing job also requires evidence that the real package exists before
obtaining its OIDC token. Manual dispatch always prepares; it never
publishes to pub.dev, even on a tag. Use an explicitly authorized human or
release identity for the tag push: a tag created with `GITHUB_TOKEN` does
not trigger another workflow. For retries, rerun the original tag-push run
so its event remains `push`; do not move the tag or substitute a dispatch.

### Failures and irreversible uploads

Readiness, confirmation, malformed artifacts, mismatched versions/SHAs,
invalid refs, missing bootstrap evidence and registry errors fail visibly.
PyPI/NuGet do not use `skip-existing`/`--skip-duplicate` to disguise an
unverified duplicate as success. A network error is not proof that nothing
was uploaded. Wheel/sdist and package/symbol uploads are not a transaction:
inspect the registry and its audit evidence before recovering a partial
upload. Rerun only failed jobs while the built artifact remains available,
and never replace a published version or weaken the gates to recover.
There is no password or long-lived-key fallback.

## Maven Central preparation while the domain is deferred

The group stays **`com.convohop`**. Its existing artifact IDs are
`convohop-server`, `convohop-server-kotlin`, `convohop-android`,
`convohop-android-core` and `convohop-android-push`. Do not substitute
`io.github.*` or unprefixed coordinates to avoid namespace verification.
Actual namespace verification/publication waits for ownership of
`convohop.com`; having a normal Central account does not establish it.

The build-local repositories use shared Central POM metadata and include
sources and documentation JARs. Java Javadoc is supplemented with the full
maintained SDK guide, including Kotlin-only/Android modules; no empty
documentation placeholder is introduced. `maven-prepare.yml` checks
coordinates and aligned internal dependencies and produces
`convohop-maven-<sdk>-<version>-unsigned.tar.gz`, in Central's repository
layout, with MD5, SHA-1, SHA-256 and SHA-512 checksums. MD5/SHA-1 are required
Central transport checksums, not security assertions. An **unsigned bundle
is not upload-ready**.

Domain-independent signing support is available for a later authorized
release: supply an **existing** armored private key and passphrase securely
as `MAVEN_SIGNING_KEY` and `MAVEN_SIGNING_PASSWORD` to Gradle. Both must be
present and nonempty, or both absent for unsigned preparation. Gradle signs
every publication in memory. No workflow creates keys or consumes these
secrets. Publish the selected module tasks to the build-local repository
with the stable release version, then assemble a signed bundle, for example:

```sh
python3 scripts/release/registry-artifacts.py bundle-maven \
  --sdk jvm --version 0.1.0 --repository jvm/build/repo \
  --signed --out /path/to/convohop-jvm-0.1.0-signed.tar.gz
```

The assembler requires every `.asc`, verifies it with `gpg --batch --verify`
using the operator's public-key keyring, validates the artifacts and adds
checksums. It refuses missing/invalid signatures and refuses to silently
drop existing signatures into an unsigned bundle. It **never uploads**.
The same command supports `--sdk android` and `android/build/repo`.

Before a later real Central upload, the owner must verify the namespace,
make the signing public key discoverable as Central requires, and obtain a
**Central Portal user token** for an authorized API uploader (not a legacy
OSSRH password or GitHub OIDC). The current preparation workflows consume
no Central token or publishing environment and intentionally contain no
Central upload endpoint. See Central's
[artifact requirements](https://central.sonatype.org/publish/requirements/)
and [bundle layout](https://central.sonatype.org/publish/publish-portal-upload/).
The source implementation does not assert that signatures, namespace
ownership, Portal authentication or Central publication have been verified.
