# ConvoHop Python SDK

Async, typed Python 3.9+ clients for the Communication and separate Management
**GraphQL** APIs. The distribution is named `convohop-sdk` (import `convohop`).
It has not been published to PyPI: install directly from this source tree
with `python3 -m pip install -e ./packages/python-sdk` from the repository
root. Its source is licensed under the
[Apache License, Version 2.0](../../LICENSE); no hosted service is included.
The only runtime dependencies are `httpx` and `websockets`. This prototype has
no REST compatibility layer or versioned endpoint.

No services are included here. For live use, supply `COMMS_API_URL` and
`COMMS_MANAGEMENT_URL` from your separately operated compatible services.
Unit tests use mock transports and do not require service credentials.

## Credentials and threads

Use a `pk_` project key **only on your server** to register a `ci_` identity
and issue its `st_` session; the key cannot read threads, start calls, or
provision projects. User operations
send `Authorization: Bearer st_...` to the Communication service's `/graphql`.
Never send the project key to a user device.

```python
import asyncio
import os
from uuid import UUID, uuid4

from convohop import ServerProjectClient, UserClient


async def main():
    base = os.environ["COMMS_API_URL"]
    request_id = UUID(os.environ["CONVOHOP_ACCOUNT_REQUEST_ID"])
    teammate_identity_id = os.environ["CONVOHOP_TEAMMATE_ID"]
    another_identity_id = os.environ["CONVOHOP_OTHER_ID"]
    async with ServerProjectClient(base, os.environ["COMMS_PROJECT_KEY"]) as project:
        # Persist this UUID with the authenticated app account before the call.
        identity = await project.create_identity(request_id)
        # Store identity.id with the app account; reuse it on later logins.
        session = await project.issue_identity_token(identity.id)

    async with UserClient(base, session.token) as user:
        thread = await user.create_thread(
            "Team",
            members=[teammate_identity_id],
            history_on_join="all_existing",
            history_after_leave="previously_visible",
        )
        await user.invite_thread_member(thread.id, another_identity_id)
        message_id = uuid4()
        await user.send_message(
            thread.id,
            "Hello",
            client_message_id=message_id,
            props={"ticket": {"number": 42}},
        )
        page = await user.thread_messages(thread.id, after=0)
        print(page.items, page.next_after, page.cursor, page.has_more)

        async with user.subscribe_thread_events(
            thread.id, after=page.cursor
        ) as stream:
            async for event in stream:
                print(event.sequence, event.kind, event.message, event.actor)
                break


asyncio.run(main())
```

The teammate IDs above are already-registered identities looked up by your
backend for authenticated app accounts; they are not arbitrary user names.

Reuse the same `client_message_id`, body, and props when retrying an uncertain
send. The server returns the same message for an identical retry, and a typed
`CONFLICT` error if its contents differ. `ThreadMessage.props` is a JSON object.
Thread history policies are `since_join` / `all_existing` on join and
`revoke` / `previously_visible` after a member leaves or is removed.

`thread()`, `threads(after=UUID, limit=50)`, `thread_invitations()`, and
`thread_members()` read the thread and membership model. Membership mutations
are `invite_thread_member()`, `accept_thread_invitation()`, `leave_thread()`,
`remove_thread_member()`, `change_thread_role()`, `transfer_thread_owner()`,
`archive_thread()`, and `reopen_thread()`. `thread_messages()` and
`thread_events()` return `TimelinePage` values with `items`, `next_after`,
`cursor`, and `has_more`. Thread events can represent messages, membership,
and call activity: their `message`, `identity_id`, and `call_id` fields may be
`None`. Wire sequences and cursors are **decimal strings**, converted to
Python `int` without the 53-bit JavaScript precision limit. Send `next_after`
on subsequent pages; it can advance through filtered events even when a page
has no items. Limits are 1–100.

## Realtime and incoming calls

`subscribe_thread_events()` and `subscribe_call_events()` use
**graphql-transport-ws** at `/graphql` (`wss://` for HTTPS). The first text frame
is `{"type":"connection_init","payload":{"token":"st_..."}}`; the credential is
never included in a WebSocket URL. After `connection_ack`, each stream sends a
GraphQL `subscribe` query and variables with a decimal-string `after` cursor.
Server-side auth is rechecked while the stream runs. GraphQL `error` frames and
`next.payload.errors` raise `APIError` rather than disappearing into a retry.

Both streams reconnect after transport disconnects, replay accessible durable
events through `/graphql`, and suppress duplicate events. Their `.after` cursor
advances **only when the consumer requests the next event**; if processing
fails, the last yielded item remains eligible for redelivery. Use `async with`
or `await stream.aclose()`; cancellation and closing `UserClient` close sockets.
After five unsuccessful reconnects (default), a transport failure raises;
`max_retries=None` opts into indefinite transport retries. Subscriptions do
not silently switch to polling. If WebSockets are unavailable, explicitly
poll `thread_events()` or `call_events()` with each page's `next_after` and
`has_more`; polling is less timely and returns only events the session may
still see. Call-event sequences are **sparse per recipient**: a jump from 10
to 50 does not imply 39 missing events.

`incoming_calls(after=0, limit=50)` lists ringing invites, and
`call_events(after=0, limit=50)` returns `call.ringing`, `call.accepted`,
`call.declined`, `call.ended`, and `call.revoked` events. An event's `call`
details can legitimately be `None` (for example after access is revoked).
`CallDetails` includes `thread_id` and `mode`.

