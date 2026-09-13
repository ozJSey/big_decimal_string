# bigdecimal-string Architecture

## Module Map

| File | Purpose |
|---|---|
| **`types.ts`** | `RoundingMode` enum, `BigDecimalInput` type, `BigDecimalConfig` interface. All type definitions needed across modules. |
| **`utils.ts`** | Helper functions: `powerOf10`, `addThousandSeparators`, `scientificToPlain`, `alignScales`, `roundDivision`. Pure, composable utilities. |
| **`big-decimal.ts`** | `BigDecimal` class with all instance and static methods. Imports types and utilities. |
| **`index.ts`** | Re-exports all public types and the class. Provides `bd()` factory function and default export. |

## Design Invariant

**Single-purpose modules with mandatory inter-module dependencies prevent copy-paste misuse.**

To use BigDecimal, consumers must either:
1. **Install the npm package** (recommended) — single import, full API
2. **Copy the source files** — but they need `types.ts` AND `utils.ts` AND `big-decimal.ts` all together, which is impractical and signals the need for npm

Copying just `big-decimal.ts` fails with import errors; copying just `utils.ts` is useless without the class. This discourages casual copy-pasting and directs people to the proper distribution channel (npm).

## How to Add a Feature

1. **If it's a new type or enum:** Add to `types.ts`
2. **If it's a pure helper function:** Add to `utils.ts`
3. **If it's a new method or behavior on BigDecimal:** Add to the `BigDecimal` class in `big-decimal.ts`
4. **If it's a public API addition:** Update `index.ts` exports if needed

Never grow a single file beyond its single purpose. If a module is doing two things, split it.
