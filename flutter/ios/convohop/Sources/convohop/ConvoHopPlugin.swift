import Flutter
import UIKit
import UserNotifications

/// ConvoHop's plugin on iOS: APNs and VoIP pushes, their notifications, and calls through CallKit.
public final class ConvoHopPlugin: NSObject, FlutterPlugin, FlutterStreamHandler,
  FlutterSceneLifeCycleDelegate
{
  public static func register(with registrar: FlutterPluginRegistrar) {
    let instance = ConvoHopPlugin()
    let methods = FlutterMethodChannel(name: "convohop/push", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(instance, channel: methods)
    FlutterEventChannel(name: "convohop/push/events", binaryMessenger: registrar.messenger())
      .setStreamHandler(instance)
    registrar.addApplicationDelegate(instance)
    registrar.addSceneDelegate(instance)
    // Published so that detachFromEngine(for:) gets called.
    registrar.publish(instance)
    ConvoHopPush.shared.launch()
  }

  /// Sets up pushes when the app launches. Call it in your app delegate's
  /// `application(_:didFinishLaunchingWithOptions:)` when plugins register after launch, as they
  /// do in apps with scenes: iOS terminates an app that a VoIP push launched unless it reports
  /// the call, and it reports the notification that launched the app only to a delegate set by
  /// then.
  @objc public static func handleLaunch() {
    ConvoHopPush.shared.launch()
  }

  public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let push = ConvoHopPush.shared
    let arguments = call.arguments as? [String: Any] ?? [:]
    func string(_ key: String) -> String? {
      guard let value = arguments[key] as? String, !value.isEmpty else { return nil }
      return value
    }
    switch call.method {
    case "getInitialNotification":
      result(push.takeInitial())
    case "takeCallActions":
      result(push.takeActions())
    case "requestPermission":
      push.requestPermission(result)
    case "register":
      result(push.register())
    case "registerVoip":
      push.calls.registerVoip()
      result(nil)
    case "canUseFullScreenIntent":
      result(true)
    case "showNotification":
      // iOS shows APNs alerts itself.
      result(false)
    case "showIncomingCall":
      guard let ring = ConvoHopPayload.tryParse(arguments["convohop"]),
        ring.eventType == ConvoHopPayload.call
      else {
        result(ConvoHopPlugin.invalid)
        return
      }
      push.calls.show(ring) { error in
        result(
          error == nil
            ? nil : FlutterError(code: "CALL_FAILED", message: "CallKit refused the call", details: nil))
      }
    case "answerCall", "declineCall":
      guard let alertId = string("alertId") else {
        result(ConvoHopPlugin.invalid)
        return
      }
      if call.method == "answerCall" {
        push.calls.answer(alertId) { result($0) }
      } else {
        push.calls.decline(alertId) { result($0) }
      }
    case "endCall":
      guard let alertId = string("alertId"), let reason = string("reason") else {
        result(ConvoHopPlugin.invalid)
        return
      }
      push.calls.end(alertId, reason: reason)
      result(nil)
    case "removeDeliveredNotifications":
      push.removeDelivered(conversationId: string("conversationId")) { result(nil) }
    case "setActiveConversation":
      push.activeConversation = string("conversationId")
      result(nil)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private static var invalid: FlutterError {
    return FlutterError(code: "INVALID_ARGUMENT", message: "Invalid arguments", details: nil)
  }

  public func detachFromEngine(for registrar: FlutterPluginRegistrar) {
    ConvoHopPush.shared.cancel(self)
  }

  // MARK: Events

  public func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink)
    -> FlutterError?
  {
    ConvoHopPush.shared.listen(self, events)
    return nil
  }

  public func onCancel(withArguments arguments: Any?) -> FlutterError? {
    ConvoHopPush.shared.cancel(self)
    return nil
  }

  // MARK: App and scene

  public func application(
    _ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    ConvoHopPush.shared.registered(deviceToken)
  }

  public func application(
    _ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    let error = error as NSError
    NSLog("ConvoHop: APNs registration failed (%@ %ld)", error.domain, error.code)
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    ConvoHopPush.shared.willPresent(notification, delegate: false, completionHandler)
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    ConvoHopPush.shared.didReceive(response, delegate: false, completionHandler)
  }

  public func scene(
    _ scene: UIScene, willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions?
  ) -> Bool {
    if let response = connectionOptions?.notificationResponse {
      ConvoHopPush.shared.connected(response)
    }
    // Leaves the connection options to other plugins too.
    return false
  }
}
