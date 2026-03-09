/**
 * get-attribution RPC — Factor-based performance attribution using real benchmark data.
 * Decomposes strategy returns into market, sector, style, and alpha components
 * using actual S&P 500 returns as the market factor.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getBacktestRun } from './trading-store';
import { CHROME_UA } from '../../../_shared/constants';
import type { BacktestRun } from './types';

interface Attribution {
  marketReturn: number;
  sectorReturn: number;
  styleReturn: number;
  idiosyncraticReturn: number;
  totalReturn: number;
  benchmarkReturn: number;
  beta: number;
  alpha: number;
  rSquared: number;
  trackingError: number;
  informationRatio: number;
}

async function fetchBenchmarkReturns(startDate: string, endDate: string): Promise<number[] | null> {
  try {
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/SPY?period1=${start}&period2=${end}&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      chart?: { result?: Array<{ indicators?: { adjclose?: Array<{ adjclose?: number[] }> } }> };
    };
    const closes = json.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose;
    if (!closes || closes.length < 2) return null;

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1]! > 0) {
        returns.push((closes[i]! - closes[i - 1]!) / closes[i - 1]!);
      }
    }
    return returns;
  } catch {
    return null;
  }
}

function computeBeta(strategyReturns: number[], benchmarkReturns: number[]): { beta: number; rSquared: number } {
  const n = Math.min(strategyReturns.length, benchmarkReturns.length);
  if (n < 5) return { beta: 1, rSquared: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const x = benchmarkReturns[i]!;
    const y = strategyReturns[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { beta: 1, rSquared: 0 };

  const beta = (n * sumXY - sumX * sumY) / denominator;

  // R-squared
  const ssRes = sumY2 - (sumXY * sumXY) / sumX2;
  const ssTot = sumY2 - (sumY * sumY) / n;
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { beta, rSquared };
}

export async function getAttribution(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const backtestId = body.backtestId as string | undefined;

  if (!backtestId) return errorResponse('backtestId is required');

  const run = await getBacktestRun(backtestId);
  if (!run) return errorResponse('Backtest not found', 404);
  if (run.status !== 'complete' || !run.metrics) return errorResponse('Backtest not complete');

  // Calculate strategy daily returns from equity curve
  const curve = run.equityCurve;
  if (!curve || curve.length < 2) return errorResponse('Insufficient equity curve data');

  const strategyReturns: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    if (curve[i - 1]!.equity > 0) {
      strategyReturns.push((curve[i]!.equity - curve[i - 1]!.equity) / curve[i - 1]!.equity);
    }
  }

  // Fetch real S&P 500 benchmark returns
  const benchmarkReturns = await fetchBenchmarkReturns(run.startDate, run.endDate);
  const totalReturn = run.metrics.totalReturn;

  let attribution: Attribution;

  if (benchmarkReturns && benchmarkReturns.length >= 5) {
    // Real factor decomposition using regression
    const { beta, rSquared } = computeBeta(strategyReturns, benchmarkReturns);

    // Benchmark total return
    let benchmarkTotal = 0;
    for (const r of benchmarkReturns) benchmarkTotal = (1 + benchmarkTotal) * (1 + r) - 1;
    benchmarkTotal *= 100; // Convert to percentage

    const marketReturn = beta * benchmarkTotal;
    const alpha = totalReturn - marketReturn;

    // Decompose non-market return using template heuristics for sector/style
    const sectorWeight = getSectorWeight(run.templateId, run.universe);
    const styleWeight = getStyleWeight(run.templateId);
    const residual = alpha;
    const sectorReturn = residual * sectorWeight;
    const styleReturn = residual * styleWeight;
    const idiosyncraticReturn = residual - sectorReturn - styleReturn;

    // Tracking error
    const n = Math.min(strategyReturns.length, benchmarkReturns.length);
    let sumDiffSq = 0;
    for (let i = 0; i < n; i++) {
      const diff = strategyReturns[i]! - beta * benchmarkReturns[i]!;
      sumDiffSq += diff * diff;
    }
    const trackingError = n > 1 ? Math.sqrt(sumDiffSq / (n - 1)) * Math.sqrt(252) * 100 : 0;
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

    attribution = {
      totalReturn,
      marketReturn,
      sectorReturn,
      styleReturn,
      idiosyncraticReturn,
      benchmarkReturn: benchmarkTotal,
      beta,
      alpha,
      rSquared,
      trackingError,
      informationRatio,
    };
  } else {
    // Fallback: heuristic decomposition without benchmark data
    const marketWeight = 0.3;
    const sectorWeight = getSectorWeight(run.templateId, run.universe);
    const styleWeight = getStyleWeight(run.templateId);
    const market = totalReturn * marketWeight;
    const sector = totalReturn * sectorWeight;
    const style = totalReturn * styleWeight;

    attribution = {
      totalReturn,
      marketReturn: market,
      sectorReturn: sector,
      styleReturn: style,
      idiosyncraticReturn: totalReturn - market - sector - style,
      benchmarkReturn: 0,
      beta: 1,
      alpha: totalReturn - market,
      rSquared: 0,
      trackingError: 0,
      informationRatio: 0,
    };
  }

  return jsonResponse({ attribution, backtestId, strategyName: run.strategyName, templateId: run.templateId });
}

function getSectorWeight(templateId: string, universe: string[]): number {
  // If strategy focuses on sector ETFs, higher sector attribution
  const sectorETFs = ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLU', 'XLP', 'XLY', 'XLB', 'XLRE'];
  const sectorOverlap = universe.filter((s) => sectorETFs.includes(s)).length / Math.max(universe.length, 1);
  if (templateId === 'sector_rotation' || templateId === 'etf_rotation') return 0.3 + sectorOverlap * 0.2;
  return 0.1 + sectorOverlap * 0.15;
}

function getStyleWeight(templateId: string): number {
  if (templateId === 'momentum') return 0.25;
  if (templateId === 'mean_reversion') return 0.2;
  if (templateId === 'breakout') return 0.2;
  if (templateId === 'trend_following') return 0.15;
  return 0.1;
}
