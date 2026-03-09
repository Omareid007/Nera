import { jsonResponse } from './handler';
import { getLedgerIndex, getLedgerEntry } from './trading-store';
import type { LedgerEntry } from './types';

export async function listOrders(_req: Request): Promise<Response> {
  const index = await getLedgerIndex();
  const orderEntries = index.filter((e) => e.type === 'order' || e.type === 'fill');
  const entries: LedgerEntry[] = [];

  // Fetch the most recent 100 entries
  for (const idx of orderEntries.slice(-100).reverse()) {
    const entry = await getLedgerEntry(idx.id);
    if (entry) entries.push(entry);
  }

  return jsonResponse({ orders: entries });
}
