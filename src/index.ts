import type { AstroIntegration, IntegrationResolvedRoute } from "astro";
import type { AstroRoutingInternationalOptions } from "./config";
import { resolveOptions } from "./config";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import {
  ASTRO_ROUTE_EXTENSIONS,
  ClaimedPatternsChecker,
  isErrorPagePattern,
  isRootPattern,
  pageFileToPattern,
} from "./pattern";
import { BuildCleaner } from "./build";
import type { ErrorPageStatus } from "./types";

const INTEGRATION_NAME = "astro-routing-international";
const VIRTUAL_INTERNAL_ID = "astro-routing-international:internal:virtual";
const RESOLVED_INTERNAL_ID = `\0${VIRTUAL_INTERNAL_ID}`;

export default function routingInternational<Locales extends string>(
  options: AstroRoutingInternationalOptions<Locales>,
): AstroIntegration {
  const resolvedOptions = resolveOptions(options);

  let isServerOutput = false;

  const routePatternsToHide: Set<string> = new Set();
  // routes that are served but kept out of what other integrations see (e.g. `/en/404` in a sitemap)
  const routePatternsToUnlist: Set<string> = new Set();
  // the routes Astro resolved, which builds resolve before "astro:config:done"
  let resolvedRoutes: IntegrationResolvedRoute[] | undefined;

  let localizedErrorPages: Partial<
    Record<`/${ErrorPageStatus}`, Partial<Record<Locales, string>>>
  > = {};
  const errorPagePatterns = new Set(resolvedOptions.errorPages.map((status) => `/${status}`));
  // store the file paths of error page components because "astro:route:setup" does not
  // see patterns and we need the actual component file to disable prerendering on them
  const errorPageComponents: Set<string> = new Set();

  const buildCleaner = new BuildCleaner();

  // clean up the previous state after Astro's config changes or the server reloads or consecutive builds
  const resetState = () => {
    routePatternsToHide.clear();
    routePatternsToUnlist.clear();
    resolvedRoutes = undefined;
    localizedErrorPages = {};
    errorPageComponents.clear();
    buildCleaner.resetCleanFlag();
  };

  return {
    name: INTEGRATION_NAME,
    hooks: {
      "astro:config:setup": ({
        config: astroConfig,
        command,
        injectRoute,
        addMiddleware,
        updateConfig,
      }) => {
        resetState();

        isServerOutput = astroConfig.output === "server";

        const srcDir = fileURLToPath(astroConfig.srcDir);
        const pagesDir = path.join(srcDir, "pages");
        const allPageFiles = fs.globSync(
          ASTRO_ROUTE_EXTENSIONS.map((extension) => `**/*${extension}`),
          { cwd: pagesDir },
        );
        const selectedPageFiles = fs.globSync(
          resolvedOptions.routableExtensions.map((extension) => `**/*${extension}`),
          { cwd: pagesDir },
        );

        // collect existing Astro route patterns to check if they conflict with localized patterns
        const claimedPatternsChecker = new ClaimedPatternsChecker();
        claimedPatternsChecker.collectFromPageFiles(allPageFiles);

        for (const file of selectedPageFiles) {
          const basePattern = pageFileToPattern(file);
          // route ignored by Astro's routing system (e.g. `_filename.astro`)
          if (basePattern === null) continue;

          const isErrorPage = isErrorPagePattern(basePattern);
          // skip error pages that are not listed in `errorPages`
          if (isErrorPage && !errorPagePatterns.has(basePattern)) continue;

          // root error pages should always be kept as Astro needs them as fallback routes
          let keepOriginal = isErrorPage || !resolvedOptions.removeOriginalPageRoutes.enabled;

          for (const locale of resolvedOptions.locales) {
            let localizedPattern: string | undefined =
              resolvedOptions.routes[basePattern]?.[locale];

            // error pages keep their path under every locale (e.g. `/en/404`)
            if (isErrorPage) {
              localizedPattern = basePattern;
            }

            if (localizedPattern === undefined) {
              const missingRouteBehavior =
                typeof resolvedOptions.missingRouteBehavior === "function"
                  ? resolvedOptions.missingRouteBehavior(basePattern, locale)
                  : resolvedOptions.missingRouteBehavior;

              switch (missingRouteBehavior) {
                case "ignore":
                  continue;
                case "warn":
                  console.warn(`Missing route for pattern: ${basePattern}, locale: ${locale}`);
                  continue;
                case "error":
                  throw new Error(`Missing route for pattern: ${basePattern}, locale: ${locale}`);
                case "use_default":
                  localizedPattern = basePattern;
                  break;
                default:
                  throw new Error(`Invalid missingRouteBehavior: ${missingRouteBehavior}`);
              }
            }

            if (locale !== resolvedOptions.defaultLocale || resolvedOptions.prefixDefaultLocale) {
              localizedPattern = isRootPattern(localizedPattern)
                ? `/${locale}`
                : `/${locale}${localizedPattern}`;
            }

            // only the error pages themselves can use an error page path (e.g. `/404`)
            if (!isErrorPage && isErrorPagePattern(localizedPattern)) {
              throw new Error(
                `Localized patterns are not allowed to use error page paths: pattern "${localizedPattern}" for file "${file}" and locale "${locale}"`,
              );
            }

            if (localizedPattern === basePattern) {
              keepOriginal = true; // served by the page's own route
              continue;
            }

            // check if the localized pattern conflicts with any existing claimed patterns
            const claimTrial = claimedPatternsChecker.tryClaim(localizedPattern, file, locale);
            if (!claimTrial.claimed)
              throw new Error(
                `Localized pattern conflict: pattern "${localizedPattern}" for file "${file}" and locale "${locale}" conflicts with existing pattern "${claimTrial.existing.pattern}" for file "${claimTrial.existing.file}"${claimTrial.existing.locale ? ` and locale "${claimTrial.existing.locale}"` : ""}`,
              );

            injectRoute({ pattern: localizedPattern, entrypoint: path.join(pagesDir, file) });

            if (isErrorPage) {
              if (!localizedErrorPages[basePattern]) localizedErrorPages[basePattern] = {};
              localizedErrorPages[basePattern][locale] = localizedPattern;
              routePatternsToUnlist.add(localizedPattern);
              errorPageComponents.add(
                path
                  .relative(fileURLToPath(astroConfig.root), path.join(pagesDir, file))
                  .split(path.sep)
                  .join("/"),
              );
            }
          }

          if (!keepOriginal) {
            routePatternsToHide.add(basePattern);
          }
        }

        const hasLocalizedErrorPages = Object.keys(localizedErrorPages).length > 0;
        if (!resolvedOptions.removeOriginalPageRoutes.enabled && !hasLocalizedErrorPages) return;

        updateConfig({
          vite: {
            plugins: [
              {
                name: VIRTUAL_INTERNAL_ID,
                resolveId: (id) => (id === VIRTUAL_INTERNAL_ID ? RESOLVED_INTERNAL_ID : null),
                load(id) {
                  if (id !== RESOLVED_INTERNAL_ID) return null;
                  return [
                    `export const routePatternsToHide = new Set(${JSON.stringify(Array.from(routePatternsToHide))});`,
                    `export const localizedErrorPages = ${JSON.stringify(localizedErrorPages)};`,
                    `export const base = ${JSON.stringify(astroConfig.base.replace(/\/$/, ""))};`,
                    `export const trailingSlash = ${JSON.stringify(astroConfig.trailingSlash)};`,
                    `export const isDev = ${JSON.stringify(command === "dev")};`,
                  ].join("\n");
                },
              },
            ],
          },
        });

        addMiddleware({
          entrypoint: new URL("./middleware.mjs", import.meta.url),
          // run after the user's middleware to give them flexibility with scenarios like auth or redirects
          order: "post",
        });
      },
      // render the localized error pages on demand in server output, because a prerendered error
      // page is served as a static file without going through our middleware
      "astro:route:setup": ({ route }) => {
        if (isServerOutput && errorPageComponents.has(route.component)) route.prerender = false;
      },
      "astro:routes:resolved": ({ routes }) => {
        resolvedRoutes = routes;
      },
      "astro:config:done": async ({ config, logger }) => {
        if (!resolvedOptions.removeOriginalPageRoutes.enabled && routePatternsToUnlist.size === 0)
          return;

        const isListedRoute = (route: IntegrationResolvedRoute) =>
          !routePatternsToHide.has(route.pattern) && !routePatternsToUnlist.has(route.pattern);

        // wrap other integrations' hooks to remove hidden routes and unlisted routes
        for (const integration of config.integrations) {
          if (
            integration.name === INTEGRATION_NAME ||
            resolvedOptions.removeOriginalPageRoutes.excludedIntegrations?.includes(
              integration.name,
            )
          )
            continue;

          const buildDone = integration.hooks["astro:build:done"];
          if (buildDone !== undefined) {
            integration.hooks["astro:build:done"] = (params) =>
              buildDone({
                ...params,
                ...buildCleaner.filterBuild(params, routePatternsToHide, routePatternsToUnlist),
              });
          }

          const routesResolved = integration.hooks["astro:routes:resolved"];
          if (routesResolved !== undefined) {
            const filteredRoutesResolved: typeof routesResolved = (params) =>
              routesResolved({ ...params, routes: params.routes.filter(isListedRoute) });
            integration.hooks["astro:routes:resolved"] = filteredRoutesResolved;

            // builds resolve the routes before "astro:config:done" while dev does it after, so the
            // integration already got all of them and we need to call its hook again
            if (resolvedRoutes !== undefined)
              await filteredRoutesResolved({
                routes: resolvedRoutes,
                logger: logger.fork(integration.name),
              });
          }
        }
      },
      "astro:build:done": (params) => {
        if (!resolvedOptions.removeOriginalPageRoutes.enabled) return;
        buildCleaner.filterBuild(params, routePatternsToHide, routePatternsToUnlist);
      },
    },
  };
}
