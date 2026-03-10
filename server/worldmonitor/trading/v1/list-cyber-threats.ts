/**
 * list-cyber-threats RPC — CISA Known Exploited Vulnerabilities (KEV) feed.
 * Free government data (no API key). Useful for cybersecurity sector
 * trading signals (HACK, CIBR, PANW, CRWD, FTNT, ZS, etc.).
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';

interface CyberThreat {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string;
  knownRansomwareCampaignUse: boolean;
  shortDescription: string;
  requiredAction: string;
  severity: 'critical' | 'high' | 'medium';
  affectedSectors: string[];
}

const CACHE_KEY = 'trading:cyber-threats:v1';
const CACHE_TTL = 3600; // 1 hour — CISA KEV updates ~1x/week

// Map vendors to likely affected sectors/stocks
function inferSectors(vendor: string, product: string): string[] {
  const sectors: string[] = ['cybersecurity'];
  const combined = `${vendor} ${product}`.toLowerCase();
  if (combined.includes('microsoft') || combined.includes('windows') || combined.includes('exchange')) sectors.push('enterprise_software');
  if (combined.includes('cisco') || combined.includes('fortinet') || combined.includes('palo alto')) sectors.push('network_security');
  if (combined.includes('apple') || combined.includes('ios') || combined.includes('macos')) sectors.push('consumer_tech');
  if (combined.includes('google') || combined.includes('chrome') || combined.includes('android')) sectors.push('big_tech');
  if (combined.includes('adobe')) sectors.push('software');
  if (combined.includes('oracle') || combined.includes('sap')) sectors.push('enterprise');
  if (combined.includes('ivanti') || combined.includes('citrix') || combined.includes('vmware')) sectors.push('infrastructure');
  return sectors;
}

function inferSeverity(ransomware: boolean, vendor: string): CyberThreat['severity'] {
  if (ransomware) return 'critical';
  const highImpactVendors = ['microsoft', 'cisco', 'fortinet', 'palo alto', 'ivanti', 'citrix'];
  if (highImpactVendors.some((v) => vendor.toLowerCase().includes(v))) return 'high';
  return 'medium';
}

export async function listCyberThreats(_req: Request): Promise<Response> {
  // Check cache
  try {
    const cached = await getCachedJson(CACHE_KEY) as { threats: CyberThreat[]; timestamp: number } | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return jsonResponse(cached);
    }
  } catch { /* proceed */ }

  let threats: CyberThreat[] = [];

  try {
    const res = await fetch(
      'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) {
      return jsonResponse({ threats: [], timestamp: Date.now(), error: `CISA API returned ${res.status}` });
    }

    const json = await res.json() as {
      vulnerabilities?: Array<{
        cveID: string;
        vendorProject: string;
        product: string;
        vulnerabilityName: string;
        dateAdded: string;
        dueDate: string;
        knownRansomwareCampaignUse: string;
        shortDescription: string;
        requiredAction: string;
      }>;
    };

    const vulns = json.vulnerabilities ?? [];

    // Only return last 90 days of additions for relevance
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split('T')[0] ?? '';

    threats = vulns
      .filter((v) => v.dateAdded >= cutoffStr)
      .map((v) => {
        const isRansomware = v.knownRansomwareCampaignUse === 'Known';
        return {
          cveId: v.cveID,
          vendorProject: v.vendorProject,
          product: v.product,
          vulnerabilityName: v.vulnerabilityName,
          dateAdded: v.dateAdded,
          dueDate: v.dueDate,
          knownRansomwareCampaignUse: isRansomware,
          shortDescription: v.shortDescription,
          requiredAction: v.requiredAction,
          severity: inferSeverity(isRansomware, v.vendorProject),
          affectedSectors: inferSectors(v.vendorProject, v.product),
        };
      })
      .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
  } catch {
    return jsonResponse({ threats: [], timestamp: Date.now(), error: 'Failed to fetch CISA KEV' });
  }

  const critical = threats.filter((t) => t.severity === 'critical').length;
  const high = threats.filter((t) => t.severity === 'high').length;
  const ransomwareCount = threats.filter((t) => t.knownRansomwareCampaignUse).length;

  const result = {
    threats,
    summary: { total: threats.length, critical, high, ransomwareLinked: ransomwareCount },
    timestamp: Date.now(),
  };

  try { await setCachedJson(CACHE_KEY, result, CACHE_TTL); } catch { /* non-critical */ }

  return jsonResponse(result);
}
