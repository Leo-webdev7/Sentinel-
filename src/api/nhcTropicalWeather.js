/**
 * nhcTropicalWeather.js
 * Fetches NHC hurricane data from two complementary sources:
 *
 * SOURCE A – Esri Active_Hurricanes_v1 FeatureServer (vannizhang/hurricane)
 *   FeatureServer/0 – Forecast track positions (future, points)
 *   FeatureServer/2 – Observed track positions (past, points)
 *   FeatureServer/4 – Forecast error cone (polygon)
 *
 * SOURCE B – NOAA NHC tropical weather MapServer
 *   Layer 320       – Tropical disturbance outlook areas (pre-named-storm)
 *
 * Each source fails independently; the other still renders.
 */

import { fetchWithCache } from '../utils/dataCache';

const ESRI_SERVICE =
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Active_Hurricanes_v1/FeatureServer';

const NOAA_MAPSERVER =
  'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';

// Standard NHC/SSHWS category colors
export const HURRICANE_CATEGORY_COLORS = {
  'Tropical Depression': { fill: '#5ebaff', stroke: '#2e8fbf' },
  'Tropical Storm':      { fill: '#00faf4', stroke: '#00b8b3' },
  'Category 1':          { fill: '#ffffcc', stroke: '#cccc66' },
  'Category 2':          { fill: '#ffe775', stroke: '#ccaa00' },
  'Category 3':          { fill: '#ffc140', stroke: '#cc8800' },
  'Category 4':          { fill: '#ff8f20', stroke: '#cc5500' },
  'Category 5':          { fill: '#ff6060', stroke: '#cc0000' },
};

// NHC disturbance formation probability colors
export const DISTURBANCE_COLORS = {
  HIGH:   { fill: '#FF4444', stroke: '#BB0000' },
  MEDIUM: { fill: '#FFA040', stroke: '#CC5500' },
  LOW:    { fill: '#FFE566', stroke: '#CCAA00' },
};

// NHC coastal watch/warning colors (standard NHC map convention)
export const WATCH_WARNING_COLORS = {
  'Hurricane Warning':       { fill: '#FF0000', stroke: '#B30000' },
  'Hurricane Watch':         { fill: '#FF00FF', stroke: '#B300B3' },
  'Tropical Storm Warning':  { fill: '#FF8C00', stroke: '#B36200' },
  'Tropical Storm Watch':    { fill: '#F0E68C', stroke: '#B3A400' },
  'Storm Surge Warning':     { fill: '#C71585', stroke: '#8B0F5E' },
  'Storm Surge Watch':       { fill: '#DB7FF7', stroke: '#9B4FC7' },
  Advisory:                  { fill: '#94a3b8', stroke: '#64748b' },
};

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getHurricaneCategory(maxWindMph) {
  const w = Number(maxWindMph);
  if (isNaN(w))  return 'Tropical Depression';
  if (w > 136)   return 'Category 5';
  if (w > 112)   return 'Category 4';
  if (w > 95)    return 'Category 3';
  if (w > 82)    return 'Category 2';
  if (w > 63)    return 'Category 1';
  if (w > 33)    return 'Tropical Storm';
  return 'Tropical Depression';
}

function detectFormationChance(p = {}) {
  const raw = [p.PROB2DAY, p.PROB5DAY, p.FormationChance, p.label, p.LABEL]
    .filter(Boolean).map(v => String(v).toUpperCase()).join(' ');
  if (raw.includes('HIGH'))   return 'HIGH';
  if (raw.includes('MEDIUM')) return 'MEDIUM';
  if (raw.includes('LOW'))    return 'LOW';
  return 'LOW';
}

/**
 * Best-effort extraction of a 0-100 formation-probability percentage from an
 * Esri feature's attributes. The exact field name published by NHC's
 * Tropical Weather Outlook GIS layer isn't guaranteed to be stable, so this
 * scans every property whose name matches the given pattern and pulls the
 * first 0-100 number out of its value (handles "40", "40%", "40 percent").
 * @param {object} properties
 * @param {RegExp} keyPattern
 * @returns {number|null}
 */
function extractFormationPercent(properties, keyPattern) {
  for (const [key, value] of Object.entries(properties || {})) {
    if (!keyPattern.test(key) || value == null) continue;
    const m = String(value).match(/(\d{1,3})/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n >= 0 && n <= 100) return n;
  }
  return null;
}

/**
 * Best-effort extraction of the Tropical Weather Outlook narrative text from
 * an Esri feature's attributes. Prefers a property whose name suggests it
 * holds discussion text; falls back to the longest string-valued property
 * (narrative fields are far longer than codes/IDs).
 * @param {object} properties
 * @returns {string}
 */
