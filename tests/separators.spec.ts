/**
 * BD-1 part B — the separator standard.
 *
 * Two rules are on trial here and both are load-bearing:
 *
 *  1. `.` is the decimal separator and `,` the group separator by default, and
 *     both are configurable per call and app-wide, so `toFormat()` output can
 *     be read straight back in.
 *  2. Grouping is VALIDATED, never stripped. Stripping commas would read the
 *     European habit "1,23" as 123 — the same silent corruption this package
 *     exists to avoid. Every invalid or ambiguous row below asserts a THROW,
 *     not a value.
 */
import { describe, it, expect, afterEach } from "vitest";
import { BigDecimal, bd } from "../src";
import type { BigDecimalConfig } from "../src";

const US: BigDecimalConfig = { decimal: ".", group: "," };
const EU: BigDecimalConfig = { decimal: ",", group: "." };
const SPACED: BigDecimalConfig = { decimal: ",", group: " " };

afterEach(() => {
  BigDecimal.setConfig(US);
});

describe("Separator standard", () => {
  describe("defaults", () => {
    it("defaults to '.' decimal and ',' grouping", () => {
      expect(BigDecimal.getConfig()).toEqual({ decimal: ".", group: "," });
    });
  });

  describe("default dialect — decimal '.', group ','", () => {
    it("plain: reads an ungrouped number", () => {
      expect(bd("1234.56").toString()).toBe("1234.56");
      expect(bd("1234567").toString()).toBe("1234567.00");
    });

    it("grouped-valid: reads a correctly grouped number", () => {
      expect(bd("1,234.56").toString()).toBe("1234.56");
      expect(bd("1,234,567.89").toString()).toBe("1234567.89");
      expect(bd("12,345").toString()).toBe("12345.00");
      expect(bd("123,456,789.5").toString()).toBe("123456789.50");
    });

    it("grouped-invalid: throws instead of inventing a number", () => {
      expect(() => bd("12,34.5")).toThrow(SyntaxError);
      expect(() => bd("1,2345.6")).toThrow(SyntaxError);
      expect(() => bd("1,234,56.7")).toThrow(SyntaxError);
      expect(() => bd("12,34.5")).toThrow(/grouped correctly/);
    });

    it("ambiguous: '1,23' throws and the message names BOTH readings", () => {
      expect(() => bd("1,23")).toThrow(SyntaxError);
      let message = "";
      try {
        bd("1,23");
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain("ambiguous");
      expect(message).toContain("1.23");
      expect(message).toContain("malformed grouping");
    });

    it("multi-sep: two decimal separators throw", () => {
      expect(() => bd("1.2.3")).toThrow(SyntaxError);
      expect(() => bd("1.2.3")).toThrow(/decimal separators/);
    });

    it("multi-sep: a group separator AFTER the decimal separator throws", () => {
      expect(() => bd("1.234,56")).toThrow(SyntaxError);
      expect(() => bd("1.234,56")).toThrow(/ambiguous/);
    });
  });

  describe("flipped dialect — decimal ',', group '.' (per call)", () => {
    it("plain", () => {
      expect(bd("1234,56", EU).toString()).toBe("1234.56");
    });

    it("grouped-valid", () => {
      expect(bd("1.234,56", EU).toString()).toBe("1234.56");
      expect(bd("1.234.567,89", EU).toString()).toBe("1234567.89");
      expect(bd("12.345", EU).toString()).toBe("12345.00");
    });

    it("grouped-invalid", () => {
      expect(() => bd("12.34,5", EU)).toThrow(SyntaxError);
      expect(() => bd("1.2345,6", EU)).toThrow(SyntaxError);
    });

    it("ambiguous: '1.23' throws and names both readings", () => {
      expect(() => bd("1.23", EU)).toThrow(/ambiguous/);
      let message = "";
      try {
        bd("1.23", EU);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain("1.23");
      expect(message).toContain("malformed grouping");
    });

    it("multi-sep", () => {
      expect(() => bd("1,2,3", EU)).toThrow(/decimal separators/);
      expect(() => bd("1,234.56", EU)).toThrow(/ambiguous/);
    });
  });

  describe("configuration levels", () => {
    it("setConfig changes the app-wide default for reading AND writing", () => {
      BigDecimal.setConfig(EU);
      expect(BigDecimal.getConfig()).toEqual({ decimal: ",", group: "." });
      expect(bd("1.234,56").toString()).toBe("1234,56");
      expect(bd("1234567.89", US).toFormat()).toBe("1.234.567,89");
    });

    it("a per-call config wins over the app-wide one", () => {
      BigDecimal.setConfig(EU);
      expect(bd("1,234.56", US).toString(US)).toBe("1234.56");
    });

    it("supports a space as the group separator", () => {
      expect(bd("1 234,56", SPACED).toString({ decimal: "." })).toBe("1234.56");
      expect(bd("1234567.89").toFormat(SPACED)).toBe("1 234 567,89");
    });

    it("group: '' means no grouping is accepted on input or emitted on output", () => {
      expect(() => bd("1,234", { group: "" })).toThrow(SyntaxError);
      expect(bd("1234567.89").toFormat({ group: "" })).toBe("1234567.89");
    });

    it("rejects a config whose decimal and group are the same symbol", () => {
      expect(() => bd("1", { decimal: ",", group: "," })).toThrow(RangeError);
      expect(() => BigDecimal.setConfig({ decimal: ",", group: "," })).toThrow(RangeError);
    });

    it("reads a JavaScript number canonically, whatever the app config says", () => {
      BigDecimal.setConfig(EU);
      expect(bd(1234.56).equals(bd("1234,56"))).toBe(true);
    });
  });

  describe("round trip — the library can read its own output back", () => {
    const VALUES = [
      "0",
      "1",
      "999",
      "1000",
      "1234.56",
      "1234567.89",
      "-9876543210.5",
      "0.00000001",
      "1e21",
    ];

    for (const config of [US, EU, SPACED, { decimal: ".", group: "" } as BigDecimalConfig]) {
      it(`bd(x.toFormat(cfg), cfg).equals(x) for ${JSON.stringify(config)}`, () => {
        for (const value of VALUES) {
          const x = bd(value);
          const formatted = x.toFormat(config);
          expect(bd(formatted, config).equals(x)).toBe(true);
        }
      });
    }

    it("round-trips through the app-wide config with no per-call argument", () => {
      for (const config of [US, EU]) {
        BigDecimal.setConfig(config);
        const x = bd("1234567.89", US);
        expect(bd(x.toFormat()).equals(x)).toBe(true);
      }
    });
  });
});
