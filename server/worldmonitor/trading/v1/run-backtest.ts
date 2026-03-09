/**
 * Run a portfolio-level backtest for a strategy.
 *
 * Process:
 * 1. Fetch historical data for all symbols in universe (Yahoo Finance)
 * 2. Walk through each trading day
 * 3. Apply strategy signals (from technical snapshot)
 * 4. Simulate entries/exits with position sizing
 * 5. Compute metrics and equity curve
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getStrategy, storeBacktestRun, setCachedHistory, getCachedHistory } from './trading-store';
import { generateId } from './_shared';
import type { BacktestRun, BacktestMetrics, BacktestTrade, EquityCurvePoint } from './types';
import { CHROME_UA } from '../../../_shared/constants';

type Candle = { timestamp: number; open: number; high: number; low: number; close: number; volume: number };

const YAHOO_TIMEOUT = 15_000;
const TTL_24H = 86_400;

/** Fetch historical candles from Yahoo Finance with Redis caching. */
async function fetchHistory(symbol: string, months: number): Promise<Candle[]> {
  const rangeKey = `${months}mo`;
  const cached = await getCachedHistory(symbol, rangeKey);
  if (cached) return cached as Candle[];

  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - months * 30 * 86400;
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), YAHOO_TIMEOUT);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: controller.signal,
    });
    if (!res.ok) return [];

    const json = await res.json() as {
      chart?: { result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }> };
      }> };
    };

    const result = json.chart?.result?.[0];
    if (!result?.timestamp || !result.indicators?.quote?.[0]) return [];

    const q = result.indicators.quote[0];
    const candles: Candle[] = [];
    for (let i = 0; i < result.timestamp.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
      if (o != null && h != null && l != null && c != null && v != null) {
        candles.push({ timestamp: result.timestamp[i] * 1000, open: o, high: h, low: l, close: c, volume: v });
      }
    }

    if (candles.length > 0) {
      await setCachedHistory(symbol, rangeKey, candles, TTL_24H);
    }
    return candles;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Compute Simple Moving Average at position i with window w. */
function sma(closes: number[], i: number, w: number): number | null {
  if (i < w - 1) return null;
  let sum = 0;
  for (let j = i - w + 1; j <= i; j++) sum += closes[j];
  return sum / w;
}

/** Simple momentum signal: price is above its lookback-period MA. */
function momentumSignal(closes: number[], i: number, lookback: number): number {
  const ma = sma(closes, i, lookback);
  if (!ma) return 0;
  const pct = (closes[i] - ma) / ma * 100;
  return Math.max(0, Math.min(100, 50 + pct * 10));
}

/** Simple mean reversion signal: z-score relative to lookback MA. */
function meanReversionSignal(closes: number[], i: number, lookback: number): number {
  if (i < lookback) return 0;
  let sum = 0, sq = 0;
  for (let j = i - lookback; j < i; j++) {
    sum += closes[j];
    sq += closes[j] * closes[j];
  }
  const mean = sum / lookback;
  const std = Math.sqrt(sq / lookback - mean * mean) || 1;
  const z = (closes[i] - mean) / std;
  // Negative z-score = oversold = buy signal
  return Math.max(0, Math.min(100, 50 - z * 25));
}

/** Trend following signal: fast MA > slow MA crossover. */
function trendSignal(closes: number[], i: number, fast: number, slow: number): number {
  const fma = sma(closes, i, fast);
  const sma2 = sma(closes, i, slow);
  if (!fma || !sma2) return 0;
  const diff = (fma - sma2) / sma2 * 100;
  return Math.max(0, Math.min(100, 50 + diff * 15));
}

/** Generate signal strength (0-100) based on strategy template and parameters. */
function generateSignal(closes: number[], i: number, templateId: string, params: Record<string, unknown>): number {
  switch (templateId) {
    case 'momentum':
      return momentumSignal(closes, i, Number(params.lookbackPeriod) || 20);
    case 'mean_reversion':
      return meanReversionSignal(closes, i, Number(params.lookbackPeriod) || 20);
    case 'trend_following':
      return trendSignal(closes, i, Number(params.fastMa) || 10, Number(params.slowMa) || 50);
    case 'breakout':
      return momentumSignal(closes, i, Number(params.consolidationPeriod) || 15);
    case 'etf_rotation':
    case 'sector_rotation':
      return momentumSignal(closes, i, Number(params.momentumWindow) || 60);
    default:
      return momentumSignal(closes, i, 20);
  }
}

