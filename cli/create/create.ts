import { Input } from "@cliffy/prompt";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export async function create(
  options: { name?: string; withTailwind?: boolean },
) {
  const name = options.name ||
    await Input.prompt("What's the name of your app?");

  const appDir = join(Deno.cwd(), name);
  const featuresDir = join(appDir, "features");
  const homeDir = join(featuresDir, "home");

  await ensureDir(appDir);
  await ensureDir(featuresDir);
  await ensureDir(homeDir);

  const pagePath = join(homeDir, "page.kai");
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
  }
}`;

  await Deno.writeTextFile(pagePath, pageContent);
  await Deno.writeTextFile(denoJsonPath, denoJsonContent);

  console.log(`Created new app at ${appDir}`);
}
