# ConvoHop SDKs

Canonical client source for the current Conversation, LiveSession and
Participation contract. This repository contains SDKs, generated operations
and tests, not the services, a hosted endpoint or a production qualification.

| SDK | Package | Responsibility |
| --- | --- | --- |
| [Browser](packages/browser-sdk/README.md) | `@convohop/browser-sdk` | Scoped chat/replay, live handles, explicit native connect and capture |
| [Node server](packages/server-sdk/README.md) | `@convohop/server-sdk` | Management, project identities/sessions and membership administration |

Both npm packages are unpublished and `private: true`. Build from this root
workspace; the Node package resolves its Browser dependency locally.
The unused prototype clients, invitation-only call API and unsupported
Python/Go implementations have been removed. No compatibility adapter or
second wire schema is maintained.

## Build and test

Node.js 24+:

```sh
npm ci
npm run check:graphql
npm run build
npm test
```

These maintained unit tests need no service credentials. They do not prove
WebRTC transport, real Cockroach persistence or a hosted release.
Read-only [CI](.github/workflows/sdk-ci.yml) checks the supported Node/Browser
packages; it neither publishes packages nor deploys services.

## Current contract

Communication and Management use separate configured origins, each exposing
unversioned `/graphql`. Realtime uses `graphql-transport-ws` at the
Communication origin's same path. `V1*` names identify the current SDK/domain
generation, not an endpoint or selectable compatibility mode.

The authority-exported schemas in `schema/` are the source for generated
documents, input/output types and runtime response validation. Run
`npm run generate:graphql` after changing them; `check:graphql` detects drift.
Use `http.execute("communication.operation", projectId, input, requestId)` or
`http.execute("management.operation", undefined, input, requestId)`.
There are no REST-shaped path aliases.

The trusted backend authenticates users before mapping accounts to
project-scoped principals and issuing short-lived sessions. Never put
operator/backend credentials in browser bundles, URLs or logs. Caller-owned
recovery storage retains original mutation IDs, generated operation/input,
incarnation, fingerprints and finite retry deadlines. It can contain message
text and must be treated as application data, but does not retain bearer
headers, native grants or credential-delivery permits.

`client.requests.resolve(id)` reads current typed receipt evidence.
`client.requests.retry(id)` resolves first, then resends only an unobserved
original command within its unchanged three-attempt/60-second budget.
Known acceptance/commit and a native admission attempt cannot regress into
permission to resend. Credential redemption requires an explicit fresh,
transient permit with the original redemption ID.

Live start, join, native connect and microphone/camera capture are separate
actions. Discovery returns a nullable LiveSession directly. Native admission
requires the matching participation-aware ConvoHop SFU and current
authorization; a JWT, membership or successful WebSocket upgrade alone is
not forwarding permission. Reconnect retains participation identity and
starts capture-off. A boot change ends the old occurrence through durable
recovery; it is not transparent media continuity.

Services and real two-browser/Cockroach/native acceptance live in the
separately operated implementation repository. Hosted identity, resource,
network, capacity and release qualification require their own evidence.
Source availability is not hosted availability or license entitlement for
external infrastructure.

The SDK source is licensed under the [Apache License, Version 2.0](LICENSE).
