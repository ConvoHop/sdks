// swift-tools-version:6.1

import PackageDescription

let package = Package(
    name: "ConvoHop",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        // The client: sessions, conversations, messages, realtime, calls and push routing.
        .library(name: "ConvoHop", targets: ["ConvoHop"]),
        // Native call media with the official LiveKit Swift SDK.
        .library(name: "ConvoHopLiveKit", targets: ["ConvoHopLiveKit"]),
        // Push payload parsing and dedupe. Foundation only and safe in app extensions.
        .library(name: "ConvoHopPush", targets: ["ConvoHopPush"]),
        // PushKit to CallKit for incoming calls, and CallKit for outgoing calls.
        .library(name: "ConvoHopCalls", targets: ["ConvoHopCalls"]),
        // A Notification Service Extension helper that fetches message content on the device.
        .library(name: "ConvoHopNotificationService", targets: ["ConvoHopNotificationService"]),
    ],
    dependencies: [
        .package(url: "https://github.com/livekit/client-sdk-swift.git", from: "2.17.0"),
    ],
    targets: [
        .target(name: "ConvoHopPush"),
        .target(name: "ConvoHopCalls", dependencies: ["ConvoHopPush"]),
        .target(name: "ConvoHop", dependencies: ["ConvoHopPush"]),
        .target(name: "ConvoHopNotificationService", dependencies: ["ConvoHop", "ConvoHopPush"]),
        .target(
            name: "ConvoHopLiveKit",
            dependencies: [
                "ConvoHop",
                .product(name: "LiveKit", package: "client-sdk-swift"),
            ]
        ),
        .testTarget(
            name: "ConvoHopTests",
            dependencies: ["ConvoHop", "ConvoHopPush", "ConvoHopCalls", "ConvoHopNotificationService"],
            resources: [.copy("Resources")]
        ),
    ]
)
