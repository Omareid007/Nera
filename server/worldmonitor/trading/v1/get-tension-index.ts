/**
 * get-tension-index RPC — Computes a Global Tension Index (GTI) from
 * ACLED conflict data, GDELT news sentiment, CISA cyber threats, and
 * active tropical cyclones. Returns a 0-100 score with severity level.
 *
 * Inspired by GeoTrade's GTI concept — adapted for Nera's trading platform.
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import { CHROME_UA } from '../../../_shared/constants';

interface TensionIndex {
  score: number;
  change: number;
  level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  components: {
    conflict: number;
    sentiment: number;
    cyber: number;
    natural: number;
  };
  triggers: TensionTrigger[];
  timestamp: number;
}

interface TensionTrigger {
  title: string;
  category: 'conflict' | 'sentiment' | 'cyber' | 'natural' | 'economic';
  severity: number;
  region: string;
  timestamp: string;
  affectedAssets: string[];
}

const CACHE_KEY = 'trading:tension-index:v1';
const CACHE_TTL = 300; // 5 minutes

function classifyLevel(score: number): TensionIndex['level'] {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'ELEVATED';
  if (score >= 20) return 'MODERATE';
  return 'LOW';
}

/** Map regions to affected asset classes. */
function regionToAssets(region: string, category: string): string[] {
  const r = region.toLowerCase();
  const assets: string[] = [];
  if (r.includes('middle east') || r.includes('iran') || r.includes('iraq') || r.includes('gulf')) {
    assets.push('OIL', 'GAS', 'GLD', 'XOM', 'CVX');
  }
  if (r.includes('ukraine') || r.includes('russia') || r.includes('europe')) {
    assets.push('GAS', 'WHEAT', 'EURUSD', 'LMT', 'RTX');
  }
  if (r.includes('china') || r.includes('taiwan') || r.includes('asia')) {
    assets.push('TSM', 'NVDA', 'AAPL', 'FXI', 'EEM');
  }
  if (r.includes('africa')) {
    assets.push('MINERALS', 'EEM');
  }
  if (category === 'cyber') {
    assets.push('PANW', 'CRWD', 'ZS', 'FTNT', 'HACK');
  }
  if (category === 'natural') {
    assets.push('OIL', 'GAS', 'CORN', 'WHEAT');
  }
  if (assets.length === 0) assets.push('SPY', 'GLD', 'VIX');
  return [...new Set(assets)];
}

async function fetchConflictScore(): Promise<{ score: number; triggers: TensionTrigger[] }> {
  const triggers: TensionTrigger[] = [];
  let score = 15; // baseline

  try {
    // Use GDELT to gauge recent conflict intensity
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20war%20OR%20attack%20OR%20missile%20OR%20escalation&mode=artlist&maxrecords=10&format=json&timespan=24h',
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(8_000) },
    );
    if (res.ok) {
      const json = await res.json() as { articles?: Array<{ title?: string; tone?: number; sourcecountry?: string; seendate?: string }> };
      const articles = json.articles ?? [];

      for (const a of articles) {
        const tone = typeof a.tone === 'number' ? a.tone : 0;
        const negativity = Math.max(0, -tone); // more negative = more tension
        score += negativity * 2;

        if (negativity > 3) {
          triggers.push({
            title: a.title ?? 'Conflict event detected',
            category: 'conflict',
            severity: Math.min(100, Math.round(negativity * 15)),
            region: a.sourcecountry ?? 'Global',
            timestamp: a.seendate ?? new Date().toISOString(),
            affectedAssets: regionToAssets(a.sourcecountry ?? '', 'conflict'),
          });
        }
      }
    }
  } catch { /* baseline score */ }

  return { score: Math.min(100, Math.round(score)), triggers: triggers.slice(0, 5) };
}

async function fetchSentimentScore(): Promise<{ score: number; triggers: TensionTrigger[] }> {
  const triggers: TensionTrigger[] = [];
  let score = 10;

  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=sanctions%20OR%20tariff%20OR%20recession%20OR%20crisis&mode=artlist&maxrecords=8&format=json&timespan=24h',
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(8_000) },
    );
    if (res.ok) {
      const json = await res.json() as { articles?: Array<{ title?: string; tone?: number; sourcecountry?: string; seendate?: string }> };
      const articles = json.articles ?? [];

      for (const a of articles) {
        const tone = typeof a.tone === 'number' ? a.tone : 0;
        score += Math.max(0, -tone) * 1.5;

        if (tone < -4) {
          triggers.push({
            title: a.title ?? 'Negative sentiment surge',
            category: 'sentiment',
            severity: Math.min(100, Math.round(Math.abs(tone) * 12)),
            region: a.sourcecountry ?? 'Global',
            timestamp: a.seendate ?? new Date().toISOString(),
            affectedAssets: regionToAssets(a.sourcecountry ?? '', 'sentiment'),
          });
        }
      }
    }
  } catch { /* baseline */ }

  return { score: Math.min(100, Math.round(score)), triggers: triggers.slice(0, 3) };
}

