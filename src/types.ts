import type { BigDecimal } from './big-decimal';

/**
 * BigDecimal input types - can be created from multiple formats
 */
export type BigDecimalInput = string | number | bigint | BigDecimal | null | undefined;

/**
 * Which characters a written number uses for the decimal point and for
 * grouping thousands. The same pair is used for reading and for writing, which
 * is what makes `bd(x.toFormat(cfg), cfg)` equal `x`.
 *
 * Defaults are `decimal: "."` and `group: ","`. Set them per call
 * (`bd("1.234,56", { decimal: ",", group: "." })`) or app-wide
 * (`BigDecimal.setConfig({ decimal: ",", group: "." })`); the per-call config
 * wins. `decimal` and `group` may not be the same symbol.
 */
export interface BigDecimalConfig {
  /** Separates the integer part from the fraction (default: `"."`) */
  decimal?: "." | ",";
  /** Groups thousands in the integer part; `""` accepts and emits none (default: `","`) */
  group?: "," | "." | " " | "";
}

/**
 * Rounding modes for division and scale adjustments
 */
export enum RoundingMode {
  /** Round towards positive infinity */
  CEILING = "CEILING",
  /** Round towards negative infinity */
  FLOOR = "FLOOR",
  /** Round towards zero (truncate) */
  DOWN = "DOWN",
  /** Round away from zero */
  UP = "UP",
  /** Round to nearest, ties go to even (banker's rounding) */
  HALF_EVEN = "HALF_EVEN",
  /** Round to nearest, ties round up */
  HALF_UP = "HALF_UP",
  /** Round to nearest, ties round down */
  HALF_DOWN = "HALF_DOWN",
}
