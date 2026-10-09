# Recovery and reconnect rules

Every ConvoHop SDK keeps a journal of the mutations it sends. With it, a
request whose outcome is uncertain is resolved, and resent under its
original request ID, rather than sent twice. SDKs also retry some failures
on their own: initialization, and in client SDKs the realtime stream and
queued sends. This document states the rules for both once. Every SDK
implements the same behaviour, and the
[conformance suite](../conformance/README.md) checks it:

| Rule | Driver feature | Scenarios |
| --- | --- | --- |
| [Recovery journal](#recovery-journal) | `recovery.eviction` | `recovery.eviction.final-records.user`, `recovery.eviction.final-records.backend`, `recovery.eviction.fail-closed.user`, `recovery.eviction.fail-closed.backend` |
| [Retry and reconnect](#retry-and-reconnect) | `realtime.reconnectPolicy` | `realtime.reconnect.gateway-errors`, `realtime.reconnect.retry-after`, `realtime.reconnect.rate-limited`, `realtime.reconnect.quota-exceeded`, `realtime.reconnect.plan-limit`, `realtime.reconnect.spend-stop`, `realtime.reconnect.spend-unverified` |

The values come from the schema IR, [`schema/ir.json`](../../schema/ir.json):
each error code's `status` and `retryable` in `errors.codes`, each
idempotency class's `retryBudget` in `idempotency`, and the stream's backoff
and terminal close codes in `realtime.channels[].reconnect`. The TypeScript
SDKs are the reference: the classifier is
[`retry.ts`](../../packages/core/src/retry.ts) and the journal is in
[`transport.ts`](../../packages/core/src/transport.ts).

## Recovery journal

Before an SDK first sends a mutation that the authority records, which is
every mutation except `ephemeral` ones, it saves a record of the request: its
ID, a fingerprint of its payload, its attempts and what is known of its
outcome. A record's request is in one of these states:

| State | Meaning |
| --- | --- |
| `pending` | Recorded and never sent. |
| `unknown` | Sent, and no answer settled it: the request may have been applied. |
| `rejected` | The authority refused every attempt. |
| `accepted`, `committed` | The authority accepted or committed the request. |

### Final records

A record is **final** when nothing more can come of its request:

- the authority committed or accepted it; or
- the authority rejected every attempt and won't take another. Either the
  last rejection's code isn't retryable, or the request's retry budget is
  spent: three attempts, or 60 seconds since the SDK first submitted it, as
  `retryBudget` says.

A code is retryable unless the IR marks it `retryable: false`. A code the IR
doesn't list, such as a newer service's, counts as retryable. So does
`WRONG_REGION`, since the request can succeed once the client routes again
(see [Classification](#classification)).

Records that aren't final are those of `pending` and `unknown` requests, and
of requests rejected with a retryable code, such as `RATE_LIMITED`, while
budget remains. The app may still resend these requests under the same ID.
A record that the SDK can't read, such as one a newer SDK saved, counts as
not final.

### Bound and eviction

The journal holds at most 128 records. A new request needs a place in it. A
request already recorded doesn't, so a full journal still resends a request
under its ID.

When a new request finds the journal full, the SDK evicts one record:

1. It may evict only a record that is final, that no call in progress is
   using, and that no caller retains. A caller retains the records of
   requests it may still resend or resolve, such as an outbox's queued
   messages.
2. Of those, it evicts the one whose last attempt is the oldest.

The SDK must never evict a record that isn't final. When no record can be
evicted, it fails closed: it refuses the new request before sending anything,
with a typed problem rather than an untyped error:

| Field | Value |
| --- | --- |
| `code` | `RECOVERY_LIMIT` |
| `status` | 409 |
| `outcome` | `rejected`, since nothing was sent |
| `requestId` | The refused request's ID |

`RECOVERY_LIMIT` isn't retryable: the same call fails until a record becomes
final. To make room, the app resends or resolves its outstanding requests. A
request that commits, is accepted or is rejected for good leaves a final
record, which the next new request may evict.

Taking in another client's record of a request, to resend it, needs a place
too. When there is none, that fails with `RECOVERY_LIMIT` as well, with the
request's known outcome.

### Shared storage

Clients may persist one journal in storage they share, such as a user's
browser tabs or a backend's replicas sharing a database. Each write reads the
stored journal and merges the client's records into it, request by request.
Records the client doesn't hold stay as stored, and so do fields it doesn't
know. When the merged journal holds more than 128 records, the write drops
records in this order, oldest last attempt first within each group, until 128
remain:

1. Final records that the writing client doesn't hold and no caller retains.
2. The writing client's own final records, other than the one it is
   writing, that no call in progress is using and no caller retains.
3. Unless the write creates a new request, the other records that the
   writing client doesn't hold, final or not.

A write that creates a new request and still has more than 128 records fails
with `RECOVERY_LIMIT` and writes nothing, rather than drop another client's
record that isn't final. Other writes always fit, because a client holds at
most 128 records of its own.

## Retry and reconnect

An SDK never resends a call that the app made. It does retry the work it
runs by itself:

- initialization, which routes the client to its region;
- in client SDKs, reconnecting the realtime stream;
- in client SDKs, an outbox's queued sends.

The same classifier decides, for each of them, whether to try again.

### Classification

A failure that isn't a typed ConvoHop problem stops. A problem is classified
by its code first, then by its HTTP status:

| Problem | Action |
| --- | --- |
| `WRONG_REGION` | Route again, then retry. |
| A code that the IR marks `retryable: false` | Stop, and report the problem to the app. |
| Any other code, with status 0 (no response), 408, 429 or 5xx | Retry. |
| Any other code, with another status | Stop, and report the problem to the app. |

So:

- Network failures, timeouts and lost responses retry, such as
  `TRANSPORT_UNKNOWN` with status 0.
- 500, 502, 503 and 504 retry. That includes a gateway's error page that
  isn't JSON, which the SDK reports as `INVALID_RESPONSE` with the HTTP
  status.
- `RATE_LIMITED` and `ADMISSION_LIMIT` retry. `QUOTA_EXCEEDED`, also 429,
  stops: retrying doesn't restore a spent quota.
- `PLAN_LIMIT_EXCEEDED`, `FORBIDDEN`, `SCOPE_REQUIRED`, `UNAUTHENTICATED` and
  `RECOVERY_LIMIT` stop.
- The IR's `retryable` wins over the status. `BILLING_NOT_CONFIGURED`,
  `MEMBERSHIP_COUNT_INVALID`, `SESSION_RECEIPT_BINDING_MISMATCH` and
  `SESSION_RECEIPT_INVALID` are 503 but not retryable, so they stop.
- A code that the IR doesn't list is judged by its status.

These rules leave session renewal as it is. `UNAUTHENTICATED` and
`SESSION_REFRESH_REQUIRED` aren't retryable, so initialization and the stream
stop on them, while an outbox waits for the session to be renewed (see
[Queued sends](#queued-sends)). Where an SDK pauses a stream to renew its
session, a failure while it is paused is reported without stopping the
stream, and the renewal decides whether it resumes.

### Delay

A problem may carry `retryAfter`, in whole seconds. The SDK takes it from
the first of these that holds one:

1. the GraphQL error's `extensions.retryAfter`, or the `retryAfter` of a
   non-GraphQL error body;
2. the HTTP `Retry-After` header, as a number of seconds, including on a
   response that isn't JSON;
3. `retryAfter=N` in a realtime close reason.

A value that isn't a whole number of seconds, such as an HTTP-date or `1.5`,
is ignored rather than guessed.

Each retry loop backs off between attempts, and `retryAfter` is a floor on
that backoff: the next attempt waits at least `retryAfter` seconds. An early
wake-up, such as connectivity returning or the app coming to the foreground,
may skip the backoff but never the floor. Initialization and queued sends
may back off on their own curves. The stream uses the IR's.

### Reconnecting the stream

A dropped stream reconnects after a backoff that the channel's `reconnect`
sets. Attempt `n`, counted from 0 and reset when a connection is
acknowledged, waits `max(min(baseDelayMs × 2^n, maxDelayMs), retryAfter × 1000)`
milliseconds, plus a uniformly random jitter from 0 up to, but not
including, `jitterMs`. Today that is 1 s doubling to 10 s, plus under 0.5 s.

Each attempt routes again before it connects, so the stream follows a
project to its current region: after `WRONG_REGION`, reconnecting is all it
needs. It then catches up from the last event that the app applied. A
failure during an attempt, of routing or of the connection, is classified
like any other.

### Realtime closes

A close reason may name a problem: an error code, then optional
space-separated `key=value` parameters, such as
`QUOTA_EXCEEDED retryAfter=60 meter=messages`. When the service closes a
stream's connection, the stream:

1. reports the named problem, whatever the close code, when the reason's
   first word is a code that the IR lists. The problem has that code; the
   IR's status for it, or, when the IR has none, the close code minus 4000
   for close codes 4000 to 4999, else 0; outcome `rejected`; and the
   `retryAfter=` parameter. The classifier then decides what follows.
2. otherwise reports `UNAUTHENTICATED` with status 401 when the close code
   is one of the channel's `terminalCloseCodes`: 4400, 4401, 4403, 4408 or
   4409. Realtime authorization ended, and since `UNAUTHENTICATED` isn't
   retryable, the stream stops.
3. otherwise reconnects with backoff, without reporting a problem.

The code in the reason decides, not the close code alone. ConvoHop closes
with 4429 both when a connection is rate limited, which reconnects, and when
a quota is spent, which doesn't. Its documented closes:

| Close code | Reason | Result |
| --- | --- | --- |
| 4429 | `RATE_LIMITED retryAfter=N` | Reconnect, no sooner than N seconds. |
| 4429 | `QUOTA_EXCEEDED retryAfter=N meter=M` | Stop and report `QUOTA_EXCEEDED`. |
| 4403 | `PLAN_LIMIT_EXCEEDED planLimit=X` | Stop and report `PLAN_LIMIT_EXCEEDED`. |
| 4402 | `SPEND_CAP_REACHED meter=M` | Stop and report `SPEND_CAP_REACHED`. |
| 4402 | `CREDITS_EXHAUSTED meter=M` | Stop and report `CREDITS_EXHAUSTED`. |
| 4503 | `SPEND_UNVERIFIED retryAfter=N meter=M` | Reconnect, no sooner than N seconds. |

The service may also refuse the WebSocket upgrade with an HTTP 429
`application/problem+json` response. An SDK whose WebSocket client exposes
that response classifies its problem like any other HTTP response. The
browser `WebSocket` API, which the TypeScript SDKs use, doesn't expose it.
They see close code 1006 without a reason, so they reconnect after the
backoff (rule 3).

### Queued sends

An outbox sends the messages that the app queued. It keeps each one's
request ID until the message is sent or fails. A message stays queued after:

- an unknown outcome, which is never a rejection. The outbox resends the
  request under its ID while budget remains, then resolves it to learn
  whether it was applied.
- a rejection that the classifier retries, or `WRONG_REGION`, after which
  the outbox routes again first.
- `RECOVERY_LIMIT`. Nothing was sent, and the message waits until the
  journal has room.
- `UNAUTHENTICATED` or `SESSION_REFRESH_REQUIRED`. The message waits for the
  session to be renewed.

Any other rejection, such as `QUOTA_EXCEEDED`, `PLAN_LIMIT_EXCEEDED` or
`SCOPE_REQUIRED`, fails the message at once and reports it.

Sends differ from the stream only in the last two cases. A queued message is
data that the app asked the SDK to deliver. A full journal and an expired
session each clear without changing the message, so the outbox keeps it.
The stream holds no such data, so it stops when its session ends, as rule
2 of [Realtime closes](#realtime-closes) says. The app subscribes again once
it has a valid session.

## Conformance

A driver declares `recovery.eviction` and `realtime.reconnectPolicy` in
`hello` once its SDK follows these rules. Scenarios that need an undeclared
feature are skipped (see the
[driver protocol](../conformance/driver-protocol.md#features)).

| Scenario | Checks |
| --- | --- |
| `recovery.eviction.final-records.user`, `recovery.eviction.final-records.backend` | 129 `REVISION_CONFLICT` rejections, one more than the journal holds, all reach the service, so final records made room. The user variant also checks that an older `unknown` send is kept and still resends. |
| `recovery.eviction.fail-closed.user`, `recovery.eviction.fail-closed.backend` | After 128 `RATE_LIMITED` rejections, a new request fails with `RECOVERY_LIMIT` and isn't sent. A kept request still resends under its ID, and once it commits a new request fits. |
| `realtime.reconnect.gateway-errors` | Reconnection continues after routing answers 502 and then 504. |
| `realtime.reconnect.retry-after` | A rate-limited routing answer's `retryAfter` holds off the next attempt. |
| `realtime.reconnect.rate-limited` | A 4429 `RATE_LIMITED retryAfter=4` close reconnects, no sooner than 4 seconds. |
| `realtime.reconnect.quota-exceeded` | A 4429 `QUOTA_EXCEEDED` close ends the stream with that problem. |
| `realtime.reconnect.plan-limit` | A 4403 `PLAN_LIMIT_EXCEEDED` close ends the stream with that problem, not `UNAUTHENTICATED`. |
| `realtime.reconnect.spend-stop` | A 4402 `SPEND_CAP_REACHED` close ends the stream with that problem. |
| `realtime.reconnect.spend-unverified` | A 4503 `SPEND_UNVERIFIED retryAfter=4` close reports that problem and reconnects, no sooner than 4 seconds. |

The mock target's `httpStatus` fault and reason-coded realtime drops drive
them (see [targets](../conformance/targets.md#faults)). The mock doesn't
route between regions or refuse upgrades, so `WRONG_REGION` and refused
upgrades have no scenarios. Each SDK tests them in its own suite.
