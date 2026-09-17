# Changelog

All notable changes to `@ozjsey/bigdecimal-string`.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/spec/v2.0.0.html).

> **Reconstructed on 2026-09-13**, after the package had already reached 1.1.0 without one. Every
> entry below is sourced from something checkable — a commit in this repository, or the npm
> registry's own metadata — and nothing is written down that neither can support. Where the record
> is silent, this file says so rather than guessing.

## 1.2.2 — 2026-09-18

Documentation only; no code change. The README is cut to a landing page — problem, solution,
install, a couple of usage examples — because the playground now carries the reference: every
option driven in a real browser rather than described in a table. Claims that could not be
verified against the source were deleted rather than carried across.

## [1.2.1] — 2026-09-17

Supersedes `1.2.0` (published 2026-09-14T10:01:33Z).

### Fixed

- **An operand is parsed at its own scale, not the receiver's.** `add`, `subtract`, `multiply`,
  `divide`, `mod` and `compareTo` each wrapped a raw operand with
  `new BigDecimal(other, this.scale)`, which rounded it to the receiver's scale *before* any
  arithmetic happened. Every one of these was wrong on the published 1.2.0, and every one of them
  was already right if you wrapped the operand yourself:

  | expression | 1.2.0 | 1.2.1 |
  |---|---|---|
  | `bd("100.00").multiply("0.005")` | `"1.00"` | `"0.500"` |
  | `bd("1").divide("0.003")` | throws `Division by zero` | `"333.33"` |
  | `BigDecimal.sum("0.001","0.001","0.001")` | `"0.00"` | `"0.003"` |
  | `bd("0.10").add("0.005").add("0.005")` | `"0.12"` | `"0.110"` |
  | `bd("1.00").mod("0.003")` | throws `Division by zero` | `"0.001"` |
  | `bd("0.10").equals("0.104")` | `true` | `false` |

  122 tests stayed green over this for two releases because no suite had a case where the operand
  carried more decimals than the receiver. Every arithmetic suite now has one, plus a
  string-equals-wrapped assertion per operation.

- **Grouped input is read, not truncated.** `bd("1,234.56")` returned `"1.234"`: `parse()` split on
  `/[.,]/` and kept the first two segments, so a grouped string silently became a different number,
  and `toFormat()` output could not be read back. Both now work — see the separator standard below.

- **A scale must be a non-negative integer.** `bd("123.45").setScale(-1)` returned `"1.2"`, which is
  not tens-rounding, just a string sliced at a negative index. `setScale`, `toFixed`, the
  constructor's `precision` and `divide`'s `precision` now throw `RangeError`. Real negative-scale
  semantics remain out of scope; this closes the wrong-output hole.

- **A dangling exponent is rejected.** `bd("1e")`, `bd("1e+")`, `bd("1ee5")` and `bd("1e2.5")` all
  returned a number (`"0.10"`, `"0.10"`, `"0.10"`, `"100.00"`) because `parseInt("")` is `NaN` and
  the `NaN` fell through unnoticed. They now throw `SyntaxError`.

### Added

- **A separator standard, and `BigDecimalConfig` is real.** `.` decimal and `,` grouping by default;
  override per call (`bd("1.234,56", { decimal: ",", group: "." })`, `toFormat(cfg)`) or app-wide
  (`BigDecimal.setConfig(cfg)`, read back with `BigDecimal.getConfig()`), per-call winning.
  `group: ""` accepts and emits no grouping; `" "` is allowed as a group separator.

  **Grouping is validated, never stripped.** Only two shapes are accepted: no separators at all, or
  a first group of 1-3 digits followed by groups of exactly 3. `"1,23"` throws with a message
  naming both readings rather than becoming `123` — comma-stripping would have been the same
  silent corruption in a different coat. `"12,34.5"` (malformed grouping), `"1.2.3"` (two decimal
  separators) and `"1.234,56"` under the default dialect (group separator after the decimal
  separator) all throw as well.

  The parser and `toString`/`toFormat` read the same config, so `bd(x.toFormat(cfg), cfg).equals(x)`
  holds in both dialects. That is a pinned test now; before this release the library could not read
  its own formatted output at all.

- `src/separators.ts` — the one module that decides what `.` and `,` mean, in both directions.

### Changed

- **`BigDecimalConfig` changed shape.** It was `{ precision?, roundingMode? }`, exported from the
  entry and referenced by nothing — no parameter, no return type, no overload in any version. It is
  now `{ decimal?, group? }`, the config the constructor, `toString`, `toFormat` and
  `BigDecimal.setConfig` actually take. A type-only change to a dead export, which is why this is a
  patch; if you had imported the old shape by hand, it is gone.
- The `bd()` / `BigDecimal` second argument is now `number | BigDecimalConfig` — a number is still
  the precision.
- `toString()`, `toFixed()` and `toFormat()` accept separator overrides. Default output is
  unchanged, character for character.
- `src/utils.ts`: `addThousandSeparators` moved into `separators.ts` as `groupIntegerDigits`
  (it now takes the group character), and `scientificToPlain` was replaced by `splitExponent` +
  `shiftDecimalPoint`, which work on already-split digit strings. Internal modules; nothing in the
  public surface referenced either.

