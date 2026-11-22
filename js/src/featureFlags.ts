/**
 * Feature flags — TypeScript port of BankaiCore's `FeatureFlags.swift`.
 */

/** The resolved state of a feature flag. */
export type FeatureFlagState = "enabled" | "disabled" | "undetermined";

/** A named feature flag. Two flags are the same flag when their names are equal. */
export interface FeatureFlag {
  readonly name: string;
}

/** Creates a feature flag. */
export function featureFlag(name: string): FeatureFlag {
  return Object.freeze({ name });
}

/** A feature flag together with the state assigned to it. */
export interface FeatureFlagAssignment {
  readonly flag: FeatureFlag;
  state: FeatureFlagState;
}

/** Reads and changes feature flag states. */
export interface FeatureFlagService {
  /** Returns a closure that answers whether the flag is enabled at call time. */
  enabledResolver(flag: FeatureFlag): () => boolean;
  /** The flag's current state, or `undefined` when nothing is assigned to it. */
  state(flag: FeatureFlag): FeatureFlagState | undefined;
  /** Changes the flag's state. */
  change(flag: FeatureFlag, state: FeatureFlagState): void;
}

/**
 * A `FeatureFlagService` held in memory, seeded from assignments. Useful as a default
 * and in tests; persistent services implement the same interface.
 */
export class InMemoryFeatureFlagService implements FeatureFlagService {
  private readonly states = new Map<string, FeatureFlagState>();

  constructor(assignments: Iterable<FeatureFlagAssignment> = []) {
    for (const { flag, state } of assignments) {
      this.states.set(flag.name, state);
    }
  }

  enabledResolver(flag: FeatureFlag): () => boolean {
    return () => this.state(flag) === "enabled";
  }

  state(flag: FeatureFlag): FeatureFlagState | undefined {
    return this.states.get(flag.name);
  }

  change(flag: FeatureFlag, state: FeatureFlagState): void {
    this.states.set(flag.name, state);
  }

  /** Every assignment currently held. */
  assignments(): FeatureFlagAssignment[] {
    return [...this.states].map(([name, state]) => ({ flag: featureFlag(name), state }));
  }
}
