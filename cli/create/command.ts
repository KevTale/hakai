import { Command } from "@cliffy/command";
import { create } from "./create.ts";

await new Command()
  .version("0.0.2")
  .description("Create a new Hakai app")
  .option("-n, --name <name:string>", "Name of the app")
  .option(
    "-t, --tailwind",
    "Include Tailwind CSS",
  )
  .action(create)
  .parse(Deno.args);
