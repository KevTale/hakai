import { Command } from "@cliffy/command";
import { serve } from "./serve.ts";

await new Command()
  .version("0.0.2")
  .description("Serve your Hakai app")
  .action(serve)
  .parse(Deno.args);
