import { join, normalize } from "@std/path";

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