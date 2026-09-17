# @ozjsey/bigdecimal-string

**Exact decimal numbers you can put on screen** — every digit kept, a scale that stays put, thousand
separators on request, and never scientific notation.

[![npm version](https://img.shields.io/npm/v/@ozjsey/bigdecimal-string.svg)](https://www.npmjs.com/package/@ozjsey/bigdecimal-string)

> **[See it live](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string)** — eleven
> cards, each running the same expression in plain JavaScript and through this library, side by side.

## The problem

```javascript
// Decimal arithmetic is not decimal
console.log(0.1 + 0.2);                   // 0.30000000000000004

// Digits past 2^53 are gone, not rounded
console.log(Number("9007199254740993"));  // 9007199254740992

// And nothing carries a scale: the cent column disappears
console.log(String(9876543210.50));       // "9876543210.5"
```

A double prints in full up to `1e21`, so `1e15` is *not* displayed as `1e+15`; below `1e-6` it
switches to exponential going the other way; and `toLocaleString()` groups `1e21` correctly on any
engine with ICU. What breaks at every size is precision past 2^53, the missing scale, and decimal
arithmetic itself.

## The solution

A value is a string and a scale, held as a `BigInt` — so nothing is ever parsed into a double, and
the scale you created a value with is the scale it prints at.

```typescript
import { bd } from '@ozjsey/bigdecimal-string';

bd("0.1").add("0.2").toString();     // "0.30"    — and it IS 0.30
bd("9876543210.99").toFormat();      // "9,876,543,210.99"
bd("1e21").toFormat();               // "1,000,000,000,000,000,000,000.00"
```

**The scale sticks, and it is never fewer than two places.** `bd("12345678").toFormat()` is
`"12,345,678.00"`, and `bd("1").divide(3)` is `"0.33"` rather than a long quotient. Say what you
want when two is not it — `bd("0.0825", 4)`, or `.setScale(2)` on the way out.

`Intl.NumberFormat` does the grouping half of this perfectly well, and the playground says so on the
card rather than staging a fight. What it cannot do is either half of this:

```javascript
Number("123456789012345678901").toLocaleString();  // "123,456,789,012,345,680,000"
bd("123456789012345678901").toFormat();            // "123,456,789,012,345,678,901.00"
```

A formatter cannot undo a parse. That is the whole argument.

## Install

```bash
npm install @ozjsey/bigdecimal-string
```

Zero dependencies and no peer dependencies. It needs `BigInt`, so ES2020 or newer. Written in
TypeScript, types built in — no `@types` package.

## Usage

### Displaying a number

```typescript
import { bd } from '@ozjsey/bigdecimal-string';

bd("2.5e12").toFormat();     // "2,500,000,000,000.00" — scientific notation in, digits out
bd("1e9").toString();        // "1000000000.00"        — same value, no separators
bd("12345678").toFormat();   // "12,345,678.00"
```

### A checkout

Rates want more places than money does, so compute at the rate's scale and round once, at the end:

```typescript
const subtotal = bd("999.99");
const taxRate = bd("0.0825", 4);                     // 8.25%
const tax = subtotal.multiply(taxRate).setScale(2);  // round to currency, once
const total = subtotal.add(tax);

`${tax.toFormat()} / ${total.toFormat()}`;           // "82.50 / 1,082.49"
```

### Reading a number a human typed

Grouped input is **validated, never stripped**, and the same separator pair is used for reading and
for writing — which is what makes the round trip hold:

```typescript
import { BigDecimal, bd } from '@ozjsey/bigdecimal-string';

bd("1,234.56").toString();                                // "1234.56"
bd("1,23");                                               // SyntaxError — see below
bd("1.234,56", { decimal: ",", group: "." }).toString();  // "1234.56"
bd("1234567.89").toFormat({ group: " " });                // "1 234 567.89"

BigDecimal.setConfig({ decimal: ",", group: "." });       // app-wide; a per-call config still wins
```

Refusing `"1,23"` is deliberate: under the default standard `,` groups thousands and `1,23` is not
a valid group, and the only thing worse than throwing would be reading a European `1,23` as `123`.
Say which you mean — `bd("1,23", { decimal: ",", group: "." })` is 1.23.

## Everything else

Both columns on every card are computed by your browser, because `"0.30"` means nothing until it
sits beside `0.30000000000000004`. Start at
[**the REPL**](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/repl) — type any
two operands, pick an operation, read both answers. Then
[where scientific notation actually starts](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/scientific-notation) ·
[past 2^53](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/precision-loss) ·
[all seven rounding modes](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/rounding-modes) ·
[the formatting surface](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/formatting) ·
[comparisons](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/comparisons) ·
[chainable and immutable](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/chainable-immutable) ·
[static and utility methods](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/static-and-utility) ·
[the checkout](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/currency) ·
[creating instances, and the separator standard](https://ozjsey.github.io/npm-portfolio-playground/#bigdecimal-string/parsing)

`ARCHITECTURE.md` has the module map. [`CHANGELOG.md`](./CHANGELOG.md) is the version history.

## License

MIT © ozJSey
