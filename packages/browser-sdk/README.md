# ConvoHop browser SDK

`@convohop/browser-sdk` exports current GraphQL `V1Client` and native
`V1MediaConnection`, alongside the retained legacy `ConvoHopClient`.
This is **source
only**: the package has not been published and no hosted service is included.
Its source is licensed under the [Apache License, Version 2.0](../../LICENSE).

## Native v1 chat and calling

Build from the root npm workspace with Node.js 24+:

```sh
npm ci
npm run build
npm test --workspace @convohop/browser-sdk
```

Your authenticated backend returns a native session bootstrap; it must never
return its backend key or an operator credential. Native IDs are canonical
nonzero UUIDs, and SQL counters are decimal **strings**, not JavaScript
numbers. The communication origin must expose the compatible authenticated
unversioned `/graphql` HTTP/subscription service. `V1*` identifies the current
SDK/domain generation, not an API URL or schema-version selector.
The current integration is local, not a qualified hosted endpoint.

```ts
import { V1Client } from "@convohop/browser-sdk";

const client = new V1Client({
  baseUrl: bootstrap.baseUrl,
  projectId: bootstrap.projectId,
  incarnation: bootstrap.session.incarnation,
  principalId: bootstrap.session.principalId,
  sessionToken: bootstrap.sessionToken,
  recoveryStorage: localStorage, // Optional; contains application request payloads.
});
await client.initialize();
const stream = await client.watch(conversationId, async (events) => {
  await applyCurrentEvents(events); // Your idempotent application update.
}, showError);
const sent = await client.send(conversationId, "Hello", crypto.randomUUID());
// sent.status === "sent" is an authority commit receipt, not delivery.
// Close stream when the view closes, not immediately after sending.
```

`messages(id, beforeSequence?)` pages current history in descending creation
order. `edit(message, text)` and `delete(message)` compare the current
revision. `search(query, conversationIds?)` returns `V1SearchHit` items shaped
as `{conversationId, message}`, not flat messages. Use `reportRead` with
current membership/visibility epochs; it reports device coverage, not a
human-read attestation. Low-level `client.http` supports the other explicit
logical operation identifiers and page continuations without creating another
SDK. Its compatibility `/v1/...` strings are translated into checked GraphQL
documents, never sent as HTTP paths.

`watch` catches up from an authority-issued cursor before connecting,
receives ordered durable `conversationEvents` pages over `graphql-transport-ws`,
reconciles on foreground/reconnect, and persists a frontier only after
the application callback succeeds. It never silently resets an invalid,
ahead or expired cursor. HTTP/WSS credentials never follow a route to a
different origin. Without `recoveryStorage`, unresolved mutations/cursors
are in-memory only. Recovery storage contains original message payloads:
use a trusted origin/profile, not shared public-machine storage.
The socket initializes with `{token, projectId, incarnation}`. Expiry/revocation
ends the stream; a slow application is limited to four pending pages and
must resume from its last applied cursor. Queries/mutations use HTTP only.

An uncertain mutation retains its ID, payload, original 60-second budget
and at most three submissions. `client.resolve(requestId)` is read-only;
`recoverPending(showError)` only resends eligible original requests within
that budget. The same-identity state is recovered on startup/foreground.
Do not replace an unresolved request with a new UUID. A committed/accepted
result cannot regress to unknown after a later transport error. Session
renewal is your trusted backend's responsibility; the current `V1Client`
uses one bootstrap, so construct a new client/stream with a fresh session
and the same authorized recovery storage when it expires.

Calling requires a **ConvoHopAdmissionV1-capable native SFU**. Stock LiveKit,
legacy GraphQL device grants and a direct cached-token `Room.connect` are not
compatible substitutes. Start with `client.startCall(conversationId,
invitedPrincipalIds, video)`; retain its returned call ID and observe
`client.call(id)` until the room is offering/active. Do not treat preparation
or an accepted HTTP response as connected media. The initiator can then
connect; each invitee must first accept its own current invitation:

```ts
import { V1MediaConnection } from "@convohop/browser-sdk";

// In the invitee's explicit foreground accept handler:
const accepted = await client.accept(currentInvitation);
let connection = await V1MediaConnection.connect(client, accepted, {
  localVideo,
  onTrack: ({ element }) => remoteTracks.append(element),
  onTrackRemoved: ({ element }) => element.remove(),
  onDisconnected: showDisconnected,
  onAudioPlaybackBlocked: showEnableAudioButton,
});
await connection.microphone(false);
await connection.microphone(true);
// Only for a video-capable call:
// await connection.camera(false);
// A reconnect returns a new connection with fresh authority credentials:
connection = await connection.reconnect();
const stats = await connection.stats(); // Actual received bytes/tracks/frames.

// On leaving: durable authority denial plus unconditional local cleanup.
try {
  await client.leave(await client.call(accepted.callId));
} finally {
  await connection.disconnect();
}
```

Use `connection.enableAudio()` from a user gesture if autoplay is blocked.
Voice never requests a camera. Microphone/camera choices survive a fresh
authorized reconnect. `disconnect()` only cleans up the local connection;
call `client.leave` or authorized `client.end` for durable lifecycle changes.
No automatic stock cached-token reconnect is enabled. A deliberately closed
connection cannot reconnect. Expiry, revocation or lost clock confidence
must stop forwarding; native JWT lifetime is not forwarding permission.
There is no native v1 broadcast, Egress, recording, screen-share or offline
ringing implementation.

Checked operations are exported as `v1Operations`, with `V1OperationTypes`
and the `V1Graphql` type namespace. `npm run generate:graphql` uses the
maintained pinned GraphQL Code Generator; `npm run check:graphql` detects
schema/document/type drift. These artifact names do not version the public
GraphQL API. Add fields compatibly and use schema deprecations for retirement.

