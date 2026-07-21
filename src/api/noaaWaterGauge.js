/**
 * noaaWaterGauge.js
 * NOAA National Water Prediction Service (NWPS) API – public, no key required.
 *
 * Endpoints:
 *   GET /gauges                          – river/coastal gauges within a bbox
 *   GET /gauges/{lid}                    – single gauge metadata + flood thresholds
 *   GET /gauges/{lid}/stageflow/observed – observed stage/flow time-series
 *   GET /gauges/{lid}/stageflow/forecast – forecast stage/flow time-series
 *
 * Docs: https://api.water.noaa.gov/nwps/v1/docs/
 *
 * Real response shapes (verified against the live API):
 *   gauge.status.observed.primary         → number (feet), NOT { value }
 *   gauge.status.observed.floodCategory   → 'no_flooding' | 'action' | 'minor' | 'moderate' | 'major'
 *   gauge.flood.categories.{cat}.stage    → number (feet) threshold, NOT flood.{cat}
 *   gauge.state                           → { abbreviation, name } object, NOT a string
 * The parsers below primarily target this shape but keep fallbacks for the
 * flatter shapes so they degrade gracefully if the API changes.
 */

import { getCached, setCached } from '../utils/dataCache';

// Requests are routed through /api/nwps to avoid CORS issues (Vite proxy in
// dev, Netlify edge function in production).
const BASE = '/api/nwps';

const HEADERS = { Accept: 'application/json' };

const CACHE_TTL = 5 * 60 * 1000;

// Bounding box covering CONUS, Alaska (incl. Aleutians), Hawaii and the
// Pacific/Caribbean territories. NWPS only serves US gauges, so an all-
// encompassing box returns every gauge "across the US".
const US_BBOX = { xmin: -179.99, ymin: -15, xmax: 179.99, ymax: 72 };

// ─── Value coercion helpers ─────────────────────────────────────────────────

/** Coerce a possibly-nested numeric value to a finite Number or null. */
function toNum(v) {
  if (v == null) return null;
  if (typeof v === 'object') {
    const inner = v.value ?? v.stage ?? null;
    return inner != null && Number.isFinite(Number(inner)) ? Number(inner) : null;
  }
  return Number.isFinite(Number(v)) ? Number(v) : null;
}

/** Coerce a possibly-object field (e.g. state { abbreviation, name }) to a string or null. */
function toStr(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v.abbreviation ?? v.name ?? null;
  return String(v);
}

/** Extract the current observed stage (feet) from a gauge object. */
function extractStage(g) {
  return (
    toNum(g?.status?.observed?.primary) ??
    toNum(g?.status?.current?.primaryStage) ??
    toNum(g?.observed?.primary) ??
    toNum(g?.currentStage)
  );
}

/**
 * Extract the four flood-stage thresholds (feet).
 * Real shape: flood.categories.{cat}.stage; fallbacks: flood.stages.{cat}, flood.{cat}.
 */
function extractThresholds(flood) {
  const f = flood ?? {};
  const cats = f.categories ?? {};
  const flat = f.stages ?? f;
  const pick = (k) => toNum(cats?.[k]?.stage) ?? toNum(cats?.[k]) ?? toNum(flat?.[k]);
  return {
    action: pick('action'),
    minor: pick('minor'),
    moderate: pick('moderate'),
    major: pick('major'),
  };
}

/** Normalise an API flood-category string to our canonical lowercase keys. */
function normalizeCategory(cat) {
  if (!cat) return null;
  const c = String(cat).toLowerCase().replace(/\s+/g, '_');
  if (c.includes('major')) return 'major';
  if (c.includes('moderate')) return 'moderate';
  if (c.includes('minor')) return 'minor';
  if (c.includes('action')) return 'action';
  if (c.includes('no_flood') || c === 'none' || c === 'normal') return 'no_flooding';
  return c; // e.g. out_of_service, not_defined – rendered as default colour
}

/** Derive a flood category from a stage reading + thresholds (fallback when the API omits it). */
export function categoryForStage(stage, thresholds) {
  if (stage == null) return null;
  const t = thresholds ?? {};
  if (t.major != null && stage >= t.major) return 'major';
  if (t.moderate != null && stage >= t.moderate) return 'moderate';
  if (t.minor != null && stage >= t.minor) return 'minor';
  if (t.action != null && stage >= t.action) return 'action';
  return 'no_flooding';
}

// ─── GeoJSON conversion (map overlay) ───────────────────────────────────────

/** Convert the NWPS gauge list response into a GeoJSON FeatureCollection. */
export function gaugesToGeoJSON(gauges) {
  const features = [];
  for (const g of gauges) {
    // Handle coordinates from direct properties or nested geometry
    const lat = g.latitude ?? g.lat ?? g.geometry?.coordinates?.[1];
    const lon = g.longitude ?? g.lon ?? g.lng ?? g.geometry?.coordinates?.[0];
    if (lat == null || lon == null) continue;

    const stage = extractStage(g);
    const thresholds = extractThresholds(g.flood);
    const floodCategory =
      normalizeCategory(g.status?.observed?.floodCategory ?? g.floodCategory) ??
      categoryForStage(stage, thresholds) ??
      'no_flooding';

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(lon), Number(lat)] },
      properties: {
        lid: g.lid,
        name: g.name,
        state: toStr(g.state),
        county: toStr(g.county),
        hsa: toStr(g.hsa) ?? toStr(g.wfo),
        datum: toStr(g.datum) ?? toStr(g.verticalDatum),
        currentStage: stage,
        floodCategory,
        actionStage: thresholds.action,
        minorStage: thresholds.minor,
        moderateStage: thresholds.moderate,
        majorStage: thresholds.major,
        url: g.url ?? null,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Pull the array of gauges out of the various response envelopes the API may use. */
function extractGaugeList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.gauges)) return json.gauges;
  if (Array.isArray(json?.data)) return json.data;
  if (json?.type === 'FeatureCollection' && Array.isArray(json.features)) {
    // Some NWPS endpoints return GeoJSON directly; flatten properties + geometry
    return json.features.map((f) => ({
      ...f.properties,
      latitude: f.geometry?.coordinates?.[1],
      longitude: f.geometry?.coordinates?.[0],
    }));
  }
  return [];
}

