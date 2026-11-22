# Provenance — JavaScript / TypeScript package (npm)

Seeded on 2026-11-22 for [zheref/hatsu#618](https://github.com/zheref/hatsu/issues/618).

## Why this is a port, not a copy

The epic's plan notes named the archived `zheref/bankai-core` as this package's seed.
Sergio ruled otherwise on 2026-11-22: `bankai-core` is the **legacy version of
Hatsu/Nen** (process machinery and handbooks), not a component library, and must not be
touched. It holds no reusable TypeScript library to copy anyway. Nothing in this package
comes from it.

Per the same ruling, the JS package is a **TypeScript port of the existing Bankai
libraries**, so every supported stack has a version of the same primitives:

| Module | Ported from | Commit |
| --- | --- | --- |
| `featureFlags.ts` | zheref/BankaiCore `FeatureFlags.swift` | `b056f5c` |
| `listGroup.ts` | zheref/BankaiCore `ListGroup.swift`, `Printable.swift` | `b056f5c` |
| `opStack.ts` | zheref/BankaiCore `OpStack.swift` | `b056f5c` |
| `repository.ts` | zheref/BankaiCore `Repository.swift`, `Repository+Core.swift`, `ARepositoryOf.swift`, `RepositoryFlow.swift` | `b056f5c` |
| `time.ts` | zheref/BankaiCore `StandardExtensions.swift`, `Date+Extensions.swift`; zheref/BankaiAndroid `parity/Date+Extensions.kt` | `b056f5c`, `abe302d` |
| `collections.ts` | zheref/BankaiCore `Collections+Extensions.swift`; zheref/BankaiAndroid `utils/Collections.kt` | `b056f5c`, `abe302d` |
| `strings.ts` | zheref/BankaiAndroid `utils/Strings.kt`; BankaiCore `String.randomUUID` | `abe302d`, `b056f5c` |
| `binding.ts` | zheref/BankaiAndroid `parity/Standard.kt` (`ZBinding`) | `abe302d` |
| `udf/index.ts` | zheref/BankaiAndroid `BankaiUDF/src/main/kotlin/redux/*.kt` (adapted from ReduxKotlin, MIT; see [NOTICE.md](NOTICE.md)) | `abe302d` |

The tests port the seeds' own suites where they exist (`StandardExtensionsTests.swift`,
`DateExtensionsTests.swift`, `RepositoryTests.swift`, `RepositoryFlowTests.swift`,
`StringsTests.kt`, `CollectionTests.kt`) and add coverage for the rest.

## Deliberate differences from the seeds

Idiomatic TypeScript, with behaviour matching on every case the seeds test. Where a seed
had a defect, the port fixes it rather than copy it:

- **Durations are seconds** (`Duration.minutes(10)` → `600`), like `TimeInterval`.
  `readable()` agrees with the Swift test table. Two fixes: plurals use `count !== 1`
  (Swift used `> 1`, giving `"0 second"`), and the abbreviated minute/second labels are
  `min`/`sec` (Swift had the plural and singular abbreviations swapped).
- **`Repository.save(items, attemptPush)` honours `attemptPush`.** The Swift version
  ignored the flag and always pushed.
- **`Repository.fetch` control flow** (Swift `Repository+Core.swift`):
  - `filter.onlyLocally` now skips the remotes. Swift still pulled them after completing.
  - A repository with no remotes completes after the local snapshot even when
    `onlyLocally: false` is passed. Swift's flow never completed in that case.
  - A failed local retrieve stops the fetch. Swift went on to pull the remotes into a
    flow that had already failed.
  - The first failing remote stops the remaining remotes. Swift's loop kept pulling.
  - The array the local source returns is copied before remotes are merged into it, so
    a source that hands back its own backing array is never mutated. Swift arrays copy
    on assignment, so the seed never had this problem; the port must copy explicitly.
- **`RepositoryFlow`** keeps the `onLocal` / `onRemote` / `onFailure` / `onCompletion`
  + `run()` shape. Combine's `republish()` becomes `snapshots()`, an async iterator.
  Unlike `republish()`'s unbounded buffer, a flow has **one consumer** and runs once:
  a second `run()` or `snapshots()` throws instead of hanging or replaying. Debug
  `print` calls weren't carried over. An exception escaping the body becomes a
  `RepoSyncError` failure instead of being dropped, and a body that returns without
  completing the flow completes it. An exception thrown by a consumer's handler is
  re-thrown as uncaught, never reported as a repository failure.
- **`readable()` bucket edges** use a 30-day month and a 365-day year, so it never
  reads "0 months" (28–29 days) or "0 years" (360–364 days). The Swift seed did.
- **`OpStack`** no longer prints to the console.
- **UDF store:** unsubscribing twice is a no-op (the Kotlin version fell through to
  `removeAt(-1)`). A reducer that dispatches now throws `Reducers may not dispatch
  actions.`, as redux.js and ReduxKotlin do. The Kotlin seed had that guard commented
  out, and the nested dispatch's state was silently lost. `combineReducers` keeps BankaiUDF's *sequential* semantics, not
  redux.js's keyed ones. The JVM-only pieces have no JS counterpart and weren't ported:
  `createSameThreadEnforcedStore`, thread utilities, the coroutine `createFlow`, the
  Combine schedulers and the deprecated aliases.

No Insulet or GlobalLogic code or data is in this package.
