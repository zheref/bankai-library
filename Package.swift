// swift-tools-version: 6.0
// Bankai Library — Apple package (SwiftPM).
//
// This manifest lives at the repository root because SwiftPM resolves a package from
// the root of its git repository. Sources live under apple/. The Apple package is
// tagged with bare semantic versions (X.Y.Z); the Android and JS packages use
// prefixed tags (android/vX.Y.Z, js/vX.Y.Z), which SwiftPM ignores.

import PackageDescription

let strictConcurrencySettings: [SwiftSetting] = [
    .swiftLanguageMode(.v5),
    .enableExperimentalFeature("StrictConcurrency", .when(platforms: []))
]

// Platforms are the higher floor of the two seeds; SwiftPM applies them package-wide.
let package = Package(
    name: "BankaiLibrary",
    platforms: [.macOS(.v10_15), .iOS(.v15), .tvOS(.v15), .watchOS(.v6), .macCatalyst(.v15)],
    products: [
        .library(name: "BankaiCore", targets: ["BankaiCore"]),
        .library(name: "BankaiApple", targets: ["BankaiApple"]),
    ],
    targets: [
        .target(
            name: "BankaiCore",
            path: "apple/Sources/BankaiCore",
            swiftSettings: strictConcurrencySettings
        ),
        .target(
            name: "BankaiApple",
            dependencies: ["BankaiCore"],
            path: "apple/Sources/BankaiApple",
            swiftSettings: strictConcurrencySettings
        ),
        .testTarget(
            name: "BankaiCoreTests",
            dependencies: ["BankaiCore"],
            path: "apple/Tests/BankaiCoreTests",
            swiftSettings: strictConcurrencySettings
        ),
        .testTarget(
            name: "BankaiAppleTests",
            dependencies: ["BankaiApple"],
            path: "apple/Tests/BankaiAppleTests",
            swiftSettings: strictConcurrencySettings
        ),
    ]
)
