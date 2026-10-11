import type { MiddlewareHandler } from "astro";
import {
  isDev,
  localizedErrorPages,
  routePatternsToHide,
  trailingSlash,
} from "astro-localized-routes:internal:virtual";
import { getPathLocale } from "./runtime";

// status and localized copies of each error page (e.g. `/404` -> 404 with `en` -> `/en/404`)
const errorPagesMap = new Map(
  Object.entries(localizedErrorPages).map(([page, copies]) => [
    page,
    { status: Number(page.slice(1)), copies: new Map(Object.entries(copies)) },
  ]),
);
// status of each localized copy (e.g. `/en/404` -> 404)
const localizedErrorPagesStatusMap = new Map(
  [...errorPagesMap.values()].flatMap(({ status, copies }) =>
    [...copies.values()].map((copy) => [copy, status] as const),
  ),
);

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  if (routePatternsToHide.has(ctx.routePattern)) {
    // the files of prerendered hidden pages are deleted after the build, so an empty body skips
    // rendering the 404 page for them, which fails when the 404 page is rendered on demand
    if (ctx.isPrerendered && !isDev) return new Response("", { status: 404 });

    // return a fresh bodyless 404 response instead of calling `next("/404")` so that the status
    // doesn't get reset to 200
    return new Response(null, { status: 404 });
  }

  // Astro always renders the root error page, so we rewrite to the localized copy of the
  // requested locale when there is one
  const errorPage = errorPagesMap.get(ctx.routePattern);
  if (errorPage !== undefined) {
    // the path that was requested, which stays the same after a rewrite (e.g. `/en/blog/missing`
    // rewritten to `/404`) and doesn't include `base`
    const locale = getPathLocale(ctx.originPathname);
    const copy = locale === undefined ? undefined : errorPage.copies.get(locale);
    if (copy === undefined) return next();
    // a trailing slash is required with `trailingSlash: "always"`, otherwise the copy doesn't
    // match any route
    return withStatus(await next(trailingSlash === "always" ? `${copy}/` : copy), errorPage.status);
  }

  // return the correct error status when someone visits a localized copy of an error page directly
  const status = localizedErrorPagesStatusMap.get(ctx.routePattern);
  if (status !== undefined) return withStatus(await next(), status);

  return next();
};

// a rewrite keeps the status of the page it renders, which is a 200 for a localized copy, so we
// need to set the error status back
function withStatus(response: Response, status: number): Response {
  return new Response(response.body, { status, headers: response.headers });
}
