import { normalize, join } from "@std/path";

/**
 * Resolves a path relative to the root of the project
 * by using the current module's URL as a reference point.
 * 
 * @param path The path to resolve
 * @returns A URL object pointing to the resolved path
 */
export function resolveFromRoot(path: string): URL {
  return new URL(path, new URL(import.meta.url));
}

/**
 * Normalizes a file path by:
 * 1. Correctly joining path segments
 * 2. Normalizing the path (resolving . and ..)
 * 3. Standardizing separators to forward slashes
 * 
 * @param segments The path segments to join
 * @returns The normalized path with forward slashes
 */
export function normalizePath(...segments: string[]): string {
  return normalize(join(...segments)).replace(/\\/g, "/");
}