For a safe snapshot-to-stream handoff, use `incoming_call_feed()`:

```python
import os

async with UserClient(os.environ["COMMS_API_URL"], session.token) as user:
    feed = await user.incoming_call_feed(limit=50)
    async with feed:
        for invitation in feed.items:
            print("Ringing:", invitation.call.id, invitation.call.thread_id)
        async for event in feed:
            print(event.kind, event.call_id, feed.items)
            if event.kind == "call.ringing":
                await user.decline_call(event.call_id)
```

The feed fetches **all** snapshot pages, retains the **first page's** `cursor`
for the subscription, and merges overlapping pages/events by call ID and
sequence. `feed.items` contains currently ringing calls; accepted, declined,
ended, or revoked events remove them. `feed.after` reports the event cursor
acknowledged by requesting the next event. `call.accepted` means a join grant
was issued, not that a device connected to LiveKit.

## Calls, broadcasts, and authorized HLS

```python
import os

async with UserClient(os.environ["COMMS_API_URL"], session.token) as user:
    call = await user.create_call(thread.id, "Support", "audio", publishers=[teammate_identity_id])
    assert call.thread_id == thread.id and call.mode == "audio"
    await user.start_media(call.id)
    grant = await user.join_media(call.id)
    # Give grant.server_url and grant.token to a LiveKit client.
    # To renew: await user.join_media(call.id, renew_participant_id=grant.participant_id)
    await user.stop_media(call.id)

    broadcast = await user.create_broadcast(
        "Town hall", publishers=[teammate_identity_id], audience="project"
    )
    await user.start_media(broadcast.id)
    # A broadcast may remain "starting"; poll media_session() until "live".
    master = user.playback_request(broadcast.id)
    variant = master.for_asset("variant_hi/playlist.m3u8")
    segment = variant.for_asset("segment_000001.ts")
    # Pass each request's URL and headers to your native HTTP/HLS client.
```

Calls require a thread and an explicit `"audio"` or `"video"` mode. Broadcasts
have no thread or mode. `join_media()` issues a short-lived LiveKit credential,
not a media transport; connect and publish with a LiveKit client. A
project-audience broadcast viewer is not automatically a stage member.
`media_session()`, `media_members()`, `set_media_member()`,
`remove_media_member()`, `media_participants()`,
`remove_media_participant()`, and `mute_media_participant()` manage the
authorized stage. `decline_call()` declines a ringing invitation.

HLS playlists and segments are **native HTTP GETs**, not GraphQL operations,
under `/media/{id}/hls/{name}`. Attach each `PlaybackRequest.headers`
(`Authorization: Bearer st_...`) to **every** asset request; a native HLS
player unable to set request headers is unsupported. The helpers reject
external, absolute, traversing, or unexpected asset paths.

## Privileged project provisioning and failures

The Management API is a **different service** on the discovered Management
origin, with a private `adm_` bootstrap token, and also uses `/graphql`:

```python
import os
from convohop import ManagementClient

async with ManagementClient(
    os.environ["COMMS_MANAGEMENT_URL"], os.environ["COMMS_ADMIN_TOKEN"]
) as management:
    project = await management.create_project("My project")
    # Persist project.project_key in a server-side secret store now.
    page = await management.projects(limit=50)
    # When retiring it: await management.suspend_project(project.id)
```

Projects may be `provisioning`, `active`, `failed`, or `suspended`. Only
`ManagementClient` can create or suspend projects. All clients reject remote
plaintext HTTP, URL credentials, and redirects. Injected `httpx.AsyncClient`
instances remain caller-owned; the SDK still sets timeouts, auth headers, and
`follow_redirects=False`. GraphQL errors in **HTTP 200** responses raise
`APIError` with `status_code`, `code` from `errors[].extensions.code`, and
`message`; non-200 HTTP auth errors also raise `APIError`. Invalid payloads
raise `ProtocolError`, network failures `TransportError`, and timeouts
`RequestTimeout`. Credentials are hidden from token/grant reprs.

This SDK does not refresh expired 15-minute user sessions, deliver offline
push notifications, bill users, or connect to LiveKit. Mint replacement
sessions on your server. The current direct LiveKit signaling path is not
production-ready for reconnection revocation.

Each registered identity is stable within a project; an accepted thread join
receives a new `ThreadMember.membership_id`, while each call-device join
receives a separate `participant_id`. None of these IDs is your app's user ID
or proof of authentication. Provision an identity per teammate before
inviting them.

Run package tests from the repository root after installing the package:

```sh
python3 -m unittest discover -s packages/python-sdk/tests -v
```

If mypy is installed, `python3 -m mypy --strict packages/python-sdk/src`
checks the public typing. To exercise the SDK against separately provided
Communication and Management APIs, set `COMMS_API_URL`,
`COMMS_MANAGEMENT_URL`, and `COMMS_LIVE_ADMIN_TOKEN` in your environment,
then run this from the repository root:

```sh
python3 -m unittest discover -s packages/python-sdk/tests \
  -p test_live_api.py -v
```

This opt-in check provisions and then suspends a project on the provided
services. It requires explicit API and Management origins. It verifies
thread invitations, normalized JSON props and message idempotency, call
inbox/decline events, and session revocation against the GraphQL APIs; it
does not establish a WebRTC connection.