function extractOutlookText(properties) {
  const entries = Object.entries(properties || {}).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 40
  );
  if (!entries.length) return '';
  const named = entries.filter(([k]) => /text|discuss|desc|remark|outlook|summary/i.test(k));
  const pool = named.length ? named : entries;
  return pool.sort((a, b) => b[1].length - a[1].length)[0][1].trim();
}

function ensureFC(data, normalizeFn) {
  if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
    return { ...data, features: data.features.map((f, i) => normalizeFn(f, i)) };
  }
  return EMPTY_FC;
}

function buildEsriQuery(layerId) {
  return `${ESRI_SERVICE}/${layerId}/query?${new URLSearchParams({
    where: '1=1', outFields: '*', f: 'geojson', resultRecordCount: '500',
  })}`;
}

function buildNoaaQuery(layerId) {
  return `${NOAA_MAPSERVER}/${layerId}/query?${new URLSearchParams({
    where: '1=1', outFields: '*', f: 'geojson', resultRecordCount: '500',
  })}`;
}

// Wrap fetch so a single layer failure returns EMPTY_FC instead of throwing
async function safeFetch(url, cacheKey, ttlMs = 5 * 60 * 1000) {
  try {
    const data = await fetchWithCache(url, cacheKey, {}, ttlMs);
    return data;
  } catch {
    return EMPTY_FC;
  }
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeForecast(feature, idx) {
  const p = feature?.properties || {};
  const category = getHurricaneCategory(p.MAXWIND);
  const colors = HURRICANE_CATEGORY_COLORS[category];
  return {
    ...feature,
    properties: {
      ...p,
      id:          p.OBJECTID != null ? `nhc-track-${p.OBJECTID}` : `nhc-track-${idx}`,
      stormName:   p.STORMNAME || '',
      stormType:   p.TCDVLP   || '',
      maxWind:     p.MAXWIND   || 0,
      gust:        p.GUST      || 0,
      basin:       p.BASIN     || '',
      dateLabel:   p.DATELBL   || p.FLDATELBL || '',
      category,
      fillColor:   colors.fill,
      strokeColor: colors.stroke,
    },
  };
}

function normalizeObserved(feature, idx) {
  const p = feature?.properties || {};
  const category = getHurricaneCategory(p.MAXWIND);
  return {
    ...feature,
    properties: {
      ...p,
      id:        p.OBJECTID != null ? `nhc-obs-${p.OBJECTID}` : `nhc-obs-${idx}`,
      stormName: p.STORMNAME || '',
      stormType: p.TCDVLP   || '',
      maxWind:   p.MAXWIND   || 0,
      gust:      p.GUST      || 0,
      dateLabel: p.DATELBL   || p.FLDATELBL || '',
      category,
      observed:  true,
    },
  };
}

function normalizeCone(feature, idx) {
  const p = feature?.properties || {};
  return {
    ...feature,
    properties: {
      ...p,
      id:        p.OBJECTID != null ? `nhc-cone-${p.OBJECTID}` : `nhc-cone-${idx}`,
      stormName: p.STORMNAME || '',
    },
  };
}

function normalizeDisturbance(feature, idx) {
  const p = feature?.properties || {};
  const formationChance = detectFormationChance(p);
  const colors = DISTURBANCE_COLORS[formationChance];
  return {
    ...feature,
    properties: {
      ...p,
      id:             p.OBJECTID != null ? `nhc-dist-${p.OBJECTID}` : `nhc-dist-${idx}`,
      formationChance,
      day2Percent:    extractFormationPercent(p, /2.?day|48.?h/i),
      day7Percent:    extractFormationPercent(p, /7.?day|168.?h/i),
      outlookText:    extractOutlookText(p),
      fillColor:      colors.fill,
      strokeColor:    colors.stroke,
    },
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/** Derive one label point per storm from forecast track features */
export function buildStormLabels(trackFC) {
  if (!trackFC?.features?.length) return EMPTY_FC;
  const storms = {};
  for (const f of trackFC.features) {
    const name = f.properties?.stormName || '';
    if (!name || !f.geometry?.coordinates) continue;
    if (!storms[name]) storms[name] = f;
  }
  return {
    type: 'FeatureCollection',
    features: Object.values(storms).map(f => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: f.geometry.coordinates },
      properties: {
        stormName: f.properties.stormName,
        stormType: f.properties.stormType,
        category:  f.properties.category,
      },
    })),
  };
}

/** Forecast track – FeatureServer/0 */
export async function fetchNhcTrack() {
  const data = await safeFetch(buildEsriQuery(0), 'nhc:track');
  return ensureFC(data, normalizeForecast);
}

