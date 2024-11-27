import { normalize, relative } from "@std/path";
import { type PageContext, compileKaiFile } from "@hakai/internal";
import type { HakaiConfig } from "./types.ts";
import { resolvePagePath } from "./utils.ts";

const clientContexts = new Map<WebSocket, PageContext>();

export function setupHMR(req: Request, config: HakaiConfig): Response {
  const { socket, response } = Deno.upgradeWebSocket(req);
  let watcher: Deno.FsWatcher | null = null;

  socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "init") {
      const filePath = resolvePagePath(data.path, config);
      const context = await compileKaiFile(filePath);
      clientContexts.set(socket, context);
      if (clientContexts.size === 1) {
        watcher = Deno.watchFs("./features");
        await sendNewContent(watcher);
      }
    }
  };

  socket.onclose = () => handleSocketClosure(socket, watcher);
  socket.onerror = () => handleSocketClosure(socket, watcher);

  function handleSocketClosure(
    socket: WebSocket,
    watcher: Deno.FsWatcher | null
  ) {
    clientContexts.delete(socket);
    if (clientContexts.size === 0 && watcher) {
      watcher.close();
      watcher = null;
    }
  }

  return response;
}

async function sendNewContent(watcher: Deno.FsWatcher) {
  for await (const event of watcher) {
    if (event.kind === "modify") {
      const modifiedPath =
        "./" +
        normalize(relative(Deno.cwd(), event.paths[0])).replace(/\\/g, "/");

      for (const [client, context] of clientContexts.entries()) {
        if (modifiedPath === context.currentPath) {
          const newContext = await compileKaiFile(modifiedPath);

          if (newContext.content !== context.content) {
            clientContexts.set(client, newContext);

            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "saved",
                  content: newContext.content,
                })
              );
            }
          }
        }
      }
    }
  }
}

export const hmrClientScript = `
const ws = new WebSocket("ws://" + location.host + "/hmr");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "init",
    path: window.location.pathname
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "saved") {
    document.body.innerHTML = data.content;
  }
};
`;
