# Hot Module Replacement (HMR)

This folder contains the implementation of Hot Module Replacement for the Hakai framework. HMR enables real-time updates of the application without requiring a full page reload.

## Architecture Overview

The HMR system is split into several components:

### Server-side Components

- `setup.ts`: Main HMR setup that handles WebSocket connections and file system watching
- `handlers.ts`: File system event handlers for different types of file changes
- `types.ts`: TypeScript type definitions shared across the HMR system

### Client-side Component

- `client-script.ts`: Browser-side script that handles WebSocket communication and DOM updates

## How it Works

1. **Initial Connection**:
   - When a page loads, the client-side script establishes a WebSocket connection
   - The client sends an "init" message with the current page path
   - The server resolves the page dependencies and sends back the initial content

2. **File System Watching**:
   - The server watches the `./scopes` directory for file changes
   - When changes occur, the appropriate handler is triggered based on the event type:
     - `modify/create`: Recompiles affected files and sends updates
     - `remove`: Notifies clients about deleted files
     - `rename`: Updates path references and recompiles

3. **Real-time Updates**:
   - Changes are processed and sent to affected clients
   - The client-side script updates the DOM without page reload
   - Scripts are re-executed with proper scoping

## Message Types

### Client to Server:

```typescript
{
  type: "init";
  path: string; // Current page path
}
```

### Server to Client:

```typescript
{
  type: "update";
  payload: {
    content: string; // New HTML content
    script: string; // New JavaScript code
  }
}
// or
{
  type: "error";
  payload: {
    message: string; // Error message
  }
}
```

## DOM Update Strategy

The client-side DOM update follows these steps:

1. Create a temporary div with new content
2. Compare and update existing nodes recursively
3. Handle attribute changes
4. Update text content
5. Add/remove nodes as needed

## Error Handling

- File system errors are caught and reported to clients
- Invalid file changes trigger error messages
- Connection issues are handled gracefully

## WebSocket Lifecycle

1. **Connection**:
   - Client connects and sends init message
   - Server sets up file watching if first client

2. **Active Phase**:
   - Server watches for file changes
   - Updates are sent to relevant clients
   - Errors are reported when they occur

3. **Cleanup**:
   - Connections are cleaned up on close/error
   - File watcher is removed when last client disconnects

## Performance Considerations

- Only affected clients receive updates
- DOM updates are optimized to minimize reflows
- Script re-execution is scoped to prevent global pollution
