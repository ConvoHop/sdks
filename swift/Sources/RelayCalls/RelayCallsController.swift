#if os(iOS)
import AVFoundation
import CallKit
import RelayPush
import Foundation
import PushKit

/// How ``RelayCalls`` sets up CallKit.
public struct RelayCallsConfiguration: Sendable {
    public var supportsVideo: Bool
    public var supportsHolding: Bool
    public var maximumCallGroups: Int
    public var maximumCallsPerCallGroup: Int
    public var includesCallsInRecents: Bool
    /// A sound file in your app bundle, or `nil` for the system ringtone.
    public var ringtoneSound: String?
    /// A 40 × 40 pt template image, in PNG data, for the in-call button that opens your app.
    public var iconTemplateImageData: Data?
    /// The App Group suite your Notification Service Extension shares, or `nil` for the app's own defaults. It stores
    /// the ledger and ``RelayCalls/recipient``.
    public var ledgerSuiteName: String?
    /// The caller name CallKit shows. Defaults to the push `title`, which the server sends only when the project
    /// opts in to previews.
    public var callerName: @Sendable (RelayNotification) -> String?

    public init(
        supportsVideo: Bool = true,
        supportsHolding: Bool = false,
        maximumCallGroups: Int = 1,
        maximumCallsPerCallGroup: Int = 1,
        includesCallsInRecents: Bool = true,
        ringtoneSound: String? = nil,
        iconTemplateImageData: Data? = nil,
        ledgerSuiteName: String? = nil,
        callerName: @escaping @Sendable (RelayNotification) -> String? = { $0.title }
    ) {
        self.supportsVideo = supportsVideo
        self.supportsHolding = supportsHolding
        self.maximumCallGroups = maximumCallGroups
        self.maximumCallsPerCallGroup = maximumCallsPerCallGroup
        self.includesCallsInRecents = includesCallsInRecents
        self.ringtoneSound = ringtoneSound
        self.iconTemplateImageData = iconTemplateImageData
        self.ledgerSuiteName = ledgerSuiteName
        self.callerName = callerName
    }
}

/// Receives what CallKit and PushKit report. Every method has an empty default.
@MainActor
public protocol RelayCallsDelegate: AnyObject {
    /// Send the VoIP token, as `RelayPushToken.hex(_:)`, to your backend, which sends VoIP pushes for calls.
    /// Relay never stores device tokens. `nil` means iOS invalidated the token: remove it from your backend.
    func relayCalls(_ calls: RelayCalls, didUpdateVoIPToken token: Data?)
    /// A call rings in CallKit.
    func relayCalls(_ calls: RelayCalls, didReceiveIncomingCall call: RelayCall)
    /// The user answered. Join the live session, connect media and call ``RelayCalls/reportConnected(_:)``.
    func relayCalls(_ calls: RelayCalls, didAnswer call: RelayCall)
    /// CallKit started the call from ``RelayCalls/startOutgoingCall(liveSessionId:conversationId:handle:displayName:hasVideo:)``.
    func relayCalls(_ calls: RelayCalls, didStartOutgoing call: RelayCall)
    /// The call ended. `reason` is `nil` when the user ended or declined it. Leave the call and disconnect media.
    func relayCalls(_ calls: RelayCalls, didEnd call: RelayCall, reason: RelayCallEndReason?)
    /// Mute or unmute the microphone. This is the only place to do it, for the system UI and for your app.
    func relayCalls(_ calls: RelayCalls, didSetMuted muted: Bool, for call: RelayCall)
    /// Hold or resume the call.
    func relayCalls(_ calls: RelayCalls, didSetHeld onHold: Bool, for call: RelayCall)
    /// CallKit activated the audio session. Start call audio now, not before.
    func relayCalls(_ calls: RelayCalls, didActivate audioSession: AVAudioSession)
    /// CallKit deactivated the audio session.
    func relayCalls(_ calls: RelayCalls, didDeactivate audioSession: AVAudioSession)
    /// CallKit reset. Every call ended as `failed`, and ``relayCalls(_:didEnd:reason:)`` ran for each.
    func relayCallsDidReset(_ calls: RelayCalls)
}

