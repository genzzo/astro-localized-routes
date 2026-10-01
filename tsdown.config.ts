import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/remove-original-routes-middleware.ts"],
  deps: { neverBundle: ["astro-routing-international:internal:virtual"] },
  dts: { tsgo: true },
  exports: {
    exclude: ["remove-original-routes-middleware"],
  },
  tsconfig: "./tsconfig.build.json",
});
