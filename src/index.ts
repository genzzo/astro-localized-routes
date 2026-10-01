import type { AstroIntegration } from "astro";
import type { AstroRoutingInternationalOptions } from "./config";
import { resolveOptions } from "./config";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { isErrorPagePattern, isRootPattern, pageFileToPattern } from "./pattern";
import { removeHiddenRoutesFromBuild } from "./build";

const INTEGRATION_NAME = "astro-routing-international";
const VIRTUAL_INTERNAL_ID = "astro-routing-international:internal:virtual";
const RESOLVED_INTERNAL_ID = `\0${VIRTUAL_INTERNAL_ID}`;

export default function routingInternational<Locales extends string>(
  options: AstroRoutingInternationalOptions<Locales>,
): AstroIntegration {
  const resolvedOptions = resolveOptions(options);

  const routePatternsToHide: Set<string> = new Set();

  return {
    name: INTEGRATION_NAME,
    hooks: {
      "astro:config:setup": ({ config: astroConfig, injectRoute, addMiddleware, updateConfig }) => {
        routePatternsToHide.clear();

        const srcDir = fileURLToPath(astroConfig.srcDir);
        const pagesDir = path.join(srcDir, "pages");
        const pageFiles = fs.globSync(
          resolvedOptions.routableExtensions.map((extension) => `**/*${extension}`),
          { cwd: pagesDir },
        );

        for (const file of pageFiles) {
          const basePattern = pageFileToPattern(file);
          // route ignored by Astro's routing system (e.g. `_filename.astro`)
          if (basePattern === null) continue;

          if (isErrorPagePattern(basePattern)) continue;

          let keepOriginal = !resolvedOptions.removeOriginalPageRoutes.enabled;

          for (const locale of resolvedOptions.locales) {
            let localizedPattern: string | undefined =
              resolvedOptions.routes[basePattern]?.[locale];

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

            if (locale === resolvedOptions.defaultLocale) {
              if (resolvedOptions.prefixDefaultLocale) {
                if (isRootPattern(localizedPattern)) {
                  localizedPattern = `/${locale}`;
                } else {
                  localizedPattern = `/${locale}${localizedPattern}`;
                }
              }
            } else {
              if (isRootPattern(localizedPattern)) {
                localizedPattern = `/${locale}`;
              } else {
                localizedPattern = `/${locale}${localizedPattern}`;
              }
            }

            if (localizedPattern === basePattern) {
              keepOriginal = true; // served by the page's own route
              continue;
            }

            injectRoute({ pattern: localizedPattern, entrypoint: path.join(pagesDir, file) });
          }

          if (!keepOriginal) {
            routePatternsToHide.add(basePattern);
          }
        }

        if (!resolvedOptions.removeOriginalPageRoutes.enabled) return;

        updateConfig({
          vite: {
            plugins: [
              {
                name: VIRTUAL_INTERNAL_ID,
                resolveId: (id) => (id === VIRTUAL_INTERNAL_ID ? RESOLVED_INTERNAL_ID : null),
                load(id) {
                  if (id !== RESOLVED_INTERNAL_ID) return null;
                  return `export const routePatternsToHide = new Set(${JSON.stringify(Array.from(routePatternsToHide))});`;
                },
              },
            ],
          },
        });

        addMiddleware({
          entrypoint: new URL("./remove-original-routes-middleware.mjs", import.meta.url),
          order: "pre",
        });
      },
      "astro:config:done": ({ config }) => {
        if (!resolvedOptions.removeOriginalPageRoutes.enabled) return;

        // Wrap other integrations' build done hooks to remove hidden routes
        for (const integration of config.integrations) {
          const buildDone = integration.hooks["astro:build:done"];
          if (
            integration.name === INTEGRATION_NAME ||
            resolvedOptions.removeOriginalPageRoutes.excludedIntegrations?.includes(
              integration.name,
            ) ||
            buildDone === undefined
          )
            continue;

          integration.hooks["astro:build:done"] = (params) =>
            buildDone({ ...params, ...removeHiddenRoutesFromBuild(params, routePatternsToHide) });
        }
      },
      "astro:build:done": (params) => {
        if (!resolvedOptions.removeOriginalPageRoutes.enabled) return;
        removeHiddenRoutesFromBuild(params, routePatternsToHide);
      },
    },
  };
}
