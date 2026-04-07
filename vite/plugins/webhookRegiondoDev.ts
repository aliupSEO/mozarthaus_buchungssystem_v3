import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';

const MAX_BODY = 2_000_000;
const PATH = '/api/webhook-regiondo';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function attach(server: ViteDevServer | PreviewServer) {
  server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname !== PATH) {
      next();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Allow', 'POST');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const buf = await readBody(req);
      let body: unknown = {};
      const text = buf.length ? buf.toString('utf8') : '';
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          body = { raw: text };
        }
      }

      const line = {
        at: new Date().toISOString(),
        body,
      };
      console.log('[webhook-regiondo]', JSON.stringify(line, null, 2));

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, receivedAt: line.at }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: msg }));
    }
  });
}

/** Mirrors `api/webhook-regiondo.js` on Vercel — POST only, logs body to the terminal running `vite`. */
export function webhookRegiondoDevPlugin(): Plugin {
  return {
    name: 'webhook-regiondo-dev',
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
}
