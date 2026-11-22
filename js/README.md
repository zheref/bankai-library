# Bankai Library — JavaScript / TypeScript (npm)

`@zheref/bankai-core` holds the same primitives as the Swift and Kotlin packages, for any
ES2022 runtime (Node 20+, modern browsers). It's ESM only, ships typings, and has no
runtime dependencies.

```sh
npm install @zheref/bankai-core
```

## What's in it

| Import | Contents |
| --- | --- |
| `@zheref/bankai-core` | `Repository` / `RepositoryFlow` (local-first fetch, merging remote snapshots by `updatedAt`), `FeatureFlag` + `InMemoryFeatureFlagService`, `ListGroup`, `OpStack`, `Duration` / `readable` / date helpers, collection and string helpers, `Binding`. |
| `@zheref/bankai-core/udf` | A Redux-style store: `createStore`, `applyMiddleware`, `combineReducers` (sequential), `compose`, `middleware`, `createThunkMiddleware`. |

```ts
import { Repository, readable, Duration } from "@zheref/bankai-core";

const repository = new Repository(localSource).addRemote(apiSource);
repository
  .fetch()
  .onLocal((items) => render(items))
  .onRemote((items, remote) => render(items))
  .onCompletion(() => setLoading(false))
  .run();

// or: for await (const snapshot of repository.fetch().snapshots()) { … }

readable(Duration.weeks(20)); // "4 months"
```

```ts
import { createStore, applyMiddleware, createThunkMiddleware } from "@zheref/bankai-core/udf";

const store = createStore(reducer, initialState, applyMiddleware(createThunkMiddleware()));
```

## Versioning and release

- [SemVer](https://semver.org). The version is `package.json`'s `version`.
- Releases are tagged `js/vX.Y.Z`. The prefix keeps the tag out of the bare `X.Y.Z`
  namespace SwiftPM uses for the Apple package, so each stack versions independently.
- Publishing is `npm publish` from `js/` (it runs typecheck, tests and the build first). It
  needs the `@zheref` npm scope, and it happens only on the maintainer's go.
- Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Develop

```sh
cd js
npm ci
npm run typecheck && npm test && npm run build
```

Where each module was ported from, and every deliberate difference:
[PROVENANCE.md](PROVENANCE.md). Third-party notices: [NOTICE.md](NOTICE.md).
