import { jsonResponse } from './handler';
import { DEFAULT_PAPER_CAPITAL } from './_shared';
import { getPortfolioSnapshot } from './trading-store';
import type { PortfolioSnapshot } from './types';

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

export async function getPortfolioHandler(_req: Request): Promise<Response> {
  const snapshot = await getPortfolioSnapshot();
  return jsonResponse({ portfolio: snapshot ?? createDefaultPortfolio() });
}
