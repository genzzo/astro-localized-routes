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
   * \`/en/feed.xml\`), or the default locale. After a rewrite, the path it was rewritten to comes
   * first (e.g. \`fr\` for \`/missing\` rewritten to \`/fr/missing\`). Server islands and actions
   * return the locale of the page that called them.
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
    url: URL;
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
   * empty list. With \`removeOriginalPageRoutes\` disabled, an original route that no locale uses
   * (e.g. \`/about\` next to \`/a-propos\`) returns the alternates of its page, which don't include
   * its own path.
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
  /**
   * Returns the path of a page in a locale, to link to it. Pass the page's route (e.g.
   * \`/blog/[slug]\`, as in \`routes\`), one of its localized routes (e.g. \`/journal/[slug]\`), any
   * path on the site (e.g. \`/journal/mon-article\`), or a URL (e.g. \`Astro.url\`). Routes and
   * paths are written without \`base\`, like the paths in \`routes\`, while a URL includes it.
   *
   * \`params\` fills the parameters of a route, and overrides the ones read from a path (e.g. for a
   * translated slug). The query and hash of a path are kept. Paths include \`base\` and end with a
   * slash when Astro adds one to its own links, like the paths of \`getAlternates\`.
   *
   * Returns \`undefined\` when the path isn't served by a localized page (e.g. an endpoint or an
   * error page), or when the page has no path in that locale.
   *
   * @example
   * \`\`\`astro
   * ---
   * import { getLocale, getLocalizedPath } from ${JSON.stringify(VIRTUAL_ID)};
   *
   * const locale = getLocale(Astro);
   * ---
   * <a href={getLocalizedPath("/blog/[slug]", locale, { slug: "hello" })}>Hello</a>
   * \`\`\`
   */
  export function getLocalizedPath(
    pathOrRoute: string | URL,
    locale: Locale,
    params?: Record<string, string | undefined>,
  ): string | undefined;
}
`;
}
