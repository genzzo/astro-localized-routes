import type { AstroIntegration } from "astro";
import type { AstroLocalizedRoutesOptions } from "./config";
import { resolveOptions } from "./config";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import os from "os";
import { pageFileToPattern } from "./pattern";

export default function localizedRoutes<Locales extends string>(
  options: AstroLocalizedRoutesOptions<Locales>,
): AstroIntegration {
  const resolvedOptions = resolveOptions(options);

  // Astro reads injected entrypoints from the real filesystem well after `astro:config:setup`
  // (route manifest, Vite, dev server), so the shims must live until the run is over.
  let shimDir: string | null = null;
  const cleanupShims = () => {
    if (shimDir === null) return;
    fs.rmSync(shimDir, { recursive: true, force: true });
    shimDir = null;
  };

  // `astro:build:done`/`astro:server:done` don't run when the process dies early. Astro installs
  // no signal handlers, so Node's default SIGINT/SIGTERM action terminates without firing `exit`
  // either — handle both, then re-raise so the exit status stays conventional.
  let exitHooksRegistered = false;
  const registerExitHooks = () => {
    if (exitHooksRegistered) return;
    exitHooksRegistered = true;
    process.once("exit", cleanupShims);
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.once(signal, () => {
        cleanupShims();
        process.kill(process.pid, signal);
      });
    }
  };

  return {
    name: "astro-localized-routes",
    hooks: {
      "astro:config:setup": ({ config: astroConfig, injectRoute }) => {
        // a dev-server restart re-runs this hook; drop the previous run's shims first
        cleanupShims();

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

          let entrypoint = path.join(pagesDir, file);
          if (!file.endsWith(".astro")) {
            // created on demand so a project with only `.astro` pages never touches the fs
            shimDir ??= fs.mkdtempSync(path.join(os.tmpdir(), "astro-localized-routes-"));
            // flatten the relative path (`writeFileSync` won't create parent dirs) and keep the
            // original extension so sibling pages like `index.md`/`index.html` can't collide
            const shimFile = `${file.replace(/[\\/]/g, "__")}.astro`;
            const shimFilePath = path.join(shimDir, shimFile);
            fs.writeFileSync(
              shimFilePath,
              `---\nimport Page from ${JSON.stringify(entrypoint)};\n---\n<Page />`,
            );
            entrypoint = shimFilePath;
          }

          for (const locale of options.locales) {
            injectRoute({
              pattern: basePattern === "/" ? `/${locale}` : `/${locale}${basePattern}`,
              entrypoint,
            });
          }
        }

        if (shimDir !== null) registerExitHooks();
      },
      "astro:routes:resolved": ({ routes }) => {
        console.log(routes);
      },
      "astro:build:done": cleanupShims,
      "astro:server:done": cleanupShims,
    },
  };
}
