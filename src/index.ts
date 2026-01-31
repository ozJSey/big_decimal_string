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

const DEFAULT_PRECISION = 2;
const DEFAULT_ROUNDING_MODE = RoundingMode.HALF_UP;

export class BigDecimal {
  /** Internal representation: value * 10^scale */
  private readonly unscaledValue: bigint;
  /** Number of decimal places */
  private readonly scale: number;

  /**
   * Creates a new BigDecimal instance
   * @param value - The value to create from (string, number, bigint, or another BigDecimal)
   * @param precision - Number of decimal places (default: auto-detected or 2)
   */
  constructor(value?: BigDecimalInput, precision?: number) {
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

    const parsed = BigDecimal.parse(value, precision);
    this.unscaledValue = parsed.unscaledValue;
    this.scale = parsed.scale;
  }

  /**
   * Parse a value into unscaled bigint and scale
   */
  private static parse(
    value: string | number | bigint,
    precision?: number
  ): { unscaledValue: bigint; scale: number } {
    if (typeof value === "bigint") {
      const scale = precision ?? DEFAULT_PRECISION;
      return {
        unscaledValue: value * BigDecimal.powerOf10(scale),
        scale,
      };
    }

    let str = typeof value === "number" ? value.toString() : value;

    // Handle scientific notation
    if (/[eE]/.test(str)) {
      str = BigDecimal.scientificToPlain(str);
    }

    // Handle sign
    const isNegative = str.startsWith("-");
    if (isNegative || str.startsWith("+")) {
      str = str.slice(1);
    }

    // Split integer and decimal parts
    const [intPart, decPart = ""] = str.split(/[.,]/);

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

  /**
   * Convert scientific notation to plain decimal string
   */
  private static scientificToPlain(sci: string): string {
    if (!/[eE]/.test(sci)) return sci;

    const [coefficient, expPart] = sci.toLowerCase().split("e");
    const exponent = parseInt(expPart, 10);

    const isNegative = coefficient.startsWith("-");
    const cleanCoef = coefficient.replace(/^[-+]/, "");
    const [intPart, fracPart = ""] = cleanCoef.split(".");
    const digits = intPart + fracPart;
    const sign = isNegative ? "-" : "";

    if (exponent >= 0) {
      const totalIntDigits = intPart.length + exponent;
      if (totalIntDigits >= digits.length) {
        return sign + digits + "0".repeat(totalIntDigits - digits.length);
      }
      return sign + digits.slice(0, totalIntDigits) + "." + digits.slice(totalIntDigits);
    }

    const zerosNeeded = Math.abs(exponent) - intPart.length;
    if (zerosNeeded >= 0) {
      return sign + "0." + "0".repeat(zerosNeeded) + digits;
    }
    const splitPoint = intPart.length + exponent;
    return sign + digits.slice(0, splitPoint) + "." + digits.slice(splitPoint);
  }

  /**
   * Calculate 10^n as bigint
   */
  private static powerOf10(n: number): bigint {
    if (n < 0) throw new Error("Power must be non-negative");
    return 10n ** BigInt(n);
  }

  // ============================================
  // ARITHMETIC OPERATIONS (Chainable)
  // ============================================

  /**
   * Add another value to this BigDecimal
   * @returns A new BigDecimal with the result
   */
  add(other: BigDecimalInput): BigDecimal {
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other, this.scale);
    const [a, b] = BigDecimal.alignScales(this, otherBd);
    return BigDecimal.fromUnscaled(a.unscaledValue + b.unscaledValue, a.scale);
  }

