/**
 * Client-side HMR (Hot Module Replacement) script.
 * This script is injected into the page and handles:
 * 1. WebSocket connection for real-time updates
 * 2. DOM diffing and updates
 * 3. Script re-execution
 */
export const hmrClientScript = `
// Establish WebSocket connection for HMR
const ws = new WebSocket("ws://" + location.host + "/hmr");

/**
 * Recursively updates DOM nodes by comparing and patching differences.
 * This function:
 * 1. Compares node types and replaces if different
 * 2. Updates attributes for element nodes
 * 3. Recursively updates child nodes
 * 4. Handles text node content updates
 * 
 * @param oldNode - Existing DOM node to update
 * @param newNode - New node to compare against
 */
function updateNode(oldNode, newNode) {
  // Replace node entirely if types don't match or nodes are missing
  if (!oldNode || !newNode || oldNode.nodeType !== newNode.nodeType) {
    oldNode?.replaceWith?.(newNode);
    return;
  }

  // Handle element nodes (type 1)
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    // Get attributes from both nodes
    const oldAttrs = oldNode.attributes;
    const newAttrs = newNode.attributes;
    
    // Remove old attributes that don't exist in new node
    for (const attr of oldAttrs) {
      if (!newNode.hasAttribute(attr.name)) {
        oldNode.removeAttribute(attr.name);
      }
    }
    
    // Update or add new attributes
    for (const attr of newAttrs) {
      if (oldNode.getAttribute(attr.name) !== attr.value) {
        oldNode.setAttribute(attr.name, attr.value);
      }
    }

    // Process child nodes recursively
    const oldChildren = [...oldNode.childNodes];
    const newChildren = [...newNode.childNodes];
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      if (!oldChild) {
        // Add new nodes that didn't exist before
        oldNode.appendChild(newChild);
      } else if (!newChild) {
        // Remove old nodes that don't exist in new content
        oldChild.remove();
      } else {
        // Update existing nodes recursively
        updateNode(oldChild, newChild);
      }
    }
  } else if (oldNode.nodeType === Node.TEXT_NODE && oldNode.nodeValue !== newNode.nodeValue) {
    // Update text content for text nodes
    oldNode.nodeValue = newNode.nodeValue;
  }
}

// Send initial connection message with current page path
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "init",
    path: window.location.pathname
  }));
};

// Handle incoming messages from the server
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case "update": {
      // Create temporary container for new content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.payload.content;

      // Handle initial page load or empty body
      if (document.body.children.length === 0) {
        // Direct append for first load
        while (tempDiv.firstChild) {
          document.body.appendChild(tempDiv.firstChild);
        }
      } else {
        // Update existing content using DOM diffing
        updateNode(document.body, tempDiv);
      }

      // Handle script updates
      const oldScript = document.querySelector('script[data-hmr]');
      if (oldScript) oldScript.remove();

      // Create and execute new script in an isolated scope
      const scriptEl = document.createElement('script');
      scriptEl.setAttribute('data-hmr', 'true');
      scriptEl.textContent = \`(function() {
        \${data.payload.script}
      })();\`;
      document.body.appendChild(scriptEl);
      break;
    }
    case "error": {
      // Log errors to console for debugging
      console.error("[HMR] Error:", data.payload.message);
      break;
    }
  }
};
`; 