extension RelayCallsDelegate {
    public func relayCalls(_ calls: RelayCalls, didUpdateVoIPToken token: Data?) {}
    public func relayCalls(_ calls: RelayCalls, didReceiveIncomingCall call: RelayCall) {}
    public func relayCalls(_ calls: RelayCalls, didAnswer call: RelayCall) {}
    public func relayCalls(_ calls: RelayCalls, didStartOutgoing call: RelayCall) {}
    public func relayCalls(_ calls: RelayCalls, didEnd call: RelayCall, reason: RelayCallEndReason?) {}
    public func relayCalls(_ calls: RelayCalls, didSetMuted muted: Bool, for call: RelayCall) {}
    public func relayCalls(_ calls: RelayCalls, didSetHeld onHold: Bool, for call: RelayCall) {}
    public func relayCalls(_ calls: RelayCalls, didActivate audioSession: AVAudioSession) {}
    public func relayCalls(_ calls: RelayCalls, didDeactivate audioSession: AVAudioSession) {}
    public func relayCallsDidReset(_ calls: RelayCalls) {}
}

/// Reports Relay calls to CallKit and receives VoIP pushes through PushKit.
///
/// Call ``start(configuration:delegate:)`` in `application(_:didFinishLaunchingWithOptions:)`: iOS can launch your
/// app for a VoIP push, and terminates an app that doesn't report each one to CallKit. This class reports every VoIP
/// push. A push it doesn't ring for, such as one for someone other than ``recipient``, is reported and ended at once.
///
/// Answered and declined rings get no push. When realtime or `RelayClient.ringStopReason(_:)` shows that a ringing
/// call stopped, call ``end(_:reason:)`` with the reason.
@MainActor
public final class RelayCalls: NSObject {
    public static let shared = RelayCalls()

    public private(set) weak var delegate: RelayCallsDelegate?
    public private(set) var configuration = RelayCallsConfiguration()
    /// Remembers handled pushes and stopped rings. Share its suite with your Notification Service Extension.
    public private(set) var ledger = RelayNotificationLedger()
    /// The PushKit VoIP token, once iOS issued one.
    public private(set) var voipToken: Data?
    /// Whose calls ring. ``RelayPushRecipient/any`` until you set one.
    ///
    /// Set `.only(projectId:recipientId:)` at sign-in and ``RelayPushRecipient/nobody`` at sign-out. It's
    /// stored in the ledger's suite, so it holds when iOS relaunches your app for a VoIP push, and a Notification
    /// Service Extension on the same suite hides the text of other users' pushes.
    public var recipient: RelayPushRecipient {
        get { ledger.recipient }
        set {
            ledger.recipient = newValue
            recipientSetHere = newValue
        }
    }

    /// The calls, oldest first. An ended call stays for a minute.
    public var calls: [RelayCall] { book.calls }

    private static let endedRetention: UInt64 = 60_000_000_000

    private var book = CallBook()
    private var provider: CXProvider?
    private let callController = CXCallController()
    private var pushRegistry: PKPushRegistry?
    private var observations: [WeakObservation] = []
    /// The recipient this process set, which moves to a ledger on another suite.
    private var recipientSetHere: RelayPushRecipient?

    override private init() {
        super.init()
    }

