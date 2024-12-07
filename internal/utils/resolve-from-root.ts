import { dirname, join, normalize } from "@std/path";

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