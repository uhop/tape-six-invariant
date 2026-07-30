# Invariant analysis — landscape and strategy

Status: **research + strategy, 2026-07-06.** A survey of what exists for static
and dynamic invariant analysis, design-by-contract, and lightweight verification
— especially anything reachable from JavaScript/TypeScript — and where
`tape-six-invariant` fits and should head. This is a foundation to argue from,
not a committed plan.

Companion reading: the blog post _Loop and `if` invariants_ (the argument this
operationalizes) and this repo's [ARCHITECTURE.md](../ARCHITECTURE.md) (the
current design). External claims here were gathered and adversarially verified in
a focused research pass; primary sources are cited inline.

## 1. The gap this is about

The blog post argues for invariant-based programming in everyday JS — Dijkstra's
discipline (loop initialization/maintenance/termination + a bound function; block
invariants; `if`/`switch` exhaustiveness) made ordinary. Its closing lament is
the strategic target:

> State [an invariant] and almost nothing tracks it. … There is no reasoner that
> re-checks our code, and the code depending on it, for the contradictions a
> change induces, and no way to ship a function with its invariants attached so a
> consumer could verify against them. … This is the job I'd hand an AI agent —
> the reasoner we're missing.

So the field question is: **what tracks a stated invariant today, and how far up
the cost/rigor curve is it worth climbing for a zero-dependency, test-adjacent
JS/TS library?** The answer, from the research, is that the ecosystem is bimodal
— cheap runtime assertion helpers on one end, heavyweight formal verification on
the other — with very little in the pragmatic middle, which is exactly where
`tape-six-invariant` sits.

## 2. Where tape-six-invariant sits today

Recap of the current design (see ARCHITECTURE.md): a zero-dependency
`check(cond, message)` that **materializes into a counted tape-six assertion**
when a test run is hosting it (via the `Symbol.for('tape6.invariant.host.v1')`
slot), and is **inert by default** (or a configurable `absentBehavior`) in
production. Predicate-only; build-strippable (a static `check` signature for an
unassert-style transform); never imports tape-six.

That places it in the **design-by-contract lineage**, but with a twist no other
JS/TS library has: the check routes into a _live test harness_ as a first-class
assertion. The rest of this doc positions that against the field.

## 3. The landscape

### 3.1 Design-by-contract lineage (the tradition)

- **Eiffel** (canonical DbC): `require`/`ensure`/`invariant` as first-class
  keywords; **compile-time monitoring levels** (`no`/`require`/`ensure`/
  `invariant`/`all`), default `require` only; a class invariant is implicitly
  conjoined to the pre- and post-condition of every exported routine. A contract
  violation is treated as a **bug**, not as input validation — the same stance
  that separates an invariant check from a `zod`/`valibot` validator. The
  monitoring-level model is the precedent for our configurable behavior.
- **Rust `contracts` crate** (the closest structural sibling): `#[requires]`/
  `#[ensures]`/`#[invariant]`, with **`#[debug_*]`** variants stripped from
  release builds and **`#[test_*]`** variants (`cfg!(test)`-guarded) that
  materialize _only under a test run_ — structurally the same idea as
  tape-six-invariant's test-run materialization, minus the live-harness routing.
- **clojure.spec**: a function is an args-spec (precondition) + ret-spec
  (postcondition) + optional fn-spec (relation); `instrument` swaps in a
  validating wrapper (dev-time toggle); specs are predicate compositions (the
  same substrate as `check(cond)`), and yield generative/property tests "for
  free."

Takeaway: contracts-as-first-class-constructs is a mature idea in other
languages; JS has only libraries, and none integrate with a test runner.

### 3.2 JS/TS contract & invariant libraries (the direct competitive set)

- **tiny-invariant** (~74M downloads/week — the adoption bar): zero-dep
  `invariant(cond, message)`; TypeScript/Flow **type narrowing** on a passing
  check. **Correction from research:** it is _not_ inert in production — it
  **throws in both dev and production**; production only **strips the message**
  to `"Invariant failed"` (delegated to `babel-plugin-dev-expression` / tsdx /
  rollup-replace). This is a genuine differentiator for us: our **inert-by-default
  no-op** is a different contract, not a reimplementation.
- **ts-invariant** (Apollo, ~7M/week): `invariant` + a runtime `setVerbosity`;
  Rollup-plugin stripping. Heavy usage but **has a `tslib` dependency** and has
  been **stale since 2022**.
