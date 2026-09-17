# bigdecimal-string — architecture

## Module map

| File | Owns |
|---|---|
| `src/types.ts` | `RoundingMode` (all seven modes), `BigDecimalInput`, `BigDecimalConfig`. No logic, no imports except a type-only reference to the class. |
| `src/separators.ts` | What `.` and `,` mean, in both directions: `splitDecimalString` (reading) and `groupIntegerDigits` (writing), plus the app-wide config the two share (`setSeparators`, `getSeparators`, `resolveSeparators`). The only module that holds state, and it holds exactly one pair of characters. |
| `src/utils.ts` | Six pure functions with no knowledge of the public API: `powerOf10`, `assertScale`, `splitExponent`, `shiftDecimalPoint`, `alignScales`, `roundDivision`. Each is total, each is independently testable, none of them holds state. |
| `src/big-decimal.ts` | The `BigDecimal` class: parsing, arithmetic, comparison, scale changes, formatting, and the statics. The only module that knows the internal representation. |
| `src/index.ts` | Thin re-export barrel plus the `bd()` factory. No behaviour. |

## The invariant the split protects

**Nothing outside `big-decimal.ts` may know that a value is `unscaledValue: bigint` plus
`scale: number`.**

That pairing is the whole idea — `1.005` is `1005` with a scale of `3`, never a double — and it is
the one thing that must not leak. `utils.ts` is the test of whether it has: every helper there takes
`bigint`s, or strings, or two `BigDecimal`s, and none of them reaches for `unscaledValue`.
`roundDivision` is the sharpest case: all seven rounding modes are decided from a dividend, a
divisor and a mode, with no idea what is being rounded or why. If a helper ever needs the private
field, the logic belongs in the class, not in `utils.ts`.

`unscaledValue` is `private readonly`, and every operation returns a new instance through the
private `fromUnscaled` factory. Immutability is not a convention here; there is no code path that
writes to an existing instance.

## The second invariant: separators are decided in one place

`separators.ts` is the only module that knows which character is a decimal point and which groups
thousands. `big-decimal.ts` asks it on the way in and on the way out, which is what makes
`bd(x.toFormat(cfg), cfg)` equal `x`.

Before 1.2.1 there was no such place: `parse()` split on `/[.,]/` and kept the first two segments,
while `toFormat` hard-coded a comma — two separate opinions, and the library could not read its own
output (`bd("1,234.56")` was `1.234`). If a second `split(",")` ever appears outside this module,
the two opinions are back.

Grouping is **validated, never stripped**, which is the other half of the invariant: stripping
commas would read the European habit `"1,23"` as `123`, so anything not unambiguously grouped
throws instead of returning a number nobody wrote.

## Why it is split at all

Most people copy this source into their project rather than installing it, so the readability of the
files *is* the distribution. The split exists to make each file answerable on its own: someone who
wants to understand the rounding takes `utils.ts` and nothing else, and someone who wants to add an
operation edits one class and touches neither of the other two.

> An earlier version of this document argued the opposite — that the split exists to make copying
> impractical and push people toward npm. That is not this portfolio's position and it is not what
> the shape of these files does; the three modules copy across together in one gesture. Recorded
> here so the reversal is visible rather than silent.

## Where a change goes

| Adding | Goes in |
|---|---|
| A rounding mode, an input type, an options interface | `types.ts` |
| Anything about how a number is written — separators, dialects, validation | `separators.ts` |
| A pure calculation over `bigint`s or strings | `utils.ts` |
| An operation, a comparison, a formatter, a static | `big-decimal.ts` |
| A new export or factory | `index.ts` |

If a helper starts needing the private field, it is not a helper. If `big-decimal.ts` grows a block
of arithmetic that never mentions `this`, it is not a method.

## Build

`tsup` emits both formats from `src/index.ts` — `dist/index.min.mjs` (ESM) and `dist/index.min.js`
(CJS) — with `.d.mts` / `.d.ts` beside them. Both conditions are declared in `exports`. This matters
more than it looks: 1.1.0 shipped with `require` only, and every `import` in the README failed
against it. See `CHANGELOG.md`.

## Verified where

- `tests/index.spec.ts`, `tests/readme-claims.spec.ts` and `tests/separators.spec.ts` — 175 unit
  tests, `vitest`. Pure BigInt logic, so jsdom is not needed and nothing here is UNPROVEN.
- `playground/src/demos/bigdecimal-string/` — 11 cards, each rendering the same expression in plain
  JavaScript and through the library, both computed in the browser.
- `playground/scripts/interactions/bigdecimal-string.mjs` — 70 checks in real Chrome, asserting that
  both halves of every claim are *visible* (laid out, unclipped, unobscured), not merely present.
  Unit tests cannot see a card that stopped rendering.
