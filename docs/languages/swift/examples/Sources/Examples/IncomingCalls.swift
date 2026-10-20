// Calling quickstart snippets for incoming calls, which ring through PushKit and CallKit on iOS only. CI builds them for
// iOS but doesn't run them, because they need a device, APNs and real media.

#if os(iOS)
// #region incoming-imports
import AVFoundation
import Relay
import RelayCalls
import RelayLiveKit
import UIKit
// #endregion incoming-imports

// #region incoming-calls
// Your app delegate. iOS can launch your app for a VoIP push, so start RelayCalls as your app launches.
final class AppDelegate: NSObject, UIApplicationDelegate, RelayCallsDelegate {
    private var client: RelayClient?
    private var media: MediaConnection?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        try? RelayCallKitAudio.prepare()
        // The App Group suite that your Notification Service Extension's ledger uses too.
        RelayCalls.shared.start(
            configuration: RelayCallsConfiguration(ledgerSuiteName: "group.com.example.chat"), delegate: self)
        return true
    }

    // At sign-in. Until you set a recipient, every call rings.
    func signedIn(_ client: RelayClient) {
        self.client = client
        RelayCalls.shared.recipient = .only(projectId: client.projectId, recipientId: client.principalId)
    }

    // At sign-out. Your backend can still hold the device's VoIP token, but its calls no longer ring.
    func signedOut() {
        client = nil
        RelayCalls.shared.recipient = .nobody
    }

    func relayCalls(_ calls: RelayCalls, didUpdateVoIPToken token: Data?) {
        // Send ["kind": "apnsVoip", "token": RelayPushToken.hex(token)] to your backend, or delete the
        // registration when token is nil.
    }
}
// #endregion incoming-calls

// #region answer
extension AppDelegate {
    // The user answered. Join the call and connect its media, or end the call if that fails.
    func relayCalls(_ calls: RelayCalls, didAnswer call: RelayCall) {
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

    func relayCalls(_ calls: RelayCalls, didActivate audioSession: AVAudioSession) {
        try? RelayCallKitAudio.activate(audioSession)
    }

    func relayCalls(_ calls: RelayCalls, didDeactivate audioSession: AVAudioSession) {
        try? RelayCallKitAudio.deactivate()
    }

    func relayCalls(_ calls: RelayCalls, didSetMuted muted: Bool, for call: RelayCall) {
        Task { try? await media?.microphone(!muted) }
    }

    // The call ended, in CallKit or through RelayCalls.shared.end.
    func relayCalls(_ calls: RelayCalls, didEnd call: RelayCall, reason: RelayCallEndReason?) {
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
func stopRings(after events: [Event], client: RelayClient) async {
    guard events.contains(where: { $0.type == "live.participationChanged" || $0.type == "live.ended" }) else { return }
    for call in RelayCalls.shared.calls where call.state == .ringing {
        guard let alert = call.alert, let reason = try? await client.ringStopReason(alert) else { continue }
        try? await RelayCalls.shared.end(call.uuid, reason: reason)
    }
}
// #endregion ring-stop
#endif
