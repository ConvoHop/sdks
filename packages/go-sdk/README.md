# Threadwave Go SDK (source package)

`github.com/ConvoHop/sdks/packages/go-sdk` is a standalone Go 1.22+ module
(package `threadwave`) with no third-party dependencies. All customer-facing
operations use GraphQL, **not** a versioned REST API.

The ConvoHop repository retains the existing Go package name `threadwave`.
No module version or hosted service has been released.

| Client | Credential | Endpoint | Purpose |
|---|---|---|---|
| `ManagementClient` | `adm_` | Management `POST /graphql` | Create, list, and suspend projects |
| `ProjectClient` | `pk_` | Communication `POST /graphql` | Register project-scoped identities, then issue their short-lived sessions |
| `UserClient` | `st_` | Communication `POST /graphql` | Thread, message, call, and media operations |

Keep `adm_` and `pk_` credentials on trusted servers, never in an app binary,
browser, URL, or log. A project key can mint tokens for **any registered
identity** in its project, so authenticate your own user before
`CreateIdentity` and `MintIdentityToken`. Persist a non-nil request UUID per app user and store
the resulting `ci_` identity ID with that authenticated account; retries with
the same request UUID return the same identity. Do not accept an unverified
identity ID from the client as login proof. Store the one-time key returned
by `CreateProject` securely. Tokens expire after
15 minutes; `UserClient` never stores a project key or automatically refreshes
a token. Constructors reject the wrong token prefix, disable redirects even
on a supplied HTTP client, and require HTTPS except for loopback origins.

The server returns domain errors in `errors[].extensions.code` even when
GraphQL responds with HTTP 200; `errors.As` with a `*threadwave.APIError` exposes
`StatusCode` (200), uppercase `Code` (e.g. `NOT_FOUND`, `CONFLICT`), and
`Message`. Invalid/missing bearer credentials can instead produce an HTTP
401 JSON error with lowercase `Code` (`unauthenticated`). Both kinds of error
stop the operation; partially populated GraphQL `data` is never accepted as
success. All sequence and cursor values are **decimal strings on the wire**
and exact `int64` values in the Go API, without `float64` conversion.

## Build and test from source

From the repository root:

```sh
cd packages/go-sdk
go test ./...
go vet ./...
```

To run `go run ./examples/local`, separately provide compatible Communication
and Management services and set `COMMS_API_URL`, `COMMS_MANAGEMENT_URL`, and
`COMMS_ADMIN_TOKEN` in your environment. The example creates and suspends a
demo project, registers an identity, mints its session token, creates a
thread, sends a message with JSON props, and reads its event. It prints IDs
and sequences, **not** secrets. Set `COMMS_DEMO_MEDIA=1` only if your service
supports audio calls. The opt-in live test likewise requires those two
origins and `COMMS_LIVE_ADMIN_TOKEN` explicitly. With compatible media and
Management services running, use:

```sh
go test -run TestLocalIncomingCallAPI -count=1 -v .
```

## API surface

Every operation accepts `context.Context`. Pass `WithHTTPClient(client)`
to use a custom transport or timeout; redirects remain disabled.

- `ManagementClient.CreateProject`, `ListProjects`, `SuspendProject`:
  provision and administer projects on the **Management** origin. Project
  listings have a UUID `NextAfter`; the project key is returned **only**
  during creation.
- `ProjectClient.CreateIdentity`, `MintIdentityToken`: the `pk_` operations;
  register a stable project-scoped identity and mint a short-lived `st_`
  token on your server after authenticating the app user.
- `UserClient.CreateThread`, `GetThread`, `ListThreads`,
  `ListThreadInvitations`, `ListThreadMembers`, `InviteThreadMember`,
  `AcceptThreadInvitation`, `LeaveThread`, `RemoveThreadMember`,
  `ChangeThreadRole`, `TransferThreadOwner`, `ArchiveThread`,
  `ReopenThread`: invitation-based membership, typed roles and states,
  configurable `since_join`/`all_existing` and
  `revoke`/`previously_visible` history policies. Invitees accept before
  gaining thread history or joining calls.
