declare module "astro-localized-routes:internal:virtual" {
  const routePatternsToHide: ReadonlySet<string>;
  const localizedErrorPages: Readonly<Record<string, Readonly<Record<string, string>>>>;
  // Astro's `base` without its trailing slash (e.g. `/docs`, or `""` for the root)
  const base: string;
  const trailingSlash: "always" | "never" | "ignore";
  const isDev: boolean;
}
