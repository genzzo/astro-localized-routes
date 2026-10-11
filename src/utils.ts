import type { ErrorPageStatus } from "./types";

export function isRootErrorPage(pattern: string): pattern is `/${ErrorPageStatus}` {
  return pattern === "/404" || pattern === "/500";
}
