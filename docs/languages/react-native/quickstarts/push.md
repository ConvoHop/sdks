# React Native push notifications quickstart

Show ConvoHop's push notifications in your React Native app with `@convohop/react-native`: register the device with APNs or FCM, open the conversation that a notification is about, and show message text whether or not the project sends message previews.

## Before you start

ConvoHop doesn't send push notifications itself. Your backend receives its notification events and sends APNs and FCM requests with your own push credentials, as the [TypeScript push notifications quickstart](../../typescript/quickstarts/push.md#build-and-send-the-requests) shows. Your push credentials stay on your backend, never in your app. In your app, you need:

- A client connected with the user's session, as the [client quickstart](client.md#connect) shows.
- The native setup that the package's README describes for [iOS](https://github.com/ConvoHop/sdks/blob/main/packages/react-native/README.md#ios) and [Android](https://github.com/ConvoHop/sdks/blob/main/packages/react-native/README.md#android): `ConvoHopReactNative.configure` at launch, the Push Notifications capability on iOS, and Firebase on Android.
- `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` and `CONVOHOP_MISSED_CALL` in your iOS app's `Localizable.strings`. Alerts without text show them.
- An endpoint on your backend that stores each device's registration for the signed-in user. ConvoHop never stores registrations, as [bring your own push](https://github.com/ConvoHop/sdks/blob/main/docs/sdk-strategy.md#push-notifications-bring-your-own) explains.

## Register the device

```ts include=examples/src/push.ts#register
```

`setPushRecipient` tells the native code whose pushes to show and ring. It drops ConvoHop pushes for anyone else, even one that starts the app before JavaScript runs, and keeps only the two IDs, never a credential. Until you first set a recipient, and after you set `null` at sign-out, it drops every ConvoHop push.

`registerForPush` passes each of the device's registrations to `register`, which sends it to your backend for the signed-in user. It resolves once your backend stored the APNs token on iOS, or the FCM registration on Android, and keeps passing new ones until you abort its signal. The same registration arrives again on later launches, so store it idempotently, keyed by its token or FID. Tokens and FIDs address the device, so don't log them.

- On iOS, `register` gets the APNs token, `{ kind: "apns", token }`, and the PushKit token for calls, `{ kind: "apnsVoip", token }`. Send alert requests to the first and VoIP requests to the second. With `configure`'s `apnsEnvironment` option, each also has an `environment`, `development` or `production`, which says the APNs server to send to.
- On Android, `register` gets the FCM registration token, `{ kind: "fcm", token }`. When your app's manifest sets `firebase_messaging_installation_id_enabled`, it gets the Firebase installation ID instead, `{ kind: "fcm", fid }`. `unregister` gets one that FCM unregistered, for example when Firebase unregisters the FID itself, so delete it from your backend. The same one can arrive more than once.

`registerForPush` doesn't ask the user to allow notifications. Ask with `requestPushPermission` when it suits your app, as `allowNotifications` does: on iOS for alerts, badges and sounds, and on Android 13 and later for `POST_NOTIFICATIONS`. Calls ring from the same registrations, and the [calling quickstart](calling.md#answer-incoming-calls) joins the ones that the user answers.

## Open notifications

```ts include=examples/src/push.ts#open
```

The native code shows notifications and rings calls itself, even while JavaScript isn't running. `onNotification` tells your app about each with the parsed push: `opened` when the user taps a notification, and `received` when a push arrives while the app is running. `takeInitialNotification` resolves the notification that launched the app, or `null`. Call it once at startup: until it resolves, a notification that the user opens goes to it rather than to `onNotification`. On iOS, when it has none yet, it waits until a second after the app first becomes active, because iOS reports the notification that launched the app around then.

A device keeps its registrations across sign-ins, and until `setPushRecipient` resolves, it accepts the pushes of the user before. `isFor` checks that a push is for the signed-in user before the app acts on it.

## Message previews

Message previews are off unless the project turns them on, so a message push usually carries no message text, only the title that your backend gave it, such as the sender's name. In your app, `messageText` reads the message with the user's session when the push has none:

```ts include=examples/src/push.ts#message-text
```

The notifications that the native code shows can't use your app's session:

- On Android, a message notification without text shows "New message", the `convohop_message_fallback` string resource, which your app can override.
- On iOS, the system shows a message push that arrives while your app isn't in the foreground before your app sees it, with `CONVOHOP_MESSAGE` as its text. To show the message's text, add a Notification Service Extension. React Native doesn't run in an extension, so the extension is native code that uses the Swift SDK's `ConvoHopNotificationService`, with a short-lived session of its own for the push's recipient, as the [Swift push notifications quickstart](../../swift/quickstarts/push.md#message-previews) shows.

Give the extension a `ConvoHopNotificationLedger` on the App Group that you pass to `configure` as `appGroup`. It then hides the text of a push for anyone but the recipient that `setPushRecipient` set: no title, and a `CONVOHOP_*` string as its body.

## Sign out

```ts include=examples/src/push.ts#sign-out
```

When the user signs out, call `stopPush` before you sign out with your backend, which deletes the registrations that it stored for the user's sign-in. With no recipient, the device drops every ConvoHop push that still arrives, and rings for none.

- On Android, `unregisterFromPush` also stops FCM from sending to the device, even if your backend can't be reached. It deletes your app's FCM token, which every library in your app shares, or unregisters the installation ID.
- On iOS, the system shows a message push that arrives while your app isn't in the foreground, so until your backend deletes the registration, such a push still shows. A Notification Service Extension with the ledger hides its title and text.

With calls, the [calling quickstart](calling.md#sign-out) shows which steps come before and after `stopPush`. Then sign the client out, as the [client quickstart](client.md#sign-out) shows.

## How the samples are tested

The samples run on Node.js with stand-ins for the package's native modules, which answer the way its iOS and Android code does, and with your backend's registration endpoint on a local HTTP server. The tests check:

- that `startPush` stores the APNs and PushKit tokens on iOS, and the FCM token or the installation ID on Android, and deletes a token that FCM ended;
- that the app runs without pushes when your backend can't store the registration, and that signing out while push starts registers nothing and leaves the device accepting no pushes;
- that `allowNotifications` is true when the user allows notifications, quietly or not;
- that `openNotifications` opens what the user taps and the notification that launched the app, and nothing once it stopped;
- that `messageText` reads the message from the conformance mock when the push has no text;
- that `stopPush` stops registering and drops the user's pushes, also unregisters from FCM on Android, and takes every step when one fails.

No test reaches APNs or FCM, shows a notification or rings a call, because those need a device.

## Next steps

- [Calling quickstart](calling.md#answer-incoming-calls): join the calls that the user answers.
- [`registerForPush` reference](../reference/react-native.md#registerforpush-function): the registrations, and how they end.
- [`onNotification` reference](../reference/react-native.md#onnotification-function): the notifications that the user opens or that arrive.
- [TypeScript push notifications quickstart](../../typescript/quickstarts/push.md): build and send the APNs and FCM requests from your backend.
