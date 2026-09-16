import type { AstroIntegration } from "astro";
import type { AstroRoutingInternationalOptions } from "./config";
import { resolveOptions } from "./config";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { pageFileToPattern } from "./pattern";

export default function routingInternational<Locales extends string>(
  options: AstroRoutingInternationalOptions<Locales>,
): AstroIntegration {
  const resolvedOptions = resolveOptions(options);

  return {
    name: "astro-routing-international",
    hooks: {
      "astro:config:setup": ({ config: astroConfig, injectRoute }) => {
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

          for (const locale of options.locales) {
            injectRoute({
              pattern: basePattern === "/" ? `/${locale}` : `/${locale}${basePattern}`,
              entrypoint: path.join(pagesDir, file),
            });
          }
        }
      },
      "astro:routes:resolved": ({ routes }) => {
        console.log(routes);
      },
    },
  };
}
