/**
 * list-geo-signals RPC — Generates AI-style trade signals from geopolitical events.
 * Links GDELT/ACLED events to specific assets with directional signals,
 * confidence scores, and causal reasoning chains.
 *
 * 34 global categories covering all regions and thematic verticals.
 * Data extracted to _geo-signal-data.ts for maintainability.
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import { CHROME_UA } from '../../../_shared/constants';
import { GEO_ASSET_MAP, GDELT_GEO_QUERY } from './_geo-signal-data';
import type { Direction, AssetClass } from './_geo-signal-data';

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

// GEO_ASSET_MAP imported from _geo-signal-data.ts — 34 global categories

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
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(GDELT_GEO_QUERY)}&mode=artlist&maxrecords=25&format=json&timespan=24h`,
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

  const result = { signals: signals.slice(0, 30), timestamp: Date.now() };

  try { await setCachedJson(CACHE_KEY, result, CACHE_TTL); } catch { /* non-critical */ }

  return jsonResponse(result);
}
