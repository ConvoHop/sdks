import AVFoundation
internal import ConvoHopCalls
internal import ConvoHopPush
import Foundation
import UIKit
import UserNotifications

/// The process's ConvoHop state, shared by the modules of every React Native instance: the `ConvoHopCalls` delegate,
/// the APNs token, and the notification the user opened to launch the app.
@MainActor
final class Hub: ConvoHopCallsDelegate {
    static let shared = Hub()

    /// How long after the app first becomes active a notification the user opened can still arrive.
    private static let initialGrace = 1.0

    private(set) var options: ConvoHopReactNative.Options?
    var isConfigured: Bool { options != nil }

    private var callsBridges: [Weak<ConvoHopCallsBridge>] = []
    private var pushBridges: [Weak<ConvoHopPushBridge>] = []
    private var observation: ConvoHopCallsObservation?
    /// What JavaScript last saw of each call.
    private var lastSeen: [UUID: CallView] = [:]
    /// The `endReason` of each ended call, fixed when it ended.
    private var endReasons: [UUID: String] = [:]
    /// Ringing calls the server stopped as `expired`, rather than the local ring timeout.
    var serverExpired: Set<UUID> = []
    private var apnsToken: String?
    private(set) var audioSessionActive = false

    private var activatedAt: DispatchTime?
    private var activationObservers: [any NSObjectProtocol] = []
    private var heldOpened: String?
    private var initialTaken = false
    private var initialWaiters: [JSPromise] = []
    private var initialTimer: DispatchWorkItem?

    private init() {}

    func configure(_ options: ConvoHopReactNative.Options) {
        self.options = options
        let calls = ConvoHopCalls.shared
        calls.start(
            configuration: ConvoHopCallsConfiguration(
                supportsVideo: options.supportsVideo, supportsHolding: options.supportsHolding,
                includesCallsInRecents: options.includesCallsInRecents, ringtoneSound: options.ringtoneSound,
                iconTemplateImageData: options.iconTemplateImageData, ledgerSuiteName: options.appGroup),
            delegate: self)
        // React Native accepts no ConvoHop push until JavaScript sets a recipient. `start` loads the suite's.
        if calls.recipient == .any { calls.recipient = .nobody }
        if observation == nil { observation = calls.addObserver { Hub.shared.observe($0) } }
        NotificationCenterDelegate.shared.install()
        watchActivation()
    }

    // MARK: - Modules

    func attach(_ bridge: ConvoHopCallsBridge) {
        callsBridges.removeAll { $0.value == nil || $0.value === bridge }
        callsBridges.append(Weak(bridge))
    }

    func attach(_ bridge: ConvoHopPushBridge) {
        pushBridges.removeAll { $0.value == nil || $0.value === bridge }
        pushBridges.append(Weak(bridge))
    }

    private var callsEmitters: [any ConvoHopCallsEmitter] {
        callsBridges.compactMap { $0.value?.emitter }
    }

    private var pushEmitters: [any ConvoHopPushEmitter] {
        pushBridges.compactMap { $0.value?.emitter }
    }

    // MARK: - Calls

    func call(_ uuid: UUID) -> ConvoHopCall? {
        ConvoHopCalls.shared.calls.first { $0.uuid == uuid }
    }

    func views() -> [[String: Any]] {
        ConvoHopCalls.shared.calls.compactMap { view(of: $0)?.dictionary }
    }

    /// The JavaScript snapshot of `call`, or `nil` for a call JavaScript can't describe, such as one started with
    /// another live session ID format.
    private func view(of call: ConvoHopCall) -> CallView? {
        guard Validate.isUUID(call.liveSessionId) else { return nil }
        var view = CallView(
            id: call.uuid.uuidString.lowercased(), liveSessionId: call.liveSessionId, outgoing: call.isOutgoing,
            hasVideo: call.hasVideo, state: "connecting", muted: call.isMuted)
        if let alertId = call.alert?.alertId, Validate.isUUID(alertId) { view.alertId = alertId }
        if Validate.isUUID(call.conversationId) { view.conversationId = call.conversationId }
        if Validate.isIdentifier(call.mediaProfile) { view.mediaProfile = call.mediaProfile }
        view.callerName = call.callerName
        if let expiresAt = call.expiresAt {
            let milliseconds = (expiresAt.timeIntervalSince1970 * 1000).rounded()
            if milliseconds >= 0 && milliseconds <= 9_007_199_254_740_991 { view.expiresAtMs = milliseconds }
        }
        switch call.state {
        case .ringing:
            view.state = "ringing"
        case .ended(let reason):
            view.state = "ended"
            view.endReason =
                endReasons[call.uuid] ?? Self.endReason(reason, wasRinging: lastSeen[call.uuid]?.state == "ringing")
            view.serverReason = serverReason(call.uuid, reason)
        case .connected:
            view.state = call.isOnHold ? "held" : "active"
        case .answered, .connecting:
            view.state = call.isOnHold ? "held" : "connecting"
        }
        return view
    }

