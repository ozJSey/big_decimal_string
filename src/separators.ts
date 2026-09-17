/**
 * separators.ts — the one place that decides what "." and "," mean.
 *
 * Both directions live here: reading a written number (`splitDecimalString`)
 * and writing one (`groupIntegerDigits`). They read the same config, and that
 * is what makes `bd(x.toFormat(cfg), cfg)` equal `x`. Before 1.2.1 the parser
 * split on /[.,]/ and kept the first two segments while `toFormat` hard-coded
 * a comma, so the library could not read its own output back: `bd("1,234.56")`
 * answered 1.234.
 *
 * Grouping is VALIDATED, never stripped. Stripping commas would read the
 * European habit "1,23" as 123 — the same silent corruption in a different
 * coat — so anything that is not unambiguously grouped throws instead.
 */

import type { BigDecimalConfig } from "./types";

/** The standard this package ships: `1,234.56`. */
const DEFAULT_SEPARATORS: Required<BigDecimalConfig> = { decimal: ".", group: "," };

/**
 * What `Number.prototype.toString()` emits, whatever the app config says.
 * A JavaScript number has one spelling and the language picked it, so numeric
 * input is always read with this pair rather than the configured one.
 */
export const CANONICAL_SEPARATORS: Required<BigDecimalConfig> = { decimal: ".", group: "" };

let appSeparators: Required<BigDecimalConfig> = { ...DEFAULT_SEPARATORS };

/** Install the app-wide default pair. */
export function setSeparators(config: BigDecimalConfig): void {
  appSeparators = resolveSeparators(config);
}

/** Read the app-wide default pair. */
export function getSeparators(): Required<BigDecimalConfig> {
  return { ...appSeparators };
}

/**
 * Merge a per-call config over the app-wide one, field by field.
 *
 * Supplying only half of a swapped pair (`{ decimal: "," }` while the app
 * still groups with ",") is rejected rather than guessed at: the two
 * characters have to differ for either of them to mean anything.
 */
export function resolveSeparators(config?: BigDecimalConfig): Required<BigDecimalConfig> {
  const decimal = config?.decimal ?? appSeparators.decimal;
  const group = config?.group ?? appSeparators.group;

  if (group !== "" && group === decimal) {
    throw new RangeError(
      `Separator config is unusable: decimal and group are both ${quote(decimal)}. ` +
        `Pass both halves of the pair, e.g. { decimal: ${quote(decimal)}, group: ${quote(decimal === "." ? "," : ".")} }.`
    );
  }

  return { decimal, group };
}

/**
 * Split a written, sign-free, exponent-free number into its digit strings.
 * Throws a `SyntaxError` naming what was wrong rather than returning a number
 * the caller did not write.
 */
export function splitDecimalString(
  input: string,
  { decimal, group }: Required<BigDecimalConfig>
): { intPart: string; fracPart: string } {
  const decimalCount = occurrences(input, decimal);
  if (decimalCount > 1) {
    throw new SyntaxError(
      `${quote(input)} has ${decimalCount} decimal separators (${quote(decimal)}). A number has at most one.`
    );
  }

  const cut = decimalCount === 1 ? input.indexOf(decimal) : -1;
  const fracPart = cut === -1 ? "" : input.slice(cut + 1);
  let intPart = cut === -1 ? input : input.slice(0, cut);

  if (group !== "" && fracPart.includes(group)) {
    throw new SyntaxError(
      `${quote(input)} is ambiguous: the group separator ${quote(group)} appears after the decimal separator ` +
        `${quote(decimal)}. Read the other way round — { decimal: ${quote(group)}, group: ${quote(decimal)} } — it is a ` +
        `valid number; pass that config if that is what you meant.`
    );
  }

  if (group !== "" && intPart.includes(group)) {
    intPart = ungroup(input, intPart, group, decimal, decimalCount === 1);
  }

  if (!DIGITS_ONLY.test(intPart) || !DIGITS_ONLY.test(fracPart)) {
    throw new SyntaxError(
      `${quote(input)} is not a number: expected digits, at most one ${quote(decimal)}, and ` +
        `${group === "" ? "no group separator" : `${quote(group)} between groups of three`}.`
    );
  }

  if (intPart === "" && fracPart === "") {
    throw new SyntaxError(`${quote(input)} is not a number: it has no digits.`);
  }

  return { intPart, fracPart };
}

/** Write an integer digit string back out with group separators. */
export function groupIntegerDigits(intDigits: string, group: string): string {
  if (group === "") {
    return intDigits;
  }
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, group);
}

const DIGITS_ONLY = /^\d*$/;

/**
 * Accept only the two shapes that cannot mean anything else: no separators at
 * all, or a first group of 1-3 digits followed by groups of exactly 3.
 */
function ungroup(
  input: string,
  intPart: string,
  group: string,
  decimal: string,
  hasDecimal: boolean
): string {
  const groups = intPart.split(group);
  const wellFormed =
    /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((part) => /^\d{3}$/.test(part));

  if (wellFormed) {
    return groups.join("");
  }

  const readsAsDecimal =
    !hasDecimal && groups.length === 2 && /^\d+$/.test(groups[0]) && /^\d+$/.test(groups[1]);

  if (readsAsDecimal) {
    throw new SyntaxError(
      `${quote(input)} is ambiguous: ${groups[0]}.${groups[1]} (${quote(group)} read as a decimal separator) or ` +
        `malformed grouping (after a first group of 1-3 digits every group must be exactly 3). Say which you mean — ` +
        `bd(${quote(input)}, { decimal: ${quote(group)}, group: ${quote(decimal)} }) — or drop the separator.`
    );
  }

  throw new SyntaxError(
    `${quote(input)} is not grouped correctly: ${quote(group)} must split the integer part into a first group of ` +
      `1-3 digits followed by groups of exactly 3, as in ${quote(`1${group}234${group}567`)}.`
  );
}

function occurrences(input: string, separator: string): number {
  return input.split(separator).length - 1;
}

function quote(value: string): string {
  return JSON.stringify(value);
}
