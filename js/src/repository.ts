/**
 * Local-first repositories — TypeScript port of BankaiCore's `Repository.swift`,
 * `Repository+Core.swift`, `ARepositoryOf.swift` and `RepositoryFlow.swift`.
 *
 * A repository reads its local source first, then pulls each remote in turn. It merges
 * every remote snapshot into the running result, keeping the most recently updated
 * version of each item, and delivers every snapshot through a `RepositoryFlow`.
 */

/** What a fetch can be narrowed by. `onlyLocally` skips the remotes. */
export interface Filter {
  onlyLocally: boolean;
}

/** An identifiable value that knows when it was last updated. */
export interface Traceable<Id = string | number> {
  readonly id: Id;
  readonly updatedAt?: Date | null;
}

export interface DataSource {
  prepare?(): void;
}

export interface LocalDataSource<V extends Traceable, F extends Filter = Filter>
  extends DataSource {
  store(items: V[]): Promise<void>;
  retrieve(filter?: F): Promise<V[]>;
}

export interface RemoteDataSource<V extends Traceable, F extends Filter = Filter>
  extends DataSource {
  /** Names this remote in the snapshots it produces. */
  readonly label: string;
  pull(filter?: F): Promise<V[]>;
  push(items: V[]): Promise<void>;
}

export type RepoSyncErrorKind = "failedStoring" | "failedPushing" | "failedRetrieving" | "failedPulling";

/** A repository failure, naming the step that failed and carrying the original error. */
export class RepoSyncError extends Error {
  readonly kind: RepoSyncErrorKind;
  readonly originalError: unknown;

  constructor(kind: RepoSyncErrorKind, originalError: unknown) {
    super(`${kind}: ${originalError instanceof Error ? originalError.message : String(originalError)}`);
    this.name = "RepoSyncError";
    this.kind = kind;
    this.originalError = originalError;
  }
}

export type RepoSnapshot<T> =
  | { readonly source: "local"; readonly data: T }
  | { readonly source: "remote"; readonly data: T; readonly remote?: string };

/** The sending side of a flow, handed to the flow's body. */
export interface SnapshotReceiver<T> {
  sendLocal(data: T): void;
  /** Sends a remote snapshot. The flow completes after it unless `hold` is `true`. */
  sendRemote(data: T, from?: string, hold?: boolean): void;
  /** Completes the flow without another snapshot. */
  giveUp(): void;
  fail(error: RepoSyncError): void;
}

/** Cancels a running flow: later snapshots and completion are no longer delivered. */
export interface FlowSubscription {
  cancel(): void;
}

type FlowEvent<T> =
  | { readonly type: "snapshot"; readonly snapshot: RepoSnapshot<T> }
  | { readonly type: "complete" }
  | { readonly type: "failure"; readonly error: RepoSyncError };

/**
 * A flow of snapshots over time: a local snapshot, then zero or more remote snapshots,
 * then completion or failure. Nothing runs until `run()` (or iteration with
 * `snapshots()`), and a flow runs at most once.
 */
export class RepositoryFlow<T> implements SnapshotReceiver<T> {
  readonly onlyLocalExpected: boolean;
  private completed = false;
  private started = false;
  private cancelled = false;
  private readonly body: (receiver: SnapshotReceiver<T>) => Promise<void>;
  private readonly listeners: ((event: FlowEvent<T>) => void)[] = [];

  private yieldLocal: (data: T) => void = () => {};
  private yieldRemote: (data: T, remote?: string) => void = () => {};
  private yieldFailure: (error: RepoSyncError) => void = () => {};
  private yieldCompletion: () => void = () => {};

  constructor(
    body: (receiver: SnapshotReceiver<T>) => Promise<void>,
    options: { onlyLocalExpected?: boolean } = {},
  ) {
    this.body = body;
    this.onlyLocalExpected = options.onlyLocalExpected ?? false;
  }

  /** Whether the flow has completed or failed. */
  get hasCompleted(): boolean {
    return this.completed;
  }

  onLocal(handler: (data: T) => void): this {
    this.yieldLocal = handler;
    return this;
  }

  onRemote(handler: (data: T, remote?: string) => void): this {
    this.yieldRemote = handler;
    return this;
  }

  onFailure(handler: (error: RepoSyncError) => void): this {
    this.yieldFailure = handler;
    return this;
  }

  onCompletion(handler: () => void): this {
    this.yieldCompletion = handler;
    return this;
  }

  /** Starts the flow, delivering to the `on…` handlers. */
  run(): FlowSubscription {
    this.listeners.push((event) => {
      switch (event.type) {
        case "snapshot":
          if (event.snapshot.source === "local") this.yieldLocal(event.snapshot.data);
          else this.yieldRemote(event.snapshot.data, event.snapshot.remote);
          break;
        case "complete":
          this.yieldCompletion();
          break;
        case "failure":
          this.yieldFailure(event.error);
          break;
      }
    });
    this.start();
    return { cancel: () => this.cancel() };
  }

