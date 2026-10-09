import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/middleware.ts"],
  deps: { neverBundle: ["astro-routing-international:internal:virtual"] },
  dts: { tsgo: true },
  exports: {
    exclude: ["middleware"],
  },
  tsconfig: "./tsconfig.build.json",
});
