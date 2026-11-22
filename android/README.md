# Bankai Library — Android / JVM (Gradle, Maven)

Two pure-JVM Kotlin artifacts, released together under one version:

| Artifact | Purpose |
| --- | --- |
| `io.zheref.bankai.core:BankaiCore` | Core utilities: string and collection helpers, thread helpers, date/time parity extensions (kotlinx-datetime), `ZBinding` and other parity types. |
| `io.zheref.bankai.udf:BankaiUDF` | Unidirectional data flow: a Redux-style `Store` (`createStore`, `createSameThreadEnforcedStore`, typed variants), `applyMiddleware`, `combineReducers`, thunks, and `createFlow` over coroutines. Depends on `BankaiCore`. |

Both target JDK 17 bytecode (class-file version 61), so Android modules on
`JavaVersion.VERSION_17` can consume them.

## Install

```kotlin
dependencies {
    implementation("io.zheref.bankai.core:BankaiCore:0.1.0")
    implementation("io.zheref.bankai.udf:BankaiUDF:0.1.0")
}
```

Add the repository the release was published to (see *Publishing* below).

### Moving off the `bankai/` submodule

KroAndroid-style consumers today `includeBuild("bankai/BankaiCore")` and
`includeBuild("bankai/BankaiUDF")`. The coordinates are unchanged, so moving over takes
three steps: delete the two `includeBuild` lines and the submodule, add the published
repository, and declare the two dependencies at the released version.

## Versioning and release

- [SemVer](https://semver.org). The single version lives in `gradle.properties`
  (`bankaiVersion`), and both artifacts always share it.
- Releases are tagged `android/vX.Y.Z`. That prefix keeps the tag out of the bare `X.Y.Z`
  namespace SwiftPM uses for the Apple package, so each stack versions independently.
- Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

### Publishing

The build carries `maven-publish` (jar, sources jar, POM). `./gradlew publishToMavenLocal`
works anywhere. The **public registry is still the maintainer's decision**, made before the
first tag:

- **GitHub Packages**: wired already. The `GitHubPackages` repository activates when
  `GITHUB_ACTOR` and `GITHUB_TOKEN` are set (`./gradlew publish`). Consumers need a GitHub
  token to resolve from it, even for a public repository.
- **Maven Central**: anonymous resolution for every consumer. It needs the `io.zheref`
  namespace verified on Sonatype Central and a signing key, and it would add the
  signing/Central publishing plugin.

Nothing is published until the maintainer says go.

## Develop

```sh
cd android
./gradlew build                  # compile + tests (JDK 17 toolchain, auto-provisioned)
./gradlew publishToMavenLocal    # inspect the artifacts in ~/.m2
```

Seed sources and every change made in the move: [PROVENANCE.md](PROVENANCE.md).
Third-party notices: [NOTICE.md](NOTICE.md).
