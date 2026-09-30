// @ts-check
import { defineConfig } from "astro/config";
import routingInternational from "astro-routing-international";

const defaultLocale = "fr";

const routesMap = {
  "/privacy": {
    en: "/privacy",
    fr: "/confidentialite",
    de: "/datenschutz",
  },
  "/projects": {
    en: "/projects",
    fr: "/projets",
    de: "/projekte",
  },
  "/projects/[slug]": {
    en: "/projects/[slug]",
    fr: "/projets/[slug]",
    de: "/projekte/[slug]",
  },
};

export default defineConfig({
  srcDir: "../site/src",
  publicDir: "../site/public",
  integrations: [
    routingInternational({
      locales: ["en", "fr", "de"],
      defaultLocale: defaultLocale,
      routes: routesMap,
      routableExtensions: [".astro", ".md", ".html", ".markdown"],
      missingRouteBehavior: (route, locale) => {
        if (route === "/blog") {
          return "use_default";
        }
        if (route === "/blog/[...slug]") {
          if (locale !== defaultLocale) return "ignore";
          return "use_default";
        }
        return "error";
      },
      removeOriginalPageRoutes: true,
    }),
  ],
});
