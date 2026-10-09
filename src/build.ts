import type { AstroIntegration } from "astro";
import fs from "fs";

type BuildDoneParams = Parameters<NonNullable<AstroIntegration["hooks"]["astro:build:done"]>>[0];

export class BuildCleaner {
  private hasCleanedBuildFiles = false;

  filterBuild(
    { pages, assets, dir }: BuildDoneParams,
    routePatternsToHide: ReadonlySet<string>,
    routePatternsToUnlist: ReadonlySet<string>,
  ): Pick<BuildDoneParams, "pages" | "assets"> {
    const visiblePathnames = new Set<string>();
    // unlisted routes keep their files but they're left out of `pages` so that they don't appear to other integrations
    const listedPathnames = new Set<string>();

    for (const [pattern, files] of assets) {
      if (routePatternsToHide.has(pattern)) continue;
      for (const file of files) {
        const pathname = this._outputFileToPathname(file, dir);
        visiblePathnames.add(pathname);
        if (!routePatternsToUnlist.has(pattern)) listedPathnames.add(pathname);
      }
    }

    if (!this.hasCleanedBuildFiles) {
      // Astro writes the 404 responses of our middleware to a hidden route's files instead of
      // skipping them. This would cause serving an empty page with a 200 response instead of
      // a 404, so we need to remove the actual build files
      for (const pattern of routePatternsToHide) {
        for (const file of assets.get(pattern) ?? []) {
          if (!visiblePathnames.has(this._outputFileToPathname(file, dir)))
            this._removeOutputFile(file, dir);
        }
      }

      this.hasCleanedBuildFiles = true;
    }

    return {
      pages: pages.filter((page) => listedPathnames.has(page.pathname.replace(/\/$/, ""))),
      assets: new Map([...assets].filter(([pattern]) => !routePatternsToHide.has(pattern))),
    };
  }

  /**
   * Resets the internal flag that tracks whether hidden build files have been cleaned.
   * This is useful for scripts or tests that perform multiple builds with the same
   * integration instance.
   */
  resetCleanFlag(): void {
    this.hasCleanedBuildFiles = false;
  }

  // `about/index.html` (directory format) and `about.html` (file format) both map to `about`,
  // matching the page pathname `about/` or `about` once its trailing slash is dropped
  private _outputFileToPathname(file: URL, outDir: URL): string {
    return decodeURI(file.href.slice(outDir.href.length))
      .replace(/(^|\/)index\.html$/, "$1")
      .replace(/\.html$/, "")
      .replace(/\/$/, "");
  }

  private _removeOutputFile(file: URL, outDir: URL): void {
    fs.rmSync(file, { force: true });

    // drop the folders left empty, e.g. `about/` once `about/index.html` is gone
    let folder = new URL("./", file);
    while (folder.href.startsWith(outDir.href) && folder.href !== outDir.href) {
      try {
        // try to remove the folder, will fail if it's not empty
        // this is better than checking if the folder is empty before attempting
        // to remove it, because `readdirSync` would need to read every entry in
        // the folder which becomes expensive for large directories
        fs.rmdirSync(folder);
      } catch (error) {
        const { code } = error as NodeJS.ErrnoException;
        // still holds other files (POSIX allows either code)
        if (code === "ENOTEMPTY" || code === "EEXIST") return;
        // directory already gone — could happen if it was deleted by another integration
        if (code !== "ENOENT") throw error;
      }
      folder = new URL("../", folder);
    }
  }
}
