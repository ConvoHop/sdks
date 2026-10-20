// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "instantrelay",
    platforms: [
        .iOS("13.0")
    ],
    products: [
        .library(name: "instantrelay", targets: ["instantrelay"])
    ],
    dependencies: [
        // Flutter 3.41 and later generate this package; see the package README.
        .package(name: "FlutterFramework", path: "../FlutterFramework")
    ],
    targets: [
        .target(
            name: "instantrelay",
            dependencies: [
                .product(name: "FlutterFramework", package: "FlutterFramework")
            ],
            resources: [
                .process("PrivacyInfo.xcprivacy")
            ]
        )
    ]
)
