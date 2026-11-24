# Bankai Library — Apple (SwiftPM)

Two library products from one package:

- **`BankaiCore`**: platform-agnostic Swift primitives. `Repository` /
  `RepositoryFlow` (local-first with remote reconciliation), `FeatureFlag*`, `ListGroup`,
  `OpStack`, time and date helpers, and the type-erased Combine schedulers.
- **`BankaiApple`**: SwiftUI building blocks on top of it. `StyleTheme` / `Palette` /
  `DesignLanguage`, `SettingsCard`, `SettingsElement`, `SymbolIcon`, view modifiers,
  navigation helpers and `OSEnv`.

## Install

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/zheref/bankai-library", from: "0.1.0"),
],
targets: [
    .target(name: "MyApp", dependencies: [
        .product(name: "BankaiCore", package: "bankai-library"),
        .product(name: "BankaiApple", package: "bankai-library"),
    ]),
]
```

In Xcode, use **File › Add Package Dependencies…** with
`https://github.com/zheref/bankai-library` and an **Up to Next Major** rule.

**Migrating from the standalone packages:** first remove the old `zheref/BankaiCore` and
`zheref/BankaiApple` package references. If they stay alongside, the project gets two
`BankaiCore` modules and fails to resolve. Then link both products from
`bankai-library`; the `import` lines don't change.

Minimums: iOS 15, macOS 10.15, tvOS 15, watchOS 6, Mac Catalyst 15. Swift tools 6.0.

## Versioning and release

- Versions follow [SemVer](https://semver.org). Releases are tagged with **bare** semantic
  versions (`0.1.0`), because SwiftPM resolves nothing else. That tag namespace belongs to
  this package alone: the Android and JS packages tag `android/vX.Y.Z` and `js/vX.Y.Z`.
- Publishing *is* the tag: once `X.Y.Z` is pushed, consumers can resolve it. There's no
  registry upload. Tags are cut only on the maintainer's go.
- Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Develop

```sh
swift build && swift test           # macOS
xcodebuild -scheme BankaiLibrary-Package -destination 'generic/platform=iOS Simulator' build
```

Seed sources and every change made in the move: [PROVENANCE.md](PROVENANCE.md).
