import {
  base,
  buildFormat,
  defaultLocale,
  localeByRoutePattern,
  locales,
  pageRoutes,
} from "astro-localized-routes:internal:virtual";
import { ACTION_RPC_ROUTE, SERVER_ISLAND_ROUTE } from "./constants";
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
  // that called them (e.g. `/en/about`), like Astro does for server islands in `currentLocale`
  if (routePattern === SERVER_ISLAND_ROUTE || routePattern === ACTION_RPC_ROUTE) {
    const referer = request.headers.get("referer");
    if (referer === null || !URL.canParse(referer)) return defaultLocale;
    return getPageLocale(new URL(referer).pathname);
  }

  // the root error pages are rendered for any path, so they don't have a locale of their own
  const locale = isRootErrorPage(routePattern) ? undefined : localeByRoutePattern.get(routePattern);
  if (locale !== undefined) return locale;

  // the path that was requested, which stays the same after a rewrite (e.g. `/en/blog/missing`
  // rewritten to `/404`) and doesn't include `base`
  return getPathLocale(originPathname) ?? defaultLocale;
}

// the locale of the page at a path, which we match against Astro's routes like its router does,
// since a page's path can start with another locale (e.g. an `en` page at `/fr/course`)
function getPageLocale(pathname: string): string {
  let path = pathname;
  try {
    // Astro matches decoded paths (e.g. `/de/über-uns`)
    path = decodeURI(path);
  } catch {
    // a malformed path (e.g. `/%E0`) is kept as is
  }
  // the path includes `base` (e.g. `/docs/en/about`)
  if (path.startsWith(`${base}/`)) path = path.slice(base.length);
  // pages are served as `.html` files with `build.format: "file"` (e.g. `/fr.html`)
  if (buildFormat === "file") path = path.replace(/(\/index)?\.html$/, "") || "/";

  const pattern = pageRoutes.find(([regex]) => regex.test(path))?.[1];
  const locale = pattern === undefined ? undefined : localeByRoutePattern.get(pattern);
  return locale ?? getPathLocale(path) ?? defaultLocale;
}
