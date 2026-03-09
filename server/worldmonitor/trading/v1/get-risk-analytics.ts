/**
 * get-risk-analytics RPC — Aladdin-inspired risk decomposition engine.
 *
 * Computes VaR (parametric + historical), expected shortfall, correlation matrix,
 * factor exposures, concentration risk, and stress scenarios.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getPortfolioSnapshot } from './trading-store';
import { CHROME_UA } from '../../../_shared/constants';

interface RiskAnalytics {
  // Value at Risk
  parametricVaR95: number;
  parametricVaR99: number;
  historicalVaR95: number;
  expectedShortfall95: number;

  // Portfolio-level metrics
  portfolioBeta: number;
  portfolioVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  informationRatio: number;
  trackingError: number;

  // Concentration
  herfindahlIndex: number;
  topHolding: { symbol: string; weight: number } | null;
  sectorConcentration: Record<string, number>;

  // Exposure breakdown
  longExposurePct: number;
  shortExposurePct: number;
  netExposurePct: number;
  grossExposurePct: number;
  leverageRatio: number;
  cashPct: number;

  // Correlation matrix (symbol pairs)
  correlationMatrix: { symbols: string[]; matrix: number[][] };

  // Stress scenarios
  stressTests: StressScenario[];

  // Position-level risk
  positionRisks: PositionRisk[];

  timestamp: number;
}

interface StressScenario {
  name: string;
  description: string;
  portfolioImpactPct: number;
  positionImpacts: { symbol: string; impactPct: number }[];
}

interface PositionRisk {
  symbol: string;
  weight: number;
  beta: number;
  volatility: number;
  var95: number;
  maxDrawdown: number;
  correlationToPortfolio: number;
}

async function fetchHistoricalReturns(symbol: string): Promise<number[]> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=6mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = await res.json() as {
      chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
    };
    const closes = json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((c): c is number => c != null);
    const returns: number[] = [];
    for (let i = 1; i < validCloses.length; i++) {
      if (validCloses[i - 1]! > 0) {
        returns.push((validCloses[i]! - validCloses[i - 1]!) / validCloses[i - 1]!);
      }
    }
    return returns;
  } catch {
    return [];
  }
}

function computeCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;
  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) { sumA += a[i]!; sumB += b[i]!; }
  const meanA = sumA / n, meanB = sumB / n;
  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA, db = b[i]! - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : cov / denom;
}

function computeStdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function percentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const idx = (pct / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (idx - lower) * (sorted[upper]! - sorted[lower]!);
}

export async function getRiskAnalytics(req: Request): Promise<Response> {
  const body = await parseBody(req);
  void body; // no params needed — computes from current portfolio

  const portfolio = await getPortfolioSnapshot();
  if (!portfolio || portfolio.positions.length === 0) {
    return jsonResponse({
      analytics: {
        parametricVaR95: 0, parametricVaR99: 0, historicalVaR95: 0, expectedShortfall95: 0,
        portfolioBeta: 0, portfolioVolatility: 0, sharpeRatio: 0, sortinoRatio: 0,
        informationRatio: 0, trackingError: 0,
        herfindahlIndex: 0, topHolding: null, sectorConcentration: {},
        longExposurePct: 0, shortExposurePct: 0, netExposurePct: 0, grossExposurePct: 0,
        leverageRatio: 0, cashPct: 100,
        correlationMatrix: { symbols: [], matrix: [] },
        stressTests: [],
        positionRisks: [],
        timestamp: Date.now(),
      } as RiskAnalytics,
    });
  }

  const equity = portfolio.totalEquity;
  const symbols = portfolio.positions.map((p) => p.symbol);

  // Fetch historical returns for all positions + SPY benchmark in parallel
  const allSymbols = [...new Set([...symbols, 'SPY'])];
  const returnsMap: Record<string, number[]> = {};
  const fetchResults = await Promise.allSettled(
    allSymbols.map(async (s) => {
      const r = await fetchHistoricalReturns(s);
      return { symbol: s, returns: r };
    })
  );
  for (const r of fetchResults) {
    if (r.status === 'fulfilled') returnsMap[r.value.symbol] = r.value.returns;
  }

  const spyReturns = returnsMap['SPY'] ?? [];

  // Compute position weights and risk
  const weights: number[] = portfolio.positions.map((p) => p.marketValue / equity);
  const positionRisks: PositionRisk[] = [];

  for (let i = 0; i < portfolio.positions.length; i++) {
    const pos = portfolio.positions[i]!;
    const returns = returnsMap[pos.symbol] ?? [];
    const vol = computeStdDev(returns) * Math.sqrt(252);
    const beta = spyReturns.length > 0 && returns.length > 0
      ? computeCorrelation(returns.slice(-spyReturns.length), spyReturns) * (computeStdDev(returns) / (computeStdDev(spyReturns) || 1))
      : 1;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95 = returns.length > 10 ? Math.abs(percentile(sortedReturns, 5)) * pos.marketValue : 0;

    let maxDD = 0, cumReturn = 1, peak = 1;
    for (const r of returns) {
      cumReturn *= (1 + r);
      peak = Math.max(peak, cumReturn);
      const dd = (peak - cumReturn) / peak;
      maxDD = Math.max(maxDD, dd);
    }

    positionRisks.push({
      symbol: pos.symbol,
      weight: weights[i]!,
      beta,
      volatility: vol,
      var95,
      maxDrawdown: maxDD * 100,
      correlationToPortfolio: 0, // computed after portfolio returns
    });
  }

  // Portfolio-weighted returns
  const validLengths = symbols.map((s) => (returnsMap[s] ?? []).length).filter((l) => l > 0);
  const minLen = validLengths.length > 0 ? Math.min(...validLengths, 252) : 0;
  const portfolioReturns: number[] = [];
  for (let t = 0; t < minLen; t++) {
    let dayReturn = 0;
    for (let i = 0; i < symbols.length; i++) {
      const r = returnsMap[symbols[i]!];
      if (r && t < r.length) dayReturn += weights[i]! * r[r.length - minLen + t]!;
    }
    portfolioReturns.push(dayReturn);
  }

  // Correlation to portfolio
  for (let i = 0; i < symbols.length; i++) {
    const r = returnsMap[symbols[i]!] ?? [];
    positionRisks[i]!.correlationToPortfolio = computeCorrelation(
      r.slice(-portfolioReturns.length),
      portfolioReturns
    );
  }

  // Portfolio volatility and ratios
  const portVol = computeStdDev(portfolioReturns) * Math.sqrt(252);
  const portMean = portfolioReturns.length > 0
    ? portfolioReturns.reduce((s, v) => s + v, 0) / portfolioReturns.length * 252
    : 0;
  const riskFreeRate = 0.05; // ~5% risk-free
  const sharpe = portVol > 0 ? (portMean - riskFreeRate) / portVol : 0;

  const downsideReturns = portfolioReturns.filter((r) => r < 0);
  const downsideVol = computeStdDev(downsideReturns) * Math.sqrt(252);
  const sortino = downsideVol > 0 ? (portMean - riskFreeRate) / downsideVol : 0;

  // Portfolio beta
  const portBeta = spyReturns.length > 0 && portfolioReturns.length > 0
    ? computeCorrelation(portfolioReturns.slice(-spyReturns.length), spyReturns) * (computeStdDev(portfolioReturns) / (computeStdDev(spyReturns) || 1))
    : 1;

  // Tracking error and information ratio
  const trackingDiffs = portfolioReturns.slice(-spyReturns.length).map((r, i) => r - (spyReturns[i] ?? 0));
  const trackingError = computeStdDev(trackingDiffs) * Math.sqrt(252);
  const activeMean = trackingDiffs.length > 0 ? trackingDiffs.reduce((s, v) => s + v, 0) / trackingDiffs.length * 252 : 0;
  const infoRatio = trackingError > 0 ? activeMean / trackingError : 0;

  // VaR
  const sortedPortReturns = [...portfolioReturns].sort((a, b) => a - b);
  const parametricVaR95 = portVol * 1.645 / Math.sqrt(252) * equity;
  const parametricVaR99 = portVol * 2.326 / Math.sqrt(252) * equity;
  const historicalVaR95 = portfolioReturns.length > 10 ? Math.abs(percentile(sortedPortReturns, 5)) * equity : 0;
  const tailReturns = sortedPortReturns.slice(0, Math.max(1, Math.floor(sortedPortReturns.length * 0.05)));
  const expectedShortfall95 = tailReturns.length > 0
    ? Math.abs(tailReturns.reduce((s, v) => s + v, 0) / tailReturns.length) * equity
    : 0;

  // Concentration
  const hhi = weights.reduce((s, w) => s + w * w, 0);
  const topIdx = weights.indexOf(Math.max(...weights));
  const topHolding = topIdx >= 0 ? { symbol: symbols[topIdx]!, weight: weights[topIdx]! } : null;

  // Exposure
  const long = portfolio.longExposure;
  const short = portfolio.shortExposure;
  const gross = long + short;

  // Correlation matrix
  const matrixSymbols = symbols.slice(0, 10); // cap at 10 for performance
  const matrix: number[][] = [];
  for (let i = 0; i < matrixSymbols.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < matrixSymbols.length; j++) {
      if (i === j) { row.push(1); continue; }
      const ri = returnsMap[matrixSymbols[i]!] ?? [];
      const rj = returnsMap[matrixSymbols[j]!] ?? [];
      row.push(computeCorrelation(ri, rj));
    }
    matrix.push(row);
  }

  // Stress tests
  const stressTests: StressScenario[] = [
    {
      name: '2008 Financial Crisis',
      description: 'S&P 500 drops 40%, high-beta stocks fall more',
      portfolioImpactPct: -40 * portBeta,
      positionImpacts: positionRisks.map((p) => ({ symbol: p.symbol, impactPct: -40 * p.beta })),
    },
    {
      name: 'COVID Crash (Mar 2020)',
      description: 'Rapid 34% market decline over 4 weeks',
      portfolioImpactPct: -34 * portBeta,
      positionImpacts: positionRisks.map((p) => ({ symbol: p.symbol, impactPct: -34 * p.beta })),
    },
    {
      name: 'Interest Rate Shock (+200bp)',
      description: 'Sudden 200bp rate increase, growth stocks hit hardest',
      portfolioImpactPct: -15 * portBeta,
      positionImpacts: positionRisks.map((p) => ({ symbol: p.symbol, impactPct: -15 * p.beta })),
    },
    {
      name: 'Flash Crash',
      description: 'Sudden 10% intraday drop with recovery',
      portfolioImpactPct: -10 * portBeta,
      positionImpacts: positionRisks.map((p) => ({ symbol: p.symbol, impactPct: -10 * p.beta })),
    },
    {
      name: 'Geopolitical Shock',
      description: 'Major conflict escalation, 20% decline',
      portfolioImpactPct: -20 * portBeta,
      positionImpacts: positionRisks.map((p) => ({ symbol: p.symbol, impactPct: -20 * p.beta })),
    },
  ];

  const analytics: RiskAnalytics = {
    parametricVaR95,
    parametricVaR99,
    historicalVaR95,
    expectedShortfall95,
    portfolioBeta: portBeta,
    portfolioVolatility: portVol,
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    informationRatio: infoRatio,
    trackingError,
    herfindahlIndex: hhi,
    topHolding,
    sectorConcentration: {},
    longExposurePct: equity > 0 ? (long / equity) * 100 : 0,
    shortExposurePct: equity > 0 ? (short / equity) * 100 : 0,
    netExposurePct: equity > 0 ? ((long - short) / equity) * 100 : 0,
    grossExposurePct: equity > 0 ? (gross / equity) * 100 : 0,
    leverageRatio: equity > 0 ? gross / equity : 0,
    cashPct: equity > 0 ? (portfolio.cash / equity) * 100 : 100,
    correlationMatrix: { symbols: matrixSymbols, matrix },
    stressTests,
    positionRisks,
    timestamp: Date.now(),
  };

  return jsonResponse({ analytics });
}
