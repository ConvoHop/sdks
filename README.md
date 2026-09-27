# ConvoHop SDKs

ConvoHop's goal is to help developers add durable chat, then voice/video calls,
in the same conversation, identity, and permission context instead of
stitching together separate services. This repository is the canonical source
for its client SDKs, tests, and a Go example; **not** the Communication or
Management services, LiveKit infrastructure, or a hosted API. Bring your own
compatible service origins and credentials for live use. Source availability
does not mean the npm or Python packages have been published, or that a
versioned Go module or production service is available.

| SDK | Source and package | What it does |
| --- | --- | --- |
| Browser | [`@convohop/browser-sdk`](packages/browser-sdk/README.md) | TypeScript `ConvoHopClient` for authenticated chat, event subscriptions, and LiveKit call connections |
| Node server | [`@convohop/server-sdk`](packages/server-sdk/README.md) | Node.js 24+ project provisioning, identity registration, and session issuance |
| Python | [`convohop-sdk`](packages/python-sdk/README.md), import `convohop` | Python 3.9+ async GraphQL and WebSocket clients |
| Go | [`github.com/ConvoHop/sdks/packages/go-sdk`](packages/go-sdk/README.md), package `convohop` | Go 1.22+ GraphQL clients and cursor-safe event polling |

Both npm packages remain `private: true`; the Node server SDK resolves its
browser-SDK dependency from the **root npm workspace**, not a registry.
Install and test from this checkout, not with `npm ci` inside an individual
package directory.

## Build and test

From the repository root, with Node.js 24+:

```sh
npm ci
npm run build
npm test
```

With Python 3.9+ (keep the environment in the ignored `.venv` directory):

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e ./packages/python-sdk
python -m unittest discover -s packages/python-sdk/tests -v
```

With Go 1.22+:

```sh
cd packages/go-sdk
go test ./...
go vet ./...
```

These commands do not require a running service. Node tests use mocks and a
temporary loopback server; Python and Go live API checks skip unless explicitly
enabled. The [SDK CI workflow](.github/workflows/sdk-ci.yml) exercises both Node
packages, Python 3.9 and 3.13 (including wheel builds), and Go tests and vet
on pushes and pull requests to `main`. It has read-only repository permissions
and does not publish packages or deploy infrastructure.

## Service and credential boundaries

SDK requests target `/graphql` on separately operated services. Browser and
Python subscriptions use `graphql-transport-ws`; media calls may require a
compatible LiveKit deployment. Configure origins in your application: the
examples use `COMMS_API_URL` and `COMMS_MANAGEMENT_URL`, but no origin is
bundled here.

| Credential | Keep it with | Use |
| --- | --- | --- |
| `adm_` | Operator only | Local Management API; create or suspend projects |
| `pk_` | Your trusted backend | Register a project identity and mint its session |
| `st_` | The authenticated end user | Access that identity's Communication API operations |

Never put `adm_` or `pk_` keys in a browser/mobile bundle, URL, log, or this
repository. Session tokens are short-lived; your backend must authenticate the
user and mint replacements. To run opt-in live Python/Go tests, supply
`COMMS_API_URL`, `COMMS_MANAGEMENT_URL`, and `COMMS_LIVE_ADMIN_TOKEN` from
services you operate; the tests can provision data. Live integration and
hosted availability are **not** established by the unit-test CI.

## Maintenance and license

SDK implementation and API documentation belong in this repository; service
code and deployment are maintained separately. Changes to the GraphQL
contract require coordinated SDK updates, tests, and docs here. There is no
automatic cross-repository synchronization, package release, or deployment;
maintainers should verify compatibility against a separately operated service
before claiming support. Do not commit secrets.

The source is licensed under the [Apache License, Version 2.0](LICENSE).