- `UserClient.SendMessage`, `ListThreadMessages`, `ListThreadEvents`,
  `ConsumeThreadEvents`, `RevokeSession`: durable messages with optional
  JSON-object `Props`, event replay (including membership and call events),
  callback-safe polling, and token revocation. `ListMessages`, `ListEvents`,
  and `ConsumeEvents` are convenience aliases for the thread methods; they
  use **the same GraphQL operations**, not REST. Generate a
  `SendMessageRequest.ClientMessageID` with `NewMessageID` once, then reuse
  that ID with the **same body and props** on a retry. A successful send means
  committed, not delivered or read.
- `UserClient.CreateCall`, `CreateBroadcast`, `GetMedia`, `StartMedia`,
  `StopMedia`, `ListMediaMembers`, `SetMediaMember`, `RemoveMediaMember`,
  `JoinMedia`, `ListMediaParticipants`, `RemoveMediaParticipant`,
  `MuteMediaParticipant`, `DeclineCall`: a call **requires** a `ThreadID` and
  `Mode` (`CallAudio` or `CallVideo`); a broadcast has neither. A live call
  means its room exists, not that a participant has connected. A broadcast
  may remain `starting` until `GetMedia` reports `live`. `JoinMedia` issues a
  short-lived LiveKit grant; publishing actual tracks requires a LiveKit
  client, and `MediaParticipant.Connected` is the connection snapshot.
- `UserClient.ListIncomingCalls`, `ListCallEvents`, `SyncIncomingCalls`,
  `ConsumeCallEvents`: current recipient invitations, durable call changes,
  and cursor-safe polling. `CallInfo` includes its thread and audio/video
  mode; `CallEvent.Call` can be nil after a decline or revocation.

The service-issued `Identity.ID` identifies a caller within its project;
each accepted thread join has a new `ThreadMember.MembershipID`, and each
call-device join gets a `MediaJoin.ParticipantID`. None of those three IDs is
your app's user ID or an authentication credential.

### Authenticated HLS

`GetHLSAsset(ctx, id, "master.m3u8")` is the **one native HTTP operation**:
`GET /media/{id}/hls/{name}` with the `st_` bearer header. Close the returned
`HLSAsset.Body`. Fetch every referenced `variant_*/playlist.m3u8` and
`variant_*/segment_000001.ts` through this method too. Players that cannot
attach bearer headers to **every** playlist/segment request cannot use these
assets directly; there is no public static fallback.

## Reliable receive and real-time signaling

The Go SDK deliberately uses authenticated **GraphQL HTTP polling**, avoiding
a WebSocket dependency. `ConsumeThreadEvents` and `ConsumeCallEvents` fetch
pages in order, honor `HasMore` even on sparse or empty call-event pages,
and advance the returned cursor **only after** each callback succeeds.
Thread events may also skip sequence numbers when history visibility hides
events; do not treat a gap as corruption. Persist the callback's side effect
and cursor together, or make callbacks idempotent: replay is **at least
once**, not exactly once. A failed callback, network error, or expired token
returns the last safe cursor. The default caught-up poll interval is one
second; configure `PollInterval` to trade latency for load.

For an initial incoming-call state, `SyncIncomingCalls` follows `HasMore`
across invitation pages and replays changes from the **first** snapshot
page's `Cursor`, reconciling by call ID and sequence. Its `NextAfter` is the
starting cursor for `ConsumeCallEvents`. Recipient call-event sequences are
sparse project-wide values; `NextAfter` can pass the last visible event.
Old invitations may become invisible after membership removal. Neither
polling nor the GraphQL subscription provides offline push notifications.

The server also offers `graphql-transport-ws` at `GET /graphql`. A WebSocket
client must send `{"type":"connection_init","payload":{"token":"st_..."}}`
**first**, wait for `connection_ack`, then send a `subscribe` frame with a
GraphQL subscription `query` and `variables`, for example:

```json
{"id":"thread-feed","type":"subscribe","payload":{"query":"subscription ($id: ID!, $after: String) { threadEvents(threadId: $id, after: $after) { eventId sequence kind } }","variables":{"id":"<thread UUID>","after":"0"}}}
```

`callEvents(after: $after)` is also subscribable. Never put a bearer token in a
WebSocket URL. The Go SDK does not open this socket; use a compatible
WebSocket library separately if lower-latency notification is required, and
retain cursor-based replay for recovery after disconnects. After a token
expires, mint a new one on your trusted server and resume with the last
acknowledged cursor.
