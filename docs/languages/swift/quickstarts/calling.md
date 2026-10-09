# Swift calling quickstart

Add voice and video calls to a conversation with the `ConvoHop` Swift package and the official LiveKit Swift SDK: start a call and ring other members, join the current call, answer incoming calls through CallKit, and leave or end a call.

## Before you start

Calls need a client connected with the user's session, as the [client quickstart](client.md) shows. Their media runs on the LiveKit Swift SDK, `client-sdk-swift` 2.17.0 or later, through the `ConvoHopLiveKit` product. To ring users whose app isn't open, set up the [push notifications quickstart](push.md) too. CI compiles these samples for macOS and iOS, the incoming-call ones for iOS only, but doesn't run them: calls need a ConvoHop project with calls and a LiveKit media server, and incoming calls also need a device and APNs.

The samples on this page use these imports:

```swift include=examples/Sources/Examples/Calling.swift#imports
```

## Start a call

```swift include=examples/Sources/Examples/Calling.swift#start-call
```

Starting, joining, connecting and capturing are separate steps. `startVoice()` or `startVideo()` starts the call, and `ready()` returns its handle once it can be joined, waiting up to 45 seconds by default. `join()` reserves this device's place in the call, and `connect(.liveKit(...))` connects its media through LiveKit with a single-use admission. Nothing is captured until you turn on the microphone or camera.

Ringing gives each principal you ring a `notification.call` webhook event, which your backend turns into a push notification, as the [push notifications quickstart](push.md) shows. A ring isn't an invitation: any member of the conversation can join the call.

## Join a call

```swift include=examples/Sources/Examples/Calling.swift#join-call
```

- Each connection's credential admits it once, and concurrent `connect` calls share one attempt. If media can't connect, `connect` throws `MEDIA_CONNECT_FAILED` and keeps this device's place: connect again, or leave, as `joinCall` does.
- When the network drops, LiveKit resumes the connection while its token allows. `onResuming` and `onResumed` run around the resume, and `media.resuming` is true meanwhile. When the connection drops for good, `onDisconnected` runs: call `media.reconnect()`, which connects again with fresh credentials and returns a new connection, then turn the microphone and camera on again on it.
- `participation.snapshot.permissions` says what this participant may publish. A voice call, started with `startVoice()`, never allows the camera.
- Ask for microphone access, and camera access for video, before you turn them on. Your app's `Info.plist` needs `NSMicrophoneUsageDescription`, and for video `NSCameraUsageDescription`. `microphone(_:)` and `camera(_:)` throw when the call doesn't allow them or media isn't connected.

## Answer incoming calls

On iOS, `ConvoHopCalls` receives calls' VoIP pushes through PushKit and rings them in CallKit, as a phone call rings. Set it up in your app delegate:

```swift include=examples/Sources/Examples/IncomingCalls.swift#incoming-imports
```

```swift include=examples/Sources/Examples/IncomingCalls.swift#incoming-calls
```

