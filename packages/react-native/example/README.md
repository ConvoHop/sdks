# ConvoHop React Native example

A React Native app built on [`@convohop/react-native`](../README.md). It signs
a user in through your backend and lists their conversations. It chats with
offline-safe sends, typing and read receipts, receives push notifications,
and makes and answers calls through CallKit or Android's Telecom framework.
License: [Apache-2.0](../LICENSE).

Type-check it from the repository root:

```sh
npm ci
npm run typecheck:example --workspace @convohop/react-native
```

The example isn't an npm workspace. It type-checks against the repository's
root `node_modules`, where npm links `@convohop/client`, `@convohop/react` and
`@convohop/react-native` and installs the package's development
dependencies. [`test/example.test.mjs`](../test/example.test.mjs) keeps the
versions in `package.json` in step with those, so update both together.
To run, the app has its own `node_modules` and lockfile, for React Native
and the packages with native code, which must have one copy. Metro takes
the SDK packages from the repository's workspaces. React Native 0.87.1
renders with React 19.2.3, and the `react` package must have exactly that
version, so `package.json` pins it; the test checks that too.

## Android

You need JDK 17 and the Android SDK with Android 16 (API 36), build tools
36.0.0 and NDK 27.1.12297006, as React Native's
[environment setup](https://reactnative.dev/docs/set-up-your-environment)
describes. From the repository root:

1. Build the SDK packages: `npm ci`, then `npm run build`.
2. Publish the [Android SDK](../../../android/README.md)'s push library to
   the repository's local Maven repository, which the app takes
   `com.convohop` packages from: in `android/`, run
   `./gradlew :push:publishAllPublicationsToBuildRepository`.
3. In `packages/react-native/example/`, run `npm ci`.
4. For push, add your Firebase project's `google-services.json` to
   `android/app/`; Git ignores it. Without it, the app runs without push,
   and `registerForPush` rejects with `E_FIREBASE_NOT_INITIALIZED`.
5. Set your backend's URL in [`src/config.ts`](src/config.ts). Run
   `npm start`, and in another terminal, `npm run android`.

- **Calls on the lock screen.** Incoming calls ring with a full-screen
  intent that opens `MainActivity`, which doesn't show over the lock
  screen. On a locked device, they wake the screen and ring with their
  notification, which has Decline and Answer, labelled Video for a video
  call. Answering dismisses a swipe lock, but a PIN or another secure lock
  is asked for first, and the call rings until the user enters it. To ring
  and answer in your own UI there, set the `incomingCallIntent` of the
  options in `MainApplication` to an activity with `showWhenLocked` and
  `turnScreenOn`.
- **In the background.** The app starts no foreground service, so Android
  can stop a call's media while the app is in the background: on an
  Android 15 emulator, it blocked the app's network about 4 seconds after
  the screen turned off. A real app starts its own for each call, of type
  `phoneCall`.
- **A backend on your computer.** The client accepts plain HTTP only for a
  loopback address, so it rejects the emulator's `10.0.2.2`. Forward each
  port with `adb reverse tcp:PORT tcp:PORT`, and use
  `http://127.0.0.1:PORT` for the ConvoHop `baseUrl` your backend returns,
  and for `BACKEND_URL`. Only debug builds allow plain HTTP.

## iOS

You need Xcode with an iOS simulator, and Ruby with Bundler, as React
Native's [environment setup](https://reactnative.dev/docs/set-up-your-environment)
describes. CI builds the app with Xcode 26.6. From the repository root:

1. Build the SDK packages: `npm ci`, then `npm run build`.
2. In `packages/react-native/example/`, run `npm ci`, then
   `bundle install` to install CocoaPods.
3. In `ios/`, run `bundle exec pod install`. The pods take the
   [Swift SDK](../../../swift/README.md) from this repository's `swift/`.
   To build with another checkout of it, set `CONVOHOP_SWIFT_PACKAGE` to
   that checkout's `swift/` directory. Resolving the Swift package also
   downloads about 190 MB of LiveKit's Swift SDK, which the app doesn't
   link.
4. Set your backend's URL in [`src/config.ts`](src/config.ts). Run
   `npm start`, and in another terminal, `npm run ios`.

- **Configuration.** [`AppDelegate.swift`](ios/ConvoHopExample/AppDelegate.swift)
  configures the push and call modules before React Native starts, and
  forwards the APNs token. A scene delegate shows React Native, because
  apps built with the iOS 27 SDK must use scenes.
  [`Localizable.strings`](ios/ConvoHopExample/en.lproj/Localizable.strings)
  has the text of alerts that arrive without any.
- **On a device.** Choose your team in Xcode, and change the bundle ID,
  `com.convohop.example`, to one of yours. Push needs the Push
  Notifications capability, which the entitlements already have, and an
  APNs key for your backend. Debug builds register their tokens for APNs's
  development environment and Release builds for production; change that
  in `AppDelegate.swift` if you sign differently.
- **No message text.** The app has no Notification Service Extension or
  App Group, so in the background, message pushes show "New message"
  unless the project sends previews. The Swift SDK
  [shows how to add one](../../../swift/README.md#message-text-in-a-notification-service-extension).
- **The simulator.** On the iOS 27 simulator, the PushKit token arrives
  but the APNs token never does, so `registerForPush` times out. Send the
  app the `payload` of a `push.apnsAlert()` request with
  `xcrun simctl push`. CallKit has no call UI there and ends calls within
  seconds, so answer and join calls on a device.
- **A backend on your computer.** The simulator shares your computer's
  network, so use `http://127.0.0.1:PORT` for the ConvoHop `baseUrl` your
  backend returns, and for `BACKEND_URL`. The client accepts plain HTTP
  only for a loopback address, which App Transport Security allows through
  `NSAllowsLocalNetworking` in `Info.plist`.

## Your backend

The app never holds a ConvoHop backend key. Your backend signs users in,
issues their ConvoHop sessions with
[`@convohop/server`](../../server/README.md#application-backend), stores their
push registrations and sends their pushes. Set its URL in
[`src/config.ts`](src/config.ts). [`src/backend.ts`](src/backend.ts) calls
these endpoints. The paths and bodies are this example's, not part of
ConvoHop:

| Request | Body | Response |
| --- | --- | --- |
| `POST /sign-in` | `{ userName, password }` | `{ appToken, convohop }`: your own credential for the user, and a ConvoHop session (`baseUrl`, `projectId`, `sessionToken`, `tokenExpiresAt` and `session`) |
| `POST /convohop/session` | `{ sessionId }` of the current session | A new ConvoHop session, the same shape as `convohop` |
| `POST /push-registrations` | A registration: `{ kind: "apns" \| "apnsVoip", token, environment? }` on iOS; `{ kind: "fcm", token }` or `{ kind: "fcm", fid }` on Android | Nothing. Store it for the user, keyed by its token or FID: when another user signs in on the device, it moves to them. |
| `DELETE /push-registrations` | A registration that FCM unregistered | Nothing. Stop sending to it. |
| `POST /sign-out` | `{}` | Nothing. End the user's ConvoHop sessions on this device and delete its push registrations. |

Every request but `/sign-in` sends `Authorization: Bearer <appToken>`.
Errors report the method, path and HTTP status, never the response body,
which can hold credentials. A malformed session fails in `parseBootstrap`,
before the SDK sees it.

To send pushes, subscribe a webhook endpoint to `notification.message`,
`notification.call` and `notification.callCancelled`, and build the requests
with the [push payload builders](../../server/README.md#push-payloads):

- **iOS.** Send `push.apnsAlert()` requests to the `apns` token and
  `push.apnsVoip()` requests, for incoming calls, to the `apnsVoip` token.
- **Android.** Send `push.fcm()` requests to the registration's `token` or
  `fid`, whichever the app registered.

## What it shows

- [`src/session.ts`](src/session.ts) connects a signed-in user. It creates
  the client with the React Native platform (`createPlatform`), AsyncStorage
  for recovery state and `sessionRefresh`. It also starts a persistent
  `Outbox`, the call controller, `watchRingingCalls`, `setPushRecipient`
  and `registerForPush`.
- [`src/calls.ts`](src/calls.ts) joins the calls the user answers in the
  system call UI and starts the user's own. It connects media with
  `createRoom` and `createRoomConnector`, and mutes through the system call
  so both stay in step. On Android it shows the call's audio routes; on iOS,
  the system route picker.
- [`src/screens/Inbox.tsx`](src/screens/Inbox.tsx) pages through the inbox,
  asks for notification permission, and offers the settings when
  notifications or full-screen calls are off.
- [`src/screens/Conversation.tsx`](src/screens/Conversation.tsx) uses
  `useConversation` and `useTyping` from
  [`@convohop/react`](../../react/README.md). It reports reading while the
  conversation is on screen, loads older messages, and resends or deletes
  messages that weren't sent.
- [`src/App.tsx`](src/App.tsx) opens the conversation of a notification the
  user tapped, including the one that launched the app, and reloads the inbox
  when a push arrives.

## Behavior to keep in your app

- **Whose pushes.** `Session.start()` sets the push recipient to the
  signed-in user before it registers, so the device shows and rings only
  their pushes. Sign-out sets it to `null`, and the device drops every
  ConvoHop push until the next sign-in, even if your backend couldn't delete
  the registrations.
- **Sign-out order.** `Session.end()` stops watching rings, aborts push
  registration, clears the push recipient, hangs up and ends the calls still
  ringing, and awaits `outbox.close()` and the read receipts still in
  flight. Then, on Android, it unregisters from FCM. It signs out with your
  backend and deletes the user's recovery state. Anything still running
  could write recovery records after the deletion, and with them the text
  of unsent messages. The app unmounts the signed-in screens before it
  starts.
- **One user's recovery state.** Recovery state on the device belongs to the
  user who last signed in. When someone else signs in, the app deletes it
  first. The same user keeps theirs, so the outbox sends the messages they
  left unsent.
- **Calls.** One call at a time. The caller's hang-up ends the call for
  everyone; anyone else who hangs up just leaves.

## Limits

- **Sign-in on each launch.** The app keeps its backend credential in memory
  only. A real app keeps its own credential in the Keychain or Android's
  Keystore and gets a new ConvoHop session at launch. A call answered on the
  lock screen before sign-in is joined once the user signs in, while it's
  still current.
- **No author names.** Messages carry the author's principal ID. Look up
  names in your own user directory.
- **Verified on an emulator and a simulator only.** The app ran once, by
  hand, on an Android 15 emulator without Firebase, with pushes passed to
  `handleRemoteMessage`, and once on an iOS 27 simulator, with pushes sent
  by `xcrun simctl push`. It hasn't run on a physical device, with pushes
  delivered by FCM or APNs, or with real media. Nobody has answered a call
  on iOS, or checked how Android's Telecom audio routes and LiveKit's audio
  session interact. The [design](../../../docs/react-native.md#testing)
  lists what those runs verified.