## Retained legacy GraphQL client

The following documentation applies **only** to `ConvoHopClient`, not the
native `V1*` classes above. This legacy client accepts an end-user `st_` session. Keep the `pk_` project
key on your authenticated backend and the `adm_` operator credential outside
customer applications. From the repository root with Node.js 24+:

```sh
npm ci
npm run build --workspace @convohop/browser-sdk
npm test --workspace @convohop/browser-sdk
```

The API origin must serve GraphQL HTTP and `graphql-transport-ws` at `/graphql`
(and authenticated `/media` if broadcast/HLS is enabled). Your backend registers each
app user once as a service-issued `ci_` identity and mints a 15-minute `st_`
session for that **authenticated** identity. An invited member must accept the
thread invitation before they can chat or join its calls.

```ts
import { ConvoHopClient } from "@convohop/browser-sdk";

const client = new ConvoHopClient({
  baseUrl: window.location.origin, // Your same-origin GraphQL HTTP/WS proxy
  sessionToken, // st_ from your backend, never pk_ or adm_
});
const thread = await client.createThread("Support", [teammateIdentityId]);
await client.sendMessage(thread.id, "Hello", {
  clientMessageId: crypto.randomUUID(),
  props: { caseId: "case-42" },
});

// After the teammate accepts the invitation on their own session:
const call = await client.createCall(thread.id, "Support", "video", [teammateIdentityId]);
await client.startMedia(call.id);
const localVideo = document.querySelector<HTMLVideoElement>("#local-video");
const remote = document.querySelector("#remote-tracks");
if (!localVideo || !remote) throw new Error("Call elements are missing");
const connection = await client.connectCall(call.id, {
  localVideo,
  onTrackAdded: ({ element }) => remote.append(element),
  onTrackRemoved: ({ element }) => element.remove(),
  onReconnecting: () => console.info("Call reconnecting"),
  onDisconnected: (error) => console.error("Call disconnected", error),
  onError: (error) => console.error("Media error", error),
});
// On leaving the call UI, disconnect, stop local tracks and revoke this device.
await connection.leave();
// The call owner may end the occurrence; its chat thread remains:
await client.stopMedia(call.id);
```

`connectCall` fetches the live call, obtains a device grant with `joinMedia`,
connects LiveKit to the returned `serverUrl` (do not append `/rtc`), publishes
microphone/camera as allowed, and attaches/detaches remote tracks. It rejects
if the call is not live or if admission/publishing fails; a failed join revokes
the device grant. An `audio` call never turns on a camera. Use
`{ camera: false }` for microphone-only video, or `{ publish: false }` for a
listen-only member. `client.connectMedia` uses the same adapter for a
broadcast publisher; broadcast/HLS availability depends on the separately
operated service. `joinMedia` remains available to integrations that need
the raw grant.
If a browser blocks remote audio autoplay, show a user-gesture button when
`onAudioPlaybackBlocked` fires and call `connection.enableAudio()` from its
click handler in your application.

## Ringing, reconnection and token renewal

Call `incomingCalls(after, limit)` and paginate the snapshot before
`subscribeCalls({ after: firstPage.cursor, onEvent, onError })`. Apply events
idempotently by call ID/sequence; `call.ringing` includes call details, while
`call.revoked` may have `call: null`. `declineCall(id)` dismisses only that
invitation. An acceptance is not proof of media connectivity.

The `st_` token expires after **15 minutes**. Your authenticated backend must
mint another token for the *same identity* before expiry. Call
`client.updateSessionToken(freshStFromYourBackend)`; HTTP and HLS requests
thereafter use it, and active WebSockets re-authenticate from each stream's
last successfully processed `subscription.after`. An already-connected call
does not need a fresh grant just because its 60-second join JWT expires.
On a failed transport the SDK tries a fresh `joinMedia(id, participantId)`
grant and reconnects the **same authorized device**; `connection.reconnect()`
also forces that path explicitly. It disconnects and revokes on renewal
failure, reporting the error; if revocation itself fails, `leave()` can be
retried after updating the session token. Neither old JWTs nor a new `st_`
credential for a different user are a safe substitute for authorization.
Call `leave()` before unmount/navigation; a sudden tab close cannot guarantee
the revocation request completes.

## Catch-up belongs to your application

The SDK keeps the last acknowledged decimal-string cursor **in memory**
across network reconnects and `updateSessionToken`. It does not store chat
or tokens on disk or send offline push. Persist each event and its cursor
together in your app's durable store, keyed by your authenticated user and
thread. On resume, page through `threadEvents` from that cursor and apply
events idempotently, retaining the **first page's** high-water `cursor`
before you start `subscribeThread`. Do not require consecutive sequences.

```ts
let after = await loadAcknowledgedCursor(thread.id) ?? "0"; // Your app store
let highWater: string | undefined;
for (;;) {
  const page = await client.threadEvents(thread.id, after, 100);
  highWater ??= page.cursor;
  for (const event of page.items) {
    await applyAndPersistEvent(thread.id, event); // Idempotent, including cursor
  }
  if (!page.hasMore) break;
  after = page.nextAfter;
}
const stream = client.subscribeThread(thread.id, {
  after: highWater,
  onEvent: async (event) => { await applyAndPersistEvent(thread.id, event); },
  onError: (error) => console.error("Resume from the stored cursor", error),
});
// stream.after advances only after onEvent succeeds. Close on view teardown.
```

The SDK source does not include the services or a hosted endpoint. Deployment
availability, including broadcast/HLS support, must be confirmed separately.
There is no published package, offline push or production SLA.
