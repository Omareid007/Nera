/**
 * start-forward-run RPC — Deploy a strategy to paper forward running.
 *
 * Creates a ForwardRun record and sets the strategy status to 'paper'.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getStrategy, storeStrategy, storeForwardRun, getForwardIndex } from './trading-store';
import { generateId } from './_shared';
import type { ForwardRun } from './types';

/** Statuses from which a forward run can be started. */
const STARTABLE_STATUSES = ['validated', 'paused'];

export async function startForwardRun(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const strategyId = body.strategyId as string | undefined;
  const mode = (body.mode as string) || 'insight_only';

  if (!strategyId) return errorResponse('strategyId is required');
  if (!['insight_only', 'assisted', 'semi_auto'].includes(mode)) {
    return errorResponse('mode must be one of: insight_only, assisted, semi_auto');
  }

  const strategy = await getStrategy(strategyId);
  if (!strategy) return errorResponse('Strategy not found', 404);

  // Enforce valid status transitions
  if (!STARTABLE_STATUSES.includes(strategy.status)) {
    return errorResponse(
      `Cannot start forward run — strategy is "${strategy.status}". Must be one of: ${STARTABLE_STATUSES.join(', ')}`
    );
  }

  // Prevent duplicate running forward runs for this strategy
  const forwardIndex = await getForwardIndex();
  const alreadyRunning = forwardIndex.find((r) => r.strategyId === strategyId && r.status === 'running');
  if (alreadyRunning) {
    return errorResponse(`Strategy already has a running forward run (${alreadyRunning.id}). Stop it first.`);
  }

  const run: ForwardRun = {
    id: generateId(),
    strategyId,
    strategyName: strategy.name,
    mode: mode as ForwardRun['mode'],
    status: 'running',
    signals: [],
    proposedActions: [],
    startedAt: Date.now(),
    lastEvaluatedAt: null,
    paperPnl: 0,
  };

  // Update strategy status to paper
  strategy.status = 'paper';
  strategy.updatedAt = Date.now();

  try {
    await storeStrategy(strategy);
    await storeForwardRun(run);
  } catch {
    return errorResponse('Failed to start forward run', 500);
  }

  return jsonResponse({ forwardRun: run });
}
