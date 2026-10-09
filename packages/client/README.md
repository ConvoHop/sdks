# ConvoHop client SDK

`@convohop/client` is the TypeScript/ESM SDK for the current Conversation,
LiveSession and Participation API. It runs on end-user devices with a
short-lived session for one signed-in user, which your backend issues. It
never holds a backend key. No hosted service is included. It isn't on a
package registry yet:
[install it from a GitHub Release](https://github.com/ConvoHop/sdks#install-a-release).
License: [Apache-2.0](LICENSE).

Build and test from the repository's root npm workspace with Node.js 22+:

```sh
npm ci
npm run build
npm test --workspace @convohop/client
```

## Runtimes and entry point

- `@convohop/client` is ESM with bundled TypeScript declarations and two
  entry points: `@convohop/client` and `@convohop/client/push`, a
  dependency-free module for service workers. Neither has import side
  effects, so bundlers can tree-shake unused exports.
- It re-exports the public API of `@convohop/core`, such as `ConvoHopProblem`,
  `ConvoHopTransport`, `operationCatalog` and the generated `GraphqlTypes` types. Import
  them from `@convohop/client`, not from `@convohop/core`.
- **Browsers:** targets the current and previous major versions of Chrome,
  Edge, Firefox and Safari. Calls need WebRTC and use `livekit-client`. CI
  runs the unit tests on Node.js with fake network and media APIs. It runs
  the conversation store and outbox over real HTTP and WebSocket against the
  [conformance mock](../../spec/conformance/targets.md) on Node.js and in
  Playwright's headless Chromium, Firefox and WebKit, and the push service
  worker in Chromium. Calls aren't tested over real WebRTC.
- **React Native:** intended, but not verified yet. Pass a `platform`
  option with what the JavaScript engine lacks, such as `randomUUID`,
  `sha256`, a WHATWG-conforming `URL`, `connectivity` and `lifecycle`. Metro
  resolves package `exports` by default from React Native 0.79; on earlier
  versions, set `resolver.unstable_enablePackageExports = true`. Calls
  connect through `participation.connectWith` and LiveKit's React Native SDK.
- **Node.js 22+:** builds and unit tests. Use
  [`@convohop/server`](../server/README.md) for backend code.

## Chat and replay

Your authenticated backend returns a scoped user bootstrap, never its backend
or operator credentials. IDs are canonical nonzero UUIDs; SQL counters are
decimal strings. Configure an HTTPS origin, or explicit loopback HTTP for
local development. HTTP and `graphql-transport-ws` use unversioned `/graphql`.

```ts
import { ConvoHopClient } from "@convohop/client";

const client = new ConvoHopClient({
  baseUrl: bootstrap.baseUrl,
  projectId: bootstrap.projectId,
  incarnation: bootstrap.session.incarnation,
  principalId: bootstrap.session.principalId,
  sessionToken: bootstrap.sessionToken,
  recoveryStorage: localStorage,
});
await client.initialize();
const thread = client.conversation(conversationId); // Synchronous handle.
const stream = await client.watch(conversationId, applyCurrentEvents, showError);
const sent = await thread.messages.send(
  { text: "Hello", props: {} }, { requestId: ids.text },
);
// A sent receipt proves the authority commit, not remote delivery.
```

`getConversation(id)` reads a snapshot. `messages(id, beforeSequence?, limit?)`
pages history in descending creation order, and `getMessage(id, messageId)`
reads one message's current revision. `members(id)`, `receipts(id)` and
`inbox()` page members, every member's receipt and the user's
conversations; an incomplete inbox page without a cursor carries
`partialReason`. Page sizes are 1 to 100 (default 100); other sizes reject
before any request. `edit(message, text)` and `delete(message)` use the
expected revision. Search hits contain `{conversationId, message}`.
`reportRead` and `reportDelivered` bind current membership/visibility epochs,
record device coverage, not human-read attestation, and return the user's
current receipt. `capabilities()` reports the project's features and limits.
`conversation(id).mute.set({ muted, until })` mutes this user's message push
notifications for the conversation, optionally until a future RFC 3339 time,
and `mute.get()` reads it. Calls still ring a muted member.

`watch` catches up with an authority-issued cursor, applies ordered event
pages and persists the frontier only after the application callback succeeds.
It does not silently reset invalid/ahead/expired cursors. Catch-up runs in
bounded rounds of at most ten pages: `watch` resolves after the first round,
then the stream paces further rounds until the authority reports the replay
complete and only then subscribes at the applied frontier. Later round
failures reach `onError`; an incomplete page that does not advance the
frontier closes the stream. An explicit `stream.reconcile()` runs one bounded
round and rejects with a work-limit error while more history remains; call it
again to continue. At most four pushed pages may await application work;
overflow and reconnect resume at the applied frontier.
Close the stream on view teardown. Expiry/revocation closes the stream;
session renewal belongs to your authenticated backend.

After an explicit user choice to recover an expired/ahead replay position,
invalidate the displayed history cache and call
`client.resyncAuthorizedHistory(id, apply, onError)`. This closes that client's
old conversation watchers and waits for in-flight application callbacks to
settle before revalidating the route and current conversation membership.
Overlapping resync actions retain this retirement barrier; an older callback
cannot finish after the new snapshot is reported ready. A failed old callback
rejects resync rather than applying a fresh snapshot over unsettled work.
Resync then obtains bounded authorized history without the old cursor.
Replace the displayed snapshot in `apply`; only a successfully applied
server-issued frontier replaces the saved cursor. On authorization/application
failure the saved cursor remains rejected, not silently discarded by ordinary
`watch`. Other conversation/project watchers, mutation recovery identities and
media participation are not reset. There is no ignore-expiry configuration.

HTTP/WSS credentials never follow a route to another origin. Recovery storage
contains original application inputs, including possible message text; use
a trusted profile/origin, not shared public-machine storage. Tokens and native
grants are not stored there.

## Conversation store, offline sends and typing

```ts
import { ConversationStore, Outbox, TypingIndicator } from "@convohop/client";

const outbox = new Outbox(client, { persist: true }); // One per client.
const store = new ConversationStore(client, conversationId, { outbox, onError: report });
const unsubscribe = store.subscribe(() => render(store.snapshot));
await store.open(); // Loads, then follows the conversation.

const entry = store.send("Hello"); // In snapshot.pending at once.
await store.loadOlder(); // Earlier history, page by page.
await store.markRead(); // Reports once per newest loaded message.

const typing = new TypingIndicator(client, conversationId,
  { enabled: (await client.capabilities()).features?.typing === true });
draft.addEventListener("input", () => typing.input());

unsubscribe(); typing.dispose(); store.close(); await outbox.close(); // Teardown.
```

`ConversationStore` keeps one conversation's messages (oldest first), each
member's receipts and the user's unsent messages current from the
authorized event stream. Its `snapshot` is frozen and replaced on every
change, and unchanged lists keep their identity, so it suits
`useSyncExternalStore` or any other subscription. New messages, edits and
deletions are read back from the authority, so the store shows the
authority's revision, never one it guessed. A dropped realtime connection
reconnects on its own and catches up from the applied position. If the
stream closes as `UNAUTHENTICATED` and `sessionRefresh` is configured, the
store refreshes the session once and follows the conversation again. Status
`error` with `resyncRequired` means the saved replay position is no longer
valid; only an explicit `resync()` recovers. Keep one store per
conversation and client.

`Outbox` sends optimistically and in order per conversation. An entry keeps
one request ID, payload and the transport's retry budget from `queued`
through `sending` and `unknown` until it is `sent` or `failed`, so offline
periods, rate limits and lost responses never duplicate a message. It
waits while the browser is offline (pass `connectivity` on React Native),
honors `retryAfter`, and recovers an uncertain send with the read-only
resolution before resending only what the authority never observed.
`failed` is final: `resend(requestId)` sends the text again as a new
message, and `unconfirmed` warns that the old one may have arrived.
`persist: true` keeps unsent messages, including their text, in the client's
`recoveryStorage` across reloads; restored sends that may have been
submitted are recovered, never sent as new. It is off by default. Each tab's
outbox saves separately, coordinated through Web Locks, and when a tab
closes or reloads, another tab's outbox takes over what it left unsent. A
message that tab may already have sent is recovered from the recovery record
it saved, within the original retry budget, never sent as new.
`close()` resolves once the outbox and the sends it started have stopped
writing, so on sign-out, await it before clearing that storage. Requests
still running elsewhere on the client save their recovery records when they
settle, so wait for those too.

`TypingIndicator` sends throttled, ephemeral `typing` signals (at most one
per `intervalMs`, stopping after `idleMs`). Signals are never retried, and
the indicator turns itself off when the project reports
`FEATURE_UNSUPPORTED`. Other members' typing and presence aren't delivered
to clients yet.

## Push notifications

The authority never sends pushes. Your backend builds them from its
notification webhooks, with the payload in
[`spec/push-payload/`](../../spec/push-payload/), and sends them to the
subscriptions your app registers with it. `@convohop/client/push` has no
dependencies, so service workers can import it.

```ts
// App, from a user gesture:
import { subscribePush } from "@convohop/client/push";
const registration = await navigator.serviceWorker.register("/sw.js", { type: "module" });
await subscribePush(registration, { applicationServerKey: vapidPublicKey,
  register: subscription => saveWithYourBackend(subscription) });

// sw.js:
import { handleNotificationClick, handlePushEvent } from "@convohop/client/push";
self.addEventListener("push", event => handlePushEvent(self.registration, event));
self.addEventListener("notificationclick", event => handleNotificationClick(self.clients, event,
  notification => `/conversations/${notification.conversationId}`));
```

`handleNotification(payload)` validates a Web Push, APNs or FCM payload and
decides what to present: `message`, `ring`, `stopRinging` or `missedCall`,
with a stable `tag` and a `duplicate` flag. It recognizes repeated events and
a cancellation that arrives before its ring, for as long as the service
worker runs. `handlePushEvent` shows a notification for every push, because
browsers expect one; duplicates and stopped rings replace the earlier
notification silently. Pass `render` for your own text; the default
fallback titles are English. `handleNotificationClick` resolves your URL
against the service worker's location, then focuses a window already showing
it or opens one; a URL on another origin is refused. `unsubscribePush` lets
your backend forget the subscription before unsubscribing.

## Explicit live phases

```ts
const start = await thread.live.startVideo({ requestId: ids.start });
const live = await start.ready(); // Native preparation, not joining/capture.
const participation = await live.join({ requestId: ids.join });
let connection = await participation.connect({
  localVideo,
  onTrack: ({ element }) => remoteTracks.append(element),
  onTrackRemoved: ({ element }) => element.remove(),
  onDisconnected: showDisconnected,
  onAudioPlaybackBlocked: showEnableAudioButton,
}); // Receive-only.
await connection.microphone(true);
await connection.camera(true); // Optional later action in AUDIO_VIDEO.
await live.alerts.send([bobPrincipalId], { requestId: ids.alert });

const current = await thread.live.current(); // LiveSessionHandle | null.
// Any current member may discover/join; an alert is not an invitation.
connection = await connection.reconnect(); // Same P, capture-off.
await connection.microphone(true);
const stats = await connection.stats(); // Actual inbound tracks/bytes/frames.

await participation.leave({ requestId: ids.leave }); // Inspect mediaCutoff.
const ending = await live.end({ requestId: ids.end });
await ending.completed(); // Proven cutoff, not just accepted intent.
```

`startVoice()` fixes the AUDIO_ONLY source ceiling. `startVideo()` permits
camera later without starting capture. `startBroadcast({mediaProfile:
"AUDIO_VIDEO"})` requires independently backend-granted `canStartBroadcast`.
The creator is the sole publisher; viewers join/connect receive-only and
retain normal chat. Both SDK controls and native final writers enforce
source rights. Membership capacity and finite qualified media capacity are
separate.

A capture denial retains the returned connection/participation. A failed
native connect retains its reservation: explicitly retry or leave. Unknown
admission resolves before another credential attempt; it never reuses a
spent `connectToken`, extends the original expiry or silently recaptures. An
unresolved native outcome yields `RESOLUTION_REQUIRED`. `disconnect()`
closes local transport only, not durable participation or proven cutoff.
Use `connection.enableAudio()` from a gesture when autoplay is blocked.
After a network interruption LiveKit may resume the same native connection
(`onResuming`, then `onResumed`); a resume that comes back as another
participant ends the connection with `onDisconnected`.

Start and end have distinct durable operation IDs and original completion
snapshots. Handles also expose `get()`, `participants({limit,cursor})`,
conversation `live.history(...)`, and `client.liveAlerts.list(...)`.
`client.liveSession(id)` reads an authorized handle after recovery.
Roster/history/alert cursors are opaque and epoch-bound.

## Typed recovery and low-level operations

`client.requests.resolve(id)` is read-only and returns the generated typed
receipt. `client.requests.retry(id)` resolves first and can resend only an
unobserved original command inside its unchanged three-attempt/60-second
budget. `recoverPending(showError)` runs that bounded recovery on startup or
foreground. Never replace an uncertain command with a new UUID. Native-use
markers survive reconstruction without persisting the grant.

Failures are `ConvoHopProblem` errors. `retryAfter` is the number of whole seconds
the authority asks you to wait before resending, for example with
`RATE_LIMITED`. It comes from the error's `retryAfter` extension, or else
from an HTTP `Retry-After` header given in seconds. It is `undefined` when
the authority gives no delay, and the SDK never waits or resends because of
it. `ScopeRequiredProblem` is re-exported for completeness, but user
sessions never get it: only backend keys have scopes.

Browser `ConvoHopClient` keeps its existing synchronous `recoveryStorage`
(`sessionStorage` or `localStorage`) for request recovery and replay cursors.
For trusted database-backed use, `ConvoHopTransport` separately exports
`AsyncRecoveryStorage` and accepts optional `asyncRecoveryStorage`.
Do not pass a Promise-returning adapter as synchronous storage. Explicit
`await transport.initializeRecovery()` loads its journal once; `execute` and
`retry` also await initialization and durable writes. Until that restore
succeeds, synchronous `recoveryStates` throws instead of reporting empty.
The [Server SDK storage contract](../server/README.md#asynchronous-database-recovery-storage)
describes failure custody, durable commit and cross-process writer ownership.

Clients of one user that share `recoveryStorage`, such as the user's tabs,
share one journal, `convohop.requests:<projectId>:<principalId>`. Each save
reads it and merges in that client's records request by request, so tabs
keep each other's records, and `client.requests.retry(id)` can continue a
request another tab saved. The journal holds at most 128 records. Settled
records go first. Creating a request then fails rather than drop another
tab's unresolved one, while any other save drops another tab's oldest
unresolved ones, so a tab's own records always fit. Records this SDK can't
read, such as a newer SDK's, stay as saved, and so do fields it doesn't know.
Until its first attempt is saved, a request gives way to another saved under
the same ID and fails with `IDEMPOTENCY_CONFLICT`. Saves aren't atomic across
tabs: when two tabs save at the same moment, one can drop the other's latest
change until that tab saves again. A journal that can't be parsed is never
replaced: saves fail until it's repaired or removed.

The low-level surface is
`client.http.execute("communication.operation", projectId, input, requestId)`.
It accepts generated operation keys and exact inputs, not REST paths or
revision aliases. Responses retain declared nullable fields and typed
`receipt.result`, with no result-shape inference. HTTP 200 GraphQL errors or
malformed metadata cannot become successful mutation evidence.
`operationCatalog`, `OperationTypes`, `OperationInput`, `OperationPayload` and
the `GraphqlTypes` namespace are generated/aligned exports. Schema files are
authority exports; `npm run check:graphql` detects document/type drift.

## Session credential lifetime

Optional, awaited in-place refresh uses the compatible authority's read-only
`currentSession(context: RequestContextInput!): CurrentSessionReply!`.
Its `result: Session!` contains existing session metadata only, for the
authenticated current ClientSession. Backend/portal credentials and
caller-selected session identities are not supported. Project/incarnation
and serving-epoch binding are enforced through the authenticated request
context; `Session` itself has no project field. This self-session capability
was introduced at authority revision `fa847a72e93c0f30c8ee5b741621e677e1c6bedf`.
The current export at `ce86e4bb6d23dbbe73ae99d70b2d44e9d2a0570c` adds the
separate backend-only session-outcome read without changing that capability.

```ts
import {
  ConvoHopClient, type SessionMetadata, type SessionBootstrap,
} from "@convohop/client";

const client = new ConvoHopClient({
  baseUrl: bootstrap.baseUrl,
  projectId: bootstrap.projectId,
  incarnation: bootstrap.session.incarnation,
  principalId: bootstrap.session.principalId,
  sessionToken: bootstrap.sessionToken,
  recoveryStorage: localStorage,
  sessionRefresh: (current: Readonly<SessionMetadata>): Promise<SessionBootstrap> =>
    renewThroughAuthenticatedApplicationBackend(current),
});
await client.initialize(); // Proves ORIGINAL binding while its bearer is valid.
const renewed: SessionMetadata = await client.refreshSession();
```

`SessionMetadata`, `SessionRefresh` and `SessionRefreshState` are exported.
`SessionBootstrap` is the same generated bootstrap type also exported by
the Server SDK. Initialization obtains the original authority binding once
only when `sessionRefresh` is configured. Without that hook, constructors
and ordinary initialization keep their existing behavior and never require
`currentSession`. Legacy providers lacking this capability support that
unchanged path, not in-place refresh; enabling the hook against them fails
explicitly rather than accepting asserted bootstrap fields or decoded JWTs.

**Renew inside the hook, not before calling `refreshSession()`.** The SDK
first pauses its managed realtime streams, waits for application callbacks,
and drains already-started HTTP work with its original authentication.
Only then does it invoke the hook once with cloned, credential-free verified
metadata. Your authenticated backend must bind the account/device/project,
check the expected revision, enforce CSRF protection where applicable, and
retain the original SQL renewal request/outcome for uncertain retries.
The hook uses that backend's endpoint, never a backend key in the browser,
and must bound its own I/O. Do not await this same client from the hook or
call refresh from a replay application callback: either can await its own
retirement/admission barrier. `refreshSession()` itself never retries, and
concurrent explicit refresh calls share the same work.

`client.scheduleSessionRefresh({ leadMs, onRefreshed, onError })` is the
opt-in timer: it renews `leadMs` (default 60 s) before the verified expiry,
but never earlier than halfway through the remaining lifetime, then again
after each renewal, until you call the function it returns. A renewal that
fails while the current session is still verified retries with backoff
before expiry; any other failure stops the schedule. An initialization that
failed with a transport error, 429 or 503 is retried, honoring
`retryAfter`. Every failure reaches `onError`.

Before replacement, the SDK probes the candidate through generated queries
at the fixed trusted origin and checks the original session, principal,
device, project and incarnation. Revision and effective expiry must
strictly increase, and bootstrap session metadata and `tokenExpiresAt` must
match the live authority projection. Counters stay canonical decimal
strings. `tokenExpiresAt` equals `Session.expiresAt`, but the authority also
enforces a signed integer-second JWT expiry without leeway: effective
bearer expiry is `Math.floor(Date.parse(expiresAt) / 1000) * 1000`, up to
999 ms earlier than the displayed millisecond deadline. Renew before that
boundary; this API does not resurrect an already-expired enrollment.

Successful replacement retains the original transport, storage namespace,
request IDs/inputs/fingerprints/budgets, handles and spent native markers.
Already-applied replay work advances its original frontier before renewal;
queued old pages and stale socket/reconnect callbacks cannot advance it
after replacement. The same managed replay resumes from its applied cursor
under the verified credential, without resetting history or automatically
retrying uncertain mutations. New `watch`/resync admission during the
quiescence rejects with `SESSION_REFRESH_REQUIRED`; retry after the awaited
refresh. Manually constructed low-level realtime instances remain
caller-managed. Socket creation is not a server acknowledgement or hosted
transport qualification.

`client.sessionBinding` is a cloned, credential-free **last verified**
projection, not continuous proof of authorization.
`client.sessionRefreshState` reports `disabled`, `uninitialized`, `ready`,
`refreshing` or `blocked`. A hook rejection can happen after server renewal
committed. On hook/probe failure, the SDK resumes old HTTP/realtime admission
only if an authenticated old-bearer query proves the unchanged original
binding/revision/deadline still live. A known renewed old bearer is never a
fallback. Otherwise `SESSION_REFRESH_UNVERIFIED` leaves admission blocked,
and ordinary calls reject `SESSION_REFRESH_REQUIRED` without network or
new mutation intent. Explicit retry must retrieve the original backend
renewal outcome, not invent another renewal ID. Hook failures use the
credential-free `SESSION_REFRESH_FAILED` error; invalid replacements are
rejected, and old callback failures prevent renewal.

A candidate can be verified and installed before replay restoration fails.
That failure still rejects refresh and reaches the stream's error callback;
the new `sessionBinding` remains inspectable. An expired/rejected cursor is
not reset: use the explicit authorized-history resync flow. After expiry or
an unrecoverable blocked renewal, retire old replay callbacks, settle
outstanding requests and explicitly bootstrap a new client with original
recovery storage. Keep unknown commands and finite budgets; reacquire
authorized live handles rather than pretending reconstruction rebinds them.

Refresh never reconnects native media, requests another grant, changes a
native deadline, replays spent admission or restores capture. Existing
native continuity remains subject to the service's normal current-session
and finite-lease checks, including cutoff during a stalled drain/hook/proof.
An expired lease or disconnected native connection is not revived by a
browser bearer replacement. Any explicitly chosen new native connection
requires fresh admission and starts receive-only. SDK framework regressions
do not qualify actual SQL, native forwarding or a deployed service.

## Network fallback and limits

`participation.connect({iceTransportPolicy: "relay"})` requests maintained
WebRTC relay-only policy; default is `"all"`. It still requires current
native admission/membership and the authority's authenticated TURN service.
Never supply a permanent relay secret. `stats().transports` includes
candidate types, protocol and optional relayProtocol, without credentials,
addresses or URLs. TURN/TLS evidence requires a relay candidate and
`relayProtocol === "tls"`; direct ICE TCP reports `protocol === "tcp"`.

The service requires the participation-aware ConvoHop media server (SFU),
not a stock LiveKit server. This package connects through the official
`livekit-client`, as in
[Calls with the official LiveKit SDKs](../../docs/sdk-strategy.md#calls-with-the-official-livekit-sdks):
each connection takes a fresh `liveSessionCredentials` grant (`INITIAL`, or
`RECONNECT` naming the connection it replaces) and makes one attempt with
its single-use, 60-second `connectToken`, sent only to the grant's
`livekitUrl` and never logged or stored. LiveKit resumes only with that token
or one the media server pushes; a cached token never opens a new connection.
A server boot change ends the old
occurrence after durable recovery; explicitly start/join a new occurrence.
No transparent cross-boot continuity, invitation-only compatibility API,
HLS, Egress, recording, screen-share, host transfer or offline ringing is
provided. Unit tests do not qualify real media or a hosted deployment.
