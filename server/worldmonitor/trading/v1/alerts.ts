/**
 * Alert system — create, list, and evaluate price/risk threshold alerts.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import { generateId } from './_shared';

const ALERTS_KEY = 'trading:alerts:v1:list';
const TTL_90D = 90 * 24 * 3600;

export interface Alert {
  id: string;
  name: string;
  type: 'price_above' | 'price_below' | 'pnl_threshold' | 'drawdown_threshold' | 'volume_spike' | 'rsi_overbought' | 'rsi_oversold';
  symbol: string | null;
  threshold: number;
  status: 'active' | 'triggered' | 'dismissed';
  triggeredAt: number | null;
  triggeredValue: number | null;
  createdAt: number;
}

async function getAlerts(): Promise<Alert[]> {
  return ((await getCachedJson(ALERTS_KEY)) ?? []) as Alert[];
}

async function saveAlerts(alerts: Alert[]): Promise<void> {
  await setCachedJson(ALERTS_KEY, alerts, TTL_90D);
}

export async function createAlert(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const name = body.name as string | undefined;
  const type = body.type as string | undefined;
  const symbol = (body.symbol as string) || null;
  const threshold = Number(body.threshold);

  if (!name) return errorResponse('name is required');
  if (name.length > 200) return errorResponse('name must be 200 characters or fewer');
  if (!type) return errorResponse('type is required');
  const validTypes = ['price_above', 'price_below', 'pnl_threshold', 'drawdown_threshold', 'volume_spike', 'rsi_overbought', 'rsi_oversold'];
  if (!validTypes.includes(type)) return errorResponse('invalid alert type');
  if (isNaN(threshold)) return errorResponse('threshold must be a number');

  const alert: Alert = {
    id: generateId(),
    name,
    type: type as Alert['type'],
    symbol,
    threshold,
    status: 'active',
    triggeredAt: null,
    triggeredValue: null,
    createdAt: Date.now(),
  };

  const MAX_ALERTS = 100;
  try {
    const alerts = await getAlerts();
    if (alerts.length >= MAX_ALERTS) {
      return errorResponse(`Maximum of ${MAX_ALERTS} alerts reached. Delete some before creating new ones.`);
    }
    alerts.push(alert);
    await saveAlerts(alerts);
  } catch {
    return errorResponse('Failed to create alert', 500);
  }

  return jsonResponse({ alert });
}

export async function listAlerts(req: Request): Promise<Response> {
  void req;
  const alerts = await getAlerts();
  return jsonResponse({ alerts: alerts.sort((a, b) => b.createdAt - a.createdAt) });
}

export async function dismissAlert(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  try {
    const alerts = await getAlerts();
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return errorResponse('Alert not found', 404);
    alert.status = 'dismissed';
    await saveAlerts(alerts);
    return jsonResponse({ alert });
  } catch {
    return errorResponse('Failed to dismiss alert', 500);
  }
}

export async function deleteAlert(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  try {
    const alerts = await getAlerts();
    const filtered = alerts.filter((a) => a.id !== id);
    if (filtered.length === alerts.length) {
      return errorResponse('Alert not found', 404);
    }
    await saveAlerts(filtered);
    return jsonResponse({ deleted: true });
  } catch {
    return errorResponse('Failed to delete alert', 500);
  }
}
