import type { HakaiConfig } from "@hakai/core";
import { processKaiFiles } from "@hakai/internal";
import { resolvePagePath } from "../utils.ts";
import type { ClientContext, WebSocketMessage } from "./types.ts";
import { handleUpdateFileSystem, handleRemoveFileSystem, handleRenameFileSystem } from "./handlers.ts";

/**
 * Sets up Hot Module Replacement for a client connection.
 * This function:
 * 1. Establishes WebSocket connection
 * 2. Manages client contexts
 * 3. Handles file system watching
 * 4. Coordinates updates between file system and clients
 * 
 * @param req - The incoming HTTP request to upgrade to WebSocket
 * @param config - Hakai framework configuration
 * @returns WebSocket upgrade response
 */
export default function setupHMR(req: Request, config: HakaiConfig): Response {
  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientContexts = new Map<WebSocket, ClientContext>();

  let watcher: Deno.FsWatcher | null = null;

  socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "init") {
      // Resolve and process initial page content
      const paths = await resolvePagePath(data.path, config);
      const processedKaiFile = await processKaiFiles(paths);

      // Store client context
      clientContexts.set(socket, {
        processedKaiFile,
        paths,
      });

      // Send initial content to client
      const initMessage: WebSocketMessage = {
        type: "update",
        payload: {
          content: processedKaiFile.content,
          script: processedKaiFile.script,
        }
      };
      socket.send(JSON.stringify(initMessage));

      // Set up file watching for first client
      if (clientContexts.size === 1) {
        watcher = Deno.watchFs("./scopes");
        for await (const event of watcher) {
          // Route file system events to appropriate handlers
          switch (event.kind) {
            case "modify":
            case "create":
              await handleUpdateFileSystem(event, clientContexts);
              break;
            case "remove":
              handleRemoveFileSystem(event, clientContexts);
              break;
            case "rename":
              await handleRenameFileSystem(event, clientContexts);
              break;
          }
        }
      }
    }
  };

  // Clean up on connection close/error
  socket.onclose = () => handleSocketClosure(socket, watcher);
  socket.onerror = () => handleSocketClosure(socket, watcher);

  /**
   * Handles WebSocket connection closure.
   * Cleans up client context and file watcher if last client.
   * 
   * @param socket - The WebSocket connection that's closing
   * @param watcher - The file system watcher to clean up
   */
  function handleSocketClosure(
    socket: WebSocket,
    watcher: Deno.FsWatcher | null
  ) {
    // Remove client context
    clientContexts.delete(socket);
    // Clean up watcher if last client disconnects
    if (clientContexts.size === 0 && watcher) {
      watcher.close();
      watcher = null;
    }
  }

  return response;
} 