import type { HakaiConfig } from "@hakai/core";

export async function loadHakaiConfig(): Promise<HakaiConfig> {
    try {
      const configPath = new URL("hakai.config.ts", `file://${Deno.cwd()}/`).href;
      const configModule = await import(configPath);
      
      if (!configModule.default) {
        throw new Error("hakai.config.ts must export a default configuration");
      }
      
      return configModule.default;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.warn("No hakai.config.ts found, using default configuration");
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error loading hakai.config.ts:", errorMessage);
      }
      return {
        root: {
          scope: "home",
          page: "home"
        }
      };
    }
  }