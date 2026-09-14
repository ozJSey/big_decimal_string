import { defineConfig } from "tsup";

/**
 * Dual format, ESM first.
 *
 * 1.1.0 shipped `format: ["cjs"]` with an `exports` map that had only a
 * `require` condition, so `import { bd } from "@ozjsey/bigdecimal-string"` —
 * the form used by every example in the README — failed outright under Node
 * ESM with ERR_PACKAGE_PATH_NOT_EXPORTED, and bundlers were handed the CJS
 * build. Every other package in this portfolio emits ESM.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".min.mjs" : ".min.js" };
  },
});
