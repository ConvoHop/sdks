# Swift reference

The public API of each Swift package, generated from its declarations.

| Package | Layer | Summary |
| --- | --- | --- |
| [`Relay`](relay.md) | Client | Client SDK for apps on end-user devices: one signed-in user's conversations, realtime events with replay, the local store, the offline outbox, read receipts, typing, recent activity, call control and push routing. It re-exports `RelayPush`. |
| [`RelayLiveKit`](livekit.md) | Client | Call media through the official LiveKit Swift SDK, and CallKit audio session handling on iOS. |
| [`RelayPush`](push.md) | Client | Push payload parsing, deduplication, the ring ledger and the push recipient, with Foundation only so app extensions can use it. |
| [`RelayCalls`](calls.md) | Client | Incoming calls from PushKit VoIP pushes to CallKit, and outgoing calls through CallKit. |
| [`RelayNotificationService`](notification-service.md) | Client | A Notification Service Extension helper that fetches message text on the device when a push has none, and hides the text of other users' pushes. |

[Operation coverage](operations.md) lists the members that send each API operation.
