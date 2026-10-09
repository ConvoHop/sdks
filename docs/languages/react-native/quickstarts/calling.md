# React Native calling quickstart

Add voice and video calls to a conversation with `@convohop/react-native`: start a call and ring other members, join it with LiveKit's React Native SDK, answer incoming calls from CallKit or Android's Telecom, and leave or end a call.

## Before you start

- A client connected with the user's session, as the [client quickstart](client.md#connect) shows. Incoming calls ring from the device's push registrations, so set up the [push notifications quickstart](push.md) too.
- `@livekit/react-native`, `@livekit/react-native-webrtc` and `livekit-client`, set up for each platform as LiveKit's [installation guide](https://github.com/livekit/client-sdk-react-native#installation) describes. Call `setupMedia`, below, instead of its `registerGlobals()`.
- On iOS, the Voice over IP and Audio background modes, `NSMicrophoneUsageDescription`, and `NSCameraUsageDescription` for video, as the package's README describes for [iOS](https://github.com/ConvoHop/sdks/blob/main/packages/react-native/README.md#ios).

The samples on this page use these imports:

```ts include=examples/src/calling.ts#imports
```

## Set up media

```ts include=examples/src/setup.ts#setup
```

`setupMedia` installs a secure `crypto.getRandomValues` and `crypto.randomUUID` where the runtime lacks them, and then LiveKit's globals, so it has to run before anything imports `livekit-client`. With `callKit: true`, LiveKit doesn't configure the iOS audio session: CallKit activates it for each call, and the SDK tells WebRTC when it does. Start every iOS call through CallKit, including the ones the user starts, or it has no audio. On Android, the samples start LiveKit's `AudioSession` before a call connects and stop it after the call.

## Start a call

```ts include=examples/src/calling.ts#start-call
```

Starting, joining, connecting and capturing are separate steps. `completed()` waits until the call can be joined, for up to 45 seconds by default. If the conversation already has a call, `startVoice()` throws `LIVE_SESSION_EXISTS`, and the sample joins the current call instead.

On iOS, `startOutgoingCall` reports the call to CallKit, which shows it with `title` and gives it its audio, and resolves the call's ID. Android shows no system call for a call that the user starts.

