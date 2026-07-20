/**
 * useFireBehaviorModeling.js
 * Derives spread-projection rings (+1h/+3h/+6h) for the user's currently
 * selected fire, driven by that fire's nearest RAWS station (wind + fuel
 * moisture). Purely a client-side derivation of data already fetched
 * elsewhere, no additional network endpoint required.
 *
 * Modeling is opt-in per fire (selectedFireId) rather than running over
 * every active fire on the map — the projection math is only meaningful
 * for a fire the user is actively looking at, and computing it for dozens
 * of fires at once was wasted work with no UI to show it.
 *
 * A fire with a mapped perimeter polygon (NIFC WFIGS) has its actual
 * footprint grown outward. A fire that only has an incident "dot" location
 * (no perimeter yet reported) is modeled as a point-source ellipse
 * centered on that dot, using the same wind/fuel-moisture inputs.
 */

import { useMemo } from 'react';
import { useRAWSData } from './useRAWSData';
import { polygonCentroid, outerRing } from '../utils/geoUtils';
import { findNearestStation, estimateFireBehavior, buildSpreadPolygon, growPerimeterPolygon } from '../utils/fireBehaviorModel';

const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] };

// Largest horizon first so smaller/nearer-term rings draw on top (painter's algorithm).
const HORIZONS_HOURS = [6, 3, 1];
const MIN_ACRES = 10;

function isModelable(properties) {
  const p = properties || {};
  return Number(p.PercentContained) < 100 && Number(p.GISAcres) >= MIN_ACRES;
}

function findByFireId(features, fireId) {
  return features.find((f) => f.properties?.UniqueFireIdentifier === fireId) || null;
}

function projectionFeatures({ incidentName, ignitionPoint, perimeterRing, rawsFeatures }) {
  const nearest = findNearestStation(ignitionPoint, rawsFeatures);
  const stationProps = nearest?.station?.properties;
  const behavior = estimateFireBehavior({
    windSpeedMph: stationProps?.windSpeed,
    fuelMoisturePct: stationProps?.fuelMoisture,
  });

  const features = [];
  for (const hours of HORIZONS_HOURS) {
    // Grow the fire's actual current perimeter outward when one exists;
    // fall back to a synthetic point-source ellipse for dot-only incidents
    // or when the perimeter geometry is unusable.
    const geometry = (perimeterRing && growPerimeterPolygon({
      perimeterRing,
      centroid: ignitionPoint,
      windDirDeg: stationProps?.windDir,
      behavior,
      hours,
    })) ?? buildSpreadPolygon({
      ignition: ignitionPoint,
      windDirDeg: stationProps?.windDir,
      behavior,
      hours,
    });

    features.push({
      type: 'Feature',
      geometry,
      properties: {
        incidentName,
        horizonHours: hours,
        rosHeadChPerHr: Math.round(behavior.rosHeadChPerHr * 10) / 10,
        flameLengthFt: Math.round(behavior.flameLengthFt * 10) / 10,
        windSpeedMph: Math.round(behavior.windSpeedMph),
        windDirDeg: stationProps?.windDir ?? null,
        fuelMoisturePct: Math.round(behavior.fuelMoisturePct),
        stationName: stationProps?.stationName || null,
        stationDistanceMi: nearest ? Math.round(nearest.distanceMi) : null,
      },
    });
  }
  return features;
}

/**
 * @param {boolean} enabled Layer toggle on AND user has fire-behavior-modeling entitlement
 * @param {object|null} perimetersGeoJSON Active fire perimeter polygons (NIFC WFIGS)
 * @param {object|null} incidentDotsGeoJSON Active fire "dot" incidents that have no mapped perimeter yet
 * @param {string|null} selectedFireId UniqueFireIdentifier of the fire the user has selected, if any
 */
export function useFireBehaviorModeling(enabled, perimetersGeoJSON, incidentDotsGeoJSON, selectedFireId) {
  const active = enabled && Boolean(selectedFireId);
  const { geoJSON: rawsGeoJSON, loading: rawsLoading } = useRAWSData(active);

  const geoJSON = useMemo(() => {
    if (!active) return EMPTY_GEOJSON;

    const perimeterFeatures = perimetersGeoJSON?.features || [];
    const dotFeatures = incidentDotsGeoJSON?.features || [];

    const fire = findByFireId(perimeterFeatures, selectedFireId);
    const dot = fire ? null : findByFireId(dotFeatures, selectedFireId);

    const features = [];

    if (fire && isModelable(fire.properties)) {
      const centroid = polygonCentroid(fire.geometry);
      if (centroid) {
        features.push(...projectionFeatures({
          incidentName: fire.properties?.IncidentName || 'Unnamed fire',
          ignitionPoint: centroid,
          perimeterRing: outerRing(fire.geometry),
          rawsFeatures: rawsGeoJSON?.features,
        }));
      }
    } else if (dot && isModelable(dot.properties)) {
      const coords = dot.geometry?.coordinates;
      if (Array.isArray(coords)) {
        features.push(...projectionFeatures({
          incidentName: dot.properties?.IncidentName || 'Unnamed fire',
          ignitionPoint: [coords[0], coords[1]],
          perimeterRing: null,
          rawsFeatures: rawsGeoJSON?.features,
        }));
      }
    }

    return { type: 'FeatureCollection', features };
  }, [active, perimetersGeoJSON, incidentDotsGeoJSON, rawsGeoJSON, selectedFireId]);

  return { geoJSON, loading: active && rawsLoading };
}
