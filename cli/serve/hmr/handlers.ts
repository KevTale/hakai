import { normalizePath, processKaiFiles } from "@hakai/internal";
import { relative } from "@std/path";
import type { ClientContext, WebSocketMessage } from "./types.ts";

export async function handleUpdateFileSystem(
  event: Deno.FsEvent,
  clientContexts: Map<WebSocket, ClientContext>
) {
  const modifiedPath = normalizePath(relative(Deno.cwd(), event.paths[0]));

  for (const [client, context] of clientContexts.entries()) {
    if (
      context.paths.some((path) => {
        const normalizedPath = normalizePath(relative(Deno.cwd(), path));
        return (
          normalizedPath === modifiedPath ||
          normalizedPath.startsWith(modifiedPath)
        );
      })
    ) {
      await updateClientContent(client, clientContexts, context.paths);
    }
  }
}

export function handleRemoveFileSystem(
  event: Deno.FsEvent,
  clientContexts: Map<WebSocket, ClientContext>
) {
  const modifiedPath = normalizePath(relative(Deno.cwd(), event.paths[0]));

  for (const [client, context] of clientContexts.entries()) {
    if (context.paths.includes(modifiedPath)) {
      sendClientMessage(client, {
        type: "error",
        payload: {
          message: `File ${modifiedPath} has been deleted`,
        },
      });
    }
  }
}

export async function handleRenameFileSystem(
  event: Deno.FsEvent,
  clientContexts: Map<WebSocket, ClientContext>
) {
  const oldPath = normalizePath(relative(Deno.cwd(), event.paths[0]));
  const newPath = event.paths[1] ? normalizePath(relative(Deno.cwd(), event.paths[1])) : null;

  for (const [client, context] of clientContexts.entries()) {
    const affectedPath = context.paths.find(
      (path) => normalizePath(relative(Deno.cwd(), path)) === oldPath
    );

    if (affectedPath && newPath) {
      const updatedPaths = context.paths.map((p) =>
        p === affectedPath ? newPath : p
      );

      await updateClientContent(client, clientContexts, updatedPaths);
    }
  }
}

//#region Utils

/**
 * Sends a message to a client if the connection is open
 */
function sendClientMessage(client: WebSocket, message: WebSocketMessage) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

/**
 * Creates an error message for the client
 */
function createErrorMessage(error: unknown): WebSocketMessage {
  return {
    type: "error",
    payload: {
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
    },
  };
}

/**
 * Updates client context and sends new content
 */
async function updateClientContent(
  client: WebSocket,
  clientContexts: Map<WebSocket, ClientContext>,
  paths: string[]
) {
  try {
    const newProcessedKaiFile = await processKaiFiles(paths);
    const context = clientContexts.get(client);

    if (
      context &&
      newProcessedKaiFile.content !== context.processedKaiFile.content
    ) {
      clientContexts.set(client, {
        processedKaiFile: newProcessedKaiFile,
        paths,
      });

      sendClientMessage(client, {
        type: "update",
        payload: {
          content: newProcessedKaiFile.content,
          script: newProcessedKaiFile.script,
        },
      });
    }
  } catch (error) {
    sendClientMessage(client, createErrorMessage(error));
  }
}

//#endregion
