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

// paths = ["scopes/admin/dashboard.page.kai", "scopes/admin/dashboard_users.page.kai"]
export async function processKaiFiles(paths: string[]): Promise<ProcessedKaiFile> {
  if (paths.length === 0) {
    throw new KaiProcessError("No paths provided to compile");
  }

  // Process parent file
  const parentPath = paths[0];
  const parentSections = await parseKaiSections(parentPath);
  const parentFilename = parentPath.split('/').pop()?.replace('.page.kai', '') || '';
  const parentVariables = extractVariableNames(parentSections.script);
  const prefixedParent = prefixVariables(parentSections, parentFilename, parentVariables);
  const parentContext = buildContext(prefixedParent.script, parentVariables, parentFilename);
  
  if (paths.length === 1) {
    const template = prefixedParent.template.replace(/<slot\s*\/?>.*?<\/slot>|<slot\s*\/?>/g, '');
    return {
      content: interpolateTemplate(template, parentContext, parentFilename),
      script: prefixedParent.script
    };
  }

  // Process child files
  let currentTemplate = prefixedParent.template;
  let mergedScript = prefixedParent.script;
  let mergedContext = parentContext;

  for (let i = 1; i < paths.length; i++) {
    const childContent = await parseKaiSections(paths[i]);
    const childVariables = extractVariableNames(childContent.script);
    const childFilename = paths[i].split('/').pop()?.replace('.page.kai', '') || '';
    const prefixedChild = prefixVariables(childContent, childFilename, childVariables);
    const childContext = buildContext(prefixedChild.script, childVariables, childFilename);

    currentTemplate = currentTemplate.replace("<slot />", prefixedChild.template);
    mergedContext = { ...mergedContext, ...childContext };
    mergedScript = `${mergedScript}\n${prefixedChild.script}`;
  }

  return {
    content: interpolateTemplate(currentTemplate, mergedContext, parentFilename),
    script: mergedScript
  };
}

// Extract <template>, <script> and <style> 
async function parseKaiSections(sourceFilename: string) {
  if (!sourceFilename.endsWith(".kai")) {
    throw new Error(
      `Invalid file extension. Expected .kai file but got: ${sourceFilename}`
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

function prefixVariables(content: KaiContent, filename: string, variables: string[]): KaiContent {
  const snakeCaseFilename = filename.replace(/[^a-zA-Z0-9]/g, '_');
  
  let modifiedScript = content.script;
  let modifiedTemplate = content.template.trim();
  
  // Ajouter data-page sur chaque nœud sauf les slots
  modifiedTemplate = modifiedTemplate.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g,
    (match, tag, attributes) => {
      // Ne pas ajouter data-page aux slots
      if (tag.toLowerCase() === 'slot') {
        return match;
      }
      return `<${tag}${attributes} data-page="${snakeCaseFilename}">`;
    }
  );
  
  // Préfixer les variables
  for (const varName of variables) {
    // Préfixe dans le script
    modifiedScript = modifiedScript.replace(
      new RegExp(`\\b${varName}\\b`, 'g'),
      `${snakeCaseFilename}_${varName}`
    );
    // Préfixe dans le template
    modifiedTemplate = modifiedTemplate.replace(
      new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'),
      `{{ ${snakeCaseFilename}_${varName} }}`
    );
  }
  
  return {
    template: modifiedTemplate,
    script: modifiedScript,
    style: content.style
  };
}

function buildContext(script: string, variables: string[], prefix: string): Record<string, TemplateValue> {
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
  filename: string
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
      const lines = template.slice(0, offset).split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      throw new KaiProcessError(
        `Template variable "${varName}" is not defined`,
        filename,
        line,
        column
      );
    }

    result = result.replace(match, String(context[varName]));
  }

  return result;
}

export class KaiProcessError extends Error {
  constructor(
    message: string,
    public file?: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'KaiProcessError';
  }
}


