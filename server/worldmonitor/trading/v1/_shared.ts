import { randomUUID } from 'node:crypto';

export const UPSTREAM_TIMEOUT_MS = 25_000;

/** Default starting capital for paper trading accounts. */
export const DEFAULT_PAPER_CAPITAL = 100_000;

export function generateId(): string {
  return randomUUID();
}

/** Parse JSON body from POST request, return empty object for GET. */
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
