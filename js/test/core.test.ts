import { describe, expect, it } from "vitest";
import {
  Binding,
  Duration,
  InMemoryFeatureFlagService,
  ListGroup,
  OpError,
  OpStack,
  bisect,
  businessStartOfDay,
  camelCase,
  digitalDuration,
  digitalTime,
  endOfDay,
  featureFlag,
  firstN,
  fromDateComponents,
  hoursUponDay,
  isWithinLast,
  listMixing,
  minutesUponDay,
  oneDayOut,
  plusElementsOf,
  randomString,
  randomUUID,
  readable,
  safeAt,
  startOfDay,
  startingOp,
  todayAt,
} from "../src/index.js";

describe("time — ported from StandardExtensionsTests.swift", () => {
  it("reads durations the way the Swift package does", () => {
    expect(readable(Duration.minutes(1))).toBe("1 minute");
    expect(readable(Duration.minutes(10))).toBe("10 minutes");
    expect(readable(Duration.hours(1))).toBe("1 hour");
    expect(readable(Duration.hours(10))).toBe("10 hours");
    expect(readable(Duration.days(1))).toBe("1 day");
    expect(readable(Duration.days(30))).toBe("1 month");
    expect(readable(Duration.weeks(1))).toBe("1 week");
    expect(readable(Duration.weeks(20))).toBe("4 months");
  });

  it("reads seconds, years, a forced unit and abbreviations", () => {
    expect(readable(42)).toBe("42 seconds");
    expect(readable(Duration.years(2))).toBe("2 years");
    expect(readable(Duration.hours(3), { unit: "minute" })).toBe("180 minutes");
    expect(readable(Duration.minutes(5), { abbreviated: true })).toBe("5min");
  });

  it("never reads 0 months or 0 years at the bucket edges", () => {
    expect(readable(Duration.days(28))).toBe("4 weeks");
    expect(readable(Duration.days(29))).toBe("4 weeks");
    expect(readable(Duration.days(30))).toBe("1 month");
    expect(readable(Duration.days(362))).toBe("12 months");
    expect(readable(Duration.days(365))).toBe("1 year");
  });

  it("formats clock-style durations", () => {
    expect(digitalDuration(65)).toBe("01:05");
    expect(digitalDuration(Duration.hours(2) + 125)).toBe("02:02");
    expect(digitalDuration(Duration.hours(2) + 125, true)).toBe("02:02:05");
  });
});

describe("dates — ported from DateExtensionsTests.swift", () => {
  it("builds today at a time of day", () => {
    const time = todayAt(8, 15, 5);
    expect([time.getHours(), time.getMinutes(), time.getSeconds()]).toEqual([8, 15, 5]);
  });

  it("derives day boundaries and offsets", () => {
    const date = fromDateComponents(2024, 9, 1);
    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2024, 9, 1]);
    const afternoon = new Date(2024, 8, 1, 13, 30, 15);
    expect(startOfDay(afternoon).getHours()).toBe(0);
    expect(digitalTime(endOfDay(afternoon), true)).toBe("23:59:59");
    expect(digitalTime(businessStartOfDay(afternoon))).toBe("09:00");
    expect(hoursUponDay(afternoon)).toBe(13.5);
    expect(minutesUponDay(afternoon)).toBe(810);
    expect(oneDayOut(date).getTime() - date.getTime()).toBe(86_400_000);
    const now = new Date(2024, 8, 1, 12, 0, 0);
    expect(isWithinLast(new Date(2024, 8, 1, 11, 59, 30), 60, now)).toBe(true);
    expect(isWithinLast(new Date(2024, 8, 1, 11, 58, 0), 60, now)).toBe(false);
  });
});

describe("strings — ported from StringsTests.kt", () => {
  it("lower-cases only the first character", () => {
    expect(camelCase("Event")).toBe("event");
    expect(camelCase("A")).toBe("a");
    expect(camelCase("QA")).toBe("qA");
    expect(camelCase("ToDo")).toBe("toDo");
    expect(camelCase("toto")).toBe("toto");
    expect(camelCase("")).toBe("");
  });

  it("generates random strings and UUIDs", () => {
    expect(randomString()).toMatch(/^[a-z]{11}$/);
    expect(randomUUID()).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
  });
});

describe("collections — ported from CollectionTests.kt and Collections+Extensions.swift", () => {
  it("mixes lists in order, repeated elements included", () => {
    expect(listMixing([1, 2, 3], [4, 5, 6], [5, 6, 7])).toEqual([1, 2, 3, 4, 5, 6, 5, 6, 7]);
    expect(plusElementsOf([1, 2, 3], [4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("indexes safely, takes the first n and bisects", () => {
    expect(safeAt([1, 2], 1)).toBe(2);
    expect(safeAt([1, 2], 2)).toBeUndefined();
    expect(safeAt([1, 2], -1)).toBeUndefined();
    expect(firstN([1, 2, 3], 2)).toEqual([1, 2]);
    expect(firstN([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(firstN([1, 2, 3], 0)).toEqual([]);
    expect(bisect([1, 2, 3, 4], (n) => n % 2 === 0)).toEqual({ matching: [2, 4], nonMatching: [1, 3] });
  });
});

describe("feature flags", () => {
  it("resolves, changes and lists assignments", () => {
    const dark = featureFlag("dark-mode");
    const service = new InMemoryFeatureFlagService([{ flag: dark, state: "disabled" }]);
    const isDark = service.enabledResolver(dark);
    expect(isDark()).toBe(false);
    service.change(featureFlag("dark-mode"), "enabled");
    expect(isDark()).toBe(true);
    expect(service.state(featureFlag("unknown"))).toBeUndefined();
    expect(service.assignments()).toEqual([{ flag: { name: "dark-mode" }, state: "enabled" }]);
  });
});

describe("ListGroup", () => {
  it("names, mutates and compares groups", () => {
    const group = new ListGroup("today", ["a", "b"], { title: "Today" });
    expect(group.displayName).toBe("Today");
    expect(group.groupName).toBe("today");
    group.append("c");
    expect(group.removeAt(0)).toBe("a");
    expect(group.count).toBe(2);
    expect(group.equals(new ListGroup("today", ["b", "c"]))).toBe(true);
    expect(() => group.removeAt(9)).toThrow(RangeError);
    const printable = new ListGroup({ printableDescription: "Week 1" }, [] as number[]);
    expect(printable.displayName).toBe("Week 1");
    expect(printable.isEmpty).toBe(true);
  });
});

describe("OpStack", () => {
  it("counts progress, collects failures and resets once everything resolves", () => {
    const stack = OpStack.loading(startingOp("load"), "home");
    stack.push(startingOp("sync"));
    stack.push(startingOp("telemetry", false));
    expect(stack.scheduledOpsCount).toBe(2);
    stack.failed("sync", new OpError("offline", true));
    expect(stack.resolvedOpsCount).toBe(1);
    expect(stack.failureMessages).toEqual(["offline"]);
    stack.completed("load");
    stack.completed("missing");
    expect(stack.operations).toHaveLength(3);
    stack.completed("telemetry");
    expect(stack.operations).toHaveLength(0);
  });
});

describe("Binding", () => {
  it("owns, wraps or fixes a value", () => {
    const owned = Binding.create(1);
    owned.set(2);
    expect(owned.current).toBe(2);
    const fixed = Binding.constant("x");
    fixed.set("y");
    expect(fixed.get()).toBe("x");
    let backing = 0;
    const wrapped = Binding.of(
      () => backing,
      (v) => {
        backing = v;
      },
    );
    wrapped.set(5);
    expect(backing).toBe(5);
  });
});
