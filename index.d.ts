/**
 * Absent-path behavior — runs when a failing {@link check} finds no host.
 * @see https://github.com/uhop/tape-six-invariant/wiki/API#canned-behaviors
 */
export type AbsentBehavior = (ok: unknown, message?: string) => void;

/**
 * Records an invariant: a counted tape-six assertion when a run is hosting it,
 * the configured absent behavior otherwise.
 * @see https://github.com/uhop/tape-six-invariant/wiki/API#check
 */
export declare function check(cond: unknown, message?: string | (() => string)): asserts cond;

/**
 * Import-time snapshot of whether a tape-six host was present at load. Gate for
 * skipping expensive pre-check work; correctness never depends on it.
 * @see https://github.com/uhop/tape-six-invariant/wiki/API#hashost
 */
export declare const hasHost: boolean;

/**
 * Sets the absent-path behavior. Pass `null` (or any non-function) to clear it;
 * with none set — the default — a failing {@link check} with no host is a no-op.
 * @see https://github.com/uhop/tape-six-invariant/wiki/API#setabsentbehavior
 */
export declare function setAbsentBehavior(fn: AbsentBehavior | null): void;

/** Absent behavior: throw {@link InvariantError} on failure. */
export declare const throwOnFail: AbsentBehavior;

/** Absent behavior: `console.warn` on failure. */
export declare const warnOnFail: AbsentBehavior;

/** Error thrown by {@link throwOnFail}. */
export declare class InvariantError extends Error {
  constructor(message?: string);
}

/** {@link check} is also the default export. */
export default check;
