import { createHtmlFromTemplate } from "../component/compile.ts";

export function setupHMR(req: Request): Response {
  const clients = new Set<WebSocket>();

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    clients.add(socket);
    watchChanges(clients);
    console.log("Client connected");
  };

  socket.onclose = () => {
    clients.delete(socket);
    console.log("Client disconnected");
  };

  socket.onerror = (e) => {
    console.error("WebSocket error:", e);
  };

  return response;
}

async function watchChanges(clients: Set<WebSocket>) {
  const watcher = Deno.watchFs("./features");

  for await (const event of watcher) {
    if (event.kind === "modify") {
      for (const client of clients) {
        client.send(
          JSON.stringify({
            type: "saved",
            content: await createHtmlFromTemplate(event.paths[0]),
          }),
        );
      }
    }
  }
}
