import { defineConfig } from "tsdown";

export default defineConfig({
  dts: {
    tsgo: true,
  },
  exports: true,
  tsconfig: "./tsconfig.build.json",
  // ...config options
});
