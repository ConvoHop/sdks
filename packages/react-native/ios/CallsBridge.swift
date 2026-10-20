internal import RelayCalls
internal import RelayPush
import Foundation

/// React Native plumbing, not app API: the Swift half of the `RelayCalls` TurboModule. `RelayCallsModule.mm`
/// calls it on the main thread.
@MainActor
@objc(RelayCallsBridge)
public final class RelayCallsBridge: NSObject, PromiseOwner {
    weak var emitter: (any RelayCallsEmitter)?
    private(set) var isInvalidated = false

    nonisolated override public init() {
        super.init()
    }

    /// Starts emitting to `emitter`, once React Native has set its event callback.
    @objc(attachEmitter:)
    public func attach(_ emitter: any RelayCallsEmitter) {
        guard !isInvalidated else { return }
        self.emitter = emitter
        Hub.shared.attach(self)
    }

    /// Stops emitting and settling promises: React Native is tearing the module down.
    @objc(invalidate)
    public func invalidate() {
        isInvalidated = true
        emitter = nil
    }

    @objc(getCalls:reject:)
    public func getCalls(
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        JSPromise(self, resolve, reject).resolve(Hub.shared.views())
    }

    @objc(forgetCall:resolve:reject:)
    public func forgetCall(
        _ callId: String, resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard let uuid = Validate.callUUID(callId) else {
            promise.resolve(false)
            return
        }
        promise.resolve(RelayCalls.shared.forget(uuid))
    }

    @objc(startOutgoingCall:conversationId:handle:displayName:hasVideo:resolve:reject:)
    public func startOutgoingCall(
        _ liveSessionId: String, conversationId: String, handle: String, displayName: String?, hasVideo: Bool,
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard Hub.shared.isConfigured else {
            promise.reject(Code.notConfigured, Code.notConfiguredMessage)
            return
        }
        guard Validate.isUUID(liveSessionId), Validate.isUUID(conversationId), !handle.isEmpty,
            displayName?.isEmpty != true
        else {
            promise.reject(
                Code.invalidArgument,
                "liveSessionId and conversationId must be lowercase, non-nil UUIDs, and handle and displayName non-empty strings"
            )
            return
        }
        Task {
            do {
                let uuid = try await RelayCalls.shared.startOutgoingCall(
                    liveSessionId: liveSessionId, conversationId: conversationId, handle: handle,
                    displayName: displayName, hasVideo: hasVideo)
                promise.resolve(uuid.uuidString.lowercased())
            } catch {
                promise.reject(callKit: error)
            }
        }
    }

    @objc(answerCall:resolve:reject:)
    public func answerCall(
        _ callId: String, resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard let uuid = Validate.callUUID(callId) else {
            promise.reject(Code.callNotFound, "No call \(callId)")
            return
        }
        Task {
            do {
                try await RelayCalls.shared.answer(uuid)
                promise.resolve()
            } catch {
                promise.reject(callKit: error, id: callId, stateMessage: "Only a ringing call can be answered")
            }
        }
    }

    /// Declines a ringing call or hangs up any other. A call that already ended, or that CallKit can't end, stays as
    /// it is, so this always resolves.
    @objc(endCall:resolve:reject:)
    public func endCall(
        _ callId: String, resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard let uuid = Validate.callUUID(callId), Hub.shared.call(uuid)?.isEnded == false else {
            promise.resolve()
            return
        }
        Task {
            try? await RelayCalls.shared.end(uuid)
            promise.resolve()
        }
    }

    /// Stops a ring as the server's cancellation push would. A call that isn't ringing stays as it is.
    @objc(stopRinging:serverReason:resolve:reject:)
    public func stopRinging(
        _ callId: String, serverReason: String, resolve: @escaping (Any?) -> Void,
        reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard Validate.isIdentifier(serverReason) else {
            promise.reject(Code.invalidArgument, "serverReason must be an identifier, such as answered")
            return
        }
        guard let uuid = Validate.callUUID(callId) else {
            promise.resolve()
            return
        }
        Task {
            if Hub.shared.call(uuid)?.state == .ringing {
                let reason = RelayCallEndReason(rawValue: serverReason)
                if reason == .expired { Hub.shared.serverExpired.insert(uuid) }
                try? await RelayCalls.shared.end(uuid, reason: reason)
            }
            promise.resolve()
        }
    }

