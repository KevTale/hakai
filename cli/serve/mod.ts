import { resolveFromRoot } from "#utils";
import { setupHMR } from "#core";
import { buildApp } from "./build-app.ts";

Deno.serve(async (req: Request) => {
  const { pathname } = new URL(req.url);

  if (pathname === "/hmr-client.js") {
    const hmrScript = await Deno.readTextFile(
      resolveFromRoot("hmr/hmr-client.js")
    );
    return new Response(hmrScript, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  if (pathname === "/hmr") {
    return setupHMR.setup(req);
  }

  if (pathname !== "/") return new Response("not found", { status: 404 });

  const html = await buildApp("./features/home/page.kai");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
});
