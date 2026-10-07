# Conformance targets

A target is the ConvoHop service that scenarios run against. The runner
reads it from a **descriptor**: a JSON object that says where the service
is, which credentials scenarios may use and which optional
[capabilities](#capabilities) it offers. `--target mock`, the default,
starts the built-in [mock target](#mock-target) and builds its descriptor
automatically; `--target <file>` reads a descriptor file.

## Descriptor

[`target.schema.json`](target.schema.json) defines the descriptor.

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | A short name for reports, such as `dev-stack`. |
| `communicationUrl` | yes | The communication plane's base URL. SDKs add `/graphql`. |
| `projectId`, `incarnation` | yes | The project, and its current incarnation, that scenarios run in. |
| `managementUrl` | no | The management plane's base URL. Needed by scenarios with management clients. |
| `managementActorId` | no | The actor id that goes with the `management` credential. |
| `credentials` | no | Named [credentials](#credentials). |
| `control` | no | The [control API](#control-api) base URL. Required if any `control.*` capability is declared. |
| `capabilities` | no | The [capabilities](#capabilities) the target offers. |
| `description` | no | Free text. |

Any string can contain `${env:NAME}`, which is replaced by the environment
variable `NAME`. If the variable is unset or empty, the whole string is
removed: its property is deleted, or its array element dropped. An optional
value that is not provided therefore makes the scenarios that need it skip,
while a required field that is not provided fails validation, which is a
setup error (exit code 2).

Keep credentials out of descriptor files: reference them with
`${env:NAME}` and provide them through the environment or CI secrets.

## Credentials

Scenarios refer to credentials by name, as `${target.credentials.<name>}`.
Scenarios that refer to a credential the target does not provide are
skipped. User session tokens are never part of a descriptor: scenarios
create principals and issue sessions with the `backend` credential.

| Name | What it must be | Used by |
| --- | --- | --- |
| `backend` | A current backend key for the target project with every backend scope. | Almost every scenario. |
| `backendLimited` | A current backend key for the project without the `membershipManage` scope. | `auth.scopes.limited-backend-key` |
| `backendExpired` | A backend key for the project that has expired. | `auth.backend-key.expired` |
| `management` | A management access token for `managementActorId` that can issue backend keys for the project. | `auth.scopes.management-issues-scoped-key` |

## Capabilities

Capabilities are optional target behaviour. A scenario that needs a
capability the target does not declare is skipped, so a real deployment
can run every scenario it supports without pretending to support the rest.

| Capability | The target | Used by |
| --- | --- | --- |
| `auth.shortSessionTtl` | Issues user sessions with the requested lifetime down to 1 second (`requestedTtlMs: "1000"`). | The user-session expiry scenario. |
| `pagination.serverCappedPages` | Returns at most 3 items per page of message history and of conversation events, whatever limit the client asks for, so that small scenarios span several pages. | The message and event pagination scenarios. |
| `control.reset` | Implements `POST /reset`. | The runner, before each scenario. |
| `control.fault` | Implements `POST /fault`. | Rate-limit and recovery scenarios. |
| `control.realtimeDrop` | Implements `POST /realtime/drop`. | Realtime reconnect scenarios. |
| `control.waitLog` | Implements `POST /log/wait`. | Scenarios that observe what the SDK sent, such as reconnects and retries. |

## Control API

The control API lets scenarios inject faults into the service and observe
the requests it received, which no SDK can do through the public API. It is
a test-only HTTP JSON API under the descriptor's `control` URL. A target
must never expose it in production. The mock serves it on loopback only,
at `<communicationUrl>/__conformance`.

| Endpoint | Body | Response |
| --- | --- | --- |
| `POST /reset` | none | `200 {"ok": true}` after restoring the initial state, clearing queued faults and the log, and closing realtime connections with code 1012. |
| `POST /fault` | `{"plane"?, "field", "action", "retryAfterSeconds"?}` | `200 {"ok": true}`, or `400` for an invalid fault. |
| `POST /realtime/drop` | `{"conversationId"?, "code"?, "reason"?}` | `200 {"closed": <number of connections closed>}` |
| `GET /log` | none | `200 {"entries": [...]}` |
| `POST /log/wait` | `{"kind", "match"?, "count"?, "timeoutMs"?}` | `200 {"entries": [...]}`, or `408 {"entries": [...], "timedOut": true}` |

### Faults

A fault applies once, to the next request for a GraphQL root `field`, such
as `sendMessage`, on a `plane` (`communication`, the default, or
`management`). Faults for the same plane and field apply in the order they were queued.
Only requests that are valid GraphQL, authenticated and for the target
project consume a fault; other requests fail as they normally would.

| `action` | Effect on the request |
| --- | --- |
| `rateLimit` | Rejected without running. The response is HTTP 429 with a `Retry-After: <retryAfterSeconds>` header and a GraphQL error whose extensions are `{"code": "RATE_LIMITED", "status": 429, "outcome": "rejected", "retryAfter": <retryAfterSeconds>, "requestId": ...}`. `retryAfterSeconds`, a positive integer, is required. |
| `dropBeforeCommit` | The connection closes without a response, and the request does not take effect. |
| `dropAfterCommit` | The request takes effect, then the connection closes without a response. |

The two drops look identical to the SDK: in both cases the outcome is
unknown until the SDK resolves the request id. The recovery scenarios
check that SDKs handle both correctly.

### Realtime drops

`POST /realtime/drop` closes every realtime WebSocket connection, or only
those subscribed to `conversationId`, with close `code` (default 1012) and
`reason` (default `Service restart`). Scenarios use 1012 to simulate a
service restart, after which SDKs must reconnect and resume from their
cursor, and 4401 to end a subscription's authorization, after which SDKs
must report `UNAUTHENTICATED` and stop without reconnecting.

### Log

The log records what the service received, in order. Every entry has
`sequence` (the entry's position in the log, an integer), `at` (an RFC 3339
time) and `kind`:

| `kind` | Fields |
| --- | --- |
| `request` | `plane`, `field` (the root field, or `null` if the request could not be parsed), `requestId` (or `null`), `status` (the HTTP status; `0` when the connection was dropped), `code` (the error code, or `null` on success) and `dropped`. |
| `subscribe` | `conversationId`, `principalId`, `after` (the sequence the client asked to resume after, or `null`) and `start` (the sequence after which the service starts sending events). |
| `close` | `code`, `reason`, `initiator` (`server` or `client`) and `conversationIds` (the conversations the connection was subscribed to). |

`POST /log/wait` waits until at least `count` (default 1) entries of `kind`
match `match`, or until `timeoutMs` (default 5000, at most 30 000) elapses,
and returns every matching entry. An entry matches when, for each key in
`match`, the entry's field equals the value or is an array that contains
it.

## Mock target

[`conformance/mock/`](../../conformance/mock) is a deterministic,
in-process ConvoHop service for running the suite without a deployment.
It executes requests against the real GraphQL schemas in
[`schema/`](../../schema), so a request the service would reject as invalid
GraphQL is rejected by the mock too, with `GRAPHQL_INVALID_REQUEST`, and
every response must satisfy the schema. Documents larger than the IR's
`transport.http.maxDocumentBytes` fail with `GRAPHQL_QUERY_LIMIT`, and
request bodies larger than 1 MiB with `REQUEST_TOO_LARGE`. The IR names
no body limit, so that one is the mock's own. The mock models only public
behaviour, and only enough of it for the scenarios:

- Principals, user sessions, conversations, memberships, messages, the
  conversation event log, idempotent request records and backend-key
  issuing. Other root fields fail with `FEATURE_UNSUPPORTED` (HTTP 422).
- Backend keys with the IR's scopes and expiry, user sessions with expiry,
  membership-based visibility, author-or-moderator message changes,
  revisions and request-id idempotency. A backend key without a scope the
  operation requires gets `SCOPE_REQUIRED`, with the authority's message,
  which names the scope. Backend keys send and read messages as an active
  member named by `actAsPrincipalId` (otherwise `NOT_FOUND`), or without it
  send as the mock's backend service principal and read the whole history,
  and they edit and delete messages with the `moderation` scope. User
  sessions that pass `actAsPrincipalId` get `FORBIDDEN`.
- Realtime events over `graphql-transport-ws`: replay from a cursor, then
  live delivery.
- All four [credentials](#credentials), every [capability](#capabilities)
  and the [control API](#control-api).

Its project, incarnation and actor ids derive from a seed
(`convohop-conformance` by default), so they are the same on every run, and
its credentials are fixed, public test values. Nothing about it is secret.
To use it from another tool, start it on its own:

```sh
node conformance/mock/cli.mjs [--seed <seed>]   # prints the descriptor as one JSON line
```

The mock is only as accurate as its model. Passing against it shows that
an SDK, its driver and the scenarios agree; it does not certify a real
deployment.

## Dev-stack target

[`conformance/targets/dev-stack.json`](../../conformance/targets/dev-stack.json)
describes the ConvoHop dev-stack container image for SDK CI. Every value
comes from an environment variable:

| Variable | Descriptor field |
| --- | --- |
| `CONVOHOP_DEV_COMMUNICATION_URL` | `communicationUrl` |
| `CONVOHOP_DEV_MANAGEMENT_URL` | `managementUrl` |
| `CONVOHOP_DEV_PROJECT_ID` | `projectId` |
| `CONVOHOP_DEV_INCARNATION` | `incarnation` |
| `CONVOHOP_DEV_MANAGEMENT_ACTOR_ID` | `managementActorId` |
| `CONVOHOP_DEV_BACKEND_KEY` | `credentials.backend` |
| `CONVOHOP_DEV_BACKEND_KEY_LIMITED` | `credentials.backendLimited` |
| `CONVOHOP_DEV_BACKEND_KEY_EXPIRED` | `credentials.backendExpired` |
| `CONVOHOP_DEV_MANAGEMENT_TOKEN` | `credentials.management` |
| `CONVOHOP_DEV_CONTROL_URL` | `control` |

The image does not exist yet (`TODO(DEV-1)` in the descriptor). The
`dev-stack` job in the
[Conformance workflow](../../.github/workflows/conformance.yml) is wired but
runs only when the repository variable
`CONVOHOP_DEV_STACK_IMAGE` is set, and never for pull requests from forks.
Its "Start the dev stack" step is a placeholder that fails until DEV-1
defines how to start the image, wait for it and obtain these values. That
step must then append the variables to `$GITHUB_ENV`; the job already runs
the suite with `--target conformance/targets/dev-stack.json` and uploads the
reports. Add capabilities to the descriptor as the image gains them.