export async function runBacktest(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const strategyId = body.strategyId as string | undefined;
  const startDate = body.startDate as string | undefined;
  const endDate = body.endDate as string | undefined;
  const initialCapital = Number(body.initialCapital) || 100_000;

  if (!strategyId) return errorResponse('strategyId is required');

  const strategy = await getStrategy(strategyId);
  if (!strategy) return errorResponse('Strategy not found', 404);

  // Cap universe size to prevent unbounded latency (each symbol requires a sequential fetch)
  const MAX_UNIVERSE = 30;
  if (strategy.universe.length > MAX_UNIVERSE) {
    return errorResponse(`Universe size ${strategy.universe.length} exceeds maximum of ${MAX_UNIVERSE} symbols`, 400);
  }

  // Determine date range
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getTime() - 180 * 86_400_000);
  const end = endDate ? new Date(endDate) : now;
  const months = Math.ceil((end.getTime() - start.getTime()) / (30 * 86_400_000)) + 1;

  // Fetch historical data for all symbols (limited concurrency to avoid rate limits)
  const symbolData: Record<string, Candle[]> = {};
  let totalBars = 0;
  let missingBars = 0;

  for (const symbol of strategy.universe) {
    const candles = await fetchHistory(symbol, months);
    const filtered = candles.filter((c) => c.timestamp >= start.getTime() && c.timestamp <= end.getTime());
    symbolData[symbol] = filtered;
    totalBars += filtered.length;
    if (filtered.length === 0) missingBars++;
    // Small delay between requests to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  if (totalBars === 0) {
    const run: BacktestRun = {
      id: generateId(),
      strategyId,
      strategyName: strategy.name,
      templateId: strategy.templateId,
      parameters: strategy.parameters,
      universe: strategy.universe,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      initialCapital,
      status: 'failed',
      metrics: null,
      trades: [],
      equityCurve: [],
      provider: 'yahoo_finance',
      barsAvailable: 0,
      barsMissing: strategy.universe.length,
      createdAt: Date.now(),
      completedAt: Date.now(),
      error: 'No historical data available for any symbol in universe',
    };
    await storeBacktestRun(run);
    return jsonResponse({ backtestRun: run });
  }

  // Build unified timeline
  const allDates = new Set<number>();
  for (const candles of Object.values(symbolData)) {
    for (const c of candles) allDates.add(c.timestamp);
  }
  const dates = Array.from(allDates).sort((a, b) => a - b);

  // Build close arrays per symbol
  const closeArrays: Record<string, number[]> = {};
  const dateToIdx: Record<string, Record<number, number>> = {};
  for (const symbol of strategy.universe) {
    const candles = symbolData[symbol];
    closeArrays[symbol] = candles.map((c) => c.close);
    dateToIdx[symbol] = {};
    candles.forEach((c, i) => { dateToIdx[symbol][c.timestamp] = i; });
  }

  // Simulate
  let cash = initialCapital;
  const positions: Record<string, { qty: number; entryPrice: number; entryDate: string; side: 'long' | 'short' }> = {};
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityCurvePoint[] = [];
  const maxPositions = strategy.riskLimits.maxPositions;
  const positionSize = strategy.riskLimits.maxPositionPct / 100;
  const stopLoss = strategy.riskLimits.stopLossPct / 100;
  const takeProfit = strategy.riskLimits.takeProfitPct / 100;
  let peakEquity = initialCapital;

  for (const ts of dates) {
    const dateStr = new Date(ts).toISOString().slice(0, 10);

    // Check existing positions for exits
    for (const symbol of Object.keys(positions)) {
      const idx = dateToIdx[symbol]?.[ts];
      if (idx === undefined) continue;

      const pos = positions[symbol];
      const currentPrice = closeArrays[symbol][idx];
      const pnlPct = (currentPrice - pos.entryPrice) / pos.entryPrice;

      let exitReason: BacktestTrade['exitReason'] | null = null;

      if (pnlPct <= -stopLoss) exitReason = 'stop_loss';
      else if (pnlPct >= takeProfit) exitReason = 'take_profit';
      else {
        // Check signal for exit
        const signal = generateSignal(closeArrays[symbol], idx, strategy.templateId, strategy.parameters);
        if (signal < 30) exitReason = 'signal';
      }

      if (exitReason) {
        const pnl = (currentPrice - pos.entryPrice) * pos.qty;
        cash += currentPrice * pos.qty;
        trades.push({
          id: generateId(),
          symbol,
          side: pos.side,
          entryDate: pos.entryDate,
          entryPrice: pos.entryPrice,
          exitDate: dateStr,
          exitPrice: currentPrice,
          quantity: pos.qty,
          pnl,
          pnlPct: pnlPct * 100,
          exitReason,
        });
        delete positions[symbol];
      }
    }

    // Compute current equity for position sizing (before new entries)
    let currentEquity = cash;
    for (const sym of Object.keys(positions)) {
      const sIdx = dateToIdx[sym]?.[ts];
      if (sIdx !== undefined) currentEquity += closeArrays[sym][sIdx] * positions[sym].qty;
    }

    // Check for new entries
    const openCount = Object.keys(positions).length;
    if (openCount < maxPositions) {
      for (const symbol of strategy.universe) {
        if (positions[symbol]) continue;
        if (Object.keys(positions).length >= maxPositions) break;

        const idx = dateToIdx[symbol]?.[ts];
        if (idx === undefined || idx < 5) continue;

        const signal = generateSignal(closeArrays[symbol], idx, strategy.templateId, strategy.parameters);

        if (signal >= 65) {
          const price = closeArrays[symbol][idx];
          const allocation = Math.min(currentEquity * positionSize, cash);
          if (allocation < price) continue;

          const qty = Math.floor(allocation / price);
          if (qty === 0) continue;

          cash -= price * qty;
          positions[symbol] = { qty, entryPrice: price, entryDate: dateStr, side: 'long' };
        }
      }
    }

    // Compute portfolio equity
    let positionValue = 0;
    for (const symbol of Object.keys(positions)) {
      const idx = dateToIdx[symbol]?.[ts];
      if (idx !== undefined) {
        positionValue += closeArrays[symbol][idx] * positions[symbol].qty;
      }
    }
    const equity = cash + positionValue;
    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;

    equityCurve.push({ date: dateStr, equity, drawdown, cash });
  }

  // Close any remaining positions at last known price
  for (const symbol of Object.keys(positions)) {
    const closes = closeArrays[symbol];
    if (closes.length === 0) continue;
    const lastPrice = closes[closes.length - 1];
    const pos = positions[symbol];
    const pnl = (lastPrice - pos.entryPrice) * pos.qty;
    const pnlPct = (lastPrice - pos.entryPrice) / pos.entryPrice;
    cash += lastPrice * pos.qty;
    trades.push({
      id: generateId(),
      symbol,
      side: pos.side,
      entryDate: pos.entryDate,
      entryPrice: pos.entryPrice,
      exitDate: dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString().slice(0, 10) : '',
      exitPrice: lastPrice,
      quantity: pos.qty,
      pnl,
      pnlPct: pnlPct * 100,
      exitReason: 'expiry',
    });
    delete positions[symbol];
  }

  // Compute metrics
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const totalReturn = (finalEquity - initialCapital) / initialCapital * 100;
  const tradingDays = equityCurve.length;
  const yearsTraded = tradingDays / 252 || 1;
  const annualizedReturn = ((finalEquity / initialCapital) ** (1 / yearsTraded) - 1) * 100;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? wins.length / trades.length * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPct, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length : 0;
  const profitFactor = losses.length > 0 && losses.reduce((s, t) => s + Math.abs(t.pnl), 0) > 0
    ? wins.reduce((s, t) => s + t.pnl, 0) / losses.reduce((s, t) => s + Math.abs(t.pnl), 0)
    : wins.length > 0 ? Infinity : 0;

  // Sharpe/Sortino from daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity);
  }
  const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const stdDev = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length - 1))
    : 1;
  const downDev = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + Math.min(r, 0) ** 2, 0) / dailyReturns.length)
    : 1;
  const sharpeRatio = stdDev > 0 ? (avgReturn * 252) / (stdDev * Math.sqrt(252)) : 0;
  const sortinoRatio = downDev > 0 ? (avgReturn * 252) / (downDev * Math.sqrt(252)) : 0;

  const maxDrawdown = Math.max(...equityCurve.map((p) => p.drawdown), 0) * 100;
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

  // Max drawdown duration
  let maxDdDuration = 0, currentDdDuration = 0;
  for (const point of equityCurve) {
    if (point.drawdown > 0) {
      currentDdDuration++;
      if (currentDdDuration > maxDdDuration) maxDdDuration = currentDdDuration;
    } else {
      currentDdDuration = 0;
    }
  }

  const avgTradeDuration = trades.length > 0
    ? trades.reduce((s, t) => {
        const entry = new Date(t.entryDate).getTime();
        const exit = new Date(t.exitDate).getTime();
        return s + (exit - entry) / 86_400_000;
      }, 0) / trades.length
    : 0;

  const metrics: BacktestMetrics = {
    totalReturn: Number(totalReturn.toFixed(2)),
    annualizedReturn: Number(annualizedReturn.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownDuration: maxDdDuration,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(Math.min(profitFactor, 999).toFixed(2)),
    totalTrades: trades.length,
    avgTradeDuration: Number(avgTradeDuration.toFixed(1)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    calmarRatio: Number(calmarRatio.toFixed(2)),
  };

  const run: BacktestRun = {
    id: generateId(),
    strategyId,
    strategyName: strategy.name,
    templateId: strategy.templateId,
    parameters: strategy.parameters,
    universe: strategy.universe,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    initialCapital,
    status: 'complete',
    metrics,
    trades,
    equityCurve,
    provider: 'yahoo_finance',
    barsAvailable: totalBars,
    barsMissing: missingBars,
    createdAt: Date.now(),
    completedAt: Date.now(),
    error: null,
  };

  await storeBacktestRun(run);

  return jsonResponse({ backtestRun: run });
}
