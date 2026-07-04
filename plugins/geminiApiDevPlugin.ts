import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

const readBody = (req: IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
};

export function geminiApiDevPlugin(): Plugin {
  return {
    name: 'gemini-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res, next) => {
        if (req.method !== 'POST' && req.method !== 'OPTIONS') {
          next();
          return;
        }

        try {
          const handler = (await import('../api/gemini')).default;
          const body = req.method === 'POST' ? await readBody(req) : {};

          const vercelRes = {
            statusCode: 200,
            setHeader(key: string, value: string) {
              res.setHeader(key, value);
            },
            status(code: number) {
              this.statusCode = code;
              return this;
            },
            json(data: unknown) {
              res.statusCode = this.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
            end(data?: string) {
              res.statusCode = this.statusCode;
              res.end(data);
            },
          };

          const vercelReq = {
            method: req.method,
            body,
            headers: req.headers,
            query: {},
          };

          await handler(vercelReq as any, vercelRes as any);
        } catch (error) {
          console.error('Gemini API dev middleware error:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        }
      });
    },
  };
}
