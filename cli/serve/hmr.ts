import type { HakaiConfig } from "@hakai/core";
import { processKaiFiles, type ProcessedKaiFile } from "@hakai/internal";
import { normalize, relative } from "@std/path";
import { resolvePagePath } from "./utils.ts";

type ClientContext = {
  processedKaiFile: ProcessedKaiFile;
  paths: string[];
};

export const hmrClientScript = `
const ws = new WebSocket("ws://" + location.host + "/hmr");

// Fonction utilitaire pour comparer et mettre à jour les nodes
function updateNode(oldNode, newNode) {
  // Si les nodes sont différents
  if (!oldNode || !newNode || oldNode.nodeType !== newNode.nodeType) {
    oldNode?.replaceWith?.(newNode);
    return;
  }

  // Pour les éléments
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    // Mise à jour des attributs
    const oldAttrs = oldNode.attributes;
    const newAttrs = newNode.attributes;
    
    // Supprimer les anciens attributs qui n'existent plus
    for (const attr of oldAttrs) {
      if (!newNode.hasAttribute(attr.name)) {
        oldNode.removeAttribute(attr.name);
      }
    }
    
    // Ajouter/mettre à jour les nouveaux attributs
    for (const attr of newAttrs) {
      if (oldNode.getAttribute(attr.name) !== attr.value) {
        oldNode.setAttribute(attr.name, attr.value);
      }
    }

    // Mise à jour récursive des enfants
    const oldChildren = [...oldNode.childNodes];
    const newChildren = [...newNode.childNodes];
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      if (!oldChild) {
        // Ajouter les nouveaux nodes
        oldNode.appendChild(newChild);
      } else if (!newChild) {
        // Supprimer les nodes qui n'existent plus
        oldChild.remove();
      } else {
        // Mettre à jour récursivement
        updateNode(oldChild, newChild);
      }
    }
  } else if (oldNode.nodeType === Node.TEXT_NODE && oldNode.nodeValue !== newNode.nodeValue) {
    // Pour les nodes texte, mettre à jour uniquement si le contenu a changé
    oldNode.nodeValue = newNode.nodeValue;
  }
}

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "init",
    path: window.location.pathname
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "saved") {
    // Parser le nouveau contenu dans un DOM temporaire
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data.content;

    // Pour chaque composant modifié
    const updatedComponents = tempDiv.querySelectorAll('[data-component-id]');
    updatedComponents.forEach(newComponent => {
      const componentId = newComponent.getAttribute('data-component-id');
      const existingComponent = document.querySelector(\`[data-component-id="\${componentId}"]\`);
      
      if (existingComponent) {
        // Mise à jour granulaire du composant
        updateNode(existingComponent, newComponent);
      } else {
        // Premier chargement : ajouter le composant au body
        document.body.appendChild(newComponent);
      }
    });

    // Gestion du script
    const oldScript = document.querySelector('script[data-hmr]');
    if (oldScript) oldScript.remove();

    const scriptEl = document.createElement('script');
    scriptEl.setAttribute('data-hmr', 'true');
    scriptEl.textContent = \`(function() {
      \${data.script}
    })();\`;
    document.body.appendChild(scriptEl);
  }
};
`;

export function setupHMR(req: Request, config: HakaiConfig): Response {
  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientContexts = new Map<WebSocket, ClientContext>();

  let watcher: Deno.FsWatcher | null = null;

  socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "init") {
      const paths = await resolvePagePath(data.path, config);
      const processedKaiFile = await processKaiFiles(paths);

      clientContexts.set(socket, {
        processedKaiFile,
        paths,
      });

      socket.send(
        JSON.stringify({
          type: "saved",
          content: processedKaiFile.content,
          script: processedKaiFile.script,
        })
      );

      if (clientContexts.size === 1) {
        watcher = Deno.watchFs("./scopes");
        await sendNewContent(watcher, clientContexts);
      }
    }
  };

  socket.onclose = () => handleSocketClosure(socket, watcher);
  socket.onerror = () => handleSocketClosure(socket, watcher);

  function handleSocketClosure(
    socket: WebSocket,
    watcher: Deno.FsWatcher | null
  ) {
    clientContexts.delete(socket);
    if (clientContexts.size === 0 && watcher) {
      watcher.close();
      watcher = null;
    }
  }

  return response;
}

async function sendNewContent(
  watcher: Deno.FsWatcher,
  clientContexts: Map<WebSocket, ClientContext>
) {
  for await (const event of watcher) {
    if (event.kind === "modify") {
      const modifiedPath = normalize(
        relative(Deno.cwd(), event.paths[0])
      ).replace(/\\/g, "/");

      for (const [client, context] of clientContexts.entries()) {
        if (context.paths.some(path => {
          const normalizedPath = normalize(path).replace(/\\/g, "/");
          return normalizedPath === modifiedPath;
        })) {
          const newProcessedKaiFile = await processKaiFiles(context.paths);

          if (newProcessedKaiFile.content !== context.processedKaiFile.content) {
            clientContexts.set(client, {
              processedKaiFile: newProcessedKaiFile,
              paths: context.paths,
            });

            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "saved",
                  content: newProcessedKaiFile.content,
                  script: newProcessedKaiFile.script
                })
              );
            }
          }
        }
      }
    }
  }
}
