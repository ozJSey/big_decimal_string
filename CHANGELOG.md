# Changelog

All notable changes to `@ozjsey/bigdecimal-string`.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/spec/v2.0.0.html).

> **Reconstructed on 2026-09-13**, after the package had already reached 1.1.0 without one. Every
> entry below is sourced from something checkable — a commit in this repository, or the npm
> registry's own metadata — and nothing is written down that neither can support. Where the record
> is silent, this file says so rather than guessing.

## [1.2.0] — UNRELEASED

Not on npm. `package.json` carries this number so that the local tree and the published 1.1.0 are
never the same version describing two different artifacts — the ESM fix below changes what the
tarball contains, and a reader must be able to tell which one they have. Publishing is the owner's
call.

### Fixed

- **The package can be `import`ed again.** 1.1.0 publishes an `exports` map with a `require`
  condition and no `import` condition, so `import { bd } from "@ozjsey/bigdecimal-string"` — the
  form used by *every* example in the README — fails under Node ESM with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`, and bundlers are handed the CJS build. The build now emits both
  formats (`dist/index.min.mjs` and `dist/index.min.js`) and the `exports` map declares both, with
  `module` alongside `main`. Confirmed by loading the built package through each entry point.
  This restores what 1.0.0 had; see the 1.1.0 entry below for how it was lost.

### Not fixed — open defects found while building the playground tab

These are recorded here because they are live on the published version, not because they are done.

- **`bd("1,234.56")` returns `"1.234"`.** The README's API reference states "Commas are stripped".
  They are not: `parse()` splits the input on `/[.,]/` and keeps only the first two segments, so a
  grouped string is silently truncated to a different number instead of throwing. The same defect
  means the library cannot read its own `toFormat()` output back — `bd(bd("1234567.89").toFormat())`
  is `"1.234"`. Demonstrated live on playground card `11-parsing`, and asserted by
  `scripts/interactions/bigdecimal-string.mjs` so that fixing it turns the assertion red.

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
  `import { bd } from "…"` throughout. Treated as unintended; see Unreleased.

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
  alongside `tests/index.spec.ts`; 122 tests between them today.