- Start `ConvoHopCalls` in `application(_:didFinishLaunchingWithOptions:)`. iOS can launch your app for a VoIP push, and terminates an app that doesn't report each VoIP push to CallKit, so `ConvoHopCalls` reports every one: a push that it doesn't ring for, such as one for another user, is reported and ended at once.
- Your app needs the Voice over IP background mode and the Push Notifications capability.
- `recipient` is stored in the ledger's App Group suite, so it holds when iOS launches your app for a VoIP push. Until you set one, every call rings. Name the suite that your Notification Service Extension's ledger uses, as the [push notifications quickstart](push.md#message-previews) describes.
- `didUpdateVoIPToken` gives the device's PushKit token, which differs from the token that your app [registers for alert pushes](push.md#register-the-device). Send it to your backend as a registration of its own, `{"kind":"apnsVoip","token":"…"}` with the token in lowercase hexadecimal, and delete that registration when the token is nil. Your backend builds the calls' VoIP pushes for it with `apnsVoip`, as the [Java and Kotlin push quickstart](../../jvm/quickstarts/push.md#apns) shows.
- CallKit shows the push's title as the caller, such as the caller's name that your backend gave the push. To show another name, pass a `callerName` closure in the configuration, which gets each call's push as a `ConvoHopNotification`. The configuration also sets the ringtone, and the icon of the in-call button that opens your app.

When the user answers, `didAnswer` runs. Join the call from there:

```swift include=examples/Sources/Examples/IncomingCalls.swift#answer
```

- `didAnswer` runs whether the user answers in the system's call UI or in your app through `ConvoHopCalls.shared.answer(_:)`. Report `reportConnecting` and `reportConnected` as media connects, and end the call as `.failed` if it can't.
- The user can answer a call that launched your app. When your app starts with a user signed in, connect their client and pass it to `signedIn` as soon as it launches: until then, the sample ends the calls that the user answers.
- CallKit owns the call's audio session. `ConvoHopCallKitAudio.prepare()`, called at launch before any room connects, stops LiveKit from configuring the session itself. `didActivate` and `didDeactivate` then start and stop LiveKit's audio engine through `ConvoHopCallKitAudio`, so audio flows once CallKit activates the session.
- `didSetMuted` is the only place to mute. Both the system UI and `ConvoHopCalls.shared.setMuted(_:for:)` lead there.
- `didEnd` runs however the call ended, in CallKit or through `ConvoHopCalls.shared.end(_:reason:)`, with a nil reason when the user ended or declined it. Leave the call there.
- To show a call that your app started in CallKit too, start it with ConvoHop, then call `ConvoHopCalls.shared.startOutgoingCall(liveSessionId:conversationId:)`. `didStartOutgoing` follows.

A ring that the user answered or declined on another device gets no push. Pass `stopRings` the events of each conversation that the user can be called in, for example from `client.watch`'s `apply`:

```swift include=examples/Sources/Examples/IncomingCalls.swift#ring-stop
```

`client.ringStopReason(alert)` asks ConvoHop whether the ring stopped for the user: `.expired`, `.ended` or `.answered`, or nil while it still rings. `ConvoHopCalls.shared.end(_:reason:)` then ends the ringing call with that reason, and records the stop in the ledger, so a late push for the same ring doesn't ring again. `ConvoHopCalls` stops a ring at its `expiresAt` by itself. When a ConvoHop push reaches your app outside PushKit, such as an alert push, parse it with `ConvoHopNotification.parse(userInfo:)` and pass it to `ConvoHopCalls.shared.handle(_:)`. A call rings in CallKit unless it already rang, stopped or expired, and a cancellation ends the ringing call, records the stop and removes the ring's delivered notifications.

## Show video

```swift include=examples/Sources/Examples/Calling.swift#video
```

`media.liveKitRoom` is LiveKit's `Room`. Render its participants' video tracks with LiveKit's views, such as `SwiftUIVideoView` or `VideoView`. Don't connect, disconnect or publish on it yourself: turn capture on and off through the connection. A reconnect replaces the connection and its room, so read `liveKitRoom` again from the connection that `reconnect()` returns. `camera(true)` turns this device's camera on, in a video call.

## Leave or end a call

```swift include=examples/Sources/Examples/Calling.swift#end-call
```

Leaving ends this device's participation, and the call goes on for everyone else. Ending stops it for everyone: `completed()` returns once ConvoHop has cut off everyone's media, checking every half second for up to 45 seconds by default. If it times out, it throws `ConvoHopError` with the code `RESOLUTION_REQUIRED`, and the end may still complete: call `end()` on the live session again, which resends the recorded end under its original request ID, and wait again.

## Next steps

- [Push notifications quickstart](push.md): ring members whose app isn't open.
- [`MediaConnection` reference](../reference/convohop.md#mediaconnection-class): capture, resumes and reconnects.
- [`LiveSessionHandle` reference](../reference/convohop.md#livesessionhandle-class): joining, ringing and ending calls.
- [`ConvoHopCalls` reference](../reference/calls.md#convohopcalls-class): ringing calls in CallKit, answers, mutes and holds.
- [`LiveKitMediaRoom` reference](../reference/livekit.md#livekitmediaroom-class): LiveKit's room, and CallKit audio.
