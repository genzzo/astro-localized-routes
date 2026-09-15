import type { AstroIntegration } from "astro";
import type { AstroRoutingInternationalOptions } from "./config";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

export default function routingInternational<Locales extends string>(
  options: AstroRoutingInternationalOptions<Locales>,
): AstroIntegration {
  return {
    name: "astro-routing-international",
    hooks: {
      "astro:config:setup": ({ config: astroConfig, injectRoute }) => {
        const srcDir = fileURLToPath(astroConfig.srcDir);
        const pagesDir = path.join(srcDir, "pages");
        const pageFiles = fs.globSync("**/*.astro", { cwd: pagesDir });

        for (const file of pageFiles) {
          for (const locale of options.locales) {
            injectRoute({
              pattern: `/${locale}/${file.replace(/\.astro$/, "")}`,
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
