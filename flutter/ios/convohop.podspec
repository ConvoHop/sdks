Pod::Spec.new do |s|
  s.name             = 'convohop'
  s.version          = '0.0.0'
  s.summary          = 'ConvoHop push notifications and CallKit calls for Flutter on iOS.'
  s.description      = <<-DESC
The iOS part of the convohop Flutter package: APNs alerts, PushKit VoIP pushes
and CallKit incoming calls.
                       DESC
  s.homepage         = 'https://github.com/ConvoHop/sdks/tree/main/flutter'
  s.license          = { :type => 'Apache-2.0', :file => '../LICENSE' }
  s.author           = { 'ConvoHop' => 'https://github.com/ConvoHop' }
  s.source           = { :path => '.' }
  s.source_files     = 'convohop/Sources/convohop/**/*.swift'
  s.resource_bundles = { 'convohop_privacy' => ['convohop/Sources/convohop/PrivacyInfo.xcprivacy'] }
  s.frameworks       = 'CallKit', 'PushKit', 'UserNotifications'
  s.dependency 'Flutter'
  s.platform = :ios, '13.0'

  # Flutter.framework does not contain a i386 slice.
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386' }
  s.swift_version = '5.0'
end
