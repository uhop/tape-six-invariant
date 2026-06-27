// @ts-self-types="./index.d.ts"

const KEY = Symbol.for('tape6.invariant.host.v1');

const resolveMessage = message => (typeof message === 'function' ? message() : message);

export const hasHost = !!globalThis[KEY];

let absentBehavior = null;

export const setAbsentBehavior = fn => {
  absentBehavior = typeof fn === 'function' ? fn : null;
};

export class InvariantError extends Error {
  constructor(message) {
    super(message || 'Invariant failed');
    this.name = 'InvariantError';
    if (typeof Error.captureStackTrace == 'function') {
      Error.captureStackTrace(this, InvariantError);
    }
  }
}

export const throwOnFail = (ok, message) => {
  if (!ok) throw new InvariantError(message);
};

export const warnOnFail = (ok, message) => {
  if (!ok) console.warn('Invariant failed' + (message ? ': ' + message : ''));
};

export const check = (cond, message) => {
  const host = globalThis[KEY];
  if (host) {
    host.report({ok: !!cond, message: resolveMessage(message), marker: new Error()});
    return;
  }
  if (!absentBehavior) return;
  if (!cond) absentBehavior(cond, resolveMessage(message));
};

export default check;
