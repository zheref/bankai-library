/**
 * Durations and dates — TypeScript port of BankaiCore's `StandardExtensions.swift` and
 * `Date+Extensions.swift`, with the JVM parity helpers.
 *
 * A duration is a number of **seconds**, like Foundation's `TimeInterval`. A month is 30
 * days and a year is 365 days, as in the Swift original. Calendar helpers use the
 * runtime's local time zone, as the Swift ones use `Calendar.current`.
 */

/** A number of seconds. */
export type Seconds = number;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Builders that return a duration in seconds: `Duration.minutes(10)` → `600`. */
export const Duration = {
  seconds: (n: number): Seconds => n,
  minutes: (n: number): Seconds => n * MINUTE,
  hours: (n: number): Seconds => n * HOUR,
  days: (n: number): Seconds => n * DAY,
  weeks: (n: number): Seconds => n * WEEK,
  months: (n: number): Seconds => n * MONTH,
  years: (n: number): Seconds => n * YEAR,
} as const;

export type DurationUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

const UNIT_SECONDS: Record<DurationUnit, number> = {
  second: 1,
  minute: MINUTE,
  hour: HOUR,
  day: DAY,
  week: WEEK,
  month: MONTH,
  year: YEAR,
};

const ABBREVIATIONS: Record<DurationUnit, string> = {
  second: "sec",
  minute: "min",
  hour: "h",
  day: "d",
  week: "wk.",
  month: "mo.",
  year: "yr.",
};

/** The whole number of `unit`s in `interval`, rounded down. */
export function convert(interval: Seconds, unit: DurationUnit): number {
  return Math.floor(interval / UNIT_SECONDS[unit]);
}

function label(count: number, unit: DurationUnit, abbreviated: boolean): string {
  if (abbreviated) return `${count}${ABBREVIATIONS[unit]}`;
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * A human-readable duration: `readable(600)` → `"10 minutes"`,
 * `readable(Duration.weeks(20))` → `"4 months"`. Without `unit`, the largest unit that
 * fits is chosen: seconds under a minute, minutes under an hour, hours under a day, days
 * under a week, weeks under four weeks, months under twelve months, then years.
 */
export function readable(
  interval: Seconds,
  options: { unit?: DurationUnit; abbreviated?: boolean } = {},
): string {
  const abbreviated = options.abbreviated ?? false;
  if (options.unit) {
    return label(convert(interval, options.unit), options.unit, abbreviated);
  }
  const unit: DurationUnit =
    interval < MINUTE
      ? "second"
      : interval < HOUR
        ? "minute"
        : interval < DAY
          ? "hour"
          : interval < WEEK
            ? "day"
            : interval < 4 * WEEK
              ? "week"
              : interval < 12 * MONTH
                ? "month"
                : "year";
  return label(convert(interval, unit), unit, abbreviated);
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * A clock-style duration: `"HH:MM"` (or `"HH:MM:SS"` with `includingSeconds`) when the
 * duration has hours, otherwise `"MM:SS"`.
 */
export function digitalDuration(interval: Seconds, includingSeconds = false): string {
  const total = Math.trunc(interval);
  const hours = Math.trunc(total / HOUR);
  const minutes = Math.trunc((total % HOUR) / MINUTE);
  const seconds = total % MINUTE;
  if (hours > 0) {
    return includingSeconds
      ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(hours)}:${pad2(minutes)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

/** A date's local wall-clock time as `"HH:mm"` (or `"HH:mm:ss"`). */
export function digitalTime(date: Date, includingSeconds = false): string {
  const hm = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return includingSeconds ? `${hm}:${pad2(date.getSeconds())}` : hm;
}

/** Local midnight on `year`-`month`-`day` (`month` is 1-based). */
export function fromDateComponents(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Today, local time, at `hours:minutes:seconds`. */
export function todayAt(hours: number, minutes: number, seconds = 0, now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds, 0);
}

/** Local midnight at the start of `date`'s day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** 23:59:59 local time on `date`'s day. */
export function endOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 0);
}

/** 09:00 local time on `date`'s day. */
export function businessStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0);
}

/** Hours past local midnight, with minutes as a fraction: 13:30 → `13.5`. */
export function hoursUponDay(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

/** Whole minutes past local midnight: 13:30 → `810`. */
export function minutesUponDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Whether `date` is less than `interval` seconds in the past (or anywhere in the future). */
export function isWithinLast(date: Date, interval: Seconds, now: Date = new Date()): boolean {
  return (now.getTime() - date.getTime()) / 1000 < interval;
}

/** Whether `date` is less than `interval` seconds in the future (or anywhere in the past). */
export function isWithinNext(date: Date, interval: Seconds, now: Date = new Date()): boolean {
  return (date.getTime() - now.getTime()) / 1000 < interval;
}

/** `date` plus 24 hours. */
export function oneDayOut(date: Date): Date {
  return new Date(date.getTime() + DAY * 1000);
}

/** `date` minus `interval` seconds. */
export function removingTimeInterval(date: Date, interval: Seconds): Date {
  return new Date(date.getTime() - interval * 1000);
}
