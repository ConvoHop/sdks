// swift-tools-version:6.1

import PackageDescription

// The Swift samples in the docs, built against this repository's swift/ directory, so they always match the SDK they
// document. SwiftPM names a path package after its directory, so the SDK's package is "swift" here. The package and
// its product share a name, so Xcode's scheme for them is "Examples" whichever it's named after.
let package = Package(
    name: "Examples",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "Examples", targets: ["Examples"]),
    ],
    dependencies: [
        .package(path: "../../../../swift"),
    ],
    targets: [
        .target(
            name: "Examples",
            dependencies: [
                .product(name: "ConvoHop", package: "swift"),
                .product(name: "ConvoHopCalls", package: "swift"),
                .product(name: "ConvoHopLiveKit", package: "swift"),
                .product(name: "ConvoHopNotificationService", package: "swift"),
            ]
        ),
        .testTarget(
            name: "ExamplesTests",
            dependencies: [
                "Examples",
                .product(name: "ConvoHop", package: "swift"),
                .product(name: "ConvoHopNotificationService", package: "swift"),
            ]
        ),
    ]
)
