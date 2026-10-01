import type { RoutableExtensions } from "./types";

type MissingRouteBehavior = "error" | "warn" | "use_default" | "ignore";

type AstroRemoveOriginalPageRoutesOptions = {
  /**
   * Enable the removal of original page routes.
   *
   * @default false
   */
  enabled?: boolean;
  /**
   * Astro builds a fresh set of pages on build for every integration, meaning routes
   * that are hidden will not be removed for other integrations. For example,
   * `@astrojs/sitemap` will generate a sitemap which includes all routes, including
   * those that are supposed to be removed when `enabled` is set to `true`.
   *
   * Our integration applies a build wrapper on every `astro:build:done` of other
   * integrations, forcing the removal of the original page routes for those
   * integrations as well.
   *
   * This option provides an opt-out mechanism for integrations that require having the
   * original page routes as they were originally.
   *
   * **Important: files corresponding to the removed routes will be deleted regardless.**
   * If the excluded integration needs the files as well, it should be placed as the first
   * integration in the Astro configuration.
   */
  excludedIntegrations?: string[];
};

export interface AstroRoutingInternationalOptions<Locales extends string = string> {
  /**
   * All supported locales for the site.
   */
  locales: readonly [Locales, ...Locales[]];
  /**
   * The default locale for the site. Used in conjunction with `prefixDefaultLocale`
   * to determine how the default locale is served.
   */
  defaultLocale: NoInfer<Locales>;
  /**
   * Serve the default locale under its prefix as well (e.g. `/en/about/`).
   *
   * @default false
   */
  prefixDefaultLocale?: boolean;
  /**
   * The routing table map.
   *
   * @example
   * ```ts
   * routes: {
   *   // "/" is set by default → "/": { en: "/", fr: "/" }
   *   "/about": { en: "/about", fr: "/a-propos", es: "/sobre-nosotros" },
   *   "/blog/[slug]": { en: "/blog/[slug]", fr: "/journal/[slug]" },
   * }
   * ```
   */
  routes: Partial<Record<string, Partial<Record<NoInfer<Locales>, string>>>>;
  /**
   * Behavior when a route is missing for a locale.
   *
   * - `"error"`: Throw an error.
   * - `"warn"`: Log a warning.
   * - `"ignore"`: Ignore the missing route.
   * - `"use_default"`: Use the base pattern of the route with the injected locale.
   * - A function that receives the missing route and locale, and returns the desired behavior.
   *
   * @default "error"
   */
  missingRouteBehavior?:
    | MissingRouteBehavior
    | ((routePattern: string, locale: Locales) => MissingRouteBehavior);
  /**
   * List of astro routable file extensions to include for international routing.
   *
   * By default, only `.astro` files are considered. This is because other file types
   * like `.html` or `.md` cannot dynamically inject internationalized content,
   * even if their routes are translated.
   *
   * @default [".astro"]
   */
  routableExtensions?: [RoutableExtensions, ...RoutableExtensions[]];
  /**
   * Remove the original routes coming from the `/pages` directory. **This applies the
   * removal to all other integrations, see
   * {@link AstroRemoveOriginalPageRoutesOptions.excludedIntegrations excludedIntegrations}.**
   *
   * This is helpful for scenarios where the default locale is a different language
   * from what might be used to name the route in development. For example, if the
   * default locale is French, a developer would name the page `/about.astro` instead
   * of `/a-propos.astro`.
   *
   * With this, page names can be kept language-neutral, while still providing localized
   * routes for the default locale at the root level.
   *
   * @default { enabled: false }
   */
  removeOriginalPageRoutes?: AstroRemoveOriginalPageRoutesOptions;
}

interface AstroRoutingInternationalResolvedOptions<
  Locales extends string = string,
> extends Required<AstroRoutingInternationalOptions<Locales>> {}

export function resolveOptions<Locales extends string = string>(
  options: AstroRoutingInternationalOptions<Locales>,
): AstroRoutingInternationalResolvedOptions<Locales> {
  return {
    ...options,
    routes: {
      "/": Object.fromEntries(options.locales.map((locale) => [locale, "/"])) as Partial<
        Record<NoInfer<Locales>, string>
      >,
      ...options.routes,
    },
    prefixDefaultLocale: options.prefixDefaultLocale ?? false,
    missingRouteBehavior: options.missingRouteBehavior ?? "error",
    routableExtensions: options.routableExtensions ?? [".astro"],
    removeOriginalPageRoutes: options.removeOriginalPageRoutes ?? { enabled: false },
  };
}
