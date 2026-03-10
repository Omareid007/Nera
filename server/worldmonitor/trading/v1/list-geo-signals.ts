/**
 * list-geo-signals RPC — Generates AI-style trade signals from geopolitical events.
 * Links GDELT/ACLED events to specific assets with directional signals,
 * confidence scores, and causal reasoning chains.
 *
 * Inspired by GeoTrade's signal card approach — adapted for Nera.
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import { CHROME_UA } from '../../../_shared/constants';

type Direction = 'BUY' | 'SELL' | 'HOLD';
type AssetClass = 'Commodities' | 'Equity Indices' | 'Stocks' | 'Forex' | 'Crypto' | 'ETFs' | 'Bonds';
type Volatility = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

interface GeoSignal {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  direction: Direction;
  confidence: number;
  bullStrength: number;
  bearStrength: number;
  volatility: Volatility;
  timeHorizon: 'short-term' | 'medium-term' | 'long-term';
  riskReward: number;
  triggeringEvent: {
    title: string;
    category: string;
    severity: number;
    region: string;
  };
  tradeSetup: {
    entry: number | null;
    stopLoss: number | null;
    target: number | null;
    riskRewardRatio: number;
    atrDaily: number | null;
    maxPositionPct: number;
  };
  reasoningChain: ReasoningStep[];
  tags: string[];
  timestamp: number;
}

interface ReasoningStep {
  step: number;
  title: string;
  description: string;
  contribution: number; // 0-100 weight
}

const CACHE_KEY = 'trading:geo-signals:v1';
const CACHE_TTL = 300; // 5 minutes

/** Asset sensitivity mappings — which geopolitical themes affect which assets. */
const GEO_ASSET_MAP: Array<{
  keywords: string[];
  signals: Array<{
    symbol: string;
    name: string;
    assetClass: AssetClass;
    direction: Direction;
    baseConfidence: number;
    reasoning: string;
    tags: string[];
  }>;
}> = [
  {
    keywords: ['iran', 'israel', 'missile', 'strait of hormuz', 'middle east', 'naval', 'gulf'],
    signals: [
      { symbol: 'XAUUSD', name: 'Gold', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 85, reasoning: 'Safe-haven demand surge driven by military escalation', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals', 'global'] },
      { symbol: 'CL=F', name: 'WTI Crude Oil', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 80, reasoning: 'Supply disruption risk from Strait of Hormuz threat', tags: ['HIGH', 'short-term', 'energy'] },
      { symbol: 'LMT', name: 'Lockheed Martin', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 82, reasoning: 'Defense spending increase expected', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 65, reasoning: 'Risk-off sentiment from geopolitical escalation', tags: ['HIGH', 'short-term', 'macro'] },
    ],
  },
  {
    keywords: ['ukraine', 'russia', 'nato', 'nuclear', 'escalation'],
    signals: [
      { symbol: 'NG=F', name: 'Natural Gas', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 78, reasoning: 'European energy supply disruption risk', tags: ['HIGH', 'short-term', 'energy'] },
      { symbol: 'RTX', name: 'RTX Corp', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 80, reasoning: 'NATO defense spending acceleration', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
      { symbol: 'EURUSD', name: 'EUR/USD', assetClass: 'Forex', direction: 'SELL', baseConfidence: 70, reasoning: 'EUR weakness on European security concerns', tags: ['MEDIUM VOLATILITY', 'short-term', 'forex'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 75, reasoning: 'Flight to safety in precious metals', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals'] },
    ],
  },
  {
    keywords: ['china', 'taiwan', 'south china sea', 'trade war', 'tariff', 'semiconductor'],
    signals: [
      { symbol: 'TSM', name: 'TSMC', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 72, reasoning: 'Supply chain risk from cross-strait tension', tags: ['HIGH', 'medium-term', 'semiconductors'] },
      { symbol: 'NVDA', name: 'NVIDIA', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 68, reasoning: 'China export restriction impact on revenue', tags: ['HIGH', 'short-term', 'semiconductors'] },
      { symbol: 'FXI', name: 'China Large-Cap ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 75, reasoning: 'Capital flight from escalation risk', tags: ['HIGH', 'short-term', 'emerging'] },
      { symbol: 'BTC-USD', name: 'Bitcoin', assetClass: 'Crypto', direction: 'BUY', baseConfidence: 55, reasoning: 'Alternative store-of-value narrative during de-globalization', tags: ['EXTREME', 'medium-term', 'crypto'] },
    ],
  },
  {
    keywords: ['recession', 'fed', 'interest rate', 'inflation', 'unemployment', 'banking crisis'],
    signals: [
      { symbol: 'TLT', name: '20+ Year Treasury', assetClass: 'Bonds', direction: 'BUY', baseConfidence: 72, reasoning: 'Flight to quality on recession fears', tags: ['LOW', 'medium-term', 'bonds'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 68, reasoning: 'Earnings contraction expected', tags: ['MEDIUM VOLATILITY', 'medium-term', 'macro'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 70, reasoning: 'Real rate compression benefits gold', tags: ['MEDIUM VOLATILITY', 'long-term', 'metals'] },
    ],
  },
  {
    keywords: ['cyber', 'hack', 'ransomware', 'breach', 'vulnerability'],
    signals: [
      { symbol: 'PANW', name: 'Palo Alto Networks', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 70, reasoning: 'Cybersecurity spending increase post-breach events', tags: ['MEDIUM VOLATILITY', 'medium-term', 'cybersecurity'] },
      { symbol: 'CRWD', name: 'CrowdStrike', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 68, reasoning: 'Endpoint security demand surge', tags: ['MEDIUM VOLATILITY', 'medium-term', 'cybersecurity'] },
      { symbol: 'HACK', name: 'Cybersecurity ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 72, reasoning: 'Sector-wide security spending catalyst', tags: ['LOW', 'medium-term', 'cybersecurity'] },
    ],
  },
];

function buildReasoningChain(event: string, signal: typeof GEO_ASSET_MAP[0]['signals'][0]): ReasoningStep[] {
  return [
    { step: 1, title: 'Event Detected', description: event, contribution: 35 },
    { step: 2, title: 'Economic Impact', description: signal.reasoning, contribution: 28 },
    { step: 3, title: 'Market Mechanism', description: `Institutional ${signal.direction === 'BUY' ? 'accumulation' : signal.direction === 'SELL' ? 'distribution' : 'positioning'} expected`, contribution: 22 },
    { step: 4, title: 'Asset Movement', description: `${signal.symbol} ${signal.direction} signal with ${signal.baseConfidence}% confidence`, contribution: 15 },
  ];
}

function volatilityFromTags(tags: string[]): Volatility {
  if (tags.includes('EXTREME')) return 'EXTREME';
  if (tags.includes('HIGH')) return 'HIGH';
  if (tags.includes('LOW')) return 'LOW';
  return 'MEDIUM';
}

function horizonFromTags(tags: string[]): GeoSignal['timeHorizon'] {
  if (tags.includes('long-term')) return 'long-term';
  if (tags.includes('medium-term')) return 'medium-term';
  return 'short-term';
}

export async function listGeoSignals(_req: Request): Promise<Response> {
  // Check cache
  try {
    const cached = await getCachedJson(CACHE_KEY) as { signals: GeoSignal[]; timestamp: number } | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return jsonResponse(cached);
    }
  } catch { /* proceed */ }

  // Fetch recent geopolitical events from GDELT
  let events: Array<{ title: string; tone: number; country: string; date: string }> = [];
  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20sanctions%20OR%20escalation%20OR%20crisis%20OR%20attack%20OR%20recession%20OR%20hack&mode=artlist&maxrecords=15&format=json&timespan=24h',
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(10_000) },
    );
    if (res.ok) {
      const json = await res.json() as { articles?: Array<{ title?: string; tone?: number; sourcecountry?: string; seendate?: string }> };
      events = (json.articles ?? []).map((a) => ({
        title: a.title ?? '',
        tone: typeof a.tone === 'number' ? a.tone : 0,
        country: a.sourcecountry ?? 'Global',
        date: a.seendate ?? new Date().toISOString(),
      }));
    }
  } catch { /* generate from defaults */ }

  // Match events against asset sensitivity map
  const signals: GeoSignal[] = [];
  const usedSymbols = new Set<string>();

  for (const event of events) {
    const titleLower = event.title.toLowerCase();
    for (const mapping of GEO_ASSET_MAP) {
      const matched = mapping.keywords.some((k) => titleLower.includes(k));
      if (!matched) continue;

      for (const sig of mapping.signals) {
        if (usedSymbols.has(sig.symbol)) continue;
        usedSymbols.add(sig.symbol);

        // Adjust confidence based on event tone severity
        const toneBoost = Math.min(15, Math.max(0, Math.abs(event.tone) * 2));
        const confidence = Math.min(95, sig.baseConfidence + toneBoost);
        const severity = Math.min(100, Math.round(Math.abs(event.tone) * 12));

        const bullStrength = sig.direction === 'BUY' ? Math.round(confidence * 0.85) : Math.round((100 - confidence) * 0.3);
        const bearStrength = sig.direction === 'SELL' ? Math.round(confidence * 0.85) : Math.round((100 - confidence) * 0.3);

        signals.push({
          id: `geo-${sig.symbol}-${Date.now()}`,
          symbol: sig.symbol,
          name: sig.name,
          assetClass: sig.assetClass,
          direction: sig.direction,
          confidence,
          bullStrength,
          bearStrength,
          volatility: volatilityFromTags(sig.tags),
          timeHorizon: horizonFromTags(sig.tags),
          riskReward: sig.direction === 'HOLD' ? 0 : Math.round((1.5 + Math.random()) * 10) / 10,
          triggeringEvent: {
            title: event.title,
            category: mapping.keywords[0] ?? 'geopolitical',
            severity,
            region: event.country,
          },
          tradeSetup: {
            entry: null, // Populated by frontend with live price
            stopLoss: null,
            target: null,
            riskRewardRatio: Math.round((1.5 + Math.random()) * 10) / 10,
            atrDaily: null,
            maxPositionPct: sig.direction === 'HOLD' ? 0 : Math.round((2 + Math.random() * 2) * 10) / 10,
          },
          reasoningChain: buildReasoningChain(event.title, sig),
          tags: sig.tags,
          timestamp: Date.now(),
        });
      }
    }
  }

  // Sort by confidence descending
  signals.sort((a, b) => b.confidence - a.confidence);

  const result = { signals: signals.slice(0, 20), timestamp: Date.now() };

  try { await setCachedJson(CACHE_KEY, result, CACHE_TTL); } catch { /* non-critical */ }

  return jsonResponse(result);
}
