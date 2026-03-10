/**
 * Notification system — dispatches webhook calls and stores notification history.
 * Called when alerts trigger, orders fill, or significant events occur.
 */

import { generateId } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';

const NOTIF_CONFIG_KEY = 'trading:notifications:v1:config';
const NOTIF_HISTORY_KEY = 'trading:notifications:v1:history';
const TTL_90D = 90 * 24 * 3600;
const MAX_HISTORY = 200;

export type NotificationChannel = 'webhook' | 'in_app';
export type NotificationEventType = 'alert_triggered' | 'order_filled' | 'drawdown_warning' | 'forward_signal' | 'system_alert';

export interface NotificationConfig {
  webhookUrl: string | null;
  webhookSecret: string | null;
  enabledEvents: NotificationEventType[];
  inAppEnabled: boolean;
  updatedAt: number;
}

export interface NotificationRecord {
  id: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  status: 'sent' | 'failed' | 'pending';
  error: string | null;
  timestamp: number;
}

const DEFAULT_CONFIG: NotificationConfig = {
  webhookUrl: null,
  webhookSecret: null,
  enabledEvents: ['alert_triggered', 'order_filled', 'drawdown_warning'],
  inAppEnabled: true,
  updatedAt: Date.now(),
};

export async function getNotificationConfig(): Promise<NotificationConfig> {
  const config = await getCachedJson(NOTIF_CONFIG_KEY) as NotificationConfig | null;
  return config ?? DEFAULT_CONFIG;
}

export async function updateNotificationConfig(partial: Partial<NotificationConfig>): Promise<NotificationConfig> {
  const current = await getNotificationConfig();
  const updated: NotificationConfig = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };
  // Validate webhook URL if provided
  if (updated.webhookUrl) {
    try { new URL(updated.webhookUrl); } catch { throw new Error('Invalid webhook URL'); }
  }
  await setCachedJson(NOTIF_CONFIG_KEY, updated, TTL_90D);
  return updated;
}

/** Send a notification via configured channels. */
export async function sendNotification(
  eventType: NotificationEventType,
  title: string,
  message: string,
  payload: Record<string, unknown> = {},
): Promise<NotificationRecord> {
  const config = await getNotificationConfig();
  const record: NotificationRecord = {
    id: generateId(),
    eventType,
    channel: 'in_app',
    title,
    message,
    payload,
    status: 'pending',
    error: null,
    timestamp: Date.now(),
  };

  // Check if event type is enabled
  if (!config.enabledEvents.includes(eventType)) {
    record.status = 'sent';
    record.channel = 'in_app';
    await storeNotificationRecord(record);
    return record;
  }

  // Try webhook if configured
  if (config.webhookUrl) {
    record.channel = 'webhook';
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.webhookSecret) {
        headers['X-Nera-Webhook-Secret'] = config.webhookSecret;
      }
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: eventType,
          title,
          message,
          payload,
          timestamp: record.timestamp,
        }),
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });
      record.status = res.ok ? 'sent' : 'failed';
      if (!res.ok) record.error = `HTTP ${res.status}`;
    } catch (e) {
      record.status = 'failed';
      record.error = e instanceof Error ? e.message : 'Webhook delivery failed';
    }
  } else {
    record.channel = 'in_app';
    record.status = 'sent';
  }

  await storeNotificationRecord(record);
  return record;
}

async function storeNotificationRecord(record: NotificationRecord): Promise<void> {
  try {
    const history = await getNotificationHistory();
    history.push(record);
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    await setCachedJson(NOTIF_HISTORY_KEY, history, TTL_90D);
  } catch {
    // Don't break calling flow
  }
}

export async function getNotificationHistory(): Promise<NotificationRecord[]> {
  return ((await getCachedJson(NOTIF_HISTORY_KEY)) ?? []) as NotificationRecord[];
}