    private static func endReason(_ reason: ConvoHopCallEndReason?, wasRinging: Bool) -> String {
        guard let reason else { return wasRinging ? "rejected" : "hungUp" }
        switch reason {
        case .answered: return "answeredElsewhere"
        case .declined: return "declinedElsewhere"
        case .ended: return "missed"
        case .expired: return "expired"
        case .failed: return "failed"
        default: return "stopped"
        }
    }

    /// The server's reason for stopping a ring. `expired` is the server's only if it said so; the local ring timeout
    /// has no server reason.
    private func serverReason(_ uuid: UUID, _ reason: ConvoHopCallEndReason?) -> String? {
        guard let reason, reason != .failed else { return nil }
        if reason == .expired { return serverExpired.contains(uuid) ? "expired" : nil }
        return Validate.isIdentifier(reason.rawValue) ? reason.rawValue : nil
    }

    /// Emits `changed` and `ended`. `incoming`, `outgoing` and `answered` come from the delegate methods, which
    /// record what they emit, so the change they report isn't emitted twice.
    private func observe(_ calls: [ConvoHopCall]) {
        var present = Set<UUID>()
        for call in calls {
            present.insert(call.uuid)
            let previous = lastSeen[call.uuid]
            if previous?.state == "ended" { continue }
            guard let view = view(of: call) else { continue }
            if let endReason = view.endReason { endReasons[call.uuid] = endReason }
            lastSeen[call.uuid] = view
            guard let previous, previous != view else { continue }
            emitCall(view.state == "ended" ? "ended" : "changed", view)
        }
        for uuid in lastSeen.keys where !present.contains(uuid) {
            lastSeen[uuid] = nil
            endReasons[uuid] = nil
            serverExpired.remove(uuid)
        }
    }

    /// Records and emits a call's current view for a delegate event, unless `accept` rejects its current state.
    private func report(_ type: String, _ uuid: UUID, accept: (ConvoHopCall) -> Bool = { _ in true }) {
        guard let call = call(uuid), accept(call), let view = view(of: call) else { return }
        lastSeen[uuid] = view
        emitCall(type, view)
    }

    private func emitCall(_ type: String, _ view: CallView) {
        let event: [String: Any] = ["type": type, "call": view.dictionary]
        for emitter in callsEmitters { emitter.emitOnCallEvent(event) }
    }

    func voipRegistration() -> [String: Any]? {
        guard let token = ConvoHopCalls.shared.voipToken else { return nil }
        return registration("apnsVoip", ConvoHopPushToken.hex(token))
    }

    private func registration(_ kind: String, _ token: String) -> [String: Any] {
        var registration: [String: Any] = ["kind": kind, "token": token]
        if let environment = options?.apnsEnvironment { registration["environment"] = environment.rawValue }
        return registration
    }

    private func setAudioSession(_ active: Bool) {
        guard audioSessionActive != active else { return }
        audioSessionActive = active
        for emitter in callsEmitters { emitter.emitOnAudioSession(["active": active]) }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didUpdateVoIPToken token: Data?) {
        guard let registration = voipRegistration() else { return }
        for emitter in callsEmitters { emitter.emitOnVoipToken(registration) }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didReceiveIncomingCall call: ConvoHopCall) {
        report("incoming", call.uuid) { $0.state == .ringing }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didStartOutgoing call: ConvoHopCall) {
        report("outgoing", call.uuid) { !$0.isEnded }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didAnswer call: ConvoHopCall) {
        report("answered", call.uuid)
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didActivate audioSession: AVAudioSession) {
        setAudioSession(true)
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didDeactivate audioSession: AVAudioSession) {
        setAudioSession(false)
    }

    func convoHopCallsDidReset(_ calls: ConvoHopCalls) {
        setAudioSession(false)
    }

    // MARK: - Pushes

    func apnsRegistration() -> [String: Any]? {
        apnsToken.map { registration("apns", $0) }
    }

    func didRegister(deviceToken: Data) {
        apnsToken = ConvoHopPushToken.hex(deviceToken)
        guard let registration = apnsRegistration() else { return }
        for emitter in pushEmitters { emitter.emitOnPushRegistration(registration) }
    }

    func didFailToRegister(error: any Error) {
        let error = error as NSError
        let event: [String: Any] = ["kind": "apns", "message": "\(error.domain) \(error.code)"]
        for emitter in pushEmitters { emitter.emitOnPushRegistrationError(event) }
    }

    /// A ConvoHop push that arrived in the foreground: emits messages, rings calls and stops rings. Returns how it
    /// shows.
    func willPresent(_ push: NotificationCenterDelegate.Push) -> UNNotificationPresentationOptions {
        guard let options, case .notification(let notification, let payload) = push,
            ConvoHopCalls.shared.recipient.accepts(notification)
        else { return [] }
        switch notification.kind {
        case .message:
            emitNotification("received", payload)
            return options.foregroundPresentation
        case .call:
            ConvoHopCalls.shared.handle(notification)
            return []
        case .callCancelled(let alert, let reason):
            if reason == .expired, call(alert.uuid)?.state == .ringing { serverExpired.insert(alert.uuid) }
            ConvoHopCalls.shared.handle(notification)
            return reason.isMissedCall ? options.foregroundPresentation : []
        }
    }

