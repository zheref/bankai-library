# Provenance — Apple package (SwiftPM)

Seeded on 2026-11-22 for [zheref/hatsu#618](https://github.com/zheref/hatsu/issues/618).

| Target | Seed source | Commit | Notes |
| --- | --- | --- | --- |
| `BankaiCore` | [zheref/BankaiCore](https://github.com/zheref/BankaiCore) `Sources/BankaiCore`, `Tests/BankaiCoreTests` | `b056f5c` (2025-05-25) | Copied as-is. `BankaiCore.swift` (an empty `import Combine` stub) was dropped. `AnyScheduler.swift` is vendored third-party code, now marked with a two-line attribution header; see [NOTICE.md](NOTICE.md). |
| `BankaiApple` | [zheref/BankaiApple](https://github.com/zheref/BankaiApple) `Sources/BankaiApple`, `Tests/BankaiAppleTests` | `a69891e` (2025-05-25) | Copied as-is. Three empty placeholder files were dropped: `BankaiApple.swift`, `Components/TextInput.swift` and `Modifiers/OnReturnPressModifier.swift` (both "moved to Kro"). |

Both standalone repositories were extracted from the polyglot
[zheref/Bankai](https://github.com/zheref/Bankai) monorepo (`Swift/BankaiCore`,
`Swift/BankaiApple`, last touched `46c94d7`). The standalone copies are the newer of the
two: they add the `FeatureFlags.swift` doc comments, and `BankaiApple` depends on
`BankaiCore`. That makes them the seed.

## What changed in the move

- One package, `BankaiLibrary`, with two products, `BankaiCore` and `BankaiApple`. Its
  manifest is the repository-root `Package.swift`, because SwiftPM resolves a package at
  its repository's root. The old remote `BankaiCore` dependency on `branch: "main"` became
  an in-package target dependency.
- Platforms take the **higher** floor of the two seeds, because SwiftPM's `platforms`
  apply to the whole package. That means `BankaiCore` moves from iOS 13 to iOS 15 (with
  tvOS and Mac Catalyst 15) to match `BankaiApple`, and a BankaiCore-only consumer
  inherits the higher floor. macOS stays at 10.15 and watchOS at 6. The maintained
  consumer, KroApple, deploys to iOS 17.0+ and macOS 12.4+, so it's unaffected.
- Swift settings are unchanged: Swift 5 language mode with the `StrictConcurrency`
  experimental flag, as in both seeds.

## Not seeded

- `zheref/bankai-core` (archived) is the legacy version of Hatsu/Nen, not a component
  library. Nothing was taken from it (Sergio's ruling, 2026-11-22).
- No Insulet or GlobalLogic code or data is in this package.
