import { KaiProcessError } from "@hakai/internal";

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

  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: "error",
      payload: {
        message: errorMessage,
      },
    }));
  }
}

export function sendUpdatedContentToClient(
  client: WebSocket,
  content: string,
  script: string,
) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: "update",
      payload: {
        content,
        script,
      },
    }));
  }
}
