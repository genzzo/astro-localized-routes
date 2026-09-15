// @ts-check
import { defineConfig } from "astro/config";
import routingInternational from "astro-routing-international";

export default defineConfig({
  srcDir: "../site/src",
  publicDir: "../site/public",
  integrations: [
    routingInternational({
      locales: ["en", "fr", "de"],
      defaultLocale: "en",
      routes: {},
    }),
  ],
});