function gaugesUrl(useBbox) {
  if (!useBbox) return `${BASE}/gauges`;
  const params = new URLSearchParams({
    'bbox.xmin': String(US_BBOX.xmin),
    'bbox.ymin': String(US_BBOX.ymin),
    'bbox.xmax': String(US_BBOX.xmax),
    'bbox.ymax': String(US_BBOX.ymax),
    srid: 'EPSG_4326',
  });
  return `${BASE}/gauges?${params.toString()}`;
}

/**
 * Fetch all US gauges from NWPS.
 *
 * The list endpoint's behaviour has varied between deployments — some return
 * every gauge unfiltered, others require a bounding box. We therefore try the
 * unfiltered request first and fall back to an all-US bbox, returning the first
 * attempt that yields gauges and only throwing if every attempt errors.
 *
 * A successful, non-empty result is cached for 5 minutes. Empty results are
 * never cached: a transient empty/failed response must not blank the map for
 * the full TTL after the upstream API recovers.
 */
export async function fetchWaterGauges() {
  const cacheKey = 'noaa-water-gauges-all';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const attempts = [gaugesUrl(false), gaugesUrl(true)];
  let list = [];
  let lastError = null;

  for (const url of attempts) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) {
        lastError = new Error(`NWPS gauges HTTP ${res.status}`);
        continue;
      }
      const parsed = extractGaugeList(await res.json());
      if (parsed.length) {
        list = parsed;
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Surface a hard failure so the UI shows an error instead of silently
  // pretending there are zero gauges (and re-fetches on the next interval).
  if (list.length === 0 && lastError) throw lastError;

  const geoJSON = gaugesToGeoJSON(list);
  if (geoJSON.features.length > 0) setCached(cacheKey, geoJSON, CACHE_TTL);
  return geoJSON;
}

// ─── Single-gauge detail (side panel) ───────────────────────────────────────

/** Normalise flood impact statements to { stage, statement, category }. */
function normalizeImpacts(raw, thresholds) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((imp) => {
      const stage = toNum(imp.stage ?? imp.value ?? imp.elevation);
      const statement = imp.statement ?? imp.impact ?? imp.description ?? imp.text ?? '';
      const category =
        normalizeCategory(imp.category ?? imp.type) ?? categoryForStage(stage, thresholds);
      return { stage, statement: String(statement).trim(), category };
    })
    .filter((imp) => imp.statement)
    .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0));
}

/**
 * Fetch detailed metadata for a single gauge and return a normalised object
 * with a stable shape the UI consumes directly. Cached per LID for 5 minutes.
 */
export async function fetchGaugeDetail(lid) {
  const cacheKey = `noaa-gauge-detail-${lid}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE}/gauges/${encodeURIComponent(lid)}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`NWPS gauge detail HTTP ${res.status}`);

  const d = await res.json();

  const thresholds = extractThresholds(d.flood);
  const currentStage = extractStage(d);
  const floodCategory =
    normalizeCategory(d.status?.observed?.floodCategory ?? d.floodCategory) ??
    categoryForStage(currentStage, thresholds) ??
    'no_flooding';

  const normalized = {
    lid: d.lid ?? lid,
    name: d.name ?? null,
    state: toStr(d.state),
    county: toStr(d.county),
    hsa: toStr(d.hsa) ?? toStr(d.wfo),
    datum: toStr(d.datum) ?? toStr(d.verticalDatum),
    currentStage,
    floodCategory,
    thresholds,
    impacts: normalizeImpacts(d.flood?.impacts ?? d.impacts, thresholds),
  };

  setCached(cacheKey, normalized, CACHE_TTL);
  return normalized;
}

// ─── Stage/flow time-series (chart) ─────────────────────────────────────────

function parseSeriesPoints(payload) {
  const arr = payload?.data ?? payload?.observed?.data ?? payload?.forecast?.data ??
    (Array.isArray(payload) ? payload : []);
  return arr
    .map((pt) => ({
      time: new Date(pt.validTime ?? pt.time ?? pt.t).getTime(),
      stage: toNum(pt.primary ?? pt.stage),
    }))
    .filter((p) => p.stage != null && Number.isFinite(p.time));
}

/**
 * Fetch observed + forecast stage time-series for a gauge.
 * Uses the dedicated /observed and /forecast sub-endpoints (a missing one is
 * treated as an empty series rather than failing the whole request).
 * Returns { observed: [{time, stage}], forecast: [{time, stage}] }.
 * Cached per LID for 5 minutes.
 */
export async function fetchGaugeStageFlow(lid) {
  const cacheKey = `noaa-gauge-stageflow-${lid}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const base = `${BASE}/gauges/${encodeURIComponent(lid)}/stageflow`;
  const load = async (path) => {
    try {
      const res = await fetch(`${base}/${path}`, { headers: HEADERS });
      if (!res.ok) return [];
      return parseSeriesPoints(await res.json());
    } catch {
      return [];
    }
  };

  const [observed, forecast] = await Promise.all([load('observed'), load('forecast')]);
  const result = { observed, forecast };

  // Don't negatively-cache an empty series (both sub-endpoints down).
  if (observed.length || forecast.length) setCached(cacheKey, result, CACHE_TTL);
  return result;
}
