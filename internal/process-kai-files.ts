import { parseSync } from "oxc-parser";

type TemplateValue = string | number | boolean | null;

export type ProcessedKaiFile = {
  content: string;
  script: string;
};

// Extract <template> and <script> from .kai file
async function extractContent(sourceFilename: string) {
  if (!sourceFilename.endsWith(".kai")) {
    throw new Error(
      `Invalid file extension. Expected .kai file but got: ${sourceFilename}`
    );
  }
  const content = await Deno.readTextFile(sourceFilename);

  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);

  return {
    template: templateMatch ? templateMatch[1].trim() : "",
    script: scriptMatch ? scriptMatch[1].trim() : "",
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

function prefixVariables(content: { template: string, script: string }, filename: string): { template: string, script: string } {
  const prefix = filename.replace(/[^a-zA-Z0-9]/g, '_');
  const variableNames = extractVariableNames(content.script);
  
  let modifiedScript = content.script;
  let modifiedTemplate = content.template.trim();
  
  // Vérifier si le template a un élément racine unique
  const hasRootElement = /^<[^>]+>[\s\S]*<\/[^>]+>$/.test(modifiedTemplate) 
    && !modifiedTemplate.match(/<[^>]+>/g)![1]?.startsWith('</');
  
  if (!hasRootElement) {
    // Wrapper le template dans un div si pas d'élément racine unique
    modifiedTemplate = `<div data-component-id="${prefix}">${modifiedTemplate}</div>`;
  } else {
    // Ajouter data-component-id au tag racine existant
    modifiedTemplate = modifiedTemplate.replace(
      /^(\s*<[^>]+)/,
      `$1 data-component-id="${prefix}"`
    );
  }
  
  // Préfixer les variables
  for (const varName of variableNames) {
    // Préfixe dans le script
    modifiedScript = modifiedScript.replace(
      new RegExp(`\\b${varName}\\b`, 'g'),
      `${prefix}_${varName}`
    );
    // Préfixe dans le template
    modifiedTemplate = modifiedTemplate.replace(
      new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'),
      `{{ ${prefix}_${varName} }}`
    );
  }
  
  return {
    template: modifiedTemplate,
    script: modifiedScript
  };
}

function buildContext(script: string): Record<string, TemplateValue> {
  const variableNames = extractVariableNames(script);
  const context: Record<string, TemplateValue> = {};

  for (const varName of variableNames) {
    const regex = new RegExp(`const\\s+${varName}\\s*=\\s*([^;]+);`);
    const match = script.match(regex);
    if (match) {
      try {
        context[varName] = JSON.parse(match[1]) as TemplateValue;
      } catch {
        console.warn(`Unsupported type for variable "${varName}"`);
      }
    }
  }

  return context;
}

function interpolateTemplate(
  template: string,
  context: Record<string, TemplateValue>
) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) => {
    if (context[varName] === undefined) {
      throw new Error(
        `Template variable "${varName}" is not defined in context`
      );
    }
    return String(context[varName]); // Convert value to string for interpolation
  });
}

export async function processKaiFiles(paths: string[]): Promise<ProcessedKaiFile> {
  if (paths.length === 0) {
    throw new Error("No paths provided to compile");
  }

  // Process parent file
  const parentContent = await extractContent(paths[0]);
  const parentFilename = paths[0].split('/').pop()?.replace('.page.kai', '') || '';
  const prefixedParent = prefixVariables(parentContent, parentFilename);
  const parentContext = buildContext(prefixedParent.script);
  
  if (paths.length === 1) {
    const content = interpolateTemplate(prefixedParent.template, parentContext);
    return {
      content,
      script: prefixedParent.script
    };
  }

  // Process child files
  let currentTemplate = prefixedParent.template;
  let mergedScript = prefixedParent.script;
  let mergedContext = parentContext;

  for (let i = 1; i < paths.length; i++) {
    const childContent = await extractContent(paths[i]);
    const childFilename = paths[i].split('/').pop()?.replace('.page.kai', '') || '';
    const prefixedChild = prefixVariables(childContent, childFilename);
    const childContext = buildContext(prefixedChild.script);

    currentTemplate = currentTemplate.replace("<slot />", prefixedChild.template);
    mergedContext = { ...mergedContext, ...childContext };
    mergedScript = `${mergedScript}\n${prefixedChild.script}`;
  }

  const content = interpolateTemplate(currentTemplate, mergedContext);

  return {
    content,
    script: mergedScript
  };
}
