import {
  base,
  buildFormat,
  defaultLocale,
  localeByRoutePattern,
  localizedPatternsByPage,
  locales,
  pageByRoutePattern,
  routes,
  trailingSlash,
} from "astro-localized-routes:internal:virtual";
import { ACTION_RPC_ROUTE, SERVER_ISLAND_ROUTE } from "./constants";
import { getPathLocale, getRequestedLocale, removeBase } from "./runtime";

export { defaultLocale, locales };

export function getLocale({
  routePattern,
  url,
  originPathname,
  request,
}: {
  routePattern: string;
  url: URL;
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

  const locale = localeByRoutePattern.get(routePattern);
  if (locale !== undefined) return locale;

  return getRequestedLocale(url, originPathname) ?? defaultLocale;
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

export function getLocalizedPath(
  pathOrRoute: string | URL,
  locale: string,
  params: Record<string, string | undefined> = {},
): string | undefined {
  // the query and hash are kept (e.g. `/a-propos#team` -> `/en/about/#team`)
  let pathname: string;
  let suffix: string;
  if (typeof pathOrRoute === "string") {
    // a path without `base`, like the paths in `routes`, since a path can start with the same
    // segment as `base` (e.g. `/blog/hello` with `base: "/blog"`)
    const end = pathOrRoute.search(/[?#]/);
    pathname = end === -1 ? pathOrRoute : pathOrRoute.slice(0, end);
    suffix = end === -1 ? "" : pathOrRoute.slice(end);
  } else {
    // a URL includes `base` (e.g. `Astro.url`)
    pathname = removeBase(pathOrRoute.pathname);
    suffix = pathOrRoute.search + pathOrRoute.hash;
  }
  // the trailing slash is optional, like in the `routes` config (e.g. `/a-propos/`)
  const path = decodePath(pathname).replace(/(.)\/+$/, "$1");

  // a page route (e.g. `/blog/[slug]`) or one of its localized routes (e.g. `/journal/[slug]`)
  let page = getPage(path);
  let pathParams: Record<string, string | undefined> = {};
  if (page === undefined) {
    // any other path is matched against Astro's routes, which require a trailing slash with
    // `trailingSlash: "always"` (e.g. `/journal/mon-article` -> `/journal/[slug]`)
    const route = matchRoute(trailingSlash === "always" ? `${path}/` : path);
    page = route === undefined ? undefined : getPage(route.pattern);
    pathParams = route?.params ?? {};
  }

  const pattern = page === undefined ? undefined : localizedPatternsByPage.get(page)?.[locale];
  // the path isn't served by a localized page (e.g. an endpoint), or the page doesn't exist in
  // that locale (e.g. with `missingRouteBehavior: "ignore"`)
  if (pattern === undefined) return undefined;
  return getPath(pattern, { ...pathParams, ...params }) + suffix;
}

// the page a route serves, including the page's own route when it's removed (e.g. `/about` with
// `removeOriginalPageRoutes`)
function getPage(pattern: string): string | undefined {
  return localizedPatternsByPage.has(pattern) ? pattern : pageByRoutePattern.get(pattern);
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
  // the path includes `base` (e.g. `/docs/en/about`)
  let path = removeBase(decodePath(pathname));
  // pages are served as `.html` files with `build.format: "file"` (e.g. `/fr.html`)
  if (buildFormat === "file") path = path.replace(/(\/index)?\.html$/, "") || "/";

  const pattern = matchRoute(path)?.pattern;
  const locale = pattern === undefined ? undefined : localeByRoutePattern.get(pattern);
  return locale ?? getPathLocale(path) ?? defaultLocale;
}

// a path decoded like Astro matches it (e.g. `/de/%C3%BCber-uns` -> `/de/über-uns`)
function decodePath(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    // a malformed path (e.g. `/%E0`) is kept as is
    return path;
  }
}

// the first of Astro's routes that matches a path, and the path's params (e.g.
// `/journal/mon-article` -> `/journal/[slug]` with `{ slug: "mon-article" }`)
function matchRoute(
  path: string,
): { pattern: string; params: Record<string, string | undefined> } | undefined {
  for (const [regex, pattern] of routes) {
    const match = regex.exec(path);
    if (match === null) continue;
    // the regex captures the params in the order of the pattern, and a rest param can be empty
    const names = Array.from(pattern.matchAll(/\[(?:\.\.\.)?([^\]]+)\]/g), ([, name]) => name);
    const params = Object.fromEntries(names.map((name, index) => [name, match[index + 1]]));
    return { pattern, params };
  }
  return undefined;
}
