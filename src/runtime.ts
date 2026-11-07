// the core integration must not import anything from this module
import { base, locales } from "astro-localized-routes:internal:virtual";

// the locale a path starts with (e.g. `en` for `/en/feed.xml`), if any
export function getPathLocale(path: string): string | undefined {
  const prefix = path.split("/")[1];
  return prefix !== undefined && locales.includes(prefix) ? prefix : undefined;
}

// the locale of the path that was requested, which is the URL after a rewrite (e.g. `/xyz`
// rewritten to `/fr/xyz` by a middleware), or the path before it when the URL has no locale (e.g.
// `/en/blog/missing` rewritten to `/404`)
export function getRequestedLocale(url: URL, originPathname: string): string | undefined {
  return getPathLocale(removeBase(decodePath(url.pathname))) ?? getPathLocale(originPathname);
}

// a path without `base`, like Astro matches it (e.g. `/docs/en/about` -> `/en/about`, `/docs` ->
// `/`), which is kept as is outside `base`, and which must be decoded first like `base` in the
// config (e.g. `/über/en`, not `/%C3%BCber/en`)
export function removeBase(path: string): string {
  if (path === base) return "/";
  return path.startsWith(`${base}/`) ? path.slice(base.length) : path;
}

// a path decoded like Astro matches it (e.g. `/de/%C3%BCber-uns` -> `/de/über-uns`)
export function decodePath(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    // a malformed path (e.g. `/%E0`) is kept as is
    return path;
  }
}
