import CallKit
import Foundation
import PushKit
import UIKit

/// Rings through CallKit, for VoIP pushes and for calls Dart shows. It's touched on the main
/// thread only: PushKit and CallKit call it on the main queue.
final class ConvoHopCalls: NSObject, CXProviderDelegate, PKPushRegistryDelegate {
  private final class Ring {
    let uuid: UUID
    let call: ConvoHopPayload
    var answered = false
    var expiry: DispatchWorkItem?

    init(uuid: UUID, call: ConvoHopPayload) {
      self.uuid = uuid
      self.call = call
    }
  }

  // Why rings stopped, by alert ID: [alertId: ["reason": String, "until": Unix seconds]].
  private static let stoppedKey = "com.convohop.flutter.stopped"
  private static let stoppedCapacity = 128
  // Whether Dart registered for VoIP pushes.
  private static let voipKey = "com.convohop.flutter.voip"
  private static let iconName = "ConvoHopCallIcon"

  private unowned let push: ConvoHopPush
  private lazy var provider: CXProvider = makeProvider()
  private lazy var controller = CXCallController(queue: .main)
  // Rings and answered calls in CallKit, by alert ID.
  private var rings: [String: Ring] = [:]
  private var registry: PKPushRegistry?
  private var voipToken: String?

  init(push: ConvoHopPush) {
    self.push = push
  }

  // MARK: Dart

  /// Rings for `call` unless it stopped ringing or already rings.
  func show(_ call: ConvoHopPayload, _ completion: @escaping (Error?) -> Void) {
    guard let alertId = call.alertId, stopped(call) == nil, rings[alertId] == nil else {
      completion(nil)
      return
    }
    report(call, completion)
  }

  /// Answers the ring `alertId` in CallKit. Resolves false when the ring had stopped.
  func answer(_ alertId: String, _ result: @escaping (Bool) -> Void) {
    guard let ring = rings[alertId], !ring.answered else {
      result(settle(alertId, answered: true))
      return
    }
    controller.request(CXTransaction(action: CXAnswerCallAction(call: ring.uuid))) { error in
      DispatchQueue.main.async {
        result(error == nil || self.settle(alertId, answered: true))
      }
    }
  }

  /// Declines the ring `alertId` on this device. Resolves false when the ring had stopped.
  func decline(_ alertId: String, _ result: @escaping (Bool) -> Void) {
    guard let ring = rings[alertId], !ring.answered else {
      result(settle(alertId, answered: false))
      return
    }
    controller.request(CXTransaction(action: CXEndCallAction(call: ring.uuid))) { error in
      DispatchQueue.main.async {
        result(error == nil || self.settle(alertId, answered: false))
      }
    }
  }

  /// Ends the ring or call `alertId` without a call action, and removes its incoming-call alert.
  func end(_ alertId: String, reason: String) {
    let ring = rings.removeValue(forKey: alertId)
    ring?.expiry?.cancel()
    stop(alertId, expiresAt: ring?.call.expiresAt, reason: reason)
    if let ring = ring {
      provider.reportCall(with: ring.uuid, endedAt: nil, reason: ConvoHopCalls.endedReason(reason))
    }
    push.removeDelivered(
      where: { data in
        data["eventType"] as? String == ConvoHopPayload.call && data["alertId"] as? String == alertId
      }, {})
  }

  /// Stops the ring a cancellation is for, unless it was answered here. Returns whether to tell
  /// the user they missed the call.
  func cancelled(_ cancellation: ConvoHopPayload) -> Bool {
    guard let alertId = cancellation.alertId, rings[alertId]?.answered != true else { return false }
    let earlier = ConvoHopCalls.storedReason(alertId)
    end(alertId, reason: cancellation.reason ?? "ended")
    return cancellation.missedCall && earlier != "answered" && earlier != "declined"
  }

  /// Why `call`'s ring stopped, or nil while it rings.
  func stopped(_ call: ConvoHopPayload) -> String? {
    guard let alertId = call.alertId else { return nil }
    if let reason = ConvoHopCalls.storedReason(alertId) { return reason }
    return call.expired ? "expired" : nil
  }

  /// Whether `call` rings, or was answered, in CallKit.
  func isRinging(_ call: ConvoHopPayload) -> Bool {
    guard let alertId = call.alertId else { return false }
    return rings[alertId] != nil
  }

  // MARK: VoIP pushes

  /// Registers for VoIP pushes now and at later launches. The registration goes to Dart.
  func registerVoip() {
    UserDefaults.standard.set(true, forKey: ConvoHopCalls.voipKey)
    if let data = registry?.pushToken(for: .voIP) {
      let token = ConvoHopPush.hex(data)
      voipToken = token
      push.emitRegistration(kind: "apnsVoip", token: token)
    }
    startRegistry()
  }

