import { Command } from "../../../deps.ts";
import { create } from "./create.ts";

await new Command()
  .name("init")
  .version("1.0.0")
  .description("A CLI to initialize your Hakai app")
  .option("-n, --name <name:string>", "Name of the app")
  .option(
    "-t, --tailwind",
    "Include Tailwind CSS",
  )
  .action(create)
  .parse(Deno.args);
