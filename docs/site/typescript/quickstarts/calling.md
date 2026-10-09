# TypeScript calling quickstart

Add voice and video calls to a conversation with `@convohop/client`: start a call and ring other members, join the current call, and leave or end it.

## Before you start

Calls need a browser with WebRTC, and a client connected with the user's session, as the [client quickstart](client.md) shows. CI typechecks these samples but doesn't run them, because they need real media.

## Start a call

```ts snippet=docs/languages/typescript/examples/src/calling.ts#start-call
import type {
  ConvoHopClient,
  LiveParticipationHandle,
  LiveSessionHandle,
  MediaConnection,
  RemoteMedia,
} from "@convohop/client";

// Your call screen.
export interface CallView {
  localVideo: HTMLVideoElement; // Shows this device's camera.
  addRemote(media: RemoteMedia): void; // media.element is an <audio> or <video> element to attach.
  removeRemote(media: RemoteMedia): void;
  showDisconnected(): void;
  showEnableAudio(): void; // The browser blocked autoplay. Call connection.enableAudio() from a click.
  showCaptureFailed(error: unknown): void; // For example, the user denied the microphone.
}

export interface Call {
  participation: LiveParticipationHandle;
  connection: MediaConnection;
}

// Starts a video call in a conversation and joins it.
export async function startCall(client: ConvoHopClient, conversationId: string, view: CallView): Promise<Call> {
  const start = await client.conversation(conversationId).live.startVideo(); // startVoice() for audio only.
  const session = await start.ready(); // The call can be joined. Nothing is captured yet.
  return joinCall(session, view);
}

// Rings other members' devices. Each gets a notification.call webhook event for your push sender.
export async function ring(call: Call, principalIds: string[]): Promise<void> {
  await call.participation.live.alerts.send(principalIds);
}
```

Starting, joining, connecting and capturing are separate steps. `ready()` resolves when the call can be joined. `join` reserves this device's place in the call, `connect` starts receiving media, and nothing is captured until you turn on the microphone or camera.

Ringing gives each principal you ring a `notification.call` webhook event, which your backend turns into a push notification, as the [push notifications quickstart](push.md) shows. A ring isn't an invitation: any member of the conversation can join the call.

## Join a call

```ts snippet=docs/languages/typescript/examples/src/calling.ts#join-call
// Any member can join the conversation's current call. A ring isn't required.
export async function answerCall(client: ConvoHopClient, conversationId: string, view: CallView): Promise<Call | null> {
  const session = await client.conversation(conversationId).live.current();
  return session ? joinCall(session, view) : null;
}

export async function joinCall(session: LiveSessionHandle, view: CallView): Promise<Call> {
  const participation = await session.join();
  let connection: MediaConnection;
  try {
    connection = await participation.connect({
      localVideo: view.localVideo,
      onTrack: media => view.addRemote(media),
      onTrackRemoved: media => view.removeRemote(media),
      onDisconnected: () => view.showDisconnected(),
      onAudioPlaybackBlocked: () => view.showEnableAudio(),
    }); // Connected, receiving only.
  } catch (error) {
    await participation.leave(); // A failed connect keeps your place in the call until you retry or leave.
    throw error;
  }
  try {
    // A voice call doesn't allow the camera. Each call asks the user for permission, then publishes.
    const allowed = participation.snapshot.permissions;
    if (allowed.microphone) await connection.microphone(true);
    if (allowed.camera) await connection.camera(true);
  } catch (error) {
    view.showCaptureFailed(error); // Still in the call, receiving. Let the user retry from a button.
  }
  return { participation, connection };
}
```

- A failed `connect` keeps this device's place in the call. Retry it, or leave as the sample does.
- `snapshot.permissions` says what this participant may publish. A voice call, started with `startVoice()`, never allows the camera.
- `microphone(true)` and `camera(true)` start capturing, which can prompt the user for permission. If capture fails, for example because the user denied it, the call goes on, receiving only.
- When the browser blocks autoplay, call `connection.enableAudio()` from a click.

## Leave or end a call

```ts snippet=docs/languages/typescript/examples/src/calling.ts#end-call
// Leaves the call on this device. Everyone else stays in it.
export async function leaveCall(call: Call): Promise<void> {
  await call.participation.leave(); // Disconnects the media first.
}

// Ends the call for everyone.
export async function endCall(call: Call): Promise<void> {
  await call.participation.leave();
  const ending = await call.participation.live.end();
  await ending.completed(); // Resolves once the authority has cut off everyone's media.
}
```

Leaving ends this device's participation, and the call goes on for everyone else. Ending stops it for everyone: `completed()` resolves once the authority has cut off everyone's media.

## Calls in React

