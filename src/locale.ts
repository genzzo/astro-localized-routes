import {
  base,
  defaultLocale,
  localeByRoutePattern,
  locales,
} from "astro-localized-routes:internal:virtual";

export { defaultLocale, locales };

export function getLocale({ routePattern, url }: { routePattern: string; url: URL }): string {
  // the root error pages are rendered for any path, so we use the requested one (e.g. `/en/missing`)
  if (routePattern === "/404" || routePattern === "/500")
    return getPathLocale(url.pathname.slice(base.length));

  return localeByRoutePattern.get(routePattern) ?? getPathLocale(routePattern);
}

// the locale a path starts with (e.g. `/en/feed.xml`), or the default one for routes we didn't create
function getPathLocale(path: string): string {
  const prefix = path.split("/")[1];
  return prefix !== undefined && locales.includes(prefix) ? prefix : defaultLocale;
}
