import { dirname, fromFileUrl, join } from "@std/path";
import { transform } from "oxc-transform";

const projectRoot = dirname(fromFileUrl(import.meta.url));

async function buildHmr() {
  // read
  const hmrPath = join(projectRoot, "hmr", "hmr-client.ts");
  const sourceCode = await Deno.readTextFile(hmrPath);

  // transform
  const transformed = transform(hmrPath, sourceCode, {
    typescript: {
      onlyRemoveTypeImports: true,
    },
  });

  // write
  const outputPath = join(projectRoot, "hmr", "hmr-client.js");
  await Deno.writeTextFile(outputPath, transformed.code);

  console.log("✅ HMR client compiled successfully");
}

try {
  await buildHmr();
} catch (error) {
  console.error("❌ Build failed:", error);
  Deno.exit(1);
} 