/**
 * intel-status RPC — Returns live status of World Monitor intelligence feeds.
 * Checks actual data freshness from ACLED, GDELT, EIA, FRED, etc.
 */

import { jsonResponse } from './handler';
import { CHROME_UA } from '../../../_shared/constants';

interface IntelSource {
  name: string;
  description: string;
  status: 'live' | 'stale' | 'down' | 'unknown';
  lastDataTimestamp: number | null;
  latencyMs: number | null;
  recordCount: number | null;
  impact: string;
}

async function checkGdelt(): Promise<Partial<IntelSource>> {
  const start = Date.now();
  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20war%20OR%20sanctions&mode=artlist&maxrecords=5&format=json',
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(10_000) }
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) return { status: 'down', latencyMs };
    const json = await res.json() as { articles?: Array<{ seendate?: string }> };
    const articles = json.articles ?? [];
    const latest = articles[0]?.seendate ? new Date(articles[0].seendate).getTime() : null;
    // Data within last 24h = live, within 72h = stale, else down
    const freshness = latest ? (Date.now() - latest < 86_400_000 ? 'live' : Date.now() - latest < 259_200_000 ? 'stale' : 'down') : 'unknown';
    return { status: freshness as IntelSource['status'], latencyMs, lastDataTimestamp: latest, recordCount: articles.length };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkAcled(): Promise<Partial<IntelSource>> {
  const start = Date.now();
  const key = process.env.ACLED_API_KEY;
  const email = process.env.ACLED_EMAIL;
  if (!key || !email) return { status: 'unknown', latencyMs: null };
  try {
    const res = await fetch(
      `https://api.acleddata.com/acled/read?key=${key}&email=${encodeURIComponent(email)}&limit=3&fields=event_date`,
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(10_000) }
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) return { status: 'down', latencyMs };
    const json = await res.json() as { data?: Array<{ event_date?: string }>; count?: number };
    const latest = json.data?.[0]?.event_date ? new Date(json.data[0].event_date).getTime() : null;
    const freshness = latest ? (Date.now() - latest < 7 * 86_400_000 ? 'live' : 'stale') : 'unknown';
    return { status: freshness as IntelSource['status'], latencyMs, lastDataTimestamp: latest, recordCount: json.count ?? null };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkFred(): Promise<Partial<IntelSource>> {
  const start = Date.now();
  const key = process.env.FRED_API_KEY;
  if (!key) return { status: 'unknown', latencyMs: null };
  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${key}&file_type=json&sort_order=desc&limit=1`,
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(10_000) }
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) return { status: 'down', latencyMs };
    const json = await res.json() as { observations?: Array<{ date?: string }> };
    const latest = json.observations?.[0]?.date ? new Date(json.observations[0].date).getTime() : null;
    const freshness = latest ? (Date.now() - latest < 7 * 86_400_000 ? 'live' : 'stale') : 'unknown';
    return { status: freshness as IntelSource['status'], latencyMs, lastDataTimestamp: latest };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkEia(): Promise<Partial<IntelSource>> {
  const start = Date.now();
  const key = process.env.EIA_API_KEY;
  if (!key) return { status: 'unknown', latencyMs: null };
  try {
    const res = await fetch(
      `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${key}&frequency=daily&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=1`,
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(10_000) }
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) return { status: 'down', latencyMs };
    return { status: 'live', latencyMs };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start };
  }
}

export async function getIntelStatus(_req: Request): Promise<Response> {
  const [gdelt, acled, fred, eia] = await Promise.all([
    checkGdelt(),
    checkAcled(),
    checkFred(),
    checkEia(),
  ]);

  const sources: IntelSource[] = [
    { name: 'ACLED Conflicts', description: 'Armed conflict events — defense sector signals', impact: 'Defense sector', ...({ status: 'unknown', lastDataTimestamp: null, latencyMs: null, recordCount: null }), ...acled },
    { name: 'GDELT News', description: 'Global news sentiment — market impact signals', impact: 'Sentiment signals', ...({ status: 'unknown', lastDataTimestamp: null, latencyMs: null, recordCount: null }), ...gdelt },
    { name: 'CII Risk Scores', description: 'Country instability index — EM exposure', impact: 'EM exposure', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'EIA Energy', description: 'Oil/gas supply data — energy sector', impact: 'Energy sector', ...({ status: 'unknown', lastDataTimestamp: null, latencyMs: null, recordCount: null }), ...eia },
    { name: 'FRED Economics', description: 'Economic indicators — macro trades', impact: 'Macro signals', ...({ status: 'unknown', lastDataTimestamp: null, latencyMs: null, recordCount: null }), ...fred },
    { name: 'Sanctions Intel', description: 'OFAC/EU sanctions — compliance', impact: 'Compliance', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'Kalshi + Polymarket', description: 'Prediction market probabilities — risk adjustment', impact: 'Risk signals', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'CISA KEV', description: 'Known exploited vulnerabilities — cybersecurity sector', impact: 'Cyber stocks', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'NHC Cyclones', description: 'Tropical storm tracking — commodity disruption', impact: 'Commodities', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'Earnings Calendar', description: 'Major company earnings reports — equity catalysts', impact: 'Equity signals', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'Global Tension Index', description: '6-component composite score — conflict, sentiment, cyber, natural, political, supply chain', impact: 'Risk scoring', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'Geo Signals (34 Categories)', description: 'Trade signals across all global regions and thematic verticals', impact: 'Multi-sector', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
    { name: 'GDACS Disasters', description: 'Global disaster alerts — natural disaster tracking', impact: 'Commodities', status: 'live', lastDataTimestamp: null, latencyMs: null, recordCount: null },
  ];

  const live = sources.filter((s) => s.status === 'live').length;
  const stale = sources.filter((s) => s.status === 'stale').length;
  const down = sources.filter((s) => s.status === 'down').length;

  return jsonResponse({
    sources,
    summary: { total: sources.length, live, stale, down, unknown: sources.length - live - stale - down },
    timestamp: Date.now(),
  });
}
