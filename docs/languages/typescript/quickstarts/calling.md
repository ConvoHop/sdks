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

## Calls in React

With `@convohop/react`, inside the provider that the [client quickstart](client.md#use-react) sets up:

```tsx include=examples/src/react.tsx#call
```

`useLiveSession` loads the conversation's current call, or `null` when there's none. It reloads on the call events that a mounted `useConversation` for the same conversation receives. Without one, call `live.refresh()`, for example when a call notification arrives.

`useMediaConnection` connects with `livekit-client`, and shows the connection's `status` and remote `tracks`. Call `connect` and `reconnect` from clicks, never from an effect: each attempt spends a single-use admission, and React's StrictMode runs effects twice. Unmounting disconnects the media, but doesn't leave the call.

## Connect your own LiveKit Room

`connect` creates and manages the LiveKit connection for you. To manage a `livekit-client` `Room` yourself, for example to use LiveKit's UI components, connect with `connectWith`:

```ts include=examples/src/calling.ts#connect-with
```

The SDK gets a single-use token for this device's participation, then calls your function once with it. The token admits one new connection to `attempt.url`, and expires about 60 seconds after issue. LiveKit resumes a dropped connection on its own, but a new connection needs a new `connectWith`.

- `connected` must stay true while LiveKit resumes the connection: `connectWith` refuses to start another connection while one is connected.
- If your function throws, this device keeps its place in the call, and the next `connectWith` settles the failed attempt before it starts another.

## Next steps

- [Push notifications quickstart](push.md): ring members whose app isn't open.
- [`LiveParticipationHandle` reference](../reference/client.md#liveparticipationhandle-class): join, connect, leave and end.
- [`@convohop/react` reference](../reference/react.md): `useLiveSession` and `useMediaConnection`.
