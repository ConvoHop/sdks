# Swift push notifications quickstart

Show ConvoHop's push notifications in your iOS or macOS app with the `ConvoHop` Swift package: register the device with APNs, open the conversation or call that a notification is about, and show message text from a Notification Service Extension whether or not the project sends message previews.

## Before you start

ConvoHop doesn't send push notifications itself. Your backend receives its notification events and sends APNs requests with your own APNs credentials, as the [Java and Kotlin push notifications quickstart](../../jvm/quickstarts/push.md#apns) shows. Your APNs key stays on your backend, never in your app. In your app, you need:

- The Push Notifications capability, and an App Group that your app and its Notification Service Extension share, as [install](../index.md#install) describes.
- A Notification Service Extension target that depends on `ConvoHop` and `ConvoHopNotificationService`.
- `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` and `CONVOHOP_MISSED_CALL` in your app's `Localizable.strings`. Alerts without text show them.
- An endpoint on your backend that stores each device's registration for the signed-in user. ConvoHop never stores registrations.
- For incoming calls on iOS, `ConvoHopCalls`, as the [calling quickstart](calling.md#answer-incoming-calls) shows.

The samples on this page use these imports:

```swift include=examples/Sources/Examples/Push.swift#imports
```

## Register the device

```swift include=examples/Sources/Examples/Push.swift#register
```

`startPush` makes your app and its extension show this user's pushes only, then asks the user to allow notifications and registers the app with APNs. `register()` returns whether the user allows them. iOS then passes the device token to `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`: send it to your backend as `pushRegistration` builds it, `{"kind":"apns","token":"…"}`, with the token in lowercase hexadecimal. APNs can issue a new token, for example when the user restores the device from a backup, so register again whenever your app starts with a user signed in, and store the registration idempotently.

The ledger holds the user whose pushes this device shows, the pushes that your app handled and the rings that stopped. It keeps them in the App Group suite's defaults, so your app, its extension and `ConvoHopCalls` share them when they name the same suite. Two processes writing at the same moment can drop an entry, so treat the ledger as best effort.

## Open notifications

```swift include=examples/Sources/Examples/Push.swift#open
```

`client.handleNotification(userInfo)` checks the push's `convohop` object against the push payload contract, and returns what the push is about:

| `ConvoHopNotificationTarget` | Meaning |
| --- | --- |
| `.message(conversation, messageId:)` | A new message. Pushes carry its text only when the project turns on previews, so fetch it with `conversation.messages.get(messageId)`. |
| `.call(conversation, alert)` | An incoming call. Join it as the [calling quickstart](calling.md#join-a-call) shows. |
| `.callCancelled(conversation, alert, reason:)` | A ring stopped. `reason.isMissedCall` says whether the user missed the call. |

`handleNotification` returns nil for a push that isn't ConvoHop's, or that is for another project or user, such as one who signed out on this device while your backend still held its token. It throws `ConvoHopPushPayloadError` when a ConvoHop push is malformed. Pushes arrive at least once. Where your app handles pushes as they arrive, for example in `userNotificationCenter(_:willPresent:withCompletionHandler:)`, pass the ledger, as in `handleNotification(userInfo, ledger: ledger)`, to also get nil for an event that your app already handled. Route taps without the ledger, so that every tap opens its screen.

Apps that ring through CallKit get calls as VoIP pushes. Without CallKit, for example on macOS, your backend can send calls as APNs alerts instead. A missed call's alert replaces the incoming-call alert for the same ring, but a ring that the user answered or declined gets no push, so its incoming-call alert stays. Once `client.ringStopReason(alert)` returns a reason, remove it with `ConvoHopDeliveredNotifications.remove(alertId: alert.alertId)`.

## Message previews

Message previews are off unless the project turns them on, so a message push usually carries no message text: only the title that your backend gave it, such as the sender's name, and the `CONVOHOP_MESSAGE` string. To show the text, add a Notification Service Extension, which the system runs before it shows each of ConvoHop's alert pushes, and pass its pushes to `ConvoHopNotificationService`:

```swift include=examples/Sources/Examples/NotificationService.swift#notification-service-imports
```

```swift include=examples/Sources/Examples/NotificationService.swift#notification-service
```

When a message push has no body, the helper reads the message with the user's session and shows its text, up to 1024 characters, as the body, so the text never passes through APNs. It keeps the push's title. It delivers the push unchanged when:

- the push isn't a message, or already has text, because the project turned previews on or your backend sent its own;
- your closure returns no client, or a client for another project or user;
- the message was deleted or has no text;
- anything fails, or the time runs out, after 20 seconds by default.

The extension runs in its own process, so it can't use your app's client. Give it a client of its own, with a short-lived session for the push's recipient that it keeps in memory only, for example from your backend:

```swift include=examples/Sources/Examples/NotificationService.swift#extension-client
```

With a ledger, the extension hides the text of a push for anyone but the ledger's `recipient`, such as one that your backend sent before the user signed out. That push shows no title, and the `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` or `CONVOHOP_MISSED_CALL` string as its body, and the extension fetches nothing for it. It also hides the text of a ConvoHop push that it can't read, unless the recipient is `.any`. Without Apple's notification filtering entitlement, iOS shows every alert push, so the helper hides the text instead of dropping the push.

Give the extension's ledger the suite that `ConvoHopCallsConfiguration.ledgerSuiteName` names. A missed-call push reaches the extension rather than your app, and the ledger then stops a late VoIP push for the same ring from ringing.

## Stop notifications at sign-out

```swift include=examples/Sources/Examples/Push.swift#sign-out
```

When the user signs out, have your backend delete the device's registrations, then call `stopPush`. With the recipient `.nobody`, the extension hides the text of every ConvoHop push that still arrives, and `ConvoHopCalls`, which reads the same ledger, rings for none of them. `removeAll()` forgets the events and rings that the ledger recorded, and keeps the recipient. Then sign the client out, as the [client quickstart](client.md#sign-out) shows.

## How the samples are tested

The tests deliver pushes built from the vectors of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) as APNs would, and run the Notification Service Extension against the conformance mock. They check:

- that a message, a call and a missed call open their screens, and that a ring answered on another device, a push for another user and a push that isn't ConvoHop's open nothing;
- that the extension shows the text that it reads through the recipient's session when the push has none, keeps the push's title and text when the project sends previews, and hides the text of a push for a user who signed out on the device;
- that `stopPush` sets the recipient to `.nobody` and forgets the recorded events;
- the registration that your backend receives, with the token in hexadecimal.

`startPush` isn't run, because it asks the user for permission and registers with APNs, which needs a device and your Apple developer account. No test reaches APNs itself.

## Next steps

- [Calling quickstart](calling.md#answer-incoming-calls): ring incoming calls through CallKit from VoIP pushes.
- [`ConvoHopNotificationLedger` reference](../reference/push.md#convohopnotificationledger-class): the recipient, recorded events and stopped rings.
- [`ConvoHopNotification` reference](../reference/push.md#convohopnotification-struct): the fields of a push's `convohop` object.
- [`ConvoHopNotificationService` reference](../reference/notification-service.md#convohopnotificationservice-class): the Notification Service Extension helper.
- [Java and Kotlin push notifications quickstart](../../jvm/quickstarts/push.md): build and send the APNs requests from your backend.
