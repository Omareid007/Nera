/**
 * list-prediction-markets RPC — Fetches live prediction market data from Kalshi + Polymarket.
 * Returns probability-priced event contracts useful for trading signal generation.
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';

interface PredictionMarket {
  id: string;
  title: string;
  probability: number;
  volume: number;
  source: 'kalshi' | 'polymarket';
  category: string;
  lastUpdated: number;
}

const CACHE_KEY = 'trading:prediction-markets:v1';
const CACHE_TTL = 300; // 5 minutes

async function fetchKalshi(): Promise<PredictionMarket[]> {
  try {
    const res = await fetch('https://api.elections.kalshi.com/trade-api/v2/events?limit=20&status=open', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = await res.json() as {
      events?: Array<{
        event_ticker: string;
        title: string;
        category: string;
        markets?: Array<{
          ticker: string;
          last_price: number;
          volume: number;
          yes_ask: number;
        }>;
      }>;
    };
    const events = json.events ?? [];
    const markets: PredictionMarket[] = [];
    for (const event of events) {
      // Pick highest-volume market per event
      const best = event.markets?.reduce<(typeof event.markets)[0] | null>(
        (a, b) => (!a || b.volume > a.volume ? b : a),
        null,
      );
      if (!best || best.volume < 5000) continue;
      const price = best.last_price ?? best.yes_ask ?? 0;
      if (!Number.isFinite(price) || price <= 0) continue;
      markets.push({
        id: `kalshi-${best.ticker}`,
        title: event.title,
        probability: Math.round(price * 100),
        volume: best.volume,
        source: 'kalshi',
        category: event.category || 'general',
        lastUpdated: Date.now(),
      });
    }
    return markets;
  } catch {
    return [];
  }
}

async function fetchPolymarket(): Promise<PredictionMarket[]> {
  try {
    const res = await fetch('https://gamma-api.polymarket.com/markets?closed=false&limit=20&order=volume&ascending=false', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const items = (await res.json()) as Array<{
      id: string;
      question: string;
      outcomePrices: string;
      volume: number;
      category: string;
    }>;
    return items
      .filter((m) => m.volume > 5000)
      .map((m) => {
        let prob = 50;
        try {
          const prices = JSON.parse(m.outcomePrices);
          if (Array.isArray(prices) && prices.length > 0) prob = Math.round(Number(prices[0]) * 100);
        } catch { /* ignore */ }
        return {
          id: `poly-${m.id}`,
          title: m.question,
          probability: prob,
          volume: m.volume,
          source: 'polymarket' as const,
          category: m.category || 'general',
          lastUpdated: Date.now(),
        };
      });
  } catch {
    return [];
  }
}

export async function listPredictionMarkets(_req: Request): Promise<Response> {
  // Check cache first
  try {
    const cached = await getCachedJson(CACHE_KEY) as { markets: PredictionMarket[]; timestamp: number } | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return jsonResponse(cached);
    }
  } catch { /* proceed to fetch */ }

  const [kalshi, polymarket] = await Promise.all([fetchKalshi(), fetchPolymarket()]);
  const markets = [...kalshi, ...polymarket].sort((a, b) => b.volume - a.volume);

  const result = { markets, timestamp: Date.now() };

  // Cache result
  try { await setCachedJson(CACHE_KEY, result, CACHE_TTL); } catch { /* non-critical */ }

  return jsonResponse(result);
}
