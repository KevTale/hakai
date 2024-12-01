async function validateUniquePageNames() {
  const pageNames = new Map<string, string>(); // pageName -> scopeName

  for await (const scope of Deno.readDir("./scopes")) {
    if (!scope.isDirectory) continue;

    for await (const entry of Deno.readDir(`./scopes/${scope.name}`)) {
      if (!entry.isFile || !entry.name.endsWith(".page.kai")) continue;

      const pageName = entry.name.replace(".page.kai", "");

      if (pageNames.has(pageName)) {
        throw new Error(
          `Duplicate page name "${pageName}" found in scopes "${
            scope.name
          }" and "${pageNames.get(pageName)}". ` +
            `Page names must be unique across all scopes.`
        );
      }

      pageNames.set(pageName, scope.name);
    }
  }
}

export async function canBuild() {
  await validateUniquePageNames();
}
