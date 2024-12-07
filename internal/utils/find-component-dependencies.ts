import { dirname } from "@std/path";
import { fileExists } from "./file-exists.ts";
import { normalizePath } from "./normalize-path.ts";

/**
 * Analyse un fichier .kai pour trouver les imports de composants
 */
export async function findComponentDependencies(
  pagePaths: string[],
): Promise<string[]> {
  const componentPaths = new Set<string>();
  const processedFiles = new Set<string>();

  async function processFile(filePath: string) {
    if (processedFiles.has(filePath)) return;
    processedFiles.add(filePath);

    const content = await Deno.readTextFile(filePath);
    const importRegex = /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const components = match[1].split(",").map((c) => c.trim());
      const importPath = match[2];

      for (const component of components) {
        // Essayer d'abord de résoudre relativement au fichier courant
        let componentPath = normalizePath(
          dirname(filePath),
          `${importPath}.component.kai`,
        );

        // Si le fichier n'existe pas, essayer dans le design system
        if (!await fileExists(componentPath)) {
          componentPath = normalizePath(
            Deno.cwd(),
            "design-system/components",
            `${importPath}.component.kai`,
          );
        }

        if (await fileExists(componentPath)) {
          componentPaths.add(componentPath);
          // Récursivement chercher les dépendances du composant
          await processFile(componentPath);
        }
      }
    }
  }

  // Traiter chaque page
  for (const pagePath of pagePaths) {
    await processFile(pagePath);
  }

  return Array.from(componentPaths);
} 