With `@convohop/react`, inside the provider that the [client quickstart](client.md#use-react) sets up:

```tsx snippet=docs/languages/typescript/examples/src/react.tsx#call
import { useCallback } from "react";
import type { LiveParticipationHandle, LiveSessionHandle } from "@convohop/client";
import { useConvoHopClient, useLiveSession, useMediaConnection } from "@convohop/react";

// Starts, joins and leaves a conversation's call. Mount it beside the conversation's Thread: useLiveSession reloads
// on the call events that useConversation receives.
export function CallPanel({ conversationId }: { conversationId: string }) {
  const client = useConvoHopClient();
  const live = useLiveSession(conversationId);
  const media = useMediaConnection();
  const [participation, setParticipation] = useState<LiveParticipationHandle>();

  // Run these from clicks, never from an effect: each connect spends a single-use admission.
  const join = async (session: LiveSessionHandle) => {
    const joined = await session.join();
    setParticipation(joined);
    const connection = await media.connect(joined); // Receiving only.
    if (joined.snapshot.permissions.microphone) await connection.microphone(true); // Asks for permission.
  };
  const start = async () => {
    const started = await client.conversation(conversationId).live.startVoice();
    await join(await started.ready());
  };
  const leave = async (current: LiveParticipationHandle) => {
    await current.leave(); // Disconnects the media first. The call goes on for everyone else.
    setParticipation(undefined);
  };

  if (!participation) {
    const session = live.session;
    if (session === undefined) return null; // Still loading.
    return session ? (
      <button onClick={() => join(session).catch(showError)}>Join the call</button>
    ) : (
      <button onClick={() => start().catch(showError)}>Start a call</button>
    );
  }
  return (
    <section>
      {media.tracks.map(track => (
        <Media key={track.trackId} element={track.element} />
      ))}
      {media.audioBlocked && <button onClick={() => media.enableAudio().catch(showError)}>Play audio</button>}
      {media.status === "disconnected" && <button onClick={() => media.reconnect().catch(showError)}>Reconnect</button>}
      {media.status === "failed" && <button onClick={() => media.connect(participation).catch(showError)}>Retry</button>}
      <button onClick={() => leave(participation).catch(showError)}>Leave</button>
    </section>
  );
}

// Shows one remote track: track.element is an audio or video element.
function Media({ element }: { element: HTMLMediaElement }) {
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      node?.append(element);
    },
    [element],
  );
  return <div ref={attach} />;
}

function showError(error: unknown) {
  console.error("The call failed", error);
}
```

`useLiveSession` loads the conversation's current call, or `null` when there's none. It reloads on the call events that a mounted `useConversation` for the same conversation receives. Without one, call `live.refresh()`, for example when a call notification arrives.

`useMediaConnection` connects with `livekit-client`, and shows the connection's `status` and remote `tracks`. Call `connect` and `reconnect` from clicks, never from an effect: each attempt spends a single-use admission, and React's StrictMode runs effects twice. Unmounting disconnects the media, but doesn't leave the call.

## Connect your own LiveKit Room

`connect` creates and manages the LiveKit connection for you. To manage a `livekit-client` `Room` yourself, for example to use LiveKit's UI components, connect with `connectWith`:

```ts snippet=docs/languages/typescript/examples/src/calling.ts#connect-with
import { ConnectionState, Room } from "livekit-client";

// The connection connectWith resolves with: your LiveKit Room, and what the SDK needs to know about it.
export interface NativeConnection {
  readonly room: Room;
  readonly connected: boolean;
  disconnect(): Promise<void>;
}

// Connects a participation's media with your own LiveKit Room, as on React Native. Call it again after the Room
// disconnects: the SDK asks for a new connection that replaces the old one.
export function connectNative(participation: LiveParticipationHandle): Promise<NativeConnection> {
  return participation.connectWith(async attempt => {
    // attempt.token is single-use and expires about 60 seconds after issue. Use it once, now, and only with
    // attempt.url. Never store or log it.
    const room = new Room();
    await room.connect(attempt.url, attempt.token);
    return {
      room,
      // Stays true while LiveKit resumes the connection, so the SDK doesn't open a second one.
      get connected() {
        return room.state !== ConnectionState.Disconnected;
      },
      disconnect: () => room.disconnect(),
    };
  });
}
```

The SDK gets a single-use token for this device's participation, then calls your function once with it. The token admits one new connection to `attempt.url`, and expires about 60 seconds after issue. LiveKit resumes a dropped connection on its own, but a new connection needs a new `connectWith`.

- `connected` must stay true while LiveKit resumes the connection: `connectWith` refuses to start another connection while one is connected.
- If your function throws, this device keeps its place in the call, and the next `connectWith` settles the failed attempt before it starts another.

## Next steps

- [Push notifications quickstart](push.md): ring members whose app isn't open.
- [`LiveParticipationHandle` reference](../reference/client.md#liveparticipationhandle-class): join, connect, leave and end.
- [`@convohop/react` reference](../reference/react.md): `useLiveSession` and `useMediaConnection`.
