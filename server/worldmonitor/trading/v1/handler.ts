/**
 * Trading service handler — maps RPC paths to handler functions.
 *
 * Unlike proto-generated domains, trading routes are manually defined
 * because the trading service is new and doesn't have proto files yet.
 */

import type { RouteDescriptor } from '../../../router';
import { createStrategy } from './create-strategy';
import { getStrategyHandler } from './get-strategy';
import { listStrategies } from './list-strategies';
import { updateStrategy } from './update-strategy';
import { deleteStrategyHandler } from './delete-strategy';
import { listTemplates } from './list-templates';
import { runBacktest } from './run-backtest';
import { getBacktestRunHandler } from './get-backtest-run';
import { listBacktestRuns } from './list-backtest-runs';
import { getPortfolioHandler } from './get-portfolio';

const BASE = '/api/trading/v1';

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

/** Create a JSON response. */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Create an error response. */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function createTradingRoutes(): RouteDescriptor[] {
  return [
    // Templates
    { method: 'GET',  path: `${BASE}/list-templates`,       handler: listTemplates },

    // Strategy CRUD
    { method: 'POST', path: `${BASE}/create-strategy`,      handler: createStrategy },
    { method: 'GET',  path: `${BASE}/get-strategy`,         handler: getStrategyHandler },
    { method: 'GET',  path: `${BASE}/list-strategies`,      handler: listStrategies },
    { method: 'POST', path: `${BASE}/update-strategy`,      handler: updateStrategy },
    { method: 'POST', path: `${BASE}/delete-strategy`,      handler: deleteStrategyHandler },

    // Backtests
    { method: 'POST', path: `${BASE}/run-backtest`,         handler: runBacktest },
    { method: 'GET',  path: `${BASE}/get-backtest-run`,     handler: getBacktestRunHandler },
    { method: 'GET',  path: `${BASE}/list-backtest-runs`,   handler: listBacktestRuns },

    // Portfolio
    { method: 'GET',  path: `${BASE}/get-portfolio`,        handler: getPortfolioHandler },
  ];
}
