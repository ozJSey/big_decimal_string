/**
 * BigDecimal - Precise decimal arithmetic for JavaScript
 *
 * Avoids floating-point precision issues by using bigint internally.
 * Supports chainable operations and configurable precision.
 *
 * @example
 * ```ts
 * const price = new BigDecimal("19.99");
 * const tax = price.multiply(0.08);
 * const total = price.add(tax);
 *
 * // Chaining
 * const result = new BigDecimal("100.00")
 *   .subtract("25.50")
 *   .multiply(2)
 *   .add("10")
 *   .toString(); // "159.00"
 * ```
 */

import type { BigDecimalConfig, BigDecimalInput } from "./types";
import { RoundingMode } from "./types";
import {
  powerOf10,
  assertScale,
  splitExponent,
  shiftDecimalPoint,
  alignScales,
  roundDivision,
} from "./utils";
import {
  CANONICAL_SEPARATORS,
  getSeparators,
  groupIntegerDigits,
  resolveSeparators,
  setSeparators,
  splitDecimalString,
} from "./separators";

const DEFAULT_PRECISION = 2;
const DEFAULT_ROUNDING_MODE = RoundingMode.HALF_UP;

export class BigDecimal {
  /** Internal representation: value * 10^scale */
  private readonly unscaledValue: bigint;
  /** Number of decimal places */
  readonly scale: number;

  /**
   * Creates a new BigDecimal instance
   * @param value - The value to create from (string, number, bigint, or another BigDecimal)
   * @param options - A number is the precision (decimal places); an object is a
   *                  separator config for reading the string, e.g.
   *                  `bd("1.234,56", { decimal: ",", group: "." })`
   */
  constructor(value?: BigDecimalInput, options?: number | BigDecimalConfig) {
    const precision = typeof options === "number" ? options : undefined;
    const config = typeof options === "object" ? options : undefined;

    if (precision !== undefined) {
      assertScale(precision, "precision");
    }

    if (value === null || value === undefined || value === "") {
      this.unscaledValue = 0n;
      this.scale = precision ?? DEFAULT_PRECISION;
      return;
    }

    if (value instanceof BigDecimal) {
      if (precision !== undefined && precision !== value.scale) {
        const adjusted = value.setScale(precision);
        this.unscaledValue = adjusted.unscaledValue;
        this.scale = adjusted.scale;
      } else {
        this.unscaledValue = value.unscaledValue;
        this.scale = value.scale;
      }
      return;
    }

    const parsed = BigDecimal.parse(value, precision, config);
    this.unscaledValue = parsed.unscaledValue;
    this.scale = parsed.scale;
  }

  /**
   * Parse a value into unscaled bigint and scale
   */
  private static parse(
    value: string | number | bigint,
    precision: number | undefined,
    config: BigDecimalConfig | undefined
  ): { unscaledValue: bigint; scale: number } {
    if (typeof value === "bigint") {
      const scale = precision ?? DEFAULT_PRECISION;
      return {
        unscaledValue: value * powerOf10(scale),
        scale,
      };
    }

    // A JavaScript number has exactly one spelling and the language chose it,
    // so numeric input is read canonically even when the app has configured a
    // different pair for strings.
    const separators = typeof value === "number" ? CANONICAL_SEPARATORS : resolveSeparators(config);
    const raw = typeof value === "number" ? value.toString() : value.trim();

    // Handle sign
    const isNegative = raw.startsWith("-");
    const body = isNegative || raw.startsWith("+") ? raw.slice(1) : raw;

    // Split off the exponent, then read the mantissa under the configured
    // separators, then move the point. Each step throws rather than guessing.
    const { mantissa, exponent } = splitExponent(body);
    const written = splitDecimalString(mantissa, separators);
    const { intPart, fracPart: decPart } =
      exponent === 0 ? written : shiftDecimalPoint(written.intPart, written.fracPart, exponent);

    // Determine scale
    const detectedScale = decPart.length;
    const targetScale = precision ?? Math.max(detectedScale, DEFAULT_PRECISION);

    // Clean integer part (remove leading zeros but keep at least one digit)
    let cleanIntPart = intPart.replace(/^0+/, "") || "0";

    // Adjust decimal part to target scale
    let adjustedDecPart: string;
    if (decPart.length < targetScale) {
      adjustedDecPart = decPart.padEnd(targetScale, "0");
    } else if (decPart.length > targetScale) {
      // Need to round
      adjustedDecPart = decPart.slice(0, targetScale);
      // Simple rounding: check next digit
      const nextDigit = parseInt(decPart[targetScale] || "0", 10);
      if (nextDigit >= 5) {
        if (targetScale === 0) {
          // When target scale is 0, round the integer part
          cleanIntPart = (BigInt(cleanIntPart) + 1n).toString();
        } else {
          const rounded = BigInt(adjustedDecPart || "0") + 1n;
          const roundedStr = rounded.toString();
          // Check for overflow (e.g., 99 + 1 = 100)
          if (roundedStr.length > targetScale) {
            cleanIntPart = (BigInt(cleanIntPart) + 1n).toString();
            adjustedDecPart = "0".repeat(targetScale);
          } else {
            adjustedDecPart = roundedStr.padStart(targetScale, "0");
          }
        }
      }
    } else {
      adjustedDecPart = decPart;
    }

    // Combine into unscaled value
    const combined = targetScale > 0 ? cleanIntPart + adjustedDecPart : cleanIntPart;
    let unscaledValue = BigInt(combined);

    if (isNegative) {
      unscaledValue = -unscaledValue;
    }

    return { unscaledValue, scale: targetScale };
  }

