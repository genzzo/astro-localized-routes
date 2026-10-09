// Based on the pattern parsing logic from Astro's routing manifest creation
// https://github.com/withastro/astro/blob/main/packages/astro/src/core/routing/manifest/create.ts

import path from "node:path";
import type { RoutePart } from "astro";
import type { ErrorPageStatus } from "./types";

const ROUTE_DYNAMIC_SPLIT = /\[(.+?\(.+?\)|.+?)\]/;
const ROUTE_SPREAD = /^\.{3}.+$/;

function countOccurrences(needle: string, haystack: string) {
  let count = 0;
  for (const hay of haystack) {
    if (hay === needle) count += 1;
  }
  return count;
}

function getParts(part: string, file: string): RoutePart[] {
  const result: RoutePart[] = [];
  part.split(ROUTE_DYNAMIC_SPLIT).map((str, i) => {
    if (!str) return;
    const dynamic = i % 2 === 1;

    const [, content] = dynamic ? /([^(]+)$/.exec(str) || [null, null] : [null, str];

    if (!content || (dynamic && !/^(?:\.\.\.)?[\w$]+$/.test(content))) {
      throw new Error(`Invalid route ${file} — parameter name must match /^[a-zA-Z0-9_$]+$/`);
    }

    result.push({
      content,
      dynamic,
      spread: dynamic && ROUTE_SPREAD.test(content),
    });
  });

  return result;
}

function validateSegment(segment: string, file = ""): void {
  if (!file) file = segment;

  if (/\]\[/.test(segment)) {
    throw new Error(`Invalid route ${file} \u2014 parameters must be separated`);
  }
  if (countOccurrences("[", segment) !== countOccurrences("]", segment)) {
    throw new Error(`Invalid route ${file} \u2014 brackets are unbalanced`);
  }
  if (
    (/.+\[\.\.\.[^\]]+\]/.test(segment) || /\[\.\.\.[^\]]+\].+/.test(segment)) &&
    file.endsWith(".astro")
  ) {
    throw new Error(`Invalid route ${file} \u2014 rest parameter must be a standalone segment`);
  }
}

function isIgnoredBasename(basename: string): boolean {
  const ext = path.extname(basename);
  const name = ext ? basename.slice(0, -ext.length) : basename;
  if (name[0] === "_") return true;
  if (basename[0] === "." && basename !== ".well-known") return true;
  return false;
}

function getSegmentsFromPageFile(file: string): RoutePart[][] | null {
  const normalized = file.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const basename = parts.pop();

  if (!basename) return null;

  const segments: RoutePart[][] = [];

  for (const dir of parts) {
    if (isIgnoredBasename(dir)) return null;
    validateSegment(dir, normalized);
    segments.push(getParts(dir, normalized));
  }

  if (isIgnoredBasename(basename)) return null;

  const ext = path.extname(basename);
  const name = ext ? basename.slice(0, -ext.length) : basename;
  const isIndex = basename.startsWith("index.");
  const routeSuffix = ext ? basename.slice(basename.indexOf("."), -ext.length) : "";

  validateSegment(name, normalized);

  if (isIndex) {
    if (routeSuffix) {
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1].slice();
        const lastPart = lastSegment[lastSegment.length - 1];
        if (lastPart.dynamic) {
          lastSegment.push({ dynamic: false, spread: false, content: routeSuffix });
        } else {
          lastSegment[lastSegment.length - 1] = {
            dynamic: false,
            spread: false,
            content: `${lastPart.content}${routeSuffix}`,
          };
        }
        segments[segments.length - 1] = lastSegment;
      } else {
        segments.push(getParts(name, normalized));
      }
    }
  } else {
    segments.push(getParts(name, normalized));
  }

  return segments;
}

function segmentsToPattern(segments: RoutePart[][]): string {
  if (segments.length === 0) return "/";

  return (
    "/" +
    segments
      .map((segment) => segment.map((rp) => (rp.dynamic ? `[${rp.content}]` : rp.content)).join(""))
      .join("/")
  );
}

export function pageFileToPattern(file: string): string | null {
  const segments = getSegmentsFromPageFile(file);
  if (segments === null) return null;
  return segmentsToPattern(segments);
}

// Additional utilities

export const ASTRO_ROUTE_EXTENSIONS = [
  ".astro",
  ".html",
  ".mdx",
  ".mdoc",
  ".js",
  ".ts",
  ".md",
  ".markdown",
  ".mdown",
  ".mkdn",
  ".mkd",
  ".mdwn",
];

export namespace ClaimedPatternsChecker {
  export type Claim = { pattern: string; file: string; locale?: string };
  export type ClaimResult = { claimed: true } | { claimed: false; existing: Claim };
}
export class ClaimedPatternsChecker {
  private claimedPatterns: Map<string, ClaimedPatternsChecker.Claim>;

  static shape(pattern: string): string {
    return pattern.replace(/\[(\.\.\.)?[^\]]+\]/g, "[$1]"); // /blog/[slug] -> /blog/[], [...x] -> [...]
  }

  constructor() {
    this.claimedPatterns = new Map();
  }

  collectFromPageFiles(pageFiles: string[]) {
    for (const file of pageFiles) {
      const pattern = pageFileToPattern(file);
      if (pattern !== null)
        this.claimedPatterns.set(ClaimedPatternsChecker.shape(pattern), { pattern, file });
    }
  }

  tryClaim(pattern: string, file: string, locale?: string): ClaimedPatternsChecker.ClaimResult {
    const key = ClaimedPatternsChecker.shape(pattern);
    const existing = this.claimedPatterns.get(key);
    if (existing) return { claimed: false, existing };

    this.claimedPatterns.set(key, { pattern, file, locale });
    return { claimed: true };
  }
}

// Astro reports patterns without trailing or doubled slashes (e.g. `/a-propos/` and `//a-propos`
// are both `/a-propos`), so configured paths need the same shape to be compared with them
export function normalizePattern(pattern: string): string {
  return `/${pattern.split("/").filter(Boolean).join("/")}`;
}

export function isRootPattern(pattern: string): boolean {
  return pattern === "/";
}

export function isErrorPagePattern(pattern: string): pattern is `/${ErrorPageStatus}` {
  return pattern === "/404" || pattern === "/500";
}
