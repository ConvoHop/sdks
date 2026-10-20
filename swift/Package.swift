// swift-tools-version:6.1

import PackageDescription

let package = Package(
    name: "Relay",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        // The client: sessions, conversations, messages, realtime, calls and push routing.
        .library(name: "Relay", targets: ["Relay"]),
        // Native call media with the official LiveKit Swift SDK.
        .library(name: "RelayLiveKit", targets: ["RelayLiveKit"]),
        // Push payload parsing and dedupe. Foundation only and safe in app extensions.
        .library(name: "RelayPush", targets: ["RelayPush"]),
        // PushKit to CallKit for incoming calls, and CallKit for outgoing calls.
        .library(name: "RelayCalls", targets: ["RelayCalls"]),
        // A Notification Service Extension helper that fetches message content on the device.
        .library(name: "RelayNotificationService", targets: ["RelayNotificationService"]),
    ],
    dependencies: [
        .package(url: "https://github.com/livekit/client-sdk-swift.git", from: "2.17.0"),
    ],
    targets: [
        .target(name: "RelayPush"),
        .target(name: "RelayCalls", dependencies: ["RelayPush"]),
        .target(name: "Relay", dependencies: ["RelayPush"]),
        .target(name: "RelayNotificationService", dependencies: ["Relay", "RelayPush"]),
        .target(
            name: "RelayLiveKit",
            dependencies: [
                "Relay",
                .product(name: "LiveKit", package: "client-sdk-swift"),
            ]
        ),
        .testTarget(
            name: "RelayTests",
            dependencies: ["Relay", "RelayPush", "RelayCalls", "RelayNotificationService"],
            resources: [.copy("Fixtures")]
        ),
    ]
)
