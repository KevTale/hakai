import type { WebSocketMessage } from "./types.ts";
import { KaiProcessError } from "@hakai/internal";

/**
 * Sends a message to a client if the connection is open
 */
export function sendClientMessage(
  client: WebSocket,
  message: WebSocketMessage
) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

/**
 * Sends an error message to the client
 */
export function sendErrorMessage(client: WebSocket, error: unknown) {
  function formatErrorMessage(error: unknown): string {
    if (
      error instanceof KaiProcessError &&
      error.file &&
      error.line &&
      error.column
    ) {
      return `${error.message}\nat ${error.file}:${error.line}:${error.column}`;
    }
    return error instanceof Error ? error.message : "Unknown error";
  }
  const errorMessage = formatErrorMessage(error);
  sendClientMessage(client, {
    type: "error",
    payload: {
      message: errorMessage,
    },
  });
}

/**
 * Sends an update message to the client with new content
 */
export function sendUpdateMessage(
  client: WebSocket,
  content: string,
  script: string
) {
  sendClientMessage(client, {
    type: "update",
    payload: {
      content,
      script,
    },
  });
}
