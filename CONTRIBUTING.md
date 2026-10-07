# Contributing to the ConvoHop SDKs

Thanks for helping to improve the ConvoHop SDKs. This guide covers how to
report problems, propose changes and get a pull request merged.

Everyone who takes part follows our [Code of Conduct](CODE_OF_CONDUCT.md).
Report security vulnerabilities privately as described in
[SECURITY.md](SECURITY.md), never in a public issue or pull request.

## Before you start

- Read the [SDK strategy](docs/sdk-strategy.md). It explains the split
  between server and client SDKs, the language roadmap and the versioning
  policy.
- Search the existing issues and pull requests.
- For anything bigger than a small fix, such as a new public API, a behavior
  change or a new language or platform, open a feature request first. That
  way the design is agreed before you write code.

## Development setup

You need Node.js 22 or later and the npm version that comes with it. CI runs
on Ubuntu with Node.js 22 and 24.

```sh
npm ci                     # install from the root package-lock.json
npm run check:annotations  # every schema operation is annotated
npm run check:graphql      # generated code matches the schemas
npm run build              # strict TypeScript builds
npm test                   # builds, then runs the package and generator test suites
npm run check:packages     # publint and Are the Types Wrong? on every package
npm run check:release      # release scripts, release configuration and workflow rules
```

