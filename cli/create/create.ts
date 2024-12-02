import { Input } from "@cliffy/prompt";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export async function create(
  options: { name?: string; withTailwind?: boolean },
) {
  const name = options.name ||
    await Input.prompt("What's the name of your app?");

  const appDir = join(Deno.cwd(), name);
  const scopesDir = join(appDir, "scopes");
  const homeDir = join(scopesDir, "home");

  await ensureDir(appDir);
  await ensureDir(scopesDir);
  await ensureDir(homeDir);

  const pagePath = join(homeDir, "home.page.kai");
  const pageContent = `
    <template>
      <h1>Hello {{ name }}</h1>
    </template>

    <script>
      const name = "Hakai";
    </script>
  `;

  const denoJsonPath = join(appDir, "deno.json");
  const denoJsonContent = `{
    "tasks": {
      "serve": "deno run -A -r https://raw.githubusercontent.com/KevTale/hakai/refs/heads/main/serve/mod.ts"
    },
    "imports": {
      "@hakai/core": "jsr:@hakai/core@0.0.5"
    }
  }`;

  const hakaiConfigPath = join(appDir, "hakai.config.ts");
  const hakaiConfigContent = `
import { hakaiConfig } from "@hakai/core";

export default hakaiConfig({
  root: {
    scope: "home",
    page: "home",
  },
});
`;

  const faviconPath = join(appDir, "favicon.ico");
  const faviconContent = new Uint8Array([
    0,0,1,0,1,0,16,16,0,0,1,0,32,0,68,3,
    0,0,22,0,0,0,40,0,0,0,16,0,0,0,32,0,
    0,0,1,0,32,0,0,0,0,0,0,3,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
  ]); 

  await Deno.writeTextFile(pagePath, pageContent);
  await Deno.writeTextFile(denoJsonPath, denoJsonContent);
  await Deno.writeTextFile(hakaiConfigPath, hakaiConfigContent);
  await Deno.writeFile(faviconPath, faviconContent);

  console.log(`Created new app at ${appDir}`);
}