  /**
   * Starts the flow and yields each snapshot. Iteration ends when the flow completes
   * and throws the `RepoSyncError` when it fails. Breaking out cancels the flow.
   */
  async *snapshots(): AsyncGenerator<RepoSnapshot<T>, void, undefined> {
    const queue: FlowEvent<T>[] = [];
    let wake: (() => void) | undefined;
    this.listeners.push((event) => {
      queue.push(event);
      wake?.();
    });
    this.start();
    try {
      while (true) {
        const event = queue.shift();
        if (!event) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
          wake = undefined;
          continue;
        }
        if (event.type === "snapshot") yield event.snapshot;
        else if (event.type === "failure") throw event.error;
        else return;
      }
    } finally {
      this.cancel();
    }
  }

  sendLocal(data: T): void {
    if (this.completed) return;
    this.emit({ type: "snapshot", snapshot: { source: "local", data } });
    if (this.onlyLocalExpected) this.finish({ type: "complete" });
  }

  sendRemote(data: T, from?: string, hold = false): void {
    if (this.completed) return;
    const snapshot: RepoSnapshot<T> =
      from === undefined ? { source: "remote", data } : { source: "remote", data, remote: from };
    this.emit({ type: "snapshot", snapshot });
    if (!hold) this.finish({ type: "complete" });
  }

  giveUp(): void {
    if (this.completed) return;
    this.finish({ type: "complete" });
  }

  fail(error: RepoSyncError): void {
    if (this.completed) return;
    this.finish({ type: "failure", error });
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    // Deliver asynchronously so handlers registered right after run() still see
    // every event, as the Combine original does.
    queueMicrotask(() => {
      this.body(this).catch((error: unknown) => {
        this.fail(error instanceof RepoSyncError ? error : new RepoSyncError("failedRetrieving", error));
      });
    });
  }

  private cancel(): void {
    this.cancelled = true;
    this.completed = true;
  }

  private finish(event: FlowEvent<T>): void {
    this.completed = true;
    this.emit(event);
  }

  private emit(event: FlowEvent<T>): void {
    if (this.cancelled) return;
    for (const listener of this.listeners) listener(event);
  }
}

/**
 * Merges `remote` into `snapshot` in place. A remote item replaces the local item with
 * its id unless both carry `updatedAt` and the local one is at least as recent. Remote
 * items with new ids are appended.
 */
export function resolveMostRecentData<V extends Traceable>(snapshot: V[], remote: readonly V[]): void {
  for (const item of remote) {
    const index = snapshot.findIndex((local) => local.id === item.id);
    if (index === -1) {
      snapshot.push(item);
      continue;
    }
    const remoteDate = item.updatedAt;
    const localDate = (snapshot[index] as V).updatedAt;
    if (!remoteDate || !localDate || remoteDate.getTime() > localDate.getTime()) {
      snapshot[index] = item;
    }
  }
}

/** A repository over one local source and any number of remotes. */
export class Repository<V extends Traceable, F extends Filter = Filter> {
  readonly local: LocalDataSource<V, F>;
  readonly remotes: RemoteDataSource<V, F>[] = [];

  constructor(local: LocalDataSource<V, F>, remotes: RemoteDataSource<V, F>[] = []) {
    this.local = local;
    this.remotes.push(...remotes);
  }

  addRemote(remote: RemoteDataSource<V, F>): this {
    this.remotes.push(remote);
    return this;
  }

  prepare(): void {
    this.local.prepare?.();
    for (const remote of this.remotes) remote.prepare?.();
  }

  /**
   * Fetches matching items: the local snapshot first, then one merged snapshot per
   * remote. The flow completes after the last remote, or right after the local snapshot
   * when there are no remotes or `filter.onlyLocally` is set.
   */
  fetch(filter?: F): RepositoryFlow<V[]> {
    const onlyLocally = filter?.onlyLocally ?? this.remotes.length === 0;
    const remotes = onlyLocally ? [] : [...this.remotes];
    return new RepositoryFlow<V[]>(
      async (receiver) => {
        let snapshot: V[] = [];
        try {
          snapshot = await this.local.retrieve(filter);
          receiver.sendLocal([...snapshot]);
        } catch (error) {
          receiver.fail(new RepoSyncError("failedRetrieving", error));
          return;
        }
        for (const [index, remote] of remotes.entries()) {
          try {
            const remoteSnapshot = await remote.pull(filter);
            resolveMostRecentData(snapshot, remoteSnapshot);
            receiver.sendRemote([...snapshot], remote.label, index !== remotes.length - 1);
          } catch (error) {
            receiver.fail(new RepoSyncError("failedPulling", error));
            return;
          }
        }
      },
      { onlyLocalExpected: onlyLocally },
    );
  }

  /** Stores `items` locally, then pushes them to every remote unless `attemptPush` is `false`. */
  async save(items: V[], attemptPush = true): Promise<void> {
    try {
      await this.local.store(items);
    } catch (error) {
      throw new RepoSyncError("failedStoring", error);
    }
    if (!attemptPush) return;
    try {
      for (const remote of this.remotes) await remote.push(items);
    } catch (error) {
      throw new RepoSyncError("failedPushing", error);
    }
  }
}
