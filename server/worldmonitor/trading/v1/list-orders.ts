/**
 * list-orders RPC — Returns order history from the order index.
 * Falls back to ledger-based order retrieval for backwards compatibility.
 */

import { jsonResponse, errorResponse } from './handler';
import { getOrderIndex, getOrder, getLedgerIndex, getLedgerEntry } from './trading-store';
import type { Order, LedgerEntry } from './types';

export async function listOrders(_req: Request): Promise<Response> {
  try {
    // Try order index first (new system)
    const orderIndex = await getOrderIndex();

    if (orderIndex.length > 0) {
      const recent = orderIndex.slice(-100).reverse();
      const results = await Promise.all(recent.map((idx) => getOrder(idx.id)));
      const orders: Order[] = results.filter((o): o is Order => o !== null);
      return jsonResponse({ orders });
    }

    // Fallback: extract from ledger index (backwards compatibility)
    const ledgerIndex = await getLedgerIndex();
    const orderEntries = ledgerIndex.filter((e) => e.type === 'order' || e.type === 'fill');
    const recent = orderEntries.slice(-100).reverse();
    const results = await Promise.all(recent.map((idx) => getLedgerEntry(idx.id)));
    const entries: LedgerEntry[] = results.filter((e): e is LedgerEntry => e !== null);

    return jsonResponse({ orders: entries });
  } catch {
    return errorResponse('Failed to fetch orders', 500);
  }
}
