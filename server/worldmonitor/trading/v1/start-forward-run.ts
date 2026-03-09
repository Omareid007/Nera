/**
 * start-forward-run RPC — Deploy a strategy to paper forward running.
 *
 * Creates a ForwardRun record and sets the strategy status to 'paper'.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getStrategy, storeStrategy, storeForwardRun } from './trading-store';
import { generateId } from './_shared';
import type { ForwardRun } from './types';

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
  await storeStrategy(strategy);
  await storeForwardRun(run);

  return jsonResponse({ forwardRun: run });
}
