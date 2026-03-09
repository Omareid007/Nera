import { randomUUID } from 'node:crypto';

/** Default starting capital for paper trading accounts. */
export const DEFAULT_PAPER_CAPITAL = 100_000;

export function generateId(): string {
  return randomUUID();
}

const MAX_BODY_BYTES = 512_000; // 512 KB

/** Parse JSON body from POST request, return query params for GET. */
export async function parseBody(req: Request): Promise<Record<string, unknown>> {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const result: Record<string, unknown> = {};
    for (const [key, value] of url.searchParams) {
      result[key] = value;
    }
    return result;
  }
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return {};
    }
    return await req.json();
  } catch {
    return {};
  }
}

/** Standard CORS headers for trading API responses. */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WorldMonitor-Key',
};

/** Create a JSON response with CORS headers. */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Create an error response. */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/** Validate a ticker symbol format. Allows alphanumeric, dots, hyphens, carets, equals (1-20 chars). */
const SYMBOL_RE = /^[A-Z0-9.\-^=]{1,20}$/;
export function isValidSymbol(symbol: string): boolean {
  return SYMBOL_RE.test(symbol.toUpperCase());
}
