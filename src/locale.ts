import {
  base,
  defaultLocale,
  localeByRoutePattern,
  locales,
} from "astro-localized-routes:internal:virtual";
import { getPathLocale } from "./runtime";
import { isRootErrorPage } from "./utils";

export { defaultLocale, locales };

export function getLocale({
  routePattern,
  originPathname,
  request,
}: {
  routePattern: string;
  originPathname: string;
  request: Request;
}): string {
  // server islands and actions called from the browser have their own route, so we use the page
  // that called them (e.g. `/en/about`), like Astro does for `Astro.currentLocale`
  if (routePattern.startsWith("/_server-islands/") || routePattern.startsWith("/_actions/")) {
    const referer = request.headers.get("referer");
    if (referer === null || !URL.canParse(referer)) return defaultLocale;
    const { pathname } = new URL(referer);
    // the referer includes `base` (e.g. `/docs/en/about`)
    const path = pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
    return getPathLocale(path) ?? defaultLocale;
  }

  // the root error pages are rendered for any path, so they don't have a locale of their own
  const locale = isRootErrorPage(routePattern) ? undefined : localeByRoutePattern.get(routePattern);
  if (locale !== undefined) return locale;

  // the path that was requested, which stays the same after a rewrite (e.g. `/en/blog/missing`
  // rewritten to `/404`) and doesn't include `base`
  return getPathLocale(originPathname) ?? defaultLocale;
}
