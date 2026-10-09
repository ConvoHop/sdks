# Flutter push notifications quickstart

Show ConvoHop push notifications in your users' Flutter apps with `package:convohop/push.dart`: register the device for FCM or APNs, open conversations from notifications, and ring for calls with the system call UI.

## Before you start

ConvoHop doesn't send push notifications itself. Your backend receives `notification.message`, `notification.call` and `notification.callCancelled` webhook events, builds an FCM or APNs request for each of the user's devices with a server SDK, and sends it with your own push credentials, as each server SDK's [push notifications quickstart](../../index.md#quickstarts) shows.

The package's own Android and iOS code shows those pushes, even while Dart isn't running. On Android, its Firebase messaging service builds a notification for each FCM data message and rings with a full-screen call notification. On iOS, the system shows APNs alerts, and VoIP pushes ring through CallKit. Set up the app as the README's [Android setup](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#android-setup) and [iOS setup](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#ios-setup) describe.

The samples use these libraries, and the `joinCall`, `setMuted` and `leaveCall` functions from the [calling quickstart](calling.md#join-a-call):

```dart include=examples/lib/push.dart#imports
```

## Register the device

```dart include=examples/lib/push.dart#register
```

A registration is the device's push address. Your backend stores it as one of the signed-in user's devices, and sends the user's pushes to it. Call `register()` at each launch, and store registrations idempotently, because the same one can arrive again.

- On Android, an FCM registration carries a registration `token` by default. When the app's manifest sets `firebase_messaging_installation_id_enabled`, it carries the device's Firebase Installation ID (`fid`) instead, which your backend sends to with a Firebase Admin SDK that supports FIDs. The setting applies to the whole app: FCM's `getToken()` then fails for every library in it, so the token stays the default. FID registrations need firebase-messaging 25.1.2 or later, which the package depends on, so don't force an older one, for example with an enforced Firebase BoM before 34.18.0.
- On iOS, an APNs registration carries the device token, which arrives once APNs has registered the device, possibly after `register()` returns. `registerVoip()` adds a PushKit token for calls. Call it only if the app rings through CallKit, because iOS terminates an app that receives a VoIP push without reporting a call.

[Push notifications](https://github.com/ConvoHop/sdks/blob/main/docs/sdk-strategy.md#push-notifications-bring-your-own) lists the Firebase Admin SDK versions that send to a FID.

## Open a notification

```dart include=examples/lib/push.dart#open
```

`opened` reports the notification that the user tapped, including the one that launched the app, which `start()` delivers. A device keeps its registration across sign-ins, so a push can be addressed to a user who signed in on it before: act on one only when `isFor(client)` is true. `push.notifications` tracks rings: `isRinging(alertId)` is false once the ring stopped, for example because the call was answered, declined, cancelled or ended, or the ring expired.

While a conversation is on screen, call `push.setActiveConversation(conversationId)`, so that its messages show no notification while the app is in the foreground, and `push.removeDeliveredNotifications(conversationId: conversationId)` to remove the notifications it already showed.

## Show a message's text

```dart include=examples/lib/push.dart#previews
```

Message previews are off by default, so a message push carries no message text unless the project turns them on, or your backend sets a title or body when it builds the request, for example the sender's name. Without text, the notification shows generic text, such as "New message", which you can translate with [Android string resources](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#android-setup) and [iOS localized strings](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#ios-setup). In Dart, `notification.body` is then null, and `fetchMessage` reads the message with the user's session. It throws a `StateError` for a push addressed to another user.

## Answer calls

```dart include=examples/lib/push.dart#rings
```

A ring shows a full-screen call notification on Android and CallKit's call UI on iOS. Answering, declining, ending, muting and unmuting there arrive on `callActions` with the ring's `alertId`. Your own incoming-call screen answers and declines with `push.answerCall(alertId)` and `push.declineCall(alertId)`, and the answer arrives on `callActions` too.

- Declining stops the ring on this device only. The user's other devices keep ringing.
- Since Android 14, users and app stores can stop the app from showing full-screen notifications. `canUseFullScreenIntent()` says whether it may. Without it, rings show as heads-up notifications.
- iOS VoIP pushes are for `notification.call` only, so a running app learns that a ring stopped from its realtime events. Pass every event of the conversations the user can be called in to `push.notifications.applyEvent`, for example from `store.events`: a `live.ended` event stops the call's ring and ends it in CallKit. A missed call arrives as an APNs alert.
- `push.endCall(alertId)` ends a call in the system call UI, for example when the user hangs up in the app.

## Sign out

```dart include=examples/lib/push.dart#sign-out
```

Call it before you close the client. The package's Android and iOS code keeps showing the pushes that reach the device after `close()`, so have your backend delete the registrations that it stored for this sign-in, and revoke the session, as the [client quickstart](client.md#sign-out) shows. A push that your backend sent before it deleted them can still arrive and show its notification. Opening it does nothing, because `isFor` is false for the next user.

## Other push plugins

Android delivers each FCM message to one messaging service. If the app uses another one, such as `firebase_messaging`'s, remove ConvoHop's service from the merged manifest and pass each message's data to `push.showNotification(message.data)`, as [the README](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#other-push-plugins) shows. `handleNotification(payload)` records a payload that reached Dart another way, such as APNs `userInfo`, FCM data or a Web Push payload, and reports it on `received`.

## How the samples are tested

The push samples run against mocked platform channels that answer the way the package's Android and iOS code does. The tests register with FCM, by token and by FID, and with APNs and PushKit, open notifications for this user and for another, answer a ring that the user can't join, and sign out. `pushText` runs against the conformance mock, with a message preview and without one. Joining an answered call needs a ConvoHop project with calls and a LiveKit media server, so CI only analyzes it. The tests don't deliver pushes through FCM or APNs, and don't show the system call UI.

## Next steps

- [`ConvoHopPush` reference](../reference/push.md#convohoppush-class): registering, notifications and the system call UI.
- [`ConvoHopNotifications` reference](../reference/push.md#convohopnotifications-class): de-duplicating pushes and tracking rings.
- [Push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md): the payloads that your backend sends and the package reads.
- [Calling quickstart](calling.md): the calls that these notifications ring.
