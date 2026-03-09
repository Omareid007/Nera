/**
 * get-market-data RPC — Bloomberg-style real-time market quotes + OHLCV candles.
 *
 * Fetches current quote + historical candle data from Yahoo Finance.
 * Supports intervals: 1m, 5m, 15m, 1h, 1d, 1wk, 1mo
 * Supports ranges: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { CHROME_UA } from '../../../_shared/constants';

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  avgVolume: number;
  marketCap: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  name: string;
  exchange: string;
  currency: string;
  timestamp: number;
}

interface MarketDataResponse {
  quote: QuoteData;
  candles: Candle[];
  sma20: number[];
  sma50: number[];
  ema12: number[];
  ema26: number[];
  rsi14: number[];
  bollingerUpper: number[];
  bollingerLower: number[];
  bollingerMid: number[];
  macd: number[];
  macdSignal: number[];
  macdHistogram: number[];
  volumeSma20: number[];
}

function computeSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j]!;
    result.push(sum / period);
  }
  return result;
}

function computeEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = NaN;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[j]!;
      prev = sum / period;
      result.push(prev);
      continue;
    }
    prev = data[i]! * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function computeRSI(closes: number[], period: number): number[] {
  const result: number[] = [];
  if (closes.length < period + 1) return closes.map(() => NaN);

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i]! - closes[i - 1]!;
    if (delta > 0) avgGain += delta;
    else avgLoss += Math.abs(delta);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < period; i++) result.push(NaN);
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i]! - closes[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function computeBollinger(closes: number[], period: number, stdMultiplier: number): { upper: number[]; lower: number[]; mid: number[] } {
  const sma = computeSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (closes[j]! - sma[i]!) ** 2;
    const std = Math.sqrt(sumSq / period);
    upper.push(sma[i]! + stdMultiplier * std);
    lower.push(sma[i]! - stdMultiplier * std);
  }
  return { upper, lower, mid: sma };
}

export async function getMarketData(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const symbol = body.symbol as string | undefined;
  const interval = (body.interval as string) || '1d';
  const range = (body.range as string) || '6mo';

  if (!symbol) return errorResponse('symbol is required');

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return errorResponse(`Yahoo Finance returned ${res.status}`, 502);

    const json = await res.json() as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            previousClose?: number;
            currency?: string;
            exchangeName?: string;
            shortName?: string;
            symbol?: string;
            regularMarketDayHigh?: number;
            regularMarketDayLow?: number;
            regularMarketOpen?: number;
            regularMarketVolume?: number;
            averageDailyVolume10Day?: number;
            marketCap?: number;
            fiftyTwoWeekHigh?: number;
            fiftyTwoWeekLow?: number;
            regularMarketTime?: number;
          };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: (number | null)[];
              high?: (number | null)[];
              low?: (number | null)[];
              close?: (number | null)[];
              volume?: (number | null)[];
            }>;
          };
        }>;
      };
    };

    const chartResult = json.chart?.result?.[0];
    if (!chartResult) return errorResponse('No data available for ' + symbol, 404);

    const meta = chartResult.meta ?? {};
    const timestamps = chartResult.timestamp ?? [];
    const ohlcv = chartResult.indicators?.quote?.[0] ?? {};

    // Build candles
    const candles: Candle[] = [];
    const closes: number[] = [];
    const volumes: number[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const o = ohlcv.open?.[i];
      const h = ohlcv.high?.[i];
      const l = ohlcv.low?.[i];
      const c = ohlcv.close?.[i];
      const v = ohlcv.volume?.[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ timestamp: timestamps[i]! * 1000, open: o, high: h, low: l, close: c, volume: v ?? 0 });
      closes.push(c);
      volumes.push(v ?? 0);
    }

    // Compute technicals
    const sma20 = computeSMA(closes, 20);
    const sma50 = computeSMA(closes, 50);
    const ema12 = computeEMA(closes, 12);
    const ema26 = computeEMA(closes, 26);
    const rsi14 = computeRSI(closes, 14);
    const bollinger = computeBollinger(closes, 20, 2);
    const volumeSma20 = computeSMA(volumes, 20);

    // MACD
    const macd: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      macd.push(isNaN(ema12[i]!) || isNaN(ema26[i]!) ? NaN : ema12[i]! - ema26[i]!);
    }
    const macdSignal = computeEMA(macd.filter((v) => !isNaN(v)), 9);
    // Pad signal to align with macd
    const validStart = macd.findIndex((v) => !isNaN(v));
    const paddedSignal: number[] = new Array(validStart >= 0 ? validStart : 0).fill(NaN);
    paddedSignal.push(...macdSignal);
    while (paddedSignal.length < macd.length) paddedSignal.push(NaN);

    const macdHistogram = macd.map((v, i) => isNaN(v) || isNaN(paddedSignal[i]!) ? NaN : v - paddedSignal[i]!);

    const price = meta.regularMarketPrice ?? (closes.length > 0 ? closes[closes.length - 1]! : 0);
    const prevClose = meta.previousClose ?? 0;

    const quote: QuoteData = {
      symbol: meta.symbol ?? symbol.toUpperCase(),
      price,
      change: price - prevClose,
      changePct: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
      open: meta.regularMarketDayOpen ?? 0,
      high: meta.regularMarketDayHigh ?? 0,
      low: meta.regularMarketDayLow ?? 0,
      prevClose,
      volume: meta.regularMarketVolume ?? 0,
      avgVolume: meta.averageDailyVolume10Day ?? 0,
      marketCap: meta.marketCap ?? null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
      name: meta.shortName ?? symbol.toUpperCase(),
      exchange: meta.exchangeName ?? '',
      currency: meta.currency ?? 'USD',
      timestamp: Date.now(),
    };

    const data: MarketDataResponse = {
      quote,
      candles,
      sma20,
      sma50,
      ema12,
      ema26,
      rsi14,
      bollingerUpper: bollinger.upper,
      bollingerLower: bollinger.lower,
      bollingerMid: bollinger.mid,
      macd,
      macdSignal: paddedSignal,
      macdHistogram,
      volumeSma20,
    };

    return jsonResponse(data);
  } catch {
    return errorResponse('Failed to fetch market data', 502);
  }
}
