/**
 * list-cyclones RPC — Fetches active tropical cyclone data from NHC + GDACS.
 * Useful for commodity trading (oil, nat gas, agriculture) when storms
 * threaten supply infrastructure.
 */

import { jsonResponse } from './_shared';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';

interface TropicalCyclone {
  id: string;
  name: string;
  basin: 'atlantic' | 'east_pacific' | 'central_pacific' | 'west_pacific' | 'indian' | 'southern';
  category: string;
  windKt: number | null;
  pressureMb: number | null;
  lat: number;
  lon: number;
  movementDir: string | null;
  movementSpeedKt: number | null;
  source: 'nhc' | 'gdacs';
  lastUpdated: string;
  commodityImpact: string[];
}

const CACHE_KEY = 'trading:cyclones:v1';
const CACHE_TTL = 600; // 10 minutes

function classifyCategory(windKt: number): string {
  if (windKt >= 137) return 'Category 5';
  if (windKt >= 113) return 'Category 4';
  if (windKt >= 96) return 'Category 3';
  if (windKt >= 83) return 'Category 2';
  if (windKt >= 64) return 'Category 1';
  if (windKt >= 34) return 'Tropical Storm';
  return 'Tropical Depression';
}

function assessCommodityImpact(lat: number, lon: number, windKt: number): string[] {
  const impacts: string[] = [];
  // Gulf of Mexico oil production
  if (lat >= 18 && lat <= 31 && lon >= -100 && lon <= -80 && windKt >= 34) {
    impacts.push('Gulf oil/gas production disruption');
    impacts.push('Refinery shutdowns possible');
  }
  // Caribbean shipping lanes
  if (lat >= 10 && lat <= 25 && lon >= -90 && lon <= -60 && windKt >= 34) {
    impacts.push('Caribbean shipping disruption');
  }
  // US East Coast ports
  if (lat >= 25 && lat <= 45 && lon >= -85 && lon <= -65 && windKt >= 50) {
    impacts.push('US East Coast port closures');
  }
  // Agricultural regions
  if (lat >= 25 && lat <= 35 && lon >= -100 && lon <= -80 && windKt >= 50) {
    impacts.push('Southeast agriculture damage risk');
  }
  if (impacts.length === 0) impacts.push('Monitor — no direct commodity threat');
  return impacts;
}

async function fetchNHC(): Promise<TropicalCyclone[]> {
  const cyclones: TropicalCyclone[] = [];
  try {
    // NHC active storms GeoJSON feed
    const res = await fetch(
      'https://www.nhc.noaa.gov/CurrentSummaries.json',
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) {
      // Fallback: try NHC GIS active cyclones
      const gisRes = await fetch(
        'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Active_Hurricanes_v1/FeatureServer/1/query?where=1%3D1&outFields=*&f=json',
        { signal: AbortSignal.timeout(10_000) },
      );
      if (gisRes.ok) {
        const gisJson = await gisRes.json() as {
          features?: Array<{
            attributes: {
              STORMNAME?: string;
              STORMNUM?: number;
              BASIN?: string;
              MAXWIND?: number;
              PRESSURE?: number;
              DVLP?: string;
              LAT?: number;
              LON?: number;
              MESSION?: string;
              STORMTYPE?: string;
            };
            geometry?: { x: number; y: number };
          }>;
        };
        for (const f of gisJson.features ?? []) {
          const a = f.attributes;
          const windKt = a.MAXWIND ?? 0;
          const lat = a.LAT ?? f.geometry?.y ?? 0;
          const lon = a.LON ?? f.geometry?.x ?? 0;
          cyclones.push({
            id: `nhc-${a.STORMNUM ?? cyclones.length}`,
            name: a.STORMNAME || 'Unnamed',
            basin: a.BASIN === 'EP' ? 'east_pacific' : a.BASIN === 'CP' ? 'central_pacific' : 'atlantic',
            category: classifyCategory(windKt),
            windKt,
            pressureMb: a.PRESSURE ?? null,
            lat,
            lon,
            movementDir: null,
            movementSpeedKt: null,
            source: 'nhc',
            lastUpdated: new Date().toISOString(),
            commodityImpact: assessCommodityImpact(lat, lon, windKt),
          });
        }
      }
      return cyclones;
    }
    // Parse NHC summary JSON
    const json = await res.json() as {
      activeStorms?: Array<{
        name: string;
        id: string;
        classification: string;
        intensity: number;
        pressure: number;
        latitude: number;
        longitude: number;
        movement: { direction: string; speed: number };
      }>;
    };
    for (const s of json.activeStorms ?? []) {
      cyclones.push({
        id: `nhc-${s.id}`,
        name: s.name,
        basin: 'atlantic',
        category: classifyCategory(s.intensity),
        windKt: s.intensity,
        pressureMb: s.pressure || null,
        lat: s.latitude,
        lon: s.longitude,
        movementDir: s.movement?.direction ?? null,
        movementSpeedKt: s.movement?.speed ?? null,
        source: 'nhc',
        lastUpdated: new Date().toISOString(),
        commodityImpact: assessCommodityImpact(s.latitude, s.longitude, s.intensity),
      });
    }
  } catch { /* return empty */ }
  return cyclones;
}

