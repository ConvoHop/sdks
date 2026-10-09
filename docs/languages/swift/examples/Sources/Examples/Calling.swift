// Calling quickstart snippets. CI compiles them for macOS and iOS but doesn't run them, because calls need a ConvoHop
// project with calls and a LiveKit media server.

// #region imports
import ConvoHop
import ConvoHopLiveKit
// #endregion imports

// #region start-call
// Starts a voice call in the conversation, joins it and rings other members.
func startCall(_ client: ConvoHopClient, in conversationId: String, ringing principalIds: [String]) async throws
    -> MediaConnection
{
    let live = try await client.conversation(conversationId).live.startVoice().ready() // startVideo() for video.
    let media = try await joinCall(live)
    // Each member you ring gets a notification.call webhook event, which your backend turns into a push.
    _ = try await live.alerts.send(principalIds)
    return media
}
// #endregion start-call

// #region join-call
// Joins the conversation's current call, or returns nil when there's none. A ring isn't required.
func joinCurrentCall(_ client: ConvoHopClient, in conversationId: String) async throws -> MediaConnection? {
    guard let live = try await client.conversation(conversationId).live.current() else { return nil }
    return try await joinCall(live)
}

func joinCall(_ live: LiveSessionHandle) async throws -> MediaConnection {
    let participation = try await live.join() // Reserves this device's place in the call.
    do {
        // Connected and receiving. Nothing is captured yet.
        return try await participation.connect(
            .liveKit(
                onDisconnected: { print("The call's media disconnected") },
                onResuming: { print("Reconnecting to the call") },
                onResumed: { print("Reconnected to the call") }
            ))
    } catch {
        _ = try? await participation.leave() // Gives the place back.
        throw error
    }
}

// Turns on what the call allows. Ask for microphone access first, and camera access for video.
func startCapture(_ media: MediaConnection) async throws {
    let allowed = media.participation.snapshot.permissions
    if allowed.microphone { try await media.microphone(true) }
    if allowed.camera { try await media.camera(true) } // A voice call never allows the camera.
}
// #endregion join-call

// #region video
// Starts a video call. media.liveKitRoom is LiveKit's Room: render its participants' video tracks with LiveKit's
// views.
func startVideoCall(_ client: ConvoHopClient, in conversationId: String) async throws -> MediaConnection {
    let live = try await client.conversation(conversationId).live.startVideo().ready()
    let media = try await joinCall(live)
    try await startCapture(media) // A video call allows the camera.
    return media
}
// #endregion video

// #region end-call
// Leaves the call on this device. Everyone else stays in it.
func leaveCall(_ media: MediaConnection) async throws {
    await media.disconnect()
    _ = try await media.participation.leave()
}

// Ends the call for everyone.
func endCall(_ media: MediaConnection) async throws {
    let live = media.participation.live
    try await leaveCall(media)
    _ = try await live.end().action.completed() // Returns once ConvoHop has cut off everyone's media.
}
// #endregion end-call
