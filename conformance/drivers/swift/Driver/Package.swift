// swift-tools-version:6.1

import PackageDescription

// The conformance driver for the Swift SDK, built against this repository's swift/ directory. It lives in Driver/
// because SwiftPM names a path package after its directory: a package in a directory named swift couldn't depend on
// the SDK, whose directory is also named swift.
let package = Package(
    name: "ConvoHopConformanceDriver",
    platforms: [.macOS(.v12)],
    dependencies: [
        .package(path: "../../../../swift"),
    ],
    targets: [
        .executableTarget(
            name: "ConvoHopConformanceDriver",
            dependencies: [.product(name: "ConvoHop", package: "swift")]
        ),
    ]
)
