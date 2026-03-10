/**
 * get-tension-index RPC — Computes a Global Tension Index (GTI) from
 * ACLED conflict data, GDELT news sentiment, CISA cyber threats, and
 * active tropical cyclones. Returns a 0-100 score with severity level.
 *
 * Nera's proprietary Global Tension Index for the trading platform.
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import { CHROME_UA } from '../../../_shared/constants';
import { REGION_ASSET_MAP, CATEGORY_ASSET_MAP } from './_geo-signal-data';

interface TensionIndex {
  score: number;
  change: number;
  level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  components: {
    conflict: number;
    sentiment: number;
    cyber: number;
    natural: number;
    political: number;
    supplyChain: number;
  };
  triggers: TensionTrigger[];
  timestamp: number;
}

interface TensionTrigger {
  title: string;
  category: 'conflict' | 'sentiment' | 'cyber' | 'natural' | 'economic' | 'political' | 'supply_chain';
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

/** Map regions and categories to affected asset classes using global data. */
function regionToAssets(region: string, category: string): string[] {
  const r = region.toLowerCase();
  const assets: string[] = [];

  // Match against region patterns
  for (const entry of REGION_ASSET_MAP) {
    if (entry.patterns.some((p) => r.includes(p))) {
      assets.push(...entry.assets);
    }
  }

  // Match against category-based assets
  if (CATEGORY_ASSET_MAP[category]) {
    assets.push(...CATEGORY_ASSET_MAP[category]);
  }

  if (assets.length === 0) assets.push('SPY', 'GLD', '^VIX');
  return [...new Set(assets)];
}

async function fetchConflictScore(): Promise<{ score: number; triggers: TensionTrigger[] }> {
  const triggers: TensionTrigger[] = [];
  let score = 15; // baseline

  try {
    // Use GDELT to gauge recent conflict intensity
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20war%20OR%20attack%20OR%20missile%20OR%20escalation%20OR%20coup%20OR%20insurgency%20OR%20bombing%20OR%20militia%20OR%20terrorism%20OR%20invasion&mode=artlist&maxrecords=10&format=json&timespan=24h',
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
      'https://api.gdeltproject.org/api/v2/doc/doc?query=sanctions%20OR%20tariff%20OR%20recession%20OR%20crisis%20OR%20default%20OR%20inflation%20OR%20bank%20failure%20OR%20election%20OR%20protest%20OR%20famine%20OR%20pandemic%20OR%20drought%20OR%20blackout&mode=artlist&maxrecords=8&format=json&timespan=24h',
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

async function fetchPoliticalScore(): Promise<{ score: number; triggers: TensionTrigger[] }> {
  const triggers: TensionTrigger[] = [];
  let score = 5;

  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=election%20OR%20coup%20OR%20protest%20OR%20regime%20change%20OR%20impeachment%20OR%20martial%20law&mode=artlist&maxrecords=8&format=json&timespan=24h',
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(8_000) },
    );
    if (res.ok) {
      const json = await res.json() as { articles?: Array<{ title?: string; tone?: number; sourcecountry?: string; seendate?: string }> };
      const articles = json.articles ?? [];

      for (const a of articles) {
        const tone = typeof a.tone === 'number' ? a.tone : 0;
        score += Math.max(0, -tone) * 1.5;

        if (tone < -3) {
          triggers.push({
            title: a.title ?? 'Political instability detected',
            category: 'political',
            severity: Math.min(100, Math.round(Math.abs(tone) * 12)),
            region: a.sourcecountry ?? 'Global',
            timestamp: a.seendate ?? new Date().toISOString(),
            affectedAssets: regionToAssets(a.sourcecountry ?? '', 'political'),
          });
        }
      }
    }
  } catch { /* baseline */ }

  return { score: Math.min(100, Math.round(score)), triggers: triggers.slice(0, 3) };
}

async function fetchSupplyChainScore(): Promise<{ score: number; triggers: TensionTrigger[] }> {
  const triggers: TensionTrigger[] = [];
  let score = 5;

  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=earthquake%20OR%20tsunami%20OR%20drought%20OR%20flood%20OR%20wildfire%20OR%20shipping%20disruption%20OR%20port%20strike%20OR%20pipeline&mode=artlist&maxrecords=8&format=json&timespan=24h',
      { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(8_000) },
    );
    if (res.ok) {
      const json = await res.json() as { articles?: Array<{ title?: string; tone?: number; sourcecountry?: string; seendate?: string }> };
      const articles = json.articles ?? [];

      for (const a of articles) {
        const tone = typeof a.tone === 'number' ? a.tone : 0;
        score += Math.max(0, -tone) * 1.2;

        if (tone < -3) {
          triggers.push({
            title: a.title ?? 'Supply chain disruption detected',
            category: 'supply_chain',
            severity: Math.min(100, Math.round(Math.abs(tone) * 10)),
            region: a.sourcecountry ?? 'Global',
            timestamp: a.seendate ?? new Date().toISOString(),
            affectedAssets: regionToAssets(a.sourcecountry ?? '', 'supply_chain'),
          });
        }
      }
    }
  } catch { /* baseline */ }

  return { score: Math.min(100, Math.round(score)), triggers: triggers.slice(0, 3) };
}

export async function getTensionIndex(_req: Request): Promise<Response> {
  // Check cache
  try {
    const cached = await getCachedJson(CACHE_KEY) as TensionIndex | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return jsonResponse(cached);
    }
  } catch { /* proceed */ }

  // Fetch all components in parallel (6 components for global coverage)
  const [conflict, sentiment, cyber, natural, political, supplyChain] = await Promise.all([
    fetchConflictScore(),
    fetchSentimentScore(),
    fetchCyberScore(),
    fetchNaturalScore(),
    fetchPoliticalScore(),
    fetchSupplyChainScore(),
  ]);

  // Weighted composite: conflict 25%, sentiment 20%, cyber 15%, natural 15%, political 15%, supplyChain 10%
  const composite = Math.round(
    conflict.score * 0.25 +
    sentiment.score * 0.20 +
    cyber.score * 0.15 +
    natural.score * 0.15 +
    political.score * 0.15 +
    supplyChain.score * 0.10,
  );
  const score = Math.min(100, Math.max(0, composite));

  // Collect all triggers, sort by severity
  const triggers = [
    ...conflict.triggers, ...sentiment.triggers, ...cyber.triggers,
    ...natural.triggers, ...political.triggers, ...supplyChain.triggers,
  ]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 10);

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
      political: political.score,
      supplyChain: supplyChain.score,
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
