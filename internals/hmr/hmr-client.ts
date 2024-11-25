export const hmrClientScript: string = `
const ws = new WebSocket("ws://" + location.host + "/hmr");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "saved") {
    eval(\`document.body.innerHTML = \${JSON.stringify(data.content)}\`);
  }
};
`;
