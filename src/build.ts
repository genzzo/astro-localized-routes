import type { AstroIntegration } from "astro";
import fs from "fs";

type BuildDoneParams = Parameters<NonNullable<AstroIntegration["hooks"]["astro:build:done"]>>[0];

export function removeHiddenRoutesFromBuild(
  { pages, assets, dir }: BuildDoneParams,
  routePatternsToHide: ReadonlySet<string>,
): Pick<BuildDoneParams, "pages" | "assets"> {
  const visiblePathnames = new Set<string>();

  for (const [pattern, files] of assets) {
    if (routePatternsToHide.has(pattern)) continue;
    for (const file of files) visiblePathnames.add(outputFileToPathname(file, dir));
  }

  // Astro 6+ writes the rerouted 404 page to a hidden route's files instead of skipping them
  for (const pattern of routePatternsToHide) {
    for (const file of assets.get(pattern) ?? []) {
      if (!visiblePathnames.has(outputFileToPathname(file, dir))) removeOutputFile(file, dir);
    }
  }

  return {
    // `pages` lists every rendered pathname, including those that produced no file (Astro 5)
    pages: pages.filter((page) => visiblePathnames.has(page.pathname.replace(/\/$/, ""))),
    assets: new Map([...assets].filter(([pattern]) => !routePatternsToHide.has(pattern))),
  };
}

// `about/index.html` (directory format) and `about.html` (file format) both map to `about`,
// matching the page pathname `about/` or `about` once its trailing slash is dropped
function outputFileToPathname(file: URL, outDir: URL): string {
  return decodeURI(file.href.slice(outDir.href.length))
    .replace(/(^|\/)index\.html$/, "$1")
    .replace(/\.html$/, "")
    .replace(/\/$/, "");
}

function removeOutputFile(file: URL, outDir: URL): void {
  fs.rmSync(file, { force: true });

  // drop the folders left empty, e.g. `about/` once `about/index.html` is gone
  let folder = new URL("./", file);
  while (folder.href.startsWith(outDir.href) && folder.href !== outDir.href) {
    // already gone when an earlier integration's `astro:build:done` did the cleanup
    if (fs.existsSync(folder)) {
      if (fs.readdirSync(folder).length > 0) return;
      fs.rmdirSync(folder);
    }
    folder = new URL("../", folder);
  }
}
