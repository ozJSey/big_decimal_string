// Export types and enums
export type { BigDecimalInput, BigDecimalConfig } from "./types";
export { RoundingMode } from "./types";

// Export the main class
export { BigDecimal } from "./big-decimal";

/**
 * Shorthand factory function
 *
 * @example
 * ```ts
 * const price = bd("19.99");
 * const total = bd(100).subtract(25).multiply(2);
 * ```
 */
export { BigDecimal as default } from "./big-decimal";

// Factory function for convenience
import { BigDecimal } from "./big-decimal";
import type { BigDecimalInput } from "./types";

export function bd(value?: BigDecimalInput, precision?: number): BigDecimal {
  return new BigDecimal(value, precision);
}
