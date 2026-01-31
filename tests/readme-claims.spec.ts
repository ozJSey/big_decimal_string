/**
 * This test file verifies every code example in the README
 * to ensure all claims are accurate.
 */
import { describe, it, expect } from "vitest";
import { BigDecimal, bd, BigDecimalInput, RoundingMode } from "../src";

describe("README Claims Verification", () => {
  describe("The Problem / The Solution section", () => {
    it("should solve the 0.1 + 0.2 problem", () => {
      // README claims: bd('0.1').add('0.2').eq('0.3');  // true ✓
      expect(bd("0.1").add("0.2").eq("0.3")).toBe(true);
    });

    it("should display large numbers without scientific notation", () => {
      // README claims: bd("1e15").toString();  // "1000000000000000.00"
      expect(bd("1e15").toString()).toBe("1000000000000000.00");
    });

    it("should prettify large numbers", () => {
      // README claims: bd("1e15").toFormat();  // "1,000,000,000,000,000.00" ✓
      expect(bd("1e15").toFormat()).toBe("1,000,000,000,000,000.00");
    });

    it("should format prices", () => {
      // README claims: bd("9876543210.99").toFormat();  // "9,876,543,210.99" ✓
      expect(bd("9876543210.99").toFormat()).toBe("9,876,543,210.99");
    });
  });

  describe("Usage Examples - Displaying Large Numbers", () => {
    it("should handle API scientific notation values", () => {
      const apiValue = "2.5e12";
      // README claims: bd(apiValue).toFormat();  // "2,500,000,000,000.00"
      expect(bd(apiValue).toFormat()).toBe("2,500,000,000,000.00");
    });

    it("should format large inventory counts", () => {
      // README claims: bd("1000000000").toFormat();  // "1,000,000,000.00"
      expect(bd("1000000000").toFormat()).toBe("1,000,000,000.00");
    });

    it("should work without prettify", () => {
      // README claims: bd("1e9").toString();  // "1000000000.00"
      expect(bd("1e9").toString()).toBe("1000000000.00");
    });
  });

  describe("Usage Examples - E-Commerce / Financial Display", () => {
    it("should calculate product totals", () => {
      const price = bd("1299.99");
      const quantity = bd(1000000);
      const total = price.multiply(quantity);

      // README claims: Total: $1,299,990,000.00
      expect(total.toFormat()).toBe("1,299,990,000.00");
    });

    it("should calculate tax correctly", () => {
      const subtotal = bd("999.99");
      const taxRate = bd("0.0825", 4);  // 8.25% - specify precision for small decimals
      const tax = subtotal.multiply(taxRate).setScale(2);  // Round to 2 decimals
      const grandTotal = subtotal.add(tax);

      // README claims: Tax: $82.50, Total: $1,082.49
      expect(tax.toFormat()).toBe("82.50");
      expect(grandTotal.toFormat()).toBe("1,082.49");
    });
  });

  describe("Usage Examples - Dashboard / Analytics", () => {
    it("should format user counts and revenue", () => {
      const dailyActiveUsers = bd("12345678");
      const revenue = bd("9876543210.50");

      // README claims
      expect(dailyActiveUsers.toFormat()).toBe("12,345,678.00");
      expect(revenue.toFormat()).toBe("9,876,543,210.50");
    });
  });

  describe("Usage Examples - Precise Calculations", () => {
    it("should chain operations precisely", () => {
      // README claims: "57.47" (precise)
      const result = bd("19.99")
        .multiply(3)
        .subtract("5.00")
        .add("2.50")
        .toString();
      expect(result).toBe("57.47");
    });
  });

  describe("API Reference - Creating Instances", () => {
    it("should create from string", () => {
      expect(bd("123.45").toString()).toBe("123.45");
    });

    it("should handle scientific notation", () => {
      expect(bd("1e15").toString()).toBe("1000000000000000.00");
    });

    it("should create from number", () => {
      expect(bd(123.45).toString()).toBe("123.45");
      expect(bd(1000000000000000).toString()).toBe("1000000000000000.00");
    });

    it("should respect custom precision", () => {
      expect(bd("123.456", 3).toString()).toBe("123.456");
      expect(bd("100", 4).toString()).toBe("100.0000");
    });
  });

  describe("API Reference - Formatting Methods", () => {
    it("should format with toString options", () => {
      const value = bd("1234567.89");

      // README claims
      expect(value.toString()).toBe("1234567.89");
      expect(value.toString({ prettify: true })).toBe("1,234,567.89");
      expect(value.toFormat()).toBe("1,234,567.89");
    });

    it("should format with toFixed", () => {
      const value = bd("1234567.89");

      // README claims
      expect(value.toFixed(4)).toBe("1234567.8900");
      expect(value.toFixed(2, { prettify: true })).toBe("1,234,567.89");
    });
  });

  describe("API Reference - Arithmetic (Chainable)", () => {
    it("should perform addition", () => {
      expect(bd("100.00").add("50.00").toString()).toBe("150.00");
    });

    it("should perform subtraction", () => {
      expect(bd("100.00").subtract("30.00").toString()).toBe("70.00");
    });

    it("should perform multiplication", () => {
      expect(bd("100.00").multiply(2).toString()).toBe("200.00");
    });

    it("should perform division", () => {
      expect(bd("100.00").divide(4).toString()).toBe("25.00");
    });

    it("should perform modulo", () => {
      expect(bd("10.00").mod(3).toString()).toBe("1.00");
    });

    it("should chain operations", () => {
      // README claims this chain results in "725.00"
      const result = bd("1000")
        .subtract("100")
        .multiply("1.5")
        .divide(2)
        .add("50")
        .toFormat();
      expect(result).toBe("725.00");
    });
  });

  describe("API Reference - Comparisons", () => {
    it("should compare gt (greater than)", () => {
      expect(bd("10").gt("5")).toBe(true);
    });

    it("should compare gte (greater than or equal)", () => {
      expect(bd("10").gte("10")).toBe(true);
    });

    it("should compare lt (less than)", () => {
      expect(bd("5").lt("10")).toBe(true);
    });

    it("should compare lte (less than or equal)", () => {
      expect(bd("5").lte("5")).toBe(true);
    });

    it("should compare eq (equals)", () => {
      expect(bd("10").eq("10")).toBe(true);
    });
  });

  describe("API Reference - Utility Methods", () => {
    it("should calculate abs", () => {
      expect(bd("-50").abs().toString()).toBe("50.00");
    });

    it("should negate", () => {
      expect(bd("50").negate().toString()).toBe("-50.00");
    });

    it("should check isZero", () => {
      expect(bd("0").isZero()).toBe(true);
    });

    it("should check isPositive", () => {
      expect(bd("10").isPositive()).toBe(true);
    });

    it("should check isNegative", () => {
      expect(bd("-10").isNegative()).toBe(true);
    });
  });

  describe("API Reference - Static Methods", () => {
    it("should sum values", () => {
      expect(BigDecimal.sum("10", "20", "30").toString()).toBe("60.00");
    });

    it("should find max", () => {
      expect(BigDecimal.max("5", "10", "3").toString()).toBe("10.00");
    });

    it("should find min", () => {
      expect(BigDecimal.min("5", "10", "3").toString()).toBe("3.00");
    });

    it("should create zero", () => {
      expect(BigDecimal.zero().toString()).toBe("0.00");
    });

    it("should create one", () => {
      expect(BigDecimal.one().toString()).toBe("1.00");
    });
  });

  describe("Real-World Examples - Cryptocurrency Display", () => {
    it("should handle small crypto amounts", () => {
      const btcBalance = bd("0.00000001"); // 1 satoshi
      expect(btcBalance.toString()).toBe("0.00000001");
    });

    it("should handle large wei amounts", () => {
      const ethBalance = bd("1.5e18");
      expect(ethBalance.toFormat()).toBe("1,500,000,000,000,000,000.00");
    });
  });

  describe("Real-World Examples - Stock Market Data", () => {
    it("should format market cap", () => {
      const marketCap = bd("2.5e12");
      expect(marketCap.toFormat()).toBe("2,500,000,000,000.00");
    });

    it("should format volume", () => {
      const volume = bd("987654321");
      expect(volume.toFormat()).toBe("987,654,321.00");
    });

    it("should show percentage change", () => {
      const priceChange = bd("-2.34");  // Already as percentage
      expect(priceChange.toString()).toBe("-2.34");
    });
  });

  describe("Real-World Examples - Shopping Cart", () => {
    it("should calculate shopping cart totals", () => {
      const items = [
        { name: "Laptop", price: "1299.99", qty: 2 },
        { name: "Mouse", price: "49.99", qty: 3 },
        { name: "Keyboard", price: "149.99", qty: 1 },
      ];

      const subtotal = BigDecimal.sum(
        ...items.map((item) => bd(item.price).multiply(item.qty))
      );
      const tax = subtotal.multiply("0.08");  // 8% tax
      const total = subtotal.add(tax);

      // README claims: Subtotal: $2,899.94, Tax: $232.00, Total: $3,131.94
      expect(subtotal.toFormat()).toBe("2,899.94");
      expect(tax.toFormat()).toBe("232.00");
      expect(total.toFormat()).toBe("3,131.94");
    });
  });

  describe("TypeScript Native section", () => {
    it("should support BigDecimalInput type", () => {
      function formatPrice(amount: BigDecimalInput): string {
        return bd(amount).toFormat();
      }

      expect(formatPrice("100.00")).toBe("100.00");
      expect(formatPrice(100)).toBe("100.00");
    });

    it("should work with BigDecimal arrays", () => {
      const prices: BigDecimal[] = [bd("10.00"), bd("20.00")];
      const total = BigDecimal.sum(...prices);
      expect(total.toString()).toBe("30.00");
    });

    it("should support RoundingMode enum", () => {
      const rounded = bd("10.555", 3).setScale(2, RoundingMode.HALF_UP);
      expect(rounded.toString()).toBe("10.56");
    });
  });

  describe("Why Not Just Use toLocaleString section", () => {
    it("should handle 1e21 which toLocaleString cannot", () => {
      // JavaScript's toLocaleString fails: (1e21).toLocaleString() returns "1e+21"
      // README claims: bd("1e21").toFormat(); // "1,000,000,000,000,000,000,000.00" ✓
      expect(bd("1e21").toFormat()).toBe("1,000,000,000,000,000,000,000.00");
    });
  });
});
