import type { HakaiConfig } from "@hakai/core";
import { catchError, toErrorMessage } from "@hakai/internal";

export async function loadHakaiConfig(): Promise<HakaiConfig> {
  const configPath = new URL("hakai.config.ts", `file://${Deno.cwd()}/`).href;

  const [error, hakaiConfig] = await catchError(import(configPath));

  /*
   * Probably a file not found error
   */
  if (error) {
    throw new Error(`Error loading hakai.config.ts: ${toErrorMessage(error)}`);
  }

  if (!hakaiConfig.default) {
    throw new Error("hakai.config.ts must export a default configuration");
  }

  return hakaiConfig.default;
}
