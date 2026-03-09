/**
 * Platform configuration management — feature flags, versioned config, change history.
 * Supports rollback to previous config snapshots.
 */

import { parseBody, jsonResponse, errorResponse, generateId } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';

const CONFIG_KEY = 'trading:platform-config:v1:current';
const CONFIG_HISTORY_KEY = 'trading:platform-config:v1:history';
const TTL_90D = 90 * 24 * 3600;
const MAX_HISTORY = 50;

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  category: 'trading' | 'ai' | 'analytics' | 'admin' | 'integration';
}

export interface PlatformConfig {
  version: number;
  featureFlags: FeatureFlag[];
  aiModelPolicy: {
    primaryProvider: string;
    fallbackProviders: string[];
    maxTokensPerRequest: number;
    maxRequestsPerHour: number;
  };
  tradingLimits: {
    maxStrategies: number;
    maxBacktestsPerDay: number;
    maxForwardRuns: number;
    maxWatchlists: number;
    maxAlertsPerUser: number;
  };
  updatedAt: number;
  updatedBy: string;
  changeNote: string;
}

export interface ConfigHistoryEntry {
  id: string;
  version: number;
  changeNote: string;
  updatedBy: string;
  timestamp: number;
  snapshot: PlatformConfig;
}

const DEFAULT_CONFIG: PlatformConfig = {
  version: 1,
  featureFlags: [
    { id: 'paper_trading', name: 'Paper Trading', enabled: true, description: 'Paper execution and portfolio tracking', category: 'trading' },
    { id: 'ai_interpretations', name: 'AI Interpretations', enabled: true, description: 'LLM-powered strategy analysis', category: 'ai' },
    { id: 'forward_runner', name: 'Forward Runner', enabled: true, description: 'Live signal generation from market data', category: 'trading' },
    { id: 'alert_engine', name: 'Alert Engine', enabled: true, description: 'Price and portfolio threshold monitoring', category: 'analytics' },
    { id: 'watchlist_crud', name: 'Watchlist CRUD', enabled: true, description: 'Custom watchlist management', category: 'analytics' },
    { id: 'limit_orders', name: 'Limit Orders', enabled: true, description: 'Limit order placement with pending fills', category: 'trading' },
    { id: 'deposit_withdraw', name: 'Deposit / Withdraw', enabled: true, description: 'Paper account fund management', category: 'trading' },
    { id: 'attribution_engine', name: 'Attribution Engine', enabled: true, description: 'Factor decomposition with real benchmark', category: 'analytics' },
    { id: 'portfolio_refresh', name: 'Portfolio Refresh', enabled: true, description: 'Live position price updates', category: 'trading' },
    { id: 'data_export', name: 'Data Export', enabled: true, description: 'Export strategies, backtests, and ledger data', category: 'admin' },
    { id: 'audit_logging', name: 'Audit Logging', enabled: true, description: 'Track all API mutations', category: 'admin' },
    { id: 'webhooks', name: 'Webhooks', enabled: true, description: 'Webhook notifications for alerts and events', category: 'integration' },
    { id: 'live_trading', name: 'Live Trading', enabled: false, description: 'Real broker execution (requires integration)', category: 'trading' },
    { id: 'full_auto_mode', name: 'Full Auto Mode', enabled: false, description: 'Autonomous order execution (blocked)', category: 'trading' },
    { id: 'multi_tenant', name: 'Multi-Tenant', enabled: false, description: 'User isolation and role-based access', category: 'admin' },
  ],
  aiModelPolicy: {
    primaryProvider: 'groq',
    fallbackProviders: ['openrouter'],
    maxTokensPerRequest: 4000,
    maxRequestsPerHour: 100,
  },
  tradingLimits: {
    maxStrategies: 50,
    maxBacktestsPerDay: 20,
    maxForwardRuns: 10,
    maxWatchlists: 50,
    maxAlertsPerUser: 100,
  },
  updatedAt: Date.now(),
  updatedBy: 'system',
  changeNote: 'Initial configuration',
};

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const config = await getCachedJson(CONFIG_KEY) as PlatformConfig | null;
  return config ?? DEFAULT_CONFIG;
}

export async function getConfigHistory(): Promise<ConfigHistoryEntry[]> {
  return ((await getCachedJson(CONFIG_HISTORY_KEY)) ?? []) as ConfigHistoryEntry[];
}

