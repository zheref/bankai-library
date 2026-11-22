/**
 * String helpers — ported from BankaiCore for JVM (`utils/Strings.kt`) and BankaiCore
 * (`String.randomUUID`).
 */

/** Lower-cases the first character only: `"ToDo"` → `"toDo"`, `"QA"` → `"qA"`. */
export function camelCase(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * A random string of lower-case ASCII letters. Not cryptographically secure; use
 * `randomUUID` for identifiers.
 */
export function randomString(length = 11): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(97 + Math.floor(Math.random() * 26));
  }
  return out;
}

/**
 * An RFC 4122 v4 UUID, upper-cased like Foundation's `UUID().uuidString`. Needs Web
 * Crypto's `randomUUID`: Node 19+, or a browser page served from a secure context
 * (HTTPS or localhost).
 */
export function randomUUID(): string {
  return globalThis.crypto.randomUUID().toUpperCase();
}
