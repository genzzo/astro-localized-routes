import type { RoutableExtensions } from "./types";

type MissingRouteBehavior = "error" | "warn" | "use_default" | "ignore";

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
   * Remove the original routes coming from the `/pages` directory.
   *
   * This is helpful for scenarios where the default locale is a different language
   * from what might be used to name the route in development. For example, if the
   * default locale is French, a developer would name the page `/about.astro` instead
   * of `/a-propos.astro`.
   *
   * With this, page names can be kept language-neutral, while still providing localized
   * routes for the default locale at the root level.
   *
   * @default false
   */
  removeOriginalPageRoutes?: boolean;
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
    removeOriginalPageRoutes: options.removeOriginalPageRoutes ?? false,
  };
}
