# Threadwave browser SDK (source package)

This ConvoHop repository retains the existing `@threadwave/browser-sdk` API
name. This source package has not been published; no hosted service is included.
Its source is licensed under the [Apache License, Version 2.0](../../LICENSE).

This package gives one browser/TypeScript `ThreadwaveClient` chat, in-app call
signaling and a LiveKit-backed call connection. It accepts **only** an end-user
`st_` session; keep the `pk_` project key on your authenticated backend and
the `adm_` operator credential outside customer applications. Build this
unpublished package from the repository root:

```sh
npm ci
npm run build --workspace @threadwave/browser-sdk
npm test --workspace @threadwave/browser-sdk
```

The API origin must serve GraphQL HTTP and `graphql-transport-ws` at `/graphql`
(and authenticated `/media` for local broadcasts). Your backend registers each
app user once as a service-issued `ci_` identity and mints a 15-minute `st_`
session for that **authenticated** identity. An invited member must accept the
thread invitation before they can chat or join its calls.

```ts
import { ThreadwaveClient } from "@threadwave/browser-sdk";

const client = new ThreadwaveClient({
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
operated service. `joinMedia` remains available to integrations that need the raw grant.
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