    /// Sets up CallKit and PushKit. Call it again to change the configuration or delegate.
    public func start(configuration: RelayCallsConfiguration = RelayCallsConfiguration(), delegate: RelayCallsDelegate?) {
        if provider == nil || configuration.ledgerSuiteName != self.configuration.ledgerSuiteName {
            ledger = RelayNotificationLedger(suiteName: configuration.ledgerSuiteName)
            if let recipientSetHere { ledger.recipient = recipientSetHere }
        }
        self.configuration = configuration
        self.delegate = delegate
        let providerConfiguration = CXProviderConfiguration()
        providerConfiguration.supportsVideo = configuration.supportsVideo
        providerConfiguration.maximumCallGroups = configuration.maximumCallGroups
        providerConfiguration.maximumCallsPerCallGroup = configuration.maximumCallsPerCallGroup
        providerConfiguration.supportedHandleTypes = [.generic]
        providerConfiguration.includesCallsInRecents = configuration.includesCallsInRecents
        providerConfiguration.ringtoneSound = configuration.ringtoneSound
        providerConfiguration.iconTemplateImageData = configuration.iconTemplateImageData
        if let provider {
            provider.configuration = providerConfiguration
        } else {
            let provider = CXProvider(configuration: providerConfiguration)
            provider.setDelegate(self, queue: .main)
            self.provider = provider
        }
        if pushRegistry == nil {
            let registry = PKPushRegistry(queue: .main)
            registry.delegate = self
            registry.desiredPushTypes = [.voIP]
            pushRegistry = registry
        }
    }

    /// Handles a Relay notification that arrived outside PushKit, such as an alert push.
    ///
    /// A ring rings in CallKit unless it already rang, stopped or expired. A cancellation ends the ringing call,
    /// records the stop and removes delivered notifications for the ring.
    public func handle(_ notification: RelayNotification) {
        guard provider != nil else { return }
        receive(notification, pushKitCompletion: nil)
    }

    /// Starts an outgoing call in CallKit. Start the live session with Relay first.
    ///
    /// - Parameter handle: What CallKit shows and stores in Recents. Defaults to the conversation ID.
    /// - Returns: The CallKit UUID.
    @discardableResult
    public func startOutgoingCall(
        liveSessionId: String, conversationId: String, handle: String? = nil, displayName: String? = nil,
        hasVideo: Bool = false
    ) async throws -> UUID {
        let uuid = UUID()
        let call = book.addOutgoing(
            uuid, liveSessionId: liveSessionId, conversationId: conversationId, handle: handle ?? conversationId,
            callerName: displayName, hasVideo: hasVideo)
        notify()
        let action = CXStartCallAction(call: uuid, handle: CXHandle(type: .generic, value: call.handle))
        action.isVideo = hasVideo
        do {
            try await request(action)
        } catch {
            book.remove(uuid)
            notify()
            throw error
        }
        return uuid
    }

    /// Reports that media connects for an answered or outgoing call.
    public func reportConnecting(_ uuid: UUID) {
        guard let call = book.progress(uuid, connected: false) else { return }
        if call.isOutgoing { provider?.reportOutgoingCall(with: uuid, startedConnectingAt: Date()) }
        notify()
    }

    /// Reports that media connected for an answered or outgoing call.
    public func reportConnected(_ uuid: UUID) {
        guard let call = book.progress(uuid, connected: true) else { return }
        if call.isOutgoing { provider?.reportOutgoingCall(with: uuid, connectedAt: Date()) }
        notify()
    }

    /// Updates what CallKit shows for a call.
    public func update(_ uuid: UUID, localizedCallerName: String? = nil, hasVideo: Bool? = nil) {
        guard let call = book.update(uuid, callerName: localizedCallerName, hasVideo: hasVideo) else { return }
        provider?.reportCall(with: uuid, updated: callUpdate(call))
        notify()
    }

    /// Asks CallKit to answer a ringing call, for example from an in-app Answer button.
    /// ``RelayCallsDelegate/relayCalls(_:didAnswer:)`` follows, as when the user answers in the system UI.
    ///
    /// - Throws: `CXErrorCodeRequestTransactionError.unknownCallUUID` for a call Relay didn't report, or
    ///   `.invalidAction` for a call that isn't ringing, before asking CallKit.
    public func answer(_ uuid: UUID) async throws {
        guard let call = book[uuid] else { throw CXErrorCodeRequestTransactionError(.unknownCallUUID) }
        guard call.state == .ringing else { throw CXErrorCodeRequestTransactionError(.invalidAction) }
        try await request(CXAnswerCallAction(call: uuid))
    }

