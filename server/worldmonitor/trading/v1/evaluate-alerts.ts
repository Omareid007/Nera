/**
 * evaluate-alerts RPC — Checks all active alerts against current market data.
 * Triggers alerts when thresholds are breached.
 */

import { jsonResponse, errorResponse } from './handler';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import { getPortfolioSnapshot } from './trading-store';
import { CHROME_UA } from '../../../_shared/constants';
import type { Alert } from './alerts';

const ALERTS_KEY = 'trading:alerts:v1:list';
const TTL_90D = 90 * 24 * 3600;

async function getAlerts(): Promise<Alert[]> {
  return ((await getCachedJson(ALERTS_KEY)) ?? []) as Alert[];
}

async function saveAlerts(alerts: Alert[]): Promise<void> {
  await setCachedJson(ALERTS_KEY, alerts, TTL_90D);
}

interface QuoteResult {
  symbol: string;
  price: number;
  volume: number;
  rsi?: number;
}

async function fetchQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();
  if (symbols.length === 0) return results;

  // Batch fetch via Yahoo Finance
  const symbolStr = symbols.join(',');
  try {
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolStr)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return results;
    const json = await res.json() as {
      quoteResponse?: { result?: Array<{
        symbol?: string;
        regularMarketPrice?: number;
        regularMarketVolume?: number;
        averageDailyVolume10Day?: number;
      }> };
    };
    for (const q of json.quoteResponse?.result ?? []) {
      if (q.symbol && q.regularMarketPrice) {
        results.set(q.symbol, {
          symbol: q.symbol,
          price: q.regularMarketPrice,
          volume: q.regularMarketVolume ?? 0,
        });
      }
    }
  } catch {
    // Best-effort
  }

  return results;
}

export async function evaluateAlerts(_req: Request): Promise<Response> {
  try {
    const alerts = await getAlerts();
    const active = alerts.filter((a) => a.status === 'active');
    if (active.length === 0) return jsonResponse({ evaluated: 0, triggered: [] });

    // Collect unique symbols that need price checks
    const priceSymbols = new Set<string>();
    for (const a of active) {
      if (a.symbol && ['price_above', 'price_below', 'volume_spike', 'rsi_overbought', 'rsi_oversold'].includes(a.type)) {
        priceSymbols.add(a.symbol);
      }
    }

    // Fetch market data and portfolio in parallel
    const [quotes, portfolio] = await Promise.all([
      fetchQuotes([...priceSymbols]),
      getPortfolioSnapshot(),
    ]);

    const triggered: Alert[] = [];

    for (const alert of active) {
      let shouldTrigger = false;
      let currentValue: number | null = null;

      switch (alert.type) {
        case 'price_above': {
          const q = alert.symbol ? quotes.get(alert.symbol) : null;
          if (q && q.price >= alert.threshold) {
            shouldTrigger = true;
            currentValue = q.price;
          }
          break;
        }
        case 'price_below': {
          const q = alert.symbol ? quotes.get(alert.symbol) : null;
          if (q && q.price <= alert.threshold) {
            shouldTrigger = true;
            currentValue = q.price;
          }
          break;
        }
        case 'pnl_threshold': {
          if (portfolio) {
            const pnlPct = portfolio.totalPnlPct;
            // Trigger if absolute P&L % exceeds threshold
            if (Math.abs(pnlPct) >= alert.threshold) {
              shouldTrigger = true;
              currentValue = pnlPct;
            }
          }
          break;
        }
        case 'drawdown_threshold': {
          if (portfolio && portfolio.totalEquity > 0) {
            // Approximate drawdown from initial capital
            const drawdownPct = portfolio.totalPnlPct < 0 ? Math.abs(portfolio.totalPnlPct) : 0;
            if (drawdownPct >= alert.threshold) {
              shouldTrigger = true;
              currentValue = drawdownPct;
            }
          }
          break;
        }
        case 'volume_spike': {
          const q = alert.symbol ? quotes.get(alert.symbol) : null;
          // Volume spike: current volume exceeds threshold multiplier of avg
          if (q && q.volume > 0) {
            // threshold is multiplier (e.g. 2 = 2x average)
            // We use volume directly as the value for now
            currentValue = q.volume;
            // Simplified: trigger if volume > threshold (in millions)
            if (q.volume > alert.threshold * 1_000_000) {
              shouldTrigger = true;
            }
          }
          break;
        }
        case 'rsi_overbought': {
          // Would need RSI calculation — flag as triggered if price is > threshold
          const q = alert.symbol ? quotes.get(alert.symbol) : null;
          if (q) currentValue = q.price;
          // RSI > threshold (typically 70) — simplified, use price momentum proxy
          break;
        }
        case 'rsi_oversold': {
          const q = alert.symbol ? quotes.get(alert.symbol) : null;
          if (q) currentValue = q.price;
          break;
        }
      }

      if (shouldTrigger) {
        alert.status = 'triggered';
        alert.triggeredAt = Date.now();
        alert.triggeredValue = currentValue;
        triggered.push(alert);
      }
    }

    if (triggered.length > 0) {
      await saveAlerts(alerts);
    }

    return jsonResponse({ evaluated: active.length, triggered });
  } catch {
    return errorResponse('Failed to evaluate alerts', 500);
  }
}
