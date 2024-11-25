import { createHtmlFromTemplate } from "#core";

export async function buildApp(sourceFilename: string): Promise<string> {
  const html = await createHtmlFromTemplate(sourceFilename);

  return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="/hmr-client.js"></script>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;
}
