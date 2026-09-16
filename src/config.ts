import type { RoutableExtensions } from "./types";

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
  routes: Record<string, Partial<Record<NoInfer<Locales>, string>>>;
  /**
   * Behavior when a route is missing for a locale.
   *
   * - `"error"`: Throw an error if a route is missing for a locale.
   * - `"warn"`: Log a warning if a route is missing for a locale.
   * - `"ignore"`: Ignore missing routes for locales.
   *
   * @default "error"
   */
  missingRouteBehavior?: "error" | "warn" | "ignore";
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
}

interface AstroRoutingInternationalResolvedOptions<
  Locales extends string = string,
> extends Required<AstroRoutingInternationalOptions<Locales>> {}

export function resolveOptions<Locales extends string = string>(
  options: AstroRoutingInternationalOptions<Locales>,
): AstroRoutingInternationalResolvedOptions<Locales> {
  return {
    ...options,
    prefixDefaultLocale: options.prefixDefaultLocale ?? false,
    missingRouteBehavior: options.missingRouteBehavior ?? "error",
    routableExtensions: options.routableExtensions ?? [".astro"],
  };
}
