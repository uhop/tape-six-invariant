# Contributing to tape-six-invariant

Thank you for your interest in contributing!

## Getting started

The only submodule is the wiki. Clone and install:

```bash
git clone --recursive https://github.com/uhop/tape-six-invariant.git
cd tape-six-invariant
npm install
```

There is no build step. Running the tests needs a tape-six that exports the invariant host hooks — until a release carries them, `npm link` a local checkout (see [AGENTS.md](./AGENTS.md) § Setup).

## Development workflow

1. Make your changes.
2. Format: `npm run lint:fix`
3. Test: `npm test`
4. Type-check: `npm run ts-check`

## Code style

- ES modules (`import`/`export`), no CommonJS in source.
- Formatted with Prettier — run `npm run lint:fix` before committing.
- Zero runtime dependencies — do not add any.
- Never import tape-six; coordinate only through the global protocol slot.
- Keep `index.js` and `index.d.ts` in sync.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
