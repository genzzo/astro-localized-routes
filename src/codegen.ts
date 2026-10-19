import { VIRTUAL_ID } from "./constants";

export function virtualModuleTypes(locales: readonly string[], defaultLocale: string): string {
  return `declare module ${JSON.stringify(VIRTUAL_ID)} {
  /**
   * All supported locales for the site.
   */
  export const locales: readonly ${JSON.stringify(locales)};
  /**
   * The supported locales type.
   */
  export type Locale = (typeof locales)[number];
  /**
   * The default locale for the site.
   */
  export const defaultLocale: ${JSON.stringify(defaultLocale)};
  /**
   * Returns the locale of the current route. Pass \`Astro\` in pages and components, or the
   * context in endpoints and middleware.
   *
   * Routes created by the integration return their own locale. Error pages and any other route
   * return the locale the requested path starts with (e.g. \`en\` for \`/en/missing\` or
   * \`/en/feed.xml\`), or the default locale. Server islands and actions return the locale of the
   * page that called them.
   *
   * @example
   * \`\`\`astro
   * ---
   * import { getLocale } from ${JSON.stringify(VIRTUAL_ID)};
   *
   * const locale = getLocale(Astro);
   * ---
   * <html lang={locale}>
   * \`\`\`
   */
  export function getLocale(context: {
    routePattern: string;
    originPathname: string;
    request: Request;
  }): Locale;
  /**
   * Returns the path of the current page in every locale it exists in, the current locale
   * included, in the order of \`locales\`. Use it for \`hreflang\` links or a language switcher.
   * Pass \`Astro\` in pages and components, or the context in endpoints and middleware.
   *
   * Paths include \`base\` and end with a slash when Astro adds one to its own links (with
   * \`trailingSlash: "always"\`, or \`"ignore"\` with \`build.format: "directory"\`). Dynamic
   * routes use the current params for every locale.
   *
   * Error pages, server islands, actions and routes of pages that aren't localized return an
   * empty list.
   *
   * @example
   * \`\`\`astro
   * ---
   * import { getAlternates } from ${JSON.stringify(VIRTUAL_ID)};
   * ---
   * {getAlternates(Astro).map(({ locale, path }) => (
   *   <link rel="alternate" hreflang={locale} href={new URL(path, Astro.site)} />
   * ))}
   * \`\`\`
   */
  export function getAlternates(context: {
    routePattern: string;
    params: Record<string, string | undefined>;
  }): { locale: Locale; path: string }[];
}
`;
}
