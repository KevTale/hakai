import { ensureDir, join, Input } from "../../../deps.ts";

// export async function createApp() {
//   const withTailwind = options.withTailwind ??
//     await Confirm.prompt("Do you want to include Tailwind CSS?");

//   console.log("\nGenerating app...");
//   console.log({ name, withTailwind });

//   console.log(
//     `Project '${name}' initialized with Tailwind: ${withTailwind}`,
//   );
// }

export async function create(
  options: { name?: string; withTailwind?: boolean },
) {
  const name = options.name ||
    await Input.prompt("What's the name of your app?");

  const appDir = join(".", name);
  await ensureDir(appDir);

  // Create src directory
  const srcDir = join(appDir, "src");
  await ensureDir(srcDir);

  // Create and write to index.html
  const indexPath = join(srcDir, "index.ts");
  const indexContent = `
    <template>
      <h1>Hello World</h1>
    </template>

    <script>
      
    </script>
  `;

  await Deno.writeTextFile(indexPath, indexContent);

  console.log(`Created new app at ${appDir}`);
}
