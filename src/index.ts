import { BigDecimal } from './big-decimal';
import { type BigDecimalConfig, type BigDecimalInput } from './types';

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
 * const eu = bd("1.234,56", { decimal: ",", group: "." });
 * ```
 */
export { BigDecimal as default } from "./big-decimal";

// Factory function for convenience



export function bd(value?: BigDecimalInput, options?: number | BigDecimalConfig): BigDecimal {
  return new BigDecimal(value, options);
}
