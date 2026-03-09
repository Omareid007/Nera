/**
 * deposit / withdraw RPC — Paper account fund management.
 * Adjusts cash balance and writes ledger entries for audit trail.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getPortfolioSnapshot, storePortfolioSnapshot, storeLedgerEntry } from './trading-store';
import { generateId, DEFAULT_PAPER_CAPITAL } from './_shared';
import type { PortfolioSnapshot, LedgerEntry } from './types';

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

export async function deposit(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const amount = Number(body.amount);
  const description = (body.description as string) || 'Paper deposit';

  if (!amount || amount <= 0) return errorResponse('amount must be positive');
  if (amount > 10_000_000) return errorResponse('maximum deposit is $10,000,000');

  const portfolio = await getPortfolioSnapshot() ?? createDefaultPortfolio();
  portfolio.cash += amount;
  portfolio.totalEquity = portfolio.cash + portfolio.positionsValue;
  portfolio.timestamp = Date.now();

  const entry: LedgerEntry = {
    id: generateId(),
    type: 'deposit',
    strategyId: null,
    orderId: null,
    symbol: null,
    side: null,
    quantity: null,
    price: null,
    amount,
    description,
    timestamp: Date.now(),
  };

  try {
    await storePortfolioSnapshot(portfolio);
    await storeLedgerEntry(entry);
  } catch {
    return errorResponse('Failed to process deposit', 500);
  }

  return jsonResponse({ portfolio, ledgerEntry: entry });
}

export async function withdraw(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const amount = Number(body.amount);
  const description = (body.description as string) || 'Paper withdrawal';

  if (!amount || amount <= 0) return errorResponse('amount must be positive');

  const portfolio = await getPortfolioSnapshot() ?? createDefaultPortfolio();

  if (amount > portfolio.cash) {
    return errorResponse(`Insufficient cash: requested $${amount.toFixed(2)} but only $${portfolio.cash.toFixed(2)} available`);
  }

  portfolio.cash -= amount;
  portfolio.totalEquity = portfolio.cash + portfolio.positionsValue;
  portfolio.timestamp = Date.now();

  const entry: LedgerEntry = {
    id: generateId(),
    type: 'withdrawal',
    strategyId: null,
    orderId: null,
    symbol: null,
    side: null,
    quantity: null,
    price: null,
    amount: -amount,
    description,
    timestamp: Date.now(),
  };

  try {
    await storePortfolioSnapshot(portfolio);
    await storeLedgerEntry(entry);
  } catch {
    return errorResponse('Failed to process withdrawal', 500);
  }

  return jsonResponse({ portfolio, ledgerEntry: entry });
}
