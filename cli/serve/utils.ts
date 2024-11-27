import type { HakaiConfig } from "./types.ts";

export function resolvePagePath(urlPath: string, config: HakaiConfig): string {
  if (urlPath === "/") {
    return `./features/${config.rootPage}/page.kai`;
  }
  return `./features${urlPath}/page.kai`;
}
