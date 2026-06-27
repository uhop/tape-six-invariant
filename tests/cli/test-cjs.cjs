// Showcase: using tape-six-invariant from CommonJS. The package is ESM-only,
// but `require()` of an ESM module works on Node 22+ and Bun. Named exports
// (including `check`) come straight off the required namespace.
const {test} = require('tape-six');
const {check, setAbsentBehavior, throwOnFail, InvariantError} = require('tape-six-invariant');

const KEY = Symbol.for('tape6.invariant.host.v1');

test('CJS: invariants materialize under the host', t => {
  check(1 < 2, 'one is less than two');
  check(typeof t.ok === 'function', 'the current tester is reachable');
  t.pass('the checks above became real assertions on this test');
});

test('CJS: a configured behavior enforces with no host', t => {
  const real = globalThis[KEY];
  delete globalThis[KEY];
  try {
    setAbsentBehavior(throwOnFail);
    t.throws(() => check(1 > 2, 'boom'), /boom/, 'throwOnFail throws InvariantError');
    t.ok(new InvariantError('x') instanceof Error, 'InvariantError is an Error');
  } finally {
    globalThis[KEY] = real;
    setAbsentBehavior(null);
  }
});