    /// Asks CallKit to mute or unmute. ``RelayCallsDelegate/relayCalls(_:didSetMuted:for:)`` applies it.
    public func setMuted(_ muted: Bool, for uuid: UUID) async throws {
        try await request(CXSetMutedCallAction(call: uuid, muted: muted))
    }

    /// Asks CallKit to hold or resume. ``RelayCallsDelegate/relayCalls(_:didSetHeld:for:)`` applies it.
    public func setHeld(_ onHold: Bool, for uuid: UUID) async throws {
        try await request(CXSetHeldCallAction(call: uuid, onHold: onHold))
    }

    /// Ends a call.
    ///
    /// - Parameter reason: `nil` when the user ends the call in your app, which asks CallKit to end it. Otherwise
    ///   why the call stopped elsewhere, for example `answered` when another device answered the ring.
    public func end(_ uuid: UUID, reason: RelayCallEndReason? = nil) async throws {
        guard let reason else {
            try await request(CXEndCallAction(call: uuid))
            return
        }
        guard let call = book.end(uuid, reason: reason, ledger: ledger, now: Date()) else { return }
        provider?.reportCall(with: uuid, endedAt: Date(), reason: Self.endedReason(reason))
        didEnd(call, reason: reason)
    }

    /// Asks CallKit to perform `action`.
    ///
    /// The completion-handler API keeps the controller on the main actor. Older SDKs import the async variant as
    /// nonisolated, so awaiting it would send the controller off the main actor.
    private func request(_ action: CXAction) async throws {
        let transaction = CXTransaction(action: action)
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
            callController.request(transaction) { error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume() }
            }
        }
    }

    /// Forgets an ended call before its minute is up. Returns `false` for a call that hasn't ended.
    @discardableResult
    public func forget(_ uuid: UUID) -> Bool {
        guard book[uuid]?.isEnded == true else { return false }
        book.remove(uuid)
        notify()
        return true
    }

    /// Calls `handler` with ``calls`` now and whenever they change, until you cancel or release the observation.
    public func addObserver(_ handler: @escaping @MainActor ([RelayCall]) -> Void) -> RelayCallsObservation {
        let observation = RelayCallsObservation(handler)
        observations.append(WeakObservation(value: observation))
        handler(book.calls)
        return observation
    }

    // MARK: - Pushes and rings

    private func receive(_ notification: RelayNotification?, pushKitCompletion completion: CompletionBox?) {
        let configuration = configuration
        let effects = book.receive(
            notification, voip: completion != nil, recipient: ledger.recipient, ledger: ledger, now: Date(),
            callerName: configuration.callerName)
        if case .callCancelled(let alert, _) = notification?.kind { removeDelivered(alertId: alert.alertId) }
        var reported = false
        for effect in effects {
            switch effect {
            case .ring(let call):
                reported = true
                ring(call, completion: completion)
            case .rereport(let uuid):
                reported = true
                let update = book[uuid].map(callUpdate) ?? CXCallUpdate()
                guard let provider else {
                    completion?.call()
                    continue
                }
                provider.reportNewIncomingCall(with: uuid, update: update) { _ in
                    Task { @MainActor in completion?.call() }
                }
            case .reportEnded(let uuid, let reason):
                reported = true
                reportEnded(uuid, reason: reason, completion: completion)
            case .ended(let call):
                provider?.reportCall(with: call.uuid, endedAt: Date(), reason: Self.endedReason(reasonOf(call)))
                didEnd(call, reason: reasonOf(call))
            }
        }
        if !reported { completion?.call() }
        notify()
    }

    private func ring(_ call: RelayCall, completion: CompletionBox?) {
        guard let provider else {
            _ = book.end(call.uuid, reason: .failed, ledger: ledger, now: Date())
            completion?.call()
            return
        }
        provider.reportNewIncomingCall(with: call.uuid, update: callUpdate(call)) { error in
            let failed = error != nil
            Task { @MainActor in
                if !failed {
                    self.scheduleExpiry(call)
                    self.delegate?.relayCalls(self, didReceiveIncomingCall: call)
                } else if self.book.end(call.uuid, reason: .failed, ledger: self.ledger, now: Date()) != nil {
                    self.scheduleRemoval(call.uuid)
                    self.notify()
                }
                completion?.call()
            }
        }
    }

    private func reportEnded(_ uuid: UUID, reason: RelayCallEndReason, completion: CompletionBox?) {
        guard let provider else {
            completion?.call()
            return
        }
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: "Relay")
        provider.reportNewIncomingCall(with: uuid, update: update) { _ in
            Task { @MainActor in
                self.provider?.reportCall(with: uuid, endedAt: nil, reason: Self.endedReason(reason))
                completion?.call()
            }
        }
    }

    private func scheduleExpiry(_ call: RelayCall) {
        guard let expiresAt = call.expiresAt else { return }
        let uuid = call.uuid
        Task { [weak self] in
            let delay = expiresAt.timeIntervalSinceNow
            if delay > 0 { try? await Task.sleep(nanoseconds: UInt64((delay * 1_000_000_000).rounded(.up))) }
            guard let self, let call = self.book.expire(uuid, ledger: self.ledger, now: Date()) else { return }
            self.provider?.reportCall(with: uuid, endedAt: expiresAt, reason: .unanswered)
            self.didEnd(call, reason: .expired)
            self.notify()
        }
    }

    private func scheduleRemoval(_ uuid: UUID) {
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: Self.endedRetention)
            guard let self, self.book[uuid]?.isEnded == true else { return }
            self.book.remove(uuid)
            self.notify()
        }
    }

    private func didEnd(_ call: RelayCall, reason: RelayCallEndReason?) {
        if let alert = call.alert { removeDelivered(alertId: alert.alertId) }
        scheduleRemoval(call.uuid)
        delegate?.relayCalls(self, didEnd: call, reason: reason)
        notify()
    }

    private func removeDelivered(alertId: String) {
        Task { await RelayDeliveredNotifications.remove(alertId: alertId) }
    }

    private func reasonOf(_ call: RelayCall) -> RelayCallEndReason? {
        if case .ended(let reason) = call.state { return reason }
        return nil
    }

    private func notify() {
        observations.removeAll { $0.value?.isCancelled != false }
        let calls = book.calls
        for observation in observations { observation.value?.handler(calls) }
    }

    private func callUpdate(_ call: RelayCall) -> CXCallUpdate {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: call.handle)
        update.localizedCallerName = call.callerName
        update.hasVideo = call.hasVideo
        update.supportsHolding = configuration.supportsHolding
        update.supportsGrouping = false
        update.supportsUngrouping = false
        update.supportsDTMF = false
        return update
    }

    static func endedReason(_ reason: RelayCallEndReason?) -> CXCallEndedReason {
        switch reason {
        case .answered?: .answeredElsewhere
        case .declined?: .declinedElsewhere
        case .expired?: .unanswered
        case .failed?: .failed
        default: .remoteEnded
        }
    }
}

