import { parseBody, jsonResponse, errorResponse } from './handler';
import { getStrategy, storeStrategy } from './trading-store';
import type { StrategyStatus } from './types';

const VALID_STATUSES: StrategyStatus[] = ['draft', 'backtesting', 'validated', 'paper', 'active', 'paused', 'archived'];
const VALID_FREQUENCIES = ['daily', '4h', '1h', 'weekly'];

/** Allowed state transitions (from → to). */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['backtesting', 'archived'],
  backtesting: ['draft', 'validated', 'archived'],
  validated: ['paper', 'draft', 'archived'],
  paper: ['active', 'paused', 'validated', 'archived'],
  active: ['paused', 'archived'],
  paused: ['active', 'paper', 'archived'],
  archived: ['draft'],
};

export async function updateStrategy(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const existing = await getStrategy(id);
  if (!existing) return errorResponse('Strategy not found', 404);

  // Validate status transition
  if (body.status !== undefined) {
    const newStatus = String(body.status);
    if (!VALID_STATUSES.includes(newStatus as StrategyStatus)) {
      return errorResponse(`Invalid status: ${newStatus}. Valid: ${VALID_STATUSES.join(', ')}`);
    }
    const allowed = STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return errorResponse(`Cannot transition from "${existing.status}" to "${newStatus}". Allowed: ${allowed.join(', ')}`);
    }
    existing.status = newStatus as StrategyStatus;
  }

  // Validate risk limits
  if (body.riskLimits !== undefined) {
    const rl = body.riskLimits as Record<string, unknown>;
    for (const [key, val] of Object.entries(rl)) {
      if (typeof val !== 'number' || val < 0) {
        return errorResponse(`riskLimits.${key} must be a non-negative number`);
      }
    }
    existing.riskLimits = { ...existing.riskLimits, ...rl } as typeof existing.riskLimits;
  }

  // Validate frequency
  if (body.frequency !== undefined) {
    const freq = String(body.frequency);
    if (!VALID_FREQUENCIES.includes(freq)) {
      return errorResponse(`Invalid frequency: ${freq}. Valid: ${VALID_FREQUENCIES.join(', ')}`);
    }
    existing.frequency = freq;
  }

  // Allowed updates (with length limits)
  if (body.name !== undefined) {
    const newName = String(body.name);
    if (newName.length > 200) return errorResponse('name must be 200 characters or fewer');
    existing.name = newName;
  }
  if (body.description !== undefined) {
    const newDesc = String(body.description);
    if (newDesc.length > 2000) return errorResponse('description must be 2000 characters or fewer');
    existing.description = newDesc;
  }
  if (body.parameters !== undefined) existing.parameters = body.parameters as Record<string, unknown>;
  if (body.universe !== undefined && Array.isArray(body.universe)) {
    existing.universe = (body.universe as string[]).map((s) => String(s).toUpperCase());
  }

  existing.updatedAt = Date.now();

  try {
    await storeStrategy(existing);
  } catch {
    return errorResponse('Failed to update strategy', 500);
  }

  return jsonResponse({ strategy: existing });
}
