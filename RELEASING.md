# Releasing the ConvoHop SDKs

This document explains how the SDK packages in this repository are versioned
and released, how to install and verify a release, and what has to happen
before releases go to package registries.

> [!IMPORTANT]
> Releases are published only as GitHub Releases in this repository. The npm
> publish step is a dry run: it checks what would be published, but nothing
> reaches the npm registry until the work in
> [Before registry publishing](#before-registry-publishing-rel-pub) is done.

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

Nothing else is released, including the root workspace, `schema/`,
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

To release another language, such as Python, .NET, Java and Kotlin, Go,
Flutter or Android:

1. Add its directory to the configuration with a matching release type, such
   as `python`, `go` or `dart`, or `simple` with `extra-files`, and to the
   manifest at `0.0.0`. Go uses `"component": "go"` and
   `"tag-separator": "/"`, so its tags are `go/vX.Y.Z`.
2. Add a job to the release workflow that builds, attests and publishes it,
   and extend `scripts/release/plan.mjs` and `test/release/`. Until then,
   `npm run check:release` and the Plan job reject any release type other
   than `node`, so nothing is released without a job.
3. Add a Dependabot entry for its package ecosystem.

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

For other registries, when each SDK lands:

- **PyPI:** add a pending trusted publisher before the first release.
- **NuGet:** configure trusted publishing.
- **pub.dev:** automated publishing needs a workflow run on the release tag.
  Tags created with `GITHUB_TOKEN` don't start workflows, so plan how that
  run starts.
- **Maven Central:** verify the `com.convohop` namespace, which needs the
  `convohop.com` domain, and sign the artifacts.
- **Go:** the `go/vX.Y.Z` tag is the release. There's no registry to
  configure.
