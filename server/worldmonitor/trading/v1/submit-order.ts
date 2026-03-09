/**
 * submit-order RPC — Paper execution: creates an order, immediately fills at market price.
 *
 * Paper broker adapter — simulates instant fills at the current market price.
 * In production, this would route through a real broker (Alpaca, IBKR, etc).
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { storeOrder, getPortfolioSnapshot, storePortfolioSnapshot, storeLedgerEntry } from './trading-store';
import { generateId, DEFAULT_PAPER_CAPITAL, isValidSymbol } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';
import type { Order, Position, PortfolioSnapshot, LedgerEntry } from './types';

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    return json.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function submitOrder(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const symbol = body.symbol as string | undefined;
  const side = body.side as string | undefined;
  const quantity = Number(body.quantity);
  const strategyId = (body.strategyId as string) || '';
  const forwardRunId = (body.forwardRunId as string) || null;
  const source = (body.source as string) || 'manual';

  if (!symbol) return errorResponse('symbol is required');
  if (!isValidSymbol(symbol)) return errorResponse('Invalid symbol format');
  if (!side || !['buy', 'sell'].includes(side)) return errorResponse('side must be buy or sell');
  if (!quantity || quantity <= 0) return errorResponse('quantity must be positive');
  if (quantity > 1_000_000) return errorResponse('quantity exceeds maximum of 1,000,000 shares');

  const validSources: Order['source'][] = ['manual', 'forward_runner', 'rebalance'];
  if (!validSources.includes(source as Order['source'])) {
    return errorResponse('source must be one of: manual, forward_runner, rebalance');
  }

  // Normalize symbol to uppercase for consistent matching
  const normalizedSymbol = symbol.toUpperCase();

  // Paper mode: reject short sells (selling without an existing long position)
  if (side === 'sell') {
    const existingPortfolio = await getPortfolioSnapshot();
    const longPosition = existingPortfolio?.positions.find((p) => p.symbol === normalizedSymbol && p.side === 'long');
    if (!longPosition || longPosition.quantity <= 0) {
      return errorResponse('Cannot sell — no long position in ' + symbol + '. Short selling is disabled in paper mode.');
    }
    if (quantity > longPosition.quantity) {
      return errorResponse(`Cannot sell ${quantity} shares — only ${longPosition.quantity} held. Short selling is disabled in paper mode.`);
    }
  }

  // Fetch current price for paper fill
  const price = await fetchCurrentPrice(normalizedSymbol);
  if (!price) return errorResponse('Could not fetch current price for ' + normalizedSymbol, 502);

  // Validate sufficient cash for buy orders
  if (side === 'buy') {
    const currentPortfolio = await getPortfolioSnapshot() ?? createDefaultPortfolio();
    const cost = price * quantity;
    if (cost > currentPortfolio.cash) {
      return errorResponse(`Insufficient cash: need $${cost.toFixed(2)} but only $${currentPortfolio.cash.toFixed(2)} available`);
    }
  }

  // Create order (immediately filled for paper)
  const order: Order = {
    id: generateId(),
    strategyId,
    forwardRunId,
    symbol: normalizedSymbol,
    side: side as 'buy' | 'sell',
    type: 'market',
    quantity,
    limitPrice: null,
    fillPrice: price,
    fillQuantity: quantity,
    status: 'filled',
    source: source as Order['source'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await storeOrder(order);
  } catch {
    return errorResponse('Failed to store order', 500);
  }

  // Update portfolio
  const portfolio = await getPortfolioSnapshot() ?? createDefaultPortfolio();
  updatePortfolioWithFill(portfolio, order);

  try {
    await storePortfolioSnapshot(portfolio);
  } catch {
    return errorResponse('Order created but failed to update portfolio', 500);
  }

  // Write ledger entries
  const orderEntry: LedgerEntry = {
    id: generateId(),
    type: 'order',
    strategyId: strategyId || null,
    orderId: order.id,
    symbol: normalizedSymbol,
    side: side as 'buy' | 'sell',
    quantity,
    price,
    amount: price * quantity * (side === 'buy' ? -1 : 1),
    description: `${side.toUpperCase()} ${quantity} ${normalizedSymbol} @ $${price.toFixed(2)} (paper)`,
    timestamp: Date.now(),
  };

  const fillEntry: LedgerEntry = {
    id: generateId(),
    type: 'fill',
    strategyId: strategyId || null,
    orderId: order.id,
    symbol: normalizedSymbol,
    side: side as 'buy' | 'sell',
    quantity,
    price,
    amount: price * quantity * (side === 'buy' ? -1 : 1),
    description: `Filled: ${side.toUpperCase()} ${quantity} ${normalizedSymbol} @ $${price.toFixed(2)}`,
    timestamp: Date.now(),
  };

  try {
    await storeLedgerEntry(orderEntry);
    await storeLedgerEntry(fillEntry);
  } catch {
    // Non-critical — order and portfolio already saved, ledger is best-effort
  }

  return jsonResponse({ order, portfolio });
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

function updatePortfolioWithFill(portfolio: PortfolioSnapshot, order: Order): void {
  const price = order.fillPrice!;
  const qty = order.fillQuantity;

  if (order.side === 'buy') {
    // Deduct cash
    portfolio.cash -= price * qty;

    // Find or create position
    const existing = portfolio.positions.find((p) => p.symbol === order.symbol && p.side === 'long');
    if (existing) {
      const totalCost = existing.avgEntryPrice * existing.quantity + price * qty;
      existing.quantity += qty;
      existing.avgEntryPrice = totalCost / existing.quantity;
      existing.currentPrice = price;
      existing.marketValue = existing.currentPrice * existing.quantity;
      existing.unrealizedPnl = (existing.currentPrice - existing.avgEntryPrice) * existing.quantity;
      existing.unrealizedPnlPct = (existing.currentPrice / existing.avgEntryPrice - 1) * 100;
    } else {
      portfolio.positions.push({
        symbol: order.symbol,
        quantity: qty,
        avgEntryPrice: price,
        currentPrice: price,
        marketValue: price * qty,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        realizedPnl: 0,
        side: 'long',
        strategyId: order.strategyId,
        openedAt: Date.now(),
      });
    }
  } else {
    // Sell — close or reduce position
    const existing = portfolio.positions.find((p) => p.symbol === order.symbol && p.side === 'long');
    if (existing) {
      const soldQty = Math.min(qty, existing.quantity);
      const pnl = (price - existing.avgEntryPrice) * soldQty;
      portfolio.cash += price * soldQty;
      portfolio.realizedPnl += pnl;
      existing.quantity -= soldQty;
      existing.realizedPnl += pnl;
      if (existing.quantity <= 0) {
        portfolio.positions = portfolio.positions.filter((p) => p !== existing);
      } else {
        existing.currentPrice = price;
        existing.marketValue = existing.currentPrice * existing.quantity;
        existing.unrealizedPnl = (existing.currentPrice - existing.avgEntryPrice) * existing.quantity;
        existing.unrealizedPnlPct = (existing.currentPrice / existing.avgEntryPrice - 1) * 100;
      }
    }
    // Note: sell without position is rejected by validation at top of handler
  }

  // Recompute totals
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
}
