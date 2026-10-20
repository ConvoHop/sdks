# Android reference

The public API of each Android package, generated from its declarations.

| Package | Layer | Summary |
| --- | --- | --- |
| [`dev.instantrelay:relay-android`](android.md) | Client | The SDK an Android app depends on: SQLite and SharedPreferences storage, network monitoring, LiveKit calls and message text for notifications. It brings in the other two packages. |
| [`dev.instantrelay:relay-android-core`](android-core.md) | Client | The platform-free client that `relay-android` brings in: sessions and their renewal, conversations, the store, the offline outbox, timelines, recovery, live sessions and the generated protocol types. |
| [`dev.instantrelay:relay-android-push`](android-push.md) | Client | FCM registration, notifications and Telecom incoming calls, with no networking, LiveKit or coroutines, so a React Native or Flutter wrapper can ship it alone. |

[Operation coverage](operations.md) lists the members that send each API operation.