  /**
   * Subtract another value from this BigDecimal
   * @returns A new BigDecimal with the result
   */
  subtract(other: BigDecimalInput): BigDecimal {
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other, this.scale);
    const [a, b] = BigDecimal.alignScales(this, otherBd);
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
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other, this.scale);

    // When multiplying, scales add: (a * 10^s1) * (b * 10^s2) = (a*b) * 10^(s1+s2)
    const rawResult = this.unscaledValue * otherBd.unscaledValue;
    const rawScale = this.scale + otherBd.scale;

    // Normalize back to original scale
    const targetScale = Math.max(this.scale, otherBd.scale);
    const scaleDiff = rawScale - targetScale;
    const divisor = BigDecimal.powerOf10(scaleDiff);

    // Round the result
    const rounded = BigDecimal.roundDivision(rawResult, divisor, DEFAULT_ROUNDING_MODE);

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
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other, this.scale);

    if (otherBd.unscaledValue === 0n) {
      throw new Error("Division by zero");
    }

    const targetScale = precision ?? this.scale;

    // Scale up dividend for precision, then divide
    // We want: (this / other) with targetScale decimals
    // = (unscaledThis / 10^s1) / (unscaledOther / 10^s2)
    // = (unscaledThis * 10^s2) / (unscaledOther * 10^s1)
    // Then scale to targetScale

    const scaledDividend =
      this.unscaledValue * BigDecimal.powerOf10(otherBd.scale + targetScale);
    const divisor = otherBd.unscaledValue * BigDecimal.powerOf10(this.scale);

    const result = BigDecimal.roundDivision(scaledDividend, divisor, roundingMode);

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
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other, this.scale);
    const [a, b] = BigDecimal.alignScales(this, otherBd);

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
    const otherBd = other instanceof BigDecimal ? other : new BigDecimal(other, this.scale);
    const [a, b] = BigDecimal.alignScales(this, otherBd);

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
    if (newScale === this.scale) {
      return this;
    }

    if (newScale > this.scale) {
      // Increasing precision - just multiply
      const multiplier = BigDecimal.powerOf10(newScale - this.scale);
      return BigDecimal.fromUnscaled(this.unscaledValue * multiplier, newScale);
    }

    // Decreasing precision - need to round
    const divisor = BigDecimal.powerOf10(this.scale - newScale);
    const rounded = BigDecimal.roundDivision(this.unscaledValue, divisor, roundingMode);
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
   * @param options - Formatting options
   * @param options.prettify - Add thousand separators (commas)
   *
   * @example
   * ```ts
   * bd("1234567.89").toString()                    // "1234567.89"
   * bd("1234567.89").toString({ prettify: true }) // "1,234,567.89"
   * bd("1e15").toString()                          // "1000000000000000.00"
   * bd("1e15").toString({ prettify: true })       // "1,000,000,000,000,000.00"
   * ```
   */
  toString(options?: { prettify?: boolean }): string {
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

    // Apply thousand separators if prettify is enabled
    if (options?.prettify) {
      intPart = BigDecimal.addThousandSeparators(intPart);
    }

    if (this.scale === 0 || !decPart) {
      return `${sign}${intPart}`;
    }

    return `${sign}${intPart}.${decPart}`;
  }

  /**
   * Format as a display string with thousand separators
   * Shorthand for toString({ prettify: true })
   *
   * @example
   * ```ts
   * bd("1234567.89").toFormat()  // "1,234,567.89"
   * bd("1e12").toFormat()        // "1,000,000,000,000.00"
   * ```
   */
  toFormat(): string {
    return this.toString({ prettify: true });
  }

  /**
   * Add thousand separators to an integer string
   */
  private static addThousandSeparators(intPart: string): string {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /**
   * Convert to number (may lose precision for large values)
   * @warning Use with caution - JavaScript numbers have limited precision
   */
  toNumber(): number {
    return parseFloat(this.toString());
  }

  /**
   * Format with fixed decimal places
   * @param decimals - Number of decimal places
   * @param options - Formatting options
   */
  toFixed(decimals: number, options?: { prettify?: boolean }): string {
    return this.setScale(decimals).toString(options);
  }

  /**
   * Get the integer part only
   */
  toInteger(): bigint {
    const divisor = BigDecimal.powerOf10(this.scale);
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

  // ============================================
  // INTERNAL HELPERS
  // ============================================

  /**
   * Align two BigDecimals to the same scale
   */
  private static alignScales(a: BigDecimal, b: BigDecimal): [BigDecimal, BigDecimal] {
    if (a.scale === b.scale) {
      return [a, b];
    }

    const targetScale = Math.max(a.scale, b.scale);
    return [a.setScale(targetScale), b.setScale(targetScale)];
  }

  /**
   * Perform division with rounding
   */
  private static roundDivision(
    dividend: bigint,
    divisor: bigint,
    mode: RoundingMode
  ): bigint {
    if (divisor === 0n) {
      throw new Error("Division by zero");
    }

    const quotient = dividend / divisor;
    const remainder = dividend % divisor;

    if (remainder === 0n) {
      return quotient;
    }

    const isNegative = (dividend < 0n) !== (divisor < 0n);
    const absRemainder = remainder < 0n ? -remainder : remainder;
    const absDivisor = divisor < 0n ? -divisor : divisor;

    // Check if we need to round up
    const shouldRoundUp = (() => {
      switch (mode) {
        case RoundingMode.UP:
          return true;
        case RoundingMode.DOWN:
          return false;
        case RoundingMode.CEILING:
          return !isNegative;
        case RoundingMode.FLOOR:
          return isNegative;
        case RoundingMode.HALF_UP: {
          const doubled = absRemainder * 2n;
          return doubled >= absDivisor;
        }
        case RoundingMode.HALF_DOWN: {
          const doubled = absRemainder * 2n;
          return doubled > absDivisor;
        }
        case RoundingMode.HALF_EVEN: {
          const doubled = absRemainder * 2n;
          if (doubled > absDivisor) return true;
          if (doubled < absDivisor) return false;
          // Exactly half - round to even
          const absQuotient = quotient < 0n ? -quotient : quotient;
          return absQuotient % 2n !== 0n;
        }
        default:
          return false;
      }
    })();

    if (shouldRoundUp) {
      return isNegative ? quotient - 1n : quotient + 1n;
    }

    return quotient;
  }
}

/**
 * Shorthand factory function
 *
 * @example
 * ```ts
 * const price = bd("19.99");
 * const total = bd(100).subtract(25).multiply(2);
 * ```
 */
export function bd(value?: BigDecimalInput, precision?: number): BigDecimal {
  return new BigDecimal(value, precision);
}

/**
 * Default export for convenience
 */
export default BigDecimal;
