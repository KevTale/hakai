export function resolveFromRoot(path: string): URL {
  return new URL(path, new URL(import.meta.url));
}
