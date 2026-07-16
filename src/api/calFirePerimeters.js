/**
 * calFirePerimeters.js
 * CAL FIRE FRAP – Fire and Resource Assessment Program
 * Historical California fire perimeter polygons (statewide, back to the 1800s).
 *
 * Primary source is CAL FIRE's own first-party ArcGIS Server, which is kept
 * up to date to always point at the latest official "firep" release:
 *   https://egis.fire.ca.gov/arcgis/rest/services/FRAP/FirePerimeters_FS/FeatureServer/0/query
 *
 * Falls back to CAL FIRE's ArcGIS Online mirror of the same FRAP dataset
 * (same fields, hosted on Esri's infrastructure) if the first-party server
 * is unreachable or does not allow cross-origin browser requests:
 *   https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/
 *   California_Historic_Fire_Perimeters/FeatureServer/0/query
 *
 * No API key required – public government data services. Updated ~annually,
 * so results are cached far longer than the live NIFC/FIRIS perimeter feeds.
 */

import { fetchWithCache } from '../utils/dataCache';
import { MOCK_CALFIRE_HISTORICAL_PERIMETERS } from '../data/mockData';
import { throttleError } from '../utils/errorThrottle';

const CALFIRE_EGIS_BASE =
  'https://egis.fire.ca.gov/arcgis/rest/services/FRAP/FirePerimeters_FS/FeatureServer/0/query';

const CALFIRE_AGOL_MIRROR_BASE =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services' +
  '/California_Historic_Fire_Perimeters/FeatureServer/0/query';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h – FRAP data only refreshes ~annually

const OUT_FIELDS = [
  'YEAR_',
  'STATE',
  'AGENCY',
  'UNIT_ID',
  'FIRE_NAME',
  'INC_NUM',
  'ALARM_DATE',
  'CONT_DATE',
  'CAUSE',
  'GIS_ACRES',
  'COMPLEX_NAME',
  'IRWINID',
].join(',');

function buildQueryUrl(base, { year, minAcres }) {
  const clauses = [`YEAR_>=${year}`];
  if (minAcres > 0) clauses.push(`GIS_ACRES>=${minAcres}`);

  const params = new URLSearchParams({
    where: clauses.join(' AND '),
    outFields: OUT_FIELDS,
    outSR: '4326',
    f: 'geojson',
  });

  return `${base}?${params}`;
}

async function withRetry(fn, { attempts = 2, baseDelayMs = 1000, tag = '[CAL FIRE FRAP]' } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        throttleError(tag, `Attempt ${i + 1}/${attempts} failed, retrying in ${delay}ms:`, err, {
          ttlMs: 30 * 1000,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function fetchFromSource(url, cacheKey, tag) {
  const data = await withRetry(() => fetchWithCache(url, cacheKey, {}, CACHE_TTL_MS), { tag });
  if (data?.error) throw new Error(data.error.message || 'ArcGIS error');
  if (!data?.features) throw new Error('Unexpected response format');
  return data;
}

/**
 * Fetch historical fire perimeters from CAL FIRE FRAP.
 * Tries CAL FIRE's first-party egis.fire.ca.gov server first, then its
 * ArcGIS Online mirror, then falls back to mock data.
 * Defaults to the last 10 fire seasons to keep the statewide (1878+) dataset
 * a reasonable size for the browser to render.
 * @param {object} [opts]
 * @param {number} [opts.minYear] Earliest fire year to include (default: current year - 10)
 * @param {number} [opts.minAcres=0] Filter perimeters below this size
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function fetchCalFireHistoricalPerimeters({ minYear, minAcres = 0 } = {}) {
  const year = minYear ?? new Date().getFullYear() - 10;

  const sources = [
    {
      label: 'egis.fire.ca.gov (CAL FIRE FRAP)',
      url: buildQueryUrl(CALFIRE_EGIS_BASE, { year, minAcres }),
      cacheKey: `calfire:egis:perimeters:${year}:${minAcres}`,
    },
    {
      label: 'ArcGIS Online mirror',
      url: buildQueryUrl(CALFIRE_AGOL_MIRROR_BASE, { year, minAcres }),
      cacheKey: `calfire:agol:perimeters:${year}:${minAcres}`,
    },
  ];

  let lastErr;
  for (const { label, url, cacheKey } of sources) {
    try {
      const data = await fetchFromSource(url, cacheKey, `[CAL FIRE FRAP: ${label}]`);
      return normalizeCalFireHistoricalPerimeters(data);
    } catch (err) {
      lastErr = err;
      throttleError('[CAL FIRE FRAP]', `${label} failed:`, err, { friendlyType: 'generic' });
    }
  }

  throttleError('[CAL FIRE FRAP]', 'Using fallback historical perimeters:', lastErr, {
    friendlyType: 'generic',
  });
  return MOCK_CALFIRE_HISTORICAL_PERIMETERS;
}

/**
 * Normalize CAL FIRE FRAP fields to a flat schema for the map layer.
 */
export function normalizeCalFireHistoricalPerimeters(geojson) {
  return {
    ...geojson,
    features: geojson.features.map(f => {
      const p = f.properties || {};
      return {
        ...f,
        properties: {
          FireName:      p.FIRE_NAME || p.COMPLEX_NAME || 'Unknown Fire',
          FireYear:      p.YEAR_ ?? null,
          GISAcres:      p.GIS_ACRES || 0,
          AlarmDate:     p.ALARM_DATE || null,
          ContainedDate: p.CONT_DATE || null,
          Agency:        p.AGENCY || '',
          UnitId:        p.UNIT_ID || '',
          Cause:         p.CAUSE ?? null,
          IncidentNum:   p.INC_NUM || '',
          IRWINID:       p.IRWINID || '',
          _source:       'CALFIRE_FRAP',
        },
      };
    }),
  };
}
