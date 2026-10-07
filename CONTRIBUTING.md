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
npm ci                  # install from the root package-lock.json
npm run check:graphql   # generated code matches the schemas
npm run build           # strict TypeScript builds
npm test                # builds, then runs the package test suites
npm run check:packages  # publint and Are the Types Wrong? on every package
```

None of these commands need service credentials.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/core` | Shared core (`@convohop/core`): generated GraphQL types and operations, protocol validation and the isomorphic transport |
| `packages/client` | Client SDK (`@convohop/client`) for browsers and React Native, with realtime and media |
| `packages/server` | Node.js server SDK (`@convohop/server`) for backend keys and management credentials |
| `packages/browser-sdk` | Deprecated, frozen re-export of `@convohop/client` under the old name |
| `packages/server-sdk` | Deprecated, frozen re-export of `@convohop/server` under the old name |
| `schema/` | GraphQL schemas exported by the ConvoHop API, plus generated operation documents |
| `scripts/`, `codegen.mjs` | Code generation |
| `test/` | Fixtures shared by the package test suites |
| `docs/` | Public design and policy documents |

Each package has its own tests in `packages/<name>/test/`.

- `@convohop/client` and `@convohop/server` depend on `@convohop/core`. They
  never depend on each other at runtime.
- Code that runs on end-user devices belongs in `client`. Code that needs a
  backend key or a management credential belongs in `server`. Code that both
  need, and that runs in browsers, React Native and Node.js alike, belongs in
  `core`.
- `@convohop/core` isn't a supported entry point. Re-export its public API
  from `client` and `server` instead of asking users to import it.
- Don't add features to `browser-sdk` or `server-sdk`. They keep the old
  names and module layout working for existing consumers until those
  consumers move, and then they'll be removed.

## Generated code

`schema/communication-v1.graphql` and `schema/management-v1.graphql` are
exported by the ConvoHop API and are the source of truth. These files are
generated from them:

- `schema/operations-v1.graphql`
- `schema/v1-operations.json`
- `packages/core/src/generated/v1-operations.ts`
- `packages/core/src/generated/v1-generated.ts`

```sh
npm run generate:graphql   # regenerate after a schema change
npm run check:graphql      # fails if any generated file is stale
```

- Don't edit generated files by hand.
- If a rebase or merge conflicts in a generated file, resolve the schema
  files first. Then run `npm run generate:graphql` and commit the output.
  Don't merge generated files by hand.
- A dependency update to the code generators can change the generated output.
  Run `npm run generate:graphql` on those branches too.

## Tests

- Tests use Node.js's built-in test runner (`node:test`) and run against the
  output of each package's strict TypeScript build. They live in
  `packages/*/test/`.
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
and must pass the shared conformance suite before release. Open a feature
request to discuss the design before you start.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  for commit messages and pull request titles, for example
  `fix(client): keep the request ID on retry`. Release automation uses
  them to choose version numbers and write changelogs.
  - `feat`: a new capability that users can see.
  - `fix`: a bug fix.
  - `perf`: a performance improvement.
  - `docs`, `test`, `refactor`, `build`, `ci` and `chore`: don't trigger a
    release on their own.
  - For a breaking change, add `!` after the type (`feat!:`) or a
    `BREAKING CHANGE:` footer.
- Keep each pull request focused on one change.
- Update documentation, examples and generated files in the same pull request
  as the API change that affects them.
- Fill in the pull request template, including exactly what you verified.
- All CI checks must pass, and a maintainer listed in
  [CODEOWNERS](.github/CODEOWNERS) must approve.

## License

This project is licensed under the [Apache License, Version 2.0](LICENSE).
Under section 5 of the license, any contribution that you intentionally submit
is licensed under the same terms. You don't need to sign a contributor license
agreement.
