/**
 * Represents the context maintained for each connected client.
 * This includes the current state of their page and its dependencies.
 */
export type ClientContext = {
  processedKaiFile: {
    content: string;
    script: string;
  };
  paths: string[];
};

/**
 * Defines the structure of messages exchanged between server and client.
 * Uses a discriminated union type to handle different message types.
 */
export type WebSocketMessage = {
  type: "update";
  payload: {
    content: string;
    script: string;
  };
} | {
  type: "error";
  payload: {
    message: string;
  };
}; 