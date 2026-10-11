import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/middleware.ts", "src/locale.ts"],
  deps: { neverBundle: ["astro-localized-routes:internal:virtual"] },
  dts: { tsgo: true },
  exports: {
    exclude: ["middleware", "locale"],
  },
  tsconfig: "./tsconfig.build.json",
});
