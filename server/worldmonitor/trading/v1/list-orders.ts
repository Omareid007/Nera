import { jsonResponse, errorResponse } from './handler';
import { getLedgerIndex, getLedgerEntry } from './trading-store';
import type { LedgerEntry } from './types';

export async function listOrders(_req: Request): Promise<Response> {
  try {
    const index = await getLedgerIndex();
    const orderEntries = index.filter((e) => e.type === 'order' || e.type === 'fill');

    // Fetch the most recent 100 entries in parallel
    const recent = orderEntries.slice(-100).reverse();
    const results = await Promise.all(recent.map((idx) => getLedgerEntry(idx.id)));
    const entries: LedgerEntry[] = results.filter((e): e is LedgerEntry => e !== null);

    return jsonResponse({ orders: entries });
  } catch {
    return errorResponse('Failed to fetch orders', 500);
  }
}
