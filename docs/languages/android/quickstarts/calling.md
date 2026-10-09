# Android calling quickstart

Add voice and video calls to a conversation with `com.convohop:convohop-android`: start a call and ring other members, join the current call, answer incoming calls from a push, and leave or end a call.

## Before you start

Calls need a client connected with the user's session, as the [client quickstart](client.md) shows. They run on the LiveKit Android SDK 2.29.0, which the SDK brings in. To ring users whose app isn't open, set up the [push notifications quickstart](push.md) too. CI compiles these samples but doesn't run the calls, because they need real media. It runs the incoming-call screen, with faked pushes.

The samples on this page use these imports:

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Calling.kt#imports
```

## Start a call

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Calling.kt#start-call
```

Starting, joining, connecting and capturing are separate steps. `ready()` returns when the call can be joined. `join()` reserves this device's place in the call, and `ConvoHopCall.join` connects its media through LiveKit with a single-use admission. Nothing is captured until you turn on the microphone or camera.

Ringing gives each principal you ring a `notification.call` webhook event, which your backend turns into a push notification, as the [push notifications quickstart](push.md) shows. A ring isn't an invitation: any member of the conversation can join the call.

## Join a call

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Calling.kt#join-call
```

- `ConvoHopCall.join` owns the participation from then on: if media can't connect, it leaves the call and throws.
- When media drops, the call reconnects with fresh credentials. If it can't reconnect within 30 seconds, by default, it leaves the call. `phase` is a `StateFlow` of `CONNECTING`, `CONNECTED`, `RECONNECTING` or `ENDED`.
- `snapshot.permissions` says what this participant may publish. A voice call, started with `startVoice()`, never allows the camera.
- Request `RECORD_AUDIO`, and `CAMERA` for video, at runtime before you turn them on. If turning one on fails, it throws, and the call goes on without it.

## Answer incoming calls

A call's push rings on the device. On Android 8.0 and later, it rings through a self-managed `ConnectionService`, as a phone call does, with a full-screen incoming-call notification. Earlier versions ring with the notification alone. The notification opens your incoming-call screen:

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Calling.kt#incoming-screen
```

Declare the activity in your manifest, and set it as `incomingCallIntent`, as the [push notifications quickstart](push.md#configure-notifications) does. The SDK adds the call's alert ID to the screen's intent. `call()` returns calls that ended in the last 60 seconds too, so the screen checks that the call still rings.

`reject` stops the ring on this device only: ConvoHop has no decline operation, so nobody else is told and the call goes on. When the user answers, from your screen, the notification's Answer button or a headset or car through Android's Telecom, listeners get `onCallAnswered`. Join the call from there:

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Calling.kt#answer
```

- Call `answerCalls` from `Application.onCreate`, because the user can answer after Android restarted your process.
- `ConvoHopCall.answer` checks that the call is for the client's project and user, answers it if it still rings, joins the call and connects media. If that fails, the system call ends. Call it once per call.
- The call follows the system call: capture stays off while the system mutes or holds it, and when the system ends the call, it leaves. `ConvoHopNotifications.setAudioRoute` moves the call's audio, for example to the speaker.
- To open your in-call screen after the user answers from the notification, set `answeredCallIntent`.
- Android 14 lets the user or Google Play deny full-screen notifications, and calls then ring as heads-up notifications. Check `canUseFullScreenIntent()`, and open `fullScreenIntentSettings()` to ask the user to allow them.
- The SDK starts no foreground service. To keep a call going while your app is in the background, start your own [foreground service](https://developer.android.com/develop/background-work/services/fgs/service-types#phone-call) of type `phoneCall`, which needs the `FOREGROUND_SERVICE_PHONE_CALL` permission.

## Show video

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Calling.kt#video
```

Render the room's video tracks with LiveKit's views, such as `VideoTrackView`. A reconnect replaces the connection and its room, so read it again when `phase` returns to `CONNECTED`. `camera(true)` turns this device's camera on, in a video call.

## Leave or end a call

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Calling.kt#end-call
```

Leaving ends this device's participation, and the call goes on for everyone else. Ending stops it for everyone: `completed()` returns once ConvoHop has cut off everyone's media. If it times out, it throws `ConvoHopProblem` with the code `RESOLUTION_REQUIRED`, and the end may still complete: call `end()` on the live session again, which reuses the original request, and wait again.

## Next steps

- [Push notifications quickstart](push.md): ring members whose app isn't open.
- [`ConvoHopCall` reference](../reference/android.md#convohopcall-class): media, capture and reconnects.
- [`ConvoHopNotifications` reference](../reference/android-push.md#convohopnotifications-class): ringing calls, answers, holds and audio routes.
