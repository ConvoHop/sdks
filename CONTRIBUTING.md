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
npm test                   # builds, then runs the package, generator and conformance harness tests
npm run check:packages     # publint and Are the Types Wrong? on every package
npm run check:release      # release scripts, release configuration and workflow rules
npm run conformance        # conformance scenarios, reference driver against the mock
npm run test:docgen        # docs pipeline tests
npm run check:docs         # generated docs in docs/site match their inputs
```

None of these commands need service credentials.

The Web client's browser tests also need Playwright's browsers. On Linux, add
`--with-deps` to install their system libraries too:

```sh
npx playwright install chromium firefox webkit
npm run test:browser -w conformance   # set BROWSERS=chromium to run one engine
```

The [Java and Kotlin server SDK](jvm/README.md) has its own Gradle build in
`jvm/`. Build it with JDK 17; the Gradle wrapper downloads Gradle itself:

```sh
cd jvm
./gradlew build            # compile for Java 11, check, document and test
```

[Build and test](jvm/README.md#build-and-test) explains how to run the tests
on other JDKs and how to run the conformance scenarios with its driver.

The [Go server SDK](go/README.md) is its own module in `go/`, with no
dependencies. Build and test it with Go 1.26 or later:

```sh
cd go
go vet ./...
CONVOHOP_REQUIRE_SPEC=1 go test -race ./...
```

[Build and test](go/README.md#build-and-test) explains how to run the
conformance scenarios with its driver.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/core` | Shared core (`@convohop/core`): generated GraphQL types and operations, protocol validation and the isomorphic transport |
| `packages/client` | Client SDK (`@convohop/client`) for browsers and React Native, with realtime and media |
| `packages/react` | React hooks (`@convohop/react`) over the client SDK. A private workspace, not in a release yet |
| `packages/server` | Node.js server SDK (`@convohop/server`) for backend keys and management credentials |
| `jvm/` | Java and Kotlin server SDK (`com.convohop:convohop-server` and `com.convohop:convohop-server-kotlin`), a separate Gradle build that also builds its conformance driver in `conformance/drivers/jvm/` |
| `go/` | Go server SDK (`github.com/ConvoHop/sdks/go`), a Go module with no dependencies. Its conformance driver is a separate module in `conformance/drivers/go/` |
| `packages/cli` | The `convohop` command-line tool (`@convohop/cli`), built on `@convohop/server`, with a generated operation catalog. A private npm workspace that isn't released yet |
| `packages/mcp` | An MCP server (`@convohop/mcp`) whose generated tools run server operations for AI agents. A private npm workspace that isn't released yet |
| `schema/` | GraphQL schemas exported by the ConvoHop API, operation annotations, and the generated IR and operation documents |
| `tools/sdkgen/` | The SDK generator: annotation check, IR builder, emitters and their tests. See [SDK generation](docs/sdk-generation.md) |
| `tools/docgen/` | The docs pipeline: public API extractors, the docs generator, the example code runner and their tests. See [Docs pipeline](docs/docs-pipeline.md) |
| `scripts/release/`, `test/release/` | Release scripts and their tests |
| `spec/conformance/` | Language-neutral conformance scenarios, the driver protocol, target descriptors and webhook vectors, with their JSON Schemas |
| `spec/push-payload/` | The push payload contract: notification events, the APNs, FCM and Web Push requests built from them, a JSON Schema and shared vectors |
| `spec/docs/` | JSON Schemas for the docs pipeline's inputs and its output in `docs/site` |
| `conformance/` | The conformance runner, the TypeScript reference driver, the mock target, the harness's tests and the Web client's browser tests. A private npm workspace that is never published |
| `test/` | Fixtures shared by the package and conformance test suites |
| `release-please-config.json`, `.release-please-manifest.json` | The released packages and their current versions. See [RELEASING.md](RELEASING.md). |
| `.github/workflows/` | CI, conformance, release and pull request title workflows |
| `docs/` | Public design and policy documents, and generated operation snippets |
| `docs/languages/` | Each language's docs inputs: its configuration, extracted public API, quickstarts and tested example code |
| `docs/site/` | The generated SDK docs: Markdown pages, JSON data, `llms.txt` and `llms-full.txt` |

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

