# tape-six-invariant [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/tape-six-invariant.svg
[npm-url]: https://npmjs.org/package/tape-six-invariant

`tape-six-invariant` lets you embed `assert`-style **invariant checks** in production or library code that **materialize** into real [`tape-six`](https://github.com/uhop/tape-six) assertions when a tape-six run exercises that code — and stay inert (or do whatever you configure) otherwise.

**Zero runtime dependencies.** Works in [Node](https://nodejs.org/), [Deno](https://deno.land/), [Bun](https://bun.sh/), and browsers. ES modules, TypeScript bindings included. The library never imports tape-six — the two coordinate through a single global slot.

```js
import check from 'tape-six-invariant';

export function transfer(from, to, amount) {
  check(amount > 0, 'amount must be positive');
  check(from.currency === to.currency, 'currencies must match');
  // …
}
```

- **Under a tape-six run** (the code is exercised by a test): each `check()` becomes a counted assertion on the _current_ test — in the plan, in TAP output, with its source location pointing at the `check()` call site.
- **In production** (no tape-six): a configurable behavior. Default **inert** (does nothing). Overridable to throw, warn, defer to your own `node:assert`, or anything you like.

The same call site means the same thing — an invariant — and is paid for only when something is listening.

## Install

```bash
npm install --save tape-six-invariant
```

`tape-six` is needed only to _run_ the invariants as assertions (a dev/test concern), so it is not a dependency of this package.

## Usage

### Materialize under test

Any code reached — directly or transitively — from a tape-six test body routes its `check()` calls to the current test:

```js
import test from 'tape-six';
import {transfer} from '../src/bank.js';

test('transfer enforces its invariants', t => {
  transfer({currency: 'USD'}, {currency: 'USD'}, 10); // the two checks pass as assertions
  t.pass('done');
});
```

### Configure production behavior

By default invariants are inert in production — they cost a single global-property read. Opt into enforcement at startup:

```js
import {setAbsentBehavior, throwOnFail} from 'tape-six-invariant';

setAbsentBehavior(throwOnFail); // a failing check now throws InvariantError
```

Canned behaviors (exported functions, not magic strings):

| Behavior            | Effect on a failing check |
| ------------------- | ------------------------- |
| `inert` _(default)_ | nothing                   |
| `throwOnFail`       | throw `InvariantError`    |
| `warnOnFail`        | `console.warn`            |

Or pass your own `(ok, message) => void` — for instance, to defer to `node:assert`, bring your own import so it stays your dependency, not the package's:

```js
import assert from 'node:assert';

setAbsentBehavior((ok, message) => assert.ok(ok, message));
```

### Skip expensive pre-check work

`hasHost` is an import-time snapshot — use it to avoid computing an argument that is only worth checking under a run:

```js
import {check, hasHost} from 'tape-six-invariant';

if (hasHost) check(expensiveToCompute(), 'invariant holds');
```

Correctness never depends on the snapshot — `check()` always reads the live slot.

### Lazy messages

Pass a `() => string` thunk to build an expensive message only when it is needed:

```js
check(list.every(valid), () => `invalid items: ${list.filter(x => !valid(x)).join(', ')}`);
```

## API

See the [wiki](https://github.com/uhop/tape-six-invariant/wiki) for full docs. `check` is the default export (and a named export); everything else is named-only.

- `check(cond, message?)` — record an invariant. `message` may be a string or a `() => string` thunk. TypeScript signature is `asserts cond`.
- `hasHost` — import-time boolean: was a tape-six host present at load?
- `setAbsentBehavior(fn)` — set the no-host failure behavior (default `inert`).
- `inert`, `throwOnFail`, `warnOnFail` — canned absent behaviors.
- `InvariantError` — thrown by `throwOnFail`.

## Related packages

- [tape-six](https://www.npmjs.com/package/tape-six) — the test library these invariants materialize into.
- [tape-six-proc](https://www.npmjs.com/package/tape-six-proc) — process-isolated test execution.
- [tape-six-puppeteer](https://www.npmjs.com/package/tape-six-puppeteer) / [tape-six-playwright](https://www.npmjs.com/package/tape-six-playwright) — browser automation.

## Release notes

- **1.0.0** — Initial release: `check`, `hasHost`, `setAbsentBehavior`, canned behaviors (`inert`/`throwOnFail`/`warnOnFail`), `InvariantError`.

## License

[BSD-3-Clause](./LICENSE) © Eugene Lazutkin
