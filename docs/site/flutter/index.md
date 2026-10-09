# Flutter SDK

`convohop` is the ConvoHop client SDK for Flutter apps on Android and iOS. It runs one signed-in user's session in your app: conversations and their realtime events, a local conversation store, an offline outbox with optimistic sends, read receipts, typing, recent activity, calls through the official `livekit_client` package, push registration and the system incoming-call UI.

## How it fits in

1. Your users sign in to your app with your own authentication.
2. Your backend uses a server SDK to map each user to a ConvoHop principal and issue a short-lived session for the user's device, as each [server quickstart](../index.md#quickstarts) shows.
3. Your app passes the session to `package:convohop/convohop.dart`, which sends, watches and calls as that one user, and renews the session through your backend before it expires.
4. ConvoHop sends signed webhooks to your backend, which builds APNs and FCM requests from notification events with a server SDK and sends them with your own push credentials. `package:convohop/push.dart` registers the device for them, opens their conversations and rings for calls.

The app holds only the user's short-lived session. A backend key or an operator credential never belongs in app code, bundles, storage, URLs or logs.

## Install

The package isn't on pub.dev yet. Add it as a Git dependency pinned to a commit of [the SDK repository](https://github.com/ConvoHop/sdks), as [its README](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#install) shows. It needs Flutter 3.38 or later (Dart 3.10 or later), Android 7.0 (API level 24) or later and iOS 13 or later. Push and calls also need [Android setup](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#android-setup) and [iOS setup](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#ios-setup).

`package:convohop/convohop.dart` is pure Dart. `calls.dart` adds call media through `livekit_client`, `push.dart` adds push and the system call UI through the package's own Android and iOS code, and `io.dart` stores recovery data in files.

## Tested examples

Every Dart sample in these docs is a region of a file in [the examples package](https://github.com/ConvoHop/sdks/tree/main/docs/languages/flutter/examples), which CI analyzes and tests with `flutter test` on every change:

- The client samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections. The mock doesn't renew sessions, so CI only analyzes session renewal.
- The push samples run against mocked platform channels that answer the way the package's Android and iOS code does. The sample that reads a message push's text runs against the conformance mock, with and without a message preview.
- The calling samples, and joining a call that the user answered from a notification, need a ConvoHop project with calls and a LiveKit media server, so CI only analyzes them.

These tests don't cover push delivery through FCM or APNs, the system call UI or call media on a device.

## Packages

| Package | Layer | Runtime | Summary |
| --- | --- | --- | --- |
| [`package:convohop/convohop.dart`](reference/convohop.md) | Client | Flutter 3.38 or later (Dart 3.10 or later) on Android 7.0 (API level 24) or later and iOS 13 or later. | Client SDK for Flutter apps on end-user devices: one signed-in user's conversations, realtime events, conversation store, offline outbox, read receipts, typing, recent activity and call control. |
| [`package:convohop/calls.dart`](reference/calls.md) | Client | Flutter 3.38 or later on Android 7.0 (API level 24) or later and iOS 13 or later, with `livekit_client` 2.13.1 or later. | Call media through the official `livekit_client` package. |
| [`package:convohop/push.dart`](reference/push.md) | Client | Flutter 3.38 or later on Android 7.0 (API level 24) or later with Firebase Cloud Messaging, and iOS 13 or later with APNs. | Push registration, notification payloads and the system incoming-call UI, through the package's own platform code. |
| [`package:convohop/io.dart`](reference/io.md) | Client | Flutter 3.38 or later (Dart 3.10 or later) on Android 7.0 (API level 24) or later and iOS 13 or later. | File-backed recovery storage for the conversation store and the outbox. |

## Quickstarts

| Quickstart | Summary |
| --- | --- |
| [Client](quickstarts/client.md) | Sign in a user with a session token, then send, watch and replay messages. |
| [Push notifications](quickstarts/push.md) | Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications. |
| [Calling](quickstarts/calling.md) | Start, join and end voice and video calls. |

## Reference

- [Package reference](reference/index.md): every public declaration, by package.
- [Operation coverage](reference/operations.md): the members that send each API operation.
- [Flutter in one file](llms-full.txt): every Flutter page, for LLMs and agents.
