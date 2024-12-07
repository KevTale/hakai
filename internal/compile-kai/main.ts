import { dirname, join } from "@std/path";
import { parseSync } from "oxc-parser";

type TemplateValue = string | number | boolean | null;

export type ProcessedKaiFile = {
  content: string;
  script: string;
};

type KaiContent = {
  template: string;
  script: string;
  style: string;
};

type ComponentScope =
  | {
    type: "component";
    scope: string;
  }
  | {
    type: "page";
  };

const SLOT_REGEX = /<Slot\s*\/?>.*?<\/Slot>|<Slot\s*\/?>/g;

// paths = ["scopes/admin/dashboard.page.kai", "scopes/admin/dashboard_users.page.kai"]
export async function processKaiFiles(
  paths: string[],
): Promise<ProcessedKaiFile> {
  if (paths.length === 0) {
    throw new KaiProcessError("No paths provided to compile");
  }

  // Process parent file
  const parentPath = paths[0];
  const parentSections = await parseKaiSections(parentPath);

  // Resolve and process components
  const scopePath = dirname(parentPath);
  const components = await resolveComponents(
    parentSections.template,
    scopePath,
  );

  // Merge component scripts with parent
  let finalTemplate = parentSections.template;
  let finalScript = parentSections.script;
  let finalStyle = parentSections.style;

  for (const component of components) {
    const componentRegex = new RegExp(`<${component.name}\\s*\\/?>`, "gi");
    finalTemplate = finalTemplate.replace(componentRegex, component.template);
    finalScript += "\n" + component.script;
    finalStyle += "\n" + component.style;
  }

  parentSections.template = finalTemplate;
  parentSections.script = finalScript;
  parentSections.style = finalStyle;

  const parentFilename = parentPath.split("/").pop()?.replace(".page.kai", "") || "";
  const parentVariables = extractVariableNames(parentSections.script);
  const prefixedParent = prefixVariables(
    parentSections,
    parentFilename,
    parentVariables,
    { type: "page" },
  );
  const parentContext = buildContext(
    prefixedParent.script,
    parentVariables,
    parentFilename,
  );

  if (paths.length === 1) {
    const template = prefixedParent.template.replace(SLOT_REGEX, "");
    return {
      content: interpolateTemplate(template, parentContext, parentFilename),
      script: prefixedParent.script,
    };
  }

  // Process child files
  let currentTemplate = prefixedParent.template;
  let mergedScript = prefixedParent.script;
  let mergedContext = parentContext;

  for (let i = 1; i < paths.length; i++) {
    const childContent = await parseKaiSections(paths[i]);

    // Résoudre les composants pour la page enfant
    const childScopePath = dirname(paths[i]);
    const childComponents = await resolveComponents(
      childContent.template,
      childScopePath,
    );

    // Traiter les composants de la page enfant
    let childTemplate = childContent.template;
    let childScript = childContent.script;
    let childStyle = childContent.style;

    for (const component of childComponents) {
      const componentRegex = new RegExp(`<${component.name}\\s*\\/?>`, "gi");
      childTemplate = childTemplate.replace(componentRegex, component.template);
      childScript += "\n" + component.script;
      childStyle += "\n" + component.style;
    }

    childContent.template = childTemplate;
    childContent.script = childScript;
    childContent.style = childStyle;

    // Continuer avec le traitement existant
    const childVariables = extractVariableNames(childContent.script);
    const childFilename = paths[i].split("/").pop()?.replace(".page.kai", "") ||
      "";
    const prefixedChild = prefixVariables(
      childContent,
      childFilename,
      childVariables,
      { type: "page" },
    );
    const childContext = buildContext(
      prefixedChild.script,
      childVariables,
      childFilename,
    );

    currentTemplate = currentTemplate.replace(
      /<Slot\s*\/?>/g,
      prefixedChild.template,
    );
    mergedContext = { ...mergedContext, ...childContext };
    mergedScript = `${mergedScript}\n${prefixedChild.script}`;
  }

  return {
    content: interpolateTemplate(
      currentTemplate,
      mergedContext,
      parentFilename,
    ),
    script: mergedScript,
  };
}

// Extract <template>, <script> and <style>
async function parseKaiSections(sourceFilename: string) {
  if (!sourceFilename.endsWith(".kai")) {
    throw new Error(
      `Invalid file extension. Expected .kai file but got: ${sourceFilename}`,
    );
  }
  const content = await Deno.readTextFile(sourceFilename);

  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  return {
    template: templateMatch ? templateMatch[1].trim() : "",
    script: scriptMatch ? scriptMatch[1].trim() : "",
    style: styleMatch ? styleMatch[1].trim() : "",
  };
}

function extractVariableNames(script: string): string[] {
  const p = parseSync(script, { sourceFilename: "inline-script" });
  const variableNames: string[] = [];

  for (const stmt of p.program.body) {
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (decl.id.type === "Identifier") {
          variableNames.push(decl.id.name);
        }
      }
    }
  }

  return variableNames;
}

