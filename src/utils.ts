import type { RoundingMode } from "./types";
import type { BigDecimal } from "./big-decimal";
import { RoundingMode as RoundingModeEnum } from "./types";

/**
 * Calculate 10^n as bigint
 */
export function powerOf10(n: number): bigint {
  if (n < 0) throw new Error("Power must be non-negative");
  return 10n ** BigInt(n);
}

/**
 * A scale is a count of decimal places, so anything that is not a non-negative
 * integer is a bug in the caller rather than a rounding instruction.
 *
 * `bd("123.45").setScale(-1)` used to answer "1.2" — not tens-rounding, just a
 * string sliced at a negative index. Real negative-scale semantics would be a
 * feature; this is the guard that stops the wrong number in the meantime.
 */
export function assertScale(scale: number, label: string): void {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new RangeError(`${label} must be a non-negative integer, received ${scale}.`);
  }
}

/**
 * Split a trailing exponent off a written number.
 *
 * The exponent must be a whole number. `"1e"` used to parse as 0.10, because
 * `parseInt("")` is NaN and the NaN then fell through the plain-decimal path
 * without anything noticing.
 */
export function splitExponent(body: string): { mantissa: string; exponent: number } {
  const marker = /[eE]/.exec(body);
  if (!marker) {
    return { mantissa: body, exponent: 0 };
  }

  const exponentText = body.slice(marker.index + 1);
  if (!/^[+-]?\d+$/.test(exponentText)) {
    throw new SyntaxError(
      `${JSON.stringify(body)} has a malformed exponent: ${JSON.stringify(exponentText)} is not a whole number.`
    );
  }

  return { mantissa: body.slice(0, marker.index), exponent: parseInt(exponentText, 10) };
}

/**
 * Move the decimal point across already-split digit strings.
 * Pure digit shuffling — the point lands at `intPart.length + exponent`.
 */
export function shiftDecimalPoint(
  intPart: string,
  fracPart: string,
  exponent: number
): { intPart: string; fracPart: string } {
  const digits = intPart + fracPart;
  const point = intPart.length + exponent;

  if (point <= 0) {
    return { intPart: "", fracPart: "0".repeat(-point) + digits };
  }
  if (point >= digits.length) {
    return { intPart: digits + "0".repeat(point - digits.length), fracPart: "" };
  }
  return { intPart: digits.slice(0, point), fracPart: digits.slice(point) };
}

/**
 * Align two BigDecimals to the same scale
 */
export function alignScales(
  a: BigDecimal,
  b: BigDecimal
): [BigDecimal, BigDecimal] {
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
