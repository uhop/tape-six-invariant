# Architecture

`tape-six-invariant` is a zero-dependency library of invariant checks that materialize into real [tape-six](https://github.com/uhop/tape-six) assertions under a test run, and are inert (or a configurable behavior) in production. It has **no runtime dependencies** and **never imports tape-six** — the two coordinate only through a versioned global slot.

## Project layout

```
index.js              # The entire library
index.d.ts            # TypeScript declarations (sole source of types + docs)
package.json          # Package config; "tape6" section configures test discovery
tests/                # test-*.js — consume tape-six to exercise materialization
└── test-invariant.js
wiki/                 # GitHub wiki documentation (submodule)
```

There is no `src/`, no build step, and no `bin` — this is a single-module library, not a CLI.

## The coordination protocol

The library and tape-six are separately published and coordinate through one well-known global:

```js
const KEY = Symbol.for('tape6.invariant.host.v1');
```

- **A global, not a module variable.** A production dependency graph can carry several copies/versions of this library (npm does not always dedupe across version ranges). The coordination point must be shared across all of them; only a `globalThis` slot is. This is the same precedent as the React DevTools global hook and `core-js` shared state.
- **tape-six owns the slot.** It installs `{version, report}` at **module load** (with `||=`, so the first-loaded copy wins). Installing at load — not in `init()` — is what makes `hasHost` reliable: a test file imports tape-six before the code under test, so the slot exists before any embedded `check()` runs.
- **Each realm sets its own slot.** `Symbol.for` is shared within a realm, but workers, iframes, and subprocesses each have their own `globalThis`. tape-six already isolates per realm, so the model fits without extra work.

## Control flow

```
check(cond, message)
   │
   ├── host = globalThis[KEY]
   │
   ├── host present ──► host.report({ok: !!cond, message, marker: new Error()})
   │                        │
   │                        └── tape-six: getTester() → tester.reportAssertion(...)
   │                                 (counted assertion on the current test,
   │                                  source location at the check() call site)
   │
   └── no host ──► cond truthy?  ── yes ─► return            (one property read: the off cost)
                                  ── no  ─► absentBehavior(cond, resolveMessage(message))
```

- **`marker: new Error()`** is created inside `check`, one frame below the caller, so tape-six's reporter recovers the call site rather than the adapter.
- **Message resolution** — a `() => string` thunk is resolved before reporting (host path) or only on failure (absent path), so an expensive message is never built for a passing production check.
- **`hasHost`** is a one-time import snapshot used to gate expensive pre-check computation; it never affects correctness, which always reads the live slot.

## Behaviors

The absent path (no host) is governed by a single replaceable slot, `absentBehavior`, which starts unset (`null`) — a failing check with no host is then a no-op, and `check` skips even resolving the message. `setAbsentBehavior(fn)` installs one; `setAbsentBehavior(null)` (or any non-function) clears it. Canned behaviors are ordinary exported functions — `throwOnFail`, `warnOnFail` — not env-flag-selected modes, so a user can supply any `(ok, message) => void` (throw, log, sample, increment a metric). Deferring to `node:assert` is intentionally left to the caller (`setAbsentBehavior((ok, message) => assert.ok(ok, message))`): a synchronous `check` should not dynamically import a module, and keeping the import caller-side preserves the zero-dependency guarantee.

## Design boundaries

- **Predicate-only.** No equality family (`deepEqual`, `match`, …): deep comparison needs an engine, which would force a dependency or env-divergent semantics. A richer sibling can form fuller `reportAssertion` descriptors later.
- **Zero-dep, no tape-six import.** Both are hard constraints — the library knows only the global protocol.
- **Build-strippable.** `check` keeps a static, recognizable signature so an unassert-style transform can remove calls in release builds.
