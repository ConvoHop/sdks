import React_RCTAppDelegate
import UIKit

// Apps built with the iOS 27 SDK must use scenes. The app has one, which shows React Native.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let factory = (UIApplication.shared.delegate as? AppDelegate)?.reactNativeFactory
    else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(withModuleName: "ConvoHopExample", in: window)
  }
}