function prefixVariables(
  content: KaiContent,
  filename: string,
  variables: string[],
  scope: ComponentScope,
): KaiContent {
  const snakeCaseFilename = filename.replace(/[^a-zA-Z0-9]/g, "_");

  let modifiedScript = content.script;
  let modifiedTemplate = content.template.trim();

  // Modifier l'attribut data selon le type
  modifiedTemplate = modifiedTemplate.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g,
    (match, tag, attributes) => {
      if (tag === "Slot") {
        return match;
      }

      if (scope.type === "component") {
        // Si c'est un composant global, on met juste le nom du composant
        // Sinon on préfixe avec le scope
        const componentAttr = scope.scope === "global" ? snakeCaseFilename : `${scope.scope}/${snakeCaseFilename}`;
        return `<${tag}${attributes} data-component="${componentAttr}">`;
      }
      return `<${tag}${attributes} data-page="${snakeCaseFilename}">`;
    },
  );

  // Préfixer les variables
  for (const varName of variables) {
    const prefix = scope.type === "component" ? `${scope.scope}_${snakeCaseFilename}` : snakeCaseFilename;

    // Préfixe dans le script
    modifiedScript = modifiedScript.replace(
      new RegExp(`\\b${varName}\\b`, "g"),
      `${prefix}_${varName}`,
    );
    // Préfixe dans le template
    modifiedTemplate = modifiedTemplate.replace(
      new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, "g"),
      `{{ ${prefix}_${varName} }}`,
    );
  }

  return {
    template: modifiedTemplate,
    script: modifiedScript,
    style: content.style,
  };
}

function buildContext(
  script: string,
  variables: string[],
  prefix: string,
): Record<string, TemplateValue> {
  const context: Record<string, TemplateValue> = {};

  for (const varName of variables) {
    const prefixedVarName = `${prefix}_${varName}`;
    const regex = new RegExp(`const\\s+${prefixedVarName}\\s*=\\s*([^;]+);`);
    const match = script.match(regex);
    if (match) {
      try {
        context[prefixedVarName] = JSON.parse(match[1]) as TemplateValue;
      } catch {
        console.warn(`Unsupported type for variable "${prefixedVarName}"`);
      }
    }
  }

  return context;
}

function interpolateTemplate(
  template: string,
  context: Record<string, TemplateValue>,
  filename: string,
): string {
  let result = template;
  const matches = template.match(/\{\{\s*(\w+)\s*\}\}/g);

  if (!matches) {
    return template;
  }

  for (const match of matches) {
    const varName = match.match(/\{\{\s*(\w+)\s*\}\}/)?.[1];
    if (!varName) continue;

    if (context[varName] === undefined) {
      const offset = template.indexOf(match);
      const lines = template.slice(0, offset).split("\n");
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      throw new KaiProcessError(
        `Template variable "${varName}" is not defined`,
        filename,
        line,
        column,
      );
    }

    result = result.replace(match, String(context[varName]));
  }

  return result;
}

async function resolveComponents(
  template: string,
  scopePath: string,
): Promise<(KaiContent & { name: string })[]> {
  const components: (KaiContent & { name: string })[] = [];
  const scopeName = scopePath.split("/").pop() || "";

  // Ne matcher que les tags qui commencent par une majuscule
  const componentMatches = Array.from(
    template.matchAll(/<([A-Z][a-zA-Z]*)(\/?>|\s[^>]*>)/g),
  ).filter((match) => match[1] !== "Slot");

  for (const match of componentMatches) {
    const componentName = match[1].toLowerCase();
    const localComponentPath = join(
      scopePath,
      `${componentName}.component.kai`,
    );
    const globalComponentPath = join(
      "design-system/components",
      `${componentName}.component.kai`,
    );

    let validComponentPath: string | undefined;

    try {
      await Deno.stat(localComponentPath);
      validComponentPath = localComponentPath;
    } catch {
      try {
        await Deno.stat(globalComponentPath);
        validComponentPath = globalComponentPath;
      } catch {
        throw new KaiProcessError(
          `Component ${componentName} not found in local scope (${localComponentPath}) or global scope (${globalComponentPath})`,
        );
      }
    }

    try {
      const content = await parseKaiSections(validComponentPath);
      const componentVariables = extractVariableNames(content.script);

      // Déterminer si le composant est local ou global
      const isLocal = validComponentPath === localComponentPath;

      const prefixedContent = prefixVariables(
        content,
        componentName,
        componentVariables,
        {
          type: "component",
          scope: isLocal ? scopeName : "global",
        },
      );

      components.push({
        ...prefixedContent,
        name: componentName,
      });
    } catch (error: unknown) {
      throw new KaiProcessError(
        `Failed to parse component ${componentName} at ${validComponentPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return components;
}

export class KaiProcessError extends Error {
  constructor(
    message: string,
    public file?: string,
    public line?: number,
    public column?: number,
  ) {
    super(message);
    this.name = "KaiProcessError";
  }
}
