import Flutter
import UIKit
import UserNotifications

/// The plugin's state, shared by every engine's plugin instance. It's touched on the main thread
/// only.
final class ConvoHopPush: NSObject, UNUserNotificationCenterDelegate {
  static let shared = ConvoHopPush()

  private static let actionLifetime: TimeInterval = 5 * 60
  private static let actionCapacity = 32

  lazy var calls = ConvoHopCalls(push: self)
  /// The conversation the user is looking at, set from Dart.
  var activeConversation: String?
  private var sinks: [ObjectIdentifier: FlutterEventSink] = [:]
  // The opened notification while no Dart listens.
  private var initial: [String: Any]?
  // Call actions while no Dart listens.
  private var actions: [(at: Date, event: [String: Any])] = []
  private var apnsToken: String?
  // Flutter's app delegate forwards each notification center callback to every plugin instance,
  // with the same object; the first instance handles it.
  private weak var lastPresented: UNNotification?
  private weak var lastResponse: UNNotificationResponse?
  // Notifications already reported as opened: a scene's connection options and the notification
  // center can both deliver one.
  private var opened = RecentKeys(capacity: 32)
  private var launched = false

  /// Sets the notification center delegate when nothing has, and resumes VoIP pushes.
  func launch() {
    if launched { return }
    launched = true
    let center = UNUserNotificationCenter.current()
    if center.delegate == nil {
      // Flutter's app delegate forwards the callbacks to plugins.
      if let provider = UIApplication.shared.delegate as? FlutterAppLifeCycleProvider {
        center.delegate = provider
      } else {
        center.delegate = self
      }
    }
    calls.restoreVoip()
  }

  func listen(_ plugin: ConvoHopPlugin, _ sink: @escaping FlutterEventSink) {
    sinks[ObjectIdentifier(plugin)] = sink
  }

  func cancel(_ plugin: ConvoHopPlugin) {
    sinks[ObjectIdentifier(plugin)] = nil
  }

  /// Delivers an event to every Dart listener. Returns whether one listened.
  @discardableResult
  func emit(_ event: [String: Any]) -> Bool {
    for sink in sinks.values { sink(event) }
    return !sinks.isEmpty
  }

  func emitNotification(_ userInfo: [AnyHashable: Any]) {
    emit(["type": "notification", "payload": ConvoHopPush.plainObject(userInfo)])
  }

  /// Reports an APNs registration, `apns` or `apnsVoip`, to Dart.
  func emitRegistration(kind: String, token: String) {
    emit(["type": "registration", "kind": kind, "token": token])
  }

  /// Reports a call action to Dart, or keeps it until Dart takes it when nothing listens.
  func action(_ action: String, alertId: String, fields: [String: Any]?) {
    var event: [String: Any] = ["type": "callAction", "action": action, "alertId": alertId]
    if let fields = fields {
      event["payload"] = ["convohop": ConvoHopPush.plainObject(fields)]
    }
    if emit(event) { return }
    actions.append((at: Date(), event: event))
    if actions.count > ConvoHopPush.actionCapacity { actions.removeFirst() }
  }

  func takeInitial() -> [String: Any]? {
    defer { initial = nil }
    return initial
  }

  func takeActions() -> [[String: Any]] {
    let since = Date().addingTimeInterval(-ConvoHopPush.actionLifetime)
    defer { actions.removeAll() }
    return actions.filter { $0.at > since }.map { $0.event }
  }

  /// Registers with APNs. Returns the registration when APNs already issued a token in this
  /// process; a new token arrives in didRegisterForRemoteNotificationsWithDeviceToken.
  func register() -> [String: Any]? {
    UIApplication.shared.registerForRemoteNotifications()
    guard let token = apnsToken else { return nil }
    return ["kind": "apns", "token": token]
  }

  func registered(_ deviceToken: Data) {
    let token = ConvoHopPush.hex(deviceToken)
    if token == apnsToken { return }
    apnsToken = token
    emitRegistration(kind: "apns", token: token)
  }

