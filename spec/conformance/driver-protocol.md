# Conformance driver protocol

A driver adapts one SDK to the [conformance runner](README.md). The runner
starts it as a child process and exchanges JSON messages with it over
stdio. The driver turns each request into SDK calls and reports what the SDK
returned, without interpreting it: the scenarios decide what is correct.

This document is normative. [`driver-protocol.schema.json`](driver-protocol.schema.json)
defines every message shape, and the runner validates every response
against it.

## Framing

- Messages are UTF-8 JSON objects, one per line, each terminated by `\n`
  ([NDJSON](https://github.com/ndjson/ndjson-spec)). Lines must not contain
  raw newlines; JSON string escapes are fine.
- The runner writes requests to the driver's stdin. The driver writes
  responses to stdout, and **nothing else**: anything on stdout that is not a
  response is a [fatal violation](#lifecycle). SDK and driver logs go to
  stderr, whose last lines the runner includes in failure reports. The runner
  [redacts](README.md#execution) the credentials it knows from them, but
  drivers must not log credentials or tokens.
- A request is `{"id": <integer>, "method": <string>, "params": <object>}`.
  Ids are positive integers within the JSON safe-integer range and are never
  reused within one driver process.
- The driver answers every request with exactly one response carrying the
  same `id`: `{"id": 7, "result": {...}}` on success or
  `{"id": 7, "error": {"code": "...", "message": "..."}}` when the request
  itself failed. If a line cannot be parsed, or has no valid id, the driver
  answers with `"id": null` and an `INVALID_REQUEST` error.
- The runner sends one request at a time and waits for its response. Drivers
  may therefore process requests strictly in order.

```text
runner → driver  {"id":1,"method":"hello","params":{"runner":{"name":"convohop-conformance-runner","version":"0.1.0"}}}
driver → runner  {"id":1,"result":{"driver":{"name":"example","version":"1.0.0","language":"python"},"roles":{"backend":{"operations":["principals.create"]}},"features":[]}}
runner → driver  {"id":2,"method":"reset","params":{}}
driver → runner  {"id":2,"result":{}}
```

## SDK failures and protocol errors

An SDK failure is a normal result. When an SDK call fails, `invoke` and
`realtime.subscribe` return `{"ok": false, "error": <sdkError>}`, and stream
errors appear in `realtime.collect`'s `errors`. Scenarios assert on these.

A protocol error means the request itself could not be carried out: it was
malformed, named an unknown handle, or needed something the driver does not
support. A protocol error fails the current step but leaves the driver
running.

| Code | Use |
| --- | --- |
| `INVALID_REQUEST` | The line is not JSON, the id is invalid, `method` is not a string, `params` is not an object, or `hello` is not the first request or is sent twice. |
| `UNKNOWN_METHOD` | The driver does not implement the method. |
| `INVALID_PARAMS` | A parameter is missing, has the wrong type, or cannot be converted to the SDK's types; or a handle is reused. |
| `UNKNOWN_HANDLE` | A client or subscription handle is not open. |
| `UNSUPPORTED` | The request needs a role, operation or feature the driver did not declare. |
| `DRIVER_FAILURE` | An unexpected error inside the driver. |

### sdkError

Every SDK failure is reported in the same language-neutral form, so that one
scenario can assert on every SDK:

| Field | Type | Meaning |
| --- | --- | --- |
| `code` | string | The SDK's error code, in upper snake case. For a failure that comes from the service, this is the service's code, such as `NOT_FOUND`. Use `SDK_ERROR` only for failures the SDK does not classify. |
| `status` | integer or `null` | The HTTP status of the service response that caused the failure, or `null` when there was none, for example when the connection dropped or the SDK rejected the call locally. Never `0`. |
| `outcome` | string or `null` | The SDK's verdict on whether a mutation took effect: `rejected` (it did not) or `unknown` (it may have; resolve the request id to find out). `null` when the SDK does not say. |
| `requestId` | string or `null` | The request id the failure belongs to, when the SDK reports one. |
| `retryAfterMs` | integer or `null` | The delay the service asked for before retrying, in milliseconds, when the driver declares the `retryAfter` [feature](#features); otherwise `null`. |
| `message` | string | A human-readable description. Scenarios never match it. It must not contain credentials. |

Codes that scenarios pin include `UNAUTHENTICATED`, `FORBIDDEN`,
`SCOPE_REQUIRED`, `NOT_FOUND`, `INVALID_REQUEST`, `REVISION_CONFLICT`,
`MESSAGE_DELETED`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED` and
`TRANSPORT_UNKNOWN` (the request was sent but no complete response arrived,
so its outcome is unknown).

The service reports a rate limit as HTTP 429 with a `RATE_LIMITED` code, a
`retryAfter` error extension in whole seconds and a `Retry-After` header.
A driver that declares `retryAfter` reports that delay as `retryAfterMs`
(seconds × 1000).

## Methods

### hello

The first request, sent exactly once. The runner identifies itself, and the
driver declares what it supports.

Params:

```json
{ "runner": { "name": "convohop-conformance-runner", "version": "0.1.0" } }
```

Result:

```json
{
  "driver": {
    "name": "convohop-typescript-reference",
    "version": "0.1.0",
    "language": "typescript",
    "packages": { "@convohop/client": "0.1.0" }
  },
  "roles": {
    "user": { "operations": ["messages.send", "messages.list"] },
    "backend": { "operations": ["principals.create", "sessions.issue"] }
  },
  "features": ["realtime"]
}
```

- `driver.language` is a lowercase language name, such as `python`, `go`,
  `kotlin` or `csharp`. `packages` optionally lists the SDK packages under
  test and their versions; it appears in reports.
- `roles` declares at least one of `user` (a client authenticated with a
  user session token), `backend` (a trusted server authenticated with a
  backend key) and `management` (the management plane). Each role lists the
  [catalog operations](README.md#operations) the driver implements for it.
  Declare only roles and operations the SDK really supports: scenarios that
  need anything else are skipped, and a declared operation that then answers
  `UNSUPPORTED` fails the scenario.
- `features` lists the optional [features](#features) the driver implements.

The runner fails setup if the response is invalid, and it requires a driver
that it restarts to declare exactly the same thing again.

### client.create

Creates an SDK client and stores it under a handle.

| Param | Required | Meaning |
| --- | --- | --- |
| `client` | yes | The new handle: 1 to 64 characters from `A-Z a-z 0-9 . _ : -`. Reusing an open handle is `INVALID_PARAMS`. |
| `role` | yes | `user`, `backend` or `management`. An undeclared role is `UNSUPPORTED`. |
| `baseUrl` | yes | The service URL for this client. |
| `credential` | yes | The user session token, backend key or management access token. |
| `projectId`, `incarnation` | user and backend | The project the client is bound to. |
| `principalId` | user | The principal the session token was issued to. |
| `actorId` | management | The acting management principal. |
| `storage` | no | A recovery store name; see the `recovery.storage` [feature](#features). |

Constructing a client must not contact the service. Invalid credentials
must surface later, as SDK failures of the operations that use them, which
is what the authentication scenarios assert. The result is `{}`.

### client.close

Params `{"client": <handle>}`. Closes the client and every subscription
opened through it, and forgets their handles. Recovery stores are kept. The
result is `{}`.

### invoke

Params `{"client": <handle>, "operation": <name>, "args": {...}}`. Runs one
[catalog operation](README.md#operations) through the SDK's idiomatic API,
using the SDK's own defaults for retries, request ids and recovery unless an
argument says otherwise.

- On success: `{"ok": true, "value": <projection>}`. The value is the JSON
  projection described by the operation's `returns` in the
  [catalog](operations.json), which names [`schema/`](../../schema) GraphQL
  types: every selected field is present (`null` when absent), and SQL
  counters such as sequences and revisions are canonical decimal strings,
  never JSON numbers. An operation with no result returns `null`.
- On SDK failure: `{"ok": false, "error": <sdkError>}`.
- Arguments the driver cannot convert to SDK types are `INVALID_PARAMS`; an
  operation the client's role does not implement is `UNSUPPORTED`.

### realtime.subscribe

Params `{"client": <handle>, "subscription": <handle>, "conversationId": <id>}`.
Requires the `realtime` feature and a user client. Opens the SDK's
conversation event stream, as an application would, and starts recording
everything it delivers.

The driver answers once the SDK has either started the stream, including
any initial replay it performs, or failed to. A failure to start is
`{"ok": false, "error": <sdkError>}`, for example `NOT_FOUND` for a
conversation the principal cannot read. Otherwise the result is
`{"ok": true}`.

### realtime.collect

Params:

| Param | Meaning |
| --- | --- |
| `subscription` | The subscription handle. |
| `until` | Optional. `count`: at least this many events recorded. `sequence`: an event whose sequence is greater than or equal to this counter recorded. `closed: true`: the stream has ended. All given conditions must hold. An empty or missing `until` is satisfied immediately. |
| `timeoutMs` | The longest time to wait, 0 to 60 000. |
| `settleMs` | Optional. How long to keep recording after the wait ends, 0 to 10 000, so that unexpected extra events are caught. |

The driver waits until `until` holds, the stream ends, or `timeoutMs`
elapses, then waits `settleMs`, then answers:

```json
{ "events": [], "errors": [], "closed": false, "timedOut": false }
```

- `events`: every event the SDK has delivered to the application on this
  subscription since it started, in delivery order, as JSON projections of
  `ConversationEvent`. Each call returns the full record, not just events
  since the previous call.
- `errors`: every error the SDK has reported on this stream since it
  started, as `sdkError` values. Transient errors that the SDK recovers from
  belong here too.
- `closed`: whether the stream has ended for good, so the SDK will deliver
  nothing more and will not reconnect.
- `timedOut`: `true` when the wait ended because `timeoutMs` elapsed, with
  `until` unsatisfied and the stream still open.

### realtime.close

Params `{"subscription": <handle>}`. Stops the subscription and forgets the
handle. The result is `{}`.

### webhooks.verify

Requires the `webhooks.verify` feature. Verifies a webhook delivery offline
with the SDK's own verifier, as described in
[webhook-signatures.md](webhook-signatures.md).

Params:

| Param | Meaning |
| --- | --- |
| `payload` | The raw request body, verified exactly as given. |
| `headers` | The request headers. Names may use any case. |
| `secrets` | One or more endpoint secrets (`whsec_...`). The delivery is valid if any of them verifies it. |
| `nowSeconds` | The current Unix time, in seconds, that the verifier must use instead of the system clock. |
| `toleranceSeconds` | The largest allowed difference between `nowSeconds` and the delivery's timestamp. |

The result is `{"valid": true, "code": null}` or
`{"valid": false, "code": <code>}`, where the code is one of
`WEBHOOK_HEADERS_MISSING`, `WEBHOOK_TIMESTAMP_INVALID`,
`WEBHOOK_TIMESTAMP_EXPIRED`, `WEBHOOK_TIMESTAMP_FUTURE` and
`WEBHOOK_SIGNATURE_INVALID`.

### reset

Sent before every scenario. The driver closes every subscription and client
and discards every recovery store, returning to its state right after
`hello`. The result is `{}`.

### shutdown

The driver releases everything as for `reset`, answers `{}` and exits with
status 0. The runner kills drivers that are still running 5 seconds later.
A driver must also exit when its stdin closes.

## Features

A feature is optional behaviour that a driver declares in `hello`.
Scenarios and steps that need an undeclared feature are skipped.

The protocol has no version number. It changes additively: new optional
behaviour becomes a new feature, and a driver that predates a new method
answers it with `UNKNOWN_METHOD`.

| Feature | The driver |
| --- | --- |
| `realtime` | Implements `realtime.subscribe`, `realtime.collect` and `realtime.close` for user clients. |
| `recovery.storage` | Honours `storage` in `client.create`. Clients created with the same name share one store, which holds the SDK's persisted recovery state, such as unresolved request ids and realtime cursors. A store outlives `client.close` until `reset`, so that a scenario can close a client and create a new one on the same store to simulate an application restart. |
| `retryAfter` | Reports the service's retry delay as `sdkError.retryAfterMs`. |
| `webhooks.verify` | Implements `webhooks.verify`. |

## Lifecycle

1. The runner starts the driver without a shell, sends `hello` and waits up
   to 30 seconds for the answer.
2. Before each scenario it sends `reset`, then runs the scenario's steps.
3. At the end of the run it sends `shutdown`.

Each request has a deadline: 30 seconds for `hello` and `reset`, 90 seconds
for `invoke` and `realtime.subscribe`, `timeoutMs + settleMs + 10` seconds
for `realtime.collect`, and 60 seconds for anything else.

These are **fatal violations**. The runner kills the driver, fails the
current scenario and starts a fresh driver for the next one:

- writing anything other than a valid response to stdout;
- answering an id that is not outstanding;
- missing a deadline; or
- exiting before `shutdown`.

A result with the wrong shape for its method fails only the current step.

## Reference driver

[`conformance/drivers/ts/`](../../conformance/drivers/ts) is the TypeScript
reference driver, built on `@convohop/client` and `@convohop/server`.

```sh
npm run build                                              # the SDK packages, then the driver
node conformance/drivers/ts/dist/driver.mjs                # user, backend and management
node conformance/drivers/ts/dist/driver.mjs --roles user   # behave like a client-only SDK
```

`--roles` declares a comma-separated subset of roles, which shows how the
runner uses the fixture driver for the others. `sdk.mts` is the only module
that imports SDK packages: it maps catalog operations to SDK calls, SDK
errors to `sdkError` and SDK streams to subscriptions. A driver for another
SDK can follow the same split. The reference driver declares every feature,
including `retryAfter` and `webhooks.verify`.
