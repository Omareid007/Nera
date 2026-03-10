/**
 * Trading service handler — maps RPC paths to handler functions.
 *
 * Unlike proto-generated domains, trading routes are manually defined
 * because the trading service is new and doesn't have proto files yet.
 */

/** Constant-time string comparison (edge-runtime compatible, no node:crypto). */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
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
import { getSettings, updateSettings } from './settings';
import { evaluateAlerts } from './evaluate-alerts';
import { refreshPortfolio } from './refresh-portfolio';
import { getProviderHealth } from './provider-health';
import { getIntelStatus } from './intel-status';
import { createWatchlist, listWatchlists, getWatchlistById, updateWatchlist, deleteWatchlistHandler } from './watchlists';
import { deposit, withdraw } from './deposit-withdraw';
import { getAttribution } from './get-attribution';
import { withAudit, listAuditLog, getAuditEntryHandler } from './audit-log';
import { exportData } from './export-data';
import { getNotifConfig, updateNotifConfig, listNotifications, testWebhook } from './notification-handlers';
import { getPlatformConfigHandler, updatePlatformConfigHandler, toggleFeatureFlag, rollbackConfig, listConfigHistory } from './config-management';

// Re-export shared helpers so existing imports from './handler' still work
export { parseBody, jsonResponse, errorResponse } from './_shared';
import { errorResponse } from './_shared';

const BASE = '/api/trading/v1';

/**
 * API key authentication for trading mutation endpoints.
 * Set TRADING_API_KEY env var in production. If not set AND running locally
 * (NODE_ENV !== 'production'), mutations are allowed (dev mode).
 * In production without TRADING_API_KEY, mutations are blocked (fail-closed).
 * Read-only endpoints (GET) skip auth for convenience; mutations (POST) always require it.
 */
function withAuth(handler: (req: Request) => Promise<Response>, requireForGET = false): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const apiKey = process.env.TRADING_API_KEY;
    if (!apiKey) {
      // Fail-closed in production: block mutations when no key is configured
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.REPLIT_DEPLOYMENT === '1';
      if (isProduction) return errorResponse('Trading API key not configured', 503);
      return handler(req); // Dev mode only
    }

    // Skip auth for GET requests unless explicitly required
    if (req.method === 'GET' && !requireForGET) return handler(req);

    const provided = req.headers.get('X-Nera-Key') ?? req.headers.get('Authorization')?.replace(/^Bearer\s+/, '');
    if (!provided || !timingSafeStringEqual(provided, apiKey)) {
      return errorResponse('Unauthorized — provide TRADING_API_KEY via X-Nera-Key header', 401);
    }
    return handler(req);
  };
}