`schema/communication.graphql` and `schema/management.graphql` are
exported by the ConvoHop API and are the source of truth.
`schema/annotations.json` adds the facts that GraphQL can't express. See
[Annotating operations](#annotating-operations). The generator in
`tools/sdkgen` builds a language-neutral IR from them and generates these
files from the IR:

- `schema/ir.json`
- `schema/operations.graphql`
- `schema/operations.json`
- `packages/core/src/generated/operations.ts`
- `packages/core/src/generated/graphql-types.ts`
- `docs/snippets/`
- `jvm/convohop-server/src/generated/java/` and
  `jvm/convohop-server-kotlin/src/generated/kotlin/`
- `go/*_gen.go`

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

The [docs pipeline](docs/docs-pipeline.md) generates `docs/site/` from the
IR, the operation snippets and each language's inputs in `docs/languages/`.
Those inputs include the language's public API, which an extractor reads
from the built packages into `surface.json`. After you change the schemas,
the annotations, a package's public API or a docs input, regenerate both:

```sh
npm run build                             # the TypeScript extractor reads the built declarations
npm run extract:docs -- typescript        # refresh the language's surface.json
npm run generate:docs                     # regenerate docs/site
npm run test:docs -- --install typescript # compile and run the language's example code
```

CI fails if `surface.json` or `docs/site` is stale. Resolve conflicts in
them the same way: regenerate, don't merge by hand.

## Annotating operations

Each root field of each GraphQL schema in `schema/` is an operation with the
ID `<plane>.<field>`, for example `communication.sendMessage`. Every operation
needs an entry under `operations` in
[`schema/annotations.json`](schema/annotations.json). The entry records
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
   `schema/ir.json` and `docs/snippets/`.

If you include this repository as a Git submodule, run the commands inside the
submodule.

Each entry has these fields:

| Field | Values |
| --- | --- |
| `summary` | One sentence that says what the operation does. |
| `layer` | `client`: client SDKs only, and the operation accepts only client credentials. `server`: server SDKs only, and it accepts no client credentials. `both`: every SDK, and `auth` lists at least one client credential and one server credential. |
| `auth` | Alternative ways to authorize the call. Any one of them is enough. Each is `{ "credential": ..., "scopes": [...], "condition": ... }`. `scopes` lists every scope a backend key needs. `scopes` and `condition` are optional. |
| `idempotency` | Queries and subscriptions are `safe`. A mutation is `idempotent` (deduplicated by request ID, so an unknown outcome can be resolved), `singleUse` (like `idempotent`, but returns a short-lived credential for one connection), `permitBound` (authorized by a permit in the request context) or `ephemeral` (a transient signal that's never retried). |
| `destructive` | Optional. `true` for a mutation that deletes, revokes, removes, disables or ends something, or retires a secret. Omit it for every other operation. The MCP server marks these tools `destructiveHint`, and the CLI asks before it runs them. |
| `pagination` | `{ "style": "none" }`, or a style from `cursor`, `sequence`, `replay` and `bounded` with `pagePath`, the path from the result to the page object (`[]` when the result is the page). `cursor`, `sequence` and `replay` also name the input's `limitField` and `cursorField`. |
| `realtime` | `{ "mode": "none" }`, with an optional `emits` list of event types for mutations, or `{ "mode": "subscription", "channel": ... }` for subscriptions. |
| `longRunning` | Optional. `{ "poll": ..., "refField": ... }` for a mutation that starts work that finishes later. |
| `errors` | `{ "sets": [...], "codes": [...] }`. Error sets from `errorSets`, plus other codes from `errorCodes` that callers should handle. The list isn't exhaustive. |

The check also catches inconsistencies, such as a mutation marked `safe`, a
query or subscription marked `destructive`, a `layer` that doesn't match the
credentials in `auth`, or a paged result that
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
- Behavior that every SDK must share belongs in a
  [conformance scenario](spec/conformance/README.md#adding-a-scenario).
  Run `npm run conformance` when you change a scenario or SDK behavior that
  one covers.
- The Web client's browser tests live in `conformance/browser/`. A page and a
  module service worker load the built packages, and Playwright drives them
  against the mock: sending and following a conversation, holding sends
  while offline, keeping unsent messages across a reload and, in Chromium,
  showing push notifications. Run them with
  `npm run test:browser -w conformance` when you change browser behavior.
- `@convohop/react`'s tests render the hooks with `react-test-renderer`. CI
  also runs them, with the hooks' conformance test, on React 18 from the
  lockfile in `packages/react/test/oldest-react/`.
- The docs pipeline's tests live in `tools/docgen/test/`. Run them with
  `npm run test:docgen`. Code in the docs is tested too: put it in a
  language's example code and include it by region, as
  [Tested code](docs/docs-pipeline.md#tested-code) describes.
- The Java and Kotlin SDK's tests use JUnit 5. They live in
  `jvm/*/src/test/` and run with `./gradlew test` in `jvm/`.
- The Go SDK's tests use the standard `testing` package. They live next to
  the code in `go/` and run with `go test ./...` in `go/`.

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

## Versioning

Ask whether a version marker makes sense before you add one. Add a version
only when two versions must coexist and you can name the consumer that has
to tell them apart, or when an external specification requires one.
Otherwise, leave the marker out and add one at the first real breaking
change. An absent marker then means the original.

- **GraphQL evolves in place.** Make additive changes, mark what they replace
  `@deprecated`, and remove it once nothing uses it.
- **No version markers in names.** Don't put versions in file or directory
  names, type or export names, routes, configuration keys, format or mode
  tags, schema-version payload fields, pull request titles or documentation
  headings. `npm test` runs `test/names.test.mjs`, which fails when a
  tracked path, an exported identifier or a GraphQL schema identifier gains
  a version marker. Its allowlist names the reason for each version that
  stays.
- **Keep legitimate versions.** These stay: the Standard Webhooks `v1,`
  signature prefix, LiveKit's `/rtc/v1` paths, npm package versions and
  release tags (see [RELEASING.md](RELEASING.md)), Go module majors, GitHub
  Actions `@vN` references, dependency majors, versions that external
  specifications or vendors define (such as SLSA and in-toto type URIs and
  the FCM HTTP v1 API), versions that are data (such as `catalogVersion` and
  `secretVersion`), signing-key rotation versions, database row versions,
  sequence numbers, and tests that check that retired `/v1` paths fail.

## Adding a language or platform

New SDKs follow the [SDK strategy](docs/sdk-strategy.md). Each one is
generated from the shared schema, has a small idiomatic hand-written runtime,
and must pass the shared [conformance suite](spec/conformance/README.md)
through its own [driver](spec/conformance/README.md#adding-a-driver) before
release. Its generator is an emitter for the shared IR. See
[Adding a language emitter](docs/sdk-generation.md#adding-a-language-emitter).
A server SDK's push payload builders must also produce the shared
[push payload vectors](spec/push-payload/README.md#vectors).
Its docs come from a `docs/languages/<id>/` directory and an extractor for
its public API. See
[Adding a language](docs/docs-pipeline.md#adding-a-language) in the docs
pipeline.
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
