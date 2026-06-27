import test from 'tape-six';
import assert from 'node:assert';

import checkDefault from 'tape-six-invariant';
import {
  check,
  hasHost,
  setAbsentBehavior,
  throwOnFail,
  warnOnFail,
  InvariantError
} from 'tape-six-invariant';

const KEY = Symbol.for('tape6.invariant.host.v1');

// `let` widens the types: check()'s `asserts cond` would narrow a `false`/`0`
// literal to `never` and flag the rest of the block unreachable.
let pass = true,
  fail = false,
  zero = 0;

test('host slot is installed once tape-six is imported', t => {
  t.ok(hasHost, 'hasHost snapshot is true under a run');
  t.ok(globalThis[KEY], 'the global slot is set');
  t.equal(checkDefault, check, 'the default export is check');
});

test('check routes to the live host', t => {
  const real = globalThis[KEY];
  const calls = [];
  globalThis[KEY] = {version: 1, report: a => calls.push(a)};
  try {
    check(2 > 1, 'two beats one');
    check(zero, () => 'lazy message');
  } finally {
    globalThis[KEY] = real;
  }

  t.equal(calls.length, 2, 'both checks routed to the host');
  t.equal(calls[0].ok, true, 'passing verdict is normalized to true');
  t.equal(calls[0].message, 'two beats one');
  t.ok(calls[0].marker instanceof Error, 'marker is an Error for source location');
  t.equal(calls[1].ok, false, 'falsy non-boolean verdict normalized to false');
  t.equal(calls[1].message, 'lazy message', 'message thunk resolved before reporting');
});

test('absent path runs the configured behavior', t => {
  const real = globalThis[KEY];
  delete globalThis[KEY];
  try {
    setAbsentBehavior(throwOnFail);
    setAbsentBehavior(null);
    check(fail, 'swallowed');
    t.pass('clearing the behavior with null swallows failing checks');

    setAbsentBehavior(throwOnFail);
    t.throws(() => check(fail, 'boom'), /boom/, 'throwOnFail throws on failure');
    check(pass, 'fine');
    t.pass('throwOnFail ignores passing checks');

    let warned = '';
    // Swap the whole console: tape-six captures console via a Proxy whose get
    // trap shadows a `console.warn = …` patch.
    const realConsole = globalThis.console;
    globalThis.console = {warn: m => (warned = m)};
    try {
      setAbsentBehavior(warnOnFail);
      check(fail, 'careful');
    } finally {
      globalThis.console = realConsole;
    }
    t.ok(/careful/.test(warned), 'warnOnFail warns on failure');

    const seen = [];
    setAbsentBehavior((ok, message) => seen.push([ok, message]));
    check(fail, () => 'thunked');
    t.deepEqual(seen, [[false, 'thunked']], 'custom behavior sees verdict + resolved message');
  } finally {
    globalThis[KEY] = real;
    setAbsentBehavior(null);
  }
});

test('a user-supplied behavior can defer to node:assert', t => {
  const real = globalThis[KEY];
  delete globalThis[KEY];
  try {
    setAbsentBehavior((ok, message) => assert.ok(ok, message));
    check(pass, 'holds');
    t.pass('a satisfied invariant passes through');
    t.throws(() => check(fail, 'violated'), /violated/, 'a violated invariant throws');
  } finally {
    globalThis[KEY] = real;
    setAbsentBehavior(null);
  }
});

test('passing checks materialize under the real host', t => {
  check(hasHost, 'hasHost holds inside a run');
  check(typeof t.ok === 'function', 'the current tester is reachable');
  t.pass('the two checks above became real assertions on this test');
});

test('InvariantError', t => {
  const e = new InvariantError('nope');
  t.ok(e instanceof Error, 'subclasses Error');
  t.equal(e.name, 'InvariantError', 'carries its own name');
  t.equal(e.message, 'nope', 'keeps the message');
  t.equal(new InvariantError().message, 'Invariant failed', 'defaults the message');
});
