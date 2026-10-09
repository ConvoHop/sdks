# ConvoHop Flutter example

A small chat and calling app built with the [ConvoHop Flutter SDK](../README.md).
It signs in through your backend and shows:

- the inbox;
- a conversation from a `ConversationStore`, kept on the device, with
  optimistic sends through the outbox, typing, read receipts, recent
  activity, earlier pages, and the banners for a resync or a stopped store;
- push: permission, registration, opening a notification, suppressing
  notifications for the open conversation, and the system incoming-call UI;
- voice calls: start or join the conversation's call, ring the other
  members, reconnect, mute from the system call UI, and leave.

It needs a backend of your own, a ConvoHop project and, for push, Firebase
and APNs credentials. It holds only the user's short-lived ConvoHop session:
your backend keeps the backend key.

## Your backend

The app calls three JSON endpoints under one URL. Add your app's own
authentication, such as its sign-in cookie or bearer token, to the requests
in `AppBackend` in [`lib/main.dart`](lib/main.dart). The example sends none.

| Request | Your backend |
| --- | --- |
| `POST <url>` | Signs the user in to ConvoHop with a server SDK's `issueSession` and answers `{"baseUrl", "projectId", "bootstrap"}`, with the session bootstrap as `bootstrap` |
| `POST <url>/renew` with `{"sessionId", "principalId", "deviceId", "expectedRevision"}` | Checks that the session is the signed-in user's, renews it with the server SDK's `sessions.renew` and answers the new bootstrap |
| `POST <url>/push-registration` with `{"kind": "fcm", "token" or "fid"}` or `{"kind": "apns" or "apnsVoip", "token"}` | Keeps the device's push registration, the same registration more than once |

To deliver pushes, your backend receives ConvoHop's `notification.*`
webhooks and sends each one to the user's registrations with the server SDK's
[push payload builders](../../packages/server/README.md#push-payloads):
`fcm` registrations through FCM with their `token` or `fid` as the message's
target, `apns` tokens as APNs alerts, and `apnsVoip` tokens as PushKit VoIP
pushes on the `<bundle ID>.voip` topic.

## Run it

The repository holds only the Dart code. Create the platform folders, then
set them up as below:

```sh
cd flutter/example
flutter create --platforms=android,ios --org com.convohop --project-name convohop_example .
flutter run --dart-define=CONVOHOP_SESSION_URL=https://your-backend.example/convohop/session
```

`flutter create` keeps the existing `lib/main.dart` and `pubspec.yaml`. It
also adds a `test/widget_test.dart` for a different app: delete it.

### Android

- Add Firebase with `google-services.json` and the Google services Gradle
  plugin, as the [package README](../README.md#android-setup) describes, and
  optionally switch FCM to installation IDs there. Without Firebase, chat and
  calls work and the app shows a `FIREBASE_UNAVAILABLE` error instead of
  registering for push.
- Add the permissions that
  [`livekit_client`'s setup](https://pub.dev/packages/livekit_client#installation)
  lists for audio, such as `RECORD_AUDIO`, to
  `android/app/src/main/AndroidManifest.xml`.

### iOS

- In Xcode, give the `Runner` target a bundle ID and team, then add the Push
  Notifications capability and Background Modes with Voice over IP and
  Audio.
- Add `NSMicrophoneUsageDescription` to `ios/Runner/Info.plist`.
- Call `ConvoHopPlugin.handleLaunch()` in `ios/Runner/AppDelegate.swift`
  and add the `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` and
  `CONVOHOP_MISSED_CALL` strings, as the
  [package README](../README.md#ios-setup) shows.

Test push and incoming calls on a real device.

## What to look at

| In `lib/main.dart` | Shows |
| --- | --- |
| `AppBackend` | The calls to your backend |
| `ChatSession.start` | Creating the client with file storage and session refresh, the outbox and push |
| `ChatSession._opened`, `ChatSession._callAction` | Opening a conversation or a call from a notification or the system call UI |
| `_HomeScreenState.didChangeAppLifecycleState` | Checking the session and flushing the outbox when the app returns |
| `ConversationScreen` | The store, sends, typing, read receipts, recent activity and ring updates |
| `CallScreen` | Starting, ringing, joining, reconnecting and leaving a call |

The example rings the other members that the store has receipts for, because
a user session can't list a conversation's members. Your app knows its
conversations' members: ring those.
