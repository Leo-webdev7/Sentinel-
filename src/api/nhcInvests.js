/**
 * nhcInvests.js
 * Combines two already-fetched NHC sources into a single "Invest" dataset:
 *   - Invest center points (from CurrentStorms.json, see nhcStorms.js)
 *   - Tropical Weather Outlook development-area polygons (NOAA MapServer 320,
 *     see nhcTropicalWeather.js), which carry 2-day/7-day formation
 *     probability and outlook text but no formal Invest ID.
 *
 * Neither source shares a common ID, so each Invest point is matched to the
 * nearest outlook polygon by centroid distance. This is a pure combinator —
 * no network calls happen here.
 */

import { polygonCentroid } from '../utils/geoUtils';

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

// An Invest point further than this from every outlook polygon's centroid
// (in degrees, ~330 km at the equator) is treated as unmatched rather than
// forced onto the nearest-but-unrelated area.
const MAX_MATCH_DISTANCE_DEG = 3;

function distance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the outlook-area feature whose centroid is nearest to a point.
 * @param {[number, number]} point [lng, lat]
 * @param {object[]} areaFeatures
 * @returns {{feature: object, distance: number}|null}
 */
function nearestArea(point, areaFeatures) {
  let best = null;
  for (const feature of areaFeatures) {
    const centroid = polygonCentroid(feature.geometry);
    if (!centroid) continue;
    const d = distance(point, centroid);
    if (!best || d < best.distance) best = { feature, distance: d };
  }
  return best;
}

/**
 * Enrich Invest center points with the nearest matching outlook polygon's
 * formation-probability and outlook-text data.
 * @param {object} investCentersGeoJSON  FeatureCollection of Invest points
 *   (features whose properties.isInvest is true; see fetchNhcActiveStorms)
 * @param {object} outlookAreasGeoJSON   FeatureCollection of disturbance
 *   outlook polygons (see fetchNhcDisturbanceOutlook)
 * @returns {object} FeatureCollection of enriched Invest points
 */
export function matchInvestsToOutlookAreas(investCentersGeoJSON, outlookAreasGeoJSON) {
  if (!investCentersGeoJSON?.features?.length) return EMPTY_FC;
  const areaFeatures = outlookAreasGeoJSON?.features || [];

  return {
    type: 'FeatureCollection',
    features: investCentersGeoJSON.features.map((f) => {
      const match = areaFeatures.length
        ? nearestArea(f.geometry.coordinates, areaFeatures)
        : null;
      const areaProps = match && match.distance <= MAX_MATCH_DISTANCE_DEG
        ? match.feature.properties
        : null;

      return {
        ...f,
        properties: {
          ...f.properties,
          day2Percent:     areaProps?.day2Percent ?? null,
          day7Percent:     areaProps?.day7Percent ?? null,
          formationChance: areaProps?.formationChance ?? null,
          outlookText:     areaProps?.outlookText ?? '',
          matchedAreaId:   areaProps?.id ?? null,
        },
      };
    }),
  };
}
