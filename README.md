# ConvoHop SDKs

This is the canonical source repository for ConvoHop client SDKs. It contains
client code, tests, a Go example, and read-only CI; **not** the Communication
or Management services, LiveKit infrastructure, or a hosted API. Bring your
own compatible service origins and credentials for live use. Source
availability does not mean the npm or Python packages have been published,
or that a versioned Go module or production service is available.

| SDK | Source and package | What it does |
| --- | --- | --- |
| Browser | [`@convohop/browser-sdk`](packages/browser-sdk/README.md) | Current GraphQL `V1Client` and native `V1MediaConnection`; separately retained legacy `ConvoHopClient` |
| Node server | [`@convohop/server-sdk`](packages/server-sdk/README.md) | Native `V1ManagementClient`/`V1ProjectServerClient`; separately retained legacy GraphQL clients |
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
npm run check:graphql
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

**Current** Browser/Node clients target the unversioned `/graphql` on their
separate data/management origins. Subscriptions use `graphql-transport-ws`
at the data origin's same path. Generated documents/types are checked
against the service-exported schemas in `schema/`; run `npm run generate:graphql`
after an approved schema update. Evolve the schema additively and deprecate
fields before removal. `V1*` identifies the SDK/domain generation, not an
API version that clients select. The trusted
backend registers principals and issues scoped sessions; an end-user
bootstrap carries the project, incarnation, principal/device/session and
short-lived session token. Operator and backend credentials must stay on
trusted servers. Call connections require the compatible native
ConvoHopAdmissionV1 SFU, not an unmodified stock LiveKit server. The SDK
obtains fresh one-attempt admission and forwarding proofs; an invitation,
native JWT or WebSocket upgrade alone does not grant media.
Conversation-centered `LiveSession` handles add lazy member joins and native
broadcast viewer rights. Start, join, receive-only connect and capture are
explicit phases. `conversation(id)` is now a synchronous handle; use
`getConversation(id)` for the former async snapshot read. See the package
READMEs for the generated Node/browser API and retained invitation-only calls.

Mutation recovery retains the original UUID, payload, fingerprint and retry
budget. Application-supplied `recoveryStorage` enables persistence of request
state and acknowledged replay cursors, not session tokens. Stored request
payloads can contain message text; treat that storage as application data.
Existing low-level SDK path strings are compatibility operation identifiers,
not HTTP routes. HTTP 200 GraphQL errors never become successful mutation
evidence. Native browser/backend examples are in the package READMEs. Real CockroachDB/
WebRTC acceptance belongs to the separately operated service's integration
suite; these package unit tests do not establish that deployment.

**Legacy only:** `ConvoHopClient`, `ManagementClient`, `ProjectServerClient`,
and the Python/Go SDKs target the older prototype's different schema, also at
`/graphql`. Browser/Python legacy subscriptions
use `graphql-transport-ws`; the following prefix table is **not** the native
v1 credential contract. No Python/Go v1 parity is claimed. Configure origins
in your application; no hosted origin is bundled here.

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
code and deployment are maintained separately. Changes to either native v1
or legacy GraphQL require coordinated SDK updates, tests, and docs here. There is no
automatic cross-repository synchronization, package release, or deployment;
maintainers should verify compatibility against a separately operated service
before claiming support. Do not commit secrets.

The source is licensed under the [Apache License, Version 2.0](LICENSE).