### Verified

- 175 unit tests, `vitest`. Negative controls run for every fix: restoring
  `new BigDecimal(other, this.scale)` at the six call sites turns exactly the 12 operand-scale
  tests red; stripping the group separator instead of validating it turns the 4 invalid/ambiguous
  rows red (and `bd("1,23")` answers `123.00`); hard-coding a comma in `groupIntegerDigits` turns
  the 5 round-trip/app-config tests red; dropping the `assertScale` calls turns the 2 guard tests
  red; dropping the exponent check turns the 1 exponent test red.
- Negative `HALF_UP` / `HALF_DOWN` / `HALF_EVEN` ties are now pinned (`-2.5` → `-3` / `-2` / `-2`,
  `-3.5` → `-4` under `HALF_EVEN`). They were already correct and untested.

## [1.2.0] — 2026-09-14

Published to npm at 2026-09-14T10:01:33Z (registry metadata; `dist-tags.latest` is `1.2.0`).

> The tarball that was published carries a CHANGELOG whose own heading for this version reads
> `[1.2.0] — UNRELEASED / Not on npm`. It was written before the publish and never updated. The
> heading above is the correction; the registry is the source of truth, not this file.

### Fixed

- **The package can be `import`ed again.** 1.1.0 publishes an `exports` map with a `require`
  condition and no `import` condition, so `import { bd } from "@ozjsey/bigdecimal-string"` — the
  form used by *every* example in the README — fails under Node ESM with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`, and bundlers are handed the CJS build. The build now emits both
  formats (`dist/index.min.mjs` and `dist/index.min.js`) and the `exports` map declares both, with
  `module` alongside `main`. Confirmed by loading the built package through each entry point.
  This restores what 1.0.0 had; see the 1.1.0 entry below for how it was lost.

### Known defects, shipped

Recorded here because they went out with this version. All are fixed in 1.2.1 above.

- `bd("1,234.56")` returns `"1.234"`, so `toFormat()` output cannot be read back.
- Every raw operand is coerced to the receiver's scale, so `bd("100.00").multiply("0.005")` is
  `"1.00"` and `bd("1").divide("0.003")` throws.

### Documentation

- Playground tab with 11 cards, one per README claim, each showing the same expression computed
  twice — plain JavaScript beside the library. 70 browser checks assert both halves are *visibly*
  rendered, not merely present in the DOM.
- `ARCHITECTURE.md` rewritten: the previous "Design Invariant" argued the module split exists to
  make copying the source impractical, which is the opposite of this portfolio's stated position.
- README: corrected three statements about JavaScript that the live cards contradict (see below),
  and repaired the malformed live-demo link.

## [1.1.0] — 2026-09-13

First release under the `@ozjsey` scope. The unscoped `bigdecimal-string` name was unpublished from
the registry at 13:57 UTC the same day, five minutes after this version went up at 13:52 UTC; the
registry therefore holds no version history for the unscoped name, and none is reconstructed here.

### Changed

- Renamed from `bigdecimal-string` to `@ozjsey/bigdecimal-string` (`f840b1b`).
- Build switched to a single minified CJS bundle, `dist/index.min.js`, with generated `.d.ts`
  (`a66e78e`, "chore: minified now").

### Removed

- **The `import` condition, and with it ESM support.** 1.0.0's `exports` map read
  `{ types, import: "./dist/index.mjs", require: "./dist/index.js" }`. `a66e78e` replaced it with
  `{ types, require: "./dist/index.min.js" }` in the same commit that introduced minification.
  Nothing in the commit message or the README mentions it, and the README continued to document
  `import { bd } from "…"` throughout. Treated as unintended; see 1.2.0 above.

## [1.0.0] — 2026-01-31

Initial release, as the unscoped `bigdecimal-string` (`09cc0ac`). No longer on the registry.

- `BigDecimal` class over an unscaled `bigint` plus a scale: `add`, `subtract`, `multiply`,
  `divide`, `mod`, and the `plus` / `minus` / `times` / `dividedBy` aliases.
- Comparisons `compareTo`, `equals`/`eq`, `lessThan`/`lt`, `lessThanOrEqual`/`lte`,
  `greaterThan`/`gt`, `greaterThanOrEqual`/`gte`.
- Utilities `isZero`, `isPositive`, `isNegative`, `abs`, `negate`, `sign`, `setScale`,
  `getPrecision`.
- Conversions `toString({ prettify })`, `toFormat`, `toFixed`, `toNumber`, `toInteger`, `valueOf`.
- Statics `sum`, `max`, `min`, `zero`, `one`; the `bd()` factory.
- `RoundingMode` with all seven modes: `CEILING`, `FLOOR`, `DOWN`, `UP`, `HALF_UP`, `HALF_DOWN`,
  `HALF_EVEN`.
- Dual ESM + CJS build with an `exports` map declaring both.
- `17c55b8` ("making sure all claims in readme is fully tested") added `tests/readme-claims.spec.ts`
  alongside `tests/index.spec.ts`; 122 tests between them through 1.2.0, 175 at 1.2.1.
