# React Native SDK

`@convohop/react-native` runs the ConvoHop client SDK, `@convohop/client`, in React Native apps on Android and iOS. The client runs one signed-in user's session in your app: conversations and their realtime events, a local conversation store, an offline outbox with optimistic sends, read receipts, typing and calls. The package adds what React Native needs around it: the platform that the client runs on in Hermes, push registration and notifications through APNs, PushKit and FCM, calls in CallKit and Android's Telecom, and call media through LiveKit's React Native SDK.

## How it fits in

1. Your users sign in to your app with your own authentication.
2. Your backend uses a server SDK to map each user to a ConvoHop principal and issue a short-lived session for the user's device, as each [server quickstart](../index.md#quickstarts) shows.
3. Your app passes the session to `@convohop/client`, on the platform from `@convohop/react-native`. The client sends, watches and calls as that one user, and renews the session through your backend before it expires.
4. ConvoHop sends signed webhooks to your backend, which builds APNs and FCM requests from notification events with a server SDK and sends them with your own push credentials. `@convohop/react-native` registers the device for them, and its iOS and Android code shows their notifications and rings for calls, even while JavaScript isn't running.

The app holds only the user's short-lived session. A backend key or an operator credential never belongs in app code, bundles, storage, URLs or logs.

## Install

The packages aren't on a package registry yet. [Build them from source](https://github.com/ConvoHop/sdks#build-from-source), or [install a GitHub release](https://github.com/ConvoHop/sdks#install-a-release) once one is published. `@convohop/react-native` needs React Native 0.76 or later with the New Architecture, and Android 7.0 or later. On iOS, it needs React Native 0.84 or later and iOS 15.1 or later. `react-native` and `@convohop/client` are its peer dependencies. Push and calls also need the [iOS setup](https://github.com/ConvoHop/sdks/blob/main/packages/react-native/README.md#ios) and the [Android setup](https://github.com/ConvoHop/sdks/blob/main/packages/react-native/README.md#android) that its README describes.

`@convohop/react-native/media` ships with `@convohop/react-native`, and connects call media through LiveKit's React Native SDK: `@livekit/react-native` 3, `@livekit/react-native-webrtc` 144.2 or later and `livekit-client` 2.22.3 or later. Apps without calls don't install them. `@convohop/react`'s hooks work in React Native too, except `useMediaConnection`, which needs a browser. Import types and errors, such as `ConvoHopProblem`, from `@convohop/client`, never from `@convohop/core`.

## Tested examples

Every React Native sample in these docs is a region of a file in [the examples package](https://github.com/ConvoHop/sdks/tree/main/docs/languages/react-native/examples), which CI typechecks and tests on every change:

- The client samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections, with stand-ins for React Native, AsyncStorage and NetInfo. Session renewal runs against a local stand-in for your backend.
- The push samples run against stand-ins for the package's native modules, which answer the way its iOS and Android code does, with your backend's endpoints on a local HTTP server. Reading a message push's text runs against the conformance mock.
- Joining, answering and leaving a call run against stand-ins for the package's native modules, the client and LiveKit's audio session, including when a step fails or the user signs out while a call joins. A real call needs CallKit or Android's Telecom and LiveKit's native WebRTC, so CI only typechecks the other calling samples.
- The React samples need React Native's renderer, so CI only typechecks them.

The tests run on Node.js, not Hermes. They don't cover push delivery through APNs or FCM, the system call UI or call media on a device.
