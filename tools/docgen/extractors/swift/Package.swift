// swift-tools-version:6.1

import PackageDescription

// The Swift surface extractor for the docs pipeline (docs/docs-pipeline.md). It parses the SDK's sources with
// swift-syntax and never compiles them, so every toolchain and host prints the same surface. swift-syntax is pinned
// exactly because its parser decides the output.
let package = Package(
    name: "SwiftSurface",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "swift-surface", targets: ["swift-surface"]),
    ],
    dependencies: [
        .package(url: "https://github.com/swiftlang/swift-syntax.git", exact: "601.0.1"),
    ],
    targets: [
        .target(
            name: "SwiftSurface",
            dependencies: [
                .product(name: "SwiftSyntax", package: "swift-syntax"),
                .product(name: "SwiftParser", package: "swift-syntax"),
                .product(name: "SwiftParserDiagnostics", package: "swift-syntax"),
                .product(name: "SwiftDiagnostics", package: "swift-syntax"),
            ]
        ),
        .executableTarget(name: "swift-surface", dependencies: ["SwiftSurface"]),
        .testTarget(name: "SwiftSurfaceTests", dependencies: ["SwiftSurface"]),
    ]
)
