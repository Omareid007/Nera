/**
 * Replit-compatible HTTP server for Nera Trading Platform.
 *
 * Serves:
 *   /api/trading/v1/* → Trading API handlers
 *   /*                → Nera Trading SPA (the primary app)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTradingRoutes } from './server/worldmonitor/trading/v1/handler';
import { createRouter, type RouteDescriptor } from './server/router';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- MIME types for static file serving ---
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

// --- Build the API router from existing trading routes ---
const tradingRoutes: RouteDescriptor[] = createTradingRoutes();
const apiRouter = createRouter(tradingRoutes);

// --- Convert Node.js IncomingMessage to Web Standard Request ---
async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const protocol = 'http';
  const host = req.headers.host || 'localhost:5000';
  const url = `${protocol}://${host}${req.url || '/'}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  if (!headers.has('x-forwarded-for') && req.socket?.remoteAddress) {
    headers.set('x-forwarded-for', req.socket.remoteAddress);
  }

  const method = (req.method || 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  if (hasBody) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);
    return new Request(url, { method, headers, body });
  }

  return new Request(url, { method, headers });
}

// --- Send Web Standard Response back through Node.js ServerResponse ---
async function sendWebResponse(webRes: Response, res: ServerResponse): Promise<void> {
  res.writeHead(webRes.status, webRes.statusText || undefined, Object.fromEntries(webRes.headers.entries()));

  if (!webRes.body) {
    res.end();
    return;
  }

  const reader = webRes.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}

// --- Static file serving ---
// Nera trading app is the primary app, built to /dist
const DIST_DIR = join(__dirname, 'dist');

function serveStaticFile(filePath: string, res: ServerResponse): boolean {
  if (!existsSync(filePath)) return false;
  const stat = statSync(filePath);
  if (!stat.isFile()) return false;

  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Length': String(stat.size),
  };

  // Cache immutable assets (hashed filenames) for 1 year
  if (filePath.includes('/assets/') && (ext === '.js' || ext === '.css')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else if (ext === '.html') {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  }

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
  return true;
}

// --- CORS headers for API routes ---
function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Nera-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// --- Main request handler ---
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const rawUrl = req.url || '/';
  const pathname = rawUrl.split('?')[0] || '/';

  // OPTIONS preflight for API routes
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // API routes — delegate to trading handler
  if (pathname.startsWith('/api/trading/v1/')) {
    setCorsHeaders(res);
    try {
      const webReq = await toWebRequest(req);
      const handler = apiRouter.match(webReq);

      if (!handler) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      const webRes = await handler(webReq);

      const mergedHeaders = new Headers(webRes.headers);
      mergedHeaders.set('Access-Control-Allow-Origin', '*');
      mergedHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      mergedHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Nera-Key');

      const finalRes = new Response(webRes.body, {
        status: webRes.status,
        statusText: webRes.statusText,
        headers: mergedHeaders,
      });

      await sendWebResponse(finalRes, res);
    } catch (err) {
      console.error('[server] API error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Nera Trading SPA — try exact static file first
  if (pathname !== '/') {
    const filePath = join(DIST_DIR, pathname);
    if (serveStaticFile(filePath, res)) return;
  }

  // SPA fallback — serve index.html for all routes (client-side routing)
  const indexPath = join(DIST_DIR, 'index.html');
  if (serveStaticFile(indexPath, res)) return;

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('App not found. Run: cd trading && npm run build');
}

// --- Start server ---
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('[server] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Internal Server Error');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Nera Trading Platform`);
  console.log(`  ────────────────────`);
  console.log(`  App:       http://${HOST}:${PORT}/`);
  console.log(`  API:       http://${HOST}:${PORT}/api/trading/v1/`);
  console.log(`  Env:       ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Redis:     ${process.env.UPSTASH_REDIS_REST_URL ? 'configured' : 'not configured (in-memory mode)'}\n`);
});
