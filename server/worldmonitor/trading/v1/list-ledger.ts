import { parseBody, jsonResponse } from './handler';
import { getLedgerIndex, getLedgerEntry } from './trading-store';
import type { LedgerEntry } from './types';

export async function listLedger(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const typeFilter = body.type as string | undefined;
  const strategyFilter = body.strategyId as string | undefined;

  let index = await getLedgerIndex();

  if (typeFilter) index = index.filter((e) => e.type === typeFilter);

  // strategyId is stored in the index — filter without loading individual entries
  if (strategyFilter) index = index.filter((e) => e.strategyId === strategyFilter);

  // Return newest first, limited to 200, fetched in parallel
  const recent = index.slice(-200).reverse();
  const results = await Promise.all(recent.map((idx) => getLedgerEntry(idx.id)));
  const entries: LedgerEntry[] = results.filter((e): e is LedgerEntry => e !== null);

  return jsonResponse({ ledgerEntries: entries });
}