  /// Registers for VoIP pushes again when Dart registered before.
  func restoreVoip() {
    if UserDefaults.standard.bool(forKey: ConvoHopCalls.voipKey) { startRegistry() }
  }

  private func startRegistry() {
    if registry != nil { return }
    let registry = PKPushRegistry(queue: .main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
    self.registry = registry
  }

  func pushRegistry(
    _ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType
  ) {
    guard type == .voIP else { return }
    let token = ConvoHopPush.hex(pushCredentials.token)
    if token == voipToken { return }
    voipToken = token
    push.emitRegistration(kind: "apnsVoip", token: token)
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    if type == .voIP { voipToken = nil }
  }

  // iOS terminates an app that doesn't report a call to CallKit for each VoIP push, so a push
  // for a ring that stopped, or an invalid one, rings and ends at once.
  func pushRegistry(
    _ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType, completion: @escaping () -> Void
  ) {
    let data = payload.dictionaryPayload["convohop"]
    guard type == .voIP, data != nil else {
      // Another library's VoIP push: it reports the call.
      completion()
      return
    }
    push.emitNotification(payload.dictionaryPayload)
    guard let call = ConvoHopPayload.tryParse(data), call.eventType == ConvoHopPayload.call,
      let alertId = call.alertId
    else {
      reportEnded(title: nil, video: false, reason: .failed, completion)
      return
    }
    if let ring = rings[alertId] {
      // A duplicate push for a ring or call in CallKit: CallKit rejects the report because the
      // UUID exists, which still counts as reporting it.
      provider.reportNewIncomingCall(with: ring.uuid, update: update(call)) { _ in completion() }
      return
    }
    if let reason = stopped(call) {
      reportEnded(
        title: call.title, video: call.video, reason: ConvoHopCalls.endedReason(reason), completion)
      return
    }
    report(call) { _ in completion() }
  }

  // MARK: CallKit

  func providerDidReset(_ provider: CXProvider) {
    let ended = rings
    rings.removeAll()
    for (alertId, ring) in ended {
      ring.expiry?.cancel()
      if ring.answered { push.action("end", alertId: alertId, fields: ring.call.fields) }
    }
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    guard let alertId = alertId(for: action.callUUID), let ring = rings[alertId], !ring.answered
    else {
      action.fail()
      return
    }
    ring.answered = true
    ring.expiry?.cancel()
    ring.expiry = nil
    stop(alertId, expiresAt: ring.call.expiresAt, reason: "answered")
    push.action("answer", alertId: alertId, fields: ring.call.fields)
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    guard let alertId = alertId(for: action.callUUID), let ring = rings[alertId] else {
      action.fulfill()
      return
    }
    rings[alertId] = nil
    ring.expiry?.cancel()
    if ring.answered {
      push.action("end", alertId: alertId, fields: ring.call.fields)
    } else {
      stop(alertId, expiresAt: ring.call.expiresAt, reason: "declined")
      push.action("decline", alertId: alertId, fields: ring.call.fields)
    }
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    guard let alertId = alertId(for: action.callUUID) else {
      action.fail()
      return
    }
    push.action(action.isMuted ? "mute" : "unmute", alertId: alertId, fields: nil)
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) {
    action.fail()
  }

  private func makeProvider() -> CXProvider {
    let configuration: CXProviderConfiguration
    if #available(iOS 14.0, *) {
      configuration = CXProviderConfiguration()
    } else {
      let bundle = Bundle.main
      let name =
        bundle.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
        ?? bundle.object(forInfoDictionaryKey: "CFBundleName") as? String ?? ""
      configuration = CXProviderConfiguration(localizedName: name)
    }
    configuration.supportsVideo = true
    configuration.maximumCallGroups = 1
    configuration.maximumCallsPerCallGroup = 1
    configuration.supportedHandleTypes = [.generic]
    configuration.includesCallsInRecents = false
    if let icon = UIImage(named: ConvoHopCalls.iconName) {
      configuration.iconTemplateImageData = icon.pngData()
    }
    let provider = CXProvider(configuration: configuration)
    provider.setDelegate(self, queue: nil)
    return provider
  }

