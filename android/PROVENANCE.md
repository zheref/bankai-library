# Provenance — Android / JVM package (Gradle)

Seeded on 2026-11-22 for [zheref/hatsu#618](https://github.com/zheref/hatsu/issues/618).

| Module | Seed source | Commit | Notes |
| --- | --- | --- | --- |
| `BankaiCore` | [zheref/BankaiAndroid](https://github.com/zheref/BankaiAndroid) `BankaiCore/src` | `abe302d` (2026-08-09) | Sources and tests copied as-is. |
| `BankaiUDF` | [zheref/BankaiAndroid](https://github.com/zheref/BankaiAndroid) `BankaiUDF/src` | `abe302d` (2026-08-09) | Sources and tests copied as-is. The Redux core is adapted MIT code; see [NOTICE.md](NOTICE.md). |

zheref/BankaiAndroid is the flattened, Android-only extraction of the polyglot
[zheref/Bankai](https://github.com/zheref/Bankai) monorepo (`Kotlin/BankaiCore`,
`Kotlin/BankaiUDF`), and it's what KroAndroid consumes today as the `bankai/` git
submodule. That makes it the seed. The monorepo's other Kotlin modules (`BankaiReactive`
and the Compose `BankaiAndroid` library with its sample app) were not part of this
package's scope and stay in zheref/Bankai.

## What changed in the move

- **One Gradle build, two artifacts.** The seed's two standalone builds (each with its own
  wrapper, joined by `includeBuild("../BankaiCore")`) became one multi-project build under
  `android/`, with `:BankaiCore` and `:BankaiUDF`.
- **Coordinates kept:** `io.zheref.bankai.core:BankaiCore` and
  `io.zheref.bankai.udf:BankaiUDF`. Only the version changes, from `1.0-SNAPSHOT` to a
  released `bankaiVersion` (see `gradle.properties`).
- **`BankaiUDF` → `BankaiCore` is now a real dependency.** The seed had it `compileOnly`,
  which left BankaiCore off a consumer's runtime classpath even though
  `createSameThreadEnforcedStore` and `createStore` call it. The published POM now
  declares it.
- **Gradle wrapper regenerated, not copied.** The seed's `gradle-wrapper.jar` didn't match
  the published checksum for its declared Gradle 8.4, so it was dropped. The wrapper was
  regenerated with Gradle 9.5.1 (the version KroAndroid builds with) from the official
  distribution, sha256-verified. `distributionSha256Sum` pins it, and CI validates the jar.
- The foojay toolchain resolver moved from 0.5.0 to 1.0.0 (KroAndroid's version), since
  0.5.0 predates Gradle 9.
- Unchanged: Kotlin 2.3.20, `jvmToolchain(17)`, kotlinx-datetime 0.7.1,
  kotlinx-coroutines 1.6.4, and the `-opt-in=kotlin.time.ExperimentalTime` flag on
  BankaiCore.
- **Public-API dependencies are `api`.** The seed had them `implementation`:
  `kotlinx-datetime` in BankaiCore and `kotlinx-coroutines-core` in BankaiUDF. Their
  types appear in public signatures (`asLocalTime(): LocalTime`, `createFlow(…): Flow<T>`),
  so as `runtime`-scope POM dependencies a consumer couldn't compile calls to them. The
  `includeBuild` setup had hidden that.
- Added `maven-publish` with sources and javadoc jars and POM metadata (description,
  MIT, SCM).
- Inherited and left as-is: each module's `Main.kt` keeps its public `main()`, and
  `ConvenienceTests` keeps a JUnit 4 `@get:Rule` that has no effect under JUnit Jupiter.

## Not seeded

- `zheref/bankai-core` (archived) is the legacy version of Hatsu/Nen, not a component
  library. Nothing was taken from it (Sergio's ruling, 2026-11-22).
- No Insulet or GlobalLogic code or data is in this package.
