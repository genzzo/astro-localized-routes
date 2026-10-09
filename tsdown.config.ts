import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/middleware.ts"],
  deps: { neverBundle: ["astro-localized-routes:internal:virtual"] },
  dts: { tsgo: true },
  exports: {
    exclude: ["middleware"],
  },
  tsconfig: "./tsconfig.build.json",
});
