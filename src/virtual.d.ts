declare module "astro-localized-routes:internal:virtual" {
  const routePatternsToHide: ReadonlySet<string>;
  const localizedErrorPages: Readonly<Record<string, Readonly<Record<string, string>>>>;
  const locales: readonly string[];
  const defaultLocale: string;
  // the locale of each route we created (e.g. `/en/about` -> `en`)
  const localeByRoutePattern: ReadonlyMap<string, string>;
  // Astro's `base` without its trailing slash (e.g. `/docs`, or `""` for the root)
  const base: string;
  const trailingSlash: "always" | "never" | "ignore";
  const isDev: boolean;
}