extension RelayCalls: PKPushRegistryDelegate {
    nonisolated public func pushRegistry(
        _ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType
    ) {
        guard type == .voIP else { return }
        let token = pushCredentials.token
        MainActor.assumeIsolated {
            voipToken = token
            delegate?.relayCalls(self, didUpdateVoIPToken: token)
        }
    }

    nonisolated public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        guard type == .voIP else { return }
        MainActor.assumeIsolated {
            voipToken = nil
            delegate?.relayCalls(self, didUpdateVoIPToken: nil)
        }
    }

    nonisolated public func pushRegistry(
        _ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType,
        completion: @escaping () -> Void
    ) {
        let box = CompletionBox(completion)
        guard type == .voIP else { return box.call() }
        let notification = try? RelayNotification.parse(userInfo: payload.dictionaryPayload)
        MainActor.assumeIsolated { receive(notification, pushKitCompletion: box) }
    }
}

extension RelayCalls: CXProviderDelegate {
    nonisolated public func providerDidReset(_ provider: CXProvider) {
        MainActor.assumeIsolated {
            for call in book.reset(ledger: ledger, now: Date()) { didEnd(call, reason: .failed) }
            delegate?.relayCallsDidReset(self)
        }
    }

    nonisolated public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        let uuid = action.callUUID
        let call = MainActor.assumeIsolated { book.answer(uuid, ledger: ledger) }
        guard let call else { return action.fail() }
        action.fulfill()
        MainActor.assumeIsolated {
            if let alert = call.alert { removeDelivered(alertId: alert.alertId) }
            delegate?.relayCalls(self, didAnswer: call)
            notify()
        }
    }

    nonisolated public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        let uuid = action.callUUID
        action.fulfill()
        MainActor.assumeIsolated {
            guard let call = book.userEnded(uuid, ledger: ledger, now: Date()) else { return }
            didEnd(call, reason: nil)
        }
    }

    nonisolated public func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        let uuid = action.callUUID
        let call = MainActor.assumeIsolated { book[uuid] }
        guard let call, call.isOutgoing, !call.isEnded else { return action.fail() }
        provider.reportOutgoingCall(with: uuid, startedConnectingAt: nil)
        action.fulfill()
        MainActor.assumeIsolated {
            // The stored provider is this callback's provider; capturing the parameter would send it to the main actor.
            self.provider?.reportCall(with: uuid, updated: callUpdate(call))
            delegate?.relayCalls(self, didStartOutgoing: call)
        }
    }

    nonisolated public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        let uuid = action.callUUID
        let muted = action.isMuted
        let call = MainActor.assumeIsolated { book.setMuted(uuid, muted) }
        guard let call else { return action.fail() }
        action.fulfill()
        MainActor.assumeIsolated {
            delegate?.relayCalls(self, didSetMuted: muted, for: call)
            notify()
        }
    }

    nonisolated public func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) {
        let uuid = action.callUUID
        let onHold = action.isOnHold
        let call = MainActor.assumeIsolated { book.setOnHold(uuid, onHold) }
        guard let call else { return action.fail() }
        action.fulfill()
        MainActor.assumeIsolated {
            delegate?.relayCalls(self, didSetHeld: onHold, for: call)
            notify()
        }
    }

    nonisolated public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        MainActor.assumeIsolated { delegate?.relayCalls(self, didActivate: audioSession) }
    }

    nonisolated public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        MainActor.assumeIsolated { delegate?.relayCalls(self, didDeactivate: audioSession) }
    }
}

/// Keeps a ``RelayCalls/addObserver(_:)`` handler running. Cancel or release it to stop.
public final class RelayCallsObservation: @unchecked Sendable {
    fileprivate let handler: @MainActor ([RelayCall]) -> Void
    private let lock = NSLock()
    private var cancelled = false

    fileprivate init(_ handler: @escaping @MainActor ([RelayCall]) -> Void) {
        self.handler = handler
    }

    deinit { cancel() }

    public func cancel() {
        lock.lock()
        cancelled = true
        lock.unlock()
    }

    fileprivate var isCancelled: Bool {
        lock.lock()
        defer { lock.unlock() }
        return cancelled
    }
}

private struct WeakObservation {
    weak var value: RelayCallsObservation?
}

/// PushKit's completion, called once.
private final class CompletionBox: @unchecked Sendable {
    private var completion: (() -> Void)?
    private let lock = NSLock()

    init(_ completion: @escaping () -> Void) {
        self.completion = completion
    }

    func call() {
        lock.lock()
        let completion = completion
        self.completion = nil
        lock.unlock()
        completion?()
    }
}
#endif
