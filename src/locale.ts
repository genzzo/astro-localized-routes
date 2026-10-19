import {
  base,
  buildFormat,
  defaultLocale,
  localeByRoutePattern,
  localizedPatternsByPage,
  locales,
  pageByRoutePattern,
  pageRoutes,
  trailingSlash,
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

export function getAlternates({
  routePattern,
  params,
}: {
  routePattern: string;
  params: Record<string, string | undefined>;
}): { locale: string; path: string }[] {
  const page = pageByRoutePattern.get(routePattern);
  const localizedPatterns = page === undefined ? undefined : localizedPatternsByPage.get(page);
  if (localizedPatterns === undefined) return [];

  return locales.flatMap((locale) => {
    const pattern = localizedPatterns[locale];
    // the page doesn't exist in every locale (e.g. with `missingRouteBehavior: "ignore"`)
    if (pattern === undefined) return [];
    return [{ locale, path: getPath(pattern, params) }];
  });
}

// the path of a route with the given params, with `base` and a trailing slash when Astro adds one
// to its own links (e.g. `/journal/[slug]` -> `/docs/journal/mon-article/`)
function getPath(pattern: string, params: Record<string, string | undefined>): string {
  const segments = pattern.split("/").flatMap((segment) => {
    const value = segment.replace(
      /\[(\.\.\.)?([^\]]+)\]/g,
      (_, spread: string | undefined, name: string) => {
        const param = params[name];
        // a rest parameter can be empty (e.g. `/docs/[...slug]` -> `/docs`)
        if (param === undefined && spread === undefined) {
          throw new Error(`Missing parameter "${name}" for the route "${pattern}"`);
        }
        // like Astro, we escape the characters that would end the path (e.g. `#` and `?`)
        return (param ?? "").normalize().replace(/#/g, "%23").replace(/\?/g, "%3F");
      },
    );
    return value === "" ? [] : [value];
  });

  const path = [base, ...segments].join("/");
  const appendSlash =
    trailingSlash === "always" || (trailingSlash === "ignore" && buildFormat === "directory");
  return appendSlash ? `${path}/` : path || "/";
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
