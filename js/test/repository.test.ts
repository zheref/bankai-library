import { describe, expect, it } from "vitest";
import {
  type Filter,
  type LocalDataSource,
  type RemoteDataSource,
  RepoSyncError,
  Repository,
  RepositoryFlow,
  type Traceable,
  fromDateComponents,
  oneDayOut,
} from "../src/index.js";

// Fixtures and scenarios ported from RepositoryFixtures.swift / RepositoryTests.swift.

interface TestObject extends Traceable<number> {
  readonly name: string;
}

interface TestFilter extends Filter {
  keywords?: string;
}

const matching = (items: TestObject[], filter?: TestFilter): TestObject[] =>
  filter?.keywords ? items.filter((item) => item.name.toLowerCase().includes(filter.keywords!.toLowerCase())) : items;

function local(items: TestObject[]): LocalDataSource<TestObject, TestFilter> & { stored: TestObject[] } {
  return {
    stored: [],
    async store(newItems) {
      this.stored.push(...newItems);
    },
    async retrieve(filter) {
      return matching(items, filter);
    },
  };
}

function remote(label: string, items: TestObject[]): RemoteDataSource<TestObject, TestFilter> & { pushed: TestObject[] } {
  return {
    label,
    pushed: [],
    async pull(filter) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return matching(items, filter);
    },
    async push(newItems) {
      this.pushed.push(...newItems);
    },
  };
}

const baseDate = fromDateComponents(2024, 9, 1);
const now = new Date();
const localItems = (): TestObject[] => [
  { id: 1, name: "Dog", updatedAt: null },
  { id: 2, name: "Cat", updatedAt: now },
  { id: 3, name: "Bird", updatedAt: null },
  { id: 4, name: "Fish", updatedAt: baseDate },
  { id: 5, name: "Turtle", updatedAt: null },
];
const remoteItems = (): TestObject[] => [
  { id: 1, name: "Dog1", updatedAt: null },
  { id: 2, name: "Cat1", updatedAt: now },
  { id: 3, name: "Bird1", updatedAt: null },
  { id: 4, name: "Fish1", updatedAt: oneDayOut(baseDate) },
  { id: 5, name: "Turtle1", updatedAt: null },
  { id: 6, name: "Plant", updatedAt: now },
];

type Event = [kind: "local" | "remote" | "complete" | "failure", payload?: unknown];

function collect<T>(flow: RepositoryFlow<T>): Promise<Event[]> {
  return new Promise((resolve) => {
    const events: Event[] = [];
    flow
      .onLocal((data) => events.push(["local", data]))
      .onRemote((data, label) => events.push(["remote", { data, label }]))
      .onFailure((error) => {
        events.push(["failure", error]);
        resolve(events);
      })
      .onCompletion(() => {
        events.push(["complete"]);
        resolve(events);
      })
      .run();
  });
}

describe("Repository.fetch", () => {
  it("delivers only the local snapshot when there are no remotes (testOnlyLocalFetch)", async () => {
    const flow = new Repository(local(localItems())).fetch();
    const events = await collect(flow);
    expect(events.map(([kind]) => kind)).toEqual(["local", "complete"]);
    expect(events[0]?.[1]).toEqual(localItems());
    expect(flow.hasCompleted).toBe(true);
  });

  it("merges a remote over the local snapshot by recency (testRegularFetch)", async () => {
    const repository = new Repository(local(localItems())).addRemote(remote("api", remoteItems()));
    const events = await collect(repository.fetch());
    expect(events.map(([kind]) => kind)).toEqual(["local", "remote", "complete"]);
    const { data, label } = events[1]?.[1] as { data: TestObject[]; label: string };
    expect(label).toBe("api");
    expect(data).toHaveLength(6);
    expect(data[0]?.name).toBe("Dog1"); // no updatedAt on either side: remote wins
    expect(data[1]?.name).toBe("Cat"); // equal updatedAt: the local item is kept
    expect(data[3]?.name).toBe("Fish1"); // remote is a day newer
    expect(data[5]?.name).toBe("Plant"); // new id appended
  });

  it("keeps the local item when it's at least as recent as the remote one", async () => {
    const newer = new Date(baseDate.getTime() + 10_000);
    const repository = new Repository(local([{ id: 1, name: "local", updatedAt: newer }])).addRemote(
      remote("api", [{ id: 1, name: "remote", updatedAt: baseDate }]),
    );
    const events = await collect(repository.fetch());
    expect((events[1]?.[1] as { data: TestObject[] }).data[0]?.name).toBe("local");
  });

  it("holds completion until the last of several remotes (testMultipleRemotesFetch)", async () => {
    const second = [...remoteItems().slice(0, 5), { id: 6, name: "Plant1", updatedAt: now }, { id: 7, name: "Mushroom", updatedAt: now }];
    const repository = new Repository(local(localItems()))
      .addRemote(remote("api1", remoteItems()))
      .addRemote(remote("api2", second));
    const events = await collect(repository.fetch());
    expect(events.map(([kind]) => kind)).toEqual(["local", "remote", "remote", "complete"]);
    const labels = events.filter(([kind]) => kind === "remote").map(([, p]) => (p as { label: string }).label);
    expect(labels).toEqual(["api1", "api2"]);
    expect((events[2]?.[1] as { data: TestObject[] }).data).toHaveLength(7);
  });

  it("skips remotes when the filter asks for local only", async () => {
    const repository = new Repository(local(localItems())).addRemote(remote("api", remoteItems()));
    const events = await collect(repository.fetch({ onlyLocally: true, keywords: "fish" }));
    expect(events.map(([kind]) => kind)).toEqual(["local", "complete"]);
    expect((events[0]?.[1] as TestObject[]).map((item) => item.name)).toEqual(["Fish"]);
  });

  it("completes when onlyLocally is false but there are no remotes", async () => {
    const events = await collect(new Repository(local(localItems())).fetch({ onlyLocally: false }));
    expect(events.map(([kind]) => kind)).toEqual(["local", "complete"]);
  });

  it("never mutates the array the local source returned", async () => {
    const backing = localItems();
    const source: LocalDataSource<TestObject, TestFilter> = {
      store: async () => {},
      retrieve: async () => backing,
    };
    await collect(new Repository(source).addRemote(remote("api", remoteItems())).fetch());
    expect(backing).toEqual(localItems());
  });

  it("fails with failedRetrieving / failedPulling", async () => {
    const broken: LocalDataSource<TestObject, TestFilter> = {
      store: async () => {},
      retrieve: async () => {
        throw new Error("disk");
      },
    };
    const retrieveEvents = await collect(new Repository(broken).fetch());
    expect((retrieveEvents.at(-1)?.[1] as RepoSyncError).kind).toBe("failedRetrieving");

    const offline: RemoteDataSource<TestObject, TestFilter> = {
      label: "api",
      pull: async () => {
        throw new Error("offline");
      },
      push: async () => {},
    };
    const pullEvents = await collect(new Repository(local(localItems())).addRemote(offline).fetch());
    expect(pullEvents.map(([kind]) => kind)).toEqual(["local", "failure"]);
    const error = pullEvents[1]?.[1] as RepoSyncError;
    expect(error).toBeInstanceOf(RepoSyncError);
    expect(error.kind).toBe("failedPulling");
    expect((error.originalError as Error).message).toBe("offline");
  });
});

