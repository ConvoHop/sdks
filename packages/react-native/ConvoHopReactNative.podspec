require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# The ConvoHop Swift package: ConvoHopPush and ConvoHopCalls. React Native's spm_dependency adds it to the Pods
# project as a local package, by its absolute path. CONVOHOP_SWIFT_PACKAGE overrides the path, which defaults to this
# repository's swift/.
swift_package = File.expand_path(ENV["CONVOHOP_SWIFT_PACKAGE"] || File.join(__dir__, "..", "..", "swift"))
unless File.exist?(File.join(swift_package, "Package.swift"))
  raise "ConvoHopReactNative: no Package.swift in #{swift_package}. Set CONVOHOP_SWIFT_PACKAGE to a checkout of the ConvoHop Swift package"
end

# Before 0.84, spm_dependency takes only remote package URLs. Resolve React Native as the Podfile does.
react_native_version = JSON.parse(File.read(Pod::Executable.execute_command("node", ["-p",
  "require.resolve('react-native/package.json', {paths: [process.argv[1]]})", Pod::Config.instance.installation_root.to_s]).strip))["version"]
if Gem::Version.new(react_native_version).release < Gem::Version.new("0.84")
  raise "ConvoHopReactNative needs React Native 0.84 or later on iOS. This app has #{react_native_version}"
end

Pod::Spec.new do |s|
  s.name = "ConvoHopReactNative"
  s.version = package["version"]
  s.summary = package["description"]
  s.license = package["license"]
  s.homepage = "https://github.com/ConvoHop/sdks/tree/main/packages/react-native"
  s.authors = "ConvoHop"
  s.source = { git: "https://github.com/ConvoHop/sdks.git", tag: "react-native-v#{s.version}" }
  s.platforms = { ios: min_ios_version_supported }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  # ConvoHopPush keeps the notifications it handled in UserDefaults, in the App Group's suite when there is one.
  s.resource_bundles = { "ConvoHopReactNative_privacy" => ["ios/PrivacyInfo.xcprivacy"] }
  s.swift_version = "6.0"
  s.frameworks = "AVFoundation", "CallKit", "PushKit", "Security", "UserNotifications"
  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }

  install_modules_dependencies(s)
  spm_dependency(s, url: swift_package, requirement: {}, products: ["ConvoHopPush", "ConvoHopCalls"])
end
