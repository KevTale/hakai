import type { HakaiConfig } from "@hakai/core";
import { canBuild } from "@hakai/internal";
import { hmrClientScript, setupHMR } from "./hmr/mod.ts";

export async function serve(config: HakaiConfig) {
  await canBuild();

  Deno.serve(async (req: Request) => {
    const { pathname } = new URL(req.url);

    if (pathname === "/favicon.ico") {
      const favicon = await Deno.readFile("favicon.ico");
      return new Response(favicon, {
        headers: { "content-type": "image/x-icon" },
      });
    }

    if (pathname === "/hmr-client.js") {
      return new Response(hmrClientScript, {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    }

    if (pathname === "/hmr") {
      return setupHMR(req, config);
    }

    return new Response(
      `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="/hmr-client.js"></script>
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    </head>
    <body></body>
  </html>
`,
      {
        headers: { "content-type": "text/html; charset=utf-8" },
      }
    );
  });
}
