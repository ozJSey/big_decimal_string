# @ozjsey/bigdecimal-string

> **[Live demo and documentation](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string)** — eleven cards, each running the same expression in plain JavaScript and through this library, side by side.
>
> Start at [**the REPL**](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/repl): type any two operands, pick an operation, and read both
> answers. Then [the 0.1 + 0.2 family](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/precise-decimals) ·
> [where scientific notation actually starts](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/scientific-notation) ·
> [past 2^53](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/precision-loss) · [all seven rounding modes](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/rounding-modes) ·
> [the checkout](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/currency)


[![npm version](https://img.shields.io/npm/v/@ozjsey/bigdecimal-string.svg)](https://www.npmjs.com/package/@ozjsey/bigdecimal-string)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Native-blue.svg)](https://www.typescriptlang.org/)

**Exact decimal numbers you can put on screen.** Every digit kept, a scale that stays put, thousand separators on request, and never scientific notation — `bd("1e21").toFormat()` is `"1,000,000,000,000,000,000,000.00"` and `bd("0.1").add("0.2")` is `"0.30"`.

**Written in TypeScript. Full type safety. No `@types` package needed.**

**GitHub:** [https://github.com/ozJSey/big_decimal_string](https://github.com/ozJSey/big_decimal_string)

## The Problem

```javascript
// Decimal arithmetic is not decimal
const price = 0.1 + 0.2;
console.log(price);                       // 0.30000000000000004

// Digits past 2^53 are gone, not rounded
console.log(Number("9007199254740993"));  // 9007199254740992

// Scientific notation, in both directions
console.log(String(1e21));                // "1e+21"
console.log(String(0.00000001));          // "1e-8"

// And nothing carries a scale: the cent column disappears
console.log(String(9876543210.50));       // "9876543210.5"
```

**Where the thresholds actually are** — these are worth knowing, because two of them used to be
misstated here. A double prints in full up to `1e21`, so `1e15` is *not* displayed as `1e+15`;
below `1e-6` it switches to exponential going the other way; and `toLocaleString()` groups
`1e21` correctly on any engine with ICU, which is every browser. What breaks at every size is
precision past 2^53, the missing scale, and decimal arithmetic itself. Each of those is
[demonstrated live](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string) with the
plain-JavaScript answer computed in the page rather than quoted.

## The Solution

```typescript
import { bd } from '@ozjsey/bigdecimal-string';

// Large numbers become readable
bd("1e15").toString();              // "1000000000000000.00"
bd("1e15").toFormat();              // "1,000,000,000,000,000.00" ✓

// Precise decimal arithmetic (no more 0.30000000000000004)
bd("0.1").add("0.2").toString();    // "0.30" ✓

// Perfect for displaying prices, quantities, financial data
bd("9876543210.99").toFormat();     // "9,876,543,210.99" ✓
```

## Features

- **Human-readable large numbers** - Never exponential, at any magnitude, and exact past 2^53 where `Number` is not
- **Prettify with commas** - `toFormat()` adds thousand separators automatically
- **Precise decimals** - Solves the `0.1 + 0.2` problem using BigInt internally
- **Native TypeScript** - Written in TypeScript, full type inference, no `@types` needed
- **Chainable API** - Fluent method chaining for calculations
- **Zero dependencies** - Pure TypeScript, ~6KB minified
- **Immutable** - All operations return new instances

## Installation

```bash
npm install @ozjsey/bigdecimal-string
```

## Usage Examples

### Displaying Large Numbers

The primary use case - converting scientific notation or large numbers into displayable strings:

```typescript
import { bd } from '@ozjsey/bigdecimal-string';

// API returns scientific notation? No problem.
const apiValue = "2.5e12";  // From server
bd(apiValue).toFormat();    // "2,500,000,000,000.00"

// Large inventory counts
bd("1000000000").toFormat();  // "1,000,000,000.00"

// Without prettify (raw string)
bd("1e9").toString();        // "1000000000.00"
```

### E-Commerce / Financial Display

```typescript
// Product prices
const price = bd("1299.99");
const quantity = bd(1000000);
const total = price.multiply(quantity);

console.log(`Total: $${total.toFormat()}`);  // "Total: $1,299,990,000.00"

// Tax calculations (use precision 4 for rates like 8.25%, then round to 2 for currency)
const subtotal = bd("999.99");
const taxRate = bd("0.0825", 4);  // 8.25% - specify precision for small decimals
const tax = subtotal.multiply(taxRate).setScale(2);  // Round to 2 decimals
const grandTotal = subtotal.add(tax);

console.log(`Tax: $${tax.toFormat()}`);         // "Tax: $82.50"
console.log(`Total: $${grandTotal.toFormat()}`); // "Total: $1,082.49"
```

### Dashboard / Analytics

```typescript
// User counts, revenue, metrics
const dailyActiveUsers = bd("12345678");
const revenue = bd("9876543210.50");
const avgSessionTime = bd("245.7");

console.log(`DAU: ${dailyActiveUsers.toFormat()}`);  // "DAU: 12,345,678.00"
console.log(`Revenue: $${revenue.toFormat()}`);      // "Revenue: $9,876,543,210.50"
```

### Precise Calculations (Bonus Feature)

While display formatting is the main purpose, you also get precise decimal math:

```typescript
// The classic floating-point problem - SOLVED
bd("0.1").add("0.2").eq("0.3");     // true ✓ (JS would give false)

// Currency calculations without rounding errors
bd("19.99")
  .multiply(3)
  .subtract("5.00")
  .add("2.50")
  .toString();  // "57.47" (precise)
```

## API Reference

### Creating Instances

> [Creating instances — and the comma that is not stripped](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/parsing) runs every form below,
> including the grouped-string trap in the note that follows.

```typescript
// From string (recommended)
bd("123.45")
bd("1e15")           // Scientific notation OK

// From number
bd(123.45)
bd(1000000000000000)

// With custom precision
bd("123.456", 3)     // 3 decimal places
bd("100", 4)         // "100.0000"
```

> **Do not feed formatted output back in.** `bd("1,234.56")` returns `"1.234"` — the parser splits
> on the comma and keeps the first two segments, so a grouped string becomes a different number
> without throwing. `toFormat()` is an output step only; keep the ungrouped string as the value.
> Tracked in `CHANGELOG.md` under open defects.

### Formatting Methods

> [`toString` / `prettify` / `toFormat` / `toFixed`](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/formatting), with `Intl` doing its best in
> the next column — they agree at dashboard sizes, and the card says where they stop agreeing.

```typescript
const value = bd("1234567.89");

// Basic string (no formatting)
value.toString();                    // "1234567.89"

// With thousand separators
value.toString({ prettify: true });  // "1,234,567.89"

// Shorthand for prettify
value.toFormat();                    // "1,234,567.89"

// Fixed decimal places + prettify
value.toFixed(4);                              // "1234567.8900"
value.toFixed(2, { prettify: true });          // "1,234,567.89"
```

### Arithmetic (Chainable)

```typescript
bd("100.00").add("50.00");           // "150.00"
bd("100.00").subtract("30.00");      // "70.00"
bd("100.00").multiply(2);            // "200.00"
bd("100.00").divide(3);              // "33.33"
bd("10.00").mod(3);                  // "1.00"

// Chaining
bd("1000")
  .subtract("100")
  .multiply("1.5")
  .divide(2)
  .add("50")
  .toFormat();  // "725.00"
```

### Comparisons

```typescript
bd("10").gt("5");    // true  (greater than)
bd("10").gte("10");  // true  (greater than or equal)
bd("5").lt("10");    // true  (less than)
bd("5").lte("5");    // true  (less than or equal)
bd("10").eq("10");   // true  (equals)
```

### Utility Methods

```typescript
bd("-50").abs();        // "50.00"
bd("50").negate();      // "-50.00"
bd("0").isZero();       // true
bd("10").isPositive();  // true
bd("-10").isNegative(); // true
```

### Static Methods

```typescript
BigDecimal.sum("10", "20", "30");     // "60.00"
BigDecimal.max("5", "10", "3");       // "10.00"
BigDecimal.min("5", "10", "3");       // "3.00"
BigDecimal.zero();                    // "0.00"
BigDecimal.one();                     // "1.00"
```

## Real-World Examples

### Cryptocurrency Display

```typescript
// Crypto amounts often come in scientific notation
const btcBalance = bd("0.00000001");  // 1 satoshi
const ethBalance = bd("1.5e18");      // Wei to display

console.log(`BTC: ${btcBalance.toString()}`);     // "0.00000001"
console.log(`Wei: ${ethBalance.toFormat()}`);     // "1,500,000,000,000,000,000.00"
```

### Stock Market Data

```typescript
const marketCap = bd("2.5e12");       // $2.5 trillion
const volume = bd("987654321");
const priceChange = bd("-2.34");      // Already as percentage

console.log(`Market Cap: $${marketCap.toFormat()}`);  // "$2,500,000,000,000.00"
console.log(`Volume: ${volume.toFormat()}`);          // "987,654,321.00"
console.log(`Change: ${priceChange.toString()}%`);    // "-2.34%"
```

### Shopping Cart

```typescript
const items = [
  { name: "Laptop", price: "1299.99", qty: 2 },
  { name: "Mouse", price: "49.99", qty: 3 },
  { name: "Keyboard", price: "149.99", qty: 1 },
];

const subtotal = BigDecimal.sum(
  ...items.map(item => bd(item.price).multiply(item.qty))
);
const tax = subtotal.multiply("0.08");  // 8% tax
const total = subtotal.add(tax);

console.log(`Subtotal: $${subtotal.toFormat()}`);  // "$2,899.94"
console.log(`Tax: $${tax.toFormat()}`);            // "$232.00"
console.log(`Total: $${total.toFormat()}`);        // "$3,131.94"
```

## TypeScript Native

Unlike alternatives that require separate `@types` packages or have incomplete type definitions, **bigdecimal-string is written in TypeScript from the ground up**.

```typescript
import { BigDecimal, bd, RoundingMode } from '@ozjsey/bigdecimal-string';
import type { BigDecimalInput } from '@ozjsey/bigdecimal-string';

// Full type inference - no 'any' types
function formatPrice(amount: BigDecimalInput): string {
  return bd(amount).toFormat();
}

// Generics and type safety work out of the box
const prices: BigDecimal[] = [bd("10.00"), bd("20.00")];
const total = BigDecimal.sum(...prices);  // TypeScript knows this is BigDecimal

// RoundingMode enum is properly typed
const rounded = bd("10.555").setScale(2, RoundingMode.HALF_UP);
```

**Comparison with alternatives:**

| Library | TypeScript | Types Source |
|---------|-----------|--------------|
| bigdecimal-string | Native | Built-in ✓ |
| big.js | JS | @types/big.js |
| decimal.js | JS | @types/decimal.js |
| bignumber.js | JS | @types/bignumber.js |

## Why Not Just Use `toLocaleString()`?

> Both limitations below, measured live: [past 2^53, where `Intl` formats the number it was
> given](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/precision-loss), and
> [where scientific notation actually starts](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/scientific-notation).

For a value a double can hold, at a size a human reads, **you often can** — and the playground says
so on the card rather than staging a fight. `Intl.NumberFormat` groups `1e21` perfectly well on any
engine with ICU. Two things it cannot do:

```javascript
// 1. It formats the number it was handed. The digits were lost at parse time.
Number("123456789012345678901").toLocaleString();  // "123,456,789,012,345,680,000"
bd("123456789012345678901").toFormat();            // "123,456,789,012,345,678,901.00" ✓

// 2. It has no scale of its own, so a value keeps whatever precision it drifted to.
(0.1 + 0.2).toLocaleString();                      // "0.3" — rounded for display, still 0.30000000000000004
bd("0.1").add("0.2").toFormat();                   // "0.30" — and it IS 0.30
```

A formatter cannot undo a parse. That is the whole argument.

## License

MIT
