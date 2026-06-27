# AGENTS.md — tape-six-invariant

> `tape-six-invariant` is a zero-dependency library of `assert`-style invariant checks that **materialize** into real [tape-six](https://github.com/uhop/tape-six) assertions when a tape-six run is hosting them, and are inert (or a configurable behavior) otherwise. It never imports tape-six — the two coordinate through a single versioned global slot.

For project structure and the coordination protocol see [ARCHITECTURE.md](./ARCHITECTURE.md).
For detailed usage docs see the [wiki](https://github.com/uhop/tape-six-invariant/wiki).

## Setup

```bash
git clone --recursive https://github.com/uhop/tape-six-invariant.git
cd tape-six-invariant
npm install
```

The only `--recursive` submodule is the `wiki/`. There is no build step.

**Tests need a tape-six that exports the invariant host hooks** (`getTester`, `Tester.reportAssertion`, the `globalThis` slot). Until a tape-six release carries them, link a local checkout:

```bash
cd ../tape-six && npm link            # register the local build once
cd ../tape-six-invariant && npm link tape-six
```

## Commands

- **Install:** `npm install`
- **Test (Node):** `npm test` (runs `tape6 --flags FO`)
- **Test (Bun):** `npm run test:bun`
- **Test (Deno):** `npm run test:deno`
- **Type tests (Node/Bun/Deno):** `npm run ts-test` / `ts-test:bun` / `ts-test:deno` (runs the `.ts` typings smoke test)
- **Lint:** `npm run lint` (Prettier check)
- **Lint fix:** `npm run lint:fix` (Prettier write)
- **TypeScript check:** `npm run ts-check`
- **JS lint check (optional):** `npm run js-check` (`tsc --project tsconfig.check.json` — `checkJs` lint for unused/undeclared variables, `strict: false`; not a type check — use `ts-check` for types)

## Project structure

```
tape-six-invariant/
├── index.js          # The whole library: check, hasHost, setAbsentBehavior, canned behaviors, InvariantError
├── index.d.ts        # TypeScript definitions for the public API (sole source of types + docs)
├── package.json      # Package config; "tape6" section configures test discovery
├── tests/
│   ├── test-invariant.js   # Functionality, runs on every platform (the "tests" category)
│   ├── test-types.ts       # TS typings smoke test (run via ts-test; type-checked by ts-check)
│   └── cli/                # CLI-only tests (the "cli" category: Node/Bun/Deno, not browser)
│       ├── test-node-assert.js  # bring-your-own node:assert absent behavior
│       └── test-cjs.cjs         # CommonJS (require) usage showcase
└── wiki/             # GitHub wiki documentation (submodule)
```

This is a **library, not a CLI** — it ships no `bin`. The entire implementation is a single root module (`index.js`); there is no `src/` and no build step. Test discovery splits into platform-universal (`tests`), CLI-only (`cli` — Node/Bun/Deno), and `.ts` typings (run via `ts-test`); the functionality tests live in JS, the `.ts` file exercises typings.

## Code style

- **ES modules** throughout (`"type": "module"` in package.json).
- **No transpilation** — code runs directly in Node, Deno, Bun, and browsers.
- **Zero runtime dependencies** (`dependencies` absent) — the library must hold this line. It imports nothing at all; even `node:assert`-style enforcement is a caller-supplied absent behavior, not a built-in.
- **Prettier** for formatting (see `.prettierrc`). Semicolons enforced (Prettier default).
- **No JSDoc in `.js`** — `index.d.ts` is the sole source of types and docs; `index.js` carries `// @ts-self-types="./index.d.ts"` at the top so IDE hover defers to the `.d.ts`.
- **No narrating comments** — comments are short _why_-markers only (a non-trivial decision/constraint, an algorithm reference, or required JSDoc), never a restatement of _what_ the code does.

## Architecture

- The library and tape-six coordinate through a **versioned, Symbol-keyed slot on `globalThis`**: `Symbol.for('tape6.invariant.host.v1')`. A global (not a module variable) because a production dependency graph can carry several copies of the library — only a global is shared across all of them.
- **tape-six installs the slot at module load** (`index.js`, set with `||=`): `{version, report(assertion)}`, where `report` resolves the live current tester via `getTester()` and forwards to `Tester.reportAssertion(...)`. Install-before-use timing is why it is set at load, not in `init()` — a test file imports tape-six first, so the slot exists before any code-under-test runs.
- **`check(cond, message)`** reads the live slot per call. With a host: it reports `{ok, message, marker: new Error()}` so the assertion lands on the current test with source location at the call site. Without a host: on failure it runs the configured **absent behavior**, if any (none by default → a no-op).
- **`hasHost`** is an import-time boolean snapshot — a cheap gate for skipping expensive pre-check computation (`if (hasHost) check(expensiveToCompute(), '…')`). Correctness never depends on it; `check` reads the live slot.
- **Absent behavior** is a single generic setter (`setAbsentBehavior(fn)`), not an env-flag menu. Default is none — a failing check with no host is a no-op; `setAbsentBehavior(null)` (or any non-function) clears a set behavior. Canned behaviors ship as exported functions: `throwOnFail`, `warnOnFail`. There is deliberately no canned `node:assert` behavior — a synchronous `check` should not dynamically import, so deferring to `node:assert` is a bring-your-own-import one-liner (`setAbsentBehavior((ok, message) => assert.ok(ok, message))`), keeping the package zero-dependency.
- **Cross-realm:** `Symbol.for` is shared within a realm; each realm (worker, iframe, subprocess) has its own `globalThis`. tape-six already isolates per realm, so each realm's load sets its own slot.

## Usage

```js
import check from 'tape-six-invariant';

export function transfer(from, to, amount) {
  check(amount > 0, 'amount must be positive');
  check(from.currency === to.currency, 'currencies must match');
}
```

- Under a tape-six run the checks become counted assertions on the current test.
- In production they are inert by default; opt into enforcement at startup:

```js
import {setAbsentBehavior, throwOnFail} from 'tape-six-invariant';
setAbsentBehavior(throwOnFail);
```

## Key conventions

- **Do not add dependencies.** Zero-dep is a hard constraint, not a preference.
- **Never import tape-six.** The library knows only the global protocol; importing tape-six would defeat the zero-dep, materialize-when-listening design.
- All public API is exported from `index.js` and typed in `index.d.ts`. Keep them in sync.
- `check` is both the **default export** and a named export (ESM default-with-named-mirror convention); every other symbol is named-only. Prefer the default form (`import check from 'tape-six-invariant'`) for the common single-import case.
- `check`'s signature is `asserts cond` for caller-side type-narrowing. Keep it **static and recognizable** (no dynamic dispatch) so an unassert-style build transform can strip calls in release builds.
- The equality family (`deepEqual`, `match`, …) is **out of scope** — deep comparison needs an engine, which would force a dependency or env-divergent semantics. A richer package can come later.
