// Calling quickstart snippets. A real call needs CallKit or Android's Telecom, LiveKit's native WebRTC and a ConvoHop
// project with calls, so test/calling.test.ts runs only joinCall, answerCalls and leaveCall, with stand-ins for the
// native modules, the client and LiveKit's audio session. The tests typecheck the rest.

// #region imports
import { AudioSession } from "@livekit/react-native";
import { ConnectionState, type Room } from "livekit-client";
import { AppState, Platform } from "react-native";
import { ConvoHopProblem, type ConvoHopClient, type LiveConnector, type LiveParticipationHandle } from "@convohop/client";
import {
  canUseFullScreenIntent,
  endCall,
  getCalls,
  onCallEvent,
  openFullScreenIntentSettings,
  reportConnected,
  reportConnecting,
  setMuted as setSystemMuted,
  startOutgoingCall,
  subscribeAnsweredCalls,
  watchRingingCalls,
  type Call,
} from "@convohop/react-native";
import { createRoom, createRoomConnector, type RoomConnection } from "@convohop/react-native/media";
// #endregion imports

// #region start-call
// Starts a voice call in a conversation, joins it and rings other members. If the conversation already has a call, it
// joins that one instead. title is what CallKit shows for the call, such as the conversation's name.
export async function startCall(
  client: ConvoHopClient,
  conversationId: string,
  title: string,
  ring: string[],
): Promise<JoinedCall> {
  const { liveSessionId, started } = await startOrFindCall(client, conversationId);
  const call = await joinCall(client, liveSessionId, await showOutgoingCall(liveSessionId, conversationId, title));
  if (started) {
    // Each member you ring gets a notification.call webhook event, which your backend turns into a push.
    await call.participation.live.alerts.send(ring).catch((error: unknown) => {
      console.warn("Couldn't ring", error); // The call goes on: members can still join it from the conversation.
    });
  }
  return call;
}

async function startOrFindCall(client: ConvoHopClient, conversationId: string) {
  const live = client.conversation(conversationId).live;
  try {
    const start = await live.startVoice(); // startVideo() for video.
    await start.completed(); // Waits until the call can be joined.
    return { liveSessionId: start.liveSessionId, started: true };
  } catch (error) {
    if (!(error instanceof ConvoHopProblem) || error.code !== "LIVE_SESSION_EXISTS") throw error;
    const current = await live.current(); // Someone else started a call here first.
    if (!current) throw error;
    return { liveSessionId: current.liveSessionId, started: false };
  }
}

// On iOS, CallKit gives each call its audio, so show the calls you start or join there too. Android shows none.
async function showOutgoingCall(liveSessionId: string, conversationId: string, title: string) {
  if (Platform.OS !== "ios") return undefined;
  const id = await startOutgoingCall({ liveSessionId, conversationId, handle: title });
  return { id, muted: false, state: "connecting" as const };
}
// #endregion start-call

// #region join-call
// A call that this device joined.
export interface JoinedCall {
  readonly participation: LiveParticipationHandle;
  // LiveKit's room. Render its video with @livekit/react-native's VideoTrack, but don't connect or disconnect it.
  readonly room: Room;
  readonly connector: LiveConnector<RoomConnection>;
  // The call in the system's call UI. Outgoing calls on Android have none.
  readonly system: SystemCall | undefined;
  muted: boolean; // Your app's mute, for a call without a system call.
  left: boolean;
}

// Joins a call and connects its media. systemCall is the call in the system's call UI, if it has one.
export async function joinCall(
  client: ConvoHopClient,
  liveSessionId: string,
  systemCall?: Pick<Call, "id" | "muted" | "state">,
): Promise<JoinedCall> {
  // Follows the system call first: the user can mute, hold or end it while the app joins.
  const system = systemCall && followSystemCall(systemCall);
  let participation: LiveParticipationHandle;
  try {
    const live = await client.liveSession(liveSessionId);
    participation = await live.join(); // Reserves this device's place in the call.
  } catch (error) {
    if (system) {
      system.stopFollowing();
      // Hangs up the system call. If that fails too, the app still gets the error that stopped the join.
      await endCall(system.id).catch((hangUpError: unknown) => console.warn("Couldn't hang up the call", hangUpError));
    }
    throw error;
  }
  const room = createRoom();
  const call: JoinedCall = {
    participation,
    room,
    // Connects each attempt with its single-use credentials. LiveKit resumes a dropped connection when it can, and
    // onDisconnected runs when it can't.
    connector: createRoomConnector(room, { onDisconnected: () => void reconnectCall(call) }),
    system,
    muted: false,
    left: false,
  };
  if (system) {
    system.onChange = () => {
      if (!system.ended) void microphone(call);
      else leaveCall(call).catch((error: unknown) => console.warn("Couldn't leave the call", error));
    };
  }
  try {
    if (Platform.OS === "android") await AudioSession.startAudioSession(); // On iOS, CallKit activates the audio.
    if (system) await reportConnecting(system.id); // Rejects if the user hung up meanwhile.
    await connect(call);
    if (system) await reportConnected(system.id);
    return call;
  } catch (error) {
    // Gives this device's place back and hangs up. If that fails too, the app still gets the error that stopped it.
    await leaveCall(call).catch((leaveError: unknown) => console.warn("Couldn't leave the call", leaveError));
    throw error;
  }
}

// Connects the call's media with fresh credentials, then turns the microphone on.
async function connect(call: JoinedCall): Promise<void> {
  await call.participation.connectWith(call.connector);
  await microphone(call);
}