export function createTradingRoutes(): RouteDescriptor[] {
  return [
    // Templates
    { method: 'GET',  path: `${BASE}/list-templates`,         handler: listTemplates },

    // Strategy CRUD
    { method: 'POST', path: `${BASE}/create-strategy`,        handler: withAudit('create-strategy', withAuth(createStrategy)) },
    { method: 'GET',  path: `${BASE}/get-strategy`,           handler: getStrategyHandler },
    { method: 'GET',  path: `${BASE}/list-strategies`,        handler: listStrategies },
    { method: 'POST', path: `${BASE}/update-strategy`,        handler: withAudit('update-strategy', withAuth(updateStrategy)) },
    { method: 'POST', path: `${BASE}/delete-strategy`,        handler: withAudit('delete-strategy', withAuth(deleteStrategyHandler)) },

    // Backtests
    { method: 'POST', path: `${BASE}/run-backtest`,           handler: withAudit('run-backtest', withAuth(runBacktest)) },
    { method: 'GET',  path: `${BASE}/get-backtest-run`,       handler: getBacktestRunHandler },
    { method: 'GET',  path: `${BASE}/list-backtest-runs`,     handler: listBacktestRuns },

    // Forward Runner
    { method: 'POST', path: `${BASE}/start-forward-run`,      handler: withAudit('start-forward-run', withAuth(startForwardRun)) },
    { method: 'POST', path: `${BASE}/stop-forward-run`,       handler: withAudit('stop-forward-run', withAuth(stopForwardRun)) },
    { method: 'POST', path: `${BASE}/evaluate-forward-run`,   handler: withAudit('evaluate-forward-run', withAuth(evaluateForwardRun)) },
    { method: 'GET',  path: `${BASE}/list-forward-runs`,      handler: listForwardRuns },
    { method: 'GET',  path: `${BASE}/get-forward-run`,        handler: getForwardRunHandler },

    // Execution & Orders
    { method: 'POST', path: `${BASE}/submit-order`,           handler: withAudit('submit-order', withAuth(submitOrder)) },
    { method: 'GET',  path: `${BASE}/list-orders`,            handler: listOrders },

    // Portfolio
    { method: 'GET',  path: `${BASE}/get-portfolio`,          handler: getPortfolioHandler },

    // Ledger & Evidence
    { method: 'GET',  path: `${BASE}/list-ledger`,            handler: listLedger },
    { method: 'GET',  path: `${BASE}/list-evidence`,          handler: listEvidence },

    // AI
    { method: 'POST', path: `${BASE}/interpret-strategy`,     handler: withAudit('interpret-strategy', withAuth(interpretStrategy)) },
    { method: 'GET',  path: `${BASE}/list-ai-events`,         handler: listAiEventsHandler },
    { method: 'GET',  path: `${BASE}/get-ai-event`,           handler: getAiEventHandler },

    // Market Data & Analytics
    { method: 'GET',  path: `${BASE}/get-market-data`,        handler: getMarketData },
    { method: 'GET',  path: `${BASE}/get-watchlist-quotes`,   handler: getWatchlistQuotes },
    { method: 'GET',  path: `${BASE}/get-risk-analytics`,     handler: getRiskAnalytics },

    // Alerts
    { method: 'POST', path: `${BASE}/create-alert`,           handler: withAudit('create-alert', withAuth(createAlert)) },
    { method: 'GET',  path: `${BASE}/list-alerts`,            handler: listAlerts },
    { method: 'POST', path: `${BASE}/dismiss-alert`,          handler: withAudit('dismiss-alert', withAuth(dismissAlert)) },
    { method: 'POST', path: `${BASE}/delete-alert`,           handler: withAudit('delete-alert', withAuth(deleteAlert)) },
    { method: 'POST', path: `${BASE}/evaluate-alerts`,        handler: withAudit('evaluate-alerts', withAuth(evaluateAlerts)) },

    // Notifications
    { method: 'GET',  path: `${BASE}/get-notification-config`,  handler: getNotifConfig },
    { method: 'POST', path: `${BASE}/update-notification-config`, handler: withAuth(updateNotifConfig) },
    { method: 'GET',  path: `${BASE}/list-notifications`,       handler: listNotifications },
    { method: 'POST', path: `${BASE}/test-webhook`,             handler: withAuth(testWebhook) },

    // Settings
    { method: 'GET',  path: `${BASE}/get-settings`,           handler: getSettings },
    { method: 'POST', path: `${BASE}/update-settings`,        handler: withAudit('update-settings', withAuth(updateSettings)) },

    // Data Export
    { method: 'GET',  path: `${BASE}/export-data`,            handler: exportData },

    // Portfolio management
    { method: 'POST', path: `${BASE}/refresh-portfolio`,      handler: withAudit('refresh-portfolio', withAuth(refreshPortfolio)) },
    { method: 'POST', path: `${BASE}/deposit`,                handler: withAudit('deposit', withAuth(deposit)) },
    { method: 'POST', path: `${BASE}/withdraw`,               handler: withAudit('withdraw', withAuth(withdraw)) },

    // Watchlists
    { method: 'POST', path: `${BASE}/create-watchlist`,       handler: withAudit('create-watchlist', withAuth(createWatchlist)) },
    { method: 'GET',  path: `${BASE}/list-watchlists`,        handler: listWatchlists },
    { method: 'GET',  path: `${BASE}/get-watchlist`,          handler: getWatchlistById },
    { method: 'POST', path: `${BASE}/update-watchlist`,       handler: withAudit('update-watchlist', withAuth(updateWatchlist)) },
    { method: 'POST', path: `${BASE}/delete-watchlist`,       handler: withAudit('delete-watchlist', withAuth(deleteWatchlistHandler)) },

    // Attribution
    { method: 'GET',  path: `${BASE}/get-attribution`,        handler: getAttribution },

    // System / Admin
    { method: 'GET',  path: `${BASE}/provider-health`,        handler: getProviderHealth },
    { method: 'GET',  path: `${BASE}/intel-status`,           handler: getIntelStatus },

    // Audit Log
    { method: 'GET',  path: `${BASE}/list-audit-log`,         handler: withAuth(listAuditLog, true) },
    { method: 'GET',  path: `${BASE}/get-audit-entry`,        handler: withAuth(getAuditEntryHandler, true) },

    // Platform Configuration
    { method: 'GET',  path: `${BASE}/get-platform-config`,    handler: getPlatformConfigHandler },
    { method: 'POST', path: `${BASE}/update-platform-config`, handler: withAuth(updatePlatformConfigHandler) },
    { method: 'POST', path: `${BASE}/toggle-feature-flag`,    handler: withAuth(toggleFeatureFlag) },
    { method: 'POST', path: `${BASE}/rollback-config`,        handler: withAuth(rollbackConfig) },
    { method: 'GET',  path: `${BASE}/list-config-history`,    handler: listConfigHistory },
  ];
}
