import ConvoHopReactNative
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // iOS can launch the app for a VoIP push and terminates an app that doesn't report each one to CallKit, and it
    // reports the notification that launched the app only to a delegate set by now. So the push and call modules
    // start here, before React Native. Debug builds are signed for APNs's development server; change this if you
    // sign differently.
    #if DEBUG
      ConvoHopReactNative.configure(.init(apnsEnvironment: .development))
    #else
      ConvoHopReactNative.configure(.init(apnsEnvironment: .production))
    #endif

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory
    // SceneDelegate starts React Native in the scene's window.
    return true
  }

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    ConvoHopReactNative.didRegisterForRemoteNotifications(deviceToken: deviceToken)
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    ConvoHopReactNative.didFailToRegisterForRemoteNotifications(error: error)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
