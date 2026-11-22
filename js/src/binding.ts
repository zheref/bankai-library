/**
 * Two-way bindings — TypeScript port of BankaiCore for JVM's `ZBinding`.
 */

export interface Binding<T> {
  readonly get: () => T;
  readonly set: (value: T) => void;
  /** The current value: `get()`. */
  readonly current: T;
}

function bind<T>(get: () => T, set: (value: T) => void): Binding<T> {
  return {
    get,
    set,
    get current() {
      return get();
    },
  };
}

export const Binding = {
  /** A binding over caller-supplied accessors. */
  of<T>(get: () => T, set: (value: T) => void): Binding<T> {
    return bind(get, set);
  },
  /** A binding that owns its value, starting at `initialValue`. */
  create<T>(initialValue: T): Binding<T> {
    let value = initialValue;
    return bind(
      () => value,
      (next) => {
        value = next;
      },
    );
  },
  /** A read-only binding: `set` is a no-op. */
  constant<T>(value: T): Binding<T> {
    return bind(
      () => value,
      () => {},
    );
  },
};