  // ============================================
  // ARITHMETIC OPERATIONS (Chainable)
  // ============================================

  /**
   * Add another value to this BigDecimal
   * @returns A new BigDecimal with the result
   */
  add(other: BigDecimalInput): BigDecimal {
    // The operand is parsed at its OWN natural scale, never coerced to this
    // one — `new BigDecimal(other, this.scale)` rounded "0.005" to 0.01 before
    // any arithmetic happened, in all six operations. alignScales and the
    // per-operation result-scale rules then do their existing jobs, which is
    // why `add("0.005")` and `add(bd("0.005"))` now agree. See CHANGELOG 1.2.1.
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other);
    const [a, b] = alignScales(this, otherBd);
    return BigDecimal.fromUnscaled(a.unscaledValue + b.unscaledValue, a.scale);
  }

  /**
   * Subtract another value from this BigDecimal
   * @returns A new BigDecimal with the result
   */
  subtract(other: BigDecimalInput): BigDecimal {
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other);
    const [a, b] = alignScales(this, otherBd);
    return BigDecimal.fromUnscaled(a.unscaledValue - b.unscaledValue, a.scale);
  }

  /**
   * Alias for subtract
   */
  minus(other: BigDecimalInput): BigDecimal {
    return this.subtract(other);
  }

  /**
   * Alias for add
   */
  plus(other: BigDecimalInput): BigDecimal {
    return this.add(other);
  }

  /**
   * Multiply this BigDecimal by another value
   * @returns A new BigDecimal with the result
   */
  multiply(other: BigDecimalInput): BigDecimal {
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other);

    // When multiplying, scales add: (a * 10^s1) * (b * 10^s2) = (a*b) * 10^(s1+s2)
    const rawResult = this.unscaledValue * otherBd.unscaledValue;
    const rawScale = this.scale + otherBd.scale;

    // Normalize back to original scale
    const targetScale = Math.max(this.scale, otherBd.scale);
    const scaleDiff = rawScale - targetScale;
    const divisor = powerOf10(scaleDiff);

    // Round the result
    const rounded = roundDivision(rawResult, divisor, DEFAULT_ROUNDING_MODE);

    return BigDecimal.fromUnscaled(rounded, targetScale);
  }

  /**
   * Alias for multiply
   */
  times(other: BigDecimalInput): BigDecimal {
    return this.multiply(other);
  }

  /**
   * Divide this BigDecimal by another value
   * @param other - The divisor
   * @param precision - Precision for the result (default: this.scale)
   * @param roundingMode - How to round (default: HALF_UP)
   * @returns A new BigDecimal with the result
   */
  divide(
    other: BigDecimalInput,
    precision?: number,
    roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE
  ): BigDecimal {
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other);

    if (otherBd.unscaledValue === 0n) {
      throw new Error("Division by zero");
    }

    if (precision !== undefined) {
      assertScale(precision, "precision");
    }

    const targetScale = precision ?? this.scale;

    // Scale up dividend for precision, then divide
    // We want: (this / other) with targetScale decimals
    // = (unscaledThis / 10^s1) / (unscaledOther / 10^s2)
    // = (unscaledThis * 10^s2) / (unscaledOther * 10^s1)
    // Then scale to targetScale

    const scaledDividend =
      this.unscaledValue * powerOf10(otherBd.scale + targetScale);
    const divisor = otherBd.unscaledValue * powerOf10(this.scale);

    const result = roundDivision(scaledDividend, divisor, roundingMode);

    return BigDecimal.fromUnscaled(result, targetScale);
  }

  /**
   * Alias for divide
   */
  dividedBy(
    other: BigDecimalInput,
    precision?: number,
    roundingMode?: RoundingMode
  ): BigDecimal {
    return this.divide(other, precision, roundingMode);
  }

  /**
   * Get the remainder of division
   */
  mod(other: BigDecimalInput): BigDecimal {
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other);
    const [a, b] = alignScales(this, otherBd);

    if (b.unscaledValue === 0n) {
      throw new Error("Division by zero");
    }

    const remainder = a.unscaledValue % b.unscaledValue;
    return BigDecimal.fromUnscaled(remainder, a.scale);
  }

  // ============================================
  // COMPARISON OPERATIONS
  // ============================================

  /**
   * Compare this BigDecimal to another
   * @returns -1 if this < other, 0 if equal, 1 if this > other
   */
  compareTo(other: BigDecimalInput): -1 | 0 | 1 {
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other);
    const [a, b] = alignScales(this, otherBd);

    if (a.unscaledValue < b.unscaledValue) return -1;
    if (a.unscaledValue > b.unscaledValue) return 1;
    return 0;
  }

  /**
   * Check if this BigDecimal equals another value
   */
  equals(other: BigDecimalInput): boolean {
    return this.compareTo(other) === 0;
  }

  /**
   * Alias for equals
   */
  eq(other: BigDecimalInput): boolean {
    return this.equals(other);
  }

  /**
   * Check if this BigDecimal is less than another
   */
  lessThan(other: BigDecimalInput): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Alias for lessThan
   */
  lt(other: BigDecimalInput): boolean {
    return this.lessThan(other);
  }

  /**
   * Check if this BigDecimal is less than or equal to another
   */
  lessThanOrEqual(other: BigDecimalInput): boolean {
    return this.compareTo(other) <= 0;
  }

  /**
   * Alias for lessThanOrEqual
   */
  lte(other: BigDecimalInput): boolean {
    return this.lessThanOrEqual(other);
  }

  /**
   * Check if this BigDecimal is greater than another
   */
  greaterThan(other: BigDecimalInput): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Alias for greaterThan
   */
  gt(other: BigDecimalInput): boolean {
    return this.greaterThan(other);
  }

  /**
   * Check if this BigDecimal is greater than or equal to another
   */
  greaterThanOrEqual(other: BigDecimalInput): boolean {
    return this.compareTo(other) >= 0;
  }

  /**
   * Alias for greaterThanOrEqual
   */
  gte(other: BigDecimalInput): boolean {
    return this.greaterThanOrEqual(other);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if this BigDecimal is zero
   */
  isZero(): boolean {
    return this.unscaledValue === 0n;
  }

  /**
   * Check if this BigDecimal is positive (> 0)
   */
  isPositive(): boolean {
    return this.unscaledValue > 0n;
  }

  /**
   * Check if this BigDecimal is negative (< 0)
   */
  isNegative(): boolean {
    return this.unscaledValue < 0n;
  }

  /**
   * Get the absolute value
   * @returns A new BigDecimal with the absolute value
   */
  abs(): BigDecimal {
    if (this.unscaledValue >= 0n) {
      return this;
    }
    return BigDecimal.fromUnscaled(-this.unscaledValue, this.scale);
  }

  /**
   * Negate this BigDecimal
   * @returns A new BigDecimal with the opposite sign
   */
  negate(): BigDecimal {
    return BigDecimal.fromUnscaled(-this.unscaledValue, this.scale);
  }

  /**
   * Get the sign of this BigDecimal
   * @returns -1, 0, or 1
   */
  sign(): -1 | 0 | 1 {
    if (this.unscaledValue < 0n) return -1;
    if (this.unscaledValue > 0n) return 1;
    return 0;
  }

  /**
   * Change the scale (number of decimal places)
   */
  setScale(newScale: number, roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE): BigDecimal {
    assertScale(newScale, "newScale");

    if (newScale === this.scale) {
      return this;
    }

    if (newScale > this.scale) {
      // Increasing precision - just multiply
      const multiplier = powerOf10(newScale - this.scale);
      return BigDecimal.fromUnscaled(this.unscaledValue * multiplier, newScale);
    }

    // Decreasing precision - need to round
    const divisor = powerOf10(this.scale - newScale);
    const rounded = roundDivision(this.unscaledValue, divisor, roundingMode);
    return BigDecimal.fromUnscaled(rounded, newScale);
  }

  /**
   * Get the precision (number of decimal places)
   */
  getPrecision(): number {
    return this.scale;
  }

  // ============================================
  // CONVERSION METHODS
  // ============================================

  /**
   * Convert to string representation
   * @param options - Formatting options, plus any separator overrides
   * @param options.prettify - Add group separators to the integer part
   *
   * @example
   * ```ts
   * bd("1234567.89").toString()                                      // "1234567.89"
   * bd("1234567.89").toString({ prettify: true })                    // "1,234,567.89"
   * bd("1234567.89").toString({ prettify: true, decimal: ",", group: "." }) // "1.234.567,89"
   * bd("1e15").toString()                                            // "1000000000000000.00"
   * ```
   */
  toString(options?: { prettify?: boolean } & BigDecimalConfig): string {
    const { decimal, group } = resolveSeparators(options);
    const isNegative = this.unscaledValue < 0n;
    const absValue = isNegative ? -this.unscaledValue : this.unscaledValue;
    const sign = isNegative ? "-" : "";

    let intPart: string;
    let decPart: string;

    if (this.scale === 0) {
      intPart = absValue.toString();
      decPart = "";
    } else {
      const str = absValue.toString().padStart(this.scale + 1, "0");
      intPart = str.slice(0, -this.scale) || "0";
      decPart = str.slice(-this.scale);
    }

    // Apply group separators if prettify is enabled
    if (options?.prettify) {
      intPart = groupIntegerDigits(intPart, group);
    }

    if (this.scale === 0 || !decPart) {
      return `${sign}${intPart}`;
    }

    return `${sign}${intPart}${decimal}${decPart}`;
  }

  /**
   * Format as a display string with group separators.
   * Shorthand for `toString({ prettify: true })`, and it reads the same
   * separator config the parser does, so the output can be read back in.
   *
   * @example
   * ```ts
   * bd("1234567.89").toFormat()                               // "1,234,567.89"
   * bd("1234567.89").toFormat({ decimal: ",", group: "." })   // "1.234.567,89"
   * bd(x.toFormat(cfg), cfg).equals(x)                        // true, both dialects
   * ```
   */
  toFormat(config?: BigDecimalConfig): string {
    return this.toString({ prettify: true, ...config });
  }

  /**
   * Convert to number (may lose precision for large values)
   * @warning Use with caution - JavaScript numbers have limited precision
   */
  toNumber(): number {
    // parseFloat only reads the canonical spelling, whatever the app config is.
    return parseFloat(this.toString(CANONICAL_SEPARATORS));
  }

  /**
   * Format with fixed decimal places
   * @param decimals - Number of decimal places
   * @param options - Formatting options
   */
  toFixed(decimals: number, options?: { prettify?: boolean } & BigDecimalConfig): string {
    assertScale(decimals, "decimals");
    return this.setScale(decimals).toString(options);
  }

  /**
   * Get the integer part only
   */
  toInteger(): bigint {
    const divisor = powerOf10(this.scale);
    return this.unscaledValue / divisor;
  }

  /**
   * valueOf for implicit conversions
   */
  valueOf(): number {
    return this.toNumber();
  }

  // ============================================
  // STATIC FACTORY METHODS
  // ============================================

  /**
   * Create from unscaled value and scale
   */
  private static fromUnscaled(unscaledValue: bigint, scale: number): BigDecimal {
    const bd = Object.create(BigDecimal.prototype) as BigDecimal;
    (bd as any).unscaledValue = unscaledValue;
    (bd as any).scale = scale;
    return bd;
  }

  /**
   * Install the app-wide separator config used for reading and writing numbers.
   * A per-call config (`bd(value, cfg)`, `toFormat(cfg)`) still wins over it.
   *
   * @example
   * ```ts
   * BigDecimal.setConfig({ decimal: ",", group: "." });
   * bd("1.234,56").toString();   // "1234,56"
   * ```
   */
  static setConfig(config: BigDecimalConfig): void {
    setSeparators(config);
  }

  /**
   * Read the app-wide separator config.
   */
  static getConfig(): Required<BigDecimalConfig> {
    return getSeparators();
  }

  /**
   * Create a BigDecimal with value zero
   */
  static zero(precision: number = DEFAULT_PRECISION): BigDecimal {
    return new BigDecimal(0, precision);
  }

  /**
   * Create a BigDecimal with value one
   */
  static one(precision: number = DEFAULT_PRECISION): BigDecimal {
    return new BigDecimal(1, precision);
  }

  /**
   * Sum multiple values
   */
  static sum(...values: BigDecimalInput[]): BigDecimal {
    if (values.length === 0) {
      return BigDecimal.zero();
    }

    return values.reduce<BigDecimal>((acc, val) => {
      return acc.add(val);
    }, BigDecimal.zero());
  }

  /**
   * Get the maximum value
   */
  static max(...values: BigDecimalInput[]): BigDecimal {
    if (values.length === 0) {
      throw new Error("max requires at least one value");
    }

    return values.reduce<BigDecimal>((max, val) => {
      const bd = val instanceof BigDecimal ? val : new BigDecimal(val);
      return bd.gt(max) ? bd : max;
    }, new BigDecimal(values[0]));
  }

  /**
   * Get the minimum value
   */
  static min(...values: BigDecimalInput[]): BigDecimal {
    if (values.length === 0) {
      throw new Error("min requires at least one value");
    }

    return values.reduce<BigDecimal>((min, val) => {
      const bd = val instanceof BigDecimal ? val : new BigDecimal(val);
      return bd.lt(min) ? bd : min;
    }, new BigDecimal(values[0]));
  }
}