/** Observed (past) track – FeatureServer/2 */
export async function fetchNhcObservedTrack() {
  const data = await safeFetch(buildEsriQuery(2), 'nhc:observed');
  return ensureFC(data, normalizeObserved);
}

/** Forecast error cone – FeatureServer/4 */
export async function fetchNhcCone() {
  const data = await safeFetch(buildEsriQuery(4), 'nhc:cone');
  return ensureFC(data, normalizeCone);
}

/** Tropical disturbance outlook – NOAA MapServer layer 320 */
export async function fetchNhcDisturbanceOutlook() {
  const data = await safeFetch(buildNoaaQuery(320), 'nhc:disturbance', 10 * 60 * 1000);
  return ensureFC(data, normalizeDisturbance);
}

// ─── Coastal watches / warnings ───────────────────────────────────────────────
// The NOAA_MAPSERVER layer holding coastal watch/warning breakpoints isn't a
// fixed, documented ID the way layer 320 is, so the layer id is resolved once
// per session by name-matching the service's own layer list. If discovery
// fails for any reason the layer simply renders nothing — it never breaks
// the rest of the map.
let watchWarningLayerIdPromise = null;

async function resolveWatchWarningLayerId() {
  if (watchWarningLayerIdPromise) return watchWarningLayerIdPromise;
  watchWarningLayerIdPromise = (async () => {
    try {
      const res = await fetch(`${NOAA_MAPSERVER}?f=json`);
      if (!res.ok) return null;
      const meta = await res.json();
      const candidates = [...(meta.layers || []), ...(meta.tables || [])];
      const match = candidates.find((l) => /watch|warning/i.test(l.name || ''));
      return match ? match.id : null;
    } catch {
      return null;
    }
  })();
  return watchWarningLayerIdPromise;
}

function detectWatchWarningType(properties = {}) {
  const raw = Object.entries(properties)
    .filter(([k]) => /type|category|status|advisory/i.test(k))
    .map(([, v]) => String(v ?? ''))
    .join(' ')
    .toUpperCase();
  const hasWarn = raw.includes('WARNING');
  const hasWatch = raw.includes('WATCH');
  if (raw.includes('STORM SURGE')) return hasWarn ? 'Storm Surge Warning' : hasWatch ? 'Storm Surge Watch' : 'Advisory';
  if (raw.includes('HURRICANE'))    return hasWarn ? 'Hurricane Warning'    : hasWatch ? 'Hurricane Watch'    : 'Advisory';
  if (raw.includes('TROPICAL STORM')) return hasWarn ? 'Tropical Storm Warning' : hasWatch ? 'Tropical Storm Watch' : 'Advisory';
  return 'Advisory';
}

function normalizeWatchWarning(feature, idx) {
  const p = feature?.properties || {};
  const wwType = detectWatchWarningType(p);
  const colors = WATCH_WARNING_COLORS[wwType] || WATCH_WARNING_COLORS.Advisory;
  return {
    ...feature,
    properties: {
      ...p,
      id:          p.OBJECTID != null ? `nhc-ww-${p.OBJECTID}` : `nhc-ww-${idx}`,
      stormName:   p.STORMNAME || '',
      wwType,
      fillColor:   colors.fill,
      strokeColor: colors.stroke,
    },
  };
}

/**
 * Coastal watch/warning breakpoints for active tropical cyclones.
 * Returns an empty FeatureCollection (never throws) if the layer can't be
 * located on the NOAA service or the request fails.
 */
export async function fetchNhcWatchesWarnings() {
  const layerId = await resolveWatchWarningLayerId();
  if (layerId == null) return EMPTY_FC;
  const data = await safeFetch(buildNoaaQuery(layerId), 'nhc:ww', 10 * 60 * 1000);
  return ensureFC(data, normalizeWatchWarning);
}

/**
 * Fetch all four NHC layers. Each resolves independently — a failure in
 * one source never prevents the others from rendering.
 */
export async function fetchNhcTropicalWeather() {
  const [trackRes, observedRes, coneRes, disturbanceRes] = await Promise.allSettled([
    fetchNhcTrack(),
    fetchNhcObservedTrack(),
    fetchNhcCone(),
    fetchNhcDisturbanceOutlook(),
  ]);

  return {
    track:       trackRes.status       === 'fulfilled' ? trackRes.value       : EMPTY_FC,
    observedTrack: observedRes.status  === 'fulfilled' ? observedRes.value     : EMPTY_FC,
    cone:        coneRes.status        === 'fulfilled' ? coneRes.value         : EMPTY_FC,
    disturbance: disturbanceRes.status === 'fulfilled' ? disturbanceRes.value  : EMPTY_FC,
  };
}
