// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "convohop",
    platforms: [
        .iOS("13.0")
    ],
    products: [
        .library(name: "convohop", targets: ["convohop"])
    ],
    dependencies: [
        // Flutter 3.41 and later generate this package; see the package README.
        .package(name: "FlutterFramework", path: "../FlutterFramework")
    ],
    targets: [
        .target(
            name: "convohop",
            dependencies: [
                .product(name: "FlutterFramework", package: "FlutterFramework")
            ],
            resources: [
                .process("PrivacyInfo.xcprivacy")
            ]
        )
    ]
)
