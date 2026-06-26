/**
 * caEvacuations.js
 * California Active Evacuation Zones – CalOES / ArcGIS Online
 *
 * Service: CA_EVACUATIONS_PROD FeatureServer
 * https://services3.arcgis.com/uknczv4rpevve42E/arcgis/rest/services/CA_EVACUATIONS_PROD/FeatureServer
 *
 * No API key required – public government data.
 * Zone_Status values: "Evacuation Order", "Evacuation Warning", "Evacuation Advisory"
 */

import { fetchWithCache } from '../utils/dataCache';

const EVAC_BASE =
  'https://services3.arcgis.com/uknczv4rpevve42E/arcgis/rest/services' +
  '/CA_EVACUATIONS_PROD/FeatureServer/0/query';

/**
 * Build an ArcGIS-compatible TIMESTAMP literal for use in WHERE clauses.
 * ArcGIS requires: TIMESTAMP 'YYYY-MM-DD HH:MM:SS'
 */
function arcgisTimestamp(date) {
  return `TIMESTAMP '${date.toISOString().replace('T', ' ').substring(0, 19)}'`;
}

/**
 * Fetch active California evacuation zones.
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function fetchCaEvacuations() {
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    where: `EDIT_DATE > ${arcgisTimestamp(cutoff)}`,
    outFields: [
      'OBJECTID',
      'COUNTY',
      'CITY',
      'ZONE_NAME',
      'ZONE_ID',
      'STATUS',
      'EVENT_TYPE',
      'CRITICAL_INFO',
      'PUBLIC_INFO',
      'EDIT_DATE',
      'STATEWIDE_LAST_UPDATED',
      'NOTES',
    ].join(','),
    f: 'geojson',
    outSR: '4326',
    resultRecordCount: 2000,
  });

  const url = `${EVAC_BASE}?${params}`;
  const cacheKey = `ca:evacuations:${cutoff.getTime()}`;

  try {
    const data = await fetchWithCache(url, cacheKey, {}, 5 * 60 * 1000);
    if (data?.error) throw new Error(data.error.message || 'ArcGIS error');
    if (data?.features) return normalizeEvacuations(data);
    throw new Error('Unexpected response format');
  } catch (err) {
    console.warn('[CAEvac] Failed to fetch evacuation zones:', err.message);
    return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Normalize field names defensively – the CalOES service has evolved over time
 * and field names may differ slightly between layers.
 */
function normalizeEvacuations(geojson) {
  return {
    ...geojson,
    features: geojson.features.map(f => {
      const p = f.properties || {};
      return {
        ...f,
        properties: {
          Zone_Status:       p.STATUS        || 'Evacuation Order',
          Zone_Name:         p.ZONE_NAME     || p.ZONE_ID || 'Evacuation Zone',
          IncidentName:      p.EVENT_TYPE    || '',
          Agency:            p.CITY          || '',
          Date_Time_Issued:  p.EDIT_DATE     || null,
          Last_Update:       p.STATEWIDE_LAST_UPDATED || p.EDIT_DATE || null,
          Comments:          p.CRITICAL_INFO || p.NOTES || '',
          Jurisdiction:      p.COUNTY        || '',
          Instructions:      p.PUBLIC_INFO   || '',
        },
      };
    }),
  };
}
