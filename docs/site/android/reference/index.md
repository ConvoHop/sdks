# Android reference

The public API of each Android package, generated from its declarations.

| Package | Layer | Summary |
| --- | --- | --- |
| [`com.convohop:convohop-android`](android.md) | Client | The SDK an Android app depends on: SQLite and SharedPreferences storage, network monitoring, LiveKit calls and message text for notifications. It brings in the other two packages. |
| [`com.convohop:convohop-android-core`](android-core.md) | Client | The platform-free client that `convohop-android` brings in: sessions and their renewal, conversations, the store, the offline outbox, timelines, recovery, live sessions and the generated protocol types. |
| [`com.convohop:convohop-android-push`](android-push.md) | Client | FCM registration, notifications and Telecom incoming calls, with no networking, LiveKit or coroutines, so a React Native or Flutter wrapper can ship it alone. |

[Operation coverage](operations.md) lists the members that send each API operation.
