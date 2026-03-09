/**
 * Settings RPC — get and update persisted user settings.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getUserSettings, storeUserSettings } from './trading-store';
import type { UserSettings } from './types';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultMode: 'paper',
  defaultCapital: 100_000,
  globalMaxPositionPct: 20,
  globalMaxDrawdownPct: 15,
  aiInterpretationsEnabled: true,
  reviewChecklistsEnabled: true,
  defaultWatchlistSymbols: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'BTC-USD', 'ETH-USD', 'GLD', 'TLT'],
  alertNotificationsEnabled: true,
  updatedAt: Date.now(),
};

export async function getSettings(_req: Request): Promise<Response> {
  const settings = await getUserSettings();
  return jsonResponse({ settings: settings ?? DEFAULT_SETTINGS });
}

export async function updateSettings(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const current = (await getUserSettings()) ?? { ...DEFAULT_SETTINGS };

  // Merge provided fields
  if (body.theme !== undefined) {
    if (body.theme !== 'dark' && body.theme !== 'light') return errorResponse('theme must be "dark" or "light"');
    current.theme = body.theme as 'dark' | 'light';
  }
  if (body.defaultMode !== undefined) {
    if (body.defaultMode !== 'paper' && body.defaultMode !== 'live') return errorResponse('defaultMode must be "paper" or "live"');
    current.defaultMode = body.defaultMode as 'paper' | 'live';
  }
  if (body.defaultCapital !== undefined) {
    const cap = Number(body.defaultCapital);
    if (isNaN(cap) || cap < 1_000 || cap > 100_000_000) return errorResponse('defaultCapital must be between 1,000 and 100,000,000');
    current.defaultCapital = cap;
  }
  if (body.globalMaxPositionPct !== undefined) {
    const pct = Number(body.globalMaxPositionPct);
    if (isNaN(pct) || pct < 1 || pct > 100) return errorResponse('globalMaxPositionPct must be between 1 and 100');
    current.globalMaxPositionPct = pct;
  }
  if (body.globalMaxDrawdownPct !== undefined) {
    const pct = Number(body.globalMaxDrawdownPct);
    if (isNaN(pct) || pct < 1 || pct > 100) return errorResponse('globalMaxDrawdownPct must be between 1 and 100');
    current.globalMaxDrawdownPct = pct;
  }
  if (body.aiInterpretationsEnabled !== undefined) {
    current.aiInterpretationsEnabled = Boolean(body.aiInterpretationsEnabled);
  }
  if (body.reviewChecklistsEnabled !== undefined) {
    current.reviewChecklistsEnabled = Boolean(body.reviewChecklistsEnabled);
  }
  if (body.defaultWatchlistSymbols !== undefined) {
    if (!Array.isArray(body.defaultWatchlistSymbols)) return errorResponse('defaultWatchlistSymbols must be an array');
    current.defaultWatchlistSymbols = (body.defaultWatchlistSymbols as string[]).map((s) => String(s).toUpperCase()).slice(0, 50);
  }
  if (body.alertNotificationsEnabled !== undefined) {
    current.alertNotificationsEnabled = Boolean(body.alertNotificationsEnabled);
  }

  current.updatedAt = Date.now();

  try {
    await storeUserSettings(current);
  } catch {
    return errorResponse('Failed to save settings', 500);
  }

  return jsonResponse({ settings: current });
}
