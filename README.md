# ConvoHop SDK source

This repository contains the source and tests for four SDKs targeting compatible
Communication and Management GraphQL services. It does **not** contain the
services, infrastructure, a hosted API, or published package releases. Service
origins and credentials must be supplied by an operator; no public endpoint is
provided here. The SDK source is licensed under the
[Apache License, Version 2.0](LICENSE).

The repository is called **ConvoHop**, but the existing API/package names still
say **Threadwave**: `@threadwave/browser-sdk`, `@threadwave/server-sdk`,
`threadwave-python-sdk` (import `threadwave`), and Go package `threadwave`.
These names are preserved for client API compatibility; they are **not** a
claim that packages have been published. The Go module path has been updated
to `github.com/ConvoHop/sdks/packages/go-sdk` for this source repository.

| SDK | Source | Runtime |
| --- | --- | --- |
| Browser | [`packages/browser-sdk`](packages/browser-sdk/README.md) | Browser / TypeScript |
| Server | [`packages/server-sdk`](packages/server-sdk/README.md) | Node.js 24+ / TypeScript |
| Python | [`packages/python-sdk`](packages/python-sdk/README.md) | Python 3.9+ |
| Go | [`packages/go-sdk`](packages/go-sdk/README.md) | Go 1.22+ |

## Build and test from source

The two unpublished Node packages use a local npm workspace. Run these from
the repository root with Node.js 24+:

```sh
npm ci
npm test --workspace @threadwave/browser-sdk
npm test --workspace @threadwave/server-sdk
```

The server SDK depends on the browser SDK at the matching `0.1.0` version.
The workspace resolves that dependency locally; this is not a published npm
dependency. `npm run build` builds both packages in order. The Node tests use
mocks and an ephemeral loopback HTTP server, not a hosted service.

To run the Python tests without modifying a system Python installation:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e ./packages/python-sdk
python -m unittest discover -s packages/python-sdk/tests -v
```

To run the Go tests and static checks:

```sh
cd packages/go-sdk
go test ./...
go vet ./...
```

The Python and Go live API tests are opt-in. They require separately operated
compatible services and explicit `COMMS_API_URL`, `COMMS_MANAGEMENT_URL`, and
`COMMS_LIVE_ADMIN_TOKEN` environment variables. The unit tests do not need
them. Keep `adm_` and `pk_` credentials on trusted servers, and never put
secrets in this repository or client applications.

## Continuous integration

The [SDK CI workflow](.github/workflows/sdk-ci.yml) runs the Node workspace
builds and tests, Python 3.9 and 3.13 unit tests and wheel builds, and Go
tests and vet on pushes and pull requests to `main`. It has read-only
repository permissions, skips opt-in live API tests, and does not publish
packages or deploy services.
