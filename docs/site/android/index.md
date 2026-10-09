# Android SDK

`com.convohop:convohop-android` is the Kotlin SDK for Android apps. It acts as one user, with a short-lived session that your backend issues, and covers chat with a local store, an offline outbox and optimistic sends, typing signals and read receipts, calls through the LiveKit Android SDK, and FCM push notifications that ring incoming calls through Telecom. It never holds a backend key.

## How they fit together

1. Your users sign in to your app with your own authentication.
2. Your backend uses a server SDK to map each user to a ConvoHop principal and issue a short-lived session for the device, as the [Java and Kotlin server quickstart](../jvm/quickstarts/server.md#sign-in-a-user) shows, and returns the session to your app.
3. Your app connects a `ConvoHopClient` with the session. The client sends, watches and calls as that one user, and renews the session through your backend before it expires.
4. ConvoHop sends your backend notification events, which a server SDK turns into FCM requests that your backend sends with your own Firebase credentials. `convohop-android-push` shows the notifications on the device, and rings incoming calls.

Your app depends on `convohop-android`, which brings in `convohop-android-core`, the platform-free client, and `convohop-android-push`. A React Native or Flutter wrapper can ship `convohop-android-push` alone, because it has no networking, LiveKit or coroutines.

Never put a backend key, operator credential or webhook secret in an app. The client keeps the session token in memory only, and its recovery storage never holds tokens.

## Install

The SDK isn't on a package registry yet. [Build it from source](https://github.com/ConvoHop/sdks/blob/main/android/README.md#install-from-source) with JDK 17 and the Android SDK with platform 36: run `./gradlew publishAllPublicationsToBuildRepository` in the repository's `android` directory, which writes the artifacts to `android/build/repo`. In your app's `settings.gradle.kts`, add that directory as a Maven repository, and JitPack for the `com.github.davidliu` group only, which publishes LiveKit's audio routing library. Then depend on `com.convohop:convohop-android:0.1.0-SNAPSHOT`, and on `com.google.firebase:firebase-messaging` 25.1.2 or later, for example through the Firebase Android BoM 34.18.0 or later.

The SDK needs Android 7.0 (API 24) or later, and your app compiles against API 36. It's built and tested with Kotlin 2.2.21 and Android Gradle Plugin 9.4.1, and calls use LiveKit Android SDK 2.29.0. For push, add your own `google-services.json` and the Google Services Gradle plugin to your app. This repository contains no Firebase configuration.

The SDK's manifests merge the permissions it uses into your app's: `INTERNET` and `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`, `MANAGE_OWN_CALLS` and `USE_FULL_SCREEN_INTENT` for notifications and incoming calls, and LiveKit's `RECORD_AUDIO` and `CAMERA`. Request `POST_NOTIFICATIONS` on Android 13 and later, and `RECORD_AUDIO` and, for video, `CAMERA`, at runtime before you need them. Remove permissions that you don't use with `tools:node="remove"`.

Suspending calls are main-safe with the SDK's own storage: each client runs its work one task at a time on its own dispatcher, `Dispatchers.IO` unless you pass another, so call them from a coroutine such as one from `lifecycleScope.launch`.

## Tested examples

Every Kotlin sample in these docs is a region of a file in [the examples project](https://github.com/ConvoHop/sdks/tree/main/docs/languages/android/examples), which CI compiles and tests with the SDK on Robolectric, on the JVM rather than a device:

- The client samples run against the conformance mock, a local stand-in for the ConvoHop API, including a dropped live connection and sends whose response was lost. The mock can't renew sessions, so the renewal sample runs against a stand-in for your backend.
- The push samples handle pushes built from the vectors of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), delivered as FCM would, and open the incoming-call screen. Registering with FCM needs your Firebase project, so CI compiles the `Application` sample but doesn't run it.
- Calls need real media, so CI compiles the calling samples but doesn't run them, apart from the incoming-call screen.

## Packages

| Package | Layer | Runtime | Summary |
| --- | --- | --- | --- |
| [`com.convohop:convohop-android`](reference/android.md) | Client | Android 7.0 (API 24) or later. Apps compile against API 36. Tested with Kotlin 2.2.21. | The SDK an Android app depends on: SQLite and SharedPreferences storage, network monitoring, LiveKit calls and message text for notifications. It brings in the other two packages. |
| [`com.convohop:convohop-android-core`](reference/android-core.md) | Client | Android 7.0 (API 24) or later, through `convohop-android`. It isn't a supported entry point on its own. | The platform-free client that `convohop-android` brings in: sessions and their renewal, conversations, the store, the offline outbox, timelines, recovery, live sessions and the generated protocol types. |
| [`com.convohop:convohop-android-push`](reference/android-push.md) | Client | Android 7.0 (API 24) or later. Apps compile against API 34 or later and supply firebase-messaging 25.1.2 or later. | FCM registration, notifications and Telecom incoming calls, with no networking, LiveKit or coroutines, so a React Native or Flutter wrapper can ship it alone. |

## Quickstarts

| Quickstart | Summary |
| --- | --- |
| [Client](quickstarts/client.md) | Sign in a user with a session token, then send, watch and replay messages. |
| [Push notifications](quickstarts/push.md) | Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications. |
| [Calling](quickstarts/calling.md) | Start, join and end voice and video calls. |

## Reference

- [Package reference](reference/index.md): every public declaration, by package.
- [Operation coverage](reference/operations.md): the members that send each API operation.
- [Android in one file](llms-full.txt): every Android page, for LLMs and agents.