    @objc(reportConnecting:resolve:reject:)
    public func reportConnecting(
        _ callId: String, resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard let uuid = answered(callId, promise) else { return }
        // A connected call stays connected.
        if Hub.shared.call(uuid)?.state != .connected { RelayCalls.shared.reportConnecting(uuid) }
        promise.resolve()
    }

    @objc(reportConnected:resolve:reject:)
    public func reportConnected(
        _ callId: String, resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard let uuid = answered(callId, promise) else { return }
        RelayCalls.shared.reportConnected(uuid)
        promise.resolve()
    }

    @objc(updateCall:callerName:hasVideo:resolve:reject:)
    public func updateCall(
        _ callId: String, callerName: String?, hasVideo: NSNumber?, resolve: @escaping (Any?) -> Void,
        reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard callerName?.isEmpty != true else {
            promise.reject(Code.invalidArgument, "callerName must be a non-empty string and hasVideo a boolean")
            return
        }
        guard let uuid = live(callId, promise) else { return }
        RelayCalls.shared.update(uuid, localizedCallerName: callerName, hasVideo: hasVideo?.boolValue)
        promise.resolve()
    }

    @objc(setMuted:muted:resolve:reject:)
    public func setMuted(
        _ callId: String, muted: Bool, resolve: @escaping (Any?) -> Void,
        reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard let uuid = live(callId, promise) else { return }
        Task {
            do {
                try await RelayCalls.shared.setMuted(muted, for: uuid)
                promise.resolve()
            } catch {
                promise.reject(callKit: error, id: callId, stateMessage: "CallKit can't change this call's mute now")
            }
        }
    }

    @objc(setHeld:held:resolve:reject:)
    public func setHeld(
        _ callId: String, held: Bool, resolve: @escaping (Any?) -> Void,
        reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        if Hub.shared.options?.supportsHolding == false {
            promise.reject(Code.unsupported, "Holding is off; set supportsHolding in RelayReactNative.Options")
            return
        }
        guard let uuid = answered(callId, promise, stateMessage: "Only an answered call can be held") else { return }
        Task {
            do {
                try await RelayCalls.shared.setHeld(held, for: uuid)
                promise.resolve()
            } catch {
                promise.reject(callKit: error, id: callId, stateMessage: "Only an answered call can be held")
            }
        }
    }

    /// The VoIP registration, or `null` until PushKit reports a token.
    @objc(getVoipToken:reject:)
    public func getVoipToken(
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        if let registration = Hub.shared.voipRegistration() {
            promise.resolve(registration)
        } else {
            promise.resolve(NSNull())
        }
    }

    @objc(isAudioSessionActive:reject:)
    public func isAudioSessionActive(
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        JSPromise(self, resolve, reject).resolve(Hub.shared.audioSessionActive)
    }

    /// The UUID of call `callId` unless it ended; otherwise rejects `promise`.
    private func live(_ callId: String, _ promise: JSPromise) -> UUID? {
        guard let uuid = Validate.callUUID(callId), let call = Hub.shared.call(uuid) else {
            promise.reject(Code.callNotFound, "No call \(callId)")
            return nil
        }
        guard !call.isEnded else {
            promise.reject(Code.callState, "The call ended")
            return nil
        }
        return uuid
    }

    /// The UUID of call `callId` once it's answered or outgoing, and until it ends; otherwise rejects `promise`.
    private func answered(
        _ callId: String, _ promise: JSPromise, stateMessage: String = "Only an answered call connects"
    ) -> UUID? {
        guard let uuid = Validate.callUUID(callId), let call = Hub.shared.call(uuid) else {
            promise.reject(Code.callNotFound, "No call \(callId)")
            return nil
        }
        switch call.state {
        case .ringing, .ended:
            promise.reject(Code.callState, stateMessage)
            return nil
        case .answered, .connecting, .connected:
            return uuid
        }
    }
}
