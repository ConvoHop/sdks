# ConvoHop browser SDK

`@convohop/browser-sdk` is unpublished TypeScript/ESM source for the current
Conversation, LiveSession and Participation API. No hosted service is
included. Source license: [Apache-2.0](../../LICENSE).

Build and test from the repository's root npm workspace with Node.js 24+:

```sh
npm ci
npm run build
npm test --workspace @convohop/browser-sdk
```

## Chat and replay

Your authenticated backend returns a scoped user bootstrap, never its backend
or operator credentials. IDs are canonical nonzero UUIDs; SQL counters are
decimal strings. Configure an HTTPS origin, or explicit loopback HTTP for
local development. HTTP and `graphql-transport-ws` use unversioned `/graphql`.
`V1*` names do not select an API/schema version.

```ts
import { V1Client } from "@convohop/browser-sdk";

const client = new V1Client({
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

`getConversation(id)` reads a snapshot. `messages(id, beforeSequence?)` pages
history in descending creation order. `edit(message, text)` and
`delete(message)` use the expected revision. Search hits contain
`{conversationId, message}`. `reportRead` binds current membership/visibility
epochs and records device coverage, not human-read attestation.

`watch` catches up with an authority-issued cursor, applies ordered event
pages and persists the frontier only after the application callback succeeds.
It does not silently reset invalid/ahead/expired cursors. At most four pushed
pages may await application work; reconnect resumes at the applied frontier.
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
spent bearer, extends the original expiry or silently recaptures. An
unresolved native outcome yields `RESOLUTION_REQUIRED`. `disconnect()`
closes local transport only, not durable participation or proven cutoff.
Use `connection.enableAudio()` from a gesture when autoplay is blocked.

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

Browser `V1Client` keeps its existing synchronous `recoveryStorage`
(`sessionStorage` or `localStorage`) for request recovery and replay cursors.
For trusted database-backed use, `V1Transport` separately exports
`V1AsyncRecoveryStorage` and accepts optional `asyncRecoveryStorage`.
Do not pass a Promise-returning adapter as synchronous storage. Explicit
`await transport.initializeRecovery()` loads its journal once; `execute` and
`retry` also await initialization and durable writes. Until that restore
succeeds, synchronous `recoveryStates` throws instead of reporting empty.
The [Server SDK storage contract](../server-sdk/README.md#asynchronous-database-recovery-storage)
describes failure custody, durable commit and cross-process writer ownership.

The low-level surface is
`client.http.execute("communication.operation", projectId, input, requestId)`.
It accepts generated operation keys and exact inputs, not REST paths or
revision aliases. Responses retain declared nullable fields and typed
`receipt.result`, with no result-shape inference. HTTP 200 GraphQL errors or
malformed metadata cannot become successful mutation evidence.
`v1Operations`, `V1OperationTypes`, `OperationInput`, `OperationPayload` and
the `V1Graphql` namespace are generated/aligned exports. Schema files are
authority exports; `npm run check:graphql` detects document/type drift.

## Session credential lifetime

`V1Client`, its request transport and realtime streams retain their
constructor credentials. Existing live/participation/media handles retain
that original client. There is no supported in-place credential-refresh API;
do not patch SDK internals or substitute a backend credential.

The current public authority queries cannot prove a replacement bearer's
exact principal/device/session/revision binding. A route proof establishes
routing scope, not that session identity; a principal lookup is not a
self-session projection. Backend session-renewal receipts are not available
as a browser self-binding proof. Comparing caller-asserted bootstrap fields
or decoding an opaque token would not establish this missing authority
evidence, even when the proposed revision and expiry increase.

Obtain finite bootstraps from your authenticated backend. A renewed revision
can invalidate the old token immediately. With the existing public API,
retire old realtime work, settle outstanding request work, then reconstruct
the client with the current bootstrap and original recovery storage. Keep
unknown request IDs, payloads and budgets; never invent replacement commands.
Reacquire authorized live/participation handles through the new client
instead of claiming the old handles now use the new credential.

Session renewal does not itself prove that media must rejoin or that an old
native lease became valid again. Continuity depends on the service's normal
current-session/native-lease checks. Any explicitly chosen new native
connection still requires fresh admission and starts receive-only; it must
not reuse a spent grant, revive an expired lease or silently restore capture.

## Network fallback and limits

`participation.connect({iceTransportPolicy: "relay"})` requests maintained
WebRTC relay-only policy; default is `"all"`. It still requires current
native admission/membership and the authority's authenticated TURN service.
Never supply a permanent relay secret. `stats().transports` includes
candidate types, protocol and optional relayProtocol, without credentials,
addresses or URLs. TURN/TLS evidence requires a relay candidate and
`relayProtocol === "tls"`; direct ICE TCP reports `protocol === "tcp"`.

The service requires a participation-aware ConvoHop native SFU, not stock
LiveKit or cached-token reconnect. A server boot change ends the old
occurrence after durable recovery; explicitly start/join a new occurrence.
No transparent cross-boot continuity, invitation-only compatibility API,
HLS, Egress, recording, screen-share, host transfer or offline ringing is
provided. Unit tests do not qualify real media or a hosted deployment.