    /// The user opened a ConvoHop push: rings or stops its call, then hands it to JavaScript.
    func opened(_ push: NotificationCenterDelegate.Push) {
        guard isConfigured, case .notification(let notification, let payload) = push,
            ConvoHopCalls.shared.recipient.accepts(notification)
        else { return }
        switch notification.kind {
        case .message:
            break
        case .call:
            ConvoHopCalls.shared.handle(notification)
        case .callCancelled(let alert, let reason):
            if reason == .expired, call(alert.uuid)?.state == .ringing { serverExpired.insert(alert.uuid) }
            ConvoHopCalls.shared.handle(notification)
        }
        if initialTaken {
            emitNotification("opened", payload)
        } else {
            // Latest wins: takeInitialNotification hands it over, and then the app is running.
            heldOpened = payload
            if initialWaiters.contains(where: { $0.isLive }) { settleInitial() }
        }
    }

    private func emitNotification(_ action: String, _ payload: String) {
        let event: [String: Any] = ["action": action, "payload": payload]
        for emitter in pushEmitters { emitter.emitOnNotification(event) }
    }

    // MARK: - Initial notification

    /// Resolves the notification the user opened to launch the app, once, then `null`. iOS delivers it around when the
    /// app first becomes active, so without one this resolves `null` a second after that.
    func takeInitialNotification(_ promise: JSPromise) {
        guard isConfigured, !initialTaken else {
            promise.resolve(NSNull())
            return
        }
        if let payload = heldOpened {
            heldOpened = nil
            initialTaken = true
            promise.resolve(["action": "opened", "payload": payload])
            return
        }
        initialWaiters.append(promise)
        scheduleInitial()
    }

    private func watchActivation() {
        guard activatedAt == nil, activationObservers.isEmpty else { return }
        if UIApplication.shared.applicationState == .active {
            activated()
            return
        }
        for name in [UIApplication.didBecomeActiveNotification, UIScene.didActivateNotification] {
            activationObservers.append(
                NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { _ in
                    MainActor.assumeIsolated { Hub.shared.activated() }
                })
        }
    }

    private func activated() {
        for observer in activationObservers { NotificationCenter.default.removeObserver(observer) }
        activationObservers = []
        if activatedAt == nil { activatedAt = .now() }
        scheduleInitial()
    }

    private func scheduleInitial() {
        guard let activatedAt, !initialWaiters.isEmpty, initialTimer == nil else { return }
        let deadline = activatedAt + Self.initialGrace
        if deadline <= .now() {
            settleInitial()
            return
        }
        let timer = DispatchWorkItem { MainActor.assumeIsolated { Hub.shared.settleInitial() } }
        initialTimer = timer
        DispatchQueue.main.asyncAfter(deadline: deadline, execute: timer)
    }

    /// Hands the held notification, or `null`, to the first waiter that can still receive it, and `null` to the rest.
    /// Without such a waiter, the notification stays held for the next call.
    private func settleInitial() {
        initialTimer?.cancel()
        initialTimer = nil
        let waiters = initialWaiters
        initialWaiters = []
        guard let first = waiters.first(where: { $0.isLive }) else { return }
        initialTaken = true
        if let payload = heldOpened {
            heldOpened = nil
            first.resolve(["action": "opened", "payload": payload])
        } else {
            first.resolve(NSNull())
        }
        for waiter in waiters where waiter !== first { waiter.resolve(NSNull()) }
    }
}

/// A call as JavaScript sees it: the `CallSnapshot` of the `ConvoHopCalls` spec.
struct CallView: Equatable {
    var id: String
    var alertId: String?
    var liveSessionId: String
    var conversationId: String?
    var outgoing: Bool
    var hasVideo: Bool
    var mediaProfile: String?
    var callerName: String?
    var expiresAtMs: Double?
    var state: String
    var muted: Bool
    var endReason: String?
    var serverReason: String?

    init(id: String, liveSessionId: String, outgoing: Bool, hasVideo: Bool, state: String, muted: Bool) {
        self.id = id
        self.liveSessionId = liveSessionId
        self.outgoing = outgoing
        self.hasVideo = hasVideo
        self.state = state
        self.muted = muted
    }

    var dictionary: [String: Any] {
        var dictionary: [String: Any] = [
            "id": id, "liveSessionId": liveSessionId, "outgoing": outgoing, "hasVideo": hasVideo, "state": state,
            "muted": muted, "availableAudioRoutes": [String](),
        ]
        dictionary["alertId"] = alertId
        dictionary["conversationId"] = conversationId
        dictionary["mediaProfile"] = mediaProfile
        dictionary["callerName"] = callerName
        dictionary["expiresAtMs"] = expiresAtMs
        dictionary["endReason"] = endReason
        dictionary["serverReason"] = serverReason
        return dictionary
    }
}
