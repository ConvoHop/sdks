# ConvoHop Python server SDK

`convohop` is the Python SDK for the current Conversation and Management APIs.
It holds secret backend keys and operator credentials, so it runs only on
trusted servers, never in a browser or a mobile app. It needs Python 3.11 or
later and depends only on [`httpx`](https://www.python-httpx.org/).
License: [Apache-2.0](LICENSE).

It isn't on PyPI: registry publishing isn't approved yet, and the package
carries the `Private :: Do Not Upload` classifier so that an accidental upload
fails. Install it from a clone of this repository:

```sh
pip install ./python
```

- `ConvoHop` and `AsyncConvoHop` call one project with a backend key.
- `ConvoHopManagement` and `AsyncConvoHopManagement` call the control plane
  with an operator access token.
- `convohop.webhooks` verifies webhook deliveries.
- `convohop.push` builds APNs, FCM and Web Push requests from notification
  events.
- `convohop.types` has the request inputs and response models.

The operations, their inputs and models are generated from the schema in
[`schema/`](../schema) by [`tools/sdkgen`](../tools/sdkgen), like the
TypeScript SDK's. The package ships `py.typed`, so type checkers see every
signature.

## Quickstart

Authenticate the application user before looking up its project-scoped
principal. A caller-supplied principal ID isn't proof of login.

```python
from convohop import ConvoHop
from convohop.types import MemberInputInput

with ConvoHop(
    base_url=communication_base,
    backend_key=backend_key,  # Trusted secret storage only.
    project_id=project_id,
    incarnation=incarnation,
) as server:
    server.initialize()  # Once, before other calls.
    principal = server.create_principal(external_user_id=authenticated_account_id)
    bootstrap = server.issue_session(
        principal_id=principal.principal_id,
        device_id=device_id,
        requested_ttl_ms="900000",
    )
    # Return only this user's bootstrap to their client.
    conversation = server.create_conversation(
        title="Support",
        props={},
        members=[MemberInputInput(principal_id=principal.principal_id, role="member")],
    )
    server.send_message(conversation_id=conversation.conversation_id, text="Welcome", props={})
```

`initialize()` reads the project route, checks the incarnation and records
the serving epoch that later requests carry. A project with a new
incarnation raises `INCARNATION_MISMATCH`; construct a new client for it.

The clients are safe to share between threads. Each creates an
`httpx.Client` and closes it in `close()` or at the end of a `with` block.
Pass `http_client=` to send through your own, which the SDK never closes.
`base_url` must be HTTPS, except for loopback hosts, and the SDK treats a
redirect as a transport failure. `timeout` (default 12 seconds) bounds each
connect, write and read, and a response body still arriving that long after
the request started is a transport failure. Invalid constructor arguments
raise `TypeError` or `ValueError`.

## Async

`AsyncConvoHop` and `AsyncConvoHopManagement` have the same methods as
coroutines and run on asyncio. Use a client in one event loop.

```python
from convohop import AsyncConvoHop

async with AsyncConvoHop(
    base_url=communication_base,
    backend_key=backend_key,
    project_id=project_id,
    incarnation=incarnation,
) as server:
    await server.initialize()
    async for message in server.iter_messages(conversation_id=conversation_id):
        print(message.message_id)
```

Cancelling a call doesn't cancel a mutation that is already in flight: its
outcome stays recorded and is resolved like any other uncertain outcome.

## Operations

Each schema operation is a keyword-only method named after it in snake_case,
such as `create_conversation`, `members` and `end_live_session`. Its
docstring names the authorization, the scope, the idempotency class and the
pagination. Inputs that are `None` are omitted from the request. Responses
are frozen dataclasses from `convohop.types`, checked against their request:
a page from another conversation, for example, raises instead of being
returned.

- **Pages.** `members`, `messages`, `inbox`, `search`, `live_sessions` and
  `live_session_participants` return one page, `limit` 100 by default. Their
  `iter_*` variants follow the cursor until a page is `complete`. A page that
  sets `refresh_required` raises `RESYNC_REQUIRED`; start again from the first
  page.
- **Acting as a member.** Message reads and sends take
  `act_as_principal_id`, and the authority audits every committed call that
  uses it. Without it, a backend key reads the full history and sends as its
  service principal.
- **Counters and times.** Sequences, revisions and other counters are
  canonical decimal strings. Timestamps in responses are timezone-aware
  `datetime` values.

## Errors

A failed request raises `ConvoHopProblem`. Its `code` is the authority's or
the SDK's error code, `status` the HTTP status (0 when nothing was received),
and `outcome` what is known about the request: `rejected` (no effect),
`committed`, `accepted` or `unknown`. `retryable` says whether the error
catalog allows resending the same request ID.

- `ScopeRequiredProblem` (`SCOPE_REQUIRED`): the key lacks a scope; `scope`
  names it. Grant the scope instead of retrying.
- `RateLimitedProblem`, `QuotaExceededProblem` and
  `PlanLimitExceededProblem` carry the authority's limit details.
- `CreditsExhaustedProblem` and `SpendCapReachedProblem` (402): the
  organization's prepaid credits or monthly spend cap stop billable usage
  beyond the plan's allowances. Add credits or raise the cap instead of
  retrying. `SpendUnverifiedProblem` (503): current spend can't be verified;
  resend after `retry_after`.
- `retry_after` is the number of whole seconds the authority asks you to wait
  before resending, from its `retryAfter` extension or an HTTP `Retry-After`
  header. The SDK never waits or resends on its own.
- An invalid argument raises `INVALID_REQUEST` (`rejected`) before anything
  is recorded or sent.
- A malformed or mismatched response raises `INVALID_RESPONSE`, never a
  partial result. Messages never contain credentials.

## Recovery and retries

Every mutation has a request ID: pass `request_id=` (a lowercase UUID) or let
the SDK create one. Before sending, the client records the request ID, the
operation, its exact input and a retry budget. When an outcome is `unknown`,
for example after a timeout, don't send a new request with a new ID:

```python
from convohop import ConvoHopProblem

try:
    server.send_message(conversation_id=conversation_id, text="Shipped", props={}, request_id=request_id)
except ConvoHopProblem as problem:
    if problem.outcome != "unknown":
        raise
    resolution = server.retry_request(problem.request_id)
```

`retry_request()` asks the authority about the request first and resends it
with its original ID and input only if the authority never saw it, within the
original budget. It raises `LookupError` for a request the client has no
record of, and `RESOLUTION_REQUIRED` once the budget is spent.
`resolve_request()` only asks. Concurrent calls with the same request ID share
one attempt; the same ID with a different input raises `IDEMPOTENCY_CONFLICT`.

Records are kept in memory unless you pass `recovery_storage=`, an object with
`get_item(key)` and `set_item(key, value)` that stores values durably before
returning. The async clients also accept `async_recovery_storage=` with
coroutine methods, which they load on first use; await `initialize_recovery()`
before reading `recovery_states`, which lists the records. A client keeps at
most 128 records. To make room for a new request it forgets the final record
attempted longest ago that no call is using. A record is final when the SDK
will never send its request again: the authority committed or accepted it, or
rejected it with a problem that isn't retryable, or the request's
three-attempt/60-second retry budget is spent, whatever its outcome (see the
[recovery journal rules](../spec/recovery/README.md#recovery-journal)). A
spent request raises `RESOLUTION_REQUIRED` instead of being sent, and
`resolve_request()` still looks it up once its record is gone. With no final
record to forget, the new request fails with `ConvoHopProblem` code
`RECOVERY_LIMIT`, outcome `rejected` and status 409 before it is sent; resend
or resolve the kept requests first. Records hold inputs, never credentials,
and use the TypeScript SDK's keys and format, so both SDKs can share them.

## Webhooks

`webhooks.verify()` checks a delivery signed with the Standard Webhooks
symmetric `v1` scheme and returns its event.

```python
from starlette.requests import Request
from starlette.responses import Response

from convohop import WebhookVerificationError, webhooks


async def receive(request: Request) -> Response:
    body = await request.body()  # The exact bytes received, never re-serialized JSON.
    try:
        delivery = webhooks.verify(headers=request.headers, body=body, secrets=webhook_secrets)
    except WebhookVerificationError:
        return Response(status_code=400)
    queue.add_once(delivery.webhook_id, delivery.event)  # Process after responding.
    return Response(status_code=204)
```

Respond `2xx` within 5 seconds, then process. Delivery is at least once:
de-duplicate on `webhook_id`, which retries and replays keep.

- `headers` is a mapping or any object whose `items()` yields every header,
  such as the header objects of Starlette, Django, Flask, aiohttp and
  `http.server`. Names match case-insensitively. A repeated header fails.
- `body` is the raw body as `bytes`, or a `str` that is its exact UTF-8
  decoding.
- `secrets` is one `whsec_` secret or a list of them. Pass every secret you
  hold: during a rotation ConvoHop also signs with the next secret, and with
  the replaced one for 24 hours. Entries with other version prefixes are
  ignored.
- `tolerance_seconds` defaults to 300 and `now` to the current time; `now`
  must be timezone-aware.

The event is a frozen dataclass with `event_id`, `event_type`, `occurred_at`,
`project_id` and `subject_ref`. Resource events carry only that metadata, so
fetch content through the API. Notification events
(`WebhookMessageNotificationEvent`, `WebhookCallNotificationEvent` and
`WebhookCallCancelledNotificationEvent`) also carry the recipient,
conversation, sender and message or call, for push notifications. Match on
the class, or check `event.known` and then `event.event_type`. An event type
this SDK doesn't know, or a notification event that breaks the
[push payload contract](../spec/push-payload/README.md), is a
`WebhookUnknownEvent` (`known` is `False`) and never raises: acknowledge it.
Timestamps stay strings, exactly as sent. `to_dict()` returns the wire form.
`webhooks.verify_signature()` checks only the headers, timestamp and
signature, for bodies you parse yourself.

A failed check raises `WebhookVerificationError`. Checks run in this order,
and `code` names the first that failed. The message never contains secrets,
signatures or the body.

| Code | Cause |
| --- | --- |
| `INVALID_SECRET` | No secret, or one that isn't `whsec_` followed by padded standard Base64 of 24 to 64 bytes. Fix your configuration. |
| `MISSING_HEADER` | `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty. |
| `INVALID_HEADER` | One of those headers is repeated. |
| `INVALID_TIMESTAMP` | `webhook-timestamp` isn't 1 to 15 digits of Unix seconds. |
| `TIMESTAMP_EXPIRED` | The timestamp is more than the tolerance before `now`. |
| `TIMESTAMP_FUTURE` | The timestamp is more than the tolerance after `now`. |
| `BODY_TOO_LARGE` | The body is over 4096 bytes. |
| `TOO_MANY_SIGNATURES` | `webhook-signature` has more than 8 entries. |
| `NO_MATCHING_SIGNATURE` | No `v1` entry matches any secret. |
| `INVALID_BODY` | `verify()` only: the signed body isn't a UTF-8 JSON event envelope. |

## Push payloads

ConvoHop doesn't send push notifications for you
([bring your own](../docs/sdk-strategy.md#push-notifications-bring-your-own)).
`convohop.push` builds requests from a verified notification event. The
builders are pure functions: your push library adds the device's token or
FID and the APNs or FCM authorization, encrypts and signs Web Push messages,
and sends them. They follow the [push payload contract](../spec/push-payload/README.md)
and produce its shared vectors' requests exactly. Subscribe a webhook
endpoint to `notification.message`, `notification.call` and
`notification.callCancelled` to receive the events.

```python
from convohop import push


def notify(event):  # A notification event from webhooks.verify().
    title = display_name(event.sender_id)  # Your own text and localization.
    for device in devices_of(event.recipient_id):  # Your own device store.
        if device.platform == "ios":
            # A CallKit app gets incoming calls as VoIP pushes. apns_voip() returns None for other events.
            voip = push.apns_voip(event, bundle_id=bundle_id, title=title)
            alert = None if voip else push.apns_alert(event, bundle_id=bundle_id, title=title)
            if voip:
                send_apns(device.voip_token, voip["headers"], push.encode(voip["payload"]))
            if alert:
                send_apns(device.token, alert["headers"], push.encode(alert["payload"]))
        elif device.platform == "android":
            request = push.fcm(event, title=title)
            if request:
                # device.target is {"token": ...} by default, or {"fid": ...}: see below.
                send_fcm({**request["message"], **device.target})
        else:
            request = push.web_push(event, title=title)
            if request:
                send_web_push(device.subscription, push.encode(request["payload"]), request["headers"])
```

Each builder returns a request dict, or `None` when the event doesn't apply
to its platform or is stale. Send nothing for `None`.

| Builder | Request | `None` for | Limit (bytes) |
| --- | --- | --- | --- |
| `push.apns_alert(event, bundle_id=...)` | APNs `headers` and `payload` for an alert | A `notification.callCancelled` that isn't a missed call | 4096 of `payload` |
| `push.apns_voip(event, bundle_id=...)` | APNs `headers` and `payload` for a VoIP push on `<bundle_id>.voip` | Every event but `notification.call` | 5120 of `payload` |
| `push.fcm(event)` | An FCM HTTP v1 `message` with `data` and Android options. Add `token` or `fid`. | Stale events only | 4096 of `message.data` |
| `push.web_push(event)` | RFC 8030 `headers` and a `payload` for your library to encrypt | Stale events only | 3993 of `payload` |

- `title` and `body` are the visible text; an empty string is the same as
  none. `preview` (default `True`) makes a message event's opted-in preview
  the body when you pass no `body`. `now` is the clock.
- Requests are metadata-only unless you pass text or the event carries a
  preview. An APNs alert without a body has a `loc-key`:
  `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` or `CONVOHOP_MISSED_CALL`.
- Messages and missed calls stay relevant for a day after `occurred_at`,
  calls and other cancellations until the ring's `expires_at`, and never
  more than 28 days. Calls and cancellations collapse on the ring.
- A request over its limit has its body, and then its title, shortened to
  whole code points followed by `…`.
- Serialize with `push.encode()`, the compact UTF-8 JSON the limits are
  measured on. `json.dumps` with its defaults adds spaces and escapes, which
  can push a payload over its limit.
- Where your push library has its own options, pass the values there.
  `firebase_admin`, for example, takes `messaging.AndroidConfig(priority="high", ttl=..., collapse_key=...)`
  with `ttl` in seconds. `pywebpush` keeps the request's `TTL` header when
  you pass the `headers` and leave its `ttl` argument at 0.
- An FCM message goes to the target that the Android app registered: its
  registration `token` by default, or its `fid`, the Firebase Installation
  ID, when the app's manifest sets
  `firebase_messaging_installation_id_enabled`. `firebase_admin` sends to a
  FID from 7.5.0, with `messaging.Message(fid=...)`. From that version,
  `Message(token=...)` still sends but warns that it's deprecated.

An invalid option or event raises `PushPayloadError`. Options are checked
first. The message names the field but never contains its value.

| Code | Cause |
| --- | --- |
| `INVALID_OPTIONS` | An option has the wrong type, `title` or `body` has a lone surrogate, `now` isn't a timezone-aware `datetime`, or `bundle_id` isn't a bundle ID. |
| `INVALID_EVENT` | The event isn't a notification event under the push payload contract. |

## Management

`ConvoHopManagement` calls the Management origin's `/graphql` with an
operator access token. `actor_id` names the operator and scopes stored
recovery records.

```python
from convohop import ConvoHopManagement

with ConvoHopManagement(
    base_url=management_base,
    access_token=operator_token,
    actor_id=operator_id,
    recovery_storage=private_request_storage,
) as management:
    organization = management.create_organization(name="Local team", terms_ref=terms_ref)
```

Accepted management work returns a durable operation ID; poll it with
`get_operation`. Backend keys are delivered once through a credential
delivery, never as an ordinary result.

## Development

From the repository root, with [uv](https://docs.astral.sh/uv/):

```sh
cd python
uv sync
uv run ruff check && uv run ruff format --check
uv run mypy
uv run pytest
uv run python -m build && uv run twine check --strict dist/*
```

`src/convohop/_generated/` is generated: change the schema or
`tools/sdkgen/emitters/python.mjs` and run `npm run generate:graphql` from the
root, never edit it by hand. `npm run conformance -- --driver "python/.venv/bin/python conformance/drivers/python/driver.py"`
runs the shared conformance scenarios against the mock authority.
