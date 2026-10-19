declare module "astro-localized-routes:internal:virtual" {
  const routePatternsToHide: ReadonlySet<string>;
  const localizedErrorPages: Readonly<Record<string, Readonly<Record<string, string>>>>;
  const locales: readonly string[];
  const defaultLocale: string;
  // the locale of each route we created (e.g. `/en/about` -> `en`)
  const localeByRoutePattern: ReadonlyMap<string, string>;
  // the localized pattern of each page for every locale (e.g. `/about` -> `en` -> `/en/about`)
  const localizedPatternsByPage: ReadonlyMap<string, Readonly<Partial<Record<string, string>>>>;
  // the page each of its routes serves (e.g. `/en/about` -> `/about`)
  const pageByRoutePattern: ReadonlyMap<string, string>;
  // the regex and pattern of every page, in the order Astro matches them
  const pageRoutes: ReadonlyArray<readonly [RegExp, string]>;
  const buildFormat: "file" | "directory" | "preserve";
  // Astro's `base` without its trailing slash (e.g. `/docs`, or `""` for the root)
  const base: string;
  const trailingSlash: "always" | "never" | "ignore";
  const isDev: boolean;
}
