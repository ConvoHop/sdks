# ConvoHop React Native SDK

`@convohop/react-native` runs [`@convohop/client`](../client/README.md) in
React Native apps. It adds:

- the platform the client needs on Hermes: secure random UUIDs, SHA-256, a
  WHATWG `URL`, connectivity and the app's lifecycle;
- push registration and notifications: APNs and PushKit on iOS, FCM on
  Android;
- calls in the system call UI: CallKit on iOS, and a self-managed Telecom
  `ConnectionService` with a full-screen intent on Android;
- media through LiveKit's React Native SDK, admitted the way the Web SDK
  admits it.

It reuses the client for everything else: conversations, the outbox,
replay, receipts, live sessions and push payload parsing. For hooks, use
[`@convohop/react`](../react/README.md). It isn't published to a package
registry yet. The [React Native docs](../../docs/site/react-native/index.md)
have quickstarts with tested code and the API reference. License:
[Apache-2.0](LICENSE).

> [!NOTE]
> The iOS and Android modules have run only on a simulator and an
> emulator, without push delivery through APNs or FCM, and without media.
> The [design](../../docs/react-native.md#testing) lists what has been
> verified.

Build and test from the repository's root npm workspace with Node.js 22+:

```sh
npm ci
npm run build
npm test --workspace @convohop/react-native
npm run typecheck:example --workspace @convohop/react-native
```

The docs include code from `docs/languages/react-native/examples`, whose
tests run it on Node.js with this package's stand-ins. The docs also cover
`@convohop/client` and `@convohop/react`. After you change the public API of
any of the three, from the repository's root:

```sh
npm run build                                   # the extractor reads the built declarations
npm run extract:docs -- typescript react-native # refresh both languages' surface.json
npm run generate:docs                           # regenerate docs/site
npm run test:docs -- --install react-native     # type-check and run the docs examples
```

## Runtimes

- React Native 0.76 or later with the New Architecture: the native modules
  are TurboModules. On iOS, React Native 0.84 or later, which can add the
  Swift SDK as a local Swift package. The tests and the example use React
  Native 0.87.1.
- iOS 15.1 or later, React Native's minimum. The
  [Swift SDK](../../swift/README.md) that the iOS modules wrap needs Xcode
  16.4 or later; CI builds with Xcode 26.6.
- Hermes. Neither this package nor the client uses the globals Hermes lacks,
  such as Web Crypto and a complete `URL`. CI runs the package's tests and
  the client's send, outbox and push paths on Node.js with those globals
  removed. The package and the client also ran on Hermes once, by hand, in
  the example on an Android emulator and on an iOS simulator; the
  [design](../../docs/react-native.md#testing) lists what those runs
  verified.
- `react-native` and `@convohop/client` are peer dependencies.
  `@convohop/react-native/media` also needs `@livekit/react-native`
  `^3.0.0`, `@livekit/react-native-webrtc` `^144.2.0` and `livekit-client`
  `^2.22.3`. Apps without calls don't install them.
- Metro resolves package `exports` by default from React Native 0.79. On
  earlier versions, set `resolver.unstable_enablePackageExports = true`.

## Setup

Apps with calls set up media first, at the top of `index.js`:

```js
import { setupMedia } from "@convohop/react-native/media";

setupMedia({ callKit: true }); // Before anything imports livekit-client.
```

`setupMedia` installs a secure `crypto.getRandomValues` and
`crypto.randomUUID` where the runtime lacks them, and then LiveKit's
globals. With `callKit: true`, iOS calls get their audio session from
CallKit; see [Media](#media).

Create one platform for the app and pass it to each client:

```ts
import { createAsyncStorage } from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { ConvoHopClient, Outbox } from "@convohop/client";
import { createPlatform } from "@convohop/react-native";

const platform = createPlatform({ netInfo: NetInfo });

const client = new ConvoHopClient({
  // The user bootstrap from your backend: baseUrl, projectId, sessionToken, incarnation and principalId.
  ...bootstrap,
  platform,
  asyncRecoveryStorage: createAsyncStorage("convohop"),
  sessionRefresh: current => yourBackend.renewSession(current),
});
await client.initialize();
const outbox = new Outbox(client, { persist: true }); // One per client.
```

`createPlatform` gives the client:

| Member | Source |
| --- | --- |
| `randomUUID` | Version 4 UUIDs from the platform's secure generator, through `ConvoHopPlatform`. Request IDs come from it. |
| `sha256` | SHA-256 in JavaScript, for request fingerprints. Its digests match Web Crypto's. |
| `URL` | A WHATWG `URL`. Hosts must be ASCII: write internationalized domain names in Punycode. |
| `connectivity` | NetInfo's `isConnected`, when you pass `netInfo`. Unknown counts as online, and without NetInfo the platform is always online. |
| `lifecycle` | `AppState`. `background` is background; `active` and iOS's `inactive` are active. |

The outbox waits while the device is offline. The outbox and the realtime
connection try again as soon as the device is back online or the app
returns to the foreground, and the client checks a waiting session renewal
again in the foreground. `platform.dispose()` removes the platform's
`AppState` and NetInfo listeners.

Recovery storage holds unconfirmed sends, replay cursors and the outbox.
It never holds tokens. Pass AsyncStorage, or anything with its promise API,
as `asyncRecoveryStorage`. It belongs to one user: when another user signs
in, clear it first.

## Push

Ask for permission when it suits your app. After sign-in on every launch,
tell the device whose pushes to accept, then register:

```ts
import { registerForPush, requestPushPermission, setPushRecipient } from "@convohop/react-native";

await requestPushPermission(); // iOS alerts, badges and sounds; Android 13+ POST_NOTIFICATIONS.
await setPushRecipient({ projectId: client.projectId, recipientId: client.principalId });
const registering = new AbortController(); // Abort it at sign-out.
await registerForPush({
  register: registration => yourBackend.storePushRegistration(registration),
  unregister: registration => yourBackend.deletePushRegistration(registration),
  signal: registering.signal,
});
```

`setPushRecipient` tells the native modules whose pushes to show and ring.
They drop ConvoHop pushes for anyone else, including a push that starts the
app before JavaScript runs. The device keeps the two IDs, never a
credential. Until you first set a recipient, and after you set `null` at
sign-out, they drop every ConvoHop push, so a registration your backend
failed to delete reaches nobody.

`registerForPush` passes each registration to `register`, which stores it
with your backend for the signed-in user. It resolves once the APNs token
(iOS) or the FCM registration (Android) is stored, and keeps passing new
registrations until you abort `signal` or call the function it resolves.
Aborting also ends a registration still waiting for the platform or your
backend. The same registration arrives again on later launches, so store
it idempotently, keyed by its token or FID. Your backend sends the pushes;
build them with the server SDK's
[push payload builders](../server/README.md#push-payloads). Tokens and FIDs
address the device, so don't log them.

The native modules show notifications and ring calls themselves, even when
JavaScript isn't running. Use `onNotification` to update your UI or
navigate, and `takeInitialNotification` for the notification that launched
the app. Each gives the parsed
[push payload](../client/README.md#push-notifications):

```ts
import { onNotification, takeInitialNotification } from "@convohop/react-native";

const opened = await takeInitialNotification();
const stopListening = onNotification(({ action, notification }) => {
  if (action === "opened") navigateTo(notification);
});
```

Call `takeInitialNotification` once at startup. Until it resolves, a
notification the user opens goes to it rather than to `onNotification`. On
iOS, when it has none yet, it waits until a second after the app first
becomes active, because iOS reports the notification that launched the app
around then.

Until `setPushRecipient` resolves, the device accepts the recipient it had
before, which may be a user who didn't sign out. Check that a push's
`projectId` and `recipientId` belong to the signed-in user before you act on
it.

### iOS

- **Pods.** Run `bundle exec pod install` in `ios/`. The podspec adds the
  [Swift SDK's](../../swift/README.md) `ConvoHopPush` and `ConvoHopCalls`
  products as a local Swift package, because the Swift SDK can't be added
  by URL yet: the `swift/` directory of the repository this package comes
  from, or the checkout that `CONVOHOP_SWIFT_PACKAGE` names. Without
  either, `pod install` fails and says so.
- **Capabilities.** Add Push Notifications, and the Voice over IP and Audio
  background modes. Add `NSMicrophoneUsageDescription` to `Info.plist`,
  and `NSCameraUsageDescription` for video. A Notification Service
  Extension also needs an App Group that it shares with the app.
- **App delegate.** iOS can launch your app for a VoIP push, so configure
  the native modules before React Native starts, and forward the APNs
  token:

  ```swift
  import ConvoHopReactNative

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    ConvoHopReactNative.configure(.init(appGroup: "group.com.example.chat", apnsEnvironment: .production))
    // Then start React Native.
    return true
  }

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    ConvoHopReactNative.didRegisterForRemoteNotifications(deviceToken: deviceToken)
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    ConvoHopReactNative.didFailToRegisterForRemoteNotifications(error: error)
  }
  ```

  `configure` starts CallKit and PushKit, and makes the package the
  notification center's delegate. It passes other pushes to the delegate it
  replaced. If your app sets its own delegate later, call
  `ConvoHopReactNative.userNotificationCenter(_:willPresent:withCompletionHandler:)`
  and `userNotificationCenter(_:didReceive:withCompletionHandler:)` first
  from it. Each returns `false`, without calling the completion handler,
  for a push that isn't ConvoHop's. Until `configure` runs,
  `registerForPush`, `startOutgoingCall` and `setPushRecipient` with a
  recipient reject with `E_NOT_CONFIGURED`. The package doesn't swizzle
  your app delegate.

  | Option | Default | Use |
  | --- | --- | --- |
  | `appGroup` | `nil` | The App Group your Notification Service Extension shares. The push recipient and the notifications the app handled are kept there. |
  | `apnsEnvironment` | `nil` | `.development` or `.production`, as your app's `aps-environment` entitlement says. Each registration carries it, so your backend knows which APNs server to send to. |
  | `supportsVideo` | `true` | Video calls in CallKit |
  | `supportsHolding` | `false` | Holding calls, in CallKit and with `setHeld` |
  | `includesCallsInRecents` | `true` | Calls in the Phone app's recents |
  | `ringtoneSound` | `nil` | A sound file in your app bundle, or `nil` for the system ringtone |
  | `iconTemplateImageData` | `nil` | A 40 × 40 pt template image, as PNG data, for CallKit's button that opens your app |
  | `foregroundPresentation` | `[.banner, .list, .sound]` | How a message or a missed call shows while your app is in the foreground |
- `registerForPush` passes the APNs token, `{ kind: "apns", token }`, and,
  when the app receives calls, the PushKit token, `{ kind: "apnsVoip",
  token }`. With the `apnsEnvironment` option, each also has an
  `environment`. Send alert requests to the first and VoIP requests to the
  second. It rejects if APNs sends no token within `timeoutMs`, 30 seconds
  by default.
- Every VoIP push must reach CallKit at once, or iOS stops delivering them
  and can terminate the app. The native module reports each incoming call
  to CallKit before JavaScript starts, and ends a call for anyone else at
  once. Don't handle VoIP pushes yourself.
- iOS shows a message push that arrives while your app isn't in the
  foreground before the app sees it, so `setPushRecipient` can't drop it.
  It shows `CONVOHOP_MESSAGE`, or the push's text when the project opts in
  to previews. A Notification Service Extension can hide the text of a push
  for anyone else; see **Message text**.
- `unregisterFromPush` rejects on iOS: Apple advises apps not to
  unregister, and an app's tokens don't change between users. On sign-out,
  delete them from your backend.
- Add `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` and `CONVOHOP_MISSED_CALL` to
  your app's `Localizable.strings`. Alerts without text show them.

**Message text.** Message pushes carry no text unless the project opts in to
previews. A Notification Service Extension can fetch the message and show
its text. React Native doesn't run in an extension, so the extension is
native code that uses the ConvoHop Swift SDK's
`ConvoHopNotificationService`. Give it its own short-lived session for the
push's recipient, in memory. Never write a session token to disk or to the
App Group. Without an extension, iOS shows `CONVOHOP_MESSAGE`.

Give the extension a `ConvoHopNotificationLedger` on your App Group, the
one you pass to `configure` as `appGroup`. The extension then hides the
text of a push for anyone but the recipient `setPushRecipient` set: no
title, and a `CONVOHOP_*` string as the body.

### Android

- The package's Gradle module depends on the
  [Android SDK](../../android/README.md),
  `com.convohop:convohop-android-push`, which isn't on Maven Central yet.
  The [example](example/README.md#android) builds it from this repository.
  Set up Firebase as for any Firebase app, with your `google-services.json`.
- Your app's manifest declares the Android SDK's
  `ConvoHopMessagingService`, as in the
  [Android SDK](../../android/README.md#push-notifications). It receives
  data messages, shows message notifications and rings calls.
- A push can start the process before JavaScript runs, so configure
  notifications in `MainApplication.onCreate`, before React Native loads:

  ```kotlin
  ConvoHopReactNative.configure(this, ConvoHopNotificationOptions().apply {
      smallIcon = R.drawable.ic_notification
  })
  ```

  Use it instead of setting `ConvoHopNotifications.options`: it adds the
  recipient filter `setPushRecipient` sets, and signs the push it adds to
  each notification's intent, so a notification reported as `opened` is
  one your app posted. Until it runs, `registerForPush`,
  `handleRemoteMessage` and `setPushRecipient` with a recipient reject with
  `E_NOT_CONFIGURED`. Notifications open your launch activity unless you
  set the options' intents.
- If another library, such as React Native Firebase, owns your app's
  messaging service, pass its data messages to `handleRemoteMessage(data)`.
  It resolves what the native handler did, such as `notConvoHop` for a
  message that isn't a ConvoHop push.
- `registerForPush` follows your app's FCM mode. By default it passes the
  registration token, `{ kind: "fcm", token }`. When the app manifest sets
  `firebase_messaging_installation_id_enabled`, Firebase registers by
  Firebase installation ID instead, and it passes `{ kind: "fcm", fid }`.
  Send FCM requests to whichever your backend got.
- On sign-out, call `unregisterFromPush()` after you stop
  `registerForPush`. It deletes the token or unregisters the FID, and
  resolves the registration it removed, or `null`. Delete it from your
  backend too.
- Neither this package nor the Android SDK starts a foreground service. To
  keep a call's media running while your app is in the background, start
  your own, of type `phoneCall`.

## Calls

Incoming calls ring in the system call UI. The user answers there, on the
lock screen, or in your app with `answerCall`. Join each answered call's
live session from `subscribeAnsweredCalls`. It first replays the answered
calls that are still current, so a call answered before JavaScript started
isn't lost:

```ts
import { reportConnected, reportConnecting, subscribeAnsweredCalls, type Call } from "@convohop/react-native";
import { createRoom, createRoomConnector } from "@convohop/react-native/media";

async function join(call: Call): Promise<void> {
  const live = await client.liveSession(call.liveSessionId);
  const participation = await live.join({ requestId: platform.randomUUID() });
  await reportConnecting(call.id);
  const connection = await participation.connectWith(createRoomConnector(createRoom()));
  await connection.room.localParticipant.setMicrophoneEnabled(true);
  await reportConnected(call.id);
}
const stopAnswering = subscribeAnsweredCalls(call => {
  join(call).catch(onError);
});
```

Keep a join's request ID until the join succeeds, and reuse it when you
retry. [`example/src/calls.ts`](example/src/calls.ts) also handles a
participation that already exists, retries, hang-up and media that drops.

- **The call's state.** `getCalls()` lists the system's calls, and
  `onCallEvent` reports each change: `incoming`, `outgoing`, `answered`,
  `ended` and `changed`. The user can mute, hold or end a call in the
  system UI. Follow its `changed` and `ended` events: mute your microphone
  track when it's `muted` or `held`, and leave the live session when it
  ends. To mute from your UI, call `setMuted` and let its `changed` event
  mute the track; `setHeld` works the same way, and on iOS needs the
  `supportsHolding` option. On iOS, `incoming` comes once CallKit accepts
  the call, so a ring that stops first reports only `ended`.
- **Ending.** `endCall` declines a ringing call or hangs up any other. Leave
  the live session too.
- **Outgoing calls.** On iOS, `startOutgoingCall` reports the call to
  CallKit, which then owns its audio, and resolves its ID. Join, then call
  `reportConnecting` and `reportConnected`. On Android, join without the
  system call UI.
- **Stopped rings.** iOS gets no VoIP push when a ring stops, because iOS
  would make the app report it as a new call. `watchRingingCalls(client)`
  stops a ring once another device answered it, the caller hung up or it
  expired, by listing the user's live alerts while a call rings. On
  Android, it also covers a cancellation push that arrives late. Start it
  after sign-in, and stop it before the session ends. Once stopped, it
  starts no request and reports no error, even from a check in progress.
- **Full screen on Android 14 and later.** Android grants
  `USE_FULL_SCREEN_INTENT` only to calling and alarm apps, and users can
  revoke it. Without it, incoming calls ring as a heads-up notification.
  `canUseFullScreenIntent()` says which applies, and
  `openFullScreenIntentSettings()` opens the setting. iOS always resolves
  `true`. The full-screen intent opens your launch activity, or the
  options' `incomingCallIntent`. To ring over the lock screen in your own
  UI, use an activity with `showWhenLocked` and `turnScreenOn`. Otherwise,
  a locked device rings with the call's notification, which has Answer and
  Decline, and a device locked with a PIN or another secure lock asks for
  it before the call is answered.
- **Audio routes.** On Android, `setAudioRoute` chooses one of the call's
  `availableAudioRoutes`. On iOS, show the system route picker, such as
  LiveKit's `AudioSession.showAudioRoutePicker()`.

## Media

`@convohop/react-native/media` connects calls with LiveKit's
[React Native SDK](../../docs/sdk-strategy.md#calls-with-the-official-livekit-sdks):

- `createRoom()` creates a LiveKit room with the Web SDK's media policy: one
  peer connection each way, no simulcast, adaptive stream or dynacast, and
  VP8 video at up to 320x240, 15 frames per second and 350 kbit/s.
- `createRoomConnector(room, options)` is the connector for
  `participation.connectWith`. It connects once with each admitted
  attempt's single-use token and no retries. LiveKit may resume that
  connection with the token the media server refreshes. If LiveKit loses
  it, or reconnects as a new participant that admission didn't cover,
  `onDisconnected` runs: connect again with `connectWith`, which gets new
  credentials. Connecting doesn't capture the microphone or camera; publish
  them with `room.localParticipant` once it resolves.
- **CallKit.** With `setupMedia({ callKit: true })`, LiveKit doesn't
  configure the iOS audio session. CallKit activates it for each call, and
  the SDK tells WebRTC when it does. Start every call through CallKit,
  including outgoing ones, or it has no audio. On Android, start LiveKit's
  `AudioSession` before each call connects, and stop it after the call.

## Hooks

[`@convohop/react`](../react/README.md) imports only `react` and
`@convohop/client`, so its hooks work in React Native. Wrap the signed-in
screens in its `ConvoHopProvider` with the client and outbox, and use
`useConversation`, `useTyping` and `useSessionRefresh`.
`useMediaConnection` is for browsers; connect calls as shown above.

## Sign-out

Stop everything that writes recovery state before you delete it, or a late
write restores it, with the text of unsent messages:

1. Unmount the signed-in screens.
2. Stop `watchRingingCalls`, and abort or stop `registerForPush`.
3. `setPushRecipient(null)`, so the device drops the user's pushes even if
   your backend can't delete their registrations.
4. Stop `subscribeAnsweredCalls`, hang up, and `endCall` each call in
   `getCalls()` that hasn't ended. With no recipient, the device drops the
   pushes that would stop a ring, so it would ring until it expires.
5. `await outbox.close()`, and wait for requests you didn't await, such as
   read receipts.
6. On Android, `unregisterFromPush()`.
7. Sign out with your backend, which ends the user's sessions and deletes
   their push registrations.
8. Clear the recovery storage.

## Errors

- A function that needs a missing native module fails with an `Error` that
  names the module.
- Arguments that don't fit fail with a `TypeError` or `RangeError` before
  anything reaches native code. Native results that don't match the specs
  fail with a `TypeError`: the SDK doesn't pass them on.
- A native module that rejects sets the `Error`'s `code`, such as
  `E_NOT_CONFIGURED`, `E_CALL_NOT_FOUND`, `E_CALLKIT` on iOS or FCM's
  `SERVICE_NOT_AVAILABLE` on Android. The design lists them for
  [iOS](../../docs/react-native.md#ios) and
  [Android](../../docs/react-native.md#android).
- Push and call listeners never throw into native code. Errors from your
  listeners, and native data the SDK drops, go to React Native's error
  handler, or to `onError` where a function takes one.

## Example

[`example/`](example/README.md) is a chat app with push notifications and
calls, built on this package, `@convohop/react` and a backend of your own.
