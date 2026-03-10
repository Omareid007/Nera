/**
 * list-evidence RPC — Returns evidence records (AI invocations + strategy lifecycle events).
 *
 * Combines AI events with ledger entries into a unified evidence timeline,
 * providing full traceability for compliance and audit purposes.
 */

import { parseBody, jsonResponse } from './handler';
import { getAiEventIndex, getLedgerIndex } from './trading-store';

interface EvidenceEntry {
  id: string;
  type: string;
  category: 'ai' | 'order' | 'fill' | 'system';
  strategyId: string | null;
  summary: string;
  timestamp: number;
}

export async function listEvidence(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const typeFilter = body.type as string | undefined;

  const [aiIndex, ledgerIndex] = await Promise.all([
    getAiEventIndex(),
    getLedgerIndex(),
  ]);

  const entries: EvidenceEntry[] = [];

  // AI events
  for (const ev of aiIndex) {
    if (typeFilter && typeFilter !== 'ai') continue;
    entries.push({
      id: ev.id,
      type: ev.type,
      category: 'ai',
      strategyId: ev.strategyId,
      summary: `AI ${ev.type.replace(/_/g, ' ')}`,
      timestamp: ev.timestamp,
    });
  }

  // Ledger entries
  for (const le of ledgerIndex) {
    if (typeFilter && typeFilter !== le.type) continue;
    const category = le.type === 'order' ? 'order' as const : le.type === 'fill' ? 'fill' as const : 'system' as const;
    entries.push({
      id: le.id,
      type: le.type,
      category,
      strategyId: (le as { strategyId?: string | null }).strategyId ?? null,
      summary: `${le.type}: ${le.symbol ?? 'system'}`,
      timestamp: le.timestamp,
    });
  }

  // Sort newest first
  entries.sort((a, b) => b.timestamp - a.timestamp);

  return jsonResponse({ evidence: entries.slice(0, 200) });
}
