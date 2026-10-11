// the core integration must not import anything from this module
import { locales } from "astro-localized-routes:internal:virtual";

// the locale a path starts with (e.g. `en` for `/en/feed.xml`), if any
export function getPathLocale(path: string): string | undefined {
  const prefix = path.split("/")[1];
  return prefix !== undefined && locales.includes(prefix) ? prefix : undefined;
}
