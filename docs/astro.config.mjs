// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";
import starlightThemeRapide from "starlight-theme-rapide";

export default defineConfig({
  integrations: [
    starlight({
      title: "astro-localized-routes",
      description: "Translated URLs for every page of your Astro site, from a single page file.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/genzzo/astro-localized-routes",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/genzzo/astro-localized-routes/edit/main/docs/",
      },
      // English is served at the root (`/guides/...`), the other locales under their prefix
      // (`/fr/guides/...`); untranslated pages fall back to English with a notice
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        fr: { label: "Français", lang: "fr" },
        ar: { label: "العربية", lang: "ar", dir: "rtl" },
      },
      plugins: [
        starlightThemeRapide(),
        // pages are translated progressively, so translated pages can link to English fallbacks
        starlightLinksValidator({ errorOnFallbackPages: false }),
      ],
      customCss: [
        "@fontsource/ibm-plex-sans-arabic/400.css",
        "@fontsource/ibm-plex-sans-arabic/600.css",
        "./src/styles/custom.css",
      ],
      sidebar: [
        {
          label: "Start here",
          translations: { fr: "Commencer ici", ar: "ابدأ هنا" },
          items: [
            "getting-started/why",
            "getting-started/installation",
            "getting-started/quick-start",
          ],
        },
        {
          label: "Guides",
          translations: { fr: "Guides", ar: "الأدلة" },
          items: [
            "guides/translating-urls",
            "guides/current-locale",
            "guides/language-switcher",
            "guides/error-pages",
            "guides/hiding-original-routes",
            "guides/missing-translations",
            "guides/other-integrations",
            "guides/migrating-from-astro-i18n",
          ],
        },
        {
          label: "Reference",
          translations: { fr: "Référence", ar: "المرجع" },
          items: ["reference/configuration", "reference/runtime-api", "reference/errors"],
        },
        {
          label: "Concepts",
          translations: { fr: "Concepts", ar: "المفاهيم" },
          items: ["concepts/how-it-works", "concepts/compatibility"],
        },
      ],
    }),
  ],
});