  private func update(_ call: ConvoHopPayload) -> CXCallUpdate {
    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: call.senderId)
    update.localizedCallerName = call.title ?? ConvoHopCalls.genericTitle
    update.hasVideo = call.video
    update.supportsHolding = false
    update.supportsGrouping = false
    update.supportsUngrouping = false
    update.supportsDTMF = false
    return update
  }

  private static var genericTitle: String {
    return Bundle.main.localizedString(forKey: "CONVOHOP_CALL", value: "Incoming call", table: nil)
  }

  // The ring is known before CallKit reports, so an early answer finds it.
  private func report(_ call: ConvoHopPayload, _ completion: @escaping (Error?) -> Void) {
    guard let alertId = call.alertId, let uuid = UUID(uuidString: alertId) else {
      completion(nil)
      return
    }
    let ring = Ring(uuid: uuid, call: call)
    rings[alertId] = ring
    provider.reportNewIncomingCall(with: uuid, update: update(call)) { error in
      DispatchQueue.main.async {
        if let error = error {
          if self.rings[alertId] === ring { self.rings[alertId] = nil }
          completion(ConvoHopCalls.filtered(error) ? nil : error)
          return
        }
        self.scheduleExpiry(alertId, ring)
        completion(nil)
      }
    }
  }

  private func reportEnded(
    title: String?, video: Bool, reason: CXCallEndedReason, _ completion: @escaping () -> Void
  ) {
    let uuid = UUID()
    let update = CXCallUpdate()
    update.localizedCallerName = title ?? ConvoHopCalls.genericTitle
    update.hasVideo = video
    provider.reportNewIncomingCall(with: uuid, update: update) { error in
      DispatchQueue.main.async {
        if error == nil { self.provider.reportCall(with: uuid, endedAt: nil, reason: reason) }
        completion()
      }
    }
  }

  private func scheduleExpiry(_ alertId: String, _ ring: Ring) {
    guard !ring.answered else { return }
    let item = DispatchWorkItem { [weak self] in
      guard let self = self, self.rings[alertId] === ring, !ring.answered else { return }
      self.rings[alertId] = nil
      self.stop(alertId, expiresAt: ring.call.expiresAt, reason: "expired")
      self.provider.reportCall(with: ring.uuid, endedAt: nil, reason: .unanswered)
    }
    ring.expiry = item
    let delay = max(0, Double(ring.call.expiresAt) - Date().timeIntervalSince1970)
    DispatchQueue.main.asyncAfter(wallDeadline: .now() + delay, execute: item)
  }

  // CallKit couldn't act on the ring, or doesn't know it: Dart rings with its own UI. Ends any
  // CallKit ring, then reports the action unless the ring had stopped.
  private func settle(_ alertId: String, answered: Bool) -> Bool {
    let ring = rings[alertId]
    if let ring = ring, !ring.answered {
      rings[alertId] = nil
      ring.expiry?.cancel()
      provider.reportCall(
        with: ring.uuid, endedAt: nil, reason: answered ? .answeredElsewhere : .declinedElsewhere)
    }
    if ConvoHopCalls.storedReason(alertId) != nil || ring?.call.expired == true { return false }
    stop(alertId, expiresAt: ring?.call.expiresAt, reason: answered ? "answered" : "declined")
    push.action(answered ? "answer" : "decline", alertId: alertId, fields: ring?.call.fields)
    return true
  }

  private func alertId(for uuid: UUID) -> String? {
    return rings.first(where: { $0.value.uuid == uuid })?.key
  }

  private static func filtered(_ error: Error) -> Bool {
    guard let error = error as? CXErrorCodeIncomingCallError else { return false }
    switch error.code {
    case .filteredByDoNotDisturb, .filteredByBlockList, .callUUIDAlreadyExists: return true
    default: return false
    }
  }

  private static func endedReason(_ reason: String) -> CXCallEndedReason {
    switch reason {
    case "answered": return .answeredElsewhere
    case "declined": return .declinedElsewhere
    case "expired": return .unanswered
    default: return .remoteEnded
    }
  }

  // MARK: Stopped rings

  private static func storedReason(_ alertId: String) -> String? {
    let entries = UserDefaults.standard.dictionary(forKey: stoppedKey)
    return (entries?[alertId] as? [String: Any])?["reason"] as? String
  }

  // Keeps the first reason, until a day after the ring expires.
  private func stop(_ alertId: String, expiresAt: Int64?, reason: String) {
    let defaults = UserDefaults.standard
    var entries = defaults.dictionary(forKey: ConvoHopCalls.stoppedKey) ?? [:]
    if entries[alertId] != nil { return }
    let now = Int64(Date().timeIntervalSince1970)
    func until(_ entry: Any) -> Int64 {
      return ((entry as? [String: Any])?["until"] as? NSNumber)?.int64Value ?? 0
    }
    entries = entries.filter { until($0.value) > now }
    entries[alertId] = ["reason": reason, "until": NSNumber(value: (expiresAt ?? now) + 86400)]
    while entries.count > ConvoHopCalls.stoppedCapacity,
      let oldest = entries.min(by: { until($0.value) < until($1.value) })
    {
      entries[oldest.key] = nil
    }
    defaults.set(entries, forKey: ConvoHopCalls.stoppedKey)
  }
}
