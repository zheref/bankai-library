# Bankai Library

Reusable components for the Bankai stacks, published as **one versioned package per
supported stack** from a single public monorepo:

| Stack | Package | Path | Tag scheme | Consume with |
| --- | --- | --- | --- | --- |
| Apple (SwiftPM) | `BankaiCore`, `BankaiApple` products | `Package.swift`, `apple/` | `X.Y.Z` (bare semver — SwiftPM's requirement) | `.package(url: "https://github.com/zheref/bankai-library", from: "X.Y.Z")` |
| Android / JVM (Gradle, Maven) | `io.zheref.bankai.core:BankaiCore`, `io.zheref.bankai.udf:BankaiUDF` | `android/` | `android/vX.Y.Z` | Maven coordinates at that version |
| JavaScript / TypeScript (npm) | `@zheref/bankai-core` | `js/` | `js/vX.Y.Z` | `npm install @zheref/bankai-core@X.Y.Z` |

Each package is versioned and tagged **independently**: a release of one stack never
moves another stack's version. SwiftPM resolves only bare semantic-version tags, so the
bare `X.Y.Z` namespace belongs to the Apple package; the other stacks use prefixed tags,
which SwiftPM ignores.

The stack packages land through pull requests that follow this bootstrap commit. Each
records its seed sources in its own `PROVENANCE.md`.

Tracking epic: [zheref/hatsu#618](https://github.com/zheref/hatsu/issues/618).

## License

[MIT](LICENSE). Vendored third-party code keeps its own notice in the package that
carries it.
