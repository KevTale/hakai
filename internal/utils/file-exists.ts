import { catchError } from "./catch-error.ts";

/**
 * Checks if a file exists at the given path
 */
export async function fileExists(path: string): Promise<boolean> {
  const [error, stat] = await catchError(Deno.stat(path));
  if (error) return false;
  return stat.isFile;
} 