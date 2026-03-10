/**
 * provider-health RPC — Live health checks for all data providers.
 * Pings each service and reports operational/degraded/down status.
 */

import { jsonResponse } from './handler';
import { CHROME_UA } from '../../../_shared/constants';

interface ProviderStatus {
  name: string;
  category: 'market_data' | 'llm' | 'infrastructure' | 'intelligence';
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  latencyMs: number | null;
  lastChecked: number;
  description: string;
}

async function checkProvider(name: string, url: string, timeoutMs = 8000): Promise<{ status: 'operational' | 'degraded' | 'down'; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return { status: latencyMs > 5000 ? 'degraded' : 'operational', latencyMs };
    }
    // 429 = rate limited but service is up
    if (res.status === 429) return { status: 'degraded', latencyMs };
    return { status: 'down', latencyMs };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: 'operational' | 'degraded' | 'down'; latencyMs: number }> {
  const start = Date.now();
  try {
    // Try importing and using redis
    const { getCachedJson } = await import('../../../_shared/redis');
    await getCachedJson('health:ping');
    return { status: 'operational', latencyMs: Date.now() - start };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start };
  }
}

export async function getProviderHealth(_req: Request): Promise<Response> {
  const now = Date.now();

  // Run all health checks in parallel
  const [yahoo, finnhub, coingecko, redis, acled, gdelt, fred] = await Promise.all([
    checkProvider('Yahoo Finance', 'https://query2.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=1d'),
    checkProvider('Finnhub', 'https://finnhub.io/api/v1/stock/profile2?symbol=AAPL&token=' + (process.env.FINNHUB_API_KEY || 'demo')),
    checkProvider('CoinGecko', 'https://api.coingecko.com/api/v3/ping'),
    checkRedis(),
    checkProvider('ACLED', 'https://api.acleddata.com/acled/read?limit=1&key=' + (process.env.ACLED_API_KEY || '')),
    checkProvider('GDELT', 'https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=artlist&maxrecords=1&format=json'),
    checkProvider('FRED', 'https://api.stlouisfed.org/fred/series?series_id=GDP&api_key=' + (process.env.FRED_API_KEY || 'demo') + '&file_type=json'),
  ]);

  // LLM providers — check if env keys are configured
  const groqStatus: ProviderStatus = {
    name: 'Groq',
    category: 'llm',
    status: process.env.GROQ_API_KEY ? 'operational' : 'unknown',
    latencyMs: null,
    lastChecked: now,
    description: 'LLM provider — fast inference',
  };

  const openrouterStatus: ProviderStatus = {
    name: 'OpenRouter',
    category: 'llm',
    status: process.env.OPENROUTER_API_KEY ? 'operational' : 'unknown',
    latencyMs: null,
    lastChecked: now,
    description: 'LLM provider — model routing',
  };

  const providers: ProviderStatus[] = [
    { name: 'Yahoo Finance', category: 'market_data', ...yahoo, lastChecked: now, description: 'Market data, historical bars, real-time quotes' },
    { name: 'Finnhub', category: 'market_data', ...finnhub, lastChecked: now, description: 'Sector summaries, company metrics' },
    { name: 'CoinGecko', category: 'market_data', ...coingecko, lastChecked: now, description: 'Crypto & stablecoin data' },
    groqStatus,
    openrouterStatus,
    { name: 'Redis (Upstash)', category: 'infrastructure', ...redis, lastChecked: now, description: 'Cache, persistence, trading store' },
    { name: 'ACLED', category: 'intelligence', ...acled, lastChecked: now, description: 'Armed conflict location & event data' },
    { name: 'GDELT', category: 'intelligence', ...gdelt, lastChecked: now, description: 'Global event, language, tone database' },
    { name: 'FRED / EIA', category: 'intelligence', ...fred, lastChecked: now, description: 'Economic indicators & energy data' },
  ];

  const operational = providers.filter((p) => p.status === 'operational').length;
  const degraded = providers.filter((p) => p.status === 'degraded').length;
  const down = providers.filter((p) => p.status === 'down').length;

  return jsonResponse({
    providers,
    summary: { total: providers.length, operational, degraded, down, unknown: providers.length - operational - degraded - down },
    timestamp: now,
  });
}