async function saveConfigWithHistory(config: PlatformConfig): Promise<void> {
  const history = await getConfigHistory();
  history.push({
    id: generateId(),
    version: config.version,
    changeNote: config.changeNote,
    updatedBy: config.updatedBy,
    timestamp: config.updatedAt,
    snapshot: { ...config },
  });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

  await Promise.all([
    setCachedJson(CONFIG_KEY, config, TTL_90D),
    setCachedJson(CONFIG_HISTORY_KEY, history, TTL_90D),
  ]);
}

// --- HTTP Handlers ---

export async function getPlatformConfigHandler(_req: Request): Promise<Response> {
  try {
    const config = await getPlatformConfig();
    return jsonResponse({ config });
  } catch {
    return errorResponse('Failed to get platform config', 500);
  }
}

export async function updatePlatformConfigHandler(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req);
    const current = await getPlatformConfig();

    const updated: PlatformConfig = {
      ...current,
      version: current.version + 1,
      updatedAt: Date.now(),
      updatedBy: (body.updatedBy as string) || 'admin',
      changeNote: (body.changeNote as string) || 'Configuration update',
    };

    // Update feature flags if provided
    if (body.featureFlags && Array.isArray(body.featureFlags)) {
      for (const flagUpdate of body.featureFlags as { id: string; enabled: boolean }[]) {
        const flag = updated.featureFlags.find((f) => f.id === flagUpdate.id);
        if (flag) flag.enabled = flagUpdate.enabled;
      }
    }

    // Update AI model policy if provided
    if (body.aiModelPolicy && typeof body.aiModelPolicy === 'object') {
      updated.aiModelPolicy = { ...updated.aiModelPolicy, ...(body.aiModelPolicy as Record<string, unknown>) } as PlatformConfig['aiModelPolicy'];
    }

    // Update trading limits if provided
    if (body.tradingLimits && typeof body.tradingLimits === 'object') {
      updated.tradingLimits = { ...updated.tradingLimits, ...(body.tradingLimits as Record<string, unknown>) } as PlatformConfig['tradingLimits'];
    }

    await saveConfigWithHistory(updated);
    return jsonResponse({ config: updated });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed to update config');
  }
}

export async function toggleFeatureFlag(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req);
    const flagId = body.flagId as string;
    const enabled = body.enabled as boolean;
    const changeNote = (body.changeNote as string) || `Toggle ${flagId} to ${enabled}`;

    if (!flagId || typeof enabled !== 'boolean') {
      return errorResponse('flagId and enabled (boolean) are required');
    }

    const config = await getPlatformConfig();
    const flag = config.featureFlags.find((f) => f.id === flagId);
    if (!flag) return errorResponse(`Feature flag '${flagId}' not found`);

    flag.enabled = enabled;
    config.version += 1;
    config.updatedAt = Date.now();
    config.updatedBy = 'admin';
    config.changeNote = changeNote;

    await saveConfigWithHistory(config);
    return jsonResponse({ config, toggled: { flagId, enabled } });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed to toggle flag');
  }
}

export async function rollbackConfig(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req);
    const targetVersion = Number(body.version);

    if (!targetVersion || targetVersion < 1) {
      return errorResponse('version (number) is required');
    }

    const history = await getConfigHistory();
    const target = history.find((h) => h.version === targetVersion);
    if (!target) return errorResponse(`Config version ${targetVersion} not found in history`);

    const current = await getPlatformConfig();
    const restored: PlatformConfig = {
      ...target.snapshot,
      version: current.version + 1,
      updatedAt: Date.now(),
      updatedBy: 'admin',
      changeNote: `Rollback to version ${targetVersion}`,
    };

    await saveConfigWithHistory(restored);
    return jsonResponse({ config: restored, rolledBackFrom: current.version, rolledBackTo: targetVersion });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Rollback failed');
  }
}

export async function listConfigHistory(_req: Request): Promise<Response> {
  try {
    const history = await getConfigHistory();
    return jsonResponse({
      history: history.reverse().map((h) => ({
        id: h.id,
        version: h.version,
        changeNote: h.changeNote,
        updatedBy: h.updatedBy,
        timestamp: h.timestamp,
      })),
      total: history.length,
    });
  } catch {
    return errorResponse('Failed to get config history', 500);
  }
}
