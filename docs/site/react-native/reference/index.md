# React Native reference

The public API of each React Native package, generated from its declarations.

| Package | Layer | Summary |
| --- | --- | --- |
| [`@convohop/react-native`](react-native.md) | Client | React Native support for the client SDK: the platform it needs on Hermes, push registration and notifications through APNs, PushKit and FCM, and calls in CallKit and Android's Telecom. |
| [`@convohop/react-native/media`](media.md) | Client | Call media through LiveKit's React Native SDK: set LiveKit up, then connect each admitted participation to a LiveKit room. It ships with @convohop/react-native. |
| [`@convohop/client`](client.md) | Client | Client SDK for apps on end-user devices: one signed-in user's conversations, realtime events and calls. In React Native, it runs on the platform from @convohop/react-native. |
| [`@convohop/react`](react.md) | Client | React hooks over the client SDK: conversations with offline-safe sends, typing, session renewal and calls. In React Native, connect call media with @convohop/react-native/media: useMediaConnection needs a browser. |

[Operation coverage](operations.md) lists the members that send each API operation.
