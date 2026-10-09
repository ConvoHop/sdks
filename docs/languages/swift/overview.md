# Swift SDK

`ConvoHop` is the Swift SDK for iOS and macOS apps. It acts as one user, with a short-lived session that your backend issues, and covers chat with a local store, an offline outbox and optimistic sends, typing signals and read receipts, calls through the LiveKit Swift SDK, and APNs push notifications, with incoming calls that ring through PushKit and CallKit on iOS. It never holds a backend key.

## How they fit together

1. Your users sign in to your app with your own authentication.
2. Your backend uses a server SDK to map each user to a ConvoHop principal and issue a short-lived session for the device, as the [Java and Kotlin server quickstart](../jvm/quickstarts/server.md#sign-in-a-user) shows, and returns the session to your app.
3. Your app connects a `ConvoHopClient` with the session. The client sends, watches and calls as that one user, and renews the session through your backend before it expires.
4. ConvoHop sends your backend notification events, which a server SDK turns into APNs requests that your backend sends with your own APNs credentials. Your app opens the notifications that the user taps, a Notification Service Extension adds message text on the device, and `ConvoHopCalls` rings incoming calls in CallKit.

The Swift package has five products. Your app depends on `ConvoHop`, which re-exports `ConvoHopPush`, and on `ConvoHopLiveKit` for call media. On iOS, `ConvoHopCalls` rings incoming calls from VoIP pushes, and your Notification Service Extension depends on `ConvoHopNotificationService`, with `ConvoHop` for its client. `ConvoHopPush` uses Foundation only, so any app extension can use it.

Never put a backend key, operator credential or webhook secret in an app. The client keeps the session token in memory only, and its recovery storage never holds tokens.

## Install

The SDK isn't on a package registry yet, and SwiftPM adds a package by URL only when its `Package.swift` is at the root of a repository. Until the SDK moves to a repository of its own, [add it from a local checkout](https://github.com/ConvoHop/sdks/blob/main/swift/README.md#install-from-source) of [ConvoHop/sdks](https://github.com/ConvoHop/sdks). In Xcode, choose **File › Add Package Dependencies…**, then **Add Local…**, and pick the checkout's `swift` directory. In a `Package.swift`, add `.package(path: "../sdks/swift")`, and depend on its products with the package name `swift`, which SwiftPM takes from the directory. Add `ConvoHop` and the other products you use to your app's target, and `ConvoHop` and `ConvoHopNotificationService` to your Notification Service Extension's.

The SDK needs iOS 15 or later, or macOS 12 or later, and Swift 6.1 or later (Xcode 16.4 or later). It builds in the Swift 6 language mode, with strict concurrency checking. `ConvoHopLiveKit` brings in LiveKit's `client-sdk-swift` 2.17.0 or later, and the other products use Apple's frameworks only. `ConvoHopCalls` rings calls on iOS only: on macOS, it has only the call model.

For push notifications, give your app the Push Notifications capability, and for incoming calls, the Voice over IP background mode. Put your app and its Notification Service Extension in one App Group, so that they share the notification ledger. Calls need `NSMicrophoneUsageDescription` in your app's `Info.plist`, and video calls `NSCameraUsageDescription`. This repository contains no APNs keys, certificates or provisioning profiles.

The client, the store, the outbox and media connections are actors, so call them with `await`, for example from a SwiftUI `.task`. `ConvoHopConversationModel` is an `ObservableObject` on the main actor, for your views, and `ConvoHopCalls` runs on the main actor too.

## Tested examples

Every Swift sample in these docs is a region of a file in [the examples package](https://github.com/ConvoHop/sdks/tree/main/docs/languages/swift/examples), which CI tests with the SDK on macOS and builds for iOS:

- The client samples run against the conformance mock, a local stand-in for the ConvoHop API, including sends whose connection dropped before or after ConvoHop committed them, and a send that an earlier run of the app left unconfirmed. The mock can't renew sessions, so the renewal sample runs against a stand-in for your backend, and the schedule that keeps the session alive isn't run.
- The push samples open notifications built from the vectors of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and the Notification Service Extension sample reads message text from the conformance mock. Registering with APNs needs a device and your Apple developer account, so CI compiles that sample but doesn't run it.
- Calls need real media, and incoming calls need PushKit and CallKit on a device, so CI compiles the calling samples but doesn't run them.
