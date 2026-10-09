import {
  base,
  defaultLocale,
  localeByRoutePattern,
  locales,
} from "astro-localized-routes:internal:virtual";

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
    return getPathLocale(pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname);
  }

  // the root error pages are rendered for any path, so they don't have a locale of their own
  const isRootErrorPage = routePattern === "/404" || routePattern === "/500";
  const locale = isRootErrorPage ? undefined : localeByRoutePattern.get(routePattern);
  if (locale !== undefined) return locale;

  // the path that was requested, which stays the same after a rewrite (e.g. `/en/blog/missing`
  // rewritten to `/404`) and doesn't include `base`
  return getPathLocale(originPathname);
}

// the locale a path starts with (e.g. `/en/feed.xml`), or the default one
function getPathLocale(path: string): string {
  const prefix = path.split("/")[1];
  return prefix !== undefined && locales.includes(prefix) ? prefix : defaultLocale;
}
