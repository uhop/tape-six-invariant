import test from 'tape-six';
import assert from 'node:assert';

import {check, setAbsentBehavior} from 'tape-six-invariant';

const KEY = Symbol.for('tape6.invariant.host.v1');

// `let` widens the types so check()'s `asserts cond` doesn't narrow a literal
// to `never`; see ../test-invariant.js.
let pass = true,
  fail = false;

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
