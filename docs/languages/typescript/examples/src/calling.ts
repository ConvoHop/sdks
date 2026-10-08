// Calling quickstart snippets. They need a browser and real WebRTC, so the tests only typecheck them.

// #region start-call
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
// #endregion start-call

// #region join-call
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
// #endregion join-call

// #region end-call
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
// #endregion end-call
