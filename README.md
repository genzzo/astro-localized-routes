# astro-localized-routes

The way Astro should be handling i18n in the first place.

Aside from configuring the plugin in your config Astro config file, all you need to do is define your pages normally in `src/pages`, and that's it.

## WARNING ⚠️

This package is still a work in progress and may have breaking changes in future releases. Use it with caution.

Your feedback is greatly appreciated. Issues and feature requests are more than welcome.

## What the integration does

- **In dev**: each page is available for every locale under its configured path (for example, `/a-propos` and `/en/about` for `about.astro`). No files are generated or copied; the routes are registered when Astro starts.
- **On build**: the same localized routes are generated whether pages are prerendered or rendered on demand.
- **Cleanup**: when `removeOriginalPageRoutes` is enabled, the original routes return a 404 and their build files are removed. Other integrations, such as `@astrojs/sitemap`, only receive the localized routes. Error pages also get a version for each locale (for example, `/en/404`).

## Install

Using npm:

```sh
npm install astro-localized-routes
```

Using pnpm:

```sh
pnpm add astro-localized-routes
```

Using Yarn:

```sh
yarn add astro-localized-routes
```

Using Bun:

```sh
bun add astro-localized-routes
```

Astro 6 and 7 are supported.

## Usage

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import localizedRoutes from "astro-localized-routes";

export default defineConfig({
  integrations: [
    localizedRoutes({
      locales: ["fr", "en"],
      defaultLocale: "fr",
      routes: {
        "/about": { fr: "/a-propos", en: "/about" },
        "/blog/[slug]": { fr: "/journal/[slug]", en: "/blog/[slug]" },
      },
      removeOriginalPageRoutes: true,
    }),
  ],
});
```

With these pages, the resulting routes are:

| Page                | `fr` (default)    | `en`              |
| ------------------- | ----------------- | ----------------- |
| `index.astro`       | `/`               | `/en`             |
| `about.astro`       | `/a-propos`       | `/en/about`       |
| `blog/[slug].astro` | `/journal/[slug]` | `/en/blog/[slug]` |
| `404.astro`         | `/404`            | `/en/404`         |

Since `removeOriginalPageRoutes` is enabled, the original `/about` and `/blog/[slug]` routes return a 404. `/` remains available because it is also the French home page.

Each page needs a path for every locale in `routes`, except `/`, which defaults to `/` for every locale. If a locale does not have a path, `missingRouteBehavior` controls how it is handled.

`Astro.currentLocale` is not set by this integration. To determine the locale, read it from the route pattern:

```astro
---
// Working on this in the next iteration
const [, prefix] = Astro.routePattern.split("/");
const locale = prefix === "en" ? "en" : "fr";
---
```

## Options

| Option                     | Default      | Description                                                                                                                                                                          |
| -------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `locales`                  | required     | The locales supported by your site.                                                                                                                                                  |
| `defaultLocale`            | required     | The locale that is served without a URL prefix.                                                                                                                                      |
| `routes`                   | required     | Defines the path for each page in each locale, keyed by the page's route (for example, `"/about": { fr: "/a-propos", en: "/about" }`). `/` defaults to `/` for every locale.         |
| `prefixDefaultLocale`      | `false`      | Also serve the default locale using its locale prefix (for example, `/fr/a-propos`).                                                                                                 |
| `missingRouteBehavior`     | `"error"`    | Controls missing locale paths: `"error"`, `"warn"`, `"ignore"`, `"use_default"` (use the page's original path under the locale prefix), or a function returning one of these values. |
| `removeOriginalPageRoutes` | `false`      | Remove the original `src/pages` routes. They return a 404 and their build files are deleted.                                                                                         |
| `errorPages`               | `[404, 500]` | Creates a copy of each error page for every locale (for example, `/en/404`). Set to `[]` to disable this.                                                                            |
| `crossIntegrationBehavior` | `{}`         | `excludedIntegrations`: integrations that should receive Astro's original routes and pages without filtering.                                                                        |
| `routableExtensions`       | `[".astro"]` | File extensions that should be localized.                                                                                                                                            |

## Good to know

- With both `prefixDefaultLocale` and `removeOriginalPageRoutes` enabled, nothing is served at `/`. Redirect it in your own middleware, which runs before this integration:

  ```ts
  // src/middleware.ts
  import { defineMiddleware } from "astro:middleware";

  export const onRequest = defineMiddleware((ctx, next) => {
    if (ctx.url.pathname === "/") return ctx.redirect("/fr/");
    return next();
  });
  ```

  This works in development and for pages rendered on demand. For static sites, configure the redirect at your host or CDN instead.

- Error pages use the same path structure for every locale (`/en/404`) because the middleware and static hosts need to find them there.
- With server output, localized error pages are rendered on demand so the middleware can select the correct one. With static output, the host serves the error page directly and determines which page is shown. When using an adapter, add `export const prerender = false` to the error page if you want the middleware to handle it.
- If your project already contains a page such as `src/pages/en/404.astro`, it conflicts with the generated localized page. Set `errorPages: []` to use your own page.

## License

[MIT](./LICENSE)
