import type { HakaiConfig } from "@hakai/core";
import { normalizePath } from "@hakai/internal";

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
 * 
 * @param urlPath The URL path to resolve (e.g., "/dashboard/users")
 * @param config The Hakai configuration object
 * @returns An array of file paths for the matching .kai page files
 * @throws Error if no matching pages are found
 */
export async function resolvePagePath(
  urlPath: string,
  config: HakaiConfig
): Promise<string[]> {

  const isRoot = urlPath === "/";
  if (isRoot) {
    return [normalizePath("scopes", config.root.scope, `${config.root.page}.page.kai`)];
  }

  // eg. /dashboard/overview/ -> ["dashboard", "overview"]
  const segments = urlPath.slice(1).split('/').filter(segment => segment !== '');

   // looping on each scope folder
   for await (const scope of Deno.readDir("./scopes")) {
    if (!scope.isDirectory) continue;

    try {
      const paths: string[] = [];
      let currentName = segments[0];
      
      for (let i = 0; i < segments.length; i++) {
        const pagePath = normalizePath("scopes", scope.name, `${currentName}.page.kai`);

        const pageExists = await Deno.stat(pagePath);
        if (!pageExists.isFile) continue;
        
        paths.push(pagePath);
        
        if (i < segments.length - 1) {
          currentName = `${currentName}_${segments[i + 1]}`;
        }
      }

      if (paths.length === segments.length) {
        return paths;
      }
    } catch {
      continue;
    }
  }

  throw new Error(`No page found for path: ${urlPath}`);
}