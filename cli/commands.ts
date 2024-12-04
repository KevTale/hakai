import { Command } from "@cliffy/command";

const command = new Command()
  .name("hakai")
  .version("0.0.6")
  .description("Hakai CLI")
  // Create command
  .command("create", "Create a new Hakai app")
  .option("-n, --name <name:string>", "Name of the app")
  .option("-t, --tailwind", "Include Tailwind CSS")
  .action(async (options) => {
    const { create } = await import("./create/create.ts");
    await create(options);
  })
  // Serve command
  .command("serve", "Serve your Hakai app")
  .action(async () => {
    const { serve } = await import("./serve/serve.ts");
    const { loadHakaiConfig } = await import("./serve/load-hakai-config.ts");
    const config = await loadHakaiConfig();
    await serve(config);
  });

// Show help by default if no args provided
if (Deno.args.length === 0) {
  command.showHelp();
} else {
  await command.parse(Deno.args);
}
