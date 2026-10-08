# TypeScript calling quickstart

Add voice and video calls to a conversation with `@convohop/client`: start a call and ring other members, join the current call, and leave or end it.

## Before you start

Calls need a browser with WebRTC, and a client connected with the user's session, as the [client quickstart](client.md) shows. CI typechecks these samples but doesn't run them, because they need real media.

## Start a call

```ts include=examples/src/calling.ts#start-call
```

Starting, joining, connecting and capturing are separate steps. `ready()` resolves when the call can be joined. `join` reserves this device's place in the call, `connect` starts receiving media, and nothing is captured until you turn on the microphone or camera.

Ringing gives each principal you ring a `notification.call` webhook event, which your backend turns into a push notification, as the [push notifications quickstart](push.md) shows. A ring isn't an invitation: any member of the conversation can join the call.

## Join a call

```ts include=examples/src/calling.ts#join-call
```

- A failed `connect` keeps this device's place in the call. Retry it, or leave as the sample does.
- `snapshot.permissions` says what this participant may publish. A voice call, started with `startVoice()`, never allows the camera.
- `microphone(true)` and `camera(true)` start capturing, which can prompt the user for permission. If capture fails, for example because the user denied it, the call goes on, receiving only.
- When the browser blocks autoplay, call `connection.enableAudio()` from a click.

## Leave or end a call

```ts include=examples/src/calling.ts#end-call
```

Leaving ends this device's participation, and the call goes on for everyone else. Ending stops it for everyone: `completed()` resolves once the authority has cut off everyone's media.

## Next steps

- [Push notifications quickstart](push.md): ring members whose app isn't open.
- [`LiveParticipationHandle` reference](../reference/client.md#liveparticipationhandle-class): join, connect, leave and end.