None of these commands need service credentials.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/core` | Shared core (`@convohop/core`): generated GraphQL types and operations, protocol validation and the isomorphic transport |
| `packages/client` | Client SDK (`@convohop/client`) for browsers and React Native, with realtime and media |
| `packages/server` | Node.js server SDK (`@convohop/server`) for backend keys and management credentials |
| `schema/` | GraphQL schemas exported by the ConvoHop API, operation annotations, and the generated IR and operation documents |
| `tools/sdkgen/` | The SDK generator: annotation check, IR builder, emitters and their tests. See [SDK generation](docs/sdk-generation.md) |
| `scripts/release/`, `test/release/` | Release scripts and their tests |
| `test/` | Fixtures shared by the package test suites |
| `release-please-config.json`, `.release-please-manifest.json` | The released packages and their current versions. See [RELEASING.md](RELEASING.md). |
| `.github/workflows/` | CI, release and pull request title workflows |
| `docs/` | Public design and policy documents, and generated operation snippets |

Each package has its own tests in `packages/<name>/test/`.

- `@convohop/client` and `@convohop/server` depend on `@convohop/core` with
  an exact version in `dependencies`. They never depend on each other, not
  even as a development dependency.
- A workspace or tool that isn't released, such as a test harness or a tool
  under `tools/`, stays `"private": true` and out of
  `release-please-config.json`. Such a workspace depends on the packages
  with `"*"`. `npm run check:release` enforces these rules.
- Code that runs on end-user devices belongs in `client`. Code that needs a
  backend key or a management credential belongs in `server`. Code that both
  need, and that runs in browsers, React Native and Node.js alike, belongs in
  `core`.
- `@convohop/core` isn't a supported entry point. Re-export its public API
  from `client` and `server` instead of asking users to import it.

## Generated code

`schema/communication-v1.graphql` and `schema/management-v1.graphql` are
exported by the ConvoHop API and are the source of truth.
`schema/v1-annotations.json` adds the facts that GraphQL can't express. See
[Annotating operations](#annotating-operations). The generator in
`tools/sdkgen` builds a language-neutral IR from them and generates these
files from the IR:

- `schema/v1-ir.json`
- `schema/operations-v1.graphql`
- `schema/v1-operations.json`
- `packages/core/src/generated/v1-operations.ts`
- `packages/core/src/generated/v1-generated.ts`
- `docs/snippets/v1/`

```sh
npm run generate:graphql   # regenerate after a schema or annotation change
npm run check:graphql      # fails if any generated file is missing, stale or edited
```

- Don't edit generated files by hand.
- If a rebase or merge conflicts in a generated file, resolve the schema and
  annotation files first. Then run `npm run generate:graphql` and commit the
  output. Don't merge generated files by hand.
- A change to the generator can change the generated output. Run
  `npm run generate:graphql`, and refresh the generator's golden files with
  `UPDATE_GOLDEN=1 npm run test:sdkgen`. Review both diffs.

[SDK generation](docs/sdk-generation.md) describes the IR, the emitter plugin
API and how to add a language.

## Annotating operations

Each root field of each GraphQL schema in `schema/` is an operation with the
ID `<plane>.<field>`, for example `communication.sendMessage`. Every operation
needs an entry under `operations` in
[`schema/v1-annotations.json`](schema/v1-annotations.json). The entry records
which SDKs expose the operation, who can call it, and how it retries,
paginates, streams and fails. Every language's generator relies on it.

`npm run check:annotations` fails when a schema operation has no entry
(MISSING) or an entry doesn't match any schema operation (UNKNOWN), and lists
each one. `npm run generate:graphql` and `npm run check:graphql` run the same
check first, and CI runs it on every pull request.

When you add, rename or remove an operation:

1. Put the exported schema in `schema/` and run `npm run generate:graphql`.
2. For each MISSING operation, copy the starter entry that the check prints
   into `operations`. Replace every `<placeholder>` and review every default.
   For example, the starter's `errors.sets` copies the most common error sets
   of the plane.
3. Rename or delete each UNKNOWN entry. When a renamed root field looks
   similar, the check suggests the new name.
4. If the operation needs a new credential, scope, condition, error code,
   error set, scalar or realtime event, add it to its catalog at the top of
   the file. Entries can only refer to catalog items.
5. Run `npm run generate:graphql` until it passes. Commit the schema, the
   annotations and every regenerated file together, including
   `schema/v1-ir.json` and `docs/snippets/v1/`.

If you include this repository as a Git submodule, run the commands inside the
submodule.

Each entry has these fields:

| Field | Values |
| --- | --- |
| `summary` | One sentence that says what the operation does. |
| `layer` | `client`: client SDKs only, and the operation accepts only client credentials. `server`: server SDKs only, and it accepts no client credentials. `both`: every SDK, and `auth` lists at least one client credential and one server credential. |
| `auth` | Alternative ways to authorize the call. Any one of them is enough. Each is `{ "credential": ..., "scopes": [...], "condition": ... }`. `scopes` lists every scope a backend key needs. `scopes` and `condition` are optional. |
| `idempotency` | Queries and subscriptions are `safe`. A mutation is `idempotent` (deduplicated by request ID, so an unknown outcome can be resolved), `singleUse` (like `idempotent`, but returns a short-lived credential for one connection), `permitBound` (authorized by a permit in the request context) or `ephemeral` (a transient signal that's never retried). |
| `pagination` | `{ "style": "none" }`, or a style from `cursor`, `sequence`, `replay` and `bounded` with `pagePath`, the path from the result to the page object (`[]` when the result is the page). `cursor`, `sequence` and `replay` also name the input's `limitField` and `cursorField`. |
| `realtime` | `{ "mode": "none" }`, with an optional `emits` list of event types for mutations, or `{ "mode": "subscription", "channel": ... }` for subscriptions. |
| `longRunning` | Optional. `{ "poll": ..., "refField": ... }` for a mutation that starts work that finishes later. |
| `errors` | `{ "sets": [...], "codes": [...] }`. Error sets from `errorSets`, plus other codes from `errorCodes` that callers should handle. The list isn't exhaustive. |

The check also catches inconsistencies, such as a mutation marked `safe`, a
`layer` that doesn't match the credentials in `auth`, or a paged result that
lacks the fields its style needs. `planes.<plane>.context.rules` decide which
request-context fields each operation must send or must not send. If a new
operation needs different rules, add it to a rule's `only` or `except` list.

The generators don't support every GraphQL feature. For example, unions,
interfaces, `@oneOf` inputs and custom directives are rejected. See
[Unsupported GraphQL features](docs/sdk-generation.md#unsupported-graphql-features).

## Tests

- Tests use Node.js's built-in test runner (`node:test`) and run against the
  output of each package's strict TypeScript build. They live in
  `packages/*/test/`. The generator's tests live in `tools/sdkgen/test/` and
  compare the emitters' output with golden files.
- Add or update a regression test in the existing package suite for every
  bug fix and behavior change. Don't add standalone assertion scripts or a
  second test client.
- Cover failure paths as well as success: malformed responses, rejection
  versus an unknown outcome after a network failure, retries, cancellation
  and cleanup.
- Unit tests use deterministic stubs. They don't prove real network, WebRTC
  media or database behavior. If your change needs that kind of verification,
  say so in the pull request.

## SDK design rules

Reviewers check every change against these rules. They protect the people
who use the SDKs.

- **Keep credentials apart.** Code that runs on end-user devices only ever
  holds short-lived, scoped user credentials. Backend keys and management
  credentials must never appear in browser or app code, bundles, storage,
  URLs, logs, error messages or examples.
- **No secrets in the repository.** Use obvious placeholders in examples and
  tests. Never commit real tokens, keys or credentials.
- **Validate responses.** Reject malformed or unsupported responses
  explicitly. Don't use casts or default values that turn them into success.
- **Retries keep their identity.** A retried mutation keeps its original
  request ID, payload and retry budget. A network failure means the outcome
  is unknown, not that the request was rejected.
- **Counters stay strings.** Database counters, such as sequences and
  revisions, are canonical decimal strings. Never convert them to JavaScript
  numbers. Treat cursors as opaque values.
- **Clean up.** Release the media tracks, elements, listeners and
  subscriptions that you create.
- **One API.** Only the current Conversation, LiveSession and Participation
  model is supported. Don't add compatibility adapters or REST-style aliases.
  HTTP and WebSocket traffic use the unversioned `/graphql` endpoint.

## Adding a language or platform

New SDKs follow the [SDK strategy](docs/sdk-strategy.md). Each one is
generated from the shared schema, has a small idiomatic hand-written runtime,
and must pass the shared conformance suite before release. Its generator is an
emitter for the shared IR. See
[Adding a language emitter](docs/sdk-generation.md#adding-a-language-emitter).
Open a feature request to discuss the design before you start.

## Commits and pull requests

Pull requests are squash-merged, so the pull request title becomes the commit
message on `main`. Release automation reads it to choose version numbers and
write changelogs, as described in [RELEASING.md](RELEASING.md).

- Write the title as a
  [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/):
  `type(scope): summary`, for example
  `fix(client): keep the request ID on retry`. The "Conventional Commit
  title" check fails otherwise. If the pull request has a single commit, its
  message must match the title.

  | Type | Use it for | Release |
  | --- | --- | --- |
  | `feat` | A new capability that users can see | Minor |
  | `fix` | A bug fix | Patch |
  | `perf` | A performance improvement | Patch |
  | `revert` | Undoing an earlier change | Patch |
  | `docs`, `test`, `refactor`, `build`, `ci`, `chore`, `style` | Anything else | None |

- For a breaking change, add `!` before the colon, for example
  `feat(client)!: rename connect to connectMedia`. A breaking change makes a
  minor release while a package is at 0.x, and a major release from 1.0.0.
  Explain how to migrate in a `BREAKING CHANGE:` footer in a
  [commit override](RELEASING.md#commit-overrides) in the pull request
  description.
- The scope is only for readers. A change is released in the packages whose
  files it changes. When `@convohop/core` is released, `@convohop/client`
  and `@convohop/server` get at least a patch release. If a core change adds
  to or breaks the API that client or server re-exports, change those
  packages in the same pull request too, for example their README or tests.
- Don't edit `CHANGELOG.md` files, package versions or
  `.release-please-manifest.json`. Release automation updates them.
- Keep each pull request focused on one change.
- Update documentation, examples and generated files in the same pull request
  as the API change that affects them.
- Fill in the pull request template, including exactly what you verified.
- All CI checks must pass, and a maintainer listed in
  [CODEOWNERS](.github/CODEOWNERS) must approve.

### Workflows

`npm run check:release` and [zizmor](https://docs.zizmor.sh/) check the
workflow files on every pull request. Follow these rules:

- Pin every action to a full commit SHA, with its version in a comment, for
  example `actions/checkout@<40-character SHA> # v7.0.1`. Dependabot keeps
  the pins up to date.
- Declare `permissions` for each workflow or each job, and grant only what
  it needs. Grant `id-token: write` only to jobs that sign or publish.
- Pass `${{ }}` expressions to `run:` scripts through `env:`, never inline.
- Don't use the `pull_request_target` or `workflow_run` triggers.

## License

This project is licensed under the [Apache License, Version 2.0](LICENSE).
Under section 5 of the license, any contribution that you intentionally submit
is licensed under the same terms. You don't need to sign a contributor license
agreement.
