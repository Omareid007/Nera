/**
 * evaluate-forward-run RPC — On-demand signal evaluation for a running forward run.
 *
 * Fetches current quotes for universe symbols, generates signals using
 * the same engine as backtests, and produces proposed actions.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getForwardRun, storeForwardRun, getStrategy } from './trading-store';
import { generateId, DEFAULT_PAPER_CAPITAL } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';
import type { ForwardSignal, ProposedAction } from './types';

/** Fetch a real-time quote from Yahoo Finance. */
async function fetchQuote(symbol: string): Promise<{ price: number; change: number; volume: number } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      chart?: { result?: Array<{
        meta?: { regularMarketPrice?: number; previousClose?: number };
        indicators?: { quote?: Array<{ close?: number[]; volume?: number[] }> };
      }> };
    };
    const meta = json.chart?.result?.[0]?.meta;
    const quotes = json.chart?.result?.[0]?.indicators?.quote?.[0];
    const closes = quotes?.close?.filter((c): c is number => c != null) ?? [];
    const volumes = quotes?.volume?.filter((v): v is number => v != null) ?? [];

    const price = meta?.regularMarketPrice ?? (closes.length > 0 ? closes[closes.length - 1] : 0);
    const prevClose = meta?.previousClose ?? (closes.length > 1 ? closes[closes.length - 2] : price);
    const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const volume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;

    return { price, change, volume };
  } catch {
    return null;
  }
}

/** Simple momentum signal from recent closes. */
function computeSignal(closes: number[], templateId: string, params: Record<string, unknown>): { direction: 'long' | 'short' | 'flat'; strength: number; reason: string } {
  if (closes.length < 3) return { direction: 'flat', strength: 0, reason: 'Insufficient data' };

  const lookback = Math.min(closes.length, Number(params.lookbackPeriod) || 20);
  const recent = closes.slice(-lookback);
  const sma = recent.reduce((s, v) => s + v, 0) / recent.length;
  const current = closes[closes.length - 1];
  const pctAboveSma = ((current - sma) / sma) * 100;

  let direction: 'long' | 'short' | 'flat' = 'flat';
  let strength = 50;
  let reason = '';

  switch (templateId) {
    case 'momentum':
    case 'breakout':
    case 'etf_rotation':
    case 'sector_rotation': {
      const threshold = Number(params.threshold) || 2;
      if (pctAboveSma > threshold) {
        direction = 'long';
        strength = Math.min(95, 60 + pctAboveSma * 5);
        reason = `Price ${pctAboveSma.toFixed(1)}% above ${lookback}-day SMA (threshold: ${threshold}%)`;
      } else if (pctAboveSma < -threshold) {
        direction = 'short';
        strength = Math.min(95, 60 + Math.abs(pctAboveSma) * 5);
        reason = `Price ${Math.abs(pctAboveSma).toFixed(1)}% below ${lookback}-day SMA`;
      } else {
        reason = `Price near ${lookback}-day SMA (${pctAboveSma.toFixed(1)}%)`;
      }
      break;
    }
    case 'mean_reversion': {
      const std = Math.sqrt(recent.reduce((s, v) => s + (v - sma) ** 2, 0) / recent.length) || 1;
      const z = (current - sma) / std;
      const entryZ = Number(params.entryZScore) || 2;
      if (z < -entryZ) {
        direction = 'long';
        strength = Math.min(95, 60 + Math.abs(z) * 10);
        reason = `Oversold: z-score = ${z.toFixed(2)} (entry at -${entryZ})`;
      } else if (z > entryZ) {
        direction = 'short';
        strength = Math.min(95, 60 + z * 10);
        reason = `Overbought: z-score = ${z.toFixed(2)} (entry at +${entryZ})`;
      } else {
        reason = `Neutral: z-score = ${z.toFixed(2)}`;
      }
      break;
    }
    case 'trend_following': {
      const fast = Number(params.fastMa) || 10;
      const slow = Number(params.slowMa) || 50;
      const fastSlice = closes.slice(-Math.min(fast, closes.length));
      const slowSlice = closes.slice(-Math.min(slow, closes.length));
      const fastSma = fastSlice.reduce((s, v) => s + v, 0) / fastSlice.length;
      const slowSma = slowSlice.reduce((s, v) => s + v, 0) / slowSlice.length;
      const spread = ((fastSma - slowSma) / slowSma) * 100;
      if (spread > 0.5) {
        direction = 'long';
        strength = Math.min(95, 60 + spread * 10);
        reason = `Bullish crossover: fast MA ${spread.toFixed(1)}% above slow MA`;
      } else if (spread < -0.5) {
        direction = 'short';
        strength = Math.min(95, 60 + Math.abs(spread) * 10);
        reason = `Bearish crossover: fast MA ${Math.abs(spread).toFixed(1)}% below slow MA`;
      } else {
        reason = `MAs converging (spread: ${spread.toFixed(2)}%)`;
      }
      break;
    }
    default: {
      if (pctAboveSma > 1) {
        direction = 'long';
        strength = Math.min(90, 55 + pctAboveSma * 5);
        reason = `Bullish: ${pctAboveSma.toFixed(1)}% above MA`;
      } else if (pctAboveSma < -1) {
        direction = 'short';
        strength = Math.min(90, 55 + Math.abs(pctAboveSma) * 5);
        reason = `Bearish: ${Math.abs(pctAboveSma).toFixed(1)}% below MA`;
      } else {
        reason = 'Neutral';
      }
    }
  }

  return { direction, strength: Math.round(strength), reason };
}

