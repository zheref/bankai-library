/**
 * Grouped lists — TypeScript port of BankaiCore's `ListGroup.swift` and `Printable.swift`.
 */

/** A value with a human-readable description. */
export interface Printable {
  readonly printableDescription: string;
}

/** A group key: a plain string, or any value that can print itself. */
export type GroupKey = string | Printable;

function describe(key: GroupKey): string {
  return typeof key === "string" ? key : key.printableDescription;
}

/** A keyed group of elements, e.g. one section of a sectioned list. */
export class ListGroup<Element, Key extends GroupKey = string> {
  /** The key that identifies this group uniquely. */
  readonly key: Key;
  /** The title preferred for display. When absent, the key's description is used. */
  title?: string;
  /** The elements held within this group. */
  elements: Element[];
  /** Whether more elements are expected for this group than it holds. */
  isTrimmed: boolean;

  constructor(
    key: Key,
    elements: Element[],
    options: { isTrimmed?: boolean; title?: string } = {},
  ) {
    this.key = key;
    this.elements = elements;
    this.isTrimmed = options.isTrimmed ?? false;
    if (options.title !== undefined) this.title = options.title;
  }

  /** The group's unique id: its key. */
  get id(): Key {
    return this.key;
  }

  get isEmpty(): boolean {
    return this.elements.length === 0;
  }

  get count(): number {
    return this.elements.length;
  }

  /** The key's printable description. */
  get groupName(): string {
    return describe(this.key);
  }

  /** The title when set, otherwise the key's printable description. */
  get displayName(): string {
    return this.title ?? describe(this.key);
  }

  at(index: number): Element | undefined {
    return this.elements[index];
  }

  append(element: Element): void {
    this.elements.push(element);
  }

  /** Removes and returns the element at `index`; throws when out of bounds. */
  removeAt(index: number): Element {
    if (index < 0 || index >= this.elements.length) {
      throw new RangeError(`index ${index} is out of bounds for a group of ${this.count}`);
    }
    return this.elements.splice(index, 1)[0] as Element;
  }

  /**
   * Two groups are equal when their keys describe the same and their elements are
   * equal by `elementEquals` (identity by default). The title isn't compared, as in
   * the Swift original.
   */
  equals(
    other: ListGroup<Element, Key>,
    elementEquals: (a: Element, b: Element) => boolean = Object.is,
  ): boolean {
    return (
      describe(this.key) === describe(other.key) &&
      this.elements.length === other.elements.length &&
      this.elements.every((element, i) => elementEquals(element, other.elements[i] as Element))
    );
  }
}
