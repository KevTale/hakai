import { ensureDir, ensureFile } from "@std/fs";
import { join } from "@std/path";
import { Input } from "@cliffy/prompt";

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
  const indexPath = join(srcDir, "index.html");
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`;

  await Deno.writeTextFile(indexPath, indexContent);

  console.log(`Created new app at ${appDir}`);
}
