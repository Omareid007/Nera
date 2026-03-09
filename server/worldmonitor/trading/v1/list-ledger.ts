import { parseBody, jsonResponse } from './handler';
import { getLedgerIndex, getLedgerEntry } from './trading-store';
import type { LedgerEntry } from './types';

export async function listLedger(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const typeFilter = body.type as string | undefined;
  const strategyFilter = body.strategyId as string | undefined;

  let index = await getLedgerIndex();

  if (typeFilter) index = index.filter((e) => e.type === typeFilter);
  if (strategyFilter) {
    // Need to load entries to filter by strategy
    const filtered = [];
    for (const idx of index) {
      const entry = await getLedgerEntry(idx.id);
      if (entry && entry.strategyId === strategyFilter) filtered.push(idx);
    }
    index = filtered;
  }

  // Return newest first, limited to 200
  const recent = index.slice(-200).reverse();
  const entries: LedgerEntry[] = [];
  for (const idx of recent) {
    const entry = await getLedgerEntry(idx.id);
    if (entry) entries.push(entry);
  }

  return jsonResponse({ ledgerEntries: entries });
}
