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
}
`;
}
