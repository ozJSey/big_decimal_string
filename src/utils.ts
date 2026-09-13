import type { RoundingMode } from "./types";
import { RoundingMode as RoundingModeEnum } from "./types";

/**
 * Calculate 10^n as bigint
 */
export function powerOf10(n: number): bigint {
  if (n < 0) throw new Error("Power must be non-negative");
  return 10n ** BigInt(n);
}

/**
 * Add thousand separators to an integer string
 */
export function addThousandSeparators(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Convert scientific notation to plain decimal string
 */
export function scientificToPlain(sci: string): string {
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
 * Align two BigDecimals to the same scale
 */
export function alignScales(
  a: { scale: number; setScale(newScale: number): any },
  b: { scale: number; setScale(newScale: number): any }
): [any, any] {
  if (a.scale === b.scale) {
    return [a, b];
  }

  const targetScale = Math.max(a.scale, b.scale);
  return [a.setScale(targetScale), b.setScale(targetScale)];
}

/**
 * Perform division with rounding
 */
export function roundDivision(
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
      case RoundingModeEnum.UP:
        return true;
      case RoundingModeEnum.DOWN:
        return false;
      case RoundingModeEnum.CEILING:
        return !isNegative;
      case RoundingModeEnum.FLOOR:
        return isNegative;
      case RoundingModeEnum.HALF_UP: {
        const doubled = absRemainder * 2n;
        return doubled >= absDivisor;
      }
      case RoundingModeEnum.HALF_DOWN: {
        const doubled = absRemainder * 2n;
        return doubled > absDivisor;
      }
      case RoundingModeEnum.HALF_EVEN: {
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