Ringing gives each principal you ring a `notification.call` webhook event, which your backend turns into a push notification, as the [TypeScript push notifications quickstart](../../typescript/quickstarts/push.md#build-and-send-the-requests) shows. Only the call's creator or a moderator can ring, so the sample rings only for a call it started. A ring isn't an invitation: any member of the conversation can join the call.

## Join a call

```ts include=examples/src/calling.ts#join-call
```

- `join()` reserves this device's place in the call. If you retry a join, pass the first attempt's `requestId` again, and keep it until the join succeeds.
- `createRoom()` creates a LiveKit room with the Web SDK's media policy: VP8 video at up to 320x240, 15 frames per second and 350 kbit/s, without simulcast.
- `connectWith` gets single-use credentials for each attempt, and `createRoomConnector` connects the room once with them. LiveKit resumes a dropped connection with the token that the media server refreshes. When it can't, `onDisconnected` runs, and `reconnectCall` connects again with new credentials. If reconnecting fails too, offer a button that calls `reconnectCall` again, or leave the call. If the first connection fails, the sample leaves.
- Connecting captures nothing. `microphone` turns the microphone on once the room connects, if `snapshot.permissions` allows it, and the first time, iOS or Android asks the user for access. A voice call, started with `startVoice()`, never allows the camera. In a call started with `startVideo()`, turn the camera on with `room.localParticipant.setCameraEnabled(true)`, and show video with `VideoTrack` from `@livekit/react-native`. Don't connect or disconnect the room yourself.
- With a system call, `joinCall` follows it before anything else, so it sees the user mute, hold or hang up while the call joins. `reportConnecting` and `reportConnected` show the call's progress in the system UI. They reject if the user hung up meanwhile, and the sample then leaves.

## Mute and hold

```ts include=examples/src/calling.ts#mute
```

- The user can mute, hold or end a call in the system's call UI, or from a headset or a car. The sample follows the system call's `changed` and `ended` events, and turns the microphone off while the call is muted or held.
- `setMuted` mutes the system call, and its `changed` event then turns the microphone off, so your app and the system agree. `setHeld` works the same way, and on iOS needs the `supportsHolding` option of `ConvoHopReactNative.configure`. A call that the user starts on Android has no system call, so the sample keeps that mute in the app.
- To move the call's audio, for example to the speaker, call `setAudioRoute` with one of the call's `availableAudioRoutes` on Android. On iOS, show the system route picker, such as LiveKit's `AudioSession.showAudioRoutePicker()`.

## Answer incoming calls

A call's push rings on the device, even while JavaScript isn't running: through CallKit on iOS, and on Android 8.0 and later through a self-managed `ConnectionService`, as a phone call does, with a full-screen incoming-call notification. Earlier Android versions ring with the notification alone. The user answers in the system UI, on the lock screen or from the notification, or in your app with `answerCall`. Join the calls that the user answers:

```ts include=examples/src/calling.ts#answer-call
```

- Start `answerCalls` once the user's client is connected. `subscribeAnsweredCalls` first replays the answered calls that are still current, so a call that the user answered before JavaScript started isn't lost. It calls back once for each call, and never for a call that the user starts.
- iOS gets no push when a ring stops, because iOS would make the app report it as a new call. While a call rings, `watchRingingCalls` lists the user's live alerts, and stops the ring once another of the user's devices answered it, the caller hung up or it expired. On Android, it also stops a ring whose cancellation push arrives late.
- `endCall` on a ringing call declines it on this device only. ConvoHop has no decline operation, so nobody else is told and the call goes on.

On Android 14 and later, incoming calls ring full screen only while the app may use full-screen intents:

```ts include=examples/src/calling.ts#full-screen
```

- Android 14 grants `USE_FULL_SCREEN_INTENT` only to calling and alarm apps, and users can revoke it. Without it, incoming calls ring as a heads-up notification. Show a banner while `watchFullScreenCalls` reports `false`, with a button that calls `allowFullScreenCalls`. iOS always resolves `true`.
- The full-screen intent opens your launch activity, or the `incomingCallIntent` of the options that you pass to `ConvoHopReactNative.configure`. Give that activity `showWhenLocked` and `turnScreenOn`, and answer there with `answerCall`. On a device locked with a PIN or another secure lock, the notification's Answer button asks the user to unlock first, so to answer without unlocking, the user answers on your full-screen screen.
- The SDK starts no foreground service. To keep a call going while your app is in the background on Android, start your own [foreground service](https://developer.android.com/develop/background-work/services/fgs/service-types#phone-call) of type `phoneCall`, which needs the `FOREGROUND_SERVICE_PHONE_CALL` permission.

## Leave or end a call

```ts include=examples/src/calling.ts#end-call
```

Leaving hangs up the system call and ends this device's participation, and the call goes on for everyone else. If `leave()` fails, call `leaveCall` again: it reuses the original request.

Ending stops the call for everyone, and only the call's creator or a moderator can end it. `completed()` returns once ConvoHop has cut off everyone's media. If it times out, it throws `ConvoHopProblem` with the code `RESOLUTION_REQUIRED`, and the end may still complete: call `end()` on the same live session again, which reuses the original request, and wait again. `REVISION_CONFLICT` means the call changed since `end()` read it: call `end` with a new `requestId`, which reads the call again. `LIVE_SESSION_CLOSED` means the call has already ended.

## Sign out

```ts include=examples/src/calling.ts#sign-out
```

When the user signs out, in this order:

1. Call the function that `answerCalls` returned, and leave the user's call.
2. Stop push, as the [push notifications quickstart](push.md#sign-out) shows.
3. Call `endSystemCalls`. With no push recipient, the device drops the pushes that would stop a ring, so a call that still rings would ring until it expires.
4. Sign the client out, as the [client quickstart](client.md#sign-out) shows.

## How the samples are tested

The calling samples need CallKit or Android's Telecom, LiveKit's native WebRTC and a ConvoHop project with calls, so CI only typechecks them, with `setupMedia`. No test starts, answers or connects a call.

## Next steps

- [Push notifications quickstart](push.md): register the device, so that calls ring when your app isn't open.
- [`LiveParticipationHandle` reference](../reference/client.md#liveparticipationhandle-class): joining, connecting and leaving a call.
- [`subscribeAnsweredCalls` reference](../reference/react-native.md#subscribeansweredcalls-function): the system's calls and their events.
- [`createRoomConnector` reference](../reference/media.md#createroomconnector-function): how a call's media connects and reconnects.
- [Example app](https://github.com/ConvoHop/sdks/blob/main/packages/react-native/example/README.md): chat, push notifications and calls in one app.
