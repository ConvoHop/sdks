// Calling quickstart snippets for incoming calls, which ring through PushKit and CallKit on iOS only. CI builds them for
// iOS but doesn't run them, because they need a device, APNs and real media.

#if os(iOS)
// #region incoming-imports
import AVFoundation
import ConvoHop
import ConvoHopCalls
import ConvoHopLiveKit
import UIKit
// #endregion incoming-imports

// #region incoming-calls
// Your app delegate. iOS can launch your app for a VoIP push, so start ConvoHopCalls as your app launches.
final class AppDelegate: NSObject, UIApplicationDelegate, ConvoHopCallsDelegate {
    private var client: ConvoHopClient?
    private var media: MediaConnection?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        try? ConvoHopCallKitAudio.prepare()
        // The App Group suite that your Notification Service Extension's ledger uses too.
        ConvoHopCalls.shared.start(
            configuration: ConvoHopCallsConfiguration(ledgerSuiteName: "group.com.example.chat"), delegate: self)
        return true
    }

    // At sign-in. Until you set a recipient, every call rings.
    func signedIn(_ client: ConvoHopClient) {
        self.client = client
        ConvoHopCalls.shared.recipient = .only(projectId: client.projectId, recipientId: client.principalId)
    }

    // At sign-out. Your backend can still hold the device's VoIP token, but its calls no longer ring.
    func signedOut() {
        client = nil
        ConvoHopCalls.shared.recipient = .nobody
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didUpdateVoIPToken token: Data?) {
        // Send ["kind": "apnsVoip", "token": ConvoHopPushToken.hex(token)] to your backend, or delete the
        // registration when token is nil.
    }
}
// #endregion incoming-calls

// #region answer
extension AppDelegate {
    // The user answered. Join the call and connect its media, or end the call if that fails.
    func convoHopCalls(_ calls: ConvoHopCalls, didAnswer call: ConvoHopCall) {
        guard let client else {
            Task { try? await calls.end(call.uuid, reason: .failed) } // Nobody is signed in to join it.
            return
        }
        Task {
            do {
                let live = try await client.liveSession(call.liveSessionId)
                calls.reportConnecting(call.uuid)
                let media = try await joinCall(live)
                self.media = media
                // Audio flows once CallKit activates the audio session, before or after this.
                try await media.microphone(true)
                calls.reportConnected(call.uuid)
            } catch {
                try? await calls.end(call.uuid, reason: .failed)
            }
        }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didActivate audioSession: AVAudioSession) {
        try? ConvoHopCallKitAudio.activate(audioSession)
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didDeactivate audioSession: AVAudioSession) {
        try? ConvoHopCallKitAudio.deactivate()
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didSetMuted muted: Bool, for call: ConvoHopCall) {
        Task { try? await media?.microphone(!muted) }
    }

    // The call ended, in CallKit or through ConvoHopCalls.shared.end.
    func convoHopCalls(_ calls: ConvoHopCalls, didEnd call: ConvoHopCall, reason: ConvoHopCallEndReason?) {
        guard let media else { return }
        self.media = nil
        Task { try? await leaveCall(media) }
    }
}
// #endregion answer

// #region ring-stop
// A ring answered or declined on another device gets no push. Pass it the events of each conversation that the user
// can be called in, for example from client.watch's apply.
@MainActor
func stopRings(after events: [Event], client: ConvoHopClient) async {
    guard events.contains(where: { $0.type == "live.participationChanged" || $0.type == "live.ended" }) else { return }
    for call in ConvoHopCalls.shared.calls where call.state == .ringing {
        guard let alert = call.alert, let reason = try? await client.ringStopReason(alert) else { continue }
        try? await ConvoHopCalls.shared.end(call.uuid, reason: reason)
    }
}
// #endregion ring-stop
#endif
