/**
 * list-earnings RPC — Fetches upcoming and recent earnings reports.
 * Uses Yahoo Finance earnings calendar (free, no key needed).
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import { CHROME_UA } from '../../../_shared/constants';

interface EarningsEvent {
  symbol: string;
  company: string;
  reportDate: string;
  fiscalQuarter: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  surprise: number | null;
  timing: 'bmo' | 'amc' | 'unknown'; // before market open / after market close
}

const CACHE_KEY = 'trading:earnings:v1';
const CACHE_TTL = 1800; // 30 minutes

const TRACKED_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B',
  'JPM', 'V', 'JNJ', 'UNH', 'XOM', 'MA', 'PG', 'HD', 'CVX', 'MRK',
  'ABBV', 'KO', 'PEP', 'COST', 'WMT', 'CRM', 'BAC', 'NFLX', 'AMD',
  'INTC', 'DIS', 'CSCO',
];

async function fetchEarningsFromYahoo(): Promise<EarningsEvent[]> {
  const events: EarningsEvent[] = [];

  // Fetch earnings calendar for the next 7 days
  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 86_400;
  const weekAhead = now + 7 * 86_400;

  try {
    // Use Finnhub if available (better earnings data)
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (finnhubKey) {
      const from = new Date(weekAgo * 1000).toISOString().split('T')[0];
      const to = new Date(weekAhead * 1000).toISOString().split('T')[0];
      const res = await fetch(
        `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhubKey}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (res.ok) {
        const json = await res.json() as {
          earningsCalendar?: Array<{
            symbol: string;
            date: string;
            epsEstimate: number | null;
            epsActual: number | null;
            revenueEstimate: number | null;
            revenueActual: number | null;
            hour: string;
            quarter: number;
            year: number;
          }>;
        };
        const calendar = json.earningsCalendar ?? [];
        for (const e of calendar) {
          if (!TRACKED_SYMBOLS.includes(e.symbol)) continue;
          const surprise = e.epsActual !== null && e.epsEstimate !== null && e.epsEstimate !== 0
            ? ((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100
            : null;
          events.push({
            symbol: e.symbol,
            company: e.symbol, // Finnhub doesn't return company name in this endpoint
            reportDate: e.date,
            fiscalQuarter: `Q${e.quarter} ${e.year}`,
            epsEstimate: e.epsEstimate,
            epsActual: e.epsActual,
            revenueEstimate: e.revenueEstimate,
            revenueActual: e.revenueActual,
            surprise: surprise !== null ? Math.round(surprise * 100) / 100 : null,
            timing: e.hour === 'bmo' ? 'bmo' : e.hour === 'amc' ? 'amc' : 'unknown',
          });
        }
      }
    }

    // If no Finnhub data, fall back to Yahoo earnings snapshot
    if (events.length === 0) {
      // Fetch quotes for tracked symbols to build a basic earnings list
      const batchSize = 10;
      for (let i = 0; i < TRACKED_SYMBOLS.length; i += batchSize) {
        const batch = TRACKED_SYMBOLS.slice(i, i + batchSize);
        const symbols = batch.join(',');
        try {
          const res = await fetch(
            `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=earningsTimestamp,earningsTimestampStart,earningsTimestampEnd,epsTrailingTwelveMonths,epsForward`,
            { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(8_000) },
          );
          if (res.ok) {
            const json = await res.json() as {
              quoteResponse?: { result?: Array<{
                symbol: string;
                shortName?: string;
                earningsTimestamp?: number;
                earningsTimestampStart?: number;
                earningsTimestampEnd?: number;
                epsTrailingTwelveMonths?: number;
                epsForward?: number;
              }> };
            };
            for (const q of json.quoteResponse?.result ?? []) {
              const earningsTs = q.earningsTimestamp || q.earningsTimestampStart;
              if (!earningsTs) continue;
              // Only include earnings within ±14 days
              if (Math.abs(earningsTs - now) > 14 * 86_400) continue;
              events.push({
                symbol: q.symbol,
                company: q.shortName || q.symbol,
                reportDate: new Date(earningsTs * 1000).toISOString().split('T')[0] ?? '',
                fiscalQuarter: '',
                epsEstimate: q.epsForward ?? null,
                epsActual: null,
                revenueEstimate: null,
                revenueActual: null,
                surprise: null,
                timing: 'unknown',
              });
            }
          }
        } catch { /* continue with next batch */ }
      }
    }
  } catch { /* return empty */ }

  return events.sort((a, b) => a.reportDate.localeCompare(b.reportDate));
}

export async function listEarnings(_req: Request): Promise<Response> {
  // Check cache
  try {
    const cached = await getCachedJson(CACHE_KEY) as { earnings: EarningsEvent[]; timestamp: number } | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return jsonResponse(cached);
    }
  } catch { /* proceed */ }

  const earnings = await fetchEarningsFromYahoo();
  const nowStr = new Date().toISOString().split('T')[0] ?? '';
  const upcoming = earnings.filter((e) => e.reportDate >= nowStr);
  const recent = earnings.filter((e) => e.reportDate < nowStr);

  const result = { earnings, upcoming, recent, timestamp: Date.now() };

  try { await setCachedJson(CACHE_KEY, result, CACHE_TTL); } catch { /* non-critical */ }

  return jsonResponse(result);
}
