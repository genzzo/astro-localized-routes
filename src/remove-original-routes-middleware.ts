import type { MiddlewareHandler } from "astro";
import { routePatternsToHide } from "astro-routing-international:internal:virtual";

export const onRequest: MiddlewareHandler = (ctx, next) => {
  if (!routePatternsToHide.has(ctx.routePattern)) return next();

  // A bodyless 404 is what Astro reroutes to the project's (or its default) 404 page while keeping
  // the 404 status. A `next("/404")` rewrite would reset the status to 200, and is refused in
  // server output when the 404 page is prerendered.
  return new Response(null, { status: 404 });
};
