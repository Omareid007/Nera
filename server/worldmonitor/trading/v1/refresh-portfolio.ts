/**
 * refresh-portfolio RPC — Updates all position prices from live market data
 * and recalculates P&L, exposure, and equity metrics.
 */

import { jsonResponse, errorResponse } from './handler';
import { getPortfolioSnapshot, storePortfolioSnapshot } from './trading-store';
import { DEFAULT_PAPER_CAPITAL } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';
import type { PortfolioSnapshot } from './types';

async function fetchBatchPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (symbols.length === 0) return prices;

  try {
    const symbolStr = symbols.join(',');
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolStr)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return prices;
    const json = await res.json() as {
      quoteResponse?: { result?: Array<{ symbol?: string; regularMarketPrice?: number }> };
    };
    for (const q of json.quoteResponse?.result ?? []) {
      if (q.symbol && q.regularMarketPrice) {
        prices.set(q.symbol, q.regularMarketPrice);
      }
    }
  } catch {
    // Best-effort
  }

  return prices;
}

export async function refreshPortfolio(_req: Request): Promise<Response> {
  const portfolio = await getPortfolioSnapshot();
  if (!portfolio) {
    return jsonResponse({ portfolio: createDefaultPortfolio(), refreshed: false });
  }

  if (portfolio.positions.length === 0) {
    portfolio.timestamp = Date.now();
    await storePortfolioSnapshot(portfolio);
    return jsonResponse({ portfolio, refreshed: true, pricesUpdated: 0 });
  }

  // Fetch live prices for all held positions
  const symbols = portfolio.positions.map((p) => p.symbol);
  const prices = await fetchBatchPrices(symbols);

  let pricesUpdated = 0;
  for (const pos of portfolio.positions) {
    const newPrice = prices.get(pos.symbol);
    if (newPrice !== undefined && newPrice !== pos.currentPrice) {
      pos.currentPrice = newPrice;
      pos.marketValue = newPrice * pos.quantity;
      pos.unrealizedPnl = (newPrice - pos.avgEntryPrice) * pos.quantity;
      pos.unrealizedPnlPct = pos.avgEntryPrice > 0 ? ((newPrice / pos.avgEntryPrice) - 1) * 100 : 0;
      pricesUpdated++;
    }
  }

  // Recompute portfolio-level totals
  let positionsValue = 0, unrealizedPnl = 0, longExposure = 0, shortExposure = 0;
  for (const pos of portfolio.positions) {
    positionsValue += pos.marketValue;
    unrealizedPnl += pos.unrealizedPnl;
    if (pos.side === 'long') longExposure += pos.marketValue;
    else shortExposure += pos.marketValue;
  }

  portfolio.positionsValue = positionsValue;
  portfolio.unrealizedPnl = unrealizedPnl;
  portfolio.totalEquity = portfolio.cash + positionsValue;
  portfolio.totalPnl = portfolio.realizedPnl + unrealizedPnl;
  portfolio.totalPnlPct = portfolio.totalEquity > 0 ? ((portfolio.totalEquity - DEFAULT_PAPER_CAPITAL) / DEFAULT_PAPER_CAPITAL) * 100 : 0;
  portfolio.longExposure = longExposure;
  portfolio.shortExposure = shortExposure;
  portfolio.netExposure = longExposure - shortExposure;
  portfolio.positionCount = portfolio.positions.length;
  portfolio.timestamp = Date.now();

  try {
    await storePortfolioSnapshot(portfolio);
  } catch {
    return errorResponse('Failed to save refreshed portfolio', 500);
  }

  return jsonResponse({ portfolio, refreshed: true, pricesUpdated });
}

function createDefaultPortfolio(): PortfolioSnapshot {
  return {
    totalEquity: DEFAULT_PAPER_CAPITAL,
    cash: DEFAULT_PAPER_CAPITAL,
    positionsValue: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
    totalPnl: 0,
    totalPnlPct: 0,
    positions: [],
    longExposure: 0,
    shortExposure: 0,
    netExposure: 0,
    positionCount: 0,
    timestamp: Date.now(),
  };
}
