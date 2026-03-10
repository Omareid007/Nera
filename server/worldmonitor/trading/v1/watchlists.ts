/**
 * Watchlist CRUD — persistent user watchlists with symbols.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { storeWatchlist, getWatchlist, getWatchlistIndex, deleteWatchlist as deleteWatchlistStore } from './trading-store';
import { generateId, isValidSymbol } from './_shared';
import type { Watchlist } from './types';

export async function createWatchlist(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const name = body.name as string | undefined;
  const symbols = body.symbols as string[] | undefined;
  const description = (body.description as string) || '';

  if (!name) return errorResponse('name is required');
  if (name.length > 100) return errorResponse('name must be 100 characters or fewer');
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) return errorResponse('symbols array is required');
  if (symbols.length > 100) return errorResponse('maximum 100 symbols per watchlist');

  const validSymbols = symbols.map((s) => String(s).toUpperCase()).filter(isValidSymbol);
  if (validSymbols.length === 0) return errorResponse('no valid symbols provided');

  const index = await getWatchlistIndex();
  if (index.length >= 50) return errorResponse('Maximum of 50 watchlists reached');

  const watchlist: Watchlist = {
    id: generateId(),
    name,
    symbols: validSymbols,
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await storeWatchlist(watchlist);
  } catch {
    return errorResponse('Failed to create watchlist', 500);
  }

  return jsonResponse({ watchlist });
}

export async function listWatchlists(_req: Request): Promise<Response> {
  const index = await getWatchlistIndex();
  return jsonResponse({ watchlists: index.sort((a, b) => b.updatedAt - a.updatedAt) });
}

export async function getWatchlistById(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const watchlist = await getWatchlist(id);
  if (!watchlist) return errorResponse('Watchlist not found', 404);

  return jsonResponse({ watchlist });
}

export async function updateWatchlist(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const watchlist = await getWatchlist(id);
  if (!watchlist) return errorResponse('Watchlist not found', 404);

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length > 100) return errorResponse('name must be a string of 100 chars or fewer');
    watchlist.name = body.name;
  }
  if (body.description !== undefined) {
    watchlist.description = String(body.description);
  }
  if (body.symbols !== undefined) {
    if (!Array.isArray(body.symbols)) return errorResponse('symbols must be an array');
    const valid = (body.symbols as string[]).map((s) => String(s).toUpperCase()).filter(isValidSymbol);
    if (valid.length === 0) return errorResponse('no valid symbols');
    if (valid.length > 100) return errorResponse('maximum 100 symbols');
    watchlist.symbols = valid;
  }

  watchlist.updatedAt = Date.now();

  try {
    await storeWatchlist(watchlist);
  } catch {
    return errorResponse('Failed to update watchlist', 500);
  }

  return jsonResponse({ watchlist });
}

export async function deleteWatchlistHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const watchlist = await getWatchlist(id);
  if (!watchlist) return errorResponse('Watchlist not found', 404);

  try {
    await deleteWatchlistStore(id);
  } catch {
    return errorResponse('Failed to delete watchlist', 500);
  }

  return jsonResponse({ deleted: true });
}