export async function evaluateForwardRun(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const run = await getForwardRun(id);
  if (!run) return errorResponse('Forward run not found', 404);
  if (run.status !== 'running') return errorResponse('Forward run is not active');

  const strategy = await getStrategy(run.strategyId);
  if (!strategy) return errorResponse('Strategy not found', 404);

  const newSignals: ForwardSignal[] = [];
  const newActions: ProposedAction[] = [];

  for (const symbol of strategy.universe) {
    const quote = await fetchQuote(symbol);
    if (!quote || quote.price === 0) continue;

    // Fetch 5d of closes for signal computation
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
      const res = await fetch(url, {
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const json = await res.json() as {
        chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
      };
      const closes = json.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((c): c is number => c != null) ?? [];
      if (closes.length === 0) continue;

      const { direction, strength, reason } = computeSignal(closes, strategy.templateId, strategy.parameters);

      const signal: ForwardSignal = {
        id: generateId(),
        symbol,
        direction,
        strength,
        reason,
        timestamp: Date.now(),
      };
      newSignals.push(signal);

      // Generate proposed action for strong signals in assisted/semi_auto modes
      if (strength >= 65 && direction !== 'flat' && run.mode !== 'insight_only') {
        const positionSize = strategy.riskLimits.maxPositionPct / 100;
        const capital = DEFAULT_PAPER_CAPITAL;
        const qty = Math.floor((capital * positionSize) / quote.price);
        if (qty > 0) {
          const action: ProposedAction = {
            id: generateId(),
            signalId: signal.id,
            symbol,
            side: direction === 'long' ? 'buy' : 'sell',
            quantity: qty,
            price: quote.price,
            reason: `${reason} | Signal strength: ${strength}%`,
            status: 'proposed',
            timestamp: Date.now(),
          };
          newActions.push(action);
        }
      }
    } catch {
      continue;
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  // Append new signals/actions (keep last 50)
  run.signals = [...run.signals, ...newSignals].slice(-50);
  run.proposedActions = [...run.proposedActions, ...newActions].slice(-50);
  run.lastEvaluatedAt = Date.now();
  await storeForwardRun(run);

  return jsonResponse({ forwardRun: run, newSignals, newActions });
}