- **ow** (v3.1.1, Oct 2025, ~zero-dep, TS-first): runtime argument validation
  `ow(value, predicate)` with a chainable predicate builder, dev-only import
  stripping, TS type guards + an `Infer` utility (a runtime contract that doubles
  as a compile-time type). This is the "richer predicate surface" direction our
  ARCHITECTURE explicitly defers ("a richer sibling can form fuller
  `reportAssertion` descriptors later").
- **babel-plugin-unassert** (the strip _mechanism_): removes `assert` /
  `console.assert` / power-assert / `invariant` / `nanoassert` / `uvu/assert`
  calls **and their imports** at build time. Our build-strippability should
  target/align with the unassert ecosystem rather than invent a new marker.

### 3.3 TypeScript as a lightweight-invariant substrate (the near-term lever)

- **TS 3.7 assertion signatures**: a function typed `function check(cond, msg?):
asserts cond` **narrows types for the rest of the scope**. This is exactly the
  signature `check()` should carry so that a passing check is a _compiler-
  recognized_ invariant — static narrowing _and_ runtime materialization in one
  call. `asserts val is T` covers type-refinement; a `never` return models
  halting/exhaustiveness helpers. The blog already notes TS narrowing / assertion
  signatures / the `never`-exhaustiveness trick as "invariants for free."
- **Refined TypeScript (RSC)** (research, 2016): refinement types (types +
  logical predicates) with static verification of higher-order _imperative_ TS,
  evaluated on Octane/D3/the TS compiler — proof that refinement types are viable
  for TS, but it is research-grade, not productized.
- **Hegel** (a sound JS type checker): **archived Jan 2024, dead.** The negative
  signal — sound JS typing has no live productized option to lean on.

### 3.4 Dynamic invariant inference (the Daikon path — an open opportunity)

- **Daikon** (the flagship, mature): infers _likely_ invariants from execution
  traces (constants, ranges, linear relations, ordering, nullness, sortedness,
  containment). Front-ends exist for C/C++/C#/Eiffel/F#/Java/Perl/VB — **not
  JavaScript or TypeScript.** Accuracy is bounded by test-suite completeness;
  invariants are "likely," not proven; demonstrated useful for small programs.
  Intended output: asserts, docs, specs.
- **JS type-from-tests inference** (2014 prototype): infers JSDoc types from unit
  test executions — but it is an **unsound under-approximation** and imposes
  heavy instrumentation cost (jQuery's suite went 50s → 602s, ~12×). So dynamic
  JS inference is possible but unsound and expensive → must be test/dev-only and
  stripped.

**The opportunity:** there is no Daikon for JS/TS, and tape-six _already runs the
executions_ Daikon needs as traces. A test run that observes values flowing
through `check`-instrumented (or plain) code could emit _suggested_ invariants
— the raw material for `check()` calls or JSDoc contracts. Nobody has built this
for JS.

### 3.5 Formal / SMT verification (the heavyweight ceiling — where not to go)

- **Maturity (2020 survey):** most formal-methods tools are research prototypes,
  unmaintained or expensive; the advice is **incremental, lightweight adoption**
  (start from null-pointer-style warnings), not heavyweight methods. AWS has used
  TLA+ since 2011; Facebook runs INFER; but formalizing requirements can consume
  ~30% of development time up front.
- **Dafny / SMT (2025):** proof/annotation code can be an **order of magnitude
  larger** than the implementation; auto-active verifiers stay sparsely used;
  proofs are **brittle** (a Z3 version bump or a different machine can break a
  passing proof). _But_ the same work notes formal specs enable precise
  **change-impact analysis** (the blog's "missing reasoner" — a failing spec
  after a change tells you what broke), and proposes **tests as a proof proxy**
  (lemmas → tests) and **auto-generating library contracts from tests** (Daikon
  lineage) as the pragmatic shortcut.

That last point is the strategic endorsement: the tests-as-proof-proxy middle
path _is_ tape-six-invariant's model.

### 3.6 AI/LLM as the "missing reasoner" (the blog's explicit bet)

- **LEMUR** (ICLR 2024): the first fully-automated **LLM + automated-reasoner**
  verification framework. The LLM **proposes** candidate invariants as sub-goals;
  a sound verifier **validates** them; crucially, LLM-proposed properties are
  treated only as **assumptions until proven**, so unreliable LLM output cannot
  compromise soundness. It solved 25/47 hard SV-COMP benchmarks where
  state-of-the-art solvers each solved 1. (C only — the methodology transfers.)
- **LLM loop-invariant study** (Nov 2025): LLMs reach ~78% success at
  _generating_ loop invariants but only ~16% at _repairing_ incorrect ones, and
  do markedly better with domain knowledge + examples in the prompt.

Takeaway: the blog's "hand it to an AI agent" is a real, published architecture —
**agent proposes, sound oracle disposes** — with the important nuance that the
agent is good at proposing and weak at self-correcting, so the oracle is
load-bearing.

## 4. Strategy for tape-six-invariant

### 4.1 Positioning (confirmed by the research)

tape-six-invariant occupies the **pragmatic middle** the field mostly skips:
runtime invariant checks that (a) **materialize into a live test harness** as
counted assertions — the tests-as-proof-proxy the Dafny paper recommends — (b)
are **inert-by-default** in production (Eiffel's monitoring-level stance), and
(c) are **build-strippable** (the unassert model). Keep that identity.

### 4.2 Genuine differentiators (defend these)

1. **Inert-by-default no-op.** tiny-invariant and ts-invariant _always throw_;
   we default to nothing. That is a different, deliberate contract — a `check`
   embedded in production library code costs one property read when no host and
   no behavior are set.
2. **Materializes into a running test as a counted assertion.** No other JS/TS
   library routes a production-embeddable check into a live harness. The Rust
   `#[test_*]` contract is the closest structural analogue and it is _not_
   harness-integrated. This is the moat.

### 4.3 Near-term, actionable (cheap, high-value)

- **Give `check()` a TS `asserts condition` signature** (in `index.d.ts`) so a
  passing check statically **narrows types** downstream — turning it into a
  static+dynamic invariant in a single call, using a standard TS 3.7 feature.
  This is the single highest-leverage small change and directly realizes the
  blog's "invariants for free" via the type system.
- **Align build-stripping with the unassert ecosystem** so existing toolchains
  strip `check` without bespoke configuration.
- Consider an `asserts val is T` variant for type-refinement checks and a
  `never`-returning exhaustiveness helper (the blog's `switch` exhaustiveness).

### 4.4 Roadmap opportunities (research-grade — "where this could go")

- **A "Daikon for JS," powered by tape-six runs.** Test executions are exactly
  the traces dynamic invariant inference needs, and no such tool exists for
  JS/TS. Observe values during a run and emit _suggested_ likely-invariants as
  `check()` calls or JSDoc — unsound (a suggestion, not a proof), test-only,
  stripped. A natural sibling to the harness.
- **The "ship invariants with the function" gap.** No JS prior art for attaching
  contracts to a published package so a consumer can verify against them. Explore
  encoding invariants at the TypeScript declaration level or as structured JSDoc
  the harness (or an agent) can read back.
- **The "missing reasoner" = an AI agent, done LEMUR-style.** An agent that,
  across a change and its dependents, _proposes_ the contradictions a change
  induces, with **tests and types as the sound oracle** (assume-until-proven).
  This is the _same_ agent-proposes/oracle-verifies architecture as the code-
  transformation "moonshot" (see `tape-six/dev-docs/` once written) — the
  invariants library and that tool share a spine, and tape-six is the practical
  oracle in both.

### 4.5 Explicitly not building

An SMT verifier, a refinement-type checker, or a sound JS type system (Hegel
died proving that market). Heavyweight formal methods are the wrong altitude for
a zero-dependency, test-adjacent library — the research is unanimous that their
cost (10× annotation overhead, brittle proofs, ~30% up-front time) is why the
pragmatic middle exists at all.

## 5. Open questions

1. **`asserts` signature ergonomics.** Does the `asserts condition` overload
   compose cleanly with the message-thunk and the host-slot fast path, or does it
   force an API split?
2. **Inference scope.** If a "Daikon for JS" is pursued, is it a mode of the
   harness (observe during a normal run) or a separate opt-in instrumentation
   pass, given the ~12× tracing cost the 2014 prototype measured?
3. **Contract publishing format.** TS declaration-level constraints vs structured
   JSDoc vs a sidecar — which can a downstream consumer (or agent) actually read
   back and act on?
