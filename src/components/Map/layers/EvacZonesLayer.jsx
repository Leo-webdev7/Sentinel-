/**
 * EvacZonesLayer.jsx
 * Renders California evacuation orders, warnings, and watches as
 * semi-transparent polygon overlays on the wildfire map tab.
 *
 * Accepts data from the combined CalOES hosted-view + PROD feed
 * (see useCombinedEvacZones). Both sources are normalised to the
 * same flat schema before being passed here, so this component
 * only needs to handle:
 *
 *   warningType – "Evacuation Order" | "Evacuation Warning" | "Evacuation Watch"
 *   zoneName    – display label
 *   county      – county name
 *   agency      – responsible agency (may be empty)
 *   instructions
 *   comments
 *   effectiveDate / expirationDate
 *   externalURL
 *   source      – "hosted" | "prod"
 *
 * Color scheme mirrors standard Cal OES zone classification:
 *   Order   (mandatory evacuation) → red
 *   Warning (voluntary evacuation) → orange
 *   Watch / Advisory (preparedness) → yellow
 */

import { useEffect, useRef, useMemo } from 'react';
import { Source, Layer, useMap } from 'react-map-gl';

const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] };

/**
 * Compute the centroid of a GeoJSON Polygon or MultiPolygon ring.
 * Returns [lng, lat] or null.
 */
function polygonCentroid(geometry) {
  try {
    if (!geometry) return null;
    const coords =
      geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : null;
    if (!coords?.length) return null;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return [lng, lat];
  } catch {
    return null;
  }
}

const COLOR_MATCH = [
  'match',
  ['get', 'warningType'],
  'Evacuation Order',   '#ef4444',
  'Evacuation Warning', '#f97316',
  'Evacuation Watch',   '#eab308',
  /* default */         '#f97316',
];

const OPACITY_MATCH = [
  'match',
  ['get', 'warningType'],
  'Evacuation Order',   0.60,
  'Evacuation Warning', 0.50,
  'Evacuation Watch',   0.40,
  /* default */         0.45,
];

const LINE_WIDTH_MATCH = [
  'match',
  ['get', 'warningType'],
  'Evacuation Order',   2.5,
  'Evacuation Warning', 2.0,
  /* default */         1.5,
];

export default function EvacZonesLayer({ geoJSON, visible }) {
  const vis = visible ? 'visible' : 'none';
  const data = geoJSON || EMPTY_GEOJSON;
  const { current: map } = useMap();
  const prevCountRef = useRef(0);

  // Build a companion FeatureCollection of centroid points for the dot layer
  const dotsData = useMemo(() => {
    if (!data?.features?.length) return EMPTY_GEOJSON;
    const dots = data.features
      .map((f, idx) => {
        const center = polygonCentroid(f.geometry);
        if (!center) return null;
        return {
          type: 'Feature',
          id: `dot-${f.id || idx}`,
          geometry: { type: 'Point', coordinates: center },
          properties: f.properties,
        };
      })
      .filter(Boolean);
    console.log(`[EvacZonesLayer] Dots computed: ${dots.length} from ${data.features.length} features`);
    if (dots.length > 0) {
      dots.forEach((d, i) => {
        console.log(`[EvacZonesLayer]   Dot ${i}: id=${d.id} lng=${d.geometry.coordinates[0].toFixed(3)} lat=${d.geometry.coordinates[1].toFixed(3)} src=${d.properties.source} type=${d.properties.warningType}`);
      });
    }
    return {
      type: 'FeatureCollection',
      features: dots,
    };
  }, [data]);

  // Force source data update when geoJSON changes
  useEffect(() => {
    if (!map) return;

    const fc = data?.features?.length ?? 0;
    if (fc !== prevCountRef.current) {
      prevCountRef.current = fc;
      console.log(`[EvacZonesLayer] Updating map source: ${fc} features`);
    }

    try {
      const source = map.getSource('evac-zones');
      if (source && source.type === 'geojson') {
        source.setData(data);
      }
    } catch {
      // source not yet added
    }

    try {
      const dotSource = map.getSource('evac-zones-dots');
      if (dotSource && dotSource.type === 'geojson') {
        dotSource.setData(dotsData);
      }
    } catch {
      // source not yet added
    }
  }, [data, dotsData, map]);

  return (
    <>
      {/* Polygons (fill, outline, labels) — rendered first, behind dots */}
      <Source
        id="evac-zones"
        type="geojson"
        data={data}
      >
        {/* Polygon fill */}
        <Layer
          id="evac-zones-fill"
          type="fill"
          source="evac-zones"
          layout={{ visibility: vis }}
          paint={{
            'fill-color':   COLOR_MATCH,
            'fill-opacity': OPACITY_MATCH,
          }}
        />

        {/* Outline */}
        <Layer
          id="evac-zones-line"
          type="line"
          source="evac-zones"
          layout={{ visibility: vis }}
          paint={{
            'line-color':   COLOR_MATCH,
            'line-width':   LINE_WIDTH_MATCH,
            'line-opacity': 0.9,
          }}
        />

        {/* Zone-name labels at higher zoom */}
        <Layer
          id="evac-zones-label"
          type="symbol"
          source="evac-zones"
          minzoom={8}
          layout={{
            visibility: vis,
            'text-field': ['coalesce', ['get', 'zoneName'], ''],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-anchor': 'center',
            'text-max-width': 10,
          }}
          paint={{
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0,0,0,0.85)',
            'text-halo-width': 2,
          }}
        />
      </Source>

      {/* Dot markers at polygon centroids (low zoom) — on top of polygons */}
      <Source id="evac-zones-dots" type="geojson" data={dotsData}>
        <Layer
          id="evac-zones-dot"
          type="circle"
          source="evac-zones-dots"
          maxzoom={6}
          layout={{ visibility: vis }}
          paint={{
            'circle-color':   COLOR_MATCH,
            'circle-opacity': 0.95,
            'circle-radius':  [
              'interpolate', ['linear'], ['zoom'],
              0, 4,
              3, 6,
              5, 8,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 1,
          }}
        />
      </Source>
    </>
  );
}
