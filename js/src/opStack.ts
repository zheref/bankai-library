/**
 * Operation tracking — TypeScript port of BankaiCore's `OpStack.swift`.
 */

/** Why an operation failed, and whether the caller can recover from it. */
export class OpError extends Error {
  readonly recoverable: boolean;

  constructor(message: string, recoverable = false) {
    super(message);
    this.name = "OpError";
    this.recoverable = recoverable;
  }
}

export type OpStatus =
  | { readonly kind: "pending" }
  | { readonly kind: "ongoing" }
  | { readonly kind: "completed" }
  | { readonly kind: "failed"; readonly error: OpError };

/** One tracked operation. */
export interface Op {
  readonly name: string;
  status: OpStatus;
  /** Whether this operation counts towards progress. Defaults to `true`. */
  isProgressCountable: boolean;
}

/** Creates an operation that has already started. */
export function startingOp(name: string, isProgressCountable = true): Op {
  return { name, status: { kind: "ongoing" }, isProgressCountable };
}

export function isResolved(op: Op): boolean {
  return op.status.kind === "completed" || op.status.kind === "failed";
}

export function isFailed(op: Op): boolean {
  return op.status.kind === "failed";
}

export function opError(op: Op): OpError | undefined {
  return op.status.kind === "failed" ? op.status.error : undefined;
}

/**
 * A stack of operations under one key, e.g. everything a screen is loading. Once every
 * operation has resolved, the stack resets to empty.
 */
export class OpStack {
  readonly key: string;
  private ops: Op[] = [];

  constructor(key: string) {
    this.key = key;
  }

  static idle(key: string): OpStack {
    return new OpStack(key);
  }

  static loading(op: Op, key: string): OpStack {
    const stack = OpStack.idle(key);
    stack.push(op);
    return stack;
  }

  /** The operations currently held, oldest first. */
  get operations(): readonly Op[] {
    return this.ops;
  }

  /** Progress-countable operations that haven't resolved yet. */
  get scheduledOpsCount(): number {
    return this.ops.filter((op) => op.isProgressCountable && !isResolved(op)).length;
  }

  /** Progress-countable operations that have resolved. */
  get resolvedOpsCount(): number {
    return this.ops.filter((op) => op.isProgressCountable && isResolved(op)).length;
  }

  /** The messages of every failed operation. */
  get failureMessages(): string[] {
    return this.ops.flatMap((op) => {
      const error = opError(op);
      return error ? [error.message] : [];
    });
  }

  push(op: Op): void {
    this.ops.push(op);
  }

  /** Marks the named operation completed. An unknown name is ignored. */
  completed(opName: string): void {
    this.resolve(opName, { kind: "completed" });
  }

  /** Marks the named operation failed. An unknown name is ignored. */
  failed(opName: string, error: OpError): void {
    this.resolve(opName, { kind: "failed", error });
  }

  private resolve(opName: string, status: OpStatus): void {
    const op = this.ops.find((candidate) => candidate.name === opName);
    if (!op) return;
    op.status = status;
    if (this.ops.every(isResolved)) {
      this.ops = [];
    }
  }
}
