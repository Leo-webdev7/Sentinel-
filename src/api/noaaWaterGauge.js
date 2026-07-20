/**
 * noaaWaterGauge.js
 * NOAA National Water Prediction Service (NWPS) API – public, no key required.
 *
 * Endpoints:
 *   GET /gauges           – list all ~10k US river/coastal gauges
 *   GET /gauges/{lid}     – single gauge metadata + flood thresholds
 *   GET /gauges/{lid}/stageflow – observed + forecast stage time-series
 *
 * Docs: https://api.water.noaa.gov/nwps/v1/docs/
 */

import { getCached, setCached } from '../utils/dataCache';

// Requests are routed through /api/nwps to avoid CORS issues (Vite proxy in
// dev, Netlify edge function in production).
const BASE = '/api/nwps';

const HEADERS = { Accept: 'application/json' };

/** Convert the NWPS gauge list response into a GeoJSON FeatureCollection. */
function gaugesToGeoJSON(gauges) {
  const features = [];
  for (const g of gauges) {
    // Handle coordinates from direct properties or nested geometry
    const lat = g.latitude ?? g.lat ?? g.geometry?.coordinates?.[1];
    const lon = g.longitude ?? g.lon ?? g.lng ?? g.geometry?.coordinates?.[0];
    if (lat == null || lon == null) continue;

    const flood = g.flood ?? {};
    const stage = g.status?.observed?.primary?.value ?? g.status?.current?.primaryStage?.value ?? null;
    const floodCategory = g.status?.observed?.floodCategory ?? g.floodCategory ?? 'no_flooding';

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(lon), Number(lat)] },
      properties: {
        lid: g.lid,
        name: g.name,
        state: g.state,
        county: g.county,
        hsa: g.hsa,
        datum: g.datum,
        currentStage: stage != null ? Number(stage) : null,
        floodCategory,
        actionStage: flood.action != null ? Number(flood.action) : null,
        minorStage: flood.minor != null ? Number(flood.minor) : null,
        moderateStage: flood.moderate != null ? Number(flood.moderate) : null,
        majorStage: flood.major != null ? Number(flood.major) : null,
        url: g.url ?? null,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Fetch all US gauges from NWPS.
 * The API returns ~10k gauges; responses are cached for 5 minutes.
 */
export async function fetchWaterGauges() {
  const cacheKey = 'noaa-water-gauges-all';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE}/gauges`, { headers: HEADERS });
  if (!res.ok) throw new Error(`NWPS gauges HTTP ${res.status}`);

  const json = await res.json();
  // API returns { gauges: [...] } or directly an array or a GeoJSON FeatureCollection
  let list;
  if (Array.isArray(json)) {
    list = json;
  } else if (Array.isArray(json.gauges)) {
    list = json.gauges;
  } else if (Array.isArray(json.data)) {
    list = json.data;
  } else if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
    // Some NWPS endpoints return GeoJSON directly; extract properties + geometry
    list = json.features.map(f => ({
      ...f.properties,
      latitude: f.geometry?.coordinates?.[1],
      longitude: f.geometry?.coordinates?.[0],
    }));
  } else {
    list = [];
  }
  const geoJSON = gaugesToGeoJSON(list);

  setCached(cacheKey, geoJSON, 5 * 60 * 1000);
  return geoJSON;
}

/**
 * Fetch detailed metadata for a single gauge including flood thresholds.
 * Cached per LID for 5 minutes.
 */
export async function fetchGaugeDetail(lid) {
  const cacheKey = `noaa-gauge-detail-${lid}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE}/gauges/${encodeURIComponent(lid)}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`NWPS gauge detail HTTP ${res.status}`);

  const data = await res.json();
  setCached(cacheKey, data, 5 * 60 * 1000);
  return data;
}

/**
 * Fetch observed + forecast stage/flow time-series for a gauge.
 * Returns an object { observed: [{time, stage}], forecast: [{time, stage}] }.
 * Cached per LID for 5 minutes.
 */
export async function fetchGaugeStageFlow(lid) {
  const cacheKey = `noaa-gauge-stageflow-${lid}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE}/gauges/${encodeURIComponent(lid)}/stageflow`, { headers: HEADERS });
  if (!res.ok) throw new Error(`NWPS stageflow HTTP ${res.status}`);

  const json = await res.json();

  const parsePoints = (arr) =>
    (arr ?? []).map((pt) => ({
      time: new Date(pt.validTime ?? pt.time ?? pt.t).getTime(),
      stage: pt.primary != null ? Number(pt.primary) : (pt.stage != null ? Number(pt.stage) : null),
    })).filter((p) => p.stage != null && Number.isFinite(p.time));

  const result = {
    observed: parsePoints(json.observed?.data ?? json.observed ?? []),
    forecast: parsePoints(json.forecast?.data ?? json.forecast ?? []),
  };

  setCached(cacheKey, result, 5 * 60 * 1000);
  return result;
}
