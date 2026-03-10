/**
 * Audit logging — records all mutation actions for compliance and traceability.
 * Stores audit entries in Redis with a rolling index.
 */

import { jsonResponse } from './_shared';
import { generateId } from './_shared';

// Use dynamic import for Redis to avoid circular deps
async function getRedis() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const AUDIT_INDEX_KEY = 'trading:audit:v1:index';
const AUDIT_PREFIX = 'trading:audit:v1:entry:';
const MAX_AUDIT_ENTRIES = 1000;
const AUDIT_TTL = 90 * 24 * 60 * 60; // 90 days

export interface AuditEntry {
  id: string;
  action: string;        // RPC name e.g. 'create-strategy'
  method: string;        // HTTP method
  actor: string;         // 'api_key' | 'anonymous' | user id in future
  ip: string | null;
  userAgent: string | null;
  requestBody: Record<string, unknown> | null;
  responseStatus: number;
  durationMs: number;
  timestamp: number;
}

export interface AuditIndexEntry {
  id: string;
  action: string;
  actor: string;
  responseStatus: number;
  timestamp: number;
}

/** Record an audit entry. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const redis = await getRedis();
    const indexEntry: AuditIndexEntry = {
      id: entry.id,
      action: entry.action,
      actor: entry.actor,
      responseStatus: entry.responseStatus,
      timestamp: entry.timestamp,
    };

    await Promise.all([
      redis.set(`${AUDIT_PREFIX}${entry.id}`, JSON.stringify(entry), { ex: AUDIT_TTL }),
      redis.rpush(AUDIT_INDEX_KEY, JSON.stringify(indexEntry)),
    ]);

    // Trim index to max entries
    const len = await redis.llen(AUDIT_INDEX_KEY);
    if (len > MAX_AUDIT_ENTRIES) {
      await redis.ltrim(AUDIT_INDEX_KEY, len - MAX_AUDIT_ENTRIES, -1);
    }
  } catch {
    // Audit logging should never break the request
    console.error('[audit] Failed to record audit entry');
  }
}

/** Get audit entry by id. */
export async function getAuditEntry(id: string): Promise<AuditEntry | null> {
  const redis = await getRedis();
  const raw = await redis.get(`${AUDIT_PREFIX}${id}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as AuditEntry;
}

/** List recent audit entries (newest first). */
export async function getAuditIndex(): Promise<AuditIndexEntry[]> {
  const redis = await getRedis();
  const raw = await redis.lrange(AUDIT_INDEX_KEY, 0, -1);
  const entries: AuditIndexEntry[] = raw.map((r: unknown) => typeof r === 'string' ? JSON.parse(r) : r as AuditIndexEntry);
  return entries.reverse(); // newest first
}

/** Wrap a handler with audit logging. */
export function withAudit(
  action: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const start = Date.now();
    const id = generateId();

    // Extract actor info
    const apiKey = req.headers.get('X-Nera-Key') ?? req.headers.get('Authorization')?.replace(/^Bearer\s+/, '');
    const actor = apiKey ? 'api_key' : 'anonymous';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
               req.headers.get('x-real-ip') ?? null;
    const userAgent = req.headers.get('user-agent');

    // Clone request body for audit (only for POST)
    let requestBody: Record<string, unknown> | null = null;
    if (req.method === 'POST') {
      try {
        const clone = req.clone();
        requestBody = await clone.json();
        // Redact sensitive fields
        if (requestBody && typeof requestBody === 'object') {
          const redacted = { ...requestBody };
          for (const key of ['password', 'token', 'secret', 'apiKey', 'key']) {
            if (key in redacted) redacted[key] = '[REDACTED]';
          }
          requestBody = redacted;
        }
      } catch {
        requestBody = null;
      }
    }

    // Execute handler
    const response = await handler(req);
    const durationMs = Date.now() - start;

    // Record audit (fire and forget)
    recordAudit({
      id,
      action,
      method: req.method,
      actor,
      ip,
      userAgent,
      requestBody,
      responseStatus: response.status,
      durationMs,
      timestamp: Date.now(),
    });

    return response;
  };
}

/** HTTP handler: list audit log. */
export async function listAuditLog(_req: Request): Promise<Response> {
  try {
    const entries = await getAuditIndex();
    return jsonResponse({ entries, total: entries.length });
  } catch {
    return jsonResponse({ error: 'Failed to fetch audit log' }, 500);
  }
}

/** HTTP handler: get single audit entry. */
export async function getAuditEntryHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);

  const entry = await getAuditEntry(id);
  if (!entry) return jsonResponse({ error: 'Audit entry not found' }, 404);
  return jsonResponse({ entry });
}