// Connects again after LiveKit lost the connection. If that fails too, offer a button that calls this again, or leave.
export async function reconnectCall(call: JoinedCall): Promise<void> {
  if (call.left) return;
  try {
    await connect(call);
  } catch (error) {
    console.warn("Couldn't reconnect the call", error);
  }
}
// #endregion join-call

// #region mute
// The call in the system's call UI: CallKit on iOS, Telecom on Android. The user can mute, hold or end it there.
export interface SystemCall {
  readonly id: string;
  muted: boolean;
  held: boolean;
  ended: boolean;
  onChange: () => void; // joinCall sets it once it joined.
  stopFollowing: () => void;
}

function followSystemCall(call: Pick<Call, "id" | "muted" | "state">): SystemCall {
  const system: SystemCall = {
    id: call.id,
    muted: call.muted,
    held: call.state === "held",
    ended: call.state === "ended",
    onChange: () => {},
    stopFollowing: () => {},
  };
  system.stopFollowing = onCallEvent(({ call: changed }) => {
    if (changed.id !== system.id) return;
    system.muted = changed.muted;
    system.held = changed.state === "held";
    system.ended = changed.state === "ended";
    system.onChange();
  });
  return system;
}

// Turns the microphone on, or off while the call is muted or held. The first time, it asks the user for access.
async function microphone(call: JoinedCall): Promise<void> {
  const { participation, room, system } = call;
  if (call.left || room.state !== ConnectionState.Connected || !participation.snapshot.permissions.microphone) return;
  const muted = system ? system.muted || system.held : call.muted;
  try {
    await room.localParticipant.setMicrophoneEnabled(!muted);
  } catch (error) {
    console.warn("Couldn't turn the microphone on or off", error); // For example, the user denied access.
  }
}

// Your mute button. With a system call, the system's call UI shows the mute too, and its change applies it.
export async function setMuted(call: JoinedCall, muted: boolean): Promise<void> {
  if (call.system) return setSystemMuted(call.system.id, muted);
  call.muted = muted;
  await microphone(call);
}
// #endregion mute

// #region answer-call
// Joins each call the user answers, and stops rings that ended elsewhere. Start it after sign-in, and call the
// function it returns when the user signs out.
export function answerCalls(client: ConvoHopClient, onJoined: (call: JoinedCall) => void): () => void {
  let answering = true;
  // Replays the calls answered before it started, such as one answered on the lock screen as the app launched.
  const stopAnswering = subscribeAnsweredCalls(answered => {
    if (!answering) return;
    joinCall(client, answered.liveSessionId, answered).then(
      call => {
        // If the user signed out while the call joined, the app doesn't get it.
        if (!answering) leaveCall(call).catch((error: unknown) => console.warn("Couldn't leave the call", error));
        else onJoined(call);
      },
      (error: unknown) => console.warn("Couldn't join the call", error), // joinCall has already cleaned up.
    );
  });
  // iOS gets no push when a ring stops, so this checks the user's rings while a call rings.
  const stopWatching = watchRingingCalls(client, { onError: error => console.warn("Couldn't check a ring", error) });
  return () => {
    answering = false;
    stopAnswering();
    stopWatching();
  };
}
// #endregion answer-call

// #region full-screen
// Android 14 and later: whether incoming calls can open your full-screen call screen on a locked device. Without that,
// they ring as a heads-up notification. Users can turn it off, so this checks again whenever the app comes back.
export function watchFullScreenCalls(onChange: (allowed: boolean) => void): () => void {
  let stopped = false;
  const check = () => {
    canUseFullScreenIntent().then(
      allowed => {
        if (!stopped) onChange(allowed);
      },
      (error: unknown) => console.warn("Couldn't check full-screen calls", error),
    );
  };
  check();
  const subscription = AppState.addEventListener("change", state => {
    if (state === "active") check();
  });
  return () => {
    stopped = true;
    subscription.remove();
  };
}

// The button on your banner while it isn't allowed: opens the setting. Android only, because iOS always allows it.
export function allowFullScreenCalls(): Promise<void> {
  return openFullScreenIntentSettings();
}
// #endregion full-screen

// #region end-call
// Leaves the call on this device and hangs up its system call. Everyone else stays in the call. Each step runs even if
// an earlier one fails. Then it throws the first failure and logs the others: call leaveCall again.
export async function leaveCall(call: JoinedCall): Promise<void> {
  call.left = true;
  call.system?.stopFollowing();
  const failures: unknown[] = [];
  const failed = (error: unknown) => {
    failures.push(error);
  };
  if (call.system) await endCall(call.system.id).catch(failed);
  await call.participation.leave().catch(failed); // Disconnects the media first. A retry reuses its request.
  if (Platform.OS === "android") await AudioSession.stopAudioSession().catch(failed);
  for (const failure of failures.slice(1)) console.warn("Couldn't leave the call", failure);
  if (failures.length > 0) throw failures[0];
}

// Ends the call for everyone. Only the call's creator or a moderator can.
export async function endCallForEveryone(call: JoinedCall): Promise<void> {
  await leaveCall(call);
  const ending = await call.participation.live.end();
  await ending.completed(); // Resolves once ConvoHop has cut off everyone's media.
}
// #endregion end-call

// #region sign-out
// When the user signs out: call the function that answerCalls returned, leave the user's call, stop push as the push
// quickstart shows, then call this. Once the push recipient is cleared, the device ignores the user's ring
// cancellations, so a call that still rings would ring until it expires.
export async function endSystemCalls(): Promise<void> {
  for (const call of await getCalls()) {
    if (call.state !== "ended") await endCall(call.id);
  }
}
// #endregion sign-out
