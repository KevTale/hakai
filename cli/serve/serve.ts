import { compileKaiFile } from "@hakai/internal";
import { hmrClientScript, setupHMR } from "./hmr.ts";
import type { HakaiConfig } from "./types.ts";
import { resolvePagePath } from "./utils.ts";

export function serve(config: HakaiConfig) {
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

    const currentPath = resolvePagePath(pathname, config);
    const { content } = await compileKaiFile(currentPath);

    const indexHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <script src="/hmr-client.js"></script>
              <link rel="icon" type="image/x-icon" href="favicon.ico" />
            </head>
            <body>
              ${content}
            </body>
          </html>
        `;

    return new Response(indexHtml, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });
}