  func requestPermission(_ result: @escaping FlutterResult) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) {
      granted, _ in
      DispatchQueue.main.async {
        if granted { UIApplication.shared.registerForRemoteNotifications() }
        result(granted)
      }
    }
  }

  /// Removes delivered message notifications, only `conversationId`'s when given.
  func removeDelivered(conversationId: String?, _ done: @escaping () -> Void) {
    removeDelivered(
      where: { data in
        data["eventType"] as? String == ConvoHopPayload.message
          && (conversationId == nil || data["conversationId"] as? String == conversationId)
      }, done)
  }

  /// Removes delivered notifications whose `convohop` object matches.
  func removeDelivered(where matches: @escaping ([String: Any]) -> Bool, _ done: @escaping () -> Void) {
    let center = UNUserNotificationCenter.current()
    center.getDeliveredNotifications { notifications in
      let identifiers = notifications.filter { notification in
        guard let data = ConvoHopPayload.object(notification.request.content.userInfo["convohop"])
        else { return false }
        return matches(data)
      }.map { $0.request.identifier }
      if !identifiers.isEmpty { center.removeDeliveredNotifications(withIdentifiers: identifiers) }
      DispatchQueue.main.async(execute: done)
    }
  }

  // MARK: Notification center

  /// Reports a ConvoHop notification that arrives in the foreground to Dart and chooses how to
  /// show it. `delegate` is true when this is the notification center's delegate itself.
  func willPresent(
    _ notification: UNNotification, delegate: Bool,
    _ completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    onMain {
      let userInfo = notification.request.content.userInfo
      guard userInfo["convohop"] != nil else {
        // Other plugins handle the app's other notifications.
        if delegate { completionHandler([]) }
        return
      }
      if notification === self.lastPresented { return }
      self.lastPresented = notification
      self.emitNotification(userInfo)
      completionHandler(self.presentation(userInfo))
    }
  }

  /// Reports a ConvoHop notification the user opened to Dart.
  func didReceive(
    _ response: UNNotificationResponse, delegate: Bool,
    _ completionHandler: @escaping () -> Void
  ) {
    onMain {
      guard response.notification.request.content.userInfo["convohop"] != nil else {
        if delegate { completionHandler() }
        return
      }
      if response === self.lastResponse { return }
      self.lastResponse = response
      self.open(response)
      completionHandler()
    }
  }

  /// Reports the notification that launched a scene.
  func connected(_ response: UNNotificationResponse) {
    if response.notification.request.content.userInfo["convohop"] != nil { open(response) }
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    willPresent(notification, delegate: true, completionHandler)
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    didReceive(response, delegate: true, completionHandler)
  }

  private func open(_ response: UNNotificationResponse) {
    let notification = response.notification
    guard response.actionIdentifier == UNNotificationDefaultActionIdentifier,
      opened.insert("\(notification.request.identifier)|\(notification.date.timeIntervalSince1970)")
    else { return }
    let userInfo = notification.request.content.userInfo
    var event: [String: Any] = ["type": "opened", "payload": ConvoHopPush.plainObject(userInfo)]
    // Dart learns whether an opened call still rings, and why it stopped.
    if let call = ConvoHopPayload.tryParse(userInfo["convohop"]),
      call.eventType == ConvoHopPayload.call
    {
      let reason = calls.stopped(call)
      event["ringing"] = reason == nil
      if let reason = reason { event["reason"] = reason }
    }
    if !emit(event) { initial = event }
  }

  private func presentation(_ userInfo: [AnyHashable: Any]) -> UNNotificationPresentationOptions {
    guard let payload = ConvoHopPayload.tryParse(userInfo["convohop"]) else { return [] }
    switch payload.eventType {
    case ConvoHopPayload.message:
      if payload.conversationId == activeConversation { return [] }
    case ConvoHopPayload.call:
      if calls.stopped(payload) != nil || calls.isRinging(payload) { return [] }
    default:
      if !calls.cancelled(payload) { return [] }
    }
    if #available(iOS 14.0, *) { return [.banner, .list, .sound] }
    return [.alert, .sound]
  }

  private func onMain(_ action: @escaping () -> Void) {
    if Thread.isMainThread { action() } else { DispatchQueue.main.async(execute: action) }
  }

  static func hex(_ data: Data) -> String {
    return data.map { String(format: "%02x", $0) }.joined()
  }

  /// An object the Flutter codec can carry: JSON types, without anything else a payload holds.
  static func plainObject(_ value: [AnyHashable: Any]) -> [String: Any] {
    return plain(value) as? [String: Any] ?? [:]
  }

  private static func plain(_ value: Any) -> Any? {
    switch value {
    case let string as String:
      return string
    case let number as NSNumber:
      return number
    case is NSNull:
      return NSNull()
    case let array as [Any]:
      return array.map { plain($0) ?? NSNull() }
    case let dictionary as [AnyHashable: Any]:
      var result: [String: Any] = [:]
      for (key, element) in dictionary {
        if let key = key.base as? String, let element = plain(element) { result[key] = element }
      }
      return result
    default:
      return nil
    }
  }
}

/// The most recent keys, up to a capacity.
struct RecentKeys {
  private let capacity: Int
  private var order: [String] = []
  private var keys = Set<String>()

  init(capacity: Int) {
    self.capacity = capacity
  }

  /// Adds `key`. Returns false when it's already there.
  mutating func insert(_ key: String) -> Bool {
    guard keys.insert(key).inserted else { return false }
    order.append(key)
    if order.count > capacity { keys.remove(order.removeFirst()) }
    return true
  }
}