async function fetchCyberScore(): Promise<{ score: number; triggers: TensionTrigger[] }> {
  const triggers: TensionTrigger[] = [];
  let score = 5;

  try {
    const res = await fetch(
      'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
      { signal: AbortSignal.timeout(10_000) },
    );
    if (res.ok) {
      const json = await res.json() as { vulnerabilities?: Array<{ cveID: string; vendorProject: string; vulnerabilityName: string; dateAdded: string; knownRansomwareCampaignUse: string }> };
      const vulns = json.vulnerabilities ?? [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffStr = cutoff.toISOString().split('T')[0] ?? '';

      const recentVulns = vulns.filter((v) => v.dateAdded >= cutoffStr);
      score += recentVulns.length * 8;

      for (const v of recentVulns.slice(0, 3)) {
        const isRansomware = v.knownRansomwareCampaignUse === 'Known';
        triggers.push({
          title: `${v.cveID}: ${v.vulnerabilityName}`,
          category: 'cyber',
          severity: isRansomware ? 90 : 60,
          region: 'Global',
          timestamp: v.dateAdded,
          affectedAssets: regionToAssets('', 'cyber'),
        });
        if (isRansomware) score += 15;
      }
    }
  } catch { /* baseline */ }

  return { score: Math.min(100, Math.round(score)), triggers };
}

async function fetchNaturalScore(): Promise<{ score: number; triggers: TensionTrigger[] }> {
  // Check for active cyclones that affect commodity markets
  const triggers: TensionTrigger[] = [];
  let score = 0;

  try {
    const res = await fetch(
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/TC?limit=5',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8_000) },
    );
    if (res.ok) {
      const json = await res.json() as { features?: Array<{ properties?: { name?: string; alertlevel?: string; country?: string } }> };
      for (const f of json.features ?? []) {
        const p = f.properties;
        const alert = p?.alertlevel ?? '';
        if (alert === 'Red') score += 25;
        else if (alert === 'Orange') score += 15;
        else if (alert === 'Green') score += 5;

        if (alert === 'Red' || alert === 'Orange') {
          triggers.push({
            title: `Tropical Cyclone ${p?.name ?? 'Active'}`,
            category: 'natural',
            severity: alert === 'Red' ? 85 : 60,
            region: p?.country ?? 'Global',
            timestamp: new Date().toISOString(),
            affectedAssets: regionToAssets(p?.country ?? '', 'natural'),
          });
        }
      }
    }
  } catch { /* baseline */ }

  return { score: Math.min(100, Math.round(score)), triggers };
}

export async function getTensionIndex(_req: Request): Promise<Response> {
  // Check cache
  try {
    const cached = await getCachedJson(CACHE_KEY) as TensionIndex | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return jsonResponse(cached);
    }
  } catch { /* proceed */ }

  // Fetch all components in parallel
  const [conflict, sentiment, cyber, natural] = await Promise.all([
    fetchConflictScore(),
    fetchSentimentScore(),
    fetchCyberScore(),
    fetchNaturalScore(),
  ]);

  // Weighted composite: conflict 35%, sentiment 25%, cyber 20%, natural 20%
  const composite = Math.round(
    conflict.score * 0.35 +
    sentiment.score * 0.25 +
    cyber.score * 0.20 +
    natural.score * 0.20,
  );
  const score = Math.min(100, Math.max(0, composite));

  // Collect all triggers, sort by severity
  const triggers = [...conflict.triggers, ...sentiment.triggers, ...cyber.triggers, ...natural.triggers]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 8);

  // Compute change from previous cached value
  let change = 0;
  try {
    const prev = await getCachedJson('trading:tension-index:prev:v1') as { score: number } | null;
    if (prev) change = Math.round((score - prev.score) * 10) / 10;
  } catch { /* ignore */ }

  const result: TensionIndex = {
    score,
    change,
    level: classifyLevel(score),
    components: {
      conflict: conflict.score,
      sentiment: sentiment.score,
      cyber: cyber.score,
      natural: natural.score,
    },
    triggers,
    timestamp: Date.now(),
  };

  // Cache current as "previous" for next change calculation, then cache result
  try {
    await setCachedJson('trading:tension-index:prev:v1', { score }, 3600);
    await setCachedJson(CACHE_KEY, result, CACHE_TTL);
  } catch { /* non-critical */ }

  return jsonResponse(result);
}
