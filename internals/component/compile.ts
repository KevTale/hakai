import { parseSync } from "oxc-parser";

type TemplateValue = string | number | boolean | null;

// Extract <template> and <script> from .kai file
async function extractContent(sourceFilename: string) {
  if (!sourceFilename.endsWith(".kai")) {
    throw new Error(
      `Invalid file extension. Expected .kai file but got: ${sourceFilename}`,
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

// Parse script and build context
function buildContext(script: string): Record<string, TemplateValue> {
  const p = parseSync(script, { sourceFilename: "inline-script" });
  const context: Record<string, TemplateValue> = {};

  for (const stmt of p.program.body) {
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (decl.id.type === "Identifier") {
          const varName = decl.id.name;
          const init = decl.init;

          if (init && init.type === "Literal") {
            context[varName] = init.value as TemplateValue;
          } else {
            console.warn(
              `Unsupported type for variable "${varName}" with init.type "${init?.type}"`,
            );
          }
        }
      }
    }
  }

  return context;
}

// Replace variables in template
function interpolateTemplate(
  template: string,
  context: Record<string, TemplateValue>,
) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) => {
    if (context[varName] === undefined) {
      throw new Error(
        `Template variable "${varName}" is not defined in context`,
      );
    }
    return String(context[varName]); // Convert value to string for interpolation
  });
}

export async function createHtmlFromTemplate(
  sourceFilename: string,
): Promise<string> {
  const { template, script } = await extractContent(sourceFilename);
  const context = buildContext(script);
  return interpolateTemplate(template, context);
}
