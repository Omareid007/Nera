/**
 * get-watchlist-quotes RPC — Fetch real-time quotes for multiple symbols at once.
 * Powers the Dashboard live ticker and Portfolio refresh.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { isValidSymbol } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';

const QUOTES_CACHE_TTL = 120; // 2 minutes — avoids Yahoo rate limiting on shared Replit IPs

interface WatchlistQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  name: string;
  timestamp: number;
}

export async function getWatchlistQuotes(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const symbolsRaw = body.symbols as string | string[] | undefined;
  if (!symbolsRaw) return errorResponse('symbols is required');

  const symbols: string[] = Array.isArray(symbolsRaw)
    ? symbolsRaw.map(String)
    : String(symbolsRaw).split(',').map((s) => s.trim()).filter(Boolean);

  if (symbols.length === 0) return errorResponse('at least one symbol is required');
  if (symbols.length > 30) return errorResponse('maximum 30 symbols');

  const invalidSymbol = symbols.find((s) => !isValidSymbol(s));
  if (invalidSymbol) return errorResponse(`Invalid symbol format: ${invalidSymbol}`);

  // Check cache first (reduces Yahoo Finance rate-limiting on Replit)
  const cacheKey = `trading:watchlist-quotes:${symbols.sort().join(',')}`;
  const cached = await getCachedJson(cacheKey);
  if (cached && Array.isArray(cached)) {
    return jsonResponse({ quotes: cached });
  }

  const quotes: WatchlistQuote[] = [];

  // Fetch in parallel batches of 5 (smaller batches to reduce rate-limiting)
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += 5) {
    batches.push(symbols.slice(i, i + 5));
  }

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (symbol) => {
        // Check per-symbol cache first
        const symCache = await getCachedJson(`trading:quote:${symbol}`);
        if (symCache) return symCache as WatchlistQuote;

        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const res = await fetch(url, {
          headers: { 'User-Agent': CHROME_UA },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return null;
        const json = await res.json() as {
          chart?: {
            result?: Array<{
              meta?: {
                regularMarketPrice?: number;
                previousClose?: number;
                regularMarketVolume?: number;
                shortName?: string;
                symbol?: string;
                regularMarketTime?: number;
              };
            }>;
          };
        };
        const meta = json.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) return null;
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose ?? price;
        const quote: WatchlistQuote = {
          symbol: meta.symbol ?? symbol.toUpperCase(),
          price,
          change: price - prevClose,
          changePct: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
          volume: meta.regularMarketVolume ?? 0,
          name: meta.shortName ?? symbol.toUpperCase(),
          timestamp: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
        };
        // Cache individual quote for 2 minutes
        await setCachedJson(`trading:quote:${symbol}`, quote, QUOTES_CACHE_TTL).catch(() => {});
        return quote;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) quotes.push(r.value);
    }

    // Small delay between batches to avoid rate limiting
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Cache the full result
  if (quotes.length > 0) {
    await setCachedJson(cacheKey, quotes, QUOTES_CACHE_TTL).catch(() => {});
  }

  return jsonResponse({ quotes });
}
