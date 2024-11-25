import {
  createHtmlFromTemplate,
  hmrClientScript,
  setupHMR,
} from "@hakai/internals";

export function serve() {
  Deno.serve(async (req: Request) => {
    const { pathname } = new URL(req.url);

    if (pathname === "/hmr-client.js") {
      return new Response(hmrClientScript, {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    }

    if (pathname === "/hmr") {
      return setupHMR(req);
    }

    if (pathname !== "/") return new Response("not found", { status: 404 });

    const html = await createHtmlFromTemplate("./features/home/page.kai");

    const indexHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <script src="/hmr-client.js"></script>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `;

    return new Response(indexHtml, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });
}