async function fetchGDACS(): Promise<TropicalCyclone[]> {
  const cyclones: TropicalCyclone[] = [];
  try {
    const res = await fetch(
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/TC?limit=10',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return [];
    const json = await res.json() as {
      features?: Array<{
        properties?: {
          eventid?: number;
          name?: string;
          severitydata?: { severity?: number; severityUnit?: string };
          country?: string;
          fromdate?: string;
        };
        geometry?: { coordinates?: [number, number] };
      }>;
    };
    for (const f of json.features ?? []) {
      const p = f.properties;
      const coords = f.geometry?.coordinates;
      if (!coords) continue;
      let windKt = 0;
      const sev = p?.severitydata;
      if (sev?.severity) {
        // GDACS may report in km/h or kt
        windKt = sev.severityUnit === 'km/h' ? Math.round(sev.severity * 0.54) : sev.severity;
      }
      const lon = coords[0];
      const lat = coords[1];
      cyclones.push({
        id: `gdacs-${p?.eventid ?? cyclones.length}`,
        name: p?.name || 'Unnamed',
        basin: lon > 100 ? 'west_pacific' : lon > 40 ? 'indian' : lon < -100 ? 'east_pacific' : 'atlantic',
        category: classifyCategory(windKt),
        windKt: windKt || null,
        pressureMb: null,
        lat,
        lon,
        movementDir: null,
        movementSpeedKt: null,
        source: 'gdacs',
        lastUpdated: p?.fromdate || new Date().toISOString(),
        commodityImpact: assessCommodityImpact(lat, lon, windKt),
      });
    }
  } catch { /* return empty */ }
  return cyclones;
}

export async function listCyclones(_req: Request): Promise<Response> {
  // Check cache
  try {
    const cached = await getCachedJson(CACHE_KEY) as { cyclones: TropicalCyclone[]; timestamp: number } | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return jsonResponse(cached);
    }
  } catch { /* proceed */ }

  const [nhc, gdacs] = await Promise.all([fetchNHC(), fetchGDACS()]);

  // Deduplicate: NHC takes priority, remove GDACS entries within 200km of NHC storms
  const deduped = [...nhc];
  for (const g of gdacs) {
    const isDupe = nhc.some((n) => {
      const dlat = n.lat - g.lat;
      const dlon = n.lon - g.lon;
      return Math.sqrt(dlat * dlat + dlon * dlon) < 2; // ~200km at equator
    });
    if (!isDupe) deduped.push(g);
  }

  const result = { cyclones: deduped, timestamp: Date.now() };

  try { await setCachedJson(CACHE_KEY, result, CACHE_TTL); } catch { /* non-critical */ }

  return jsonResponse(result);
}
