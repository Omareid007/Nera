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
import { interpretStrategy } from './interpret-strategy';
import { listAiEventsHandler } from './list-ai-events';
import { getAiEventHandler } from './get-ai-event';
import { startForwardRun } from './start-forward-run';
import { stopForwardRun } from './stop-forward-run';
import { evaluateForwardRun } from './evaluate-forward-run';
import { listForwardRuns } from './list-forward-runs';
import { getForwardRunHandler } from './get-forward-run';
import { submitOrder } from './submit-order';
import { listOrders } from './list-orders';
import { listLedger } from './list-ledger';
import { listEvidence } from './list-evidence';
import { getMarketData } from './get-market-data';
import { getWatchlistQuotes } from './get-watchlist-quotes';
import { getRiskAnalytics } from './get-risk-analytics';
import { createAlert, listAlerts, dismissAlert, deleteAlert } from './alerts';

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
    { method: 'GET',  path: `${BASE}/list-templates`,         handler: listTemplates },

    // Strategy CRUD
    { method: 'POST', path: `${BASE}/create-strategy`,        handler: createStrategy },
    { method: 'GET',  path: `${BASE}/get-strategy`,           handler: getStrategyHandler },
    { method: 'GET',  path: `${BASE}/list-strategies`,        handler: listStrategies },
    { method: 'POST', path: `${BASE}/update-strategy`,        handler: updateStrategy },
    { method: 'POST', path: `${BASE}/delete-strategy`,        handler: deleteStrategyHandler },

    // Backtests
    { method: 'POST', path: `${BASE}/run-backtest`,           handler: runBacktest },
    { method: 'GET',  path: `${BASE}/get-backtest-run`,       handler: getBacktestRunHandler },
    { method: 'GET',  path: `${BASE}/list-backtest-runs`,     handler: listBacktestRuns },

    // Forward Runner
    { method: 'POST', path: `${BASE}/start-forward-run`,      handler: startForwardRun },
    { method: 'POST', path: `${BASE}/stop-forward-run`,       handler: stopForwardRun },
    { method: 'POST', path: `${BASE}/evaluate-forward-run`,   handler: evaluateForwardRun },
    { method: 'GET',  path: `${BASE}/list-forward-runs`,      handler: listForwardRuns },
    { method: 'GET',  path: `${BASE}/get-forward-run`,        handler: getForwardRunHandler },

    // Execution & Orders
    { method: 'POST', path: `${BASE}/submit-order`,           handler: submitOrder },
    { method: 'GET',  path: `${BASE}/list-orders`,            handler: listOrders },

    // Portfolio
    { method: 'GET',  path: `${BASE}/get-portfolio`,          handler: getPortfolioHandler },

    // Ledger & Evidence
    { method: 'GET',  path: `${BASE}/list-ledger`,            handler: listLedger },
    { method: 'GET',  path: `${BASE}/list-evidence`,          handler: listEvidence },

    // AI
    { method: 'POST', path: `${BASE}/interpret-strategy`,     handler: interpretStrategy },
    { method: 'GET',  path: `${BASE}/list-ai-events`,         handler: listAiEventsHandler },
    { method: 'GET',  path: `${BASE}/get-ai-event`,           handler: getAiEventHandler },

    // Market Data & Analytics
    { method: 'GET',  path: `${BASE}/get-market-data`,        handler: getMarketData },
    { method: 'GET',  path: `${BASE}/get-watchlist-quotes`,   handler: getWatchlistQuotes },
    { method: 'GET',  path: `${BASE}/get-risk-analytics`,     handler: getRiskAnalytics },

    // Alerts
    { method: 'POST', path: `${BASE}/create-alert`,           handler: createAlert },
    { method: 'GET',  path: `${BASE}/list-alerts`,            handler: listAlerts },
    { method: 'POST', path: `${BASE}/dismiss-alert`,          handler: dismissAlert },
    { method: 'POST', path: `${BASE}/delete-alert`,           handler: deleteAlert },
  ];
}
