import { describe, it, expect } from "vitest";
import { BigDecimal, bd, RoundingMode } from "../src";

describe("BigDecimal", () => {
  describe("Construction", () => {
    it("should create from string", () => {
      expect(new BigDecimal("123.45").toString()).toBe("123.45");
      expect(new BigDecimal("0.01").toString()).toBe("0.01");
      expect(new BigDecimal("1000").toString()).toBe("1000.00");
    });

    it("should create from number", () => {
      expect(new BigDecimal(123.45).toString()).toBe("123.45");
      expect(new BigDecimal(100).toString()).toBe("100.00");
      expect(new BigDecimal(0.1).toString()).toBe("0.10");
    });

    it("should create from bigint", () => {
      expect(new BigDecimal(100n).toString()).toBe("100.00");
      expect(new BigDecimal(12345n, 2).toString()).toBe("12345.00");
    });

    it("should handle null/undefined as zero", () => {
      expect(new BigDecimal(null).toString()).toBe("0.00");
      expect(new BigDecimal(undefined).toString()).toBe("0.00");
      expect(new BigDecimal("").toString()).toBe("0.00");
    });

    it("should handle negative values", () => {
      expect(new BigDecimal("-123.45").toString()).toBe("-123.45");
      expect(new BigDecimal(-50.5).toString()).toBe("-50.50");
    });

    it("should handle scientific notation", () => {
      expect(new BigDecimal("1e2").toString()).toBe("100.00");
      expect(new BigDecimal("1.5e3").toString()).toBe("1500.00");
      expect(new BigDecimal("4e-2").toString()).toBe("0.04");
      expect(new BigDecimal("-2.5e1").toString()).toBe("-25.00");
    });

    it("should respect custom precision", () => {
      expect(new BigDecimal("123.456", 3).toString()).toBe("123.456");
      expect(new BigDecimal("100", 4).toString()).toBe("100.0000");
      expect(new BigDecimal("1.5", 0).toString()).toBe("2"); // rounds
    });

    it("should create from another BigDecimal", () => {
      const original = new BigDecimal("123.45");
      const copy = new BigDecimal(original);
      expect(copy.toString()).toBe("123.45");
      expect(copy).not.toBe(original); // different instance
    });
  });

  describe("Shorthand bd() function", () => {
    it("should work like constructor", () => {
      expect(bd("99.99").toString()).toBe("99.99");
      expect(bd(100).toString()).toBe("100.00");
      expect(bd("1.234", 3).toString()).toBe("1.234");
    });
  });

  describe("Addition", () => {
    it("should add two positive numbers", () => {
      expect(bd("10.00").add("5.00").toString()).toBe("15.00");
      expect(bd("0.01").add("0.02").toString()).toBe("0.03");
    });

    it("should add with different types", () => {
      expect(bd("10.00").add(5).toString()).toBe("15.00");
      expect(bd("10.00").add("5").toString()).toBe("15.00");
      expect(bd("10.00").add(bd("5.00")).toString()).toBe("15.00");
    });

    it("should handle negative numbers", () => {
      expect(bd("10.00").add("-3.00").toString()).toBe("7.00");
      expect(bd("-10.00").add("3.00").toString()).toBe("-7.00");
      expect(bd("-10.00").add("-5.00").toString()).toBe("-15.00");
    });

    it("should handle the classic 0.1 + 0.2 problem", () => {
      expect(bd("0.1").add("0.2").toString()).toBe("0.30");
      expect(bd("0.1").add("0.2").eq("0.3")).toBe(true);
    });

    it("should support plus() alias", () => {
      expect(bd("10").plus("5").toString()).toBe("15.00");
    });
  });

  describe("Subtraction", () => {
    it("should subtract two positive numbers", () => {
      expect(bd("10.00").subtract("3.00").toString()).toBe("7.00");
      expect(bd("0.03").subtract("0.01").toString()).toBe("0.02");
    });

    it("should handle results becoming negative", () => {
      expect(bd("5.00").subtract("10.00").toString()).toBe("-5.00");
    });

    it("should handle subtracting negative numbers", () => {
      expect(bd("10.00").subtract("-5.00").toString()).toBe("15.00");
      expect(bd("-10.00").subtract("-5.00").toString()).toBe("-5.00");
    });

    it("should support minus() alias", () => {
      expect(bd("10").minus("3").toString()).toBe("7.00");
    });
  });

  describe("Multiplication", () => {
    it("should multiply two positive numbers", () => {
      expect(bd("10.00").multiply(2).toString()).toBe("20.00");
      expect(bd("3.50").multiply("2.00").toString()).toBe("7.00");
    });

    it("should handle decimal multiplication", () => {
      expect(bd("10.00").multiply("0.5").toString()).toBe("5.00");
      expect(bd("100.00").multiply("0.08").toString()).toBe("8.00");
    });

    it("should handle negative numbers", () => {
      expect(bd("10.00").multiply(-2).toString()).toBe("-20.00");
      expect(bd("-10.00").multiply(-2).toString()).toBe("20.00");
      expect(bd("-10.00").multiply(2).toString()).toBe("-20.00");
    });

    it("should support times() alias", () => {
      expect(bd("5").times(3).toString()).toBe("15.00");
    });
  });

  describe("Division", () => {
    it("should divide two numbers", () => {
      expect(bd("10.00").divide(2).toString()).toBe("5.00");
      expect(bd("100.00").divide("4.00").toString()).toBe("25.00");
    });

    it("should handle decimal results", () => {
      expect(bd("10.00").divide(3).toString()).toBe("3.33");
      expect(bd("1.00").divide(3, 4).toString()).toBe("0.3333");
    });

    it("should handle negative division", () => {
      expect(bd("10.00").divide(-2).toString()).toBe("-5.00");
      expect(bd("-10.00").divide(-2).toString()).toBe("5.00");
    });

    it("should throw on division by zero", () => {
      expect(() => bd("10.00").divide(0)).toThrow("Division by zero");
    });

    it("should support dividedBy() alias", () => {
      expect(bd("10").dividedBy(2).toString()).toBe("5.00");
    });
  });

  describe("Modulo", () => {
    it("should calculate remainder", () => {
      expect(bd("10.00").mod(3).toString()).toBe("1.00");
      expect(bd("10.50").mod("3.00").toString()).toBe("1.50");
    });

    it("should throw on mod by zero", () => {
      expect(() => bd("10").mod(0)).toThrow("Division by zero");
    });
  });

  describe("Chaining", () => {
    it("should support method chaining", () => {
      const result = bd("100.00")
        .subtract("25.50")
        .multiply(2)
        .add("10.00")
        .toString();
      expect(result).toBe("159.00");
    });

    it("should work with complex chains", () => {
      const result = bd("1000")
        .divide(4)
        .subtract(50)
        .multiply("1.1")
        .add(5)
        .toString();
      expect(result).toBe("225.00");
    });
  });

  describe("Comparison", () => {
    it("should compare equal values", () => {
      expect(bd("10.00").equals("10.00")).toBe(true);
      expect(bd("10.00").equals("10")).toBe(true);
      expect(bd("10.00").eq(10)).toBe(true);
    });

    it("should compare less than", () => {
      expect(bd("5.00").lessThan("10.00")).toBe(true);
      expect(bd("10.00").lt("5.00")).toBe(false);
      expect(bd("10.00").lt("10.00")).toBe(false);
    });

    it("should compare less than or equal", () => {
      expect(bd("5.00").lte("10.00")).toBe(true);
      expect(bd("10.00").lte("10.00")).toBe(true);
      expect(bd("10.00").lte("5.00")).toBe(false);
    });

    it("should compare greater than", () => {
      expect(bd("10.00").greaterThan("5.00")).toBe(true);
      expect(bd("5.00").gt("10.00")).toBe(false);
      expect(bd("10.00").gt("10.00")).toBe(false);
    });

    it("should compare greater than or equal", () => {
      expect(bd("10.00").gte("5.00")).toBe(true);
      expect(bd("10.00").gte("10.00")).toBe(true);
      expect(bd("5.00").gte("10.00")).toBe(false);
    });

    it("should handle compareTo", () => {
      expect(bd("10.00").compareTo("5.00")).toBe(1);
      expect(bd("5.00").compareTo("10.00")).toBe(-1);
      expect(bd("10.00").compareTo("10.00")).toBe(0);
    });
  });

  describe("Utility Methods", () => {
    it("should check isZero", () => {
      expect(bd("0.00").isZero()).toBe(true);
      expect(bd(0).isZero()).toBe(true);
      expect(bd("0.01").isZero()).toBe(false);
    });

    it("should check isPositive", () => {
      expect(bd("10.00").isPositive()).toBe(true);
      expect(bd("0.00").isPositive()).toBe(false);
      expect(bd("-10.00").isPositive()).toBe(false);
    });

    it("should check isNegative", () => {
      expect(bd("-10.00").isNegative()).toBe(true);
      expect(bd("0.00").isNegative()).toBe(false);
      expect(bd("10.00").isNegative()).toBe(false);
    });

    it("should get absolute value", () => {
      expect(bd("-10.00").abs().toString()).toBe("10.00");
      expect(bd("10.00").abs().toString()).toBe("10.00");
      expect(bd("0.00").abs().toString()).toBe("0.00");
    });

    it("should negate", () => {
      expect(bd("10.00").negate().toString()).toBe("-10.00");
      expect(bd("-10.00").negate().toString()).toBe("10.00");
      expect(bd("0.00").negate().toString()).toBe("0.00");
    });

    it("should get sign", () => {
      expect(bd("10.00").sign()).toBe(1);
      expect(bd("-10.00").sign()).toBe(-1);
      expect(bd("0.00").sign()).toBe(0);
    });
  });

  describe("Scale/Precision", () => {
    it("should change scale", () => {
      expect(bd("10.00").setScale(4).toString()).toBe("10.0000");
      expect(bd("10.1234", 4).setScale(2).toString()).toBe("10.12");
    });

    it("should round when decreasing scale", () => {
      expect(bd("10.555", 3).setScale(2).toString()).toBe("10.56");
      expect(bd("10.554", 3).setScale(2).toString()).toBe("10.55");
    });

    it("should get precision", () => {
      expect(bd("10.00").getPrecision()).toBe(2);
      expect(bd("10.0000", 4).getPrecision()).toBe(4);
    });

    it("should format with toFixed", () => {
      expect(bd("10.00").toFixed(4)).toBe("10.0000");
      expect(bd("10.5555", 4).toFixed(2)).toBe("10.56");
    });
  });

  describe("Conversion", () => {
    it("should convert to number", () => {
      expect(bd("123.45").toNumber()).toBe(123.45);
      expect(bd("-50.00").toNumber()).toBe(-50);
    });

    it("should convert to integer", () => {
      expect(bd("123.45").toInteger()).toBe(123n);
      expect(bd("-50.99").toInteger()).toBe(-50n);
    });

    it("should support valueOf for implicit conversion", () => {
      const value = bd("10.00");
      expect(+value).toBe(10);
    });
  });

  describe("Formatting & Display", () => {
    it("should prettify with thousand separators", () => {
      expect(bd("1234567.89").toString({ prettify: true })).toBe("1,234,567.89");
      expect(bd("1000000").toString({ prettify: true })).toBe("1,000,000.00");
      expect(bd("999").toString({ prettify: true })).toBe("999.00");
      expect(bd("1000").toString({ prettify: true })).toBe("1,000.00");
    });

    it("should prettify negative numbers", () => {
      expect(bd("-1234567.89").toString({ prettify: true })).toBe("-1,234,567.89");
      expect(bd("-1000000").toString({ prettify: true })).toBe("-1,000,000.00");
    });

    it("should have toFormat shorthand", () => {
      expect(bd("1234567.89").toFormat()).toBe("1,234,567.89");
      expect(bd("9876543210.12").toFormat()).toBe("9,876,543,210.12");
    });

    it("should prettify with toFixed", () => {
      expect(bd("1234567").toFixed(2, { prettify: true })).toBe("1,234,567.00");
      expect(bd("1234567.8999", 4).toFixed(2, { prettify: true })).toBe("1,234,567.90");
    });

    it("should handle scientific notation and display as plain numbers", () => {
      // This is the key feature - converting e-notation to readable numbers
      expect(bd("1e6").toString()).toBe("1000000.00");
      expect(bd("1e9").toString()).toBe("1000000000.00");
      expect(bd("1e12").toString()).toBe("1000000000000.00");
      expect(bd("1e15").toString()).toBe("1000000000000000.00");
      expect(bd("2.5e6").toString()).toBe("2500000.00");
      expect(bd("1.23e10").toString()).toBe("12300000000.00");
    });

    it("should prettify scientific notation numbers", () => {
      expect(bd("1e6").toFormat()).toBe("1,000,000.00");
      expect(bd("1e9").toFormat()).toBe("1,000,000,000.00");
      expect(bd("1e12").toFormat()).toBe("1,000,000,000,000.00");
      expect(bd("2.5e6").toFormat()).toBe("2,500,000.00");
    });

    it("should handle very small scientific notation", () => {
      expect(bd("1e-2").toString()).toBe("0.01");
      expect(bd("5e-4", 4).toString()).toBe("0.0005");
    });
  });

  describe("Static Methods", () => {
    it("should create zero", () => {
      expect(BigDecimal.zero().toString()).toBe("0.00");
      expect(BigDecimal.zero(4).toString()).toBe("0.0000");
    });

    it("should create one", () => {
      expect(BigDecimal.one().toString()).toBe("1.00");
      expect(BigDecimal.one(4).toString()).toBe("1.0000");
    });

    it("should sum multiple values", () => {
      expect(BigDecimal.sum("10", "20", "30").toString()).toBe("60.00");
      expect(BigDecimal.sum(1, 2, 3, 4, 5).toString()).toBe("15.00");
      expect(BigDecimal.sum().toString()).toBe("0.00");
    });

    it("should get max value", () => {
      expect(BigDecimal.max("10", "5", "20", "15").toString()).toBe("20.00");
      expect(BigDecimal.max(-5, -10, -3).toString()).toBe("-3.00");
    });

    it("should get min value", () => {
      expect(BigDecimal.min("10", "5", "20", "15").toString()).toBe("5.00");
      expect(BigDecimal.min(-5, -10, -3).toString()).toBe("-10.00");
    });

    it("should throw on empty max/min", () => {
      expect(() => BigDecimal.max()).toThrow();
      expect(() => BigDecimal.min()).toThrow();
    });
  });

  describe("Rounding Modes", () => {
    it("should support HALF_UP rounding", () => {
      expect(bd("2.5", 1).setScale(0, RoundingMode.HALF_UP).toString()).toBe("3");
      expect(bd("2.4", 1).setScale(0, RoundingMode.HALF_UP).toString()).toBe("2");
    });

    it("should support HALF_DOWN rounding", () => {
      expect(bd("2.5", 1).setScale(0, RoundingMode.HALF_DOWN).toString()).toBe("2");
      expect(bd("2.6", 1).setScale(0, RoundingMode.HALF_DOWN).toString()).toBe("3");
    });

    it("should support CEILING rounding", () => {
      expect(bd("2.1", 1).setScale(0, RoundingMode.CEILING).toString()).toBe("3");
      expect(bd("-2.1", 1).setScale(0, RoundingMode.CEILING).toString()).toBe("-2");
    });

    it("should support FLOOR rounding", () => {
      expect(bd("2.9", 1).setScale(0, RoundingMode.FLOOR).toString()).toBe("2");
      expect(bd("-2.1", 1).setScale(0, RoundingMode.FLOOR).toString()).toBe("-3");
    });

    it("should support DOWN (truncate) rounding", () => {
      expect(bd("2.9", 1).setScale(0, RoundingMode.DOWN).toString()).toBe("2");
      expect(bd("-2.9", 1).setScale(0, RoundingMode.DOWN).toString()).toBe("-2");
    });

    it("should support UP rounding", () => {
      expect(bd("2.1", 1).setScale(0, RoundingMode.UP).toString()).toBe("3");
      expect(bd("-2.1", 1).setScale(0, RoundingMode.UP).toString()).toBe("-3");
    });

    it("should support HALF_EVEN (bankers) rounding", () => {
      expect(bd("2.5", 1).setScale(0, RoundingMode.HALF_EVEN).toString()).toBe("2");
      expect(bd("3.5", 1).setScale(0, RoundingMode.HALF_EVEN).toString()).toBe("4");
      expect(bd("2.6", 1).setScale(0, RoundingMode.HALF_EVEN).toString()).toBe("3");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small decimals", () => {
      expect(bd("0.0001", 4).add("0.0002").toString()).toBe("0.0003");
    });

    it("should handle large numbers", () => {
      const large = bd("999999999999.99");
      expect(large.add("0.01").toString()).toBe("1000000000000.00");
    });

    it("should handle operations with different precisions", () => {
      const a = bd("10.00", 2);
      const b = bd("5.0000", 4);
      expect(a.add(b).toString()).toBe("15.0000");
    });

    it("should maintain immutability", () => {
      const original = bd("100.00");
      const result = original.add("50.00");
      expect(original.toString()).toBe("100.00");
      expect(result.toString()).toBe("150.00");
    });
  });
});
