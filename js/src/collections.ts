/**
 * Collection helpers — ported from BankaiCore (`Collections+Extensions.swift`) and
 * BankaiCore for JVM (`utils/Collections.kt`).
 */

/** The element at `index` when it's within bounds, otherwise `undefined`. Negative indices are out of bounds. */
export function safeAt<T>(items: readonly T[], index: number): T | undefined {
  return Number.isInteger(index) && index >= 0 && index < items.length ? items[index] : undefined;
}

/** The first `n` elements, or all of them when there are fewer. */
export function firstN<T>(items: readonly T[], n: number): T[] {
  return n > 0 ? items.slice(0, n) : [];
}

/** Splits `items` by `predicate`, keeping order within each side. */
export function bisect<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): { matching: T[]; nonMatching: T[] } {
  const matching: T[] = [];
  const nonMatching: T[] = [];
  for (const item of items) {
    (predicate(item) ? matching : nonMatching).push(item);
  }
  return { matching, nonMatching };
}

/** A new list with the elements of every list, in the order the lists were passed. */
export function listMixing<T>(...lists: readonly (readonly T[])[]): T[] {
  return lists.flat() as T[];
}

/** A new list with `list`'s elements appended after `items`'. */
export function plusElementsOf<T>(items: readonly T[], list: readonly T[]): T[] {
  return [...items, ...list];
}
