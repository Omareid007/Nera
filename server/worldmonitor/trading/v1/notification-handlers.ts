/**
 * Notification RPC handlers — manage config and view history.
 */

import { parseBody, jsonResponse, errorResponse } from './_shared';
import { getNotificationConfig, updateNotificationConfig, getNotificationHistory, sendNotification } from './notifications';

export async function getNotifConfig(_req: Request): Promise<Response> {
  try {
    const config = await getNotificationConfig();
    // Redact webhook secret in response
    return jsonResponse({ config: { ...config, webhookSecret: config.webhookSecret ? '***' : null } });
  } catch {
    return errorResponse('Failed to get notification config', 500);
  }
}

export async function updateNotifConfig(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req);
    const config = await updateNotificationConfig(body as Partial<Parameters<typeof updateNotificationConfig>[0]>);
    return jsonResponse({ config: { ...config, webhookSecret: config.webhookSecret ? '***' : null } });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed to update config');
  }
}

export async function listNotifications(_req: Request): Promise<Response> {
  try {
    const history = await getNotificationHistory();
    return jsonResponse({ notifications: history.reverse(), total: history.length });
  } catch {
    return errorResponse('Failed to get notification history', 500);
  }
}

export async function testWebhook(_req: Request): Promise<Response> {
  try {
    const record = await sendNotification(
      'system_alert',
      'Webhook Test',
      'This is a test notification from Nera.',
      { test: true },
    );
    return jsonResponse({ record, success: record.status === 'sent' });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Test failed');
  }
}
