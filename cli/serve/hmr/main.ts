import type { HakaiConfig } from "@hakai/core";
import { catchError, processKaiFiles } from "@hakai/internal";
import { resolvePagePath } from "../utils/mod.ts";
import type { ClientContext } from "./types.ts";
import { sendErrorMessage, sendUpdatedContentToClient } from "./send-messages-to-client.ts";
import { handleRemoveFileSystem, handleRenameFileSystem, handleUpdateFileSystem } from "./fs-handlers.ts";

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

  // client sent a message
  socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "init") {
      const [errorPaths, paths] = await catchError(resolvePagePath(data.path, config));
      if (errorPaths) {
        sendErrorMessage(socket, errorPaths);
        return;
      }

      const [errorKai, processedKaiFile] = await catchError(processKaiFiles(paths));
      if (errorKai) {
        sendErrorMessage(socket, errorKai);
        return;
      }

      clientContexts.set(socket, {
        processedKaiFile,
        paths,
      });

      // Send initial content to client
      sendUpdatedContentToClient(
        socket,
        processedKaiFile.content,
        processedKaiFile.script,
      );

      // Set up file watching for first client
      if (clientContexts.size === 1) {
        watcher = setupAppFileSystemWatcher(clientContexts);
      }
    }
  };

  // Clean up on connection close/error
  socket.onclose = () => handleSocketClosure(socket, watcher, clientContexts);
  socket.onerror = () => handleSocketClosure(socket, watcher, clientContexts);

  return response;
}

/**
 * Handles WebSocket connection closure.
 * Cleans up client context and file watcher if last client.
 *
 * @param socket - The WebSocket connection that's closing
 * @param watcher - The file system watcher to clean up
 */
function handleSocketClosure(
  socket: WebSocket,
  watcher: Deno.FsWatcher | null,
  clientContexts: Map<WebSocket, ClientContext>,
) {
  clientContexts.delete(socket);
  if (clientContexts.size === 0 && watcher) {
    watcher.close();
    watcher = null;
  }
}

/**
 * Sets up file system watching and handles file system events
 */
function setupAppFileSystemWatcher(clientContexts: Map<WebSocket, ClientContext>): Deno.FsWatcher {
  const watcher = Deno.watchFs("./scopes");
  let debounceTimer: number | null = null;

  (async () => {
    for await (const event of watcher) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
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
      }, 100);
    }
  })();

  return watcher;
}
