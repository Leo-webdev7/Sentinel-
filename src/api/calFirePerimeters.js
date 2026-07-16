/**
 * calFirePerimeters.js
 * CAL FIRE FRAP – Fire and Resource Assessment Program
 * Historical California fire perimeter polygons (statewide, back to the 1800s),
 * published via CAL FIRE's own ArcGIS REST FeatureServer.
 *
 * Service: California_Historic_Fire_Perimeters (layer 0 = "all")
 * https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/
 * California_Historic_Fire_Perimeters/FeatureServer/0/query
 *
 * No API key required – public government data service. Updated ~annually,
 * so results are cached far longer than the live NIFC/FIRIS perimeter feeds.
 */

import { fetchWithCache } from '../utils/dataCache';
import { MOCK_CALFIRE_HISTORICAL_PERIMETERS } from '../data/mockData';
import { throttleError } from '../utils/errorThrottle';

const CALFIRE_FRAP_BASE =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services' +
  '/California_Historic_Fire_Perimeters/FeatureServer/0/query';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h – FRAP data only refreshes ~annually

async function withRetry(fn, { attempts = 3, baseDelayMs = 1000 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        throttleError('[CAL FIRE FRAP]', `Attempt ${i + 1}/${attempts} failed, retrying in ${delay}ms:`, err, {
          ttlMs: 30 * 1000,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Fetch historical fire perimeters from CAL FIRE FRAP.
 * Defaults to the last 10 fire seasons to keep the statewide (1898+) dataset
 * a reasonable size for the browser to render.
 * @param {object} [opts]
 * @param {number} [opts.minYear] Earliest fire year to include (default: current year - 10)
 * @param {number} [opts.minAcres=0] Filter perimeters below this size
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function fetchCalFireHistoricalPerimeters({ minYear, minAcres = 0 } = {}) {
  const year = minYear ?? new Date().getFullYear() - 10;

  const clauses = [`YEAR_>=${year}`];
  if (minAcres > 0) clauses.push(`GIS_ACRES>=${minAcres}`);

  const params = new URLSearchParams({
    where: clauses.join(' AND '),
    outFields: [
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
    ].join(','),
    outSR: '4326',
    f: 'geojson',
  });

  const url = `${CALFIRE_FRAP_BASE}?${params}`;
  const cacheKey = `calfire:frap:perimeters:${year}:${minAcres}`;

  try {
    const data = await withRetry(() => fetchWithCache(url, cacheKey, {}, CACHE_TTL_MS));
    if (data?.error) throw new Error(data.error.message || 'ArcGIS error');
    if (data?.features) return normalizeCalFireHistoricalPerimeters(data);
    throw new Error('Unexpected response format');
  } catch (err) {
    throttleError('[CAL FIRE FRAP]', 'Using fallback historical perimeters:', err, {
      friendlyType: 'generic',
    });
    return MOCK_CALFIRE_HISTORICAL_PERIMETERS;
  }
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
