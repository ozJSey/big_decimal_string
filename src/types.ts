/**
 * BigDecimal input types - can be created from multiple formats
 */
export type BigDecimalInput = string | number | bigint | BigDecimal | null | undefined;

/**
 * Configuration options for BigDecimal operations
 */
export interface BigDecimalConfig {
  /** Number of decimal places (default: 2) */
  precision?: number;
  /** Rounding mode for division and precision changes */
  roundingMode?: RoundingMode;
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
