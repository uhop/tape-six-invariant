import test from 'tape-six';

import type {AbsentBehavior} from 'tape-six-invariant';
import check from 'tape-six-invariant';
import {
  check as checkNamed,
  hasHost,
  setAbsentBehavior,
  throwOnFail,
  warnOnFail,
  InvariantError
} from 'tape-six-invariant';

test('types: check is the default export and narrows via asserts cond', t => {
  const value: unknown = 7;
  check(typeof value === 'number', 'value is a number');
  const widened: number = value; // compiles only because check() narrowed `value`
  t.equal(widened, 7);
  t.equal(check, checkNamed, 'default and named check are the same value');
});

test('types: check accepts a string or a thunk message, or none', t => {
  check(true, 'a plain string message');
  check(true, () => 'a lazy thunk message');
  check(true);
  t.pass();
});

test('types: hasHost is a boolean', t => {
  const present: boolean = hasHost;
  t.equal(typeof present, 'boolean');
});

test('types: setAbsentBehavior accepts a behavior or null', t => {
  const behavior: AbsentBehavior = (ok, message) => {
    if (!ok) throw new Error(typeof message === 'string' ? message : 'failed');
  };
  setAbsentBehavior(behavior);
  setAbsentBehavior(throwOnFail);
  setAbsentBehavior(warnOnFail);
  setAbsentBehavior(null);
  t.pass();
});

test('types: canned behaviors are AbsentBehavior', t => {
  const a: AbsentBehavior = throwOnFail;
  const b: AbsentBehavior = warnOnFail;
  t.equal(typeof a, 'function');
  t.equal(typeof b, 'function');
});

test('types: InvariantError is an Error subclass', t => {
  const e: InvariantError = new InvariantError('boom');
  const message: string = e.message;
  const base: Error = e;
  t.ok(base instanceof Error);
  t.equal(message, 'boom');
});
