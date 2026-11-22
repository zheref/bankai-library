# Changelog — Android / JVM package

All notable changes to `io.zheref.bankai.core:BankaiCore` and
`io.zheref.bankai.udf:BankaiUDF`. Tags are `android/vX.Y.Z`.

## [Unreleased]

### Added

- `BankaiCore` and `BankaiUDF`, seeded from zheref/BankaiAndroid@abe302d, built as one
  Gradle build with `maven-publish` (see PROVENANCE.md). Proposed first release:
  `android/v0.1.0`.

### Changed

- `BankaiUDF` now declares `BankaiCore` as a runtime dependency (it was `compileOnly` in
  the seed).
- `kotlinx-datetime` (BankaiCore) and `kotlinx-coroutines-core` (BankaiUDF) are now `api`
  (POM `compile` scope), because their types are part of the public API.