describe("Repository.save", () => {
  it("stores locally and pushes to every remote unless told not to", async () => {
    const store = local([]);
    const api = remote("api", []);
    const repository = new Repository(store).addRemote(api);
    await repository.save([{ id: 9, name: "Moss" }]);
    expect(store.stored).toHaveLength(1);
    expect(api.pushed).toHaveLength(1);
    await repository.save([{ id: 10, name: "Fern" }], false);
    expect(store.stored).toHaveLength(2);
    expect(api.pushed).toHaveLength(1);
  });

  it("wraps failures as failedStoring / failedPushing", async () => {
    const failing: LocalDataSource<TestObject> = {
      store: async () => {
        throw new Error("full");
      },
      retrieve: async () => [],
    };
    await expect(new Repository(failing).save([])).rejects.toMatchObject({ kind: "failedStoring" });
    const rejecting: RemoteDataSource<TestObject> = {
      label: "api",
      pull: async () => [],
      push: async () => {
        throw new Error("403");
      },
    };
    await expect(new Repository(local([])).addRemote(rejecting).save([])).rejects.toMatchObject({
      kind: "failedPushing",
    });
  });
});

describe("RepositoryFlow — ported from RepositoryFlowTests.swift", () => {
  it("completes after the local snapshot when only local is expected", async () => {
    const flow = new RepositoryFlow<number>(
      async (receiver) => {
        receiver.sendLocal(1);
        receiver.sendRemote(2, "ignored");
      },
      { onlyLocalExpected: true },
    );
    expect(await collect(flow)).toEqual([["local", 1], ["complete"]]);
  });

  it("delivers local then remote, then completes", async () => {
    const flow = new RepositoryFlow<number>(async (receiver) => {
      receiver.sendLocal(1);
      await new Promise((resolve) => setTimeout(resolve, 5));
      receiver.sendRemote(2, "api");
    });
    expect(await collect(flow)).toEqual([["local", 1], ["remote", { data: 2, label: "api" }], ["complete"]]);
  });

  it("can be iterated as async snapshots (testRegularRepositoryFlowAsPublisher)", async () => {
    const flow = new RepositoryFlow<number>(async (receiver) => {
      receiver.sendLocal(1);
      receiver.sendRemote(2, "api");
    });
    const seen = [];
    for await (const snapshot of flow.snapshots()) seen.push(snapshot);
    expect(seen).toEqual([
      { source: "local", data: 1 },
      { source: "remote", data: 2, remote: "api" },
    ]);
    expect(flow.hasCompleted).toBe(true);
  });

  it("throws a failure out of iteration, and stops delivering after cancel", async () => {
    const failing = new RepositoryFlow<number>(async (receiver) => {
      receiver.fail(new RepoSyncError("failedPulling", new Error("x")));
    });
    await expect(async () => {
      for await (const _ of failing.snapshots()) {
        // no snapshots expected
      }
    }).rejects.toBeInstanceOf(RepoSyncError);

    const events: number[] = [];
    const slow = new RepositoryFlow<number>(async (receiver) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      receiver.sendLocal(1);
    });
    slow.onLocal((n) => events.push(n)).run().cancel();
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(events).toEqual([]);
  });

  it("refuses a second consumer instead of hanging", async () => {
    const flow = new RepositoryFlow<number>(async (receiver) => receiver.sendLocal(1), { onlyLocalExpected: true });
    await collect(flow);
    expect(() => flow.run()).toThrow(/already ran/);
    expect(() => flow.snapshots()).toThrow(/already ran/);
  });

  it("completes a flow whose body returns without completing it", async () => {
    const flow = new RepositoryFlow<number>(async (receiver) => {
      receiver.sendRemote(1, "api", true);
    });
    expect(await collect(flow)).toEqual([["remote", { data: 1, label: "api" }], ["complete"]]);
  });

  it("turns an exception escaping the body into a failure", async () => {
    const flow = new RepositoryFlow<number>(async () => {
      throw new Error("boom");
    });
    const events = await collect(flow);
    expect(events[0]?.[0]).toBe("failure");
  });
});
