import type { HakaiConfig } from "@hakai/core";
import { Command } from "@cliffy/command";
import { serve } from "./serve.ts";

async function loadHakaiConfig(): Promise<HakaiConfig> {
  try {
    const configPath = new URL("hakai.config.ts", `file://${Deno.cwd()}/`).href;
    const configModule = await import(configPath);
    return configModule.default;
  } catch (error) {
    console.error("Failed to load hakai.config.ts:", error);
    return {
      root: {
        scope: "home",
        page: "home"
      }
    };
  }
}

await new Command()
  .version("0.0.3")
  .description("Serve your Hakai app")
  .action(async () => {
    const config = await loadHakaiConfig();
    serve(config);
  })
  .parse(Deno.args);
