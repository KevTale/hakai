import { normalizePath, processKaiFiles } from "@hakai/internal";
import { relative } from "@std/path";
import type { ClientContext } from "./types.ts";
import { sendErrorMessage, sendUpdateMessage } from "./utils.ts";

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
      sendErrorMessage(client, new Error(`File ${modifiedPath} has been deleted`));
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

/**
 * Updates client context and sends new content
 */
async function updateClientContent(
  client: WebSocket,
  clientContexts: Map<WebSocket, ClientContext>,
  paths: string[]
) {
  try {
    const processedKaiFile = await processKaiFiles(paths);
    
    const previousContext = clientContexts.get(client);
    const shouldUpdate = !previousContext || 
      processedKaiFile.content !== previousContext.processedKaiFile.content;

    if (shouldUpdate) {
      sendUpdateMessage(client, processedKaiFile.content, processedKaiFile.script);
    }

    clientContexts.set(client, {
      processedKaiFile,
      paths,
    });
  } catch (error) {
    sendErrorMessage(client, error);
    
    clientContexts.set(client, {
      processedKaiFile: {
        content: `error-state-${Date.now()}`,
        script: '',
      },
      paths,
    });
  }
}
