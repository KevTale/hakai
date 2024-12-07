import type { HakaiConfig } from "@hakai/core";
import { fileExists, findComponentDependencies, normalizePath } from "@hakai/internal";

/**
 * Resolves the file paths for a given URL path by finding the corresponding .kai page files.
 *
 * For example:
 * - "/" → returns the root page file
 * - "/dashboard" → returns ["scopes/admin/dashboard.page.kai"]
 * - "/dashboard/users" → returns ["scopes/admin/dashboard.page.kai", "scopes/admin/dashboard_users.page.kai"]
 *
 * The function searches through all scope directories and returns an array of file paths
 * that match the URL segments. Pages must exist in the same scope to be considered valid.
 */
export async function resolvePagePath(
  urlPath: string,
  config: HakaiConfig,
): Promise<string[]> {
  let pagePaths: string[] = [];

  if (urlPath === "/") {
    const rootPath = normalizePath(
      "scopes",
      config.root.scope,
      `${config.root.page}.page.kai`,
    );

    if (await fileExists(rootPath)) {
      pagePaths = [rootPath];
    }
  } else {
    const segments = urlPath
      .slice(1)
      .split("/")
      .filter((segment) => segment !== "");

    for await (const scope of Deno.readDir("./scopes")) {
      if (!scope.isDirectory) continue;

      const paths: string[] = [];
      let currentName = segments[0];

      for (let i = 0; i < segments.length; i++) {
        const pagePath = normalizePath(
          "scopes",
          scope.name,
          `${currentName}.page.kai`,
        );

        if (!(await fileExists(pagePath))) {
          break;
        }

        paths.push(pagePath);

        if (i < segments.length - 1) {
          currentName = `${currentName}_${segments[i + 1]}`;
        }
      }

      if (paths.length === segments.length) {
        pagePaths = paths;
        break;
      }
    }
  }

  if (pagePaths.length === 0) {
    throw new Error(`No page found for path: ${urlPath}`);
  }

  // Trouver tous les composants utilisés par ces pages
  const componentPaths = await findComponentDependencies(pagePaths);

  // Retourner les chemins des pages et des composants
  return [...pagePaths, ...componentPaths];
